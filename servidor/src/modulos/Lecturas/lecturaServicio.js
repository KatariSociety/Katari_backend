const TABLE_NAME = 'tblLectura';

module.exports = function (db) {
    async function obtenerTodasLasLecturas(limit = 50, offset = 0) {
        const query = `SELECT * FROM ${TABLE_NAME} ORDER BY fecha_lectura DESC LIMIT ? OFFSET ?`;
        return await db.executeSelectQuery(query, [limit, offset]);
    }
    
    async function contarTodasLasLecturas() {
        const query = `SELECT COUNT(*) as total FROM ${TABLE_NAME}`;
        const result = await db.executeSelectQuery(query);
        return result[0].total;
    }
    
    async function obtenerLecturasPorSensor(sensorId, limit = 50, offset = 0) {
        const query = `SELECT * FROM ${TABLE_NAME} WHERE id_sensor = ? ORDER BY fecha_lectura DESC LIMIT ? OFFSET ?`;
        return await db.executeSelectQuery(query, [sensorId, limit, offset]);
    }
    
    async function contarLecturasPorSensor(sensorId) {
        const query = `SELECT COUNT(*) as total FROM ${TABLE_NAME} WHERE id_sensor = ?`;
        const result = await db.executeSelectQuery(query, [sensorId]);
        return result[0].total;
    }
    
    async function obtenerLecturaPorId(lecturaId) {
        return await db.getOne(TABLE_NAME, 'id_lectura', lecturaId);
    }
    
    async function insertarLectura(lecturaData) {
        return await db.insert(TABLE_NAME, lecturaData);
    }
    
    async function obtenerLecturasPorEventoId(eventoId, limit = 50, offset = 0) {
        const query = `SELECT * FROM ${TABLE_NAME} WHERE id_evento = ? ORDER BY fecha_lectura DESC LIMIT ? OFFSET ?`;
        return await db.executeSelectQuery(query, [eventoId, limit, offset]);
    }
    
    async function contarLecturasPorEventoId(eventoId) {
        const query = `SELECT COUNT(*) as total FROM ${TABLE_NAME} WHERE id_evento = ?`;
        const result = await db.executeSelectQuery(query, [eventoId]);
        return result[0].total;
    }

    async function obtenerLecturasPorSensorYEventoId(sensorId, eventoId) {
        const query = `SELECT * FROM ${TABLE_NAME} WHERE id_sensor = ? AND id_evento = ?`;
        return await db.executeSelectQuery(query, [sensorId, eventoId]);
    }

    return {
        obtenerTodasLasLecturas,
        contarTodasLasLecturas,
        obtenerLecturasPorSensor,
        contarLecturasPorSensor,
        obtenerLecturaPorId,
        insertarLectura,
        obtenerLecturasPorEventoId,
        contarLecturasPorEventoId,
        obtenerLecturasPorSensorYEventoId
    };
};
