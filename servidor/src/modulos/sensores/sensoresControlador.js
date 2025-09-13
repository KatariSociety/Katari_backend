const respuesta = require("../../utilidades/respuestas");

module.exports = function (servicio) {
    async function obtenerSensores(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;

            if (limit > 200) {
                return respuesta.success(req, res, {
                    success: false,
                    message: 'El límite máximo es 200 registros por página',
                }, 400);
            }

            const [sensores, total] = await Promise.all([
                servicio.obtenerTodosLosSensores(limit, offset),
                servicio.contarSensores()
            ]);

            const totalPages = Math.ceil(total / limit);

            respuesta.success(req, res, {
                success: true,
                message: sensores.length > 0 ? 'Sensores encontrados exitosamente' : 'No se encontraron sensores',
                data: sensores,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalRecords: total,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }, sensores.length > 0 ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function obtenerSensorPorId(req, res, next) {
        try {
            const { sensorId } = req.params;
            const sensor = await servicio.obtenerSensorPorId(sensorId);

            respuesta.success(req, res, {
                success: true,
                message: sensor ? 'Sensor encontrado exitosamente' : 'Sensor no encontrado',
                data: sensor,
            }, sensor ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function insertarSensor(req, res, next) {
        try {
            const sensorData = req.body;
            const nuevoSensor = await servicio.insertarSensor(sensorData);

            respuesta.success(req, res, {
                success: true,
                message: 'Sensor insertado exitosamente',
                data: { id: nuevoSensor },
            }, 201);
        } catch (error) {
            next(error);
        }
    }

    async function actualizarSensor(req, res, next) {
        try {
            const { sensorId } = req.params;
            const sensorData = req.body;
            const resultado = await servicio.actualizarSensor(sensorId, sensorData);

            if (resultado.affectedItems !== 0) {
                respuesta.success(req, res, {
                    success: true,
                    message: 'Sensor actualizado exitosamente',
                    data: resultado,
                }, 200);
            } else {
                respuesta.success(req, res, {
                    success: false,
                    message: 'Sensor no encontrado',
                }, 404);
            }
        } catch (error) {
            next(error);
        }
    }

    async function eliminarSensor(req, res, next) {
        try {
            const { sensorId } = req.params;
            const resultado = await servicio.eliminarSensor(sensorId);

            if (resultado.affectedItems !== 0) {
                respuesta.success(req, res, {
                    success: true,
                    message: 'Sensor eliminado exitosamente',
                    data: resultado,
                }, 200);
            } else {
                respuesta.success(req, res, {
                    success: false,
                    message: 'Sensor no encontrado',
                }, 404);
            }
        } catch (error) {
            next(error);
        }
    }

    return {
        obtenerSensores,
        obtenerSensorPorId,
        insertarSensor,
        actualizarSensor,
        eliminarSensor,
    };
};
