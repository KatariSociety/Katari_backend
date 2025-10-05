const Database = require('../../modelo/database/conexion');
const crud = require('../../modelo/database/crud');

/**
 * Servidor MCP para consultas a la base de datos con Ollama
 */
class MCPServer {
    constructor() {
        this.tools = this.initializeTools();
    }

    /**
     * Inicializa las herramientas disponibles para el MCP
     */
    initializeTools() {
        return {
            query_database: {
                description: "Ejecuta una consulta SELECT en la base de datos SQLite",
                parameters: {
                    query: "Consulta SQL a ejecutar",
                    params: "Parámetros opcionales para la consulta (array)"
                },
                handler: this.queryDatabase.bind(this)
            },
            get_lecturas: {
                description: "Obtiene lecturas de sensores con filtros opcionales",
                parameters: {
                    id_sensor: "ID del sensor (opcional)",
                    id_evento: "ID del evento (opcional)",
                    limit: "Límite de resultados (opcional)"
                },
                handler: this.getLecturas.bind(this)
            },
            get_sensores: {
                description: "Obtiene información de todos los sensores o de un dispositivo específico",
                parameters: {
                    id_dispositivo: "ID del dispositivo (opcional)"
                },
                handler: this.getSensores.bind(this)
            },
            get_eventos: {
                description: "Obtiene información de eventos",
                parameters: {
                    estado: "Estado del evento: completado o fallido (opcional)",
                    tipo: "Tipo de evento: despegue o prueba (opcional)"
                },
                handler: this.getEventos.bind(this)
            },
            get_dispositivos: {
                description: "Obtiene información de dispositivos (cohetes y satélites)",
                parameters: {
                    tipo: "Tipo de dispositivo: cohete o satelite (opcional)"
                },
                handler: this.getDispositivos.bind(this)
            },
            get_estadisticas_sensor: {
                description: "Obtiene estadísticas de un sensor específico",
                parameters: {
                    id_sensor: "ID del sensor",
                    id_evento: "ID del evento (opcional)"
                },
                handler: this.getEstadisticasSensor.bind(this)
            },
            get_imagenes: {
                description: "Obtiene imágenes capturadas durante eventos",
                parameters: {
                    id_evento: "ID del evento (opcional)",
                    id_sensor: "ID del sensor (opcional)"
                },
                handler: this.getImagenes.bind(this)
            },
            get_schema: {
                description: "Obtiene el esquema de la base de datos (tablas y columnas)",
                parameters: {},
                handler: this.getSchema.bind(this)
            }
        };
    }

    /**
     * Ejecuta una consulta SELECT en la base de datos
     */
    async queryDatabase({ query, params = [] }) {
        try {
            if (!query.trim().toUpperCase().startsWith('SELECT')) {
                return { error: "Solo se permiten consultas SELECT por seguridad" };
            }
            const results = crud.executeSelectQuery(query, params);
            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Obtiene lecturas de sensores
     */
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

    /**
     * Obtiene información de sensores
     */
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

    /**
     * Obtiene información de eventos
     */
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

    /**
     * Obtiene información de dispositivos
     */
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

    /**
     * Obtiene estadísticas de un sensor
     */
    async getEstadisticasSensor({ id_sensor, id_evento }) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_lecturas,
                    AVG(valor_lectura) as promedio,
                    MIN(valor_lectura) as minimo,
                    MAX(valor_lectura) as maximo,
                    MIN(fecha_lectura) as primera_lectura,
                    MAX(fecha_lectura) as ultima_lectura
                FROM tblLectura
                WHERE id_sensor = ?
            `;
            const params = [id_sensor];

            if (id_evento) {
                query += ` AND id_evento = ?`;
                params.push(id_evento);
            }

            const results = crud.executeSelectQuery(query, params);
            return { success: true, data: results[0] };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Obtiene imágenes
     */
    async getImagenes({ id_evento, id_sensor }) {
        try {
            let query = `
                SELECT i.*, s.nombre_sensor, e.nombre_evento 
                FROM tblImagen i
                JOIN tblSensor s ON i.id_sensor = s.id_sensor
                JOIN tblEvento e ON i.id_evento = e.id_evento
                WHERE 1=1
            `;
            const params = [];

            if (id_evento) {
                query += ` AND i.id_evento = ?`;
                params.push(id_evento);
            }
            if (id_sensor) {
                query += ` AND i.id_sensor = ?`;
                params.push(id_sensor);
            }
            query += ` ORDER BY i.fecha_imagen DESC`;

            const results = crud.executeSelectQuery(query, params);
            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Obtiene el esquema de la base de datos
     */
    async getSchema() {
        try {
            const query = `
                SELECT 
                    m.name as table_name,
                    p.name as column_name,
                    p.type as data_type
                FROM sqlite_master m
                LEFT JOIN pragma_table_info(m.name) p
                WHERE m.type = 'table' AND m.name LIKE 'tbl%'
                ORDER BY m.name, p.cid
            `;
            const results = crud.executeSelectQuery(query);
            
            // Agrupar por tabla
            const schema = {};
            results.forEach(row => {
                if (!schema[row.table_name]) {
                    schema[row.table_name] = [];
                }
                schema[row.table_name].push({
                    column: row.column_name,
                    type: row.data_type
                });
            });

            return { success: true, data: schema };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Procesa una petición del usuario
     */
    async processRequest(userMessage, conversationHistory = []) {
        try {
            // Agregar el contexto de las herramientas disponibles
            const toolsContext = Object.entries(this.tools).map(([name, tool]) => {
                return `- ${name}: ${tool.description}. Parámetros: ${JSON.stringify(tool.parameters)}`;
            }).join('\n');

            const systemPrompt = `Eres un asistente especializado en consultar la base de datos de telemetría de cohetes de Katari Society. 

La base de datos tiene las siguientes tablas:
- tblDispositivo: Información de dispositivos (cohetes y satélites)
- tblSensor: Sensores instalados en los dispositivos
- tblEvento: Eventos de vuelo (despegues y pruebas)
- tblLectura: Lecturas de los sensores durante eventos
- tblImagen: Imágenes capturadas durante eventos
- tblEventoSensor: Relación entre eventos y sensores

Herramientas disponibles:
${toolsContext}

Cuando el usuario haga una pregunta:
1. Identifica qué herramienta(s) necesitas usar
2. Responde en formato JSON con: { "tool": "nombre_herramienta", "params": {...} }
3. Si necesitas información adicional, pregunta al usuario

Si no necesitas usar ninguna herramienta, responde directamente al usuario.`;

            return {
                systemPrompt,
                userMessage,
                conversationHistory
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Ejecuta una herramienta específica
     */
    async executeTool(toolName, params) {
        try {
            if (!this.tools[toolName]) {
                return { error: `Herramienta '${toolName}' no encontrada` };
            }

            return await this.tools[toolName].handler(params);
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Obtiene la lista de herramientas disponibles
     */
    getAvailableTools() {
        return Object.entries(this.tools).map(([name, tool]) => ({
            name,
            description: tool.description,
            parameters: tool.parameters
        }));
    }
}

module.exports = new MCPServer();
