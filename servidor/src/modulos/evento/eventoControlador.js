const respuesta = require("../../utilidades/respuestas");

module.exports = function (servicio) {
    async function obtenerEventos(req, res, next) {
        try {
            const eventos = await servicio.getAll();
            respuesta.success(req, res, {
                success: true,
                message: eventos.length > 0 ? 'Eventos encontrados exitosamente' : 'No se encontraron eventos',
                data: eventos,
            }, eventos.length > 0 ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function obtenerEventoPorId(req, res, next) {
        try {
            const { eventoId } = req.params;
            const evento = await servicio.getById(eventoId);
            respuesta.success(req, res, {
                success: true,
                message: evento ? 'Evento encontrado exitosamente' : 'Evento no encontrado',
                data: evento,
            }, evento ? 200 : 404);
        } catch (error) {
            next(error);
        }
    }

    async function insertarEvento(req, res, next) {
        try {
            const eventoData = req.body;
            const nuevoEventoId = await servicio.insert(eventoData);
            respuesta.success(req, res, {
                success: true,
                message: 'Evento creado exitosamente',
                data: { id: nuevoEventoId },
            }, 201);
        } catch (error) {
            next(error);
        }
    }

    async function actualizarEvento(req, res, next) {
        try {
            const { eventoId } = req.params;
            const eventoData = req.body;
            const resultado = await servicio.update(eventoId, eventoData);

            if (resultado.affectedItems > 0) {
                respuesta.success(req, res, {
                    success: true,
                    message: 'Evento actualizado exitosamente',
                    data: { id: eventoId, ...eventoData }
                }, 200);
            } else {
                respuesta.success(req, res, {
                    success: false,
                    message: 'Evento no encontrado',
                }, 404);
            }
        } catch (error) {
            next(error);
        }
    }

    async function eliminarEvento(req, res, next) {
        try {
            const { eventoId } = req.params;
            const resultado = await servicio.remove(eventoId);

            if (resultado.affectedItems > 0) {
                respuesta.success(req, res, {
                    success: true,
                    message: 'Evento eliminado exitosamente',
                }, 200);
            } else {
                respuesta.success(req, res, {
                    success: false,
                    message: 'Evento no encontrado',
                }, 404);
            }
        } catch (error) {
            next(error);
        }
    }
    
    return {
        obtenerEventos,
        obtenerEventoPorId,
        insertarEvento,
        actualizarEvento,
        eliminarEvento
    };
};