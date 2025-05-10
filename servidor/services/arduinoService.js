const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { ARDUINO_CONFIG } = require('../config');
const EventEmitter = require('events');

/**
 * Servicio para manejar la comunicación con Arduino
 */
class ArduinoService extends EventEmitter {
    constructor() {
        super();
        this.serialPort = null;
        this.parser = null;
        this.isConnected = false;
    }

    /**
     * Intenta conectar con el Arduino
     */
    async connect() {
        try {
            const ports = await SerialPort.list();
            console.log("Puertos seriales disponibles:", ports.map(p => p.path));

            // Cerrar puerto previo si existe
            if (this.serialPort && this.serialPort.isOpen) {
                this.serialPort.close();
            }

            // Buscar un puerto válido entre los posibles
            const foundPort = ARDUINO_CONFIG.POSSIBLE_PORTS.find(port =>
                ports.some(p => p.path === port)
            );

            if (!foundPort) {
                console.log("No se encontró ningún Arduino conectado");
                this.emit('status', { connected: false, error: "No se encontró Arduino" });

                // Reintentar después del tiempo configurado
                setTimeout(() => this.connect(), ARDUINO_CONFIG.DISCOVERY_TIMEOUT);
                return false;
            }

            // Conectar al puerto encontrado
            await this._connectToPort(foundPort);
            return true;
        } catch (err) {
            console.error("Error al listar puertos seriales:", err);
            this.emit('status', { connected: false, error: err.message });

            // Reintentar después del tiempo configurado
            setTimeout(() => this.connect(), ARDUINO_CONFIG.DISCOVERY_TIMEOUT);
            return false;
        }
    }

    /**
     * Conecta al puerto específico
     * @param {string} port Puerto a conectar
     * @returns {Promise<boolean>} Resultado de la conexión
     */
    async _connectToPort(port) {
        return new Promise((resolve) => {
            try {
                console.log(`Intentando conectar a ${port}...`);

                this.serialPort = new SerialPort({
                    path: port,
                    baudRate: ARDUINO_CONFIG.BAUD_RATE
                });

                this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

                // Configurar eventos
                this.serialPort.on('open', () => {
                    console.log(`Conexión establecida con Arduino en ${port}`);
                    this.isConnected = true;
                    this.emit('status', { connected: true });
                    resolve(true);
                });

                this.parser.on('data', this._handleData.bind(this));

                this.serialPort.on('error', (err) => {
                    this._handleError(err, port);
                    resolve(false);
                });

                this.serialPort.on('close', () => {
                    console.log(`Conexión con puerto ${port} cerrada`);
                    this.isConnected = false;
                    this.emit('status', { connected: false });

                    // Reintentar conexión después del tiempo configurado
                    setTimeout(() => this.connect(), ARDUINO_CONFIG.RECONNECT_TIMEOUT);
                });
            } catch (err) {
                console.error(`Error al intentar conectar con Arduino en ${port}:`, err);
                this.emit('status', { connected: false, error: err.message });
                resolve(false);
            }
        });
    }

    /**
     * Maneja los datos recibidos del Arduino
     * @param {string} data Datos recibidos
     */
    _handleData(data) {
        try {
            console.log("Datos recibidos:", data);

            // Emitir evento con los datos formateados
            this.emit('data', data);

            // Actualizar estado si no estaba conectado
            if (!this.isConnected) {
                this.isConnected = true;
                this.emit('status', { connected: true });
            }
        } catch (err) {
            console.error("Error al parsear datos del Arduino:", err);
            console.log("Datos recibidos (no JSON):", data);
        }
    }

    /**
     * Maneja errores de la conexión serial
     * @param {Error} err Error ocurrido
     * @param {string} port Puerto que generó el error
     */
    _handleError(err, port) {
        console.error(`Error en puerto ${port}:`, err.message);
        this.isConnected = false;

        // Manejar específicamente el error de acceso denegado
        if (err.message.includes('Access denied')) {
            console.error('Error: Acceso denegado al puerto. Por favor:');
            console.error('1. Cierra el Arduino IDE o el Monitor Serial si están abiertos');
            console.error('2. Asegúrate de que ninguna otra aplicación esté usando el puerto');
            console.error('3. Intenta desconectar y volver a conectar el Arduino');

            this.emit('status', {
                connected: false,
                error: "Acceso denegado al puerto. Por favor, cierra otras aplicaciones que puedan estar usando el puerto."
            });
        } else {
            this.emit('status', { connected: false, error: err.message });
        }

        // Reintentar después del tiempo configurado
        setTimeout(() => this.connect(), ARDUINO_CONFIG.RECONNECT_TIMEOUT);
    }

    /**
     * Obtiene el estado actual de la conexión
     * @returns {boolean} Estado de conexión
     */
    getStatus() {
        return {
            connected: this.isConnected
        };
    }

    /**
     * Cierra la conexión con el Arduino
     */
    disconnect() {
        if (this.serialPort && this.serialPort.isOpen) {
            this.serialPort.close();
        }
    }
}

// Exportar una instancia única del servicio (patrón Singleton)
module.exports = new ArduinoService();