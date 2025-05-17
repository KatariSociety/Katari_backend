const Database = require('./conexion');

/**
 * crear definiciones de tablas
 */
const tablas = [
    {
        nombre: 'tblDispositivo',
        query: `
            CREATE TABLE IF NOT EXISTS tblDispositivo (
                id_dispositivo INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_dispositivo TEXT NOT NULL,
                tipo_dispositivo TEXT NOT NULL,
                CHECK (tipo_dispositivo IN ('cohete', 'satelite'))
            );
        `
    },
    {
        nombre: 'tblSensor',
        query: `
            CREATE TABLE IF NOT EXISTS tblSensor (
                id_sensor INTEGER PRIMARY KEY AUTOINCREMENT,
                id_dispositivo INTEGER NOT NULL,
                nombre_sensor TEXT NOT NULL,
                tipo_sensor TEXT NOT NULL,
                referencia_sensor TEXT,
                estado_sensor TEXT NOT NULL,
                FOREIGN KEY (id_dispositivo) REFERENCES tblDispositivo(id_dispositivo),
                CHECK (tipo_sensor IN ('altimetro', 'acelerometro', 'gps', 'Movimiento Inercial', 'temperatura', 'presion')),
                CHECK (estado_sensor IN ('bueno', 'malo', 'calibrando', 'intermitente'))
            );
        `
    },
    {
        nombre: 'tblEvento',
        query: `
            CREATE TABLE IF NOT EXISTS tblEvento (
                id_evento INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_evento TEXT NOT NULL,
                nombre_evento TEXT NOT NULL,
                descripcion_evento TEXT,
                fecha_inicio_evento INTEGER NOT NULL,
                fecha_fin_evento INTEGER,
                estado_evento TEXT NOT NULL,
                CHECK (tipo_evento IN ('despegue', 'prueba')),
                CHECK (estado_evento IN ('completado', 'fallido'))
            );
        `
    },
    {
        nombre: 'tblLectura',
        query: `
            CREATE TABLE IF NOT EXISTS tblLectura (
                id_lectura INTEGER PRIMARY KEY AUTOINCREMENT,
                id_sensor INTEGER NOT NULL,
                id_evento INTEGER NOT NULL,
                valor_lectura REAL NOT NULL,
                fecha_lectura INTEGER NOT NULL,
                FOREIGN KEY (id_sensor) REFERENCES tblSensor(id_sensor),
                FOREIGN KEY (id_evento) REFERENCES tblEvento(id_evento)
            );
        `
    },
    {
        nombre: 'tblEventoSensor',
        query: `
            CREATE TABLE IF NOT EXISTS tblEventoSensor (
                id_evento_sensor INTEGER PRIMARY KEY AUTOINCREMENT,
                id_evento INTEGER NOT NULL,
                id_sensor INTEGER NOT NULL,
                FOREIGN KEY (id_evento) REFERENCES tblEvento(id_evento),
                FOREIGN KEY (id_sensor) REFERENCES tblSensor(id_sensor)
            );
        `
    },
    {
        nombre: 'tblImagen',
        query: `
            CREATE TABLE IF NOT EXISTS tblImagen (
                id_imagen INTEGER PRIMARY KEY AUTOINCREMENT,
                id_sensor INTEGER NOT NULL,
                id_evento INTEGER NOT NULL,
                ruta_archivo TEXT NOT NULL,
                fecha_imagen INTEGER NOT NULL,
                descripcion_imagen TEXT,
                latitud REAL,
                longitud REAL,
                altitud REAL,
                FOREIGN KEY (id_sensor) REFERENCES tblSensor(id_sensor),
                FOREIGN KEY (id_evento) REFERENCES tblEvento(id_evento)
            );
        `
    }
];

/**
 * Función para crear las tablas
 */
function crearTablas() {
    const db = Database.open();

    // Iniciar transacción para creación de tablas
    db.pragma('foreign_keys = ON');
    
    try {
        // Crear tablas en una transacción
        db.transaction(() => {
            // Iterar sobre las definiciones de las tablas
            tablas.forEach(({ nombre, query }) => {
                try {
                    db.exec(query);
                    console.log(`Tabla "${nombre}" creada o ya existe.`);
                } catch (err) {
                    console.error(`Error al crear la tabla "${nombre}":`, err.message);
                    throw err; // Propagar el error para revertir la transacción
                }
            });
        })();
    } catch (err) {
        console.error('Error al crear las tablas:', err.message);
    }
}

module.exports = crearTablas;