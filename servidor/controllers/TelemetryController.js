/**
 * Controlador de telemetría con arquitectura basada en namespaces
 * Maneja la comunicación WebSocket entre el backend y el frontend
 */
class TelemetryController {
    /**
     * Inicializa el controlador con Socket.IO y los servicios de procesamiento
     */
    constructor(io, rocketDataProcessing, satelliteDataProcessing = null) {
        this.io = io;
        this.rocketDataProcessing = rocketDataProcessing;
        this.satelliteDataProcessing = satelliteDataProcessing;

        // Configurar namespaces
        this.rocketNamespace = io.of('/telemetry/rocket');
        this.satelliteNamespace = io.of('/telemetry/satellite');
        this.systemNamespace = io.of('/system');

        // Configurar listeners
        this._setupServiceListeners();
        this._setupNamespaceHandlers();

        console.log('TelemetryController inicializado con namespaces');
    }

    /**
     * Configura los listeners de los servicios de procesamiento
     */
    _setupServiceListeners() {
        // ===== ROCKET LISTENERS =====
        
        // Datos procesados del cohete
        this.rocketDataProcessing.on('processed_data', (data) => {
            console.log(`Emitiendo datos del cohete (ID: ${data.packet_id})`);
            this.rocketNamespace.emit('data', data);
        });

        // Estado de conexión del cohete
        this.rocketDataProcessing.on('connection_status', (status) => {
            console.log(`Estado cohete: ${status.connected ? 'Conectado' : 'Desconectado'}`);
            this.rocketNamespace.emit('status', status);
            this.systemNamespace.emit('rocket_status', status);
        });

        // Alertas del cohete
        this.rocketDataProcessing.on('alert', (alert) => {
            console.log(`Alerta cohete: ${alert.type}`);
            this.rocketNamespace.emit('alert', alert);
            this.systemNamespace.emit('alert', { ...alert, source: 'rocket' });
        });

        // Cambio de estado de vuelo
        this.rocketDataProcessing.on('state_change', (stateChange) => {
            console.log(`Cambio de estado: ${stateChange.from} → ${stateChange.to}`);
            this.rocketNamespace.emit('state_change', stateChange);
            this.systemNamespace.emit('flight_event', {
                type: 'state_change',
                source: 'rocket',
                data: stateChange
            });
        });

        // Apogeo alcanzado
        this.rocketDataProcessing.on('apogee_reached', (apogeeData) => {
            console.log(`Apogeo: ${apogeeData.altitude.toFixed(2)}m`);
            this.rocketNamespace.emit('apogee', apogeeData);
            this.systemNamespace.emit('flight_event', {
                type: 'apogee',
                source: 'rocket',
                data: apogeeData
            });
        });

        // GPS fix adquirido
        this.rocketDataProcessing.on('gps_fix_acquired', (gpsData) => {
            console.log('GPS fix adquirido');
            this.rocketNamespace.emit('gps_fix', gpsData);
        });

        // Errores de validación
        this.rocketDataProcessing.on('validation_error', (error) => {
            console.warn('Error de validación:', error.errors);
            this.rocketNamespace.emit('validation_error', error);
        });

        // ===== SATELLITE LISTENERS (futuro) =====
        if (this.satelliteDataProcessing) {
            this.satelliteDataProcessing.on('processed_data', (data) => {
                console.log('Emitiendo datos del satélite');
                this.satelliteNamespace.emit('data', data);
            });

            this.satelliteDataProcessing.on('connection_status', (status) => {
                console.log(`Estado satélite: ${status.connected ? 'Conectado' : 'Desconectado'}`);
                this.satelliteNamespace.emit('status', status);
                this.systemNamespace.emit('satellite_status', status);
            });
        }
    }

    /**
     * Configura los handlers para cada namespace
     */
    _setupNamespaceHandlers() {
        // ===== ROCKET NAMESPACE =====
        this.rocketNamespace.on('connection', (socket) => {
            const clientId = socket.id;
            console.log(`Cliente conectado a /telemetry/rocket: ${clientId}`);

            // Enviar estado inicial
            const rocketStats = this.rocketDataProcessing.getStats();
            socket.emit('initial_state', {
                connected: true,
                stats: rocketStats
            });

            // Solicitar estadísticas
            socket.on('request_stats', () => {
                const stats = this.rocketDataProcessing.getStats();
                socket.emit('stats', stats);
            });

            socket.on('disconnect', () => {
                console.log(`Cliente desconectado de /telemetry/rocket: ${clientId}`);
            });
        });

        // ===== SATELLITE NAMESPACE =====
        this.satelliteNamespace.on('connection', (socket) => {
            const clientId = socket.id;
            console.log(`Cliente conectado a /telemetry/satellite: ${clientId}`);

            socket.emit('initial_state', {
                connected: this.satelliteDataProcessing !== null,
                message: this.satelliteDataProcessing 
                    ? 'Satélite disponible' 
                    : 'Satélite no implementado aún'
            });

            socket.on('disconnect', () => {
                console.log(`Cliente desconectado de /telemetry/satellite: ${clientId}`);
            });
        });

        // ===== SYSTEM NAMESPACE =====
        this.systemNamespace.on('connection', (socket) => {
            const clientId = socket.id;
            console.log(`Cliente conectado a /system: ${clientId}`);

            // Enviar estado general del sistema
            socket.emit('system_health', {
                rocket: {
                    available: true,
                    stats: this.rocketDataProcessing.getStats()
                },
                satellite: {
                    available: this.satelliteDataProcessing !== null
                },
                timestamp: new Date().toISOString()
            });

            // Heartbeat para monitoreo
            const heartbeatInterval = setInterval(() => {
                socket.emit('heartbeat', {
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime()
                });
            }, 5000);

            socket.on('disconnect', () => {
                clearInterval(heartbeatInterval);
                console.log(`Cliente desconectado de /system: ${clientId}`);
            });
        });
    }

    /**
     * Emite un mensaje a todos los clientes de un namespace
     */
    broadcast(namespace, event, data) {
        switch(namespace) {
            case 'rocket':
                this.rocketNamespace.emit(event, data);
                break;
            case 'satellite':
                this.satelliteNamespace.emit(event, data);
                break;
            case 'system':
                this.systemNamespace.emit(event, data);
                break;
            default:
                console.warn(`Namespace desconocido: ${namespace}`);
        }
    }

    /**
     * Obtiene estadísticas de conexiones activas
     */
    getConnectionStats() {
        return {
            rocket: this.rocketNamespace.sockets.size,
            satellite: this.satelliteNamespace.sockets.size,
            system: this.systemNamespace.sockets.size,
            total: this.io.engine.clientsCount
        };
    }
}

module.exports = TelemetryController;
