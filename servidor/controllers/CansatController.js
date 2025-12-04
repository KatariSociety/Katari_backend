/**
 * Controlador para gestionar la telemetría del CanSat vía Socket.io
 */
class CansatController {
    constructor(io, cansatDataProcessing) {
        this.io = io;
        this.cansatDataProcessing = cansatDataProcessing;
        this.connectedClients = new Set();
        
        this.setupSocketHandlers();
        this.setupDataProcessingListeners();
        
        console.log('CansatController inicializado');
    }

    /**
     * Configura los manejadores de Socket.io
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Cliente conectado al CanSat: ${socket.id}`);
            this.connectedClients.add(socket.id);

            // Enviar estado inicial al cliente
            this.sendInitialState(socket);

            // Manejar solicitud de datos históricos
            socket.on('cansat:request_history', (data) => {
                this.handleHistoryRequest(socket, data);
            });

            // Manejar solicitud de estadísticas
            socket.on('cansat:request_stats', () => {
                this.handleStatsRequest(socket);
            });

            // Manejar solicitud de reinicio de estadísticas
            socket.on('cansat:reset_stats', () => {
                this.handleResetStats(socket);
            });

            // Manejar desconexión
            socket.on('disconnect', () => {
                console.log(`Cliente desconectado del CanSat: ${socket.id}`);
                this.connectedClients.delete(socket.id);
            });
        });
    }

    /**
     * Configura los listeners del servicio de procesamiento de datos
     */
    setupDataProcessingListeners() {
        // Listener para datos procesados
        this.cansatDataProcessing.on('processed_data', (data) => {
            this.broadcastData(data);
        });

        // Listener para conexión establecida
        this.cansatDataProcessing.on('connected', (info) => {
            this.broadcastStatus({
                connected: true,
                port: info.port,
                timestamp: new Date().toISOString()
            });
        });

        // Listener para desconexión
        this.cansatDataProcessing.on('disconnected', () => {
            this.broadcastStatus({
                connected: false,
                timestamp: new Date().toISOString()
            });
        });

        // Listener para errores
        this.cansatDataProcessing.on('error', (error) => {
            this.broadcastError(error);
        });

        // Listener para alertas
        this.cansatDataProcessing.on('alerts', (alertData) => {
            this.broadcastAlerts(alertData);
        });

        // Listener para pérdida de paquetes
        this.cansatDataProcessing.on('packet_loss', (lossData) => {
            this.broadcastPacketLoss(lossData);
        });

        // Listener para errores de validación
        this.cansatDataProcessing.on('validation_error', (validationError) => {
            this.broadcastValidationError(validationError);
        });
    }

    /**
     * Envía el estado inicial al cliente que se conecta
     */
    sendInitialState(socket) {
        const stats = this.cansatDataProcessing.getStats();
        const recentData = this.cansatDataProcessing.getRecentData(10);

        socket.emit('cansat:initial_state', {
            stats,
            recentData,
            timestamp: new Date().toISOString()
        });

        console.log(`Estado inicial enviado al cliente ${socket.id}`);
    }

    /**
     * Transmite datos del CanSat a todos los clientes conectados
     */
    broadcastData(data) {
        this.io.emit('cansat:data', data);
        
        // Log cada 50 paquetes
        if (data.packet_id % 50 === 0) {
            console.log(`Datos CanSat transmitidos a ${this.connectedClients.size} cliente(s) - Paquete #${data.packet_id}`);
        }
    }

    /**
     * Transmite el estado de conexión del CanSat
     */
    broadcastStatus(status) {
        this.io.emit('cansat:status', status);
        console.log(`Estado CanSat transmitido: ${status.connected ? 'Conectado' : 'Desconectado'}`);
    }

    /**
     * Transmite errores a los clientes
     */
    broadcastError(error) {
        this.io.emit('cansat:error', {
            message: error.message,
            timestamp: new Date().toISOString()
        });
        console.error(`Error CanSat transmitido: ${error.message}`);
    }

    /**
     * Transmite alertas a los clientes
     */
    broadcastAlerts(alertData) {
        this.io.emit('cansat:alerts', alertData);
        console.log(`Alertas CanSat transmitidas: ${alertData.alerts.length} alerta(s)`);
    }

    /**
     * Transmite información de pérdida de paquetes
     */
    broadcastPacketLoss(lossData) {
        this.io.emit('cansat:packet_loss', lossData);
    }

    /**
     * Transmite errores de validación
     */
    broadcastValidationError(validationError) {
        this.io.emit('cansat:validation_error', {
            errors: validationError.errors,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Maneja solicitud de datos históricos
     */
    handleHistoryRequest(socket, data) {
        const count = data?.count || 50;
        const recentData = this.cansatDataProcessing.getRecentData(count);
        
        socket.emit('cansat:history', {
            data: recentData,
            count: recentData.length,
            timestamp: new Date().toISOString()
        });

        console.log(`Datos históricos enviados al cliente ${socket.id} (${recentData.length} registros)`);
    }

    /**
     * Maneja solicitud de estadísticas
     */
    handleStatsRequest(socket) {
        const stats = this.cansatDataProcessing.getStats();
        
        socket.emit('cansat:stats', {
            ...stats,
            timestamp: new Date().toISOString()
        });

        console.log(`Estadísticas enviadas al cliente ${socket.id}`);
    }

    /**
     * Maneja solicitud de reinicio de estadísticas
     */
    handleResetStats(socket) {
        this.cansatDataProcessing.resetStats();
        
        socket.emit('cansat:stats_reset', {
            success: true,
            timestamp: new Date().toISOString()
        });

        // Notificar a todos los clientes
        this.io.emit('cansat:stats', {
            ...this.cansatDataProcessing.getStats(),
            timestamp: new Date().toISOString()
        });

        console.log(`Estadísticas reiniciadas por cliente ${socket.id}`);
    }

    /**
     * Obtiene el número de clientes conectados
     */
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }
}

module.exports = CansatController;
