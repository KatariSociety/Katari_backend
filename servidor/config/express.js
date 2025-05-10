const express = require('express');
const cors = require('cors');

/**
 * Configuración de Express
 * @returns {import('express').Application} Aplicación Express configurada
 */
function createExpressApp() {
    const app = express();

    // Configuración CORS
    app.use(cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173'
    }));

    // Middleware para procesar JSON
    app.use(express.json());

    return app;
}

module.exports = createExpressApp;