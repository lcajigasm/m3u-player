/**
 * NetworkManager - Gestor avanzado de red y comunicaciones
 * Maneja HTTP requests, streaming, proxy, cache y resilencia de red
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from '../core/EventBus.js';

class NetworkManager {
    constructor(options = {}) {
        this.eventBus = getEventBus();
        
        // Estado del gestor de red
        this.state = {
            online: navigator.onLine,
            connectionSpeed: 'unknown',
            totalRequests: 0,
            activeConnections: 0,
            failedRequests: 0,
            bandwidth: 0,
            lastLatency: 0
        };

        // Configuración
        this.config = {
            timeout: options.timeout || 30000,
            retries: options.retries || 3,
            retryDelay: options.retryDelay || 1000,
            backoffMultiplier: options.backoffMultiplier || 2,
            maxConcurrentRequests: options.maxConcurrentRequests || 5,
            enableCache: options.enableCache !== false,
            cacheSize: options.cacheSize || 100,
            cacheTTL: options.cacheTTL || 300000, // 5 minutos
            enableProxy: options.enableProxy || false,
            proxyUrl: options.proxyUrl || '',
            userAgent: options.userAgent || 'M3U Player/2.0.0',
            enableCompression: options.enableCompression !== false,
            enableKeepAlive: options.enableKeepAlive !== false,
            followRedirects: options.followRedirects !== false,
            maxRedirects: options.maxRedirects || 5,
            enableMetrics: options.enableMetrics !== false,
            enableCircuitBreaker: options.enableCircuitBreaker || false,
            circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: options.circuitBreakerTimeout || 60000
        };

        // Cache de respuestas
        this.cache = new Map();
        this.cacheMetadata = new Map();
        
        // Cola de requests
        this.requestQueue = [];
        this.activeRequests = new Map();
        
        // Métricas de rendimiento
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            totalBytes: 0,
            cacheHits: 0,
            cacheMisses: 0,
            requestsByDomain: new Map(),
            errorsByType: new Map()
        };

        // Circuit breaker para dominios problemáticos
        this.circuitBreakers = new Map();
        
        // Pool de conexiones reutilizables
        this.connectionPool = new Map();
        
        // Detectores de red
        this.connectionTester = null;
        this.bandwidthTester = null;
        
        // Timers
        this.cleanupTimer = null;
        this.metricsTimer = null;

        this.init();
    }

    /**
     * Inicializar el gestor de red
     */
    init() {
        this.setupEventListeners();
        this.startNetworkMonitoring();
        this.startCleanupTimer();
        
        if (this.config.enableMetrics) {
            this.startMetricsCollection();
        }

        this.eventBus.emit('network:initialized');
        console.log('🌐 NetworkManager initialized');
    }

    /**
     * Realizar request HTTP avanzado
     * @param {string} url - URL del request
     * @param {Object} options - Opciones del request
     * @returns {Promise<Object>} Respuesta del request
     */
    async request(url, options = {}) {
        const requestId = this.generateRequestId();
        const startTime = performance.now();
        
        try {
            // Validar URL
            if (!this.isValidUrl(url)) {
                throw new Error('Invalid URL provided');
            }

            // Verificar circuit breaker
            if (this.config.enableCircuitBreaker && this.isCircuitBreakerOpen(url)) {
                throw new Error('Circuit breaker is open for this domain');
            }

            // Verificar cache primero
            if (this.config.enableCache && (options.method || 'GET') === 'GET') {
                const cached = this.getCachedResponse(url, options);
                if (cached) {
                    this.updateMetrics('cache_hit', url, performance.now() - startTime);
                    return cached;
                }
                this.metrics.cacheMisses++;
            }

            // Preparar opciones del request
            const requestOptions = this.prepareRequestOptions(url, options);
            
            // Verificar límite de conexiones concurrentes
            await this.enforceConnectionLimit();
            
            // Registrar request activo
            this.activeRequests.set(requestId, {
                url,
                startTime,
                options: requestOptions
            });

            this.state.activeConnections++;
            this.state.totalRequests++;

            // Ejecutar request con retry automático
            const response = await this.executeRequestWithRetry(url, requestOptions);
            
            // Procesar respuesta
            const processedResponse = await this.processResponse(response, url, options);
            
            // Guardar en cache si es aplicable
            if (this.config.enableCache && (options.method || 'GET') === 'GET') {
                this.setCachedResponse(url, options, processedResponse);
            }

            // Actualizar métricas
            const latency = performance.now() - startTime;
            this.updateMetrics('success', url, latency, processedResponse.size || 0);
            
            // Actualizar circuit breaker
            if (this.config.enableCircuitBreaker) {
                this.updateCircuitBreaker(url, true);
            }

            this.eventBus.emit('network:request-success', {
                requestId,
                url,
                latency,
                size: processedResponse.size || 0
            });

            return processedResponse;

        } catch (error) {
            const latency = performance.now() - startTime;
            this.updateMetrics('error', url, latency, 0, error);
            
            // Actualizar circuit breaker
            if (this.config.enableCircuitBreaker) {
                this.updateCircuitBreaker(url, false);
            }

            this.eventBus.emit('network:request-error', {
                requestId,
                url,
                error: error.message,
                latency
            });

            throw error;
        } finally {
            // Limpiar request activo
            this.activeRequests.delete(requestId);
            this.state.activeConnections--;
        }
    }

    /**
     * Request GET optimizado
     * @param {string} url - URL
     * @param {Object} options - Opciones
     * @returns {Promise<Object>} Respuesta
     */
    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    /**
     * Request POST optimizado
     * @param {string} url - URL
     * @param {*} data - Datos a enviar
     * @param {Object} options - Opciones
     * @returns {Promise<Object>} Respuesta
     */
    async post(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: data
        });
    }

    /**
     * Request HEAD para verificar disponibilidad
     * @param {string} url - URL
     * @param {Object} options - Opciones
     * @returns {Promise<Object>} Headers de respuesta
     */
    async head(url, options = {}) {
        const response = await this.request(url, { ...options, method: 'HEAD' });
        return {
            status: response.status,
            headers: response.headers,
            size: response.headers.get('content-length') || 0
        };
    }

    /**
     * Download de archivo con progreso
     * @param {string} url - URL del archivo
     * @param {Object} options - Opciones de descarga
     * @returns {Promise<ArrayBuffer>} Datos del archivo
     */
    async download(url, options = {}) {
        const {
            onProgress = null,
            chunkSize = 1024 * 1024, // 1MB chunks
            resumable = false
        } = options;

        try {
            // Obtener información del archivo
            const headResponse = await this.head(url);
            const totalSize = parseInt(headResponse.headers.get('content-length') || '0');
            
            this.eventBus.emit('network:download-start', {
                url,
                totalSize
            });

            const response = await this.request(url, {
                ...options,
                method: 'GET',
                responseType: 'stream'
            });

            if (!response.body) {
                throw new Error('Response body is not readable');
            }

            const reader = response.body.getReader();
            const chunks = [];
            let downloadedSize = 0;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    chunks.push(value);
                    downloadedSize += value.length;
                    
                    // Reportar progreso
                    if (onProgress) {
                        const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;
                        onProgress({
                            loaded: downloadedSize,
                            total: totalSize,
                            progress
                        });
                    }

                    this.eventBus.emit('network:download-progress', {
                        url,
                        loaded: downloadedSize,
                        total: totalSize
                    });
                }
            } finally {
                reader.releaseLock();
            }

            // Combinar chunks
            const result = new Uint8Array(downloadedSize);
            let position = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, position);
                position += chunk.length;
            }

            this.eventBus.emit('network:download-complete', {
                url,
                size: downloadedSize
            });

            return result.buffer;

        } catch (error) {
            this.eventBus.emit('network:download-error', {
                url,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Test de conectividad y latencia
     * @param {string} url - URL a testear (opcional)
     * @returns {Promise<Object>} Resultados del test
     */
    async testConnection(url = 'https://www.google.com/favicon.ico') {
        const testStartTime = performance.now();
        
        try {
            const response = await this.head(url, { timeout: 5000 });
            const latency = performance.now() - testStartTime;
            
            const result = {
                online: true,
                latency: Math.round(latency),
                status: response.status,
                timestamp: Date.now()
            };

            this.state.lastLatency = result.latency;
            this.state.online = true;

            this.eventBus.emit('network:connection-test', result);
            return result;

        } catch (error) {
            const result = {
                online: false,
                latency: -1,
                error: error.message,
                timestamp: Date.now()
            };

            this.state.online = false;
            this.eventBus.emit('network:connection-test', result);
            return result;
        }
    }

    /**
     * Test de ancho de banda
     * @returns {Promise<Object>} Información de ancho de banda
     */
    async testBandwidth() {
        const testUrls = [
            'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
            'https://httpbin.org/bytes/1048576' // 1MB test file
        ];

        const results = [];

        for (const url of testUrls) {
            try {
                const startTime = performance.now();
                const response = await this.get(url, { 
                    timeout: 10000,
                    cache: 'no-cache'
                });
                const endTime = performance.now();
                
                const duration = (endTime - startTime) / 1000; // seconds
                const size = response.size || 0;
                const speed = size / duration; // bytes per second
                
                results.push({
                    url,
                    size,
                    duration,
                    speed
                });

            } catch (error) {
                console.warn(`Bandwidth test failed for ${url}:`, error);
            }
        }

        if (results.length > 0) {
            const averageSpeed = results.reduce((sum, r) => sum + r.speed, 0) / results.length;
            this.state.bandwidth = Math.round(averageSpeed);
            
            const bandwidthInfo = {
                bytesPerSecond: averageSpeed,
                kbps: (averageSpeed / 1024),
                mbps: (averageSpeed / 1024 / 1024),
                results
            };

            this.eventBus.emit('network:bandwidth-test', bandwidthInfo);
            return bandwidthInfo;
        }

        throw new Error('All bandwidth tests failed');
    }

    /**
     * Configurar proxy
     * @param {Object} proxyConfig - Configuración del proxy
     */
    setProxy(proxyConfig) {
        this.config.enableProxy = proxyConfig.enabled;
        this.config.proxyUrl = proxyConfig.url;
        this.config.proxyAuth = proxyConfig.auth;
        this.config.proxyUsername = proxyConfig.username;
        this.config.proxyPassword = proxyConfig.password;

        this.eventBus.emit('network:proxy-configured', { enabled: proxyConfig.enabled });
        console.log(`🌐 Proxy ${proxyConfig.enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Obtener métricas de red
     * @returns {Object} Métricas actuales
     */
    getMetrics() {
        return {
            ...this.metrics,
            state: { ...this.state },
            cacheSize: this.cache.size,
            activeConnections: this.state.activeConnections,
            circuitBreakersOpen: Array.from(this.circuitBreakers.values())
                .filter(cb => cb.state === 'open').length
        };
    }

    /**
     * Limpiar cache de red
     * @param {string} pattern - Patrón URL para limpiar (opcional)
     */
    clearCache(pattern = null) {
        if (pattern) {
            // Limpiar entradas específicas
            const regex = new RegExp(pattern);
            for (const [key] of this.cache) {
                if (regex.test(key)) {
                    this.cache.delete(key);
                    this.cacheMetadata.delete(key);
                }
            }
        } else {
            // Limpiar todo el cache
            this.cache.clear();
            this.cacheMetadata.clear();
        }

        this.eventBus.emit('network:cache-cleared', { pattern });
        console.log('🌐 Network cache cleared');
    }

    // Métodos privados

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    prepareRequestOptions(url, options) {
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': this.config.userAgent,
                ...options.headers
            },
            timeout: options.timeout || this.config.timeout,
            redirect: this.config.followRedirects ? 'follow' : 'error',
            ...options
        };

        // Agregar headers de compresión
        if (this.config.enableCompression) {
            requestOptions.headers['Accept-Encoding'] = 'gzip, deflate, br';
        }

        // Configurar proxy si está habilitado
        if (this.config.enableProxy && this.config.proxyUrl) {
            // La configuración del proxy se maneja a nivel de sistema en Electron
            requestOptions.proxy = this.config.proxyUrl;
        }

        // Configurar autenticación proxy
        if (this.config.proxyAuth && this.config.proxyUsername) {
            const auth = btoa(`${this.config.proxyUsername}:${this.config.proxyPassword}`);
            requestOptions.headers['Proxy-Authorization'] = `Basic ${auth}`;
        }

        return requestOptions;
    }

    async enforceConnectionLimit() {
        while (this.state.activeConnections >= this.config.maxConcurrentRequests) {
            // Esperar hasta que se libere una conexión
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    async executeRequestWithRetry(url, options, attempt = 1) {
        try {
            // Usar fetch nativo o electronAPI dependiendo del entorno
            if (window.electronAPI && window.electronAPI.fetchUrl) {
                const response = await window.electronAPI.fetchUrl(url, options);
                
                if (response.success) {
                    return {
                        status: response.statusCode,
                        headers: new Map(Object.entries(response.headers || {})),
                        data: response.data,
                        size: response.data ? response.data.length : 0
                    };
                } else {
                    throw new Error(response.error);
                }
            } else {
                // Fallback a fetch nativo
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), options.timeout);
                
                try {
                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.text();
                    
                    return {
                        status: response.status,
                        headers: response.headers,
                        data,
                        size: data.length
                    };
                } finally {
                    clearTimeout(timeoutId);
                }
            }
        } catch (error) {
            if (attempt < this.config.retries) {
                const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
                
                console.warn(`🌐 Request attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeRequestWithRetry(url, options, attempt + 1);
            } else {
                throw error;
            }
        }
    }

    async processResponse(response, url, options) {
        // Procesar respuesta según el tipo esperado
        const responseType = options.responseType || 'text';
        
        let processedData = response.data;
        
        try {
            switch (responseType) {
                case 'json':
                    processedData = typeof response.data === 'string' ? 
                        JSON.parse(response.data) : response.data;
                    break;
                case 'blob':
                    // Para descarga de archivos binarios
                    processedData = new Blob([response.data]);
                    break;
                case 'arraybuffer':
                    // Para datos binarios
                    processedData = new TextEncoder().encode(response.data).buffer;
                    break;
                case 'text':
                default:
                    // Mantener como texto
                    break;
            }
        } catch (error) {
            console.warn('⚠️ Error processing response:', error);
        }

        return {
            data: processedData,
            status: response.status,
            headers: response.headers,
            size: response.size,
            url
        };
    }

    getCachedResponse(url, options) {
        const cacheKey = this.generateCacheKey(url, options);
        
        if (this.cache.has(cacheKey)) {
            const metadata = this.cacheMetadata.get(cacheKey);
            
            // Verificar TTL
            if (Date.now() - metadata.timestamp < this.config.cacheTTL) {
                this.metrics.cacheHits++;
                return this.cache.get(cacheKey);
            } else {
                // Cache expirado
                this.cache.delete(cacheKey);
                this.cacheMetadata.delete(cacheKey);
            }
        }
        
        return null;
    }

    setCachedResponse(url, options, response) {
        const cacheKey = this.generateCacheKey(url, options);
        
        // Verificar límite de tamaño del cache
        if (this.cache.size >= this.config.cacheSize) {
            // Remover entrada más antigua
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            this.cacheMetadata.delete(oldestKey);
        }
        
        this.cache.set(cacheKey, response);
        this.cacheMetadata.set(cacheKey, {
            timestamp: Date.now(),
            size: response.size || 0
        });
    }

    generateCacheKey(url, options) {
        const method = options.method || 'GET';
        const headers = JSON.stringify(options.headers || {});
        return `${method}:${url}:${headers}`;
    }

    updateMetrics(type, url, latency, bytes = 0, error = null) {
        this.metrics.totalRequests++;
        
        if (type === 'success') {
            this.metrics.successfulRequests++;
            this.metrics.totalBytes += bytes;
        } else if (type === 'error') {
            this.metrics.failedRequests++;
            
            if (error) {
                const errorType = error.name || 'UnknownError';
                this.metrics.errorsByType.set(errorType, 
                    (this.metrics.errorsByType.get(errorType) || 0) + 1);
            }
        } else if (type === 'cache_hit') {
            this.metrics.cacheHits++;
        }

        // Actualizar latencia promedio
        const totalLatency = this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency;
        this.metrics.averageLatency = totalLatency / this.metrics.totalRequests;

        // Actualizar métricas por dominio
        try {
            const domain = new URL(url).hostname;
            const domainStats = this.metrics.requestsByDomain.get(domain) || { total: 0, success: 0, error: 0 };
            
            domainStats.total++;
            if (type === 'success') domainStats.success++;
            if (type === 'error') domainStats.error++;
            
            this.metrics.requestsByDomain.set(domain, domainStats);
        } catch (error) {
            // URL inválida, ignorar
        }
    }

    isCircuitBreakerOpen(url) {
        try {
            const domain = new URL(url).hostname;
            const breaker = this.circuitBreakers.get(domain);
            
            if (!breaker) return false;
            
            if (breaker.state === 'open') {
                // Verificar si debe cambiar a half-open
                if (Date.now() - breaker.lastFailTime > this.config.circuitBreakerTimeout) {
                    breaker.state = 'half-open';
                    breaker.failures = 0;
                    return false;
                }
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    updateCircuitBreaker(url, success) {
        try {
            const domain = new URL(url).hostname;
            let breaker = this.circuitBreakers.get(domain);
            
            if (!breaker) {
                breaker = {
                    state: 'closed',
                    failures: 0,
                    lastFailTime: 0
                };
                this.circuitBreakers.set(domain, breaker);
            }
            
            if (success) {
                // Reset en caso de éxito
                breaker.failures = 0;
                breaker.state = 'closed';
            } else {
                // Incrementar fallos
                breaker.failures++;
                breaker.lastFailTime = Date.now();
                
                // Abrir circuit breaker si se supera el threshold
                if (breaker.failures >= this.config.circuitBreakerThreshold) {
                    breaker.state = 'open';
                    console.warn(`🌐 Circuit breaker opened for domain: ${domain}`);
                }
            }
        } catch (error) {
            // URL inválida, ignorar
        }
    }

    setupEventListeners() {
        // Eventos del navegador
        window.addEventListener('online', () => {
            this.state.online = true;
            this.eventBus.emit('network:online');
            console.log('🌐 Network connection restored');
        });

        window.addEventListener('offline', () => {
            this.state.online = false;
            this.eventBus.emit('network:offline');
            console.log('🌐 Network connection lost');
        });

        // Eventos del EventBus
        this.eventBus.on('network:test-connection', async () => {
            await this.testConnection();
        });

        this.eventBus.on('network:test-bandwidth', async () => {
            await this.testBandwidth();
        });

        this.eventBus.on('network:clear-cache', (event) => {
            this.clearCache(event.data?.pattern);
        });
    }

    startNetworkMonitoring() {
        // Test de conectividad periódico
        this.connectionTester = setInterval(() => {
            this.testConnection().catch(error => {
                console.warn('⚠️ Connection test failed:', error);
            });
        }, 30000); // Cada 30 segundos

        // Test de ancho de banda menos frecuente
        this.bandwidthTester = setInterval(() => {
            this.testBandwidth().catch(error => {
                console.warn('⚠️ Bandwidth test failed:', error);
            });
        }, 300000); // Cada 5 minutos
    }

    startCleanupTimer() {
        // Limpieza periódica de cache expirado y circuit breakers
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredCache();
            this.cleanupCircuitBreakers();
        }, 60000); // Cada minuto
    }

    startMetricsCollection() {
        this.metricsTimer = setInterval(() => {
            this.eventBus.emit('network:metrics-update', this.getMetrics());
        }, 10000); // Cada 10 segundos
    }

    cleanupExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, metadata] of this.cacheMetadata) {
            if (now - metadata.timestamp > this.config.cacheTTL) {
                expiredKeys.push(key);
            }
        }
        
        for (const key of expiredKeys) {
            this.cache.delete(key);
            this.cacheMetadata.delete(key);
        }
        
        if (expiredKeys.length > 0) {
            console.log(`🌐 Cleared ${expiredKeys.length} expired cache entries`);
        }
    }

    cleanupCircuitBreakers() {
        const now = Date.now();
        
        for (const [domain, breaker] of this.circuitBreakers) {
            // Reset circuit breakers que han estado abiertos por mucho tiempo
            if (breaker.state === 'open' && 
                now - breaker.lastFailTime > this.config.circuitBreakerTimeout * 2) {
                breaker.state = 'closed';
                breaker.failures = 0;
                console.log(`🌐 Circuit breaker reset for domain: ${domain}`);
            }
        }
    }

    /**
     * Destruir el gestor de red
     */
    destroy() {
        // Limpiar timers
        if (this.connectionTester) {
            clearInterval(this.connectionTester);
        }
        
        if (this.bandwidthTester) {
            clearInterval(this.bandwidthTester);
        }
        
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
        }

        // Abortar requests activos
        for (const [requestId, request] of this.activeRequests) {
            console.log(`🌐 Aborting active request: ${requestId}`);
        }
        this.activeRequests.clear();

        // Limpiar cache
        this.cache.clear();
        this.cacheMetadata.clear();

        // Limpiar circuit breakers
        this.circuitBreakers.clear();

        // Limpiar métricas
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            totalBytes: 0,
            cacheHits: 0,
            cacheMisses: 0,
            requestsByDomain: new Map(),
            errorsByType: new Map()
        };

        this.eventBus.emit('network:destroyed');
        console.log('🌐 NetworkManager destroyed');
    }
}

export default NetworkManager;