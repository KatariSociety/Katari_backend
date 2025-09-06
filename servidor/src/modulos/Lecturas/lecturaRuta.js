const express = require('express');
const router = express.Router();
const controlador = require('./index');

router.get('/', controlador.obtenerLecturas);
router.post('/', controlador.insertarLectura);

router.get('/sensor/:sensorId', controlador.obtenerLecturasPorSensor);
router.get('/evento/:eventoId', controlador.obtenerLecturasPorEvento);
router.get('/sensor/:sensorId/evento/:eventoId', controlador.obtenerLecturasPorSensorYEvento);

router.get('/:lecturaId', controlador.obtenerLecturasPorId);

module.exports = router;