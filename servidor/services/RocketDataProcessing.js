const EventEmitter = require('events');
const crud = require('../../modelo/database/crud');
const crearLecturaServicio = require('../src/modulos/Lecturas/lecturaServicio');

// Crear instancia del servicio de lecturas
const lecturaServicio = crearLecturaServicio(crud);

/**
 * Servicio para procesar y almacenar datos del cohete
 * Responsabilidades:
 * - Escuchar eventos de RocketService
 * - Validar integridad de datos
 * - Calcular métricas derivadas
 * - Almacenar en base de datos
 * - Emitir datos enriquecidos
 */
class RocketDataProcessing extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        
        // Estado para cálculos
        this.lastAltitude = null;
        this.lastTimestamp = null;
        this.maxAltitude = 0;
        this.flightStartTime = null;
        this.totalPackets = 0;
        this.lostPackets = 0;
    }

    /**
     * Comienza a escuchar eventos del RocketService
     */
    listenTo(rocketService) {
        console.log('RocketDataProcessing: Escuchando eventos de RocketService');
        
        rocketService.on('data', this._onRawDataReceived.bind(this));
        rocketService.on('packet_loss', this._onPacketLoss.bind(this));
        rocketService.on('status', this._onStatusChange.bind(this));
    }

    /**
     * Maneja cambios de estado de conexión
     */
    _onStatusChange(status) {
        console.log(`Estado del cohete: ${status.connected ? 'Conectado' : 'Desconectado'}`);
        
        // Resetear estado si se desconecta
        if (!status.connected) {
            this._resetFlightMetrics();
        }
        
        this.emit('connection_status', status);
    }

    /**
     * Maneja eventos de pérdida de paquetes
     */
    _onPacketLoss(lossInfo) {
        this.lostPackets += lossInfo.lost;
        this.totalPackets += lossInfo.lost;
        
        const lossRate = (this.lostPackets / this.totalPackets) * 100;
        
        console.warn(`Pérdida de paquetes: ${lossInfo.lost} (Total: ${lossRate.toFixed(2)}%)`);
        
        // Emitir alerta si supera el umbral
        if (lossRate > this.config.THRESHOLDS.MAX_PACKET_LOSS) {
            this.emit('alert', {
                type: 'HIGH_PACKET_LOSS',
                severity: 'warning',
                message: `Pérdida de paquetes alta: ${lossRate.toFixed(2)}%`,
                data: { lossRate, lostPackets: this.lostPackets, totalPackets: this.totalPackets }
            });
        }
    }

    /**
     * Maneja los datos crudos recibidos del cohete
     */
    async _onRawDataReceived(data) {
        try {
            console.log(`Procesando datos del cohete (ID: ${data.packet_id}, Estado: ${data.state})`);
            
            this.totalPackets++;
            
            // Validar datos
            const validation = this._validateData(data);
            if (!validation.valid) {
                console.warn('Datos inválidos:', validation.errors);
                this.emit('validation_error', { data, errors: validation.errors });
                return;
            }

            // Calcular métricas derivadas
            const metrics = this._calculateMetrics(data);
            
            // Enriquecer datos con métricas
            const enrichedData = {
                ...data,
                metrics: {
                    velocity: metrics.velocity,
                    acceleration_magnitude: metrics.accelerationMagnitude,
                    max_altitude: metrics.maxAltitude,
                    flight_time: metrics.flightTime,
                    packet_loss_rate: metrics.packetLossRate,
                    signal_quality: metrics.signalQuality
                }
            };

            // Almacenar en base de datos
            await this._storeData(data);

            // Emitir datos enriquecidos
            this.emit('processed_data', enrichedData);

            // Detectar eventos importantes
            this._detectEvents(data, metrics);

        } catch (error) {
            console.error('Error procesando datos del cohete:', error);
            this.emit('processing_error', { error: error.message, data });
        }
    }

    /**
     * Valida la integridad de los datos
     */
    _validateData(data) {
        const errors = [];

        // Validar campos requeridos
        if (data.packet_id === undefined || data.packet_id === null) {
            errors.push('packet_id es requerido');
        }
        if (!data.state || !this.config.FLIGHT_STATES.includes(data.state)) {
            errors.push(`state inválido: ${data.state}`);
        }

        // Validar sensores
        if (data.mpu) {
            const { x, y, z } = data.mpu.accel;
            const magnitude = Math.sqrt(x*x + y*y + z*z);
            if (magnitude > this.config.THRESHOLDS.MAX_ACCELERATION) {
                errors.push(`Aceleración fuera de rango: ${magnitude.toFixed(2)}g`);
            }
        }

        if (data.bmp) {
            if (data.bmp.pressure < this.config.THRESHOLDS.MIN_PRESSURE || 
                data.bmp.pressure > this.config.THRESHOLDS.MAX_PRESSURE) {
                errors.push(`Presión fuera de rango: ${data.bmp.pressure} hPa`);
            }
        }

        // Validar señal
        if (data.rssi !== null && data.rssi < this.config.THRESHOLDS.MIN_RSSI) {
            errors.push(`RSSI bajo: ${data.rssi} dBm`);
        }
        if (data.snr !== null && data.snr < this.config.THRESHOLDS.MIN_SNR) {
            errors.push(`SNR bajo: ${data.snr}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Calcula métricas derivadas
     */
    _calculateMetrics(data) {
        const metrics = {};

        // Velocidad vertical (m/s)
        if (this.lastAltitude !== null && this.lastTimestamp !== null && data.bmp) {
            const deltaAltitude = data.bmp.altitude - this.lastAltitude;
            const deltaTime = (data.timestamp_ms - this.lastTimestamp) / 1000; // a segundos
            metrics.velocity = deltaTime > 0 ? deltaAltitude / deltaTime : 0;
        } else {
            metrics.velocity = 0;
        }

        // Magnitud de aceleración
        if (data.mpu) {
            const { x, y, z } = data.mpu.accel;
            metrics.accelerationMagnitude = Math.sqrt(x*x + y*y + z*z);
        } else {
            metrics.accelerationMagnitude = 0;
        }

        // Altitud máxima
        if (data.bmp && data.bmp.altitude > this.maxAltitude) {
            this.maxAltitude = data.bmp.altitude;
        }
        metrics.maxAltitude = this.maxAltitude;

        // Tiempo de vuelo
        if (data.state !== 'GROUND' && this.flightStartTime === null) {
            this.flightStartTime = data.timestamp_ms;
        }
        if (this.flightStartTime !== null) {
            metrics.flightTime = (data.timestamp_ms - this.flightStartTime) / 1000; // segundos
        } else {
            metrics.flightTime = 0;
        }

        // Tasa de pérdida de paquetes
        metrics.packetLossRate = this.totalPackets > 0 
            ? (this.lostPackets / this.totalPackets) * 100 
            : 0;

        // Calidad de señal (0-100)
        // RSSI típico: -120 (malo) a -30 (excelente)
        // SNR típico: -20 (malo) a 20 (excelente)
        let signalScore = 50; // Default
        if (data.rssi !== null && data.snr !== null) {
            const rssiScore = Math.max(0, Math.min(100, ((data.rssi + 120) / 90) * 100));
            const snrScore = Math.max(0, Math.min(100, ((data.snr + 20) / 40) * 100));
            signalScore = (rssiScore + snrScore) / 2;
        }
        metrics.signalQuality = Math.round(signalScore);

        // Actualizar estado para próximo cálculo
        if (data.bmp) {
            this.lastAltitude = data.bmp.altitude;
        }
        this.lastTimestamp = data.timestamp_ms;

        return metrics;
    }

    /**
     * Almacena datos en la base de datos
     */
    async _storeData(data) {
        try {
            let inserts = 0;

            // MPU9250 - Acelerómetro
            if (data.mpu && data.mpu.accel) {
                const readings = {
                    accelerometer: {
                        x: { value: data.mpu.accel.x, unit: 'g' },
                        y: { value: data.mpu.accel.y, unit: 'g' },
                        z: { value: data.mpu.accel.z, unit: 'g' }
                    }
                };
                await this._insertSensorReading('MPU_R', readings, data.received_at);
                inserts++;
            }

            // BMP280 - Presión, temperatura, altitud
            if (data.bmp) {
                const readings = {};
                if (data.bmp.temperature !== undefined) {
                    readings.temperature = { value: data.bmp.temperature, unit: 'C' };
                }
                if (data.bmp.pressure !== undefined) {
                    readings.pressure = { value: data.bmp.pressure, unit: 'hPa' };
                }
                if (data.bmp.altitude !== undefined) {
                    readings.altitude = { value: data.bmp.altitude, unit: 'm' };
                }
                if (Object.keys(readings).length > 0) {
                    await this._insertSensorReading('BMP_R', readings, data.received_at);
                    inserts++;
                }
            }

            // GPS NEO-6M
            if (data.gps && data.gps.fix && data.gps.latitude !== undefined) {
                const readings = {
                    location: {
                        latitude: data.gps.latitude,
                        longitude: data.gps.longitude,
                        altitude: { value: data.gps.altitude || 0, unit: 'm' }
                    },
                    satellites: data.gps.satellites || 0,
                    fix: data.gps.fix
                };
                await this._insertSensorReading('GPS_NEO_R', readings, data.received_at);
                inserts++;
            }

            if (inserts > 0) {
                console.log(`${inserts} lecturas almacenadas en BD`);
            }
        } catch (error) {
            console.error('Error almacenando datos:', error);
            throw error;
        }
    }

    /**
     * Inserta una lectura de sensor en la base de datos
     */
    async _insertSensorReading(sensorRef, readings, timestamp) {
        try {
            // Mapear referencia del sensor
            const dbReference = this.config.SENSOR_MAPPING[sensorRef];
            if (!dbReference) {
                console.warn(`No hay mapeo para sensor: ${sensorRef}`);
                return;
            }

            const query = 'SELECT id_sensor FROM tblSensor WHERE referencia_sensor = ?';
            const sensorResult = await crud.executeSelectQuery(query, [dbReference]);
            
            if (!sensorResult || sensorResult.length === 0) {
                console.error(`Sensor ${dbReference} no encontrado en BD`);
                return;
            }
            
            const sensorId = sensorResult[0].id_sensor;
            
            const lecturaData = {
                id_sensor: sensorId,
                id_evento: 4, //valor quemado, cambiar en prueba real
                valor_lectura: JSON.stringify(readings),
                fecha_lectura: Date.now()
            };

            await lecturaServicio.insertarLectura(lecturaData);
            console.log(`Lectura insertada: ${sensorRef} → ${dbReference}`);
            
        } catch (error) {
            console.error(`Error insertando lectura de ${sensorRef}:`, error);
            throw error;
        }
    }

    /**
     * Detecta eventos importantes durante el vuelo
     */
    _detectEvents(data, metrics) {
        // Cambio de estado de vuelo
        if (this.lastState && this.lastState !== data.state) {
            console.log(`Cambio de estado: ${this.lastState} → ${data.state}`);
            this.emit('state_change', {
                from: this.lastState,
                to: data.state,
                timestamp: data.received_at
            });
        }
        this.lastState = data.state;

        // Apogeo alcanzado
        if (data.state === 'APOGEE') {
            console.log(`Apogeo alcanzado: ${metrics.maxAltitude.toFixed(2)}m`);
            this.emit('apogee_reached', {
                altitude: metrics.maxAltitude,
                flightTime: metrics.flightTime,
                timestamp: data.received_at
            });
        }

        // GPS fix recuperado
        if (data.gps && data.gps.fix && (!this.lastGpsFix || !this.lastGpsFix.fix)) {
            console.log('GPS fix adquirido');
            this.emit('gps_fix_acquired', {
                latitude: data.gps.latitude,
                longitude: data.gps.longitude,
                satellites: data.gps.satellites,
                timestamp: data.received_at
            });
        }
        this.lastGpsFix = data.gps;
    }

    /**
     * Resetea métricas de vuelo
     */
    _resetFlightMetrics() {
        this.lastAltitude = null;
        this.lastTimestamp = null;
        this.maxAltitude = 0;
        this.flightStartTime = null;
        this.totalPackets = 0;
        this.lostPackets = 0;
        this.lastState = null;
        this.lastGpsFix = null;
        console.log('Métricas de vuelo reseteadas');
    }

    /**
     * Obtiene estadísticas actuales
     */
    getStats() {
        return {
            totalPackets: this.totalPackets,
            lostPackets: this.lostPackets,
            packetLossRate: this.totalPackets > 0 
                ? (this.lostPackets / this.totalPackets) * 100 
                : 0,
            maxAltitude: this.maxAltitude,
            flightTime: this.flightStartTime !== null && this.lastTimestamp !== null
                ? (this.lastTimestamp - this.flightStartTime) / 1000
                : 0
        };
    }
}

module.exports = RocketDataProcessing;
