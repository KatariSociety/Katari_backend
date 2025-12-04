const mcpServerV2 = require('./mcpServerV2');
const DeepSeekClient = require('./deepseekClient');

/**
 * Orquestador V2 - Integración DeepSeek con function calling nativo
 */
class MCPOrchestratorV2 {
    constructor() {
        this.deepseekClient = new DeepSeekClient();
        this.mcpServer = mcpServerV2;
        this.conversationHistories = new Map();
        
        // System prompt optimizado para análisis de telemetría
        this.systemPrompt = `Eres un asistente experto en análisis de telemetría aeroespacial de Katari Society.

CONTEXTO DEL SISTEMA:
Katari Society desarrolla cohetes y satélites con múltiples sensores IoT para monitoreo ambiental.

BASE DE DATOS:
- tblDispositivo: Cohetes y satélites
- tblSensor: Sensores (altímetro, acelerómetro, GPS, IMU, temperatura, presión)
- tblEvento: Eventos de vuelo (despegues y pruebas)
- tblLectura: Lecturas de sensores (valores almacenados como JSON)
- tblImagen: Imágenes capturadas con geolocalización

FORMATO DE DATOS DE SENSORES:
Los datos de sensores se devuelven en el campo "valores_parseados" con la siguiente estructura:

BMP280 (Altímetro):
{
  temperatura: { min, max, avg, unit: "C" },
  presion: { min, max, avg, unit: "hPa" },
  altitud: { min, max, avg, unit: "m" }
}

MPU9250 (Movimiento Inercial):
{
  aceleracion_x: { min, max, avg, unit: "g" },
  aceleracion_y: { min, max, avg, unit: "g" },
  aceleracion_z: { min, max, avg, unit: "g" }
}

GPS:
{
  latitud: { min, max, avg, unit: "degrees" },
  longitud: { min, max, avg, unit: "degrees" },
  altitud: { min, max, avg, unit: "m" },
  satelites: { min, max, avg, unit: "count" }
}

CAPACIDADES:
1. Análisis de datos en tiempo real
2. Detección de anomalías
3. Correlación entre sensores
4. Análisis estadístico avanzado
5. Interpretación de eventos de vuelo

INSTRUCCIONES CRÍTICAS:
- SIEMPRE usa las herramientas disponibles para obtener datos reales de la base de datos
- Los valores en "valores_parseados" son DATOS REALES procesados, úsalos para análisis
- NUNCA respondas sin consultar la base de datos cuando el usuario pregunte por datos
- Si el usuario pregunta "¿cuántos sensores?", usa get_sensores
- Si el usuario pregunta por eventos, usa get_eventos
- Si el usuario pregunta por dispositivos, usa get_dispositivos
- Proporciona análisis técnicos precisos basados en datos reales
- Detecta problemas y anomalías automáticamente (ej: presión anómala, GPS sin fix)
- Explica hallazgos de forma clara pero técnica
- Sugiere acciones cuando sea apropiado`;
    }

    /**
     * Procesa un mensaje con DeepSeek usando function calling nativo
     */
    async processMessage(userMessage, sessionId = 'default') {
        try {
            // Obtener o crear historial
            if (!this.conversationHistories.has(sessionId)) {
                this.conversationHistories.set(sessionId, []);
            }
            const history = this.conversationHistories.get(sessionId);

            // Agregar mensaje del usuario al historial ANTES de la llamada
            history.push({ role: 'user', content: userMessage });

            // Obtener herramientas en formato OpenAI/DeepSeek
            const tools = this.mcpServer.getToolsForLLM();

            // Primera llamada a DeepSeek con tools disponibles
            const response = await this.deepseekClient.generateWithTools(
                userMessage,
                this.systemPrompt,
                tools,
                history.slice(0, -1) // Pasar historial sin el último mensaje (ya está en userMessage)
            );

            if (!response.success) {
                return {
                    success: false,
                    error: response.error
                };
            }

            let finalResponse;
            let toolResults = [];

            // Si DeepSeek quiere usar herramientas
            if (response.type === 'tool_call') {
                // Ejecutar todas las herramientas solicitadas
                const toolExecutions = await Promise.all(
                    response.tool_calls.map(async (toolCall) => {
                        const result = await this.mcpServer.executeTool(
                            toolCall.name,
                            toolCall.arguments
                        );
                        return {
                            tool_call_id: toolCall.id,
                            name: toolCall.name,
                            result
                        };
                    })
                );

                toolResults = toolExecutions;

                // Agregar mensaje del asistente con tool_calls al historial
                history.push({
                    role: 'assistant',
                    content: null,
                    tool_calls: response.tool_calls.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments)
                        }
                    }))
                });

                // Agregar resultados de las herramientas al historial
                toolExecutions.forEach(exec => {
                    history.push({
                        role: 'tool',
                        tool_call_id: exec.tool_call_id,
                        content: JSON.stringify(exec.result)
                    });
                });

                // Segunda llamada a DeepSeek para que genere la respuesta final
                // Usar generateWithTools sin tools para que maneje correctamente el historial con tool_calls
                const finalGeneration = await this.deepseekClient.generateWithTools(
                    'Basándote en los resultados de las herramientas, genera una respuesta clara y útil para el usuario.',
                    this.systemPrompt,
                    [], // Sin herramientas en la segunda llamada
                    history
                );

                if (finalGeneration.success) {
                    finalResponse = finalGeneration.response;
                } else {
                    // Si falla, usar los datos crudos
                    finalResponse = this._formatToolResults(toolExecutions);
                }

            } else {
                // Respuesta directa sin herramientas
                finalResponse = response.response;
            }

            // Agregar respuesta final del asistente al historial
            history.push({ role: 'assistant', content: finalResponse });

            // Limitar historial a últimos 20 mensajes
            if (history.length > 20) {
                this.conversationHistories.set(sessionId, history.slice(-20));
            }

            return {
                success: true,
                response: finalResponse,
                tools_used: toolResults.map(t => t.name),
                model_info: this.deepseekClient.getModelInfo()
            };

        } catch (error) {
            console.error('❌ Error en MCPOrchestratorV2:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Análisis rápido de datos de sensores
     */
    async quickAnalysis(id_sensor, id_evento = null) {
        try {
            // Obtener datos temporales
            const temporal = await this.mcpServer.executeTool('analyze_temporal', {
                id_sensor,
                id_evento
            });

            // Detectar anomalías
            const anomalies = await this.mcpServer.executeTool('detect_anomalies', {
                id_sensor,
                id_evento,
                threshold: 2.5
            });

            // Generar análisis con DeepSeek
            const analysisData = {
                temporal: temporal.data,
                anomalies: anomalies.data
            };

            const response = await this.deepseekClient.analyzeSensorData(
                analysisData,
                'quick_analysis'
            );

            return {
                success: true,
                raw_data: analysisData,
                analysis: response.response
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Análisis completo de un evento
     */
    async analyzeEvent(id_evento) {
        try {
            const eventData = await this.mcpServer.executeTool('analyze_event', {
                id_evento
            });

            if (!eventData.success) {
                return eventData;
            }

            const response = await this.deepseekClient.analyzeSensorData(
                eventData.data,
                'event_analysis'
            );

            return {
                success: true,
                event_data: eventData.data,
                analysis: response.response
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Formatea resultados de herramientas para mostrar al usuario
     */
    _formatToolResults(toolExecutions) {
        let formatted = '**Resultados de análisis:**\n\n';
        
        toolExecutions.forEach((exec, idx) => {
            formatted += `**${idx + 1}. ${exec.name}**\n`;
            formatted += '```json\n';
            formatted += JSON.stringify(exec.result, null, 2);
            formatted += '\n```\n\n';
        });

        return formatted;
    }

    /**
     * Limpia historial de una sesión
     */
    clearHistory(sessionId) {
        this.conversationHistories.delete(sessionId);
    }

    /**
     * Limpia todos los historiales
     */
    clearAllHistories() {
        this.conversationHistories.clear();
    }

    /**
     * Verifica estado de DeepSeek
     */
    async checkStatus() {
        const deepseekStatus = await this.deepseekClient.checkHealth();
        const cacheStats = await this.mcpServer.getCacheStats();

        return {
            deepseek: deepseekStatus,
            cache: cacheStats.data,
            tools_available: this.mcpServer.getToolsForLLM().length
        };
    }

    /**
     * Obtiene herramientas disponibles
     */
    getAvailableTools() {
        return this.mcpServer.getToolsForLLM().map(tool => ({
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters
        }));
    }

    /**
     * Limpia caché de consultas
     */
    clearCache() {
        this.mcpServer.clearCache();
    }

    /**
     * Obtiene estadísticas del sistema
     */
    async getSystemStats() {
        const status = await this.checkStatus();
        return {
            ...status,
            active_sessions: this.conversationHistories.size,
            model_info: this.deepseekClient.getModelInfo()
        };
    }
}

module.exports = new MCPOrchestratorV2();
