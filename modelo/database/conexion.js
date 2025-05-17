const Database = require('better-sqlite3');
const path = require('path');

// Ruta al archivo SQLite
const dbPath = path.resolve(__dirname, 'database.db');

/**
 * Clase que maneja la conexión a la base de datos
 */
class DatabaseConnection {
    static db;

    /**
     * Abre la conexión a la base de datos
     * @returns {Database} - Retorna la instancia de la conexión a la base de datos
     */
    static open() {
        if (!this.db) {
            try {
                this.db = new Database(dbPath);
                console.log('Conectado a la base de datos.');
            } catch (err) {
                console.error('Error al abrir la base de datos:', err.message);
                throw err;
            }
        }
        return this.db;
    }

    /**
     * Cierra la conexión a la base de datos
     */
    static close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('Conexión a la base de datos cerrada.');
        } else {
            console.log('No hay conexión abierta para cerrar.');
        }
    }
}

module.exports = DatabaseConnection;