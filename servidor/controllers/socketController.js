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
            console.log('🔌 Emitiendo estado del Arduino:', status);
            this.io.emit('arduino_status', status);
        });

                // Reenviar datos del Arduino a todos los clientes
        arduinoService.on('data', (data) => {
            // Solo procesar y emitir datos JSON válidos
            if (typeof data === 'object' && data !== null) {
                console.log('📡 SocketController: Datos válidos del Arduino recibidos');
                console.log('✅ SocketController: Emitiendo datos de sensores al frontend');
                
                // Emitir tanto como 'sensor_data' (nombre anterior) como 'arduino_data' (nuevo)
                this.io.emit('sensor_data', data);
                this.io.emit('arduino_data', data);
                
                // Si los datos contienen información específica del MPU, emitir evento especial
                if (data.accel_x !== undefined || data.gyro_x !== undefined) {
                    const mpuData = {
                        sensor_id: "MPU_9250_K1",
                        timestamp: new Date().toISOString(),
                        accelerometer: {
                            x: { value: parseFloat(data.accel_x) || 0, unit: "g" },
                            y: { value: parseFloat(data.accel_y) || 0, unit: "g" },
                            z: { value: parseFloat(data.accel_z) || 0, unit: "g" }
                        },
                        gyroscope: {
                            x: { value: parseFloat(data.gyro_x) || 0, unit: "dps" },
                            y: { value: parseFloat(data.gyro_y) || 0, unit: "dps" },
                            z: { value: parseFloat(data.gyro_z) || 0, unit: "dps" }
                        }
                    };
                    
                    console.log('🧪 SocketController: Emitiendo datos MPU específicos');
                    this.io.emit('mpu_data', mpuData);
                }
            } else {
                console.log('🔍 SocketController: Datos no válidos ignorados:', typeof data);
            }
        });

        // Evento cuando los sensores están listos
        arduinoService.on('sensor_ready', (info) => {
            console.log('✅ Sensores Katari inicializados');
            this.io.emit('sensor_ready', info);
        });

        // Evento de calibración GPS
        arduinoService.on('gps_calibrating', (info) => {
            console.log('📍 GPS calibrando');
            this.io.emit('gps_calibrating', info);
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
            const currentStatus = arduinoService.getStatus();
            console.log(`📡 Enviando estado inicial del Arduino al cliente ${clientType}:`, currentStatus);
            socket.emit('arduino_status', currentStatus);

            // Si el cliente solicita explícitamente intentar conectar
            socket.on('connect_arduino', (options = {}) => {
                console.log(`🔄 Cliente ${clientType} solicitó conexión con Arduino`, options);
                
                if (!arduinoService.isConnected) {
                    console.log('🔌 Intentando conectar al Arduino...');
                    arduinoService.connect();
                } else {
                    console.log('✅ Arduino ya conectado, confirmando estado');
                    socket.emit('arduino_status', { connected: true });
                }
            });

            // Manejar solicitud específica para prueba unitaria
            socket.on('start_unit_test', () => {
                console.log(`🧪 Cliente ${clientType} iniciando prueba unitaria`);
                
                if (arduinoService.isConnected) {
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