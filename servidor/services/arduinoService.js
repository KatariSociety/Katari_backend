const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { ARDUINO_CONFIG } = require('../config');
const EventEmitter = require('events');

/**
 * Servicio para manejar la comunicación con Arduino
 */
class ArduinoService extends EventEmitter {
    constructor() {
        super();
        this.serialPort = null;
        this.parser = null;
        this.isConnected = false;
    }

    /**
     * Intenta conectar con el Arduino
     */
    async connect() {
        try {
            const ports = await SerialPort.list();
            console.log("Puertos seriales disponibles:", ports.map(p => p.path));

            // Cerrar puerto previo si existe
            if (this.serialPort && this.serialPort.isOpen) {
                this.serialPort.close();
            }

            // Buscar un puerto válido entre los posibles
            const foundPort = ARDUINO_CONFIG.POSSIBLE_PORTS.find(port =>
                ports.some(p => p.path === port)
            );

            if (!foundPort) {
                console.log("No se encontró ningún Arduino conectado");
                this.emit('status', { connected: false, error: "No se encontró Arduino" });

                // Reintentar después del tiempo configurado
                setTimeout(() => this.connect(), ARDUINO_CONFIG.DISCOVERY_TIMEOUT);
                return false;
            }

            // Conectar al puerto encontrado
            await this._connectToPort(foundPort);
            return true;
        } catch (err) {
            console.error("Error al listar puertos seriales:", err);
            this.emit('status', { connected: false, error: err.message });

            // Reintentar después del tiempo configurado
            setTimeout(() => this.connect(), ARDUINO_CONFIG.DISCOVERY_TIMEOUT);
            return false;
        }
    }

    /**
     * Conecta al puerto específico
     * @param {string} port Puerto a conectar
     * @returns {Promise<boolean>} Resultado de la conexión
     */
    async _connectToPort(port) {
        return new Promise((resolve) => {
            try {
                console.log(`Intentando conectar a ${port}...`);

                this.serialPort = new SerialPort({
                    path: port,
                    baudRate: ARDUINO_CONFIG.BAUD_RATE
                });

                this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

                // Configurar eventos
                this.serialPort.on('open', () => {
                    console.log(`Conexión establecida con Arduino en ${port}`);
                    this.isConnected = true;
                    this.emit('status', { connected: true });
                    resolve(true);
                });

                this.parser.on('data', this._handleData.bind(this));

                this.serialPort.on('error', (err) => {
                    this._handleError(err, port);
                    resolve(false);
                });

                this.serialPort.on('close', () => {
                    console.log(`Conexión con puerto ${port} cerrada`);
                    this.isConnected = false;
                    this.emit('status', { connected: false });

                    // Reintentar conexión después del tiempo configurado
                    setTimeout(() => this.connect(), ARDUINO_CONFIG.RECONNECT_TIMEOUT);
                });
            } catch (err) {
                console.error(`Error al intentar conectar con Arduino en ${port}:`, err);
                this.emit('status', { connected: false, error: err.message });
                resolve(false);
            }
        });
    }

    /**
     * Maneja los datos recibidos del Arduino
     * @param {string} data Datos recibidos
     */
        /**
     * Maneja los datos recibidos del Arduino
     * @param {string} data Datos recibidos
     */
    _handleData(data) {
        try {
            console.log("📡 Datos recibidos del Arduino:", data.substring(0, 100) + (data.length > 100 ? "..." : ""));

            // Manejar mensajes especiales
            if (data.startsWith('KATARI_SENSORS_READY')) {
                console.log("✅ Sensores Katari inicializados");
                this.emit('sensor_ready', { message: 'Sensores listos' });
                return;
            }

            if (data.startsWith('GPS_CALIBRANDO:')) {
                console.log("📍 GPS calibrando:", data);
                this.emit('gps_calibrating', { message: data });
                return;
            }

            // Intentar parsear como JSON
            try {
                const jsonData = JSON.parse(data);
                
                console.log("✅ JSON válido recibido del Arduino:");
                console.log("  - Device ID:", jsonData.device_id);
                console.log("  - Timestamp:", jsonData.timestamp);
                console.log("  - Sensores activos:", {
                    SCD40: jsonData.status_scd40,
                    GY91: jsonData.status_gy91,
                    GPS: jsonData.status_gps,
                    Calibrado: jsonData.calibrated
                });
                
                // Procesar datos de sensores para la base de datos
                if (jsonData.device_id && jsonData.device_id.includes('KATARI')) {
                    this._processSensorData(jsonData);
                }
                
                // Emitir evento con los datos formateados para el frontend
                console.log("� Emitiendo datos al frontend...");
                this.emit('data', jsonData);
                
            } catch (jsonError) {
                // No es JSON válido, ignorar silenciosamente si es un mensaje de debug
                if (data.includes('✅') || 
                    data.includes('📊') || 
                    data.includes('🌐') || 
                    data.includes('📍') ||
                    data.includes('====') ||
                    data.includes('Datos actualizados') ||
                    data.includes('Calibrando')) {
                    // Es mensaje de debug, ignorar
                    return;
                }
                
                console.log("⚠️ Datos no JSON recibidos:", data.substring(0, 50) + "...");
                return;
            }

            // Actualizar estado si no estaba conectado
            if (!this.isConnected) {
                this.isConnected = true;
                this.emit('status', { connected: true });
                console.log("🔌 Estado actualizado: Arduino conectado");
            }
        } catch (err) {
            console.error("❌ Error al procesar datos del Arduino:", err);
            this.emit('data', data);
        }
    }

    /**
     * Procesa datos de sensores y los envía al backend
     * @param {Object} sensorData Datos de sensores
     */
    async _processSensorData(sensorData) {
        try {
            // Convertir a formato compatible con el backend usando el sistema existente
            const timestamp = new Date().toISOString();
            
            // Procesar datos del SCD40 (CO2, temperatura, humedad)
            if (sensorData.co2 !== undefined || sensorData.temp_scd !== undefined || sensorData.humidity !== undefined) {
                const scd40Readings = {
                    co2: sensorData.co2 !== undefined ? { value: sensorData.co2, unit: "ppm" } : null,
                    temperature: sensorData.temp_scd !== undefined ? { value: sensorData.temp_scd, unit: "C" } : null,
                    humidity: sensorData.humidity !== undefined ? { value: sensorData.humidity, unit: "%" } : null
                };
                
                // Filtrar valores null
                const validReadings = Object.fromEntries(
                    Object.entries(scd40Readings).filter(([_, value]) => value !== null)
                );
                
                if (Object.keys(validReadings).length > 0) {
                    await this._insertSensorReadingByReference('SCD40_K1', validReadings, timestamp);
                }
            }
            
            // Procesar datos del BMP280 (temperatura, presión, altitud)
            if (sensorData.temp_bmp !== undefined || sensorData.pressure !== undefined || sensorData.altitude_bmp !== undefined) {
                const bmp280Readings = {
                    temperature: sensorData.temp_bmp !== undefined ? { value: sensorData.temp_bmp, unit: "C" } : null,
                    pressure: sensorData.pressure !== undefined ? { value: sensorData.pressure, unit: "hPa" } : null,
                    altitude: sensorData.altitude_bmp !== undefined ? { value: sensorData.altitude_bmp, unit: "m" } : null
                };
                
                // Filtrar valores null
                const validReadings = Object.fromEntries(
                    Object.entries(bmp280Readings).filter(([_, value]) => value !== null)
                );
                
                if (Object.keys(validReadings).length > 0) {
                    await this._insertSensorReadingByReference('BMP_280_K1', validReadings, timestamp);
                }
            }
            
            // Procesar datos del MPU9250 (acelerómetro y giroscopio)
            if (sensorData.accel_x !== undefined || sensorData.gyro_x !== undefined) {
                const mpu9250Readings = {};
                
                if (sensorData.accel_x !== undefined) {
                    mpu9250Readings.accelerometer = {
                        x: { value: sensorData.accel_x, unit: "g" },
                        y: { value: sensorData.accel_y || 0, unit: "g" },
                        z: { value: sensorData.accel_z || 0, unit: "g" }
                    };
                }
                
                if (sensorData.gyro_x !== undefined) {
                    mpu9250Readings.gyroscope = {
                        x: { value: sensorData.gyro_x, unit: "°/s" },
                        y: { value: sensorData.gyro_y || 0, unit: "°/s" },
                        z: { value: sensorData.gyro_z || 0, unit: "°/s" }
                    };
                }
                
                if (Object.keys(mpu9250Readings).length > 0) {
                    await this._insertSensorReadingByReference('MPU_9250_K1', mpu9250Readings, timestamp);
                }
            }
            
            // Procesar datos del GPS (si están disponibles)
            if (sensorData.gps_lat !== undefined && sensorData.gps_lng !== undefined) {
                const gpsReadings = {
                    location: {
                        latitude: sensorData.gps_lat,
                        longitude: sensorData.gps_lng,
                        altitude: { value: sensorData.gps_alt || 0, unit: "m" }
                    },
                    satellites: sensorData.gps_sats || 0
                };
                
                await this._insertSensorReadingByReference('NEO_6M_K1', gpsReadings, timestamp);
            }
            
            console.log("📊 Datos de sensores procesados y almacenados");
            
        } catch (error) {
            console.error("Error procesando datos de sensores:", error);
        }
    }

    /**
     * Inserta una lectura de sensor en la base de datos usando la referencia del sensor
     * @param {string} sensorReference Referencia del sensor (ej: 'SCD40_K1')
     * @param {Object} readings Objeto con las lecturas del sensor
     * @param {string} timestamp Timestamp de la lectura
     */
    async _insertSensorReadingByReference(sensorReference, readings, timestamp) {
        try {
            const crud = require('../../modelo/database/crud');
            
            // Buscar el ID del sensor por su referencia
            const query = 'SELECT id_sensor FROM tblSensor WHERE referencia_sensor = ?';
            const sensorResult = await crud.executeSelectQuery(query, [sensorReference]);
            
            if (!sensorResult || sensorResult.length === 0) {
                console.error(`Sensor con referencia ${sensorReference} no encontrado`);
                return;
            }
            
            const sensorId = sensorResult[0].id_sensor;
            
            // Preparar los datos de la lectura en el formato esperado
            const lecturaData = {
                id_sensor: sensorId,
                id_evento: 1, // Usar el evento existente
                valor_lectura: JSON.stringify(readings),
                fecha_lectura: Date.now()
            };

            // Usar el controlador de lecturas existente
            const lecturaController = require('../src/modulos/Lecturas');
            await lecturaController.insertarLectura(lecturaData);
            
            console.log(`✅ Lectura insertada para sensor ${sensorReference} (ID: ${sensorId})`);
            
        } catch (error) {
            console.error(`Error insertando lectura de ${sensorReference}:`, error);
        }
    }

    /**
     * Convierte datos de sensores al formato del backend (mantenido para compatibilidad)
     * @param {Object} sensorData Datos del sensor
     * @returns {Object} Datos en formato backend
     */
    _convertToBackendFormat(sensorData) {
        const timestamp = new Date().toISOString();
        
        return {
            timestamp: timestamp,
            sensors: {
                SCD40: sensorData.co2 !== undefined ? {
                    sensor_id: "SCD40_K1",
                    timestamp: timestamp,
                    readings: {
                        co2: { value: sensorData.co2, unit: "ppm" },
                        temperature: { value: sensorData.temp_scd, unit: "C" },
                        humidity: { value: sensorData.humidity, unit: "%" }
                    }
                } : undefined,
                BMP280: sensorData.temp_bmp !== undefined ? {
                    sensor_id: "BMP_280_K1",
                    timestamp: timestamp,
                    readings: {
                        temperature: { value: sensorData.temp_bmp, unit: "C" },
                        pressure: { value: sensorData.pressure, unit: "hPa" },
                        altitude: { value: sensorData.altitude_bmp, unit: "m" }
                    }
                } : undefined,
                MPU9250: (sensorData.accel_x !== undefined || sensorData.gyro_x !== undefined) ? {
                    sensor_id: "MPU_9250_K1",
                    timestamp: timestamp,
                    readings: {
                        accelerometer: sensorData.accel_x !== undefined ? {
                            x: { value: sensorData.accel_x, unit: "g" },
                            y: { value: sensorData.accel_y, unit: "g" },
                            z: { value: sensorData.accel_z, unit: "g" }
                        } : undefined,
                        gyroscope: sensorData.gyro_x !== undefined ? {
                            x: { value: sensorData.gyro_x, unit: "°/s" },
                            y: { value: sensorData.gyro_y, unit: "°/s" },
                            z: { value: sensorData.gyro_z, unit: "°/s" }
                        } : undefined
                    }
                } : undefined,
                NEO6M: sensorData.gps_lat !== undefined ? {
                    sensor_id: "NEO_6M_K1",
                    timestamp: timestamp,
                    readings: {
                        location: {
                            latitude: sensorData.gps_lat,
                            longitude: sensorData.gps_lng,
                            altitude: { value: sensorData.gps_alt, unit: "m" }
                        },
                        satellites: sensorData.gps_sats
                    }
                } : undefined
            }
        };
    }

    /**
     * Maneja errores de la conexión serial
     * @param {Error} err Error ocurrido
     * @param {string} port Puerto que generó el error
     */
    _handleError(err, port) {
        console.error(`Error en puerto ${port}:`, err.message);
        this.isConnected = false;

        // Manejar específicamente el error de acceso denegado
        if (err.message.includes('Access denied')) {
            console.error('Error: Acceso denegado al puerto. Por favor:');
            console.error('1. Cierra el Arduino IDE o el Monitor Serial si están abiertos');
            console.error('2. Asegúrate de que ninguna otra aplicación esté usando el puerto');
            console.error('3. Intenta desconectar y volver a conectar el Arduino');

            this.emit('status', {
                connected: false,
                error: "Acceso denegado al puerto. Por favor, cierra otras aplicaciones que puedan estar usando el puerto."
            });
        } else {
            this.emit('status', { connected: false, error: err.message });
        }

        // Reintentar después del tiempo configurado
        setTimeout(() => this.connect(), ARDUINO_CONFIG.RECONNECT_TIMEOUT);
    }

    /**
     * Obtiene el estado actual de la conexión
     * @returns {boolean} Estado de conexión
     */
    getStatus() {
        return {
            connected: this.isConnected
        };
    }

    /**
     * Cierra la conexión con el Arduino
     */
    disconnect() {
        if (this.serialPort && this.serialPort.isOpen) {
            this.serialPort.close();
        }
    }
}

// Exportar una instancia única del servicio (patrón Singleton)
module.exports = new ArduinoService();