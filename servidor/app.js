const http = require('http');
const { createExpressApp, configureSocketIO } = require('./config');
const setupRoutes = require('./routes');
const SocketController = require('./controllers/socketController');
const arduinoService = require('./services/arduinoService');

/**
 * Inicializa la aplicación
 * @returns {Object} Objeto con la aplicación Express y el servidor HTTP
 */
function initializeApp() {
    // Crear aplicación Express
    const app = createExpressApp();
    
    // Crear servidor HTTP
    const server = http.createServer(app);
    
    // Configurar Socket.io
    const io = configureSocketIO(server);
    
    // Configurar controlador de socket
    new SocketController(io);
    
    // Configurar rutas
    setupRoutes(app);
    
    return { app, server };
}

// Inicializar la aplicación
const { app, server } = initializeApp();

// Intentar conectar al Arduino automáticamente al iniciar
arduinoService.connect();

// Exportar la aplicación y el servidor
module.exports = { app, server };