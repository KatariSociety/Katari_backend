const { Server } = require('socket.io');

/**
 * Configuración de Socket.io
 * @param {import('http').Server} server Servidor HTTP
 * @returns {import('socket.io').Server} Instancia de Socket.io configurada
 */
function configureSocketIO(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173'
        }
    });

    return io;
}

module.exports = configureSocketIO;