const express = require('express');
const router = express.Router();
const mcpOrchestrator = require('../mcp/mcpOrchestrator');

/**
 * POST /api/mcp/chat
 * Procesa un mensaje del chatbot
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, sessionId = 'default' } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'El mensaje es requerido'
            });
        }

        const result = await mcpOrchestrator.processMessage(message, sessionId);
        res.json(result);
    } catch (error) {
        console.error('Error en /api/mcp/chat:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mcp/tools
 * Obtiene las herramientas disponibles
 */
router.get('/tools', (req, res) => {
    try {
        const tools = mcpOrchestrator.getAvailableTools();
        res.json({
            success: true,
            tools
        });
    } catch (error) {
        console.error('Error en /api/mcp/tools:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mcp/status
 * Verifica el estado de Ollama
 */
router.get('/status', async (req, res) => {
    try {
        const status = await mcpOrchestrator.checkOllamaStatus();
        res.json(status);
    } catch (error) {
        console.error('Error en /api/mcp/status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/mcp/session/:sessionId
 * Limpia el historial de una sesión
 */
router.delete('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        mcpOrchestrator.clearHistory(sessionId);
        res.json({
            success: true,
            message: 'Historial limpiado'
        });
    } catch (error) {
        console.error('Error en /api/mcp/session:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
