const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

/**
 * Servicio para manejar la conexión con el cohete vía LoRa
 * Responsabilidades:
 * - Conectar al puerto serial
 * - Parsear protocolo LoRa del cohete
 * - Validar CRC y detectar pérdida de paquetes
 * - Emitir eventos con datos estructurados
 */
class RocketService extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.serialPort = null;
        this.parser = null;
        this.isConnected = false;
        this.lastPacketId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Intenta conectar con el receptor LoRa del cohete
     */
    async connect() {
        try {
            const ports = await SerialPort.list();
            const availablePaths = ports.map(p => p.path);
            console.log('Puertos seriales disponibles:', availablePaths);

            // Cerrar puerto previo si existe
            if (this.serialPort && this.serialPort.isOpen) {
                this.serialPort.close();
            }

            let preferred = process.env.ROCKET_PORT || process.env.SERIAL_PORT;
            let foundPort = null;

            if (preferred && availablePaths.includes(preferred)) {
                foundPort = preferred;
                console.log(`Usando puerto preferido: ${foundPort}`);
            } else {
                // Seleccionar COM más alto en Windows
                const comRegex = /^COM(\d+)$/i;
                const comPorts = availablePaths
                    .map(p => ({ path: p, m: p.match(comRegex) }))
                    .filter(x => x.m)
                    .map(x => ({ path: x.path, num: parseInt(x.m[1], 10) }))
                    .sort((a, b) => b.num - a.num);

                if (comPorts.length > 0) {
                    foundPort = comPorts[0].path;
                    console.log(`Seleccionado COM más alto: ${foundPort}`);
                } else {
                    foundPort = this.config.POSSIBLE_PORTS.find(port =>
                        availablePaths.includes(port)
                    ) || null;
                }
            }

            if (!foundPort) {
                console.log('No se encontró receptor LoRa del cohete');
                this.emit('status', { 
                    connected: false, 
                    error: 'No se encontró receptor LoRa',
                    device: 'rocket'
                });

                this._scheduleReconnect();
                return false;
            }

            await this._connectToPort(foundPort);
            this.reconnectAttempts = 0; // Reset en conexión exitosa
            return true;
        } catch (err) {
            console.error('Error al listar puertos seriales:', err);
            this.emit('status', { 
                connected: false, 
                error: err.message,
                device: 'rocket'
            });

            this._scheduleReconnect();
            return false;
        }
    }

    /**
     * Conecta al puerto específico
     */
    async _connectToPort(port) {
        return new Promise((resolve) => {
            try {
                console.log(`Conectando a receptor LoRa en ${port}...`);

                this.serialPort = new SerialPort({
                    path: port,
                    baudRate: this.config.BAUD_RATE
                });

                this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

                this.serialPort.on('open', () => {
                    console.log(`Conexión establecida con receptor LoRa en ${port}`);
                    this.isConnected = true;
                    this.emit('status', { 
                        connected: true,
                        port: port,
                        device: 'rocket'
                    });
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
                    this.emit('status', { 
                        connected: false,
                        device: 'rocket'
                    });

                    this._scheduleReconnect();
                });
            } catch (err) {
                console.error(`Error al conectar con receptor LoRa en ${port}:`, err);
                this.emit('status', { 
                    connected: false, 
                    error: err.message,
                    device: 'rocket'
                });
                resolve(false);
            }
        });
    }

    /**
     * Programa reconexión con backoff exponencial
     */
    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log(`Máximo de intentos de reconexión alcanzado (${this.maxReconnectAttempts})`);
            this.emit('max_reconnect_attempts', { 
                attempts: this.reconnectAttempts,
                device: 'rocket'
            });
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.config.RECONNECT_TIMEOUT * Math.pow(2, this.reconnectAttempts - 1),
            30000 // Max 30 segundos
        );

        console.log(`Reintentando conexión en ${delay/1000}s (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }

    /**
     * Maneja los datos recibidos del receptor LoRa
     */
    _handleData(data) {
        try {
            if (!data || typeof data !== 'string') return;
            
            data = data.replace(/\r/g, '').trim();
            
            // Filtrar solo mensajes +RCV
            if (!data.startsWith('+RCV=')) return;

            console.log('Mensaje LoRa recibido del cohete');

            const parts = data.split(',');
            if (parts.length < 5) {
                console.warn('Mensaje LoRa incompleto');
                return;
            }

            // Extraer componentes del mensaje LoRa
            const payload = parts[2].trim();
            const rssi = parseInt(parts[parts.length - 2], 10);
            const snr = parseInt(parts[parts.length - 1], 10);

            // Parsear payload
            const parsedData = this._parsePayload(payload);
            
            if (!parsedData) {
                console.warn('No se pudo parsear el payload');
                return;
            }

            // Agregar metadatos de señal
            parsedData.rssi = Number.isFinite(rssi) ? rssi : null;
            parsedData.snr = Number.isFinite(snr) ? snr : null;
            parsedData.received_at = new Date().toISOString();
            parsedData.device_id = 'ROCKET_001';

            // Detectar pérdida de paquetes
            if (this.lastPacketId !== null && parsedData.packet_id !== null) {
                const expectedId = this.lastPacketId + 1;
                if (parsedData.packet_id > expectedId) {
                    const lostPackets = parsedData.packet_id - expectedId;
                    console.warn(`Paquetes perdidos: ${lostPackets} (último: ${this.lastPacketId}, actual: ${parsedData.packet_id})`);
                    this.emit('packet_loss', {
                        lost: lostPackets,
                        last_id: this.lastPacketId,
                        current_id: parsedData.packet_id,
                        device: 'rocket'
                    });
                }
            }

            this.lastPacketId = parsedData.packet_id;

            // Emitir datos parseados
            console.log(`Emitiendo datos del cohete (ID: ${parsedData.packet_id}, Estado: ${parsedData.state})`);
            this.emit('data', parsedData);

        } catch (err) {
            console.error('Error procesando mensaje LoRa:', err);
            this.emit('parse_error', { error: err.message, device: 'rocket' });
        }
    }

    /**
     * Parsea el payload del mensaje LoRa
     */
    _parsePayload(payload) {
        const tokens = payload.split('|');
        const data = {};
        let currentSection = 'GLOBAL';

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].trim();
            if (!token) continue;

            // Detectar secciones
            if (token === 'MPU_R') {
                currentSection = 'MPU';
                data.mpu = { accel: {} };
                continue;
            }
            if (token === 'BMP_R') {
                currentSection = 'BMP';
                data.bmp = {};
                continue;
            }
            if (token === 'GPS_NEO_R') {
                currentSection = 'GPS';
                data.gps = { fix: true };
                continue;
            }

            // Parsear campos globales
            if (token.startsWith('ID:')) {
                data.packet_id = parseInt(token.substring(3), 10);
                continue;
            }
            if (token.startsWith('STATE:')) {
                data.state = token.substring(6);
                continue;
            }
            if (token.startsWith('CRC:')) {
                data.crc = token.substring(4);
                continue;
            }
            if (token === 'NO_FIX') {
                if (data.gps) data.gps.fix = false;
                continue;
            }

            // Parsear campos por sección
            if (currentSection === 'GLOBAL' && token.startsWith('T:')) {
                data.timestamp_ms = parseInt(token.substring(2), 10);
                continue;
            }

            if (currentSection === 'MPU') {
                if (token.startsWith('AX:')) {
                    data.mpu.accel.x = parseFloat(token.substring(3));
                } else if (token.startsWith('AY:')) {
                    data.mpu.accel.y = parseFloat(token.substring(3));
                } else if (token.startsWith('AZ:')) {
                    data.mpu.accel.z = parseFloat(token.substring(3));
                }
                continue;
            }

            if (currentSection === 'BMP') {
                if (token.startsWith('T:')) {
                    data.bmp.temperature = parseFloat(token.substring(2));
                } else if (token.startsWith('P:')) {
                    data.bmp.pressure = parseFloat(token.substring(2));
                } else if (token.startsWith('A:')) {
                    data.bmp.altitude = parseFloat(token.substring(2));
                }
                continue;
            }

            if (currentSection === 'GPS') {
                if (token.startsWith('LAT:')) {
                    data.gps.latitude = parseFloat(token.substring(4));
                } else if (token.startsWith('LON:')) {
                    data.gps.longitude = parseFloat(token.substring(4));
                } else if (token.startsWith('ALT:')) {
                    data.gps.altitude = parseFloat(token.substring(4));
                } else if (token.startsWith('SATS:')) {
                    data.gps.satellites = parseInt(token.substring(5), 10);
                }
                continue;
            }
        }

        return data;
    }

    /**
     * Maneja errores de la conexión serial
     */
    _handleError(err, port) {
        console.error(`Error en puerto ${port}:`, err.message);
        this.isConnected = false;

        if (err.message.includes('Access denied')) {
            console.error('Acceso denegado. Verifica que no haya otra aplicación usando el puerto.');
            this.emit('status', {
                connected: false,
                error: 'Acceso denegado al puerto',
                device: 'rocket'
            });
        } else {
            this.emit('status', { 
                connected: false, 
                error: err.message,
                device: 'rocket'
            });
        }

        this._scheduleReconnect();
    }

    /**
     * Obtiene el estado actual de la conexión
     */
    getStatus() {
        return {
            connected: this.isConnected,
            device: 'rocket',
            lastPacketId: this.lastPacketId,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Cierra la conexión
     */
    disconnect() {
        if (this.serialPort && this.serialPort.isOpen) {
            this.serialPort.close();
        }
        this.isConnected = false;
        this.lastPacketId = null;
        this.reconnectAttempts = 0;
    }

    /**
     * Resetea el contador de intentos de reconexión
     */
    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
    }
}

module.exports = RocketService;
