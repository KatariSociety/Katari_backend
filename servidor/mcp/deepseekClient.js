const axios = require('axios');

/**
 * Cliente optimizado para DeepSeek API con soporte para function calling
 * DeepSeek es superior para análisis de datos y razonamiento complejo
 */
class DeepSeekClient {
    constructor(apiKey = process.env.DEEPSEEK_API_KEY) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.deepseek.com';
        this.model = 'deepseek-chat'; // Modelo optimizado para razonamiento

        if (!this.apiKey) {
            console.warn('DEEPSEEK_API_KEY no configurada. Configúrala en las variables de entorno.');
        }
    }

    /**
     * Genera una respuesta con function calling nativo
     * DeepSeek soporta OpenAI-compatible function calling
     */
    async generateWithTools(userMessage, systemPrompt, tools = [], conversationHistory = []) {
        try {
            if (!this.apiKey) {
                throw new Error('API Key de DeepSeek no configurada');
            }

            const messages = [];

            // System prompt
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }

            // Historial de conversación
            conversationHistory.forEach(msg => {
                // Copiar todo el mensaje para preservar tool_calls y tool_call_id
                messages.push({ ...msg });
            });

            // Mensaje del usuario
            messages.push({
                role: 'user',
                content: userMessage
            });

            const requestBody = {
                model: this.model,
                messages: messages,
                temperature: 0.3, // Baja temperatura para análisis preciso
                max_tokens: 4000,
                top_p: 0.95
            };

            // Agregar tools si están disponibles
            if (tools && tools.length > 0) {
                requestBody.tools = tools;
                requestBody.tool_choice = 'auto'; // DeepSeek decide cuándo usar tools
            }

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 segundos timeout
                }
            );

            const choice = response.data.choices[0];

            // Verificar si el modelo quiere usar una herramienta
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                return {
                    success: true,
                    type: 'tool_call',
                    tool_calls: choice.message.tool_calls.map(tc => ({
                        id: tc.id,
                        name: tc.function.name,
                        arguments: JSON.parse(tc.function.arguments)
                    })),
                    message: choice.message,
                    usage: response.data.usage
                };
            }

            // Respuesta directa
            return {
                success: true,
                type: 'message',
                response: choice.message.content,
                usage: response.data.usage
            };

        } catch (error) {
            console.error('Error en DeepSeek API:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    /**
     * Genera una respuesta simple sin tools
     */
    async generate(userMessage, systemPrompt = '', conversationHistory = []) {
        return this.generateWithTools(userMessage, systemPrompt, [], conversationHistory);
    }

    /**
     * Analiza datos de sensores con capacidades avanzadas de DeepSeek
     */
    async analyzeSensorData(sensorData, analysisType = 'general') {
        const systemPrompt = `Eres un experto en análisis de datos de telemetría aeroespacial.
Analiza los datos de sensores de cohetes y satélites con precisión científica.

Capacidades:
- Detección de anomalías en lecturas de sensores
- Análisis de tendencias y patrones
- Predicción de comportamiento del sistema
- Identificación de problemas de calibración
- Correlación entre múltiples sensores
- Análisis de eventos críticos (despegue, apogeo, descenso)

Proporciona análisis técnicos, precisos y accionables.`;

        const userMessage = `Analiza los siguientes datos de sensores:

${JSON.stringify(sensorData, null, 2)}

Tipo de análisis solicitado: ${analysisType}

Proporciona:
1. Resumen ejecutivo
2. Anomalías detectadas
3. Tendencias observadas
4. Recomendaciones técnicas`;

        return this.generate(userMessage, systemPrompt);
    }

    /**
     * Verifica la salud de la API
     */
    async checkHealth() {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    available: false,
                    error: 'API Key no configurada'
                };
            }

            // Test simple con el modelo
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return {
                success: true,
                available: true,
                model: this.model,
                status: 'operational'
            };
        } catch (error) {
            return {
                success: false,
                available: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    /**
     * Obtiene información del modelo
     */
    getModelInfo() {
        return {
            provider: 'DeepSeek',
            model: this.model,
            capabilities: [
                'Function Calling',
                'Advanced Reasoning',
                'Data Analysis',
                'Long Context (64K tokens)',
                'Multilingual Support'
            ],
            pricing: {
                input: '$0.14 / 1M tokens',
                output: '$0.28 / 1M tokens',
                cached: '$0.014 / 1M tokens'
            }
        };
    }

    /**
     * Configura el modelo a usar
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

module.exports = DeepSeekClient;
