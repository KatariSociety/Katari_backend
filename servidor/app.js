const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

/**
 * Configuración de Socket.io
 */
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

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
    origin: 'http://localhost:5173'
}));

app.use(express.json()); // Habilitar el uso de JSON en las peticiones

/**
 * Rutas de la aplicacion
 */
app.use('/sensores', sensores);
app.use('/lecturas', Lecturas);
app.use('/dispositivos', dispositivo);
app.use('/eventos', eventos);

/**
 * Configuración del puerto serial Arduino
 */
const PORT = '/dev/ttyACM0';  // Ajustar según tu puerto de Arduino
const BAUD_RATE = 9600;

// Variables para manejar la conexión serial y datos
let serialPort;
let isConnected = false;

// Iniciar conexión serial
function connectToArduino() {
  // Listar puertos disponibles
  SerialPort.list().then(ports => {
    console.log("Puertos seriales disponibles:", ports.map(p => p.path));
    
    try {
      serialPort = new SerialPort({ path: PORT, baudRate: BAUD_RATE });
      
      const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      
      serialPort.on('open', () => {
        console.log(`Conexión establecida con Arduino en ${PORT}`);
        isConnected = true;
        io.emit('arduino_status', { connected: true });
      });
      
      parser.on('data', (data) => {
        try {
          // Parseo de datos del MPU desde Arduino (formato JSON)
          const sensorData = JSON.parse(data);
          // Emitir datos a todos los clientes conectados
          io.emit('mpu_data', sensorData);
        } catch (err) {
          console.error("Error al parsear datos del Arduino:", err, data);
        }
      });
      
      serialPort.on('error', (err) => {
        console.error('Error en puerto serial:', err.message);
        isConnected = false;
        io.emit('arduino_status', { connected: false, error: err.message });
        
        // Reintentar conexión después de 5 segundos
        setTimeout(connectToArduino, 5000);
      });
      
      serialPort.on('close', () => {
        console.log('Conexión serial cerrada');
        isConnected = false;
        io.emit('arduino_status', { connected: false });
        
        // Reintentar conexión después de 5 segundos
        setTimeout(connectToArduino, 5000);
      });
      
    } catch (err) {
      console.error('Error al intentar conectar con Arduino:', err);
      io.emit('arduino_status', { connected: false, error: err.message });
      
      // Reintentar conexión después de 5 segundos
      setTimeout(connectToArduino, 5000);
    }
  });
}

/**
 * Configuración de Socket.io
 */
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Informar al cliente sobre el estado actual del Arduino
  socket.emit('arduino_status', { connected: isConnected });
  
  // Si el cliente solicita explícitamente intentar conectar
  socket.on('connect_arduino', () => {
    if (!isConnected) {
      connectToArduino();
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Intenta conectar al Arduino automáticamente al iniciar
connectToArduino();

// Ya no exportamos solo la app, sino también el servidor HTTP
module.exports = { app, server };