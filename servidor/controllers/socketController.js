const arduinoService = require('../services/arduinoService');

/**
 * Controlador para manejar eventos de Socket.io
 */
class SocketController {
    /**
     * Inicializa el controlador con la instancia de Socket.io
     * @param {import('socket.io').Server} io Instancia de Socket.io
     */
    constructor(io) {
        this.io = io;

        // Configurar los oyentes de eventos del servicio Arduino
        this._setupArduinoListeners();

        // Configurar los eventos de conexión de socket
        this._setupSocketEvents();
    }

    /**
     * Configura los oyentes de eventos del servicio Arduino
     */
    _setupArduinoListeners() {
        // Reenviar estado del Arduino a todos los clientes
        arduinoService.on('status', (status) => {
            this.io.emit('arduino_status', status);
        });

        // Reenviar datos del Arduino a todos los clientes
        arduinoService.on('data', (data) => {
            this.io.emit('mpu_data', data);
        });
    }

    /**
     * Configura los eventos para las conexiones de socket
     */
    _setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log('Interfaz conectada:', socket.id);

            // Informar al cliente sobre el estado actual del Arduino
            socket.emit('arduino_status', arduinoService.getStatus());

            // Si el cliente solicita explícitamente intentar conectar
            socket.on('connect_arduino', () => {
                console.log("Cliente solicitó conexión con Arduino");
                if (!arduinoService.isConnected) {
                    arduinoService.connect();
                } else {
                    socket.emit('arduino_status', { connected: true });
                }
            });

            socket.on('disconnect', () => {
                console.log('Interfaz desconectada:', socket.id);
            });
        });
    }
}

module.exports = SocketController;