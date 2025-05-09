const { server } = require('./app');
const config = require('./config');
const crearTablas = require('../modelo/database/crearTablas');

crearTablas.then(() => {
    server.listen(config.app.port, () => {
        console.log("Servidor escuchando en el puerto", config.app.port);
    });
}).catch(err => {
    console.error('Error durante la inicialización de la base de datos:', err);
});