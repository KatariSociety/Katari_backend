const EventEmitter = require('events');
const crud = require('../../modelo/database/crud');
const lecturaController = require('../src/modulos/Lecturas');

/**
 * Servicio para procesar y almacenar datos de sensores.
 * Actúa como intermediario entre el ArduinoService y el resto de la aplicación.
 */
class DataProcessingService extends EventEmitter {
    constructor() {
        super();
    }

    /**
     * Comienza a escuchar eventos del ArduinoService.
     * @param {import('./arduinoService')} arduinoService
     */
    listenTo(arduinoService) {
        console.log('🔗 DataProcessingService: Configurando listeners para ArduinoService');
        arduinoService.on('data', this._onRawDataReceived.bind(this));
        console.log('✅ DataProcessingService: Listener configurado para evento "data"');
    }

    /**
     * Maneja los datos JSON crudos recibidos del Arduino.
     * @param {object} data
     */
    _onRawDataReceived(data) {
        console.log('🔄 DataProcessingService: Datos recibidos', { device_id: data.device_id, timestamp: data.timestamp });
        
        // 1. Procesar y almacenar los datos en la base de datos si son de un dispositivo Katari.
        if (data.device_id && data.device_id.includes('KATARI')) {
            this._processAndStoreSensorData(data);
        }

        // 2. Emitir evento con los datos generales para el frontend.
        console.log('📤 DataProcessingService: Emitiendo formatted_data');
        this.emit('formatted_data', data);

        // 3. Formatear y emitir datos específicos si existen (ej. MPU).
        if (data.accel_x !== undefined || data.gyro_x !== undefined) {
            const mpuData = this._formatMpuData(data);
            console.log('📤 DataProcessingService: Emitiendo formatted_mpu_data');
            this.emit('formatted_mpu_data', mpuData);
        }
    }

    /**
     * Formatea los datos del sensor MPU para el frontend.
     * @param {object} data Datos crudos
     */
    _formatMpuData(data) {
        return {
            sensor_id: "MPU_9250_K1",
            timestamp: new Date().toISOString(),
            accelerometer: {
                x: { value: parseFloat(data.accel_x) || 0, unit: "g" },
                y: { value: parseFloat(data.accel_y) || 0, unit: "g" },
                z: { value: parseFloat(data.accel_z) || 0, unit: "g" }
            },
            gyroscope: {
                x: { value: parseFloat(data.gyro_x) || 0, unit: "dps" },
                y: { value: parseFloat(data.gyro_y) || 0, unit: "dps" },
                z: { value: parseFloat(data.gyro_z) || 0, unit: "dps" }
            }
        };
    }

    /**
     * Procesa datos de sensores y los envía al backend para ser almacenados.
     * (Lógica movida desde arduinoService)
     * @param {Object} sensorData Datos de sensores
     */
    async _processAndStoreSensorData(sensorData) {
        try {
            const timestamp = new Date().toISOString();
            
            // Procesar datos del SCD40, BMP280, MPU9250 y GPS
            // ... (Esta es la misma lógica de procesamiento que tenías antes)

            // SCD40
            if (sensorData.co2 !== undefined || sensorData.temp_scd !== undefined || sensorData.humidity !== undefined) {
                const readings = {
                    co2: sensorData.co2 !== undefined ? { value: sensorData.co2, unit: "ppm" } : null,
                    temperature: sensorData.temp_scd !== undefined ? { value: sensorData.temp_scd, unit: "C" } : null,
                    humidity: sensorData.humidity !== undefined ? { value: sensorData.humidity, unit: "%" } : null
                };
                const validReadings = Object.fromEntries(Object.entries(readings).filter(([_, v]) => v !== null));
                if (Object.keys(validReadings).length > 0) await this._insertSensorReadingByReference('SCD40_K1', validReadings, timestamp);
            }

            // BMP280
            if (sensorData.temp_bmp !== undefined || sensorData.pressure !== undefined || sensorData.altitude_bmp !== undefined) {
                const readings = {
                    temperature: sensorData.temp_bmp !== undefined ? { value: sensorData.temp_bmp, unit: "C" } : null,
                    pressure: sensorData.pressure !== undefined ? { value: sensorData.pressure, unit: "hPa" } : null,
                    altitude: sensorData.altitude_bmp !== undefined ? { value: sensorData.altitude_bmp, unit: "m" } : null
                };
                const validReadings = Object.fromEntries(Object.entries(readings).filter(([_, v]) => v !== null));
                if (Object.keys(validReadings).length > 0) await this._insertSensorReadingByReference('BMP_280_K1', validReadings, timestamp);
            }

            // MPU9250
            if (sensorData.accel_x !== undefined || sensorData.gyro_x !== undefined) {
                const readings = {};
                if (sensorData.accel_x !== undefined) {
                    readings.accelerometer = {
                        x: { value: sensorData.accel_x, unit: "g" },
                        y: { value: sensorData.accel_y || 0, unit: "g" },
                        z: { value: sensorData.accel_z || 0, unit: "g" }
                    };
                }
                if (sensorData.gyro_x !== undefined) {
                    readings.gyroscope = {
                        x: { value: sensorData.gyro_x, unit: "°/s" },
                        y: { value: sensorData.gyro_y || 0, unit: "°/s" },
                        z: { value: sensorData.gyro_z || 0, unit: "°/s" }
                    };
                }
                if (Object.keys(readings).length > 0) await this._insertSensorReadingByReference('MPU_9250_K1', readings, timestamp);
            }

            // GPS
            if (sensorData.gps_lat !== undefined && sensorData.gps_lng !== undefined) {
                const readings = {
                    location: {
                        latitude: sensorData.gps_lat,
                        longitude: sensorData.gps_lng,
                        altitude: { value: sensorData.gps_alt || 0, unit: "m" }
                    },
                    satellites: sensorData.gps_sats || 0
                };
                await this._insertSensorReadingByReference('NEO_6M_K1', readings, timestamp);
            }
            
            console.log("📊 Datos de sensores procesados y almacenados por DataProcessingService");

        } catch (error) {
            console.error("Error en DataProcessingService al procesar datos:", error);
        }
    }

    /**
     * Inserta una lectura de sensor en la base de datos usando la referencia del sensor.
     * (Lógica movida desde arduinoService)
     * @param {string} sensorReference
     * @param {Object} readings
     * @param {string} timestamp
     */
    async _insertSensorReadingByReference(sensorReference, readings, timestamp) {
        try {
            const query = 'SELECT id_sensor FROM tblSensor WHERE referencia_sensor = ?';
            const sensorResult = await crud.executeSelectQuery(query, [sensorReference]);
            
            if (!sensorResult || sensorResult.length === 0) {
                console.error(`Sensor con referencia ${sensorReference} no encontrado`);
                return;
            }
            
            const sensorId = sensorResult[0].id_sensor;
            
            const lecturaData = {
                id_sensor: sensorId,
                id_evento: 1, // Usar el evento existente
                valor_lectura: JSON.stringify(readings),
                fecha_lectura: Date.now()
            };

            await lecturaController.insertarLectura(lecturaData);
            console.log(`✅ Lectura insertada para sensor ${sensorReference} (ID: ${sensorId})`);
            
        } catch (error) {
            console.error(`Error en DataProcessingService insertando lectura de ${sensorReference}:`, error);
        }
    }
}

// Singleton
module.exports = new DataProcessingService();