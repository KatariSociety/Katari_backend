const express = require('express');
const cors = require('cors');
const app = express();
/**
 * Modulos de la aplicacion
 * @type {Router | {}}
 */
const sensores = require('./src/modulos/sensores/sensoresRuta');
const Lecturas = require('./src/modulos/Lecturas/lecturaRuta');
const dispositivo = require('./src/modulos/dispositivo/dispositivoRuta');
const eventos = require('./src/modulos/evento/eventoRuta');
/**
 * configuracion de la aplicacion
 */

app.use(cors({
    origin: 'http://localhost:5173' // <--- Permite solo este origen
}));

//app.use(express.static(join(__dirname, '../cliente'))); // Servir archivos estáticos de la carpeta cliente
app.use(express.json()); // Habilitar el uso de JSON en las peticiones

/**
 * Rutas de la aplicacion
 */
app.use('/sensores', sensores);
app.use('/lecturas', Lecturas);
app.use('/dispositivos', dispositivo);
app.use('/eventos', eventos);


module.exports = app;