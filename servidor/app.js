const http = require('http');
const { createExpressApp, configureSocketIO, ROCKET_CONFIG, CANSAT_CONFIG } = require('./config');
const setupRoutes = require('./routes');
const TelemetryController = require('./controllers/TelemetryController');
const CansatController = require('./controllers/CansatController');
const RocketService = require('./services/RocketService');
const RocketDataProcessing = require('./services/RocketDataProcessing');
const CansatService = require('./services/CansatService');
const CansatDataProcessing = require('./services/CansatDataProcessing');

/**
 * Inicializa la aplicación
 * @returns {Object} Objeto con la aplicación Express, servidor HTTP y servicios
 */
function initializeApp() {
    // Crear aplicación Express
    const app = createExpressApp();
    
    // Crear servidor HTTP
    const server = http.createServer(app);
    
    // Configurar Socket.io
    const io = configureSocketIO(server);
    
    // Inicializar servicios del cohete
    const rocketService = new RocketService(ROCKET_CONFIG);
    const rocketDataProcessing = new RocketDataProcessing(ROCKET_CONFIG);
    
    // Inicializar servicios del CanSat
    const cansatService = new CansatService(CANSAT_CONFIG);
    const cansatDataProcessing = new CansatDataProcessing(CANSAT_CONFIG);
    
    // Conectar servicios
    rocketDataProcessing.listenTo(rocketService);
    cansatDataProcessing.listenTo(cansatService);
    
    // Configurar controladores de telemetría
    new TelemetryController(io, rocketDataProcessing);
    new CansatController(io, cansatDataProcessing);
    
    // Configurar rutas
    setupRoutes(app);
    
    return { app, server, rocketService, rocketDataProcessing, cansatService, cansatDataProcessing };
}

// Inicializar la aplicación
const { app, server, rocketService, rocketDataProcessing, cansatService, cansatDataProcessing } = initializeApp();

// Intentar conectar al receptor LoRa del cohete automáticamente
console.log('Iniciando conexión con receptor LoRa del cohete...');
rocketService.connect();

// Intentar conectar al CanSat automáticamente
console.log('Iniciando conexión con CanSat...');
cansatService.connect();

// Exportar la aplicación, servidor y servicios
module.exports = { 
    app, 
    server, 
    rocketService, 
    rocketDataProcessing,
    cansatService,
    cansatDataProcessing
};