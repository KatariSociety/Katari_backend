/**
 * Configuración del puerto serial para el CanSat
 */
const CANSAT_CONFIG = {
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
        'COM8',
        'COM9',
        'COM10'
    ],
    BAUD_RATE: 115200,
    RECONNECT_TIMEOUT: 5000,
    DISCOVERY_TIMEOUT: 10000,
    
    // Mapeo de referencias de sensores para la base de datos
    SENSOR_MAPPING: {
        'GY91_CANSAT': 'GY91_CANSAT',      // Acelerómetro, giroscopio y barómetro
        'SCD40_CANSAT': 'SCD40_CANSAT',    // CO2, temperatura y humedad
        'GPS_CANSAT': 'GPS_CANSAT',        // GPS
        'MICS_CANSAT': 'MICS_CANSAT'       // Sensores de gas
    },
    
    // Estructura de datos esperada del CanSat
    // CANSAT,packet_id,timestamp,ax,ay,az,gx,gy,gz,bmp_temp,bmp_pres,scd40_co2,scd40_temp,scd40_hum,gps_lat,gps_lng,gps_alt,gps_hdop,gps_sats,mics_red,mics_nox
    DATA_FIELDS: [
        'header',        // 0: CANSAT
        'packet_id',     // 1: ID del paquete
        'timestamp',     // 2: Timestamp
        'ax',            // 3: Aceleración X (g)
        'ay',            // 4: Aceleración Y (g)
        'az',            // 5: Aceleración Z (g)
        'gx',            // 6: Giroscopio X (dps)
        'gy',            // 7: Giroscopio Y (dps)
        'gz',            // 8: Giroscopio Z (dps)
        'bmp_temp',      // 9: Temperatura BMP (°C)
        'bmp_pres',      // 10: Presión BMP (Pa)
        'scd40_co2',     // 11: CO2 (ppm)
        'scd40_temp',    // 12: Temperatura SCD40 (°C)
        'scd40_hum',     // 13: Humedad (%)
        'gps_lat',       // 14: Latitud
        'gps_lng',       // 15: Longitud
        'gps_alt',       // 16: Altitud GPS (m)
        'gps_hdop',      // 17: HDOP
        'gps_sats',      // 18: Satélites
        'mics_red',      // 19: MICS reducción
        'mics_nox'       // 20: MICS NOx
    ],
    
    // Umbrales para alertas
    THRESHOLDS: {
        MAX_ACCELERATION: 20,        // g máxima esperada
        MIN_PRESSURE: 50000,         // Pa mínima esperada
        MAX_PRESSURE: 110000,        // Pa máxima esperada
        MAX_CO2: 5000,               // ppm máximo de CO2
        MIN_TEMPERATURE: -40,        // °C mínima
        MAX_TEMPERATURE: 85          // °C máxima
    }
};

module.exports = CANSAT_CONFIG;
