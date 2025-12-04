const express = require('express');
const router = express.Router();
const mcpOrchestratorV2 = require('../mcp/mcpOrchestratorV2');

/**
 * Rutas para MCP con DeepSeek
 * Versión mejorada con function calling nativo y herramientas analíticas
 */

/**
 * POST /api/mcp/chat
 * Procesa un mensaje usando DeepSeek con function calling
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

        const result = await mcpOrchestratorV2.processMessage(message, sessionId);
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
 * POST /api/mcp/analyze/sensor
 * Análisis rápido de un sensor específico
 */
router.post('/analyze/sensor', async (req, res) => {
    try {
        const { id_sensor, id_evento } = req.body;

        if (!id_sensor) {
            return res.status(400).json({
                success: false,
                error: 'id_sensor es requerido'
            });
        }

        const result = await mcpOrchestratorV2.quickAnalysis(id_sensor, id_evento);
        res.json(result);
    } catch (error) {
        console.error('Error en /api/mcp/analyze/sensor:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mcp/analyze/event
 * Análisis completo de un evento
 */
router.post('/analyze/event', async (req, res) => {
    try {
        const { id_evento } = req.body;

        if (!id_evento) {
            return res.status(400).json({
                success: false,
                error: 'id_evento es requerido'
            });
        }

        const result = await mcpOrchestratorV2.analyzeEvent(id_evento);
        res.json(result);
    } catch (error) {
        console.error('Error en /api/mcp/analyze/event:', error);
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
        const tools = mcpOrchestratorV2.getAvailableTools();
        res.json({
            success: true,
            count: tools.length,
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
 * Verifica el estado del sistema completo
 */
router.get('/status', async (req, res) => {
    try {
        const status = await mcpOrchestratorV2.checkStatus();
        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('Error en /api/mcp/status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mcp/stats
 * Obtiene estadísticas del sistema
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await mcpOrchestratorV2.getSystemStats();
        res.json({
            success: true,
            ...stats
        });
    } catch (error) {
        console.error('Error en /api/mcp/stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/mcp/session/:sessionId
 * Limpia el historial de una sesión específica
 */
router.delete('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        mcpOrchestratorV2.clearHistory(sessionId);
        res.json({
            success: true,
            message: `Historial de sesión '${sessionId}' limpiado`
        });
    } catch (error) {
        console.error('Error en /api/mcp/session:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/mcp/sessions
 * Limpia todos los historiales
 */
router.delete('/sessions', (req, res) => {
    try {
        mcpOrchestratorV2.clearAllHistories();
        res.json({
            success: true,
            message: 'Todos los historiales limpiados'
        });
    } catch (error) {
        console.error('Error en /api/mcp/sessions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/mcp/cache
 * Limpia el caché de consultas
 */
router.delete('/cache', (req, res) => {
    try {
        mcpOrchestratorV2.clearCache();
        res.json({
            success: true,
            message: 'Caché limpiado'
        });
    } catch (error) {
        console.error('Error en /api/mcp/cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
