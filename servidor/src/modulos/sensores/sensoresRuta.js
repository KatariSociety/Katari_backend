const express = require('express');
const router = express.Router();
const controlador = require('./index');

router.get('/', controlador.obtenerSensores);
router.get('/:sensorId', controlador.obtenerSensorPorId);
router.post('/', controlador.insertarSensor);
router.put('/:sensorId', controlador.actualizarSensor);
router.delete('/:sensorId', controlador.eliminarSensor);

module.exports = router;