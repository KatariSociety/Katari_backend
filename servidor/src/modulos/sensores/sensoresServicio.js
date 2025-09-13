const TABLE_NAME = 'tblSensor';

module.exports = function (db) {
    async function obtenerTodosLosSensores(limit = 50, offset = 0) {
        const query = `SELECT * FROM ${TABLE_NAME} ORDER BY id_sensor DESC LIMIT ? OFFSET ?`;
        return await db.executeSelectQuery(query, [limit, offset]);
    }

    async function contarSensores() {
        const query = `SELECT COUNT(*) as total FROM ${TABLE_NAME}`;
        const result = await db.executeSelectQuery(query);
        return result[0].total;
    }

    async function obtenerSensorPorId(id) {
        return await db.getOne(TABLE_NAME, 'id_sensor', id);
    }

    async function insertarSensor(sensorData) {
        return await db.insert(TABLE_NAME, sensorData);
    }

    async function actualizarSensor(id, sensorData) {
        return await db.update(TABLE_NAME, 'id_sensor', id, sensorData);
    }

    async function eliminarSensor(id) {
        return await db.remove(TABLE_NAME, 'id_sensor', id);
    }

    return {
        obtenerTodosLosSensores,
        contarSensores,
        obtenerSensorPorId,
        insertarSensor,
        actualizarSensor,
        eliminarSensor,
    };
};