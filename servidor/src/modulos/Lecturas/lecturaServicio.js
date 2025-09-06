const TABLE_NAME = 'tblLectura';

module.exports = function (db) {
    async function obtenerTodasLasLecturas() {
        return await db.getAll(TABLE_NAME);
    }
    
    async function obtenerLecturasPorSensor(sensorId) {
        const query = `SELECT * FROM ${TABLE_NAME} WHERE id_sensor = ?`;
        return await db.executeSelectQuery(query, [sensorId]);
    }
    
    async function obtenerLecturaPorId(lecturaId) {
        return await db.getOne(TABLE_NAME, 'id_lectura', lecturaId);
    }
    
    async function insertarLectura(lecturaData) {
        return await db.insert(TABLE_NAME, lecturaData);
    }
    
    async function obtenerLecturasPorEventoId(eventoId) {
        const query = `SELECT * FROM ${TABLE_NAME} WHERE id_evento = ?`;
        return await db.executeSelectQuery(query, [eventoId]);
    }

    async function obtenerLecturasPorSensorYEventoId(sensorId, eventoId) {
        const query = `SELECT * FROM ${TABLE_NAME} WHERE id_sensor = ? AND id_evento = ?`;
        return await db.executeSelectQuery(query, [sensorId, eventoId]);
    }

    return {
        obtenerTodasLasLecturas,
        obtenerLecturasPorSensor,
        obtenerLecturaPorId,
        insertarLectura,
        obtenerLecturasPorEventoId,
        obtenerLecturasPorSensorYEventoId
    };
};
