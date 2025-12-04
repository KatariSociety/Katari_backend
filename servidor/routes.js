const express = require('express');

// Importar rutas individuales
const sensoresRoutes = require('./src/modulos/sensores/sensoresRuta');
const lecturasRoutes = require('./src/modulos/Lecturas/lecturaRuta');
const dispositivosRoutes = require('./src/modulos/dispositivo/dispositivoRuta');
const eventosRoutes = require('./src/modulos/evento/eventoRuta');
const mcpRoutesV2 = require('./routes/mcpRoutesV2');

/**
 * Configurar todas las rutas de la aplicación
 * @param {import('express').Application} app Aplicación Express
 */
function setupRoutes(app) {
    // Montar las rutas en la aplicación
    app.use('/sensores', sensoresRoutes);
    app.use('/lecturas', lecturasRoutes);
    app.use('/dispositivos', dispositivosRoutes);
    app.use('/eventos', eventosRoutes);
    app.use('/api/mcp', mcpRoutesV2);
    
    // Opcionalmente, podemos agregar un manejador para rutas no encontradas
    app.use('*', (req, res) => {
        res.status(404).json({ error: 'Ruta no encontrada' });
    });
    
    // Manejador de errores global
    app.use((err, req, res, next) => {
        console.error('Error en la aplicación:', err);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });
}

module.exports = setupRoutes;