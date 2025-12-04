const { optimizarIndices, verificarIndices, obtenerEstadisticas } = require('../../modelo/database/optimizarIndices');
const mcpOrchestratorV2 = require('./mcpOrchestratorV2');
require('../logger');

/**
 * Script de inicialización para el sistema MCP
 * Ejecuta optimizaciones y verifica la configuración
 */
async function inicializarMCP() {
    console.log('\nInicializando Sistema MCP con DeepSeek\n');
    console.log('═'.repeat(80));

    // 1. Optimizar índices de base de datos
    console.log('\nPASO 1: Optimizando base de datos...');
    try {
        optimizarIndices();
        console.log('Índices optimizados correctamente\n');
    } catch (error) {
        console.error('Error al optimizar índices:', error.message);
        return false;
    }

    // 2. Verificar índices creados
    console.log('PASO 2: Verificando índices...');
    try {
        const indices = verificarIndices();
        if (indices.length > 0) {
            console.log('Índices verificados correctamente\n');
        }
    } catch (error) {
        console.error('Error al verificar índices:', error.message);
    }

    // 3. Obtener estadísticas de BD
    console.log('PASO 3: Obteniendo estadísticas...');
    try {
        obtenerEstadisticas();
        console.log('Estadísticas obtenidas\n');
    } catch (error) {
        console.error('Error al obtener estadísticas:', error.message);
    }

    // 4. Verificar estado de DeepSeek
    console.log('PASO 4: Verificando conexión con DeepSeek...');
    try {
        const status = await mcpOrchestratorV2.checkStatus();
        
        if (status.deepseek.available) {
            console.log('DeepSeek API: Conectado');
            console.log(`Modelo: ${status.deepseek.model}`);
            console.log(`Estado: ${status.deepseek.status}`);
        } else {
            console.log('DeepSeek API: No disponible');
            console.log(`Error: ${status.deepseek.error}`);
            console.log('\nSolución:');
            console.log('   1. Obtén tu API key en: https://platform.deepseek.com/api_keys');
            console.log('   2. Agrega DEEPSEEK_API_KEY=tu_key en el archivo .env');
            console.log('   3. Reinicia el servidor\n');
        }
    } catch (error) {
        console.error('Error al verificar DeepSeek:', error.message);
    }

    // 5. Listar herramientas disponibles
    console.log('\nPASO 5: Herramientas disponibles:');
    try {
        const tools = mcpOrchestratorV2.getAvailableTools();
        console.log(`\n   Total: ${tools.length} herramientas\n`);
        
        tools.forEach((tool, idx) => {
            console.log(`   ${idx + 1}. ${tool.name}`);
            console.log(`      ${tool.description}`);
        });
        console.log('');
    } catch (error) {
        console.error('Error al listar herramientas:', error.message);
    }

    // 6. Resumen final
    console.log('\n' + '═'.repeat(80));
    console.log('Inicialización completada\n');
    console.log('Próximos pasos:');
    console.log('  1. Asegúrate de que DEEPSEEK_API_KEY esté configurada');
    console.log('  2. Integra las rutas: app.use(\'/api/mcp/v2\', mcpRoutesV2)');
    console.log('  3. Prueba el endpoint: POST /api/mcp/v2/status');
    console.log('  4. Lee la documentación en: servidor/mcp/README.md\n');
    console.log('═'.repeat(80) + '\n');

    return true;
}

/**
 * Test rápido del sistema
 */
async function testearSistema() {
    console.log('\nEjecutando tests del sistema...\n');

    try {
        // Test 1: Verificar estado
        console.log('Test 1: Verificar estado del sistema');
        const status = await mcpOrchestratorV2.checkStatus();
        console.log(status.deepseek.available ? 'PASS' : 'FAIL');

        // Test 2: Obtener estadísticas
        console.log('\nTest 2: Obtener estadísticas');
        const stats = await mcpOrchestratorV2.getSystemStats();
        console.log(stats.deepseek ? 'PASS' : 'FAIL');

        // Test 3: Listar herramientas
        console.log('\nTest 3: Listar herramientas');
        const tools = mcpOrchestratorV2.getAvailableTools();
        console.log(tools.length > 0 ? 'PASS' : 'FAIL');

        console.log('\nTests completados\n');
    } catch (error) {
        console.error('\nError en tests:', error.message, '\n');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    inicializarMCP()
        .then(() => testearSistema())
        .catch(error => {
            console.error('Error fatal:', error);
            process.exit(1);
        });
}

module.exports = {
    inicializarMCP,
    testearSistema
};
