// Cargar variables de entorno
require('dotenv').config();

require('./logger');

const { server } = require('./app');
//const crearTablas = require('../modelo/database/crearTablas');

// Definir puerto por defecto
const PORT = process.env.PORT || 3000;

// Iniciar el servidor después de crear las tablas
try {
    // Ahora crearTablas es una función síncrona, no una promesa
    //crearTablas();
    
    // Iniciar el servidor
    server.listen(PORT, () => {
        console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
} catch (err) {
    console.error('Error durante la inicialización de la base de datos:', err);
    process.exit(1); // Salir con error
}