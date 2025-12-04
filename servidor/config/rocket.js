/**
 * Configuración del puerto serial para el receptor LoRa del cohete
 */
const ROCKET_CONFIG = {
    // Lista de puertos posibles para mayor compatibilidad
    POSSIBLE_PORTS: [
        '/dev/ttyACM0',
        '/dev/ttyACM1',
        '/dev/ttyUSB0',
        '/dev/ttyUSB1',
        'COM3',
        'COM4',
        'COM5',
        'COM6',
        'COM7',
        'COM8'
    ],
    BAUD_RATE: 115200,
    RECONNECT_TIMEOUT: 5000,
    DISCOVERY_TIMEOUT: 10000,
    
    // Mapeo de referencias de sensores para la base de datos
    SENSOR_MAPPING: {
        'MPU_R': 'MPU_R',
        'BMP_R': 'BMP_R',
        'GPS_NEO_R': 'GPS_NEO_R'
    },
    
    // Estados de vuelo válidos
    FLIGHT_STATES: [
        'GROUND',
        'LAUNCHED',
        'APOGEE',
        'DESCENT'
    ],
    
    // Umbrales para alertas
    THRESHOLDS: {
        MAX_PACKET_LOSS: 100,        // % máximo de pérdida de paquetes
        MIN_RSSI: -100,              // dBm mínimo aceptable
        MIN_SNR: 5,                  // SNR mínimo aceptable
        MAX_ACCELERATION: 20,        // g máxima esperada
        MIN_PRESSURE: 500,           // hPa mínima esperada
        MAX_PRESSURE: 1100           // hPa máxima esperada
    }
};

module.exports = ROCKET_CONFIG;
