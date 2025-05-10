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
// Lista de puertos posibles para mayor compatibilidad
const POSSIBLE_PORTS = [
  '/dev/ttyACM0',
  '/dev/ttyACM1',
  '/dev/ttyUSB0',
  '/dev/ttyUSB1'
];
const BAUD_RATE = 9600;

// Variables para manejar la conexión serial y datos
let serialPort;
let isConnected = false;

// Iniciar conexión serial
function connectToArduino() {
  // Listar puertos disponibles
  SerialPort.list().then(ports => {
    console.log("Puertos seriales disponibles:", ports.map(p => p.path));
    
    // Buscar entre los puertos posibles
    let foundPort = false;
    
    for (const port of POSSIBLE_PORTS) {
      if (ports.some(p => p.path === port)) {
        try {
          console.log(`Intentando conectar a ${port}...`);
          
          if (serialPort && serialPort.isOpen) {
            serialPort.close();
          }
          
          serialPort = new SerialPort({ path: port, baudRate: BAUD_RATE });
          const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
          
          serialPort.on('open', () => {
            console.log(`Conexión establecida con Arduino en ${port}`);
            isConnected = true;
            io.emit('arduino_status', { connected: true });
            foundPort = true;
          });
          
            // En la sección donde procesas datos del Arduino:

            parser.on('data', (data) => {
                try {
                    console.log("Datos recibidos:", data);
                    
                    // Intentar parsear los datos como JSON
                    const rawData = JSON.parse(data);
                    
                    // Formatear los datos para que coincidan exactamente con la estructura esperada por el frontend
                    const formattedData = {
                        sensor_id: rawData.sensor_id || "MPU_9250_K1", 
                        timestamp: new Date().toISOString(),
                        readings: {
                            accelerometer: {
                                x: { value: parseFloat(rawData.accelerometer.x), unit: "g" },
                                y: { value: parseFloat(rawData.accelerometer.y), unit: "g" },
                                z: { value: parseFloat(rawData.accelerometer.z), unit: "g" }
                            },
                            gyroscope: {
                                x: { value: parseFloat(rawData.gyroscope.x), unit: "dps" },
                                y: { value: parseFloat(rawData.gyroscope.y), unit: "dps" },
                                z: { value: parseFloat(rawData.gyroscope.z), unit: "dps" }
                            }
                        }
                    };
                    
                    console.log("Enviando datos formateados:", formattedData);
                    
                    // Emitir datos formateados a todos los clientes conectados
                    io.emit('mpu_data', formattedData);
                    
                    // Si recibimos datos, definitivamente estamos conectados
                    if (!isConnected) {
                        isConnected = true;
                        io.emit('arduino_status', { connected: true });
                    }
                } catch (err) {
                    console.error("Error al parsear datos del Arduino:", err);
                    console.log("Datos recibidos (no JSON):", data);
                }
            });
          
          serialPort.on('error', (err) => {
            console.error(`Error en puerto ${port}:`, err.message);
            isConnected = false;
            io.emit('arduino_status', { connected: false, error: err.message });        
          });
          
          serialPort.on('close', () => {
            console.log(`Conexión con puerto ${port} cerrada`);
            isConnected = false;
            io.emit('arduino_status', { connected: false });
            
            // Reintentar conexión después de 5 segundos
            setTimeout(connectToArduino, 5000);
          });
          
          break; // Salir del bucle si encontramos un puerto
        } catch (err) {
          console.error(`Error al intentar conectar con Arduino en ${port}:`, err);
          continue; // Intentar con el siguiente puerto
        }
      }
    }
    
    if (!foundPort) {
      console.log("No se encontró ningún Arduino conectado");
      io.emit('arduino_status', { connected: false, error: "No se encontró Arduino" });
      
      // Reintentar después de 10 segundos
      setTimeout(connectToArduino, 10000);
    }
  }).catch(err => {
    console.error("Error al listar puertos seriales:", err);
    setTimeout(connectToArduino, 10000);
  });
}

/**
 * Configuración de Socket.io
 */
io.on('connection', (socket) => {
  console.log('Interfaz conectada:', socket.id);
  
  // Informar al cliente sobre el estado actual del Arduino
  socket.emit('arduino_status', { connected: isConnected });
  
  // Si el cliente solicita explícitamente intentar conectar
  socket.on('connect_arduino', () => {
    console.log("Cliente solicitó conexión con Arduino");
    if (!isConnected) {
      connectToArduino();
    } else {
      socket.emit('arduino_status', { connected: true });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Interfaz desconectada:', socket.id);
  });
});

// Intenta conectar al Arduino automáticamente al iniciar
connectToArduino();

// Ya no exportamos solo la app, sino también el servidor HTTP
module.exports = { app, server };