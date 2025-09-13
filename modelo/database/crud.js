const db = require('./conexion');

/**
 * Ejecutar una consulta SELECT en la base de datos
 * @param query - Consulta SQL
 * @param params - Parámetros de la consulta
 * @returns {Array} - Resultados de la consulta
 */
function executeSelectQuery(query, params = []) {
    try {
        const stmt = db.prepare(query);
        return stmt.all(...params);
    } catch (err) {
        console.error('Error al ejecutar consulta SELECT:', err.message);
        throw err;
    }
}

/**
 * Ejecutar una consulta que no sea SELECT en la base de datos
 * @param query - Consulta SQL
 * @param params - Parámetros de la consulta
 * @returns {Object} - Objeto con información sobre la operación
 */
function executeNonSelectQuery(query, params = []) {
    try {
        const stmt = db.prepare(query);
        const result = stmt.run(...params);
        return { 
            lastID: result.lastInsertRowid, 
            changes: result.changes 
        };
    } catch (err) {
        console.error('Error al ejecutar consulta no SELECT:', err.message);
        throw err;
    }
}

/**
 * Inserta múltiples filas en una tabla dentro de una única transacción.
 * @param {string} table - Nombre de la tabla
 * @param {Array<Object>} dataArray - Array de objetos a insertar
 * @returns {number} - Número de filas insertadas
 */
function insertMany(table, dataArray) {
    if (!dataArray || dataArray.length === 0) {
        return 0;
    }
    
    const columns = Object.keys(dataArray[0]).join(', ');
    const placeholders = Object.keys(dataArray[0]).map(() => '?').join(', ');
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

    // Usa una transacción para un rendimiento masivo
    const insertTransaction = db.transaction((items) => {
        const stmt = db.prepare(query);
        let totalChanges = 0;
        for (const item of items) {
            const result = stmt.run(...Object.values(item));
            totalChanges += result.changes;
        }
        return totalChanges;
    });

    try {
        const changes = insertTransaction(dataArray);
        return { changes };
    } catch (err) {
        console.error('Error en la inserción por lotes (batch insert):', err.message);
        throw err;
    }
}

/**
 * Obtener todas las filas de una tabla
 * @param table - Nombre de la tabla
 * @returns {Array} - Filas de la tabla
 */
function getAll(table) {
    const query = `SELECT * FROM ${table}`;
    return executeSelectQuery(query);
}

/**
 * Obtener una fila específica por clave primaria
 * @param table - Nombre de la tabla
 * @param primaryKey - Nombre de la clave primaria
 * @param id - Valor de la clave primaria
 * @returns {Object|null} - Fila solicitada o null si no existe
 */
function getOne(table, primaryKey, id) {
    const query = `SELECT * FROM ${table} WHERE ${primaryKey} = ?`;
    const rows = executeSelectQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Insertar una fila en una tabla
 * @param table - Nombre de la tabla
 * @param data - Datos a insertar
 * @returns {number} - ID de la fila insertada
 */
function insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = executeNonSelectQuery(query, Object.values(data));
    return result.lastID;
}

/**
 * Actualizar una fila en una tabla
 * @param table - Nombre de la tabla
 * @param primaryKey - Nombre de la clave primaria
 * @param id - Valor de la clave primaria
 * @param data - Datos a actualizar
 * @returns {Object} - Objeto con el número de filas afectadas
 */
function update(table, primaryKey, id, data) {
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const query = `UPDATE ${table} SET ${updates} WHERE ${primaryKey} = ?`;
    const result = executeNonSelectQuery(query, [...Object.values(data), id]);
    return { affectedItems: result.changes };
}

/**
 * Eliminar una fila de una tabla
 * @param table - Nombre de la tabla
 * @param primaryKey - Nombre de la clave primaria
 * @param id - Valor de la clave primaria
 * @returns {Object} - Objeto con el número de filas afectadas
 */
function remove(table, primaryKey, id) {
    const query = `DELETE FROM ${table} WHERE ${primaryKey} = ?`;
    const result = executeNonSelectQuery(query, [id]);
    return { affectedItems: result.changes };
}

module.exports = {
    getAll,
    getOne,
    insert,
    update,
    remove,
    executeSelectQuery,
    executeNonSelectQuery,
    insertMany
};