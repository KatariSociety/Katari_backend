const crud = require('../../modelo/database/crud');

/**
 * Herramientas analíticas avanzadas para análisis de datos de sensores
 * Optimizadas para lectura y análisis, sin modificación de datos
 */
class AnalyticsTools {
    /**
     * Análisis temporal de un sensor específico
     */
    static async getTemporalAnalysis({ id_sensor, id_evento }) {
        try {
            const query = `
                SELECT 
                    l.valor_lectura,
                    l.fecha_lectura,
                    s.nombre_sensor,
                    s.tipo_sensor,
                    e.nombre_evento
                FROM tblLectura l
                JOIN tblSensor s ON l.id_sensor = s.id_sensor
                JOIN tblEvento e ON l.id_evento = e.id_evento
                WHERE l.id_sensor = ?
                ${id_evento ? 'AND l.id_evento = ?' : ''}
                ORDER BY l.fecha_lectura ASC
            `;

            const params = id_evento ? [id_sensor, id_evento] : [id_sensor];
            const readings = crud.executeSelectQuery(query, params);

            if (readings.length === 0) {
                return { success: true, data: null, message: 'No hay datos disponibles' };
            }

            // Calcular métricas temporales
            const values = readings.map(r => r.valor_lectura);
            const timestamps = readings.map(r => r.fecha_lectura);

            const stats = {
                sensor_info: {
                    id_sensor,
                    nombre: readings[0].nombre_sensor,
                    tipo: readings[0].tipo_sensor,
                    evento: readings[0].nombre_evento
                },
                temporal_stats: {
                    total_readings: readings.length,
                    time_span_ms: timestamps[timestamps.length - 1] - timestamps[0],
                    first_reading: timestamps[0],
                    last_reading: timestamps[timestamps.length - 1],
                    avg_sampling_rate_ms: readings.length > 1
                        ? (timestamps[timestamps.length - 1] - timestamps[0]) / (readings.length - 1)
                        : 0
                },
                value_stats: {
                    mean: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    range: Math.max(...values) - Math.min(...values),
                    std_dev: this._calculateStdDev(values)
                },
                readings: readings
            };

            return { success: true, data: stats };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Detección de anomalías usando z-score
     */
    static async detectAnomalies({ id_sensor, id_evento, threshold = 2.5 }) {
        try {
            const query = `
                SELECT 
                    l.id_lectura,
                    l.valor_lectura,
                    l.fecha_lectura,
                    s.nombre_sensor,
                    s.tipo_sensor
                FROM tblLectura l
                JOIN tblSensor s ON l.id_sensor = s.id_sensor
                WHERE l.id_sensor = ?
                ${id_evento ? 'AND l.id_evento = ?' : ''}
                ORDER BY l.fecha_lectura ASC
            `;

            const params = id_evento ? [id_sensor, id_evento] : [id_sensor];
            const readings = crud.executeSelectQuery(query, params);

            if (readings.length < 3) {
                return { success: true, data: { anomalies: [], message: 'Datos insuficientes para análisis' } };
            }

            const values = readings.map(r => r.valor_lectura);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = this._calculateStdDev(values);

            // Detectar anomalías usando z-score
            const anomalies = readings.filter((reading, idx) => {
                const zScore = Math.abs((reading.valor_lectura - mean) / stdDev);
                return zScore > threshold;
            }).map((reading, idx) => {
                const zScore = (reading.valor_lectura - mean) / stdDev;
                return {
                    ...reading,
                    z_score: zScore,
                    deviation_percent: ((reading.valor_lectura - mean) / mean) * 100
                };
            });

            return {
                success: true,
                data: {
                    sensor: readings[0].nombre_sensor,
                    tipo: readings[0].tipo_sensor,
                    total_readings: readings.length,
                    anomalies_count: anomalies.length,
                    anomaly_rate: (anomalies.length / readings.length) * 100,
                    threshold_used: threshold,
                    statistics: { mean, std_dev: stdDev },
                    anomalies
                }
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Análisis de correlación entre dos sensores
     */
    static async getSensorCorrelation({ id_sensor_1, id_sensor_2, id_evento }) {
        try {
            const query = `
                SELECT 
                    l1.valor_lectura as valor_sensor_1,
                    l2.valor_lectura as valor_sensor_2,
                    l1.fecha_lectura,
                    s1.nombre_sensor as nombre_sensor_1,
                    s2.nombre_sensor as nombre_sensor_2
                FROM tblLectura l1
                JOIN tblLectura l2 ON l1.fecha_lectura = l2.fecha_lectura AND l1.id_evento = l2.id_evento
                JOIN tblSensor s1 ON l1.id_sensor = s1.id_sensor
                JOIN tblSensor s2 ON l2.id_sensor = s2.id_sensor
                WHERE l1.id_sensor = ? AND l2.id_sensor = ?
                ${id_evento ? 'AND l1.id_evento = ?' : ''}
                ORDER BY l1.fecha_lectura ASC
            `;

            const params = id_evento ? [id_sensor_1, id_sensor_2, id_evento] : [id_sensor_1, id_sensor_2];
            const readings = crud.executeSelectQuery(query, params);

            if (readings.length < 2) {
                return { success: true, data: null, message: 'Datos insuficientes para correlación' };
            }

            const x = readings.map(r => r.valor_sensor_1);
            const y = readings.map(r => r.valor_sensor_2);

            const correlation = this._calculateCorrelation(x, y);

            return {
                success: true,
                data: {
                    sensor_1: readings[0].nombre_sensor_1,
                    sensor_2: readings[0].nombre_sensor_2,
                    correlation_coefficient: correlation,
                    interpretation: this._interpretCorrelation(correlation),
                    sample_size: readings.length,
                    readings
                }
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Análisis detallado de un evento completo
     */
    static async getEventAnalysis({ id_evento }) {
        try {
            // Información del evento
            const eventoQuery = `SELECT * FROM tblEvento WHERE id_evento = ?`;
            const evento = crud.executeSelectQuery(eventoQuery, [id_evento])[0];

            if (!evento) {
                return { error: 'Evento no encontrado' };
            }

            // Sensores involucrados
            const sensoresQuery = `
                SELECT DISTINCT s.*, COUNT(l.id_lectura) as total_lecturas
                FROM tblSensor s
                JOIN tblLectura l ON s.id_sensor = l.id_sensor
                WHERE l.id_evento = ?
                GROUP BY s.id_sensor
            `;
            const sensores = crud.executeSelectQuery(sensoresQuery, [id_evento]);

            // Estadísticas por sensor (procesando valores JSON)
            const sensorStats = sensores.map(sensor => {
                // Obtener todas las lecturas del sensor
                const lecturasQuery = `
                    SELECT valor_lectura, fecha_lectura
                    FROM tblLectura
                    WHERE id_sensor = ? AND id_evento = ?
                    ORDER BY fecha_lectura ASC
                `;
                const lecturas = crud.executeSelectQuery(lecturasQuery, [sensor.id_sensor, id_evento]);

                // Parsear valores JSON y extraer métricas
                const valoresParseados = this._parseAndExtractValues(lecturas, sensor.tipo_sensor);

                return {
                    ...sensor,
                    estadisticas: {
                        lecturas: lecturas.length,
                        primera_lectura: lecturas[0]?.fecha_lectura,
                        ultima_lectura: lecturas[lecturas.length - 1]?.fecha_lectura,
                        valores_parseados: valoresParseados
                    }
                };
            });

            // Duración total del evento
            const duration = evento.fecha_fin_evento
                ? evento.fecha_fin_evento - evento.fecha_inicio_evento
                : Date.now() - evento.fecha_inicio_evento;

            return {
                success: true,
                data: {
                    evento: {
                        ...evento,
                        duracion_ms: duration,
                        duracion_segundos: duration / 1000
                    },
                    sensores_activos: sensores.length,
                    total_lecturas: sensores.reduce((sum, s) => sum + s.total_lecturas, 0),
                    estadisticas_por_sensor: sensorStats
                }
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Obtener ventana de tiempo de lecturas (para análisis en tiempo real)
     */
    static async getTimeWindow({ id_sensor, window_seconds = 60, limit = 1000 }) {
        try {
            const cutoffTime = Date.now() - (window_seconds * 1000);

            const query = `
                SELECT 
                    l.*,
                    s.nombre_sensor,
                    s.tipo_sensor,
                    e.nombre_evento
                FROM tblLectura l
                JOIN tblSensor s ON l.id_sensor = s.id_sensor
                JOIN tblEvento e ON l.id_evento = e.id_evento
                WHERE l.id_sensor = ? AND l.fecha_lectura >= ?
                ORDER BY l.fecha_lectura DESC
                LIMIT ?
            `;

            const readings = crud.executeSelectQuery(query, [id_sensor, cutoffTime, limit]);

            return {
                success: true,
                data: {
                    window_seconds,
                    cutoff_timestamp: cutoffTime,
                    readings_count: readings.length,
                    readings
                }
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Obtener resumen comparativo de múltiples sensores
     */
    static async getMultiSensorComparison({ id_evento, sensor_ids = [] }) {
        try {
            const whereClause = sensor_ids.length > 0
                ? `AND s.id_sensor IN (${sensor_ids.join(',')})`
                : '';

            const query = `
                SELECT 
                    s.id_sensor,
                    s.nombre_sensor,
                    s.tipo_sensor,
                    COUNT(l.id_lectura) as total_lecturas,
                    AVG(l.valor_lectura) as promedio,
                    MIN(l.valor_lectura) as minimo,
                    MAX(l.valor_lectura) as maximo,
                    MIN(l.fecha_lectura) as primera_lectura,
                    MAX(l.fecha_lectura) as ultima_lectura
                FROM tblSensor s
                LEFT JOIN tblLectura l ON s.id_sensor = l.id_sensor AND l.id_evento = ?
                WHERE 1=1 ${whereClause}
                GROUP BY s.id_sensor
                ORDER BY s.tipo_sensor, s.nombre_sensor
            `;

            const comparison = crud.executeSelectQuery(query, [id_evento]);

            return {
                success: true,
                data: {
                    id_evento,
                    sensores_comparados: comparison.length,
                    comparacion: comparison
                }
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    // Funciones auxiliares estadísticas
    static _calculateStdDev(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(variance);
    }

    static _calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    static _interpretCorrelation(r) {
        const absR = Math.abs(r);
        if (absR >= 0.9) return 'Correlación muy fuerte';
        if (absR >= 0.7) return 'Correlación fuerte';
        if (absR >= 0.5) return 'Correlación moderada';
        if (absR >= 0.3) return 'Correlación débil';
        return 'Correlación muy débil o nula';
    }

    /**
     * Parsea valores JSON de lecturas y extrae métricas numéricas
     */
    static _parseAndExtractValues(lecturas, tipoSensor) {
        if (!lecturas || lecturas.length === 0) {
            return { error: 'Sin lecturas disponibles' };
        }

        try {
            // Parsear todos los valores JSON
            const datosParsed = lecturas.map(l => {
                try {
                    return JSON.parse(l.valor_lectura);
                } catch (e) {
                    return null;
                }
            }).filter(d => d !== null);

            if (datosParsed.length === 0) {
                return { error: 'No se pudieron parsear los valores JSON' };
            }

            // Extraer valores según el tipo de sensor
            let metricas = {};

            // BMP280 / Altímetro
            if (tipoSensor === 'altimetro') {
                const temperaturas = datosParsed.map(d => d.temperature?.value).filter(v => v !== undefined);
                const presiones = datosParsed.map(d => d.pressure?.value).filter(v => v !== undefined);
                const altitudes = datosParsed.map(d => d.altitude?.value).filter(v => v !== undefined);

                metricas = {
                    temperatura: temperaturas.length > 0 ? {
                        min: Math.min(...temperaturas),
                        max: Math.max(...temperaturas),
                        avg: temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length,
                        unit: 'C'
                    } : null,
                    presion: presiones.length > 0 ? {
                        min: Math.min(...presiones),
                        max: Math.max(...presiones),
                        avg: presiones.reduce((a, b) => a + b, 0) / presiones.length,
                        unit: 'hPa'
                    } : null,
                    altitud: altitudes.length > 0 ? {
                        min: Math.min(...altitudes),
                        max: Math.max(...altitudes),
                        avg: altitudes.reduce((a, b) => a + b, 0) / altitudes.length,
                        unit: 'm'
                    } : null
                };
            }

            // MPU9250 / Acelerómetro
            else if (tipoSensor === 'Movimiento Inercial' || tipoSensor === 'acelerometro') {
                const accelX = datosParsed.map(d => d.accelerometer?.x?.value).filter(v => v !== undefined);
                const accelY = datosParsed.map(d => d.accelerometer?.y?.value).filter(v => v !== undefined);
                const accelZ = datosParsed.map(d => d.accelerometer?.z?.value).filter(v => v !== undefined);

                metricas = {
                    aceleracion_x: accelX.length > 0 ? {
                        min: Math.min(...accelX),
                        max: Math.max(...accelX),
                        avg: accelX.reduce((a, b) => a + b, 0) / accelX.length,
                        unit: 'g'
                    } : null,
                    aceleracion_y: accelY.length > 0 ? {
                        min: Math.min(...accelY),
                        max: Math.max(...accelY),
                        avg: accelY.reduce((a, b) => a + b, 0) / accelY.length,
                        unit: 'g'
                    } : null,
                    aceleracion_z: accelZ.length > 0 ? {
                        min: Math.min(...accelZ),
                        max: Math.max(...accelZ),
                        avg: accelZ.reduce((a, b) => a + b, 0) / accelZ.length,
                        unit: 'g'
                    } : null
                };
            }

            // GPS
            else if (tipoSensor === 'gps') {
                const latitudes = datosParsed.map(d => d.latitude?.value).filter(v => v !== undefined && v !== 0);
                const longitudes = datosParsed.map(d => d.longitude?.value).filter(v => v !== undefined && v !== 0);
                const altitudes = datosParsed.map(d => d.altitude?.value).filter(v => v !== undefined);
                const satellites = datosParsed.map(d => d.satellites?.value).filter(v => v !== undefined);

                metricas = {
                    latitud: latitudes.length > 0 ? {
                        min: Math.min(...latitudes),
                        max: Math.max(...latitudes),
                        avg: latitudes.reduce((a, b) => a + b, 0) / latitudes.length,
                        unit: 'degrees'
                    } : null,
                    longitud: longitudes.length > 0 ? {
                        min: Math.min(...longitudes),
                        max: Math.max(...longitudes),
                        avg: longitudes.reduce((a, b) => a + b, 0) / longitudes.length,
                        unit: 'degrees'
                    } : null,
                    altitud: altitudes.length > 0 ? {
                        min: Math.min(...altitudes),
                        max: Math.max(...altitudes),
                        avg: altitudes.reduce((a, b) => a + b, 0) / altitudes.length,
                        unit: 'm'
                    } : null,
                    satelites: satellites.length > 0 ? {
                        min: Math.min(...satellites),
                        max: Math.max(...satellites),
                        avg: satellites.reduce((a, b) => a + b, 0) / satellites.length,
                        unit: 'count'
                    } : null
                };
            }

            // Sensor genérico o desconocido
            else {
                metricas = {
                    info: 'Tipo de sensor no soportado para análisis detallado',
                    datos_raw: datosParsed.slice(0, 3) // Primeras 3 lecturas como muestra
                };
            }

            return metricas;

        } catch (error) {
            return {
                error: 'Error procesando valores JSON',
                message: error.message
            };
        }
    }
}

module.exports = AnalyticsTools;
