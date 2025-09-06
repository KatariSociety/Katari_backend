const respuesta = require("../../utilidades/respuestas");

module.exports = function (servicio) {
    async function obtenerLecturas(req, res, next) {
        try {
            const lecturas = await servicio.obtenerTodasLasLecturas();
            respuesta.success(req, res, {
                success: true,
                message: lecturas.length > 0 ? 'Datos encontrados exitosamente' : 'Datos no encontrados',
                data: lecturas,
            }, lecturas.length > 0 ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function obtenerLecturasPorSensor(req, res, next) {
        try {
            const { sensorId } = req.params;
            const lecturas = await servicio.obtenerLecturasPorSensor(sensorId);
            respuesta.success(req, res, {
                success: true,
                message: lecturas.length > 0 ? 'Datos encontrados exitosamente' : 'Datos no encontrados',
                data: lecturas,
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
            const lecturas = await servicio.obtenerLecturasPorEventoId(eventoId);
             respuesta.success(req, res, {
                message: lecturas.length > 0 ? `Lecturas encontradas para el evento ${eventoId}` : 'Evento no encontrado o sin lecturas',
                data: lecturas,
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
