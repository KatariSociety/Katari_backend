const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

/**
 * Servicio para gestionar la conexión serial con el CanSat
 */
class CansatService extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.port = null;
        this.parser = null;
        this.isConnected = false;
        this.reconnectTimer = null;
        this.currentPortPath = null;
        this.stats = {
            packetsReceived: 0,
            lastPacketTime: null,
            errors: 0
        };
    }

    /**
     * Busca automáticamente el puerto del CanSat
     */
    async findCansatPort() {
        try {
            const ports = await SerialPort.list();
            console.log('Puertos disponibles:', ports.map(p => `${p.path} (${p.manufacturer || 'Unknown'})`));

            if (ports.length === 0) {
                console.log('No se encontraron puertos seriales');
                return null;
            }

            // Estrategia 1: Buscar por fabricante conocido (más confiable)
            const knownManufacturers = ['silicon labs', 'arduino', 'ch340', 'ftdi', 'prolific'];
            const portsByManufacturer = ports.filter(port => {
                if (!port.manufacturer) return false;
                const manufacturer = port.manufacturer.toLowerCase();
                return knownManufacturers.some(known => manufacturer.includes(known));
            });

            if (portsByManufacturer.length > 0) {
                // Si hay múltiples, elegir el de número más alto (más reciente)
                const selectedPort = portsByManufacturer.sort((a, b) => {
                    const numA = parseInt(a.path.match(/\d+$/)?.[0] || '0');
                    const numB = parseInt(b.path.match(/\d+$/)?.[0] || '0');
                    return numB - numA; // Orden descendente
                })[0];
                
                console.log(`Puerto CanSat encontrado por fabricante: ${selectedPort.path} (${selectedPort.manufacturer})`);
                return selectedPort.path;
            }

            // Estrategia 2: Buscar en la lista de puertos configurados
            for (const configPort of this.config.POSSIBLE_PORTS) {
                const foundPort = ports.find(p => p.path === configPort);
                if (foundPort) {
                    console.log(`Puerto CanSat encontrado en configuración: ${foundPort.path}`);
                    return foundPort.path;
                }
            }

            // Estrategia 3: Si solo hay un puerto, usarlo
            if (ports.length === 1) {
                console.log(`Puerto CanSat encontrado (único disponible): ${ports[0].path}`);
                return ports[0].path;
            }

            // Estrategia 4: Usar el puerto COM más alto (Windows) o último disponible
            const sortedPorts = ports.sort((a, b) => {
                const numA = parseInt(a.path.match(/\d+$/)?.[0] || '0');
                const numB = parseInt(b.path.match(/\d+$/)?.[0] || '0');
                return numB - numA;
            });

            if (sortedPorts.length > 0) {
                console.log(`Usando puerto más alto disponible: ${sortedPorts[0].path}`);
                return sortedPorts[0].path;
            }

            console.log('No se encontró puerto CanSat adecuado');
            return null;
        } catch (error) {
            console.error('Error buscando puerto CanSat:', error);
            return null;
        }
    }

    /**
     * Conecta con el CanSat
     */
    async connect(portPath = null) {
        try {
            // Si ya está conectado, no hacer nada
            if (this.isConnected) {
                console.log('CanSat ya está conectado');
                return true;
            }

            // Buscar puerto si no se especificó
            if (!portPath) {
                portPath = await this.findCansatPort();
            }

            if (!portPath) {
                console.log('No se puede conectar: Puerto CanSat no encontrado');
                this.scheduleReconnect();
                return false;
            }

            console.log(`Intentando conectar al CanSat en ${portPath}...`);

            // Crear puerto serial
            this.port = new SerialPort({
                path: portPath,
                baudRate: this.config.BAUD_RATE,
                autoOpen: false
            });

            // Configurar parser para leer líneas
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

            // Abrir puerto
            await new Promise((resolve, reject) => {
                this.port.open((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            this.currentPortPath = portPath;
            this.isConnected = true;

            console.log(`CanSat conectado en ${portPath}`);
            this.emit('connected', { port: portPath });

            // Configurar listeners
            this.setupListeners();

            return true;

        } catch (error) {
            console.error('Error conectando con CanSat:', error.message);
            this.isConnected = false;
            this.emit('error', { message: error.message });
            this.scheduleReconnect();
            return false;
        }
    }

    /**
     * Configura los listeners del puerto serial
     */
    setupListeners() {
        console.log('Configurando listeners del puerto serial...');
        
        // Listener para datos recibidos
        this.parser.on('data', (line) => {
            this.handleData(line);
        });

        // Listener para errores del puerto
        this.port.on('error', (err) => {
            console.error('Error del puerto CanSat:', err.message);
            this.stats.errors++;
            this.emit('error', { message: err.message });
        });

        // Listener para cierre del puerto
        this.port.on('close', () => {
            console.log('Puerto CanSat cerrado');
            this.isConnected = false;
            this.emit('disconnected');
            this.scheduleReconnect();
        });
    }

    /**
     * Procesa los datos recibidos del CanSat
     */
    handleData(line) {
        try {
            const trimmedLine = line.trim();
            
            // Ignorar líneas vacías
            if (!trimmedLine) return;

            // LOG: Mostrar TODAS las líneas que llegan
            console.log('Datos recibidos del puerto serial:', trimmedLine);

            // Verificar que la línea comience con "CANSAT"
            if (!trimmedLine.startsWith('CANSAT,')) {
                console.log('Línea no válida (no comienza con CANSAT):', trimmedLine);
                return;
            }

            // Parsear la línea CSV con referencias de sensores
            const parsedData = this.parseDataLineWithReferences(trimmedLine);

            if (!parsedData) {
                console.log('Error parseando datos con referencias');
                return;
            }

            // Actualizar estadísticas
            this.stats.packetsReceived++;
            this.stats.lastPacketTime = new Date();

            // Emitir evento con los datos parseados
            this.emit('data', parsedData);

            // Log cada 10 paquetes
            if (this.stats.packetsReceived % 10 === 0) {
                console.log(`CanSat: ${this.stats.packetsReceived} paquetes recibidos`);
            }

        } catch (error) {
            console.error('Error procesando datos del CanSat:', error.message);
            this.stats.errors++;
            this.emit('error', { message: error.message, data: line });
        }
    }

    /**
     * Parsea una línea de datos del CanSat con referencias de sensores
     * Formato: CANSAT,packet_id,timestamp,GY_91_C,ax,ay,az,gx,gy,gz,bmp_temp,bmp_pres,SCD_40_C,co2,temp,hum,GPS_NEO_C,lat,lng,alt,hdop,sats,MiCS_4514_C,red,nox
     */
    parseDataLineWithReferences(line) {
        try {
            const parts = line.split(',');
            
            // Extraer header y metadatos
            const header = parts[0]; // "CANSAT"
            const packet_id = parseInt(parts[1]);
            const timestamp = parseInt(parts[2]);
            
            let index = 3;
            const data = {
                header,
                packet_id,
                timestamp,
                received_at: new Date().toISOString(),
                accelerometer: {},
                gyroscope: {},
                barometer: {},
                scd40: {},
                gps: {},
                mics: {}
            };

            // Parsear por referencias de sensores
            while (index < parts.length) {
                const ref = parts[index];
                
                if (ref === 'GY_91_C') {
                    // GY-91: ax, ay, az, gx, gy, gz, bmp_temp, bmp_pres
                    data.accelerometer = {
                        x: parseFloat(parts[index + 1]),
                        y: parseFloat(parts[index + 2]),
                        z: parseFloat(parts[index + 3])
                    };
                    data.gyroscope = {
                        x: parseFloat(parts[index + 4]),
                        y: parseFloat(parts[index + 5]),
                        z: parseFloat(parts[index + 6])
                    };
                    data.barometer = {
                        temperature: parseFloat(parts[index + 7]),
                        pressure: parseFloat(parts[index + 8])
                    };
                    data.sensorRef_GY91 = ref;
                    index += 9;
                } 
                else if (ref === 'SCD_40_C') {
                    // SCD40: co2, temp, hum
                    data.scd40 = {
                        co2: parseFloat(parts[index + 1]),
                        temperature: parseFloat(parts[index + 2]),
                        humidity: parseFloat(parts[index + 3])
                    };
                    data.sensorRef_SCD40 = ref;
                    index += 4;
                }
                else if (ref === 'GPS_NEO_C') {
                    // GPS: lat, lng, alt, hdop, sats
                    data.gps = {
                        latitude: parseFloat(parts[index + 1]),
                        longitude: parseFloat(parts[index + 2]),
                        altitude: parseFloat(parts[index + 3]),
                        hdop: parseFloat(parts[index + 4]),
                        satellites: parseInt(parts[index + 5]),
                        hasFix: parseFloat(parts[index + 1]) !== 0 || parseFloat(parts[index + 2]) !== 0
                    };
                    data.sensorRef_GPS = ref;
                    index += 6;
                }
                else if (ref === 'MiCS_4514_C') {
                    // MICS: red, nox
                    data.mics = {
                        red: parseInt(parts[index + 1]),
                        nox: parseInt(parts[index + 2])
                    };
                    data.sensorRef_MICS = ref;
                    index += 3;
                }
                else {
                    // Referencia desconocida, saltar
                    console.log(`Referencia de sensor desconocida: ${ref}`);
                    break;
                }
            }

            return data;
        } catch (error) {
            console.error('Error parseando línea con referencias:', error.message);
            return null;
        }
    }

    /**
     * Parsea una línea de datos del CanSat (formato antiguo sin referencias)
     */
    parseDataLine(values) {
        return {
            header: values[0],
            packet_id: parseInt(values[1]),
            timestamp: parseInt(values[2]),
            
            // GY-91 (Acelerómetro y Giroscopio)
            accelerometer: {
                x: parseFloat(values[3]),
                y: parseFloat(values[4]),
                z: parseFloat(values[5])
            },
            gyroscope: {
                x: parseFloat(values[6]),
                y: parseFloat(values[7]),
                z: parseFloat(values[8])
            },
            
            // BMP (Barómetro)
            barometer: {
                temperature: parseFloat(values[9]),
                pressure: parseFloat(values[10])
            },
            
            // SCD40 (CO2, Temperatura, Humedad)
            scd40: {
                co2: parseFloat(values[11]),
                temperature: parseFloat(values[12]),
                humidity: parseFloat(values[13])
            },
            
            // GPS
            gps: {
                latitude: parseFloat(values[14]),
                longitude: parseFloat(values[15]),
                altitude: parseFloat(values[16]),
                hdop: parseFloat(values[17]),
                satellites: parseInt(values[18])
            },
            
            // MICS (Sensores de gas)
            mics: {
                red: parseInt(values[19]),
                nox: parseInt(values[20])
            },
            
            // Metadata
            receivedAt: new Date().toISOString()
        };
    }

    /**
     * Programa un intento de reconexión
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        console.log(`Programando reconexión del CanSat en ${this.config.RECONNECT_TIMEOUT / 1000}s...`);
        
        this.reconnectTimer = setTimeout(() => {
            console.log('Intentando reconectar CanSat...');
            this.connect();
        }, this.config.RECONNECT_TIMEOUT);
    }

    /**
     * Desconecta el CanSat
     */
    async disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.port && this.port.isOpen) {
            return new Promise((resolve) => {
                this.port.close((err) => {
                    if (err) {
                        console.error('Error cerrando puerto CanSat:', err);
                    } else {
                        console.log('Puerto CanSat cerrado correctamente');
                    }
                    this.isConnected = false;
                    this.port = null;
                    this.parser = null;
                    resolve();
                });
            });
        }

        this.isConnected = false;
        return Promise.resolve();
    }

    /**
     * Obtiene el estado actual del servicio
     */
    getStatus() {
        return {
            connected: this.isConnected,
            port: this.currentPortPath,
            stats: { ...this.stats }
        };
    }
}

module.exports = CansatService;
