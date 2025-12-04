const EventEmitter = require('events');
const crud = require('../../modelo/database/crud');
const crearLecturaServicio = require('../src/modulos/Lecturas/lecturaServicio');

// Crear instancia del servicio de lecturas
const lecturaServicio = crearLecturaServicio(crud);

/**
 * Servicio para procesar y validar datos del CanSat
 */
class CansatDataProcessing extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.lastPacketId = null;
        this.packetsLost = 0;
        this.totalPackets = 0;
        this.dataBuffer = [];
        this.maxBufferSize = 100;
    }

    /**
     * Conecta el servicio de procesamiento con el servicio del CanSat
     */
    listenTo(cansatService) {
        cansatService.on('data', (rawData) => {
            this.processData(rawData);
        });

        cansatService.on('connected', (info) => {
            console.log('Procesador de datos CanSat: Conexión establecida');
            this.emit('connected', info);
        });

        cansatService.on('disconnected', () => {
            console.log('Procesador de datos CanSat: Desconectado');
            this.emit('disconnected');
        });

        cansatService.on('error', (error) => {
            this.emit('error', error);
        });
    }

    /**
     * Procesa los datos crudos del CanSat
     */
    processData(rawData) {
        try {
            // Validar datos
            const validationResult = this.validateData(rawData);
            
            if (!validationResult.valid) {
                console.warn('Datos inválidos:', validationResult.errors);
                this.emit('validation_error', {
                    data: rawData,
                    errors: validationResult.errors
                });
                return;
            }

            // Detectar pérdida de paquetes
            this.detectPacketLoss(rawData.packet_id);

            // Calcular valores derivados
            const processedData = this.calculateDerivedValues(rawData);

            // Agregar al buffer
            this.addToBuffer(processedData);

            // Guardar en base de datos
            this.storeData(processedData).catch(err => {
                console.error('Error guardando datos en BD:', err);
            });

            // Emitir datos procesados
            this.emit('processed_data', processedData);

            // Emitir alertas si es necesario
            this.checkAlerts(processedData);

        } catch (error) {
            console.error('Error procesando datos del CanSat:', error);
            this.emit('error', { message: error.message, data: rawData });
        }
    }

    /**
     * Valida los datos recibidos
     */
    validateData(data) {
        const errors = [];

        // Validar que existan los campos requeridos
        if (!data.packet_id) errors.push('packet_id faltante');
        if (!data.timestamp) errors.push('timestamp faltante');
        if (!data.accelerometer) errors.push('accelerometer faltante');
        if (!data.gyroscope) errors.push('gyroscope faltante');
        if (!data.barometer) errors.push('barometer faltante');
        if (!data.scd40) errors.push('scd40 faltante');
        if (!data.gps) errors.push('gps faltante');
        if (!data.mics) errors.push('mics faltante');

        // Validar rangos de acelerómetro
        if (data.accelerometer) {
            const { x, y, z } = data.accelerometer;
            if (Math.abs(x) > this.config.THRESHOLDS.MAX_ACCELERATION) {
                errors.push(`Aceleración X fuera de rango: ${x}g`);
            }
            if (Math.abs(y) > this.config.THRESHOLDS.MAX_ACCELERATION) {
                errors.push(`Aceleración Y fuera de rango: ${y}g`);
            }
            if (Math.abs(z) > this.config.THRESHOLDS.MAX_ACCELERATION) {
                errors.push(`Aceleración Z fuera de rango: ${z}g`);
            }
        }

        // Validar presión
        if (data.barometer && data.barometer.pressure) {
            const pressure = data.barometer.pressure;
            if (pressure < this.config.THRESHOLDS.MIN_PRESSURE || 
                pressure > this.config.THRESHOLDS.MAX_PRESSURE) {
                errors.push(`Presión fuera de rango: ${pressure} Pa`);
            }
        }

        // Validar temperatura
        if (data.barometer && data.barometer.temperature) {
            const temp = data.barometer.temperature;
            if (temp < this.config.THRESHOLDS.MIN_TEMPERATURE || 
                temp > this.config.THRESHOLDS.MAX_TEMPERATURE) {
                errors.push(`Temperatura fuera de rango: ${temp}°C`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Detecta pérdida de paquetes
     */
    detectPacketLoss(currentPacketId) {
        if (this.lastPacketId !== null) {
            const expectedPacketId = this.lastPacketId + 1;
            const packetsLost = currentPacketId - expectedPacketId;
            
            if (packetsLost > 0) {
                this.packetsLost += packetsLost;
                console.warn(`Paquetes perdidos: ${packetsLost} (Total: ${this.packetsLost})`);
                this.emit('packet_loss', {
                    lost: packetsLost,
                    totalLost: this.packetsLost,
                    lastPacketId: this.lastPacketId,
                    currentPacketId
                });
            }
        }

        this.lastPacketId = currentPacketId;
        this.totalPackets++;
    }

    /**
     * Calcula valores derivados de los datos
     */
    calculateDerivedValues(rawData) {
        const processedData = { ...rawData };

        // Calcular magnitud de aceleración
        const { x: ax, y: ay, z: az } = rawData.accelerometer;
        processedData.accelerometer.magnitude = Math.sqrt(ax * ax + ay * ay + az * az);

        // Calcular magnitud de rotación
        const { x: gx, y: gy, z: gz } = rawData.gyroscope;
        processedData.gyroscope.magnitude = Math.sqrt(gx * gx + gy * gy + gz * gz);

        // Calcular altitud aproximada desde presión (fórmula barométrica)
        // h = 44330 * (1 - (P/P0)^(1/5.255))
        // P0 = 101325 Pa (presión al nivel del mar)
        const pressure = rawData.barometer.pressure;
        const P0 = 101325;
        processedData.barometer.altitude = 44330 * (1 - Math.pow(pressure / P0, 1 / 5.255));

        // Validar GPS (si tiene fix)
        processedData.gps.hasFix = rawData.gps.satellites > 0 && 
                                    rawData.gps.latitude !== 0 && 
                                    rawData.gps.longitude !== 0;

        // Calcular tasa de pérdida de paquetes
        processedData.stats = {
            packetsLost: this.packetsLost,
            totalPackets: this.totalPackets,
            lossRate: this.totalPackets > 0 ? (this.packetsLost / this.totalPackets * 100).toFixed(2) : 0
        };

        return processedData;
    }

    /**
     * Verifica condiciones de alerta
     */
    checkAlerts(data) {
        const alerts = [];

        // Alerta de aceleración alta
        if (data.accelerometer.magnitude > this.config.THRESHOLDS.MAX_ACCELERATION) {
            alerts.push({
                type: 'HIGH_ACCELERATION',
                severity: 'warning',
                message: `Aceleración alta: ${data.accelerometer.magnitude.toFixed(2)}g`,
                value: data.accelerometer.magnitude
            });
        }

        // Alerta de CO2 alto
        if (data.scd40.co2 > this.config.THRESHOLDS.MAX_CO2) {
            alerts.push({
                type: 'HIGH_CO2',
                severity: 'warning',
                message: `CO2 alto: ${data.scd40.co2} ppm`,
                value: data.scd40.co2
            });
        }

        // Alerta de GPS sin fix
        if (!data.gps.hasFix) {
            alerts.push({
                type: 'NO_GPS_FIX',
                severity: 'info',
                message: 'GPS sin señal',
                value: data.gps.satellites
            });
        }

        // Emitir alertas si hay
        if (alerts.length > 0) {
            this.emit('alerts', {
                timestamp: data.receivedAt,
                packet_id: data.packet_id,
                alerts
            });
        }
    }

    /**
     * Agrega datos al buffer
     */
    addToBuffer(data) {
        this.dataBuffer.push(data);
        
        // Mantener el buffer en el tamaño máximo
        if (this.dataBuffer.length > this.maxBufferSize) {
            this.dataBuffer.shift();
        }
    }

    /**
     * Obtiene los últimos N datos del buffer
     */
    getRecentData(count = 10) {
        return this.dataBuffer.slice(-count);
    }

    /**
     * Obtiene estadísticas del procesamiento
     */
    getStats() {
        return {
            totalPackets: this.totalPackets,
            packetsLost: this.packetsLost,
            lossRate: this.totalPackets > 0 ? (this.packetsLost / this.totalPackets * 100).toFixed(2) : 0,
            bufferSize: this.dataBuffer.length,
            lastPacketId: this.lastPacketId
        };
    }

    /**
     * Reinicia las estadísticas
     */
    resetStats() {
        this.lastPacketId = null;
        this.packetsLost = 0;
        this.totalPackets = 0;
        this.dataBuffer = [];
        console.log('Estadísticas del CanSat reiniciadas');
    }

    /**
     * Almacena datos en la base de datos usando las referencias de sensores
     */
    async storeData(data) {
        try {
            let inserts = 0;

            // GY-91: Acelerómetro y Giroscopio (si tiene la referencia)
            if (data.sensorRef_GY91 && data.accelerometer && data.gyroscope) {
                const readings = {
                    accelerometer: {
                        x: { value: data.accelerometer.x, unit: 'g' },
                        y: { value: data.accelerometer.y, unit: 'g' },
                        z: { value: data.accelerometer.z, unit: 'g' }
                    },
                    gyroscope: {
                        x: { value: data.gyroscope.x, unit: '°/s' },
                        y: { value: data.gyroscope.y, unit: '°/s' },
                        z: { value: data.gyroscope.z, unit: '°/s' }
                    }
                };
                
                if (data.accelerometer.magnitude !== undefined) {
                    readings.accelerometer.magnitude = { 
                        value: data.accelerometer.magnitude, 
                        unit: 'g' 
                    };
                }
                if (data.gyroscope.magnitude !== undefined) {
                    readings.gyroscope.magnitude = { 
                        value: data.gyroscope.magnitude, 
                        unit: '°/s' 
                    };
                }

                await this._insertSensorReading('GY_91_C', readings, data.received_at);
                inserts++;
            }

            // BMP: Barómetro (incluido en GY-91)
            if (data.barometer && data.barometer.temperature !== undefined) {
                const readings = {
                    temperature: { value: data.barometer.temperature, unit: 'C' },
                    pressure: { value: data.barometer.pressure, unit: 'Pa' }
                };
                
                if (data.barometer.altitude !== undefined) {
                    readings.altitude = { value: data.barometer.altitude, unit: 'm' };
                }

                await this._insertSensorReading('GY_91_C', readings, data.received_at);
                inserts++;
            }

            // SCD40: CO2, Temperatura, Humedad
            if (data.sensorRef_SCD40 && data.scd40) {
                const readings = {
                    co2: { value: data.scd40.co2, unit: 'ppm' },
                    temperature: { value: data.scd40.temperature, unit: 'C' },
                    humidity: { value: data.scd40.humidity, unit: '%' }
                };
                await this._insertSensorReading('SCD_40_C', readings, data.received_at);
                inserts++;
            }

            // GPS NEO-6M
            if (data.sensorRef_GPS && data.gps && data.gps.hasFix) {
                const readings = {
                    location: {
                        latitude: data.gps.latitude,
                        longitude: data.gps.longitude,
                        altitude: { value: data.gps.altitude || 0, unit: 'm' }
                    },
                    satellites: data.gps.satellites || 0,
                    hdop: data.gps.hdop || 0,
                    fix: data.gps.hasFix
                };
                await this._insertSensorReading('GPS_NEO_C', readings, data.received_at);
                inserts++;
            }

            // MICS-4514: Sensores de Gas
            if (data.sensorRef_MICS && data.mics) {
                const readings = {
                    red: { value: data.mics.red, unit: 'raw' },
                    nox: { value: data.mics.nox, unit: 'raw' }
                };
                await this._insertSensorReading('MiCS_4514_C', readings, data.received_at);
                inserts++;
            }

            if (inserts > 0) {
                console.log(`${inserts} lecturas del CanSat almacenadas en BD`);
            }
        } catch (error) {
            console.error('Error almacenando datos del CanSat:', error);
            throw error;
        }
    }

    /**
     * Inserta una lectura de sensor en la base de datos
     * Usa el mismo sistema que RocketDataProcessing
     */
    async _insertSensorReading(sensorRef, readings, timestamp) {
        try {
            // Buscar el sensor por su referencia en la base de datos
            const query = 'SELECT id_sensor FROM tblSensor WHERE referencia_sensor = ?';
            const sensorResult = await crud.executeSelectQuery(query, [sensorRef]);
            
            if (!sensorResult || sensorResult.length === 0) {
                console.warn(`Sensor ${sensorRef} no encontrado en BD`);
                return;
            }
            
            const sensorId = sensorResult[0].id_sensor;
            
            // Crear la lectura con el formato de la tabla tblLectura
            const lecturaData = {
                id_sensor: sensorId,
                id_evento: 6, //TODO:arreglar en futuras versiones
                valor_lectura: JSON.stringify(readings),
                fecha_lectura: Date.now()
            };

            await lecturaServicio.insertarLectura(lecturaData);
            console.log(`Lectura insertada: ${sensorRef} (sensor_id: ${sensorId})`);
            
        } catch (error) {
            console.error(`Error insertando lectura de ${sensorRef}:`, error.message);
            // No lanzar el error para no detener el procesamiento
        }
    }
}

module.exports = CansatDataProcessing;
