const arduinoService = require('../services/arduinoService');
const dataProcessingService = require('../services/dataProcessingService');

/**
 * Controlador para manejar eventos de Socket.io
 */
class SocketController {
    /**
     * Inicializa el controlador con la instancia de Socket.io y los servicios.
     * @param {import('socket.io').Server} io Instancia de Socket.io
     */
    constructor(io) {
        this.io = io;
        this.arduinoService = arduinoService; // Referencia para comandos y estado

        // Configurar los oyentes de eventos de los servicios
        this._setupServiceListeners();

        // Configurar los eventos de conexión de socket
        this._setupSocketEvents();
    }

    /**
     * Configura los oyentes de eventos de los servicios de backend.
     */
    _setupServiceListeners() {
        // --- Escuchar a ArduinoService para estado de la conexión ---
        this.arduinoService.on('status', (status) => {
            console.log('🔌 Emitiendo estado del Arduino:', status);
            this.io.emit('arduino_status', status);
        });

        this.arduinoService.on('sensor_ready', (info) => {
            console.log('✅ Sensores Katari inicializados');
            this.io.emit('sensor_ready', info);
        });

        this.arduinoService.on('gps_calibrating', (info) => {
            console.log('📍 GPS calibrando');
            this.io.emit('gps_calibrating', info);
        });

        // --- Escuchar a DataProcessingService para datos procesados ---
        dataProcessingService.on('formatted_data', (data) => {
            console.log('📡 SocketController: Emitiendo datos de sensores al frontend');
            // Emitir tanto como 'sensor_data' (nombre anterior) como 'arduino_data' (nuevo)
            this.io.emit('sensor_data', data);
            this.io.emit('arduino_data', data);
        });

        dataProcessingService.on('formatted_mpu_data', (mpuData) => {
            console.log('🧪 SocketController: Emitiendo datos MPU específicos');
            this.io.emit('mpu_data', mpuData);
        });
    }

    /**
     * Configura los eventos para las conexiones de socket
     */
    _setupSocketEvents() {
        this.io.on('connection', (socket) => {
            const clientType = socket.handshake.query.clientType || 'unknown';
            console.log(`🔌 Cliente conectado: ${socket.id} (Tipo: ${clientType})`);

            // Informar al cliente sobre el estado actual del Arduino inmediatamente
            const currentStatus = this.arduinoService.getStatus();
            console.log(`📡 Enviando estado inicial del Arduino al cliente ${clientType}:`, currentStatus);
            socket.emit('arduino_status', currentStatus);

            // Si el cliente solicita explícitamente intentar conectar
            socket.on('connect_arduino', (options = {}) => {
                console.log(`🔄 Cliente ${clientType} solicitó conexión con Arduino`, options);
                
                if (!this.arduinoService.isConnected) {
                    console.log('🔌 Intentando conectar al Arduino...');
                    this.arduinoService.connect();
                } else {
                    console.log('✅ Arduino ya conectado, confirmando estado');
                    socket.emit('arduino_status', { connected: true });
                }
            });

            // Manejar solicitud específica para prueba unitaria
            socket.on('start_unit_test', () => {
                console.log(`🧪 Cliente ${clientType} iniciando prueba unitaria`);
                
                if (this.arduinoService.isConnected) {
                    // Confirmar que estamos listos para la prueba unitaria
                    socket.emit('unit_test_ready', { 
                        ready: true, 
                        message: 'Arduino conectado, listo para prueba unitaria' 
                    });
                } else {
                    socket.emit('unit_test_ready', { 
                        ready: false, 
                        error: 'Arduino no conectado' 
                    });
                }
            });

            socket.on('disconnect', () => {
                console.log(`🔌 Cliente ${clientType} desconectado: ${socket.id}`);
            });
        });
    }
}

module.exports = SocketController;