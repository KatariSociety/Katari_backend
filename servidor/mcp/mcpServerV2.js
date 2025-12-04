const Database = require('../../modelo/database/conexion');
const crud = require('../../modelo/database/crud');
const AnalyticsTools = require('./analyticsTools');
const QueryCache = require('./queryCache');

/**
 * Servidor MCP V2 - Versión mejorada con herramientas analíticas avanzadas
 * Optimizado para DeepSeek API con function calling nativo
 */
class MCPServerV2 {
    constructor() {
        this.cache = new QueryCache(100, 5); // 100 entradas, 5 minutos TTL
        this.tools = this.initializeTools();
        this.toolsForLLM = this.generateToolsForLLM();
    }

    /**
     * Inicializa todas las herramientas disponibles
     */
    initializeTools() {
        return {
            // Herramientas básicas (lectura)
            get_lecturas: {
                description: "Obtiene lecturas de sensores con filtros opcionales",
                handler: this.getLecturas.bind(this)
            },
            get_sensores: {
                description: "Obtiene información de todos los sensores o de un dispositivo específico",
                handler: this.getSensores.bind(this)
            },
            get_eventos: {
                description: "Obtiene información de eventos de vuelo",
                handler: this.getEventos.bind(this)
            },
            get_dispositivos: {
                description: "Obtiene información de dispositivos (cohetes y satélites)",
                handler: this.getDispositivos.bind(this)
            },

            // Herramientas analíticas avanzadas
            analyze_temporal: {
                description: "Análisis temporal detallado de un sensor: tendencias, estadísticas, frecuencia de muestreo",
                handler: AnalyticsTools.getTemporalAnalysis.bind(AnalyticsTools)
            },
            detect_anomalies: {
                description: "Detecta anomalías en lecturas de sensores usando análisis estadístico (z-score)",
                handler: AnalyticsTools.detectAnomalies.bind(AnalyticsTools)
            },
            correlate_sensors: {
                description: "Calcula la correlación entre dos sensores para identificar relaciones",
                handler: AnalyticsTools.getSensorCorrelation.bind(AnalyticsTools)
            },
            analyze_event: {
                description: "Análisis completo de un evento: sensores activos, estadísticas, duración",
                handler: AnalyticsTools.getEventAnalysis.bind(AnalyticsTools)
            },
            get_time_window: {
                description: "Obtiene lecturas recientes en una ventana de tiempo (útil para datos en tiempo real)",
                handler: AnalyticsTools.getTimeWindow.bind(AnalyticsTools)
            },
            compare_sensors: {
                description: "Compara estadísticas de múltiples sensores en un evento",
                handler: AnalyticsTools.getMultiSensorComparison.bind(AnalyticsTools)
            },

            // Herramientas de metadatos
            get_schema: {
                description: "Obtiene el esquema completo de la base de datos",
                handler: this.getSchema.bind(this)
            },
            get_cache_stats: {
                description: "Obtiene estadísticas del sistema de caché",
                handler: this.getCacheStats.bind(this)
            }
        };
    }

    /**
     * Genera definiciones de herramientas en formato OpenAI/DeepSeek
     * Compatible con function calling nativo
     */
    generateToolsForLLM() {
        return [
            {
                type: "function",
                function: {
                    name: "get_lecturas",
                    description: "Obtiene lecturas de sensores con filtros opcionales. Útil para ver datos crudos de sensores.",
                    parameters: {
                        type: "object",
                        properties: {
                            id_sensor: { type: "integer", description: "ID del sensor" },
                            id_evento: { type: "integer", description: "ID del evento" },
                            limit: { type: "integer", description: "Límite de resultados", default: 100 }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_sensores",
                    description: "Obtiene información de sensores instalados en dispositivos",
                    parameters: {
                        type: "object",
                        properties: {
                            id_dispositivo: { type: "integer", description: "ID del dispositivo para filtrar" }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_eventos",
                    description: "Obtiene información de eventos de vuelo (despegues y pruebas)",
                    parameters: {
                        type: "object",
                        properties: {
                            estado: { type: "string", enum: ["completado", "fallido"], description: "Estado del evento" },
                            tipo: { type: "string", enum: ["despegue", "prueba"], description: "Tipo de evento" }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "analyze_temporal",
                    description: "Análisis temporal avanzado: tendencias, estadísticas, frecuencia de muestreo, desviación estándar",
                    parameters: {
                        type: "object",
                        properties: {
                            id_sensor: { type: "integer", description: "ID del sensor a analizar" },
                            id_evento: { type: "integer", description: "ID del evento (opcional)" },
                            time_window: { type: "integer", description: "Ventana de tiempo en ms" }
                        },
                        required: ["id_sensor"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "detect_anomalies",
                    description: "Detecta lecturas anómalas usando z-score. Identifica valores fuera de lo normal.",
                    parameters: {
                        type: "object",
                        properties: {
                            id_sensor: { type: "integer", description: "ID del sensor" },
                            id_evento: { type: "integer", description: "ID del evento (opcional)" },
                            threshold: { type: "number", description: "Umbral z-score (default 2.5)", default: 2.5 }
                        },
                        required: ["id_sensor"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "correlate_sensors",
                    description: "Calcula correlación entre dos sensores. Útil para identificar relaciones causa-efecto.",
                    parameters: {
                        type: "object",
                        properties: {
                            id_sensor_1: { type: "integer", description: "ID del primer sensor" },
                            id_sensor_2: { type: "integer", description: "ID del segundo sensor" },
                            id_evento: { type: "integer", description: "ID del evento" }
                        },
                        required: ["id_sensor_1", "id_sensor_2"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "analyze_event",
                    description: "Análisis completo de un evento: sensores activos, total de lecturas, estadísticas, duración",
                    parameters: {
                        type: "object",
                        properties: {
                            id_evento: { type: "integer", description: "ID del evento a analizar" }
                        },
                        required: ["id_evento"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "compare_sensors",
                    description: "Compara estadísticas de múltiples sensores en un evento",
                    parameters: {
                        type: "object",
                        properties: {
                            id_evento: { type: "integer", description: "ID del evento" },
                            sensor_ids: { type: "array", items: { type: "integer" }, description: "IDs de sensores a comparar" }
                        },
                        required: ["id_evento"]
                    }
                }
            }
        ];
    }

    /**
     * Ejecuta una herramienta con caché automático
     */
    async executeTool(toolName, params) {
        try {
            if (!this.tools[toolName]) {
                return { error: `Herramienta '${toolName}' no encontrada` };
            }

            // Usar caché para herramientas de lectura
            const cacheableTools = ['get_lecturas', 'get_sensores', 'get_eventos', 'analyze_temporal'];
            
            if (cacheableTools.includes(toolName)) {
                return await this.cache.withCache(toolName, params, () => 
                    this.tools[toolName].handler(params)
                );
            }

            // Ejecutar sin caché
            return await this.tools[toolName].handler(params);
        } catch (error) {
            return { error: error.message };
        }
    }

    // Implementaciones de herramientas básicas
    async getLecturas({ id_sensor, id_evento, limit = 100 }) {
        try {
            let query = `
                SELECT l.*, s.nombre_sensor, s.tipo_sensor, e.nombre_evento 
                FROM tblLectura l
                JOIN tblSensor s ON l.id_sensor = s.id_sensor
                JOIN tblEvento e ON l.id_evento = e.id_evento
                WHERE 1=1
            `;
            const params = [];

            if (id_sensor) {
                query += ` AND l.id_sensor = ?`;
                params.push(id_sensor);
            }
            if (id_evento) {
                query += ` AND l.id_evento = ?`;
                params.push(id_evento);
            }
            query += ` ORDER BY l.fecha_lectura DESC LIMIT ?`;
            params.push(limit);

            const results = crud.executeSelectQuery(query, params);
            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getSensores({ id_dispositivo }) {
        try {
            let query = `
                SELECT s.*, d.nombre_dispositivo, d.tipo_dispositivo 
                FROM tblSensor s
                JOIN tblDispositivo d ON s.id_dispositivo = d.id_dispositivo
                WHERE 1=1
            `;
            const params = [];

            if (id_dispositivo) {
                query += ` AND s.id_dispositivo = ?`;
                params.push(id_dispositivo);
            }

            const results = crud.executeSelectQuery(query, params);
            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getEventos({ estado, tipo }) {
        try {
            let query = `SELECT * FROM tblEvento WHERE 1=1`;
            const params = [];

            if (estado) {
                query += ` AND estado_evento = ?`;
                params.push(estado);
            }
            if (tipo) {
                query += ` AND tipo_evento = ?`;
                params.push(tipo);
            }
            query += ` ORDER BY fecha_inicio_evento DESC`;

            const results = crud.executeSelectQuery(query, params);
            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getDispositivos({ tipo }) {
        try {
            let query = `SELECT * FROM tblDispositivo WHERE 1=1`;
            const params = [];

            if (tipo) {
                query += ` AND tipo_dispositivo = ?`;
                params.push(tipo);
            }

            const results = crud.executeSelectQuery(query, params);
            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getSchema() {
        try {
            const query = `
                SELECT 
                    m.name as table_name,
                    p.name as column_name,
                    p.type as data_type,
                    p.pk as is_primary_key
                FROM sqlite_master m
                LEFT JOIN pragma_table_info(m.name) p
                WHERE m.type = 'table' AND m.name LIKE 'tbl%'
                ORDER BY m.name, p.cid
            `;
            const results = crud.executeSelectQuery(query);
            
            const schema = {};
            results.forEach(row => {
                if (!schema[row.table_name]) {
                    schema[row.table_name] = [];
                }
                schema[row.table_name].push({
                    column: row.column_name,
                    type: row.data_type,
                    primary_key: row.is_primary_key === 1
                });
            });

            return { success: true, data: schema };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getCacheStats() {
        return { success: true, data: this.cache.getStats() };
    }

    /**
     * Obtiene las herramientas en formato para LLM
     */
    getToolsForLLM() {
        return this.toolsForLLM;
    }

    /**
     * Limpia el caché
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Invalida caché para un tipo de herramienta
     */
    invalidateCache(toolName) {
        this.cache.invalidate(toolName);
    }
}

module.exports = new MCPServerV2();
