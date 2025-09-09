const respuesta = require("../../utilidades/respuestas");

module.exports = function (servicio) {
    async function obtenerLecturas(req, res, next) {
        try {
            // Parámetros de paginación
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;
            
            // Validar límites
            if (limit > 500) {
                return respuesta.success(req, res, {
                    success: false,
                    message: 'El límite máximo es 500 registros por página',
                }, 400);
            }
            
            const [lecturas, total] = await Promise.all([
                servicio.obtenerTodasLasLecturas(limit, offset),
                servicio.contarTodasLasLecturas()
            ]);
            
            const totalPages = Math.ceil(total / limit);
            
            respuesta.success(req, res, {
                success: true,
                message: lecturas.length > 0 ? 'Datos encontrados exitosamente' : 'Datos no encontrados',
                data: lecturas,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalRecords: total,
                    limit: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }, lecturas.length > 0 ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function obtenerLecturasPorSensor(req, res, next) {
        try {
            const { sensorId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;
            
            if (limit > 100) {
                return respuesta.success(req, res, {
                    success: false,
                    message: 'El límite máximo es 100 registros por página',
                }, 400);
            }
            
            const [lecturas, total] = await Promise.all([
                servicio.obtenerLecturasPorSensor(sensorId, limit, offset),
                servicio.contarLecturasPorSensor(sensorId)
            ]);
            
            const totalPages = Math.ceil(total / limit);
            
            respuesta.success(req, res, {
                success: true,
                message: lecturas.length > 0 ? 'Datos encontrados exitosamente' : 'Datos no encontrados',
                data: lecturas,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalRecords: total,
                    limit: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }, lecturas.length > 0 ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function obtenerLecturasPorId(req, res, next) {
        try {
            const { lecturaId } = req.params;
            const lectura = await servicio.obtenerLecturaPorId(lecturaId);
            respuesta.success(req, res, {
                success: true,
                message: lectura ? 'Datos encontrados exitosamente' : 'Datos no encontrados',
                data: lectura,
            }, lectura ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function insertarLectura(req, res, next) {
        try {
            const lecturaData = req.body;
            const nuevaLectura = await servicio.insertarLectura(lecturaData);
            respuesta.success(req, res, {
                success: true,
                message: 'Datos insertados exitosamente',
                data: { id: nuevaLectura },
            }, 201);
        } catch (error) {
            next(error);
        }
    }

    async function obtenerLecturasPorEvento(req, res, next) {
        try {
            const { eventoId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;
            
            if (limit > 200) {
                return respuesta.success(req, res, {
                    success: false,
                    message: 'El límite máximo es 200 registros por página',
                }, 400);
            }
            
            const [lecturas, total] = await Promise.all([
                servicio.obtenerLecturasPorEventoId(eventoId, limit, offset),
                servicio.contarLecturasPorEventoId(eventoId)
            ]);
            
            const totalPages = Math.ceil(total / limit);
            
            respuesta.success(req, res, {
                success: true,
                message: lecturas.length > 0 ? `Lecturas encontradas para el evento ${eventoId}` : 'Evento no encontrado o sin lecturas',
                data: lecturas,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalRecords: total,
                    limit: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }, lecturas.length > 0 ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function obtenerLecturasPorSensorYEvento(req, res, next) {
        try {
            const { sensorId, eventoId } = req.params;
            const lecturas = await servicio.obtenerLecturasPorSensorYEventoId(sensorId, eventoId);
             respuesta.success(req, res, {
                message: lecturas.length > 0 ? `Lecturas encontradas para el sensor ${sensorId} y evento ${eventoId}` : 'No se encontraron lecturas para la combinación dada',
                data: lecturas,
            }, lecturas.length > 0 ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    return {
        obtenerLecturas,
        obtenerLecturasPorSensor,
        obtenerLecturasPorId,
        insertarLectura,
        obtenerLecturasPorEvento,
        obtenerLecturasPorSensorYEvento
    };
};
