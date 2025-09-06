const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { ARDUINO_CONFIG } = require('../config');
const EventEmitter = require('events');

/**
 * Servicio para manejar la conexión física con el Arduino 
 * y emitir los datos JSON que recibe
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
            console.log("📡 Datos recibidos del Arduino:", data.substring(0, 100) + (data.length > 100 ? "..." : ""));

            // Manejar mensajes especiales
            if (data.startsWith('KATARI_SENSORS_READY')) {
                console.log("✅ Sensores Katari inicializados");
                this.emit('sensor_ready', { message: 'Sensores listos' });
                return;
            }

            if (data.startsWith('GPS_CALIBRANDO:')) {
                console.log("📍 GPS calibrando:", data);
                this.emit('gps_calibrating', { message: data });
                return;
            }

            // Intentar parsear como JSON
            try {
                const jsonData = JSON.parse(data);
                
                console.log("✅ JSON válido recibido del Arduino:");
                console.log("  - Device ID:", jsonData.device_id);
                console.log("  - Timestamp:", jsonData.timestamp);
                console.log("  - Sensores activos:", {
                    SCD40: jsonData.status_scd40,
                    GY91: jsonData.status_gy91,
                    GPS: jsonData.status_gps,
                    Calibrado: jsonData.calibrated
                });
                
                // Procesar datos de sensores para la base de datos
                if (jsonData.device_id && jsonData.device_id.includes('KATARI')) {
                    this._processSensorData(jsonData);
                }
                
                // Emitir evento con los datos formateados para el frontend
                console.log("� Emitiendo datos al frontend...");
                this.emit('data', jsonData);
                
            } catch (jsonError) {
                // No es JSON válido, ignorar silenciosamente si es un mensaje de debug
                if (data.includes('✅') || 
                    data.includes('📊') || 
                    data.includes('🌐') || 
                    data.includes('📍') ||
                    data.includes('====') ||
                    data.includes('Datos actualizados') ||
                    data.includes('Calibrando')) {
                    // Es mensaje de debug, ignorar
                    return;
                }
                
                console.log("⚠️ Datos no JSON recibidos:", data.substring(0, 50) + "...");
                return;
            }

            // Actualizar estado si no estaba conectado
            if (!this.isConnected) {
                this.isConnected = true;
                this.emit('status', { connected: true });
                console.log("🔌 Estado actualizado: Arduino conectado");
            }
        } catch (err) {
            console.error("❌ Error al procesar datos del Arduino:", err);
            this.emit('data', data);
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

module.exports = new ArduinoService();