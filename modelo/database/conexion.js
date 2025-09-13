const Database = require('better-sqlite3');
const path = require('path');

// Ruta al archivo SQLite
const dbPath = path.resolve(__dirname, 'database.db');

let db;

try {
    // Crea una única instancia persistente de la base de datos
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // Para concurrencia de lectura
    console.log('Conectado a la base de datos SQLite');

    // Cierra la conexión cuando la aplicación termina
    process.on('exit', () => {
        if (db && db.open) {
            db.close();
            console.log('Conexión a la base de datos cerrada.');
        }
    });

} catch (err) {
    console.error('Error al abrir la base de datos:', err.message);
    process.exit(1); 
}

module.exports = db;