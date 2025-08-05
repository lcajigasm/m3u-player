/**
 * EPG Cache - Sistema de caché para datos EPG
 * Gestiona almacenamiento local multinivel para optimizar el rendimiento
 */

/**
 * @typedef {Object} CacheEntry
 * @property {EPGProgram[]} programs - Lista de programas
 * @property {Date} lastUpdated - Última actualización
 * @property {Date} expiresAt - Fecha de expiración
 * @property {number} size - Tamaño en bytes (aproximado)
 */

class EPGCache {
    constructor() {
        this.memoryCache = new Map(); // Nivel 1: Memoria
        this.localStoragePrefix = 'epg_cache_';
        this.indexedDBName = 'EPGDatabase';
        this.indexedDBVersion = 1;
        this.db = null;
        
        // Configuración de caché
        this.config = {
            memoryMaxSize: 50 * 1024 * 1024, // 50MB en memoria
            localStorageMaxSize: 10 * 1024 * 1024, // 10MB en localStorage
            defaultTTL: 2 * 60 * 60 * 1000, // 2 horas por defecto
            maxRetentionDays: 7
        };
        
        // Métricas de rendimiento
        this.metrics = {
            hits: { memory: 0, localStorage: 0, indexedDB: 0 },
            misses: 0,
            stores: { memory: 0, localStorage: 0, indexedDB: 0 },
            evictions: { memory: 0, localStorage: 0, indexedDB: 0 },
            totalRequests: 0,
            averageResponseTime: 0,
            responseTimes: []
        };
        
        // Patrones de uso para optimización
        this.accessPatterns = new Map(); // channelId -> { count, lastAccess, frequency }
        
        this.initializeIndexedDB();
        this.scheduleCleanup();
        this.scheduleMetricsReset();
        this.scheduleOptimization();
        
        console.log('💾 EPGCache inicializado con estrategia multinivel y optimización inteligente');
    }

    /**
     * Almacena programas EPG para un canal
     * @param {string} channelId - ID del canal
     * @param {EPGProgram[]} programs - Lista de programas
     * @returns {Promise<void>}
     */
    async store(channelId, programs) {
        if (!channelId || !Array.isArray(programs)) {
            throw new Error('Parámetros inválidos para almacenar en caché');
        }

        const now = new Date();
        const entry = {
            programs: programs,
            lastUpdated: now,
            expiresAt: new Date(now.getTime() + this.config.defaultTTL),
            size: this.estimateSize(programs)
        };

        try {
            // Nivel 1: Almacenar en memoria
            await this.storeInMemory(channelId, entry);
            
            // Nivel 2: Almacenar en localStorage para datos del día actual
            if (this.isCurrentDay(programs)) {
                await this.storeInLocalStorage(channelId, entry);
            }
            
            // Nivel 3: Almacenar en IndexedDB para persistencia a largo plazo
            await this.storeInIndexedDB(channelId, entry);
            
            console.log(`💾 Datos EPG almacenados para canal: ${channelId} (${programs.length} programas)`);
            
        } catch (error) {
            console.error('❌ Error almacenando en caché:', error);
            throw error;
        }
    }

    /**
     * Recupera programas EPG para un canal
     * @param {string} channelId - ID del canal
     * @param {Object} timeRange - Rango de tiempo {start, end}
     * @returns {Promise<EPGProgram[]|null>}
     */
    async retrieve(channelId, timeRange) {
        if (!channelId) {
            return null;
        }

        const startTime = performance.now();
        this.metrics.totalRequests++;
        
        // Actualizar patrones de acceso
        this.updateAccessPattern(channelId);

        try {
            // Intentar desde memoria primero (más rápido)
            let entry = this.memoryCache.get(channelId);
            
            if (entry && !this.isExpired(entry.expiresAt)) {
                this.metrics.hits.memory++;
                this.recordResponseTime(startTime);
                console.log(`⚡ Datos EPG obtenidos de memoria para: ${channelId}`);
                return this.filterProgramsByTimeRange(entry.programs, timeRange);
            }
            
            // Intentar desde localStorage
            entry = await this.retrieveFromLocalStorage(channelId);
            
            if (entry && !this.isExpired(entry.expiresAt)) {
                this.metrics.hits.localStorage++;
                // Promover a memoria para próximos accesos (estrategia inteligente)
                if (this.shouldPromoteToMemory(channelId)) {
                    await this.storeInMemory(channelId, entry);
                }
                this.recordResponseTime(startTime);
                console.log(`💿 Datos EPG obtenidos de localStorage para: ${channelId}`);
                return this.filterProgramsByTimeRange(entry.programs, timeRange);
            }
            
            // Intentar desde IndexedDB
            entry = await this.retrieveFromIndexedDB(channelId);
            
            if (entry && !this.isExpired(entry.expiresAt)) {
                this.metrics.hits.indexedDB++;
                // Promover a niveles superiores basado en patrones de uso
                if (this.shouldPromoteToMemory(channelId)) {
                    await this.storeInMemory(channelId, entry);
                }
                if (this.isCurrentDay(entry.programs)) {
                    await this.storeInLocalStorage(channelId, entry);
                }
                this.recordResponseTime(startTime);
                console.log(`🗄️ Datos EPG obtenidos de IndexedDB para: ${channelId}`);
                return this.filterProgramsByTimeRange(entry.programs, timeRange);
            }
            
            this.metrics.misses++;
            this.recordResponseTime(startTime);
            console.log(`❌ No se encontraron datos EPG válidos para: ${channelId}`);
            return null;
            
        } catch (error) {
            this.metrics.misses++;
            this.recordResponseTime(startTime);
            console.error('❌ Error recuperando de caché:', error);
            return null;
        }
    }

    /**
     * Recupera datos para múltiples canales
     * @param {string[]} channelIds - Lista de IDs de canales
     * @param {Object} timeRange - Rango de tiempo
     * @returns {Promise<Map<string, CacheEntry>>}
     */
    async retrieveMultiple(channelIds, timeRange) {
        const results = new Map();
        
        const promises = channelIds.map(async (channelId) => {
            const programs = await this.retrieve(channelId, timeRange);
            if (programs) {
                results.set(channelId, {
                    programs: programs,
                    lastUpdated: new Date(), // Aproximado
                    id: channelId
                });
            }
        });
        
        await Promise.all(promises);
        return results;
    }

    /**
     * Limpia datos expirados y optimiza el caché
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🧹 Iniciando limpieza de caché EPG...');
            
            let cleanedCount = 0;
            
            // Limpiar memoria
            for (const [channelId, entry] of this.memoryCache) {
                if (this.isExpired(entry.expiresAt)) {
                    this.memoryCache.delete(channelId);
                    cleanedCount++;
                }
            }
            
            // Limpiar localStorage
            const localStorageKeys = this.getLocalStorageKeys();
            for (const key of localStorageKeys) {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const entry = JSON.parse(data);
                        if (this.isExpired(new Date(entry.expiresAt))) {
                            localStorage.removeItem(key);
                            cleanedCount++;
                        }
                    }
                } catch (error) {
                    // Remover entradas corruptas
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            }
            
            // Limpiar IndexedDB
            await this.cleanupIndexedDB();
            
            console.log(`✅ Limpieza completada: ${cleanedCount} entradas eliminadas`);
            
        } catch (error) {
            console.error('❌ Error durante limpieza:', error);
        }
    }

    /**
     * Verifica si una fecha ha expirado
     * @param {Date} expirationDate - Fecha de expiración
     * @returns {boolean}
     */
    isExpired(expirationDate) {
        if (!expirationDate) return true;
        return new Date() > new Date(expirationDate);
    }

    /**
     * Obtiene estadísticas del caché
     * @returns {Object}
     */
    getStorageStats() {
        const memorySize = this.calculateMemorySize();
        const localStorageSize = this.calculateLocalStorageSize();
        
        return {
            memory: {
                entries: this.memoryCache.size,
                sizeBytes: memorySize,
                sizeMB: Math.round(memorySize / (1024 * 1024) * 100) / 100
            },
            localStorage: {
                entries: this.getLocalStorageKeys().length,
                sizeBytes: localStorageSize,
                sizeMB: Math.round(localStorageSize / (1024 * 1024) * 100) / 100
            },
            indexedDB: {
                available: !!this.db,
                name: this.indexedDBName
            }
        };
    }

    /**
     * Obtiene métricas de rendimiento del caché
     * @returns {Object}
     */
    getPerformanceMetrics() {
        const totalHits = this.metrics.hits.memory + this.metrics.hits.localStorage + this.metrics.hits.indexedDB;
        const hitRate = this.metrics.totalRequests > 0 ? (totalHits / this.metrics.totalRequests) * 100 : 0;
        
        return {
            hitRate: Math.round(hitRate * 100) / 100,
            totalRequests: this.metrics.totalRequests,
            hits: {
                total: totalHits,
                memory: this.metrics.hits.memory,
                localStorage: this.metrics.hits.localStorage,
                indexedDB: this.metrics.hits.indexedDB
            },
            misses: this.metrics.misses,
            stores: this.metrics.stores,
            evictions: this.metrics.evictions,
            averageResponseTime: this.metrics.averageResponseTime,
            accessPatterns: {
                totalChannels: this.accessPatterns.size,
                mostAccessed: this.getMostAccessedChannels(5)
            }
        };
    }

    /**
     * Actualiza patrones de acceso para un canal
     * @param {string} channelId - ID del canal
     * @private
     */
    updateAccessPattern(channelId) {
        const now = Date.now();
        const pattern = this.accessPatterns.get(channelId) || {
            count: 0,
            lastAccess: now,
            frequency: 0,
            firstAccess: now
        };
        
        pattern.count++;
        const timeSinceFirst = now - pattern.firstAccess;
        pattern.frequency = timeSinceFirst > 0 ? pattern.count / (timeSinceFirst / (1000 * 60)) : 0; // accesos por minuto
        pattern.lastAccess = now;
        
        this.accessPatterns.set(channelId, pattern);
    }

    /**
     * Determina si un canal debe ser promovido a memoria
     * @param {string} channelId - ID del canal
     * @returns {boolean}
     * @private
     */
    shouldPromoteToMemory(channelId) {
        const pattern = this.accessPatterns.get(channelId);
        if (!pattern) return false;
        
        // Promover si:
        // 1. Ha sido accedido más de 3 veces
        // 2. Frecuencia > 0.1 accesos por minuto
        // 3. Último acceso fue hace menos de 10 minutos
        const timeSinceLastAccess = Date.now() - pattern.lastAccess;
        
        return pattern.count > 3 && 
               pattern.frequency > 0.1 && 
               timeSinceLastAccess < 10 * 60 * 1000;
    }

    /**
     * Registra tiempo de respuesta
     * @param {number} startTime - Tiempo de inicio
     * @private
     */
    recordResponseTime(startTime) {
        const responseTime = performance.now() - startTime;
        this.metrics.responseTimes.push(responseTime);
        
        // Mantener solo las últimas 100 mediciones
        if (this.metrics.responseTimes.length > 100) {
            this.metrics.responseTimes.shift();
        }
        
        // Calcular promedio
        this.metrics.averageResponseTime = 
            this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
    }

    /**
     * Obtiene los canales más accedidos
     * @param {number} limit - Número de canales a retornar
     * @returns {Array}
     * @private
     */
    getMostAccessedChannels(limit = 5) {
        return Array.from(this.accessPatterns.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([channelId, pattern]) => ({
                channelId,
                accessCount: pattern.count,
                frequency: Math.round(pattern.frequency * 100) / 100
            }));
    }

    /**
     * Programa reset de métricas
     * @private
     */
    scheduleMetricsReset() {
        // Reset métricas cada 24 horas
        setInterval(() => {
            this.resetMetrics();
        }, 24 * 60 * 60 * 1000);
        
        console.log('📊 Reset de métricas programado cada 24 horas');
    }

    /**
     * Resetea las métricas de rendimiento
     */
    resetMetrics() {
        this.metrics = {
            hits: { memory: 0, localStorage: 0, indexedDB: 0 },
            misses: 0,
            stores: { memory: 0, localStorage: 0, indexedDB: 0 },
            evictions: { memory: 0, localStorage: 0, indexedDB: 0 },
            totalRequests: 0,
            averageResponseTime: 0,
            responseTimes: []
        };
        
        // Limpiar patrones de acceso antiguos (más de 7 días)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const [channelId, pattern] of this.accessPatterns) {
            if (pattern.lastAccess < weekAgo) {
                this.accessPatterns.delete(channelId);
            }
        }
        
        console.log('📊 Métricas de rendimiento reseteadas');
    }

    /**
     * Almacena en memoria (Nivel 1)
     * @param {string} channelId - ID del canal
     * @param {CacheEntry} entry - Entrada de caché
     * @private
     */
    async storeInMemory(channelId, entry) {
        // Verificar límite de memoria
        const currentSize = this.calculateMemorySize();
        if (currentSize + entry.size > this.config.memoryMaxSize) {
            await this.evictFromMemory();
        }
        
        this.memoryCache.set(channelId, entry);
        this.metrics.stores.memory++;
    }

    /**
     * Almacena en localStorage (Nivel 2)
     * @param {string} channelId - ID del canal
     * @param {CacheEntry} entry - Entrada de caché
     * @private
     */
    async storeInLocalStorage(channelId, entry) {
        try {
            const key = this.localStoragePrefix + channelId;
            const data = JSON.stringify({
                programs: entry.programs,
                lastUpdated: entry.lastUpdated.toISOString(),
                expiresAt: entry.expiresAt.toISOString(),
                size: entry.size
            });
            
            localStorage.setItem(key, data);
            this.metrics.stores.localStorage++;
            
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage lleno, limpiando espacio...');
                await this.evictFromLocalStorage();
                // Intentar de nuevo
                try {
                    localStorage.setItem(key, data);
                    this.metrics.stores.localStorage++;
                } catch (retryError) {
                    console.error('❌ No se pudo almacenar en localStorage:', retryError);
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Almacena en IndexedDB (Nivel 3)
     * @param {string} channelId - ID del canal
     * @param {CacheEntry} entry - Entrada de caché
     * @private
     */
    async storeInIndexedDB(channelId, entry) {
        if (!this.db) {
            console.warn('⚠️ IndexedDB no disponible');
            return;
        }

        try {
            const transaction = this.db.transaction(['epgData'], 'readwrite');
            const store = transaction.objectStore('epgData');
            
            await store.put({
                channelId: channelId,
                programs: entry.programs,
                lastUpdated: entry.lastUpdated,
                expiresAt: entry.expiresAt,
                size: entry.size
            });
            
            this.metrics.stores.indexedDB++;
            
        } catch (error) {
            console.error('❌ Error almacenando en IndexedDB:', error);
        }
    }

    /**
     * Recupera de localStorage
     * @param {string} channelId - ID del canal
     * @returns {CacheEntry|null}
     * @private
     */
    async retrieveFromLocalStorage(channelId) {
        try {
            const key = this.localStoragePrefix + channelId;
            const data = localStorage.getItem(key);
            
            if (!data) return null;
            
            const parsed = JSON.parse(data);
            return {
                programs: parsed.programs,
                lastUpdated: new Date(parsed.lastUpdated),
                expiresAt: new Date(parsed.expiresAt),
                size: parsed.size
            };
            
        } catch (error) {
            console.error('❌ Error recuperando de localStorage:', error);
            return null;
        }
    }

    /**
     * Recupera de IndexedDB
     * @param {string} channelId - ID del canal
     * @returns {Promise<CacheEntry|null>}
     * @private
     */
    async retrieveFromIndexedDB(channelId) {
        if (!this.db) return null;

        try {
            const transaction = this.db.transaction(['epgData'], 'readonly');
            const store = transaction.objectStore('epgData');
            const request = store.get(channelId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        resolve({
                            programs: result.programs,
                            lastUpdated: result.lastUpdated,
                            expiresAt: result.expiresAt,
                            size: result.size
                        });
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            console.error('❌ Error recuperando de IndexedDB:', error);
            return null;
        }
    }

    /**
     * Inicializa IndexedDB
     * @private
     */
    async initializeIndexedDB() {
        try {
            const request = indexedDB.open(this.indexedDBName, this.indexedDBVersion);
            
            request.onerror = () => {
                console.error('❌ Error abriendo IndexedDB:', request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB inicializado');
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('epgData')) {
                    const store = db.createObjectStore('epgData', { keyPath: 'channelId' });
                    store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
                    store.createIndex('expiresAt', 'expiresAt', { unique: false });
                }
            };
            
        } catch (error) {
            console.error('❌ Error inicializando IndexedDB:', error);
        }
    }

    /**
     * Programa limpieza automática
     * @private
     */
    scheduleCleanup() {
        // Limpiar cada hora
        setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);
        
        console.log('⏰ Limpieza automática programada cada hora');
    }

    /**
     * Filtra programas por rango de tiempo
     * @param {EPGProgram[]} programs - Lista de programas
     * @param {Object} timeRange - Rango de tiempo
     * @returns {EPGProgram[]}
     * @private
     */
    filterProgramsByTimeRange(programs, timeRange) {
        if (!timeRange || !programs) return programs;
        
        const { start, end } = timeRange;
        
        return programs.filter(program => {
            const programStart = new Date(program.startTime);
            const programEnd = new Date(program.endTime);
            
            // Incluir programas que se solapan con el rango solicitado
            return programStart < end && programEnd > start;
        });
    }

    /**
     * Verifica si los programas son del día actual
     * @param {EPGProgram[]} programs - Lista de programas
     * @returns {boolean}
     * @private
     */
    isCurrentDay(programs) {
        if (!programs || programs.length === 0) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return programs.some(program => {
            const programDate = new Date(program.startTime);
            return programDate >= today && programDate < tomorrow;
        });
    }

    /**
     * Estima el tamaño de los programas en bytes
     * @param {EPGProgram[]} programs - Lista de programas
     * @returns {number}
     * @private
     */
    estimateSize(programs) {
        if (!programs || programs.length === 0) return 0;
        
        // Estimación aproximada basada en JSON.stringify
        try {
            return new Blob([JSON.stringify(programs)]).size;
        } catch (error) {
            // Fallback: estimación simple
            return programs.length * 500; // ~500 bytes por programa
        }
    }

    /**
     * Calcula el tamaño actual de la memoria caché
     * @returns {number}
     * @private
     */
    calculateMemorySize() {
        let totalSize = 0;
        for (const entry of this.memoryCache.values()) {
            totalSize += entry.size || 0;
        }
        return totalSize;
    }

    /**
     * Calcula el tamaño del localStorage
     * @returns {number}
     * @private
     */
    calculateLocalStorageSize() {
        let totalSize = 0;
        const keys = this.getLocalStorageKeys();
        
        for (const key of keys) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    totalSize += new Blob([data]).size;
                }
            } catch (error) {
                // Ignorar errores de claves individuales
            }
        }
        
        return totalSize;
    }

    /**
     * Obtiene las claves de localStorage del EPG
     * @returns {string[]}
     * @private
     */
    getLocalStorageKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.localStoragePrefix)) {
                keys.push(key);
            }
        }
        return keys;
    }

    /**
     * Expulsa entradas de la memoria para liberar espacio
     * @private
     */
    async evictFromMemory() {
        // Estrategia inteligente: combinar LRU con patrones de acceso
        const entries = Array.from(this.memoryCache.entries());
        
        // Ordenar por prioridad (menos accedidos y más antiguos primero)
        entries.sort((a, b) => {
            const patternA = this.accessPatterns.get(a[0]) || { count: 0, frequency: 0 };
            const patternB = this.accessPatterns.get(b[0]) || { count: 0, frequency: 0 };
            
            // Prioridad basada en frecuencia y antigüedad
            const priorityA = patternA.frequency + (Date.now() - a[1].lastUpdated.getTime()) / (1000 * 60 * 60);
            const priorityB = patternB.frequency + (Date.now() - b[1].lastUpdated.getTime()) / (1000 * 60 * 60);
            
            return priorityA - priorityB;
        });
        
        // Remover el 25% con menor prioridad
        const toRemove = Math.ceil(entries.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            this.memoryCache.delete(entries[i][0]);
            this.metrics.evictions.memory++;
        }
        
        console.log(`🧹 ${toRemove} entradas expulsadas de memoria (estrategia inteligente)`);
    }

    /**
     * Expulsa entradas del localStorage
     * @private
     */
    async evictFromLocalStorage() {
        const keys = this.getLocalStorageKeys();
        const entries = [];
        
        // Obtener información de todas las entradas
        for (const key of keys) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    const channelId = key.replace(this.localStoragePrefix, '');
                    entries.push({
                        key: key,
                        channelId: channelId,
                        lastUpdated: new Date(parsed.lastUpdated)
                    });
                }
            } catch (error) {
                // Remover entradas corruptas
                localStorage.removeItem(key);
                this.metrics.evictions.localStorage++;
            }
        }
        
        // Estrategia inteligente: considerar patrones de acceso
        entries.sort((a, b) => {
            const patternA = this.accessPatterns.get(a.channelId) || { frequency: 0 };
            const patternB = this.accessPatterns.get(b.channelId) || { frequency: 0 };
            
            // Combinar antigüedad con frecuencia de acceso
            const scoreA = (Date.now() - a.lastUpdated.getTime()) / (1000 * 60 * 60) - patternA.frequency * 10;
            const scoreB = (Date.now() - b.lastUpdated.getTime()) / (1000 * 60 * 60) - patternB.frequency * 10;
            
            return scoreB - scoreA; // Mayor score = más candidato a eliminación
        });
        
        const toRemove = Math.ceil(entries.length * 0.5);
        
        for (let i = 0; i < toRemove; i++) {
            localStorage.removeItem(entries[i].key);
            this.metrics.evictions.localStorage++;
        }
        
        console.log(`🧹 ${toRemove} entradas expulsadas de localStorage (estrategia inteligente)`);
    }

    /**
     * Limpia IndexedDB de entradas expiradas
     * @private
     */
    async cleanupIndexedDB() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['epgData'], 'readwrite');
            const store = transaction.objectStore('epgData');
            const index = store.index('expiresAt');
            
            const now = new Date();
            const range = IDBKeyRange.upperBound(now);
            
            const request = index.openCursor(range);
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    console.log(`🧹 ${deletedCount} entradas expiradas eliminadas de IndexedDB`);
                }
            };
            
        } catch (error) {
            console.error('❌ Error limpiando IndexedDB:', error);
        }
    }

    /**
     * Optimiza el caché basado en patrones de uso
     * @returns {Promise<void>}
     */
    async optimizeCache() {
        console.log('🔧 Iniciando optimización de caché...');
        
        try {
            // 1. Promover canales frecuentemente accedidos a memoria
            const frequentChannels = this.getMostAccessedChannels(10);
            
            for (const { channelId } of frequentChannels) {
                if (!this.memoryCache.has(channelId)) {
                    // Intentar promover desde localStorage o IndexedDB
                    let entry = await this.retrieveFromLocalStorage(channelId);
                    if (!entry) {
                        entry = await this.retrieveFromIndexedDB(channelId);
                    }
                    
                    if (entry && !this.isExpired(entry.expiresAt)) {
                        await this.storeInMemory(channelId, entry);
                        console.log(`⬆️ Canal ${channelId} promovido a memoria`);
                    }
                }
            }
            
            // 2. Limpiar patrones de acceso obsoletos
            const now = Date.now();
            const dayAgo = now - (24 * 60 * 60 * 1000);
            
            for (const [channelId, pattern] of this.accessPatterns) {
                if (pattern.lastAccess < dayAgo && pattern.count < 2) {
                    this.accessPatterns.delete(channelId);
                }
            }
            
            // 3. Rebalancear niveles de caché
            await this.rebalanceCacheLevels();
            
            console.log('✅ Optimización de caché completada');
            
        } catch (error) {
            console.error('❌ Error durante optimización:', error);
        }
    }

    /**
     * Rebalancea los niveles de caché
     * @private
     */
    async rebalanceCacheLevels() {
        const memoryUsage = this.calculateMemorySize();
        const memoryLimit = this.config.memoryMaxSize;
        
        // Si la memoria está por debajo del 70%, promover más datos
        if (memoryUsage < memoryLimit * 0.7) {
            const availableSpace = memoryLimit - memoryUsage;
            const candidates = [];
            
            // Buscar candidatos en localStorage
            const localKeys = this.getLocalStorageKeys();
            for (const key of localKeys.slice(0, 5)) { // Limitar a 5 para evitar sobrecarga
                const channelId = key.replace(this.localStoragePrefix, '');
                if (!this.memoryCache.has(channelId)) {
                    const entry = await this.retrieveFromLocalStorage(channelId);
                    if (entry && entry.size < availableSpace) {
                        candidates.push({ channelId, entry });
                    }
                }
            }
            
            // Promover candidatos ordenados por frecuencia
            candidates.sort((a, b) => {
                const patternA = this.accessPatterns.get(a.channelId) || { frequency: 0 };
                const patternB = this.accessPatterns.get(b.channelId) || { frequency: 0 };
                return patternB.frequency - patternA.frequency;
            });
            
            let promotedSize = 0;
            for (const { channelId, entry } of candidates) {
                if (promotedSize + entry.size < availableSpace) {
                    await this.storeInMemory(channelId, entry);
                    promotedSize += entry.size;
                    console.log(`⬆️ Rebalance: ${channelId} promovido a memoria`);
                } else {
                    break;
                }
            }
        }
    }

    /**
     * Programa optimización automática
     * @private
     */
    scheduleOptimization() {
        // Optimizar cada 2 horas
        setInterval(() => {
            this.optimizeCache();
        }, 2 * 60 * 60 * 1000);
        
        console.log('🔧 Optimización automática programada cada 2 horas');
    }

    /**
     * Destruye el caché y limpia recursos
     */
    destroy() {
        this.memoryCache.clear();
        this.accessPatterns.clear();
        
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        
        console.log('🧹 EPGCache destruido');
    }
}

export { EPGCache };