# 🚀 Katari Society - Sistema de Telemetría

> **Proyecto web de Katari Society, realizado para la competencia LASC**

Katari Society es un sistema completo de telemetría en tiempo real para cohetes y satélites, desarrollado con tecnologías modernas para el monitoreo y análisis de datos de vuelo.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [API Reference](#-api-reference)
- [Base de Datos](#-base-de-datos)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

## ✨ Características

### 🎯 Funcionalidades Principales
- **Telemetría en Tiempo Real**: Monitoreo en vivo de datos de sensores
- **Dashboard Interactivo**: Visualización avanzada con gráficos 3D y mapas
- **Histórico de Datos**: Análisis de vuelos anteriores y tendencias
- **Gestión de Dispositivos**: Administración de cohetes y satélites
- **IA Integrada**: Chatbot con MCP (Model Context Protocol) para consultas inteligentes
- **Conectividad Arduino**: Comunicación serial para sensores físicos

### 📊 Tipos de Sensores Soportados
- **Altímetro**: Medición de altitud
- **Acelerómetro**: Detección de movimiento y fuerzas
- **GPS**: Posicionamiento geográfico
- **IMU (Unidad de Medición Inercial)**: Orientación y rotación
- **Sensores Ambientales**: Temperatura, presión atmosférica
- **Cámaras**: Captura de imágenes durante vuelos

## 🏗️ Arquitectura del Sistema

El proyecto está dividido en dos componentes principales:

### 🔧 Backend (katari1.0/)
- **Servidor Express.js**: API REST y WebSocket
- **Base de Datos SQLite**: Almacenamiento de datos de telemetría
- **Servicio Arduino**: Comunicación serial con sensores
- **MCP Server**: Integración con IA para consultas inteligentes
- **Procesamiento de Datos**: Análisis y transformación de datos

### 🎨 Frontend (katarisoft/)
- **React + Vite**: Aplicación web moderna
- **Three.js**: Visualizaciones 3D del cohete
- **Socket.io Client**: Comunicación en tiempo real
- **Chart.js/Recharts**: Gráficos de telemetría
- **Leaflet**: Mapas interactivos
- **Tailwind CSS**: Diseño responsivo

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Socket.io** - Comunicación en tiempo real
- **SQLite3** - Base de datos ligera
- **SerialPort** - Comunicación con Arduino
- **Axios** - Cliente HTTP

### Frontend
- **React 18** - Biblioteca de UI
- **Vite** - Herramienta de build
- **Three.js** - Gráficos 3D
- **React Three Fiber** - Integración React-Three.js
- **Socket.io Client** - Cliente WebSocket
- **Recharts** - Gráficos y visualizaciones
- **Leaflet** - Mapas interactivos
- **Tailwind CSS** - Framework CSS
- **Framer Motion** - Animaciones

### Herramientas de Desarrollo
- **Nodemon** - Desarrollo automático
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
Crear archivo `.env` en la raíz del backend:
```env
PORT=3001
NODE_ENV=development
ARDUINO_BAUD_RATE=115200
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
- `tblImagen` - Imágenes capturadas
- `tblEventoSensor` - Relaciones evento-sensor

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
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

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

### MCP (Model Context Protocol)

El sistema incluye un servidor MCP que permite consultas inteligentes a la base de datos:

#### Herramientas Disponibles
- `query_database` - Ejecutar consultas SQL SELECT
- `get_lecturas` - Obtener lecturas de sensores
- `get_sensores` - Obtener información de sensores
- `get_eventos` - Obtener información de eventos
- `get_dispositivos` - Obtener información de dispositivos
- `get_estadisticas_sensor` - Estadísticas de sensores
- `get_imagenes` - Obtener imágenes capturadas
- `get_schema` - Obtener esquema de la base de datos

## 🗄️ Base de Datos

### Esquema de Datos

```sql
-- Dispositivos (cohetes/satélites)
CREATE TABLE tblDispositivo (
    id_dispositivo INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_dispositivo TEXT NOT NULL,
    tipo_dispositivo TEXT NOT NULL CHECK (tipo_dispositivo IN ('cohete', 'satelite'))
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

-- Lecturas de sensores
CREATE TABLE tblLectura (
    id_lectura INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sensor INTEGER NOT NULL,
    id_evento INTEGER NOT NULL,
    valor_lectura REAL NOT NULL,
    fecha_lectura INTEGER NOT NULL,
    FOREIGN KEY (id_sensor) REFERENCES tblSensor(id_sensor),
    FOREIGN KEY (id_evento) REFERENCES tblEvento(id_evento)
);
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

- **Juan Yepez** - *Desarrollo Backend* - [@juanes](https://github.com/juanes)
- **Jarby Salazar** - *Desarrollo Frontend* - [@jarbydaniel](https://github.com/jarbydaniel)

## 🙏 Agradecimientos

- Equipo de Katari Society
- Comunidad de desarrollo de código abierto
- Patrocinadores de la competencia LASC

---

**Katari Society** - *Impulsando la exploración espacial desde Colombia* 🚀🇨🇴
