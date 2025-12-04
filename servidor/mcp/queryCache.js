/**
 * Sistema de caché en memoria para consultas frecuentes
 * Optimiza el rendimiento evitando consultas repetitivas a la BD
 */
class QueryCache {
    constructor(maxSize = 100, ttlMinutes = 5) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMinutes * 60 * 1000; // Convertir a milisegundos
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Genera una clave única para la consulta
     */
    _generateKey(toolName, params) {
        return `${toolName}:${JSON.stringify(params)}`;
    }

    /**
     * Obtiene un valor del caché
     */
    get(toolName, params) {
        const key = this._generateKey(toolName, params);
        const cached = this.cache.get(key);

        if (!cached) {
            this.misses++;
            return null;
        }

        // Verificar si expiró
        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        return cached.data;
    }

    /**
     * Guarda un valor en el caché
     */
    set(toolName, params, data) {
        // Si el caché está lleno, eliminar las entradas más antiguas
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        const key = this._generateKey(toolName, params);
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Invalida el caché para un tipo de consulta específico
     */
    invalidate(toolName) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${toolName}:`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Limpia todo el caché
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Obtiene estadísticas del caché
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            max_size: this.maxSize,
            ttl_minutes: this.ttl / 60000,
            hits: this.hits,
            misses: this.misses,
            hit_rate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Wrapper para ejecutar funciones con caché
     */
    async withCache(toolName, params, asyncFunction) {
        // Intentar obtener del caché
        const cached = this.get(toolName, params);
        if (cached !== null) {
            return { ...cached, from_cache: true };
        }

        // Ejecutar la función y guardar en caché
        const result = await asyncFunction();
        if (result.success) {
            this.set(toolName, params, result);
        }

        return { ...result, from_cache: false };
    }
}

module.exports = QueryCache;
