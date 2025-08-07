/**
 * EPG Data Provider - Proveedor de datos EPG
 * Obtiene datos EPG de múltiples fuentes y los parsea
 */

/**
 * @typedef {Object} EPGConfig
 * @property {boolean} autoUpdate - Actualización automática
 * @property {number} updateInterval - Intervalo de actualización en minutos
 * @property {number} cacheRetention - Retención de caché en días
 * @property {number} defaultTimeRange - Rango temporal por defecto en horas
 * @property {number} reminderAdvance - Aviso de recordatorio en minutos
 * @property {string[]} dataSources - Fuentes de datos
 * @property {string} theme - Tema de la interfaz
 */

class EPGDataProvider {
    /**
     * @param {EPGConfig} config - Configuración del proveedor
     */
    constructor(config) {
        this.config = config;
        this.parsers = new Map();
        this.dataSources = [];
        
        this.initializeParsers();
        this.initializeDataSources();
        
        console.log('📡 EPGDataProvider inicializado');
    }

    /**
     * Obtiene datos EPG para los canales especificados
     * @param {Array} channels - Lista de canales
     * @returns {Promise<Map<string, EPGProgram[]>>}
     */
    async fetchEPGData(channels) {
        const results = new Map();
        const errors = [];
        
        try {
            console.log(`📡 Obteniendo datos EPG para ${channels.length} canales...`);
            
            // Intentar obtener datos de cada fuente en orden de prioridad
            for (const source of this.dataSources) {
                try {
                    console.log(`🔄 Intentando fuente: ${source.name} (prioridad: ${source.priority})`);
                    
                    const sourceData = await this.fetchFromSourceWithRetry(source, channels);
                    
                    // Combinar datos de esta fuente con resultados existentes
                    let newChannels = 0;
                    let newPrograms = 0;
                    
                    for (const [channelId, programs] of sourceData) {
                        if (!results.has(channelId) || results.get(channelId).length === 0) {
                            results.set(channelId, programs);
                            newChannels++;
                            newPrograms += programs.length;
                        }
                    }
                    
                    console.log(`✅ Datos obtenidos de ${source.name}: ${newChannels} canales, ${newPrograms} programas`);
                    
                    // Si es una fuente crítica y falló, registrar error
                    if (source.critical && sourceData.size === 0) {
                        errors.push(`Fuente crítica ${source.name} no proporcionó datos`);
                    }
                    
                } catch (error) {
                    const errorMsg = `Error en fuente ${source.name}: ${error.message}`;
                    console.warn(`⚠️ ${errorMsg}`);
                    errors.push(errorMsg);
                    
                    // Si es una fuente crítica, intentar fuentes de respaldo
                    if (source.critical) {
                        await this.tryBackupSources(source, channels, results);
                    }
                    
                    continue;
                }
            }
            
            // Validar resultados mínimos
            if (results.size === 0 && channels.length > 0) {
                throw new Error('No se pudieron obtener datos EPG de ninguna fuente');
            }
            
            console.log(`📊 Datos EPG obtenidos para ${results.size} canales de ${channels.length} solicitados`);
            
            // Log de errores si los hay
            if (errors.length > 0) {
                console.warn(`⚠️ Se encontraron ${errors.length} errores durante la obtención de datos EPG`);
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ Error crítico obteniendo datos EPG:', error);
            
            // Intentar obtener datos del caché como último recurso
            if (this.cache) {
                console.log('🔄 Intentando obtener datos del caché como respaldo...');
                return await this.getCachedDataAsBackup(channels);
            }
            
            return results;
        }
    }

    /**
     * Parsea contenido XMLTV
     * @param {string} xmlData - Datos XML
     * @returns {Map<string, EPGProgram[]>}
     */
    parseXMLTV(xmlData) {
        const parser = this.parsers.get('xmltv');
        if (!parser) {
            throw new Error('Parser XMLTV no disponible');
        }
        
        return parser.parse(xmlData);
    }

    /**
     * Parsea contenido JSON EPG
     * @param {string} jsonData - Datos JSON
     * @returns {Map<string, EPGProgram[]>}
     */
    parseJSONEPG(jsonData) {
        const parser = this.parsers.get('json');
        if (!parser) {
            throw new Error('Parser JSON EPG no disponible');
        }
        
        return parser.parse(jsonData);
    }

    /**
     * Extrae EPG embebido de contenido M3U
     * @param {string} m3uContent - Contenido M3U
     * @returns {Map<string, EPGProgram[]>}
     */
    extractEmbeddedEPG(m3uContent) {
        const parser = this.parsers.get('embedded');
        if (!parser) {
            throw new Error('Parser EPG embebido no disponible');
        }
        
        return parser.parse(m3uContent);
    }

    /**
     * Prioriza las fuentes de datos según confiabilidad
     * @param {Array} sources - Lista de fuentes
     * @returns {Array} Fuentes priorizadas
     */
    prioritizeSources(sources) {
        // Ordenar por prioridad (menor número = mayor prioridad)
        return sources.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    }

    /**
     * Inicializa los parsers disponibles
     * @private
     */
    async initializeParsers() {
        try {
            // Importar parsers dinámicamente
            const { XMLTVParser } = await import('./parsers/XMLTVParser.js');
            const { JSONEPGParser } = await import('./parsers/JSONEPGParser.js');
            const { EmbeddedEPGParser } = await import('./parsers/EmbeddedEPGParser.js');
            
            this.parsers.set('xmltv', new XMLTVParser());
            this.parsers.set('json', new JSONEPGParser());
            this.parsers.set('embedded', new EmbeddedEPGParser());
            
            console.log('✅ Parsers EPG inicializados');
            
        } catch (error) {
            console.error('❌ Error inicializando parsers:', error);
        }
    }

    /**
     * Inicializa las fuentes de datos
     * @private
     */
    initializeDataSources() {
        this.dataSources = [
            {
                name: 'IPTV-ORG EPG',
                type: 'xmltv',
                url: 'https://iptv-org.github.io/epg/guides/ar/mi.tv.epg.xml',
                priority: 1,
                enabled: true,
                critical: true,
                maxRetries: 3,
                retryDelay: 2000,
                minInterval: 300000, // 5 minutos
                timeout: 30000 // 30 segundos
            },
            {
                name: 'EPG Best',
                type: 'xmltv', 
                url: 'https://epg.best/epg.xml',
                priority: 2,
                enabled: true,
                critical: false,
                maxRetries: 2,
                retryDelay: 1500,
                minInterval: 180000, // 3 minutos
                timeout: 20000, // 20 segundos
                isBackupFor: 'IPTV-ORG EPG'
            },
            {
                name: 'XMLTV Generic',
                type: 'xmltv',
                url: 'https://raw.githubusercontent.com/iptv-org/epg/master/sites/mi.tv/mi.tv.channels.xml',
                priority: 4,
                enabled: false, // Deshabilitada por defecto
                critical: false,
                maxRetries: 2,
                retryDelay: 1000,
                minInterval: 600000, // 10 minutos
                timeout: 15000,
                isBackupFor: 'IPTV-ORG EPG'
            },
            {
                name: 'Embedded EPG',
                type: 'embedded',
                priority: 3,
                enabled: true,
                critical: false,
                maxRetries: 1,
                retryDelay: 500,
                minInterval: 60000, // 1 minuto
                timeout: 5000
            },
            {
                name: 'JSON EPG Local',
                type: 'json',
                url: './epg/local-epg.json',
                priority: 5,
                enabled: false, // Solo si existe archivo local
                critical: false,
                maxRetries: 1,
                retryDelay: 500,
                minInterval: 30000,
                timeout: 5000
            }
        ];

        // Filtrar fuentes habilitadas y priorizarlas
        this.dataSources = this.prioritizeSources(
            this.dataSources.filter(source => source.enabled)
        );

        console.log(`📡 ${this.dataSources.length} fuentes de datos configuradas (${this.dataSources.filter(s => s.critical).length} críticas)`);
        
        // Log de configuración detallada
        for (const source of this.dataSources) {
            console.log(`  - ${source.name}: ${source.type} (prioridad: ${source.priority}, crítica: ${source.critical || false})`);
        }
    }

    /**
     * Obtiene datos de una fuente específica con reintentos
     * @param {Object} source - Configuración de la fuente
     * @param {Array} channels - Lista de canales
     * @returns {Promise<Map<string, EPGProgram[]>>}
     * @private
     */
    async fetchFromSourceWithRetry(source, channels) {
        const maxRetries = source.maxRetries || 3;
        const retryDelay = source.retryDelay || 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Intento ${attempt}/${maxRetries} para fuente: ${source.name}`);
                
                const data = await this.fetchFromSource(source, channels);
                
                // Validar que los datos sean útiles
                if (data.size === 0 && channels.length > 0) {
                    throw new Error('La fuente no devolvió datos para ningún canal');
                }
                
                return data;
                
            } catch (error) {
                console.warn(`⚠️ Intento ${attempt} falló para ${source.name}: ${error.message}`);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Esperar antes del siguiente intento con backoff exponencial
                const delay = retryDelay * Math.pow(2, attempt - 1);
                console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
                await this.sleep(delay);
            }
        }
    }

    /**
     * Obtiene datos de una fuente específica
     * @param {Object} source - Configuración de la fuente
     * @param {Array} channels - Lista de canales
     * @returns {Promise<Map<string, EPGProgram[]>>}
     * @private
     */
    async fetchFromSource(source, channels) {
        // Verificar si la fuente está habilitada
        if (!source.enabled) {
            throw new Error(`Fuente ${source.name} está deshabilitada`);
        }
        
        // Verificar rate limiting
        if (source.lastFetch && source.minInterval) {
            const timeSinceLastFetch = Date.now() - source.lastFetch;
            if (timeSinceLastFetch < source.minInterval) {
                throw new Error(`Rate limit: debe esperar ${source.minInterval - timeSinceLastFetch}ms`);
            }
        }
        
        // Marcar tiempo de fetch
        source.lastFetch = Date.now();
        
        try {
            switch (source.type) {
                case 'xmltv':
                    return await this.fetchXMLTVSource(source, channels);
                case 'json':
                    return await this.fetchJSONSource(source, channels);
                case 'embedded':
                    return await this.fetchEmbeddedSource(source, channels);
                default:
                    throw new Error(`Tipo de fuente no soportado: ${source.type}`);
            }
        } catch (error) {
            // Marcar fuente como problemática
            source.lastError = {
                timestamp: Date.now(),
                message: error.message
            };
            throw error;
        }
    }

    /**
     * Obtiene datos de una fuente XMLTV
     * @param {Object} source - Configuración de la fuente
     * @param {Array} channels - Lista de canales
     * @returns {Promise<Map<string, EPGProgram[]>>}
     * @private
     */
    async fetchXMLTVSource(source, channels) {
        try {
            console.log(`📡 Obteniendo XMLTV de: ${source.url}`);
            
            const timeout = source.timeout || 15000;
            const response = await this.fetchWithTimeout(source.url, timeout);
            const xmlData = await response.text();
            
            if (!xmlData || xmlData.trim().length === 0) {
                throw new Error('Respuesta XMLTV vacía');
            }
            
            // Validar que sea XML válido antes de parsear
            if (!xmlData.includes('<?xml') && !xmlData.includes('<tv')) {
                throw new Error('Respuesta no parece ser XMLTV válido');
            }
            
            const parsedData = this.parseXMLTV(xmlData);
            
            // Validar que se obtuvieron datos útiles
            if (parsedData.size === 0) {
                throw new Error('No se pudieron parsear programas del XMLTV');
            }
            
            return parsedData;
            
        } catch (error) {
            console.error(`❌ Error obteniendo XMLTV de ${source.name}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene datos de una fuente JSON
     * @param {Object} source - Configuración de la fuente
     * @param {Array} channels - Lista de canales
     * @returns {Promise<Map<string, EPGProgram[]>>}
     * @private
     */
    async fetchJSONSource(source, channels) {
        try {
            console.log(`📡 Obteniendo JSON EPG de: ${source.url}`);
            
            const timeout = source.timeout || 15000;
            const response = await this.fetchWithTimeout(source.url, timeout);
            const jsonData = await response.text();
            
            if (!jsonData || jsonData.trim().length === 0) {
                throw new Error('Respuesta JSON EPG vacía');
            }
            
            // Validar que sea JSON válido antes de parsear
            try {
                JSON.parse(jsonData);
            } catch (parseError) {
                throw new Error('Respuesta no es JSON válido: ' + parseError.message);
            }
            
            const parsedData = this.parseJSONEPG(jsonData);
            
            // Validar que se obtuvieron datos útiles
            if (parsedData.size === 0) {
                throw new Error('No se pudieron parsear programas del JSON EPG');
            }
            
            return parsedData;
            
        } catch (error) {
            console.error(`❌ Error obteniendo JSON EPG de ${source.name}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene datos EPG embebidos
     * @param {Object} source - Configuración de la fuente
     * @param {Array} channels - Lista de canales
     * @returns {Promise<Map<string, EPGProgram[]>>}
     * @private
     */
    async fetchEmbeddedSource(source, channels) {
        try {
            console.log('📡 Extrayendo EPG embebido de playlist...');
            
            // Obtener contenido M3U actual del reproductor
            const m3uContent = this.getCurrentM3UContent();
            
            if (!m3uContent) {
                throw new Error('No hay contenido M3U disponible');
            }
            
            return this.extractEmbeddedEPG(m3uContent);
            
        } catch (error) {
            console.error('❌ Error extrayendo EPG embebido:', error);
            throw error;
        }
    }

    /**
     * Realiza una petición HTTP con timeout
     * @param {string} url - URL a obtener
     * @param {number} timeout - Timeout en milisegundos
     * @returns {Promise<Response>}
     * @private
     */
    async fetchWithTimeout(url, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'M3U Player EPG/1.0.0',
                    'Accept': 'application/xml, application/json, text/plain, */*'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Timeout obteniendo datos de ${url}`);
            }
            
            throw error;
        }
    }

    /**
     * Obtiene el contenido M3U actual del reproductor
     * @returns {string|null}
     * @private
     */
    getCurrentM3UContent() {
        // Esta función debería obtener el contenido M3U actual del reproductor
        // Por ahora retornamos null, se implementará cuando se integre con el reproductor
        return null;
    }

    /**
     * Genera un ID único para un programa
     * @param {string} channelId - ID del canal
     * @param {Date} startTime - Hora de inicio
     * @param {string} title - Título del programa
     * @returns {string}
     * @private
     */
    generateProgramId(channelId, startTime, title) {
        const timestamp = startTime.getTime();
        const titleHash = this.simpleHash(title);
        return `${channelId}_${timestamp}_${titleHash}`;
    }

    /**
     * Genera un hash simple para una cadena
     * @param {string} str - Cadena a hashear
     * @returns {string}
     * @private
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Valida un programa EPG
     * @param {Object} program - Programa a validar
     * @returns {boolean}
     * @private
     */
    validateProgram(program) {
        return !!(
            program &&
            program.title &&
            program.startTime instanceof Date &&
            program.endTime instanceof Date &&
            program.startTime < program.endTime
        );
    }

    /**
     * Limpia y normaliza el título de un programa
     * @param {string} title - Título original
     * @returns {string}
     * @private
     */
    cleanTitle(title) {
        if (!title) return '';
        
        return title
            .trim()
            .replace(/\s+/g, ' ') // Normalizar espacios
            .replace(/[^\w\s\-\.\,\!\?\:\;]/g, '') // Remover caracteres especiales
            .substring(0, 200); // Limitar longitud
    }

    /**
     * Attempt backup sources for critical sources
     * @param {Object} failedSource - Source that failed
     * @param {Array} channels - List of channels
     * @param {Map} results - Current results map
     * @private
     */
    async tryBackupSources(failedSource, channels, results) {
        const backupSources = this.dataSources.filter(source => 
            source.isBackupFor === failedSource.name && source.enabled
        );
        
        if (backupSources.length === 0) {
            console.warn(`⚠️ No backup sources available for ${failedSource.name}`);
            return;
        }
        
        console.log(`🔄 Trying ${backupSources.length} backup sources for ${failedSource.name}`);
        
        for (const backupSource of backupSources) {
            try {
                const backupData = await this.fetchFromSource(backupSource, channels);
                
                // Combinar datos de respaldo
                for (const [channelId, programs] of backupData) {
                    if (!results.has(channelId) || results.get(channelId).length === 0) {
                        results.set(channelId, programs);
                    }
                }
                
                console.log(`✅ Backup source ${backupSource.name} provided data`);
                break;
                
            } catch (error) {
                console.warn(`⚠️ Backup source ${backupSource.name} also failed: ${error.message}`);
                continue;
            }
        }
    }

    /**
     * Obtiene datos del caché como último respaldo
     * @param {Array} channels - Lista de canales
     * @returns {Promise<Map<string, EPGProgram[]>>}
     * @private
     */
    async getCachedDataAsBackup(channels) {
        const results = new Map();
        
        if (!this.cache) {
            return results;
        }
        
        try {
            for (const channel of channels) {
                const channelId = channel.id || channel.name;
                const cachedPrograms = await this.cache.retrieve(channelId, {
                    start: new Date(),
                    end: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
                });
                
                if (cachedPrograms && cachedPrograms.length > 0) {
                    results.set(channelId, cachedPrograms);
                }
            }
            
            console.log(`📦 Datos de respaldo obtenidos del caché: ${results.size} canales`);
            
        } catch (error) {
            console.error('❌ Error obteniendo datos del caché:', error);
        }
        
        return results;
    }

    /**
     * Pausa la ejecución por el tiempo especificado
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise<void>}
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene estadísticas de las fuentes de datos
     * @returns {Object}
     */
    getSourceStats() {
        const stats = {
            total: this.dataSources.length,
            enabled: 0,
            disabled: 0,
            withErrors: 0,
            byType: {},
            byPriority: {}
        };
        
        for (const source of this.dataSources) {
            // Contadores básicos
            if (source.enabled) {
                stats.enabled++;
            } else {
                stats.disabled++;
            }
            
            if (source.lastError) {
                stats.withErrors++;
            }
            
            // Por tipo
            if (!stats.byType[source.type]) {
                stats.byType[source.type] = 0;
            }
            stats.byType[source.type]++;
            
            // Por prioridad
            const priority = source.priority || 999;
            if (!stats.byPriority[priority]) {
                stats.byPriority[priority] = 0;
            }
            stats.byPriority[priority]++;
        }
        
        return stats;
    }

    /**
     * Reinicia el estado de error de todas las fuentes
     */
    resetSourceErrors() {
        for (const source of this.dataSources) {
            delete source.lastError;
            delete source.lastFetch;
        }
        console.log('🔄 Estado de errores de fuentes reiniciado');
    }

    /**
     * Enable or disable a specific source
     * @param {string} sourceName - Source name
     * @param {boolean} enabled - Enabled state
     */
    setSourceEnabled(sourceName, enabled) {
        const source = this.dataSources.find(s => s.name === sourceName);
        if (source) {
            source.enabled = enabled;
            console.log(`${enabled ? '✅' : '❌'} Source ${sourceName} ${enabled ? 'enabled' : 'disabled'}`);
        } else {
            console.warn(`⚠️ Source ${sourceName} not found`);
        }
    }

    /**
     * Añade una nueva fuente de datos
     * @param {Object} sourceConfig - Configuración de la fuente
     */
    addDataSource(sourceConfig) {
        // Validar configuración mínima
        if (!sourceConfig.name || !sourceConfig.type) {
            throw new Error('La fuente debe tener al menos name y type');
        }
        
        // Verificar que no exista ya
        const existing = this.dataSources.find(s => s.name === sourceConfig.name);
        if (existing) {
            throw new Error(`Ya existe una fuente con el nombre: ${sourceConfig.name}`);
        }
        
        // Configuración por defecto
        const source = {
            enabled: true,
            priority: 999,
            maxRetries: 3,
            retryDelay: 1000,
            minInterval: 60000, // 1 minuto mínimo entre requests
            ...sourceConfig
        };
        
        this.dataSources.push(source);
        
        // Re-priorizar fuentes
        this.dataSources = this.prioritizeSources(this.dataSources);
        
        console.log(`➕ Nueva fuente añadida: ${source.name} (tipo: ${source.type}, prioridad: ${source.priority})`);
    }

    /**
     * Remove a data source
     * @param {string} sourceName - Name of the source to remove
     */
    removeDataSource(sourceName) {
        const index = this.dataSources.findIndex(s => s.name === sourceName);
        if (index !== -1) {
            this.dataSources.splice(index, 1);
            console.log(`➖ Source removed: ${sourceName}`);
        } else {
            console.warn(`⚠️ Source ${sourceName} not found to remove`);
        }
    }

    /**
     * Set cache for backups
     * @param {EPGCache} cache - Cache instance
     */
    setCache(cache) {
        this.cache = cache;
        console.log('📦 Cache configured for backups');
    }

    /**
     * Limpia recursos del proveedor
     */
    destroy() {
        this.parsers.clear();
        this.dataSources = [];
        this.cache = null;
        console.log('🧹 EPGDataProvider destruido');
    }
}

export { EPGDataProvider };