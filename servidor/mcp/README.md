# Sistema MCP V2 con DeepSeek API

Sistema mejorado de **Model Context Protocol (MCP)** para análisis avanzado de datos de telemetría de sensores usando **DeepSeek API**.

## 🚀 Características Principales

### ✅ Mejoras sobre la versión anterior (Ollama)

1. **Function Calling Nativo**: DeepSeek soporta function calling tipo OpenAI
2. **Mejor Razonamiento**: DeepSeek es superior en análisis de datos complejos
3. **Herramientas Analíticas**: 8+ herramientas especializadas para telemetría
4. **Sistema de Caché**: Reduce consultas repetitivas a la BD
5. **Índices Optimizados**: Consultas temporales 10-50x más rápidas
6. **API Profesional**: Confiable, escalable y bien documentada

## 📊 Herramientas Disponibles

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

## ⚙️ Configuración

### 1. Instalar Dependencias

```bash
npm install axios
```

### 2. Configurar API Key de DeepSeek

Crea un archivo `.env` en la raíz del proyecto:

```env
DEEPSEEK_API_KEY=tu_api_key_aqui
```

**Obtener API Key**: https://platform.deepseek.com/api_keys

## 🎯 Uso

### Ejemplo 1: Chat con DeepSeek

```javascript
POST /api/mcp/v2/chat
{
  "message": "¿Cuáles fueron las lecturas del sensor de temperatura durante el último evento?",
  "sessionId": "usuario-123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "response": "Basándome en el análisis del sensor de temperatura...",
  "tools_used": ["get_lecturas", "analyze_temporal"],
  "model_info": { ... }
}
```

### Ejemplo 2: Análisis Rápido de Sensor

```javascript
POST /api/mcp/v2/analyze/sensor
{
  "id_sensor": 1,
  "id_evento": 5
}
```

**Respuesta:**
```json
{
  "success": true,
  "raw_data": {
    "temporal": { ... },
    "anomalies": { ... }
  },
  "analysis": "El sensor muestra un comportamiento normal con 3 anomalías detectadas..."
}
```

### Ejemplo 3: Análisis de Evento Completo

```javascript
POST /api/mcp/v2/analyze/event
{
  "id_evento": 5
}
```

## 📈 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/mcp/chat` | Chat con DeepSeek |
| POST | `/api/mcp/analyze/sensor` | Análisis rápido de sensor |
| POST | `/api/mcp/analyze/event` | Análisis completo de evento |
| GET | `/api/mcp/tools` | Lista de herramientas |
| GET | `/api/mcp/status` | Estado del sistema |
| GET | `/api/mcp/stats` | Estadísticas completas |
| DELETE | `/api/mcp/session/:id` | Limpiar sesión |
| DELETE | `/api/mcp/sessions` | Limpiar todas las sesiones |
| DELETE | `/api/mcp/cache` | Limpiar caché |

## 🔧 Arquitectura

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

## 🔍 Verificar Estado

```javascript
GET /api/mcp/status

Response:
{
    "success": true,
    "deepseek": {
        "success": true,
        "available": true,
        "model": "deepseek-chat",
        "status": "operational"
    },
    "cache": {
        "size": 0,
        "max_size": 100,
        "ttl_minutes": 5,
        "hits": 0,
        "misses": 0,
        "hit_rate": "0%"
    },
    "tools_available": 8
}
```

## 🐛 Troubleshooting

### Error: "API Key no configurada"
- Verifica que `DEEPSEEK_API_KEY` esté en `.env`
- Reinicia el servidor después de agregar la key

### Error: "Herramienta no encontrada"
- Verifica que estés usando `/api/mcp/`
- Consulta la lista de herramientas con `GET /api/mcp/tools`

### Consultas lentas
- Ejecuta `optimizarIndices()` para crear índices
- Verifica estadísticas con `GET /api/mcp/stats`

## 📝 Notas

- **Solo lectura**: Todas las herramientas son de solo lectura (seguridad)
- **Caché**: 5 minutos TTL por defecto, máximo 100 entradas
- **Historial**: Máximo 20 mensajes por sesión
- **Índices**: Mejoran rendimiento de 10-50x en consultas temporales

## 🔗 Links Útiles

- [DeepSeek Platform](https://platform.deepseek.com/)
- [DeepSeek Docs](https://platform.deepseek.com/api-docs/)
- [Pricing](https://platform.deepseek.com/pricing)

## 📧 Soporte

Para preguntas o problemas, contacta al equipo de Katari Society.
