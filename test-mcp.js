/**
 * Script de prueba para verificar el MCP Server y Ollama Client
 * Ejecuta: node test-mcp.js
 */

const mcpOrchestrator = require('./servidor/mcp/mcpOrchestrator');

async function testMCP() {
    console.log('🚀 Iniciando pruebas del sistema MCP...\n');

    // Test 1: Verificar estado de Ollama
    console.log('📡 Test 1: Verificando conexión con Ollama...');
    const status = await mcpOrchestrator.checkOllamaStatus();
    console.log('Estado de Ollama:', status);
    
    if (!status.available) {
        console.log('\n⚠️  ADVERTENCIA: Ollama no está disponible.');
        console.log('Por favor, ejecuta "ollama serve" en otra terminal.\n');
        return;
    }
    
    console.log('✅ Ollama está disponible!\n');

    // Test 2: Listar herramientas disponibles
    console.log('🔧 Test 2: Herramientas disponibles...');
    const tools = mcpOrchestrator.getAvailableTools();
    console.log(`Se encontraron ${tools.length} herramientas:`);
    tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 3: Consulta simple
    console.log('💬 Test 3: Enviando consulta de prueba...');
    const testMessage = '¿Cuántos sensores tenemos en la base de datos?';
    console.log(`Pregunta: "${testMessage}"`);
    
    const response = await mcpOrchestrator.processMessage(testMessage, 'test-session');
    
    if (response.success) {
        console.log('\n✅ Respuesta recibida:');
        console.log('─'.repeat(50));
        console.log(response.response);
        console.log('─'.repeat(50));
        if (response.toolUsed) {
            console.log(`\n🔧 Herramienta utilizada: ${response.toolUsed}`);
        }
    } else {
        console.log('\n❌ Error:', response.error);
    }

    console.log('\n✨ Pruebas completadas!\n');
}

// Ejecutar pruebas
testMCP().catch(error => {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
});
