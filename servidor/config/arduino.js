/**
 * Configuración del puerto serial para Arduino
 */
const ARDUINO_CONFIG = {
    // Lista de puertos posibles para mayor compatibilidad
    POSSIBLE_PORTS: [
        '/dev/ttyACM0',
        '/dev/ttyACM1',
        '/dev/ttyUSB0',
        '/dev/ttyUSB1',
        'COM4'
    ],
    BAUD_RATE: 115200,
    RECONNECT_TIMEOUT: 5000,
    DISCOVERY_TIMEOUT: 10000
};

module.exports = ARDUINO_CONFIG;