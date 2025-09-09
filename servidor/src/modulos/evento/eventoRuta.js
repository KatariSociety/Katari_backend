const express = require('express');
const router = express.Router();
const controlador = require('./index');

// Rutas para la colección de eventos
router.get('/', controlador.obtenerEventos);
router.post('/', controlador.insertarEvento);

// Rutas para un evento específico por ID
router.get('/:eventoId', controlador.obtenerEventoPorId);
router.put('/:eventoId', controlador.actualizarEvento);
router.delete('/:eventoId', controlador.eliminarEvento);

module.exports = router;