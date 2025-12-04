# 🚀 Katari Society - Sistema de Telemetría IoT

> **Proyecto desarrollado por y para la ciencia**

Katari Society es un sistema completo de telemetría en tiempo real para cohetes y CanSats, desarrollado con tecnologías modernas para el monitoreo y análisis de datos de vuelo. Incluye integración con IA mediante DeepSeek para análisis inteligente de telemetría.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [API Reference](#-api-reference)
- [Sistema MCP con IA](#-sistema-mcp-con-ia)
- [Base de Datos](#-base-de-datos)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

## ✨ Características

### 🎯 Funcionalidades Principales
- **Telemetría en Tiempo Real**: Monitoreo en vivo de datos de sensores via WebSocket
- **Dashboard Interactivo**: Visualización avanzada con gráficos 3D y mapas
- **Histórico de Datos**: Análisis de vuelos anteriores y tendencias
- **Gestión de Dispositivos**: Administración de cohetes y CanSats
- **IA Integrada con DeepSeek**: Chatbot con MCP (Model Context Protocol) para análisis inteligente de telemetría
- **Conectividad Serial**: Comunicación con Arduino/ESP32 para sensores físicos
- **Detección de Anomalías**: Análisis automático con z-score
- **Correlación de Sensores**: Análisis cruzado entre múltiples sensores

### 📊 Sensores Integrados

#### 🚀 Cohete
| Sensor | Mediciones | Unidades |
|--------|------------|----------|
| BMP280 | Presión, temperatura, altitud | hPa, °C, m |
| MPU9250 | Acelerómetro, giroscopio (IMU) | g, °/s |
| NEO-6M | GPS (lat, lon, alt, satélites) | degrees, m |

#### 🛰️ CanSat
| Sensor | Mediciones | Unidades |
|--------|------------|----------|
| GY-91 | Acelerómetro, giroscopio, barómetro | g, °/s, Pa |
| SCD40 | CO2, temperatura, humedad | ppm, °C, % |
| NEO-6M | GPS (lat, lon, alt, satélites, HDOP) | degrees, m |
| MiCS-4514 | Gases (RED, NOx) | raw |

## 🏗️ Arquitectura del Sistema

El proyecto está dividido en dos componentes principales:

### 🔧 Backend (katari1.0/servidor/)
```
servidor/
├── app.js                 # Configuración de Express
├── server.js              # Punto de entrada
├── routes.js              # Rutas principales
├── config/                # Configuración del sistema
├── controllers/           # Controladores de API
├── services/              # Servicios de negocio
│   ├── CansatService.js       # Comunicación serial CanSat
│   ├── CansatDataProcessing.js # Procesamiento de datos CanSat
│   ├── RocketService.js       # Comunicación serial Cohete
│   ├── RocketDataProcessing.js # Procesamiento de datos Cohete
│   ├── arduinoService.js      # Servicio Arduino genérico
│   └── dataProcessingService.js # Procesamiento general
├── mcp/                   # Sistema MCP con IA
│   ├── mcpOrchestratorV2.js   # Orquestador con DeepSeek
│   ├── mcpServerV2.js         # Servidor MCP
│   ├── deepseekClient.js      # Cliente DeepSeek API
│   ├── analyticsTools.js      # Herramientas analíticas
│   └── queryCache.js          # Sistema de caché
└── src/                   # Módulos adicionales
```

**Componentes principales:**
- **Express.js + Socket.IO**: API REST y comunicación en tiempo real
- **better-sqlite3**: Base de datos SQLite de alto rendimiento
- **SerialPort**: Comunicación serial con Arduino/ESP32
- **MCP Server V2**: Integración con DeepSeek para análisis inteligente
- **Pino**: Logging estructurado

## 🛠️ Tecnologías Utilizadas

### Backend
| Dependencia | Versión | Descripción |
|-------------|---------|-------------|
| Node.js | 16+ | Runtime de JavaScript |
| Express.js | 4.19.2 | Framework web |
| Socket.io | 4.8.1 | Comunicación en tiempo real |
| better-sqlite3 | 11.10.0 | Base de datos SQLite de alto rendimiento |
| serialport | 13.0.0 | Comunicación serial con Arduino |
| axios | 1.9.0 | Cliente HTTP (DeepSeek API) |
| pino | 10.1.0 | Logging estructurado |
| dotenv | 16.4.5 | Variables de entorno |

### Herramientas de Desarrollo
- **Nodemon** - Desarrollo automático con hot-reload
- **ESLint** - Linting de código
- **PostCSS** - Procesamiento CSS

## 📦 Instalación

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn
- Arduino IDE (para programar sensores)
- Git

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd katari1.0
```

### 2. Instalar Dependencias del Backend
```bash
npm install
```

### 3. Instalar Dependencias del Frontend
```bash
cd ../katarisoft
npm install
```

### 4. Configurar Variables de Entorno
Crear archivo `.env` en la raíz del backend (ver `.env.example`):
```env
# Configuración de DeepSeek API (requerido para IA)
# Obtén tu API key en: https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=tu_api_key_aqui

# Puerto del servidor
PORT=3000

# Ruta de la base de datos
DB_PATH=./modelo/database/katari.db

# Entorno
NODE_ENV=development
```

## ⚙️ Configuración

### Configuración del Arduino
1. Conecta tu Arduino al puerto USB
2. Carga el código de sensores en el Arduino
3. Verifica que el puerto serial esté configurado correctamente

### Configuración de la Base de Datos
La base de datos SQLite se inicializa automáticamente con las siguientes tablas:
- `tblDispositivo` - Información de cohetes y satélites
- `tblSensor` - Sensores instalados
- `tblEvento` - Eventos de vuelo
- `tblLectura` - Datos de telemetría

### Configuración de Puertos Seriales
El sistema busca automáticamente en los siguientes puertos:
- Windows: `COM3`, `COM4`, `COM5`, `COM6`
- Linux: `/dev/ttyUSB0`, `/dev/ttyACM0`, `/dev/ttyACM1`
- macOS: `/dev/cu.usbmodem*`, `/dev/cu.usbserial*`

## 🚀 Uso

### Iniciar el Backend
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

### Iniciar el Frontend
```bash
cd ../katarisoft

# Desarrollo
npm run dev

# Build para producción
npm run build
```

### Acceder a la Aplicación
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000

## 📡 API Reference

### Endpoints Principales

#### Dispositivos
- `GET /api/dispositivos` - Listar dispositivos
- `POST /api/dispositivos` - Crear dispositivo
- `GET /api/dispositivos/:id` - Obtener dispositivo

#### Sensores
- `GET /api/sensores` - Listar sensores
- `GET /api/sensores/:id` - Obtener sensor
- `GET /api/sensores/dispositivo/:id` - Sensores por dispositivo

#### Eventos
- `GET /api/eventos` - Listar eventos
- `POST /api/eventos` - Crear evento
- `GET /api/eventos/:id` - Obtener evento

#### Lecturas
- `GET /api/lecturas` - Obtener lecturas
- `GET /api/lecturas/sensor/:id` - Lecturas por sensor
- `GET /api/lecturas/evento/:id` - Lecturas por evento

### WebSocket Events

#### Cliente → Servidor
- `connect` - Conectar al servidor
- `disconnect` - Desconectar del servidor

#### Servidor → Cliente
- `telemetry_data` - Datos de telemetría en tiempo real
- `sensor_status` - Estado de los sensores
- `device_status` - Estado del dispositivo
- `gps_update` - Actualización de posición GPS

## 🤖 Sistema MCP con IA

El sistema incluye un servidor MCP V2 integrado con **DeepSeek API** para análisis inteligente de telemetría.

### Endpoints MCP

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/mcp/chat` | Chat con DeepSeek |
| POST | `/api/mcp/analyze/sensor` | Análisis rápido de sensor |
| POST | `/api/mcp/analyze/event` | Análisis completo de evento |
| GET | `/api/mcp/tools` | Lista de herramientas |
| GET | `/api/mcp/status` | Estado del sistema |
| GET | `/api/mcp/stats` | Estadísticas completas |
| DELETE | `/api/mcp/session/:id` | Limpiar sesión |
| DELETE | `/api/mcp/cache` | Limpiar caché |

### Herramientas Básicas (Lectura)
- `get_lecturas` - Obtener lecturas de sensores
- `get_sensores` - Información de sensores
- `get_eventos` - Información de eventos
- `get_dispositivos` - Información de dispositivos

### Herramientas Analíticas Avanzadas
- `analyze_temporal` - Análisis temporal con estadísticas
- `detect_anomalies` - Detección de anomalías con z-score
- `correlate_sensors` - Correlación entre sensores
- `analyze_event` - Análisis completo de eventos
- `get_time_window` - Ventana de tiempo para datos en tiempo real
- `compare_sensors` - Comparación de múltiples sensores

### Ejemplo de Uso
```javascript
// Chat con IA
POST /api/mcp/chat
{
  "message": "¿Cuáles fueron las lecturas del sensor de temperatura durante el último evento?",
  "sessionId": "usuario-123"
}

// Respuesta
{
  "success": true,
  "response": "Basándome en el análisis del sensor de temperatura...",
  "tools_used": ["get_lecturas", "analyze_temporal"]
}
```

### Arquitectura MCP
```
┌─────────────────┐
│   Frontend      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express Routes │ ◄─── mcpRoutesV2.js
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  MCP Orchestrator V2    │ ◄─── Function Calling Nativo
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────┐
│DeepSeek│  │MCP Server│
│ Client │  │    V2    │
└────────┘  └────┬─────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
    ┌──────┐ ┌──────┐ ┌──────┐
    │Cache │ │Tools │ │  DB  │
    └──────┘ └──────┘ └──────┘
```

## 🗄️ Base de Datos

### Esquema de Datos

```sql
-- Dispositivos (cohetes/CanSats)
CREATE TABLE tblDispositivo (
    id_dispositivo INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_dispositivo TEXT NOT NULL,
    tipo_dispositivo TEXT NOT NULL CHECK (tipo_dispositivo IN ('cohete', 'cansat'))
);

-- Sensores
CREATE TABLE tblSensor (
    id_sensor INTEGER PRIMARY KEY AUTOINCREMENT,
    id_dispositivo INTEGER NOT NULL,
    nombre_sensor TEXT NOT NULL,
    tipo_sensor TEXT NOT NULL,
    estado_sensor TEXT NOT NULL,
    FOREIGN KEY (id_dispositivo) REFERENCES tblDispositivo(id_dispositivo)
);

-- Eventos de vuelo
CREATE TABLE tblEvento (
    id_evento INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('despegue', 'prueba')),
    nombre_evento TEXT NOT NULL,
    fecha_inicio_evento INTEGER NOT NULL,
    estado_evento TEXT NOT NULL CHECK (estado_evento IN ('completado', 'fallido'))
);

-- Lecturas de sensores (valores almacenados como JSON)
CREATE TABLE tblLectura (
    id_lectura INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sensor INTEGER NOT NULL,
    id_evento INTEGER NOT NULL,
    valor_lectura TEXT NOT NULL,  -- JSON con datos del sensor
    fecha_lectura INTEGER NOT NULL,
    FOREIGN KEY (id_sensor) REFERENCES tblSensor(id_sensor),
    FOREIGN KEY (id_evento) REFERENCES tblEvento(id_evento)
);

-- Imágenes capturadas
CREATE TABLE tblImagen (
    id_imagen INTEGER PRIMARY KEY AUTOINCREMENT,
    id_evento INTEGER NOT NULL,
    ruta_imagen TEXT NOT NULL,
    latitud REAL,
    longitud REAL,
    altitud REAL,
    fecha_captura INTEGER NOT NULL,
    FOREIGN KEY (id_evento) REFERENCES tblEvento(id_evento)
);
```

### Formato de Datos de Sensores

Los valores de lectura se almacenan como JSON con la siguiente estructura:

**BMP280 (Altímetro):**
```json
{
  "temperatura": { "min": 20.5, "max": 25.3, "avg": 22.1, "unit": "C" },
  "presion": { "min": 1010, "max": 1015, "avg": 1012, "unit": "hPa" },
  "altitud": { "min": 100, "max": 500, "avg": 300, "unit": "m" }
}
```

**MPU9250 (IMU):**
```json
{
  "aceleracion_x": { "min": -1.2, "max": 2.5, "avg": 0.1, "unit": "g" },
  "aceleracion_y": { "min": -0.5, "max": 1.0, "avg": 0.0, "unit": "g" },
  "aceleracion_z": { "min": 0.8, "max": 1.2, "avg": 1.0, "unit": "g" }
}
```

**GPS (NEO-6M):**
```json
{
  "latitud": { "min": 4.5, "max": 4.6, "avg": 4.55, "unit": "degrees" },
  "longitud": { "min": -74.1, "max": -74.0, "avg": -74.05, "unit": "degrees" },
  "altitud": { "min": 2600, "max": 2650, "avg": 2625, "unit": "m" },
  "satelites": { "min": 6, "max": 12, "avg": 9, "unit": "count" }
}
```

## 🤝 Contribución

### Cómo Contribuir
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Estándares de Código
- Usar ESLint para mantener consistencia
- Seguir las convenciones de naming de JavaScript
- Documentar funciones y clases importantes
- Escribir tests para nuevas funcionalidades

### Estructura de Commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: actualización de documentación
style: cambios de formato
refactor: refactorización de código
test: agregar o modificar tests
```

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Juan Yepez** - *Desarrollo Backend & IoT* - [@JYPPZ](https://github.com/JYPPZ)
- **Jarby Salazar** - *Desarrollo Frontend* - [@jarbydaniel](https://github.com/jarbydaniel)

## 🔗 Links Útiles

- [DeepSeek Platform](https://platform.deepseek.com/) - API de IA
- [LASC Competition](https://www.lasc.space/) - Latin American Space Challenge
- [Socket.IO Docs](https://socket.io/docs/) - Documentación WebSocket

---

**Katari Society** - *Impulsando la exploración espacial desde Colombia 🚀*
