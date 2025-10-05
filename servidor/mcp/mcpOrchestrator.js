const mcpServer = require('./mcpServer');
const OllamaClient = require('./ollamaClient');

/**
 * Orquestador que combina MCP y Ollama
 */
class MCPOrchestrator {
    constructor() {
        this.ollamaClient = new OllamaClient();
        this.mcpServer = mcpServer;
        this.conversationHistories = new Map(); // Almacena historiales por sessionId
    }

    /**
     * Procesa un mensaje del usuario
     */
    async processMessage(userMessage, sessionId = 'default') {
        try {
            // Obtener o crear historial de conversación
            if (!this.conversationHistories.has(sessionId)) {
                this.conversationHistories.set(sessionId, []);
            }
            const history = this.conversationHistories.get(sessionId);

            // Preparar el contexto para Ollama
            const { systemPrompt } = await this.mcpServer.processRequest(userMessage, history);

            // Primera pasada: Determinar si necesita usar herramientas
            const analysisPrompt = `${userMessage}

Analiza esta pregunta y determina si necesitas usar alguna herramienta de la base de datos para responder.
Si necesitas usar una herramienta, responde EXACTAMENTE en este formato JSON:
{"action": "use_tool", "tool": "nombre_herramienta", "params": {...}}

Si no necesitas una herramienta y puedes responder directamente, responde:
{"action": "direct_response", "message": "tu respuesta aquí"}

Lista de herramientas disponibles:
${this.mcpServer.getAvailableTools().map(t => `- ${t.name}: ${t.description}`).join('\n')}`;

            const analysisResult = await this.ollamaClient.generate(
                analysisPrompt,
                systemPrompt,
                history
            );

            if (!analysisResult.success) {
                return {
                    success: false,
                    error: analysisResult.error
                };
            }

            // Intentar parsear la respuesta como JSON
            let action;
            try {
                // Extraer JSON de la respuesta (puede venir con texto adicional)
                const jsonMatch = analysisResult.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    action = JSON.parse(jsonMatch[0]);
                } else {
                    // Si no hay JSON, asumir respuesta directa
                    action = {
                        action: 'direct_response',
                        message: analysisResult.response
                    };
                }
            } catch (e) {
                // Si falla el parseo, asumir respuesta directa
                action = {
                    action: 'direct_response',
                    message: analysisResult.response
                };
            }

            let finalResponse;

            if (action.action === 'use_tool') {
                // Ejecutar la herramienta
                const toolResult = await this.mcpServer.executeTool(action.tool, action.params || {});

                if (toolResult.error) {
                    finalResponse = `Lo siento, hubo un error al consultar la base de datos: ${toolResult.error}`;
                } else {
                    // Generar respuesta natural con los datos obtenidos
                    const dataPrompt = `El usuario preguntó: "${userMessage}"

Usé la herramienta "${action.tool}" y obtuve estos datos:
${JSON.stringify(toolResult, null, 2)}

Por favor, genera una respuesta natural y útil para el usuario basándote en estos datos. 
Si los datos están vacíos o no hay resultados, indícalo de manera amigable.
Presenta los datos de forma clara y organizada.`;

                    const naturalResponse = await this.ollamaClient.generate(
                        dataPrompt,
                        systemPrompt,
                        []
                    );

                    finalResponse = naturalResponse.success ? naturalResponse.response : JSON.stringify(toolResult, null, 2);
                }
            } else {
                // Respuesta directa
                finalResponse = action.message;
            }

            // Actualizar historial
            history.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: finalResponse }
            );

            // Limitar el historial a los últimos 10 mensajes
            if (history.length > 10) {
                this.conversationHistories.set(sessionId, history.slice(-10));
            }

            return {
                success: true,
                response: finalResponse,
                toolUsed: action.action === 'use_tool' ? action.tool : null
            };
        } catch (error) {
            console.error('Error en MCPOrchestrator:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Procesa un mensaje con streaming
     */
    async processMessageStream(userMessage, sessionId, onChunk) {
        try {
            if (!this.conversationHistories.has(sessionId)) {
                this.conversationHistories.set(sessionId, []);
            }
            const history = this.conversationHistories.get(sessionId);

            const { systemPrompt } = await this.mcpServer.processRequest(userMessage, history);

            // Análisis rápido para determinar si necesita herramientas
            const analysisPrompt = `${userMessage}

¿Necesitas consultar la base de datos? Responde solo "SI" o "NO".`;

            const quickAnalysis = await this.ollamaClient.generate(analysisPrompt, systemPrompt, []);
            const needsTool = quickAnalysis.response.toUpperCase().includes('SI');

            if (needsTool) {
                // Primero ejecutar la herramienta
                const toolPrompt = `${userMessage}

Responde en JSON: {"tool": "nombre_herramienta", "params": {...}}
Herramientas: ${this.mcpServer.getAvailableTools().map(t => t.name).join(', ')}`;

                const toolAnalysis = await this.ollamaClient.generate(toolPrompt, systemPrompt, []);
                
                try {
                    const jsonMatch = toolAnalysis.response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const toolAction = JSON.parse(jsonMatch[0]);
                        const toolResult = await this.mcpServer.executeTool(toolAction.tool, toolAction.params || {});

                        // Generar respuesta con streaming
                        const dataPrompt = `Usuario: "${userMessage}"
Datos: ${JSON.stringify(toolResult, null, 2)}

Responde de forma natural y clara:`;

                        await this.ollamaClient.generateStream(
                            dataPrompt,
                            systemPrompt,
                            history,
                            onChunk
                        );
                    }
                } catch (e) {
                    onChunk('Lo siento, no pude procesar tu solicitud correctamente.');
                }
            } else {
                // Respuesta directa con streaming
                await this.ollamaClient.generateStream(
                    userMessage,
                    systemPrompt,
                    history,
                    onChunk
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Error en streaming:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Limpia el historial de una sesión
     */
    clearHistory(sessionId) {
        this.conversationHistories.delete(sessionId);
    }

    /**
     * Verifica el estado de Ollama
     */
    async checkOllamaStatus() {
        return await this.ollamaClient.checkHealth();
    }

    /**
     * Obtiene las herramientas disponibles
     */
    getAvailableTools() {
        return this.mcpServer.getAvailableTools();
    }
}

module.exports = new MCPOrchestrator();
