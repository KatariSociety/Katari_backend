const axios = require('axios');

/**
 * Cliente para interactuar con Ollama
 */
class OllamaClient {
    constructor(baseURL = 'http://localhost:11434') {
        this.baseURL = baseURL;
        this.model = 'llama3.2'; // Puedes cambiar el modelo aquí
    }

    /**
     * Genera una respuesta usando Ollama
     */
    async generate(prompt, systemPrompt = '', conversationHistory = []) {
        try {
            const messages = [];

            // Agregar el system prompt
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }

            // Agregar historial de conversación
            conversationHistory.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });

            // Agregar el mensaje actual del usuario
            messages.push({
                role: 'user',
                content: prompt
            });

            const response = await axios.post(`${this.baseURL}/api/chat`, {
                model: this.model,
                messages: messages,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9
                }
            });

            return {
                success: true,
                response: response.data.message.content,
                model: this.model
            };
        } catch (error) {
            console.error('Error al generar respuesta con Ollama:', error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Genera una respuesta con streaming
     */
    async generateStream(prompt, systemPrompt = '', conversationHistory = [], onChunk) {
        try {
            const messages = [];

            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }

            conversationHistory.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });

            messages.push({
                role: 'user',
                content: prompt
            });

            const response = await axios.post(
                `${this.baseURL}/api/chat`,
                {
                    model: this.model,
                    messages: messages,
                    stream: true
                },
                {
                    responseType: 'stream'
                }
            );

            let fullResponse = '';

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n').filter(line => line.trim());
                
                lines.forEach(line => {
                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            fullResponse += data.message.content;
                            if (onChunk) {
                                onChunk(data.message.content);
                            }
                        }
                    } catch (e) {
                        // Ignorar líneas que no sean JSON válido
                    }
                });
            });

            return new Promise((resolve, reject) => {
                response.data.on('end', () => {
                    resolve({
                        success: true,
                        response: fullResponse,
                        model: this.model
                    });
                });

                response.data.on('error', (error) => {
                    reject({
                        success: false,
                        error: error.message
                    });
                });
            });
        } catch (error) {
            console.error('Error en streaming con Ollama:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verifica si Ollama está disponible
     */
    async checkHealth() {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`);
            return {
                success: true,
                available: true,
                models: response.data.models || []
            };
        } catch (error) {
            return {
                success: false,
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Lista los modelos disponibles
     */
    async listModels() {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`);
            return {
                success: true,
                models: response.data.models || []
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cambia el modelo a usar
     */
    setModel(modelName) {
        this.model = modelName;
    }

    /**
     * Obtiene el modelo actual
     */
    getModel() {
        return this.model;
    }
}

module.exports = OllamaClient;
