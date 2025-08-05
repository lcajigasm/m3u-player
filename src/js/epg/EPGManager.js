/**
 * EPG Manager - Coordinador principal del sistema EPG
 * Gestiona el ciclo de vida de los datos EPG y la integración con el reproductor
 */

/**
 * @typedef {Object} EPGProgram
 * @property {string} id - Identificador único del programa
 * @property {string} channelId - ID del canal
 * @property {string} title - Título del programa
 * @property {string} [description] - Descripción del programa
 * @property {Date} startTime - Hora de inicio
 * @property {Date} endTime - Hora de finalización
 * @property {number} duration - Duración en minutos
 * @property {string[]} [genre] - Géneros del programa
 * @property {string} [rating] - Clasificación por edad
 * @property {Object} [episode] - Información del episodio
 * @property {number} [episode.season] - Temporada
 * @property {number} [episode.episode] - Número de episodio
 * @property {string} [episode.title] - Título del episodio
 * @property {Object} [credits] - Créditos del programa
 * @property {string[]} [credits.director] - Directores
 * @property {string[]} [credits.actor] - Actores
 * @property {string[]} [credits.writer] - Escritores
 */

/**
 * @typedef {Object} EPGChannel
 * @property {string} id - Identificador único del canal
 * @property {string} name - Nombre del canal
 * @property {string} [logo] - URL del logo del canal
 * @property {string} [group] - Grupo del canal
 * @property {EPGProgram[]} programs - Lista de programas
 * @property {Date} lastUpdated - Última actualización
 */

/**
 * @typedef {Object} Reminder
 * @property {string} id - Identificador único del recordatorio
 * @property {string} programId - ID del programa
 * @property {string} channelId - ID del canal
 * @property {string} title - Título del programa
 * @property {Date} startTime - Hora de inicio del programa
 * @property {Date} notificationTime - Hora de notificación
 * @property {'pending'|'notified'|'executed'|'cancelled'} status - Estado del recordatorio
 */

class EPGManager {
    /**
     * @param {M3UPlayer} player - Instancia del reproductor principal
     */
    constructor(player) {
        this.player = player;
        this.dataProvider = null;
        this.cache = null;
        this.renderer = null;
        this.reminderManager = null;
        this.searchManager = null;
        this.isInitialized = false;
        this.updateInterval = null;
        this.channels = new Map();
        this.eventListeners = {};
        
        console.log('📺 EPGManager inicializado');
    }

    /**
     * Inicializa el sistema EPG
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Importar dinámicamente las dependencias EPG
            const { EPGDataProvider } = await import('./EPGDataProvider.js');
            const { EPGCache } = await import('./EPGCache.js');
            const { EPGRenderer } = await import('./EPGRenderer.js');
            const { ReminderManager } = await import('./reminders/ReminderManager.js');
            const { EPGSearchManager } = await import('./EPGSearchManager.js');

            // Inicializar componentes
            this.dataProvider = new EPGDataProvider(this.getEPGConfig());
            this.cache = new EPGCache();
            this.renderer = new EPGRenderer(this.getEPGContainer());
            this.reminderManager = new ReminderManager(this.player);
            this.searchManager = new EPGSearchManager();

            // Configurar eventos
            this.setupEventListeners();

            // Inicializar interfaz de búsqueda
            await this.renderer.initializeSearchUI(this);

            // Configurar actualización automática
            this.setupAutoUpdate();

            this.isInitialized = true;
            console.log('✅ Sistema EPG inicializado correctamente');

        } catch (error) {
            console.error('❌ Error inicializando EPG:', error);
            throw error;
        }
    }

    /**
     * Carga datos EPG para los canales proporcionados
     * @param {Array} channels - Lista de canales del reproductor
     * @returns {Promise<void>}
     */
    async loadEPGData(channels) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log(`📡 Cargando datos EPG para ${channels.length} canales...`);

            // Intentar cargar desde caché primero
            const cachedData = await this.cache.retrieveMultiple(
                channels.map(ch => ch.tvgId || ch.name),
                this.getTimeRange()
            );

            // Identificar canales que necesitan actualización
            const channelsToUpdate = channels.filter(channel => {
                const channelId = channel.tvgId || channel.name;
                const cached = cachedData.get(channelId);
                return !cached || this.cache.isExpired(cached.lastUpdated);
            });

            if (channelsToUpdate.length > 0) {
                console.log(`🔄 Actualizando ${channelsToUpdate.length} canales...`);
                
                // Obtener datos frescos
                const freshData = await this.dataProvider.fetchEPGData(channelsToUpdate);
                
                // Almacenar en caché
                for (const [channelId, programs] of freshData) {
                    await this.cache.store(channelId, programs);
                    this.channels.set(channelId, {
                        id: channelId,
                        name: this.findChannelName(channelId, channels),
                        programs: programs,
                        lastUpdated: new Date()
                    });
                }
            }

            // Combinar datos cacheados y frescos
            for (const [channelId, data] of cachedData) {
                if (!this.channels.has(channelId)) {
                    this.channels.set(channelId, data);
                }
            }

            console.log(`✅ Datos EPG cargados para ${this.channels.size} canales`);
            
            // Construir índice de búsqueda
            if (this.searchManager) {
                this.searchManager.buildSearchIndex(Array.from(this.channels.values()));
            }
            
            // Emitir evento de datos cargados
            this.emit('dataLoaded', this.channels.size);

        } catch (error) {
            console.error('❌ Error cargando datos EPG:', error);
            this.emit('dataLoadError', error);
            // Continuar sin EPG en caso de error
        }
    }

    /**
     * Muestra la grilla EPG
     */
    showEPGGrid() {
        if (!this.isInitialized || !this.renderer) {
            console.warn('⚠️ EPG no inicializado');
            return;
        }

        const channelsArray = Array.from(this.channels.values());
        const timeRange = this.getTimeRange();
        
        this.renderer.renderGrid(channelsArray, timeRange);
        this.renderer.show();
        
        console.log('📺 Grilla EPG mostrada');
    }

    /**
     * Oculta la grilla EPG
     */
    hideEPGGrid() {
        if (this.renderer) {
            this.renderer.hide();
            console.log('📺 Grilla EPG ocultada');
        }
    }

    /**
     * Obtiene el programa actual para un canal
     * @param {string} channelId - ID del canal
     * @returns {EPGProgram|null}
     */
    getCurrentProgram(channelId) {
        const channel = this.channels.get(channelId);
        if (!channel || !channel.programs) {
            return null;
        }

        const now = new Date();
        return channel.programs.find(program => 
            program.startTime <= now && program.endTime > now
        ) || null;
    }

    /**
     * Busca programas por término de búsqueda
     * @param {string} query - Término de búsqueda
     * @returns {Object[]} Resultados de búsqueda con score y datos adicionales
     */
    searchPrograms(query) {
        if (!this.searchManager) {
            console.warn('⚠️ SearchManager no inicializado');
            return [];
        }

        return this.searchManager.search(query);
    }

    /**
     * Busca programas con debouncing
     * @param {string} query - Término de búsqueda
     * @param {Function} callback - Callback con resultados
     */
    searchProgramsWithDebounce(query, callback) {
        if (!this.searchManager) {
            console.warn('⚠️ SearchManager no inicializado');
            callback([]);
            return;
        }

        this.searchManager.searchWithDebounce(query, callback);
    }

    /**
     * Obtiene sugerencias de búsqueda
     * @param {string} partialQuery - Consulta parcial
     * @param {number} maxSuggestions - Máximo número de sugerencias
     * @returns {string[]} Lista de sugerencias
     */
    getSearchSuggestions(partialQuery, maxSuggestions = 5) {
        if (!this.searchManager) {
            return [];
        }

        return this.searchManager.getSuggestions(partialQuery, maxSuggestions);
    }

    /**
     * Establece filtros de búsqueda
     * @param {Object} filters - Filtros {genre, channel, timeRange}
     */
    setSearchFilters(filters) {
        if (!this.searchManager) {
            console.warn('⚠️ SearchManager no inicializado');
            return;
        }

        if (filters.genre !== undefined) {
            this.searchManager.setGenreFilter(filters.genre);
        }
        if (filters.channel !== undefined) {
            this.searchManager.setChannelFilter(filters.channel);
        }
        if (filters.timeRange !== undefined) {
            this.searchManager.setTimeRangeFilter(filters.timeRange);
        }
    }

    /**
     * Limpia filtros de búsqueda
     */
    clearSearchFilters() {
        if (this.searchManager) {
            this.searchManager.clearFilters();
        }
    }

    /**
     * Obtiene géneros disponibles para filtros
     * @returns {string[]} Lista de géneros
     */
    getAvailableGenres() {
        if (!this.searchManager) {
            return [];
        }

        return this.searchManager.getAvailableGenres();
    }

    /**
     * Obtiene canales disponibles para filtros
     * @returns {Object[]} Lista de canales
     */
    getAvailableChannels() {
        if (!this.searchManager) {
            return [];
        }

        return this.searchManager.getAvailableChannels();
    }

    /**
     * Obtiene estadísticas de búsqueda
     * @returns {Object} Estadísticas
     */
    getSearchStats() {
        if (!this.searchManager) {
            return null;
        }

        return this.searchManager.getSearchStats();
    }

    /**
     * Configura un recordatorio para un programa
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @param {Date} startTime - Hora de inicio del programa
     * @returns {Promise<string>} ID del recordatorio creado
     */
    async setReminder(programId, channelId, startTime) {
        if (!this.reminderManager) {
            throw new Error('ReminderManager no inicializado');
        }

        return await this.reminderManager.addReminder(programId, channelId, startTime);
    }

    /**
     * Configura los event listeners
     * @private
     */
    setupEventListeners() {
        // Crear sistema de eventos personalizado si no existe
        if (!this.player.eventListeners) {
            this.player.eventListeners = {};
        }

        // Método para emitir eventos
        if (!this.player.emit) {
            this.player.emit = (eventName, data) => {
                if (this.player.eventListeners[eventName]) {
                    this.player.eventListeners[eventName].forEach(callback => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error(`Error en event listener ${eventName}:`, error);
                        }
                    });
                }
            };
        }

        // Método para escuchar eventos
        if (!this.player.on) {
            this.player.on = (eventName, callback) => {
                if (!this.player.eventListeners[eventName]) {
                    this.player.eventListeners[eventName] = [];
                }
                this.player.eventListeners[eventName].push(callback);
            };
        }

        // Escuchar eventos del reproductor
        this.player.on('playlistLoaded', (channels) => {
            console.log('📺 EPG: Playlist cargada, iniciando carga de datos EPG');
            this.loadEPGData(channels);
        });

        this.player.on('channelChanged', (channelIndex) => {
            console.log(`📺 EPG: Canal cambiado a índice ${channelIndex}`);
            this.updateCurrentProgramInfo(channelIndex);
        });

        // Escuchar eventos EPG internos
        this.on('dataLoaded', (channelCount) => {
            console.log(`📺 EPG: Datos cargados para ${channelCount} canales`);
            this.player.emit('epgDataLoaded', { channelCount });
        });

        this.on('programChanged', (program) => {
            console.log(`📺 EPG: Programa actual cambiado: ${program?.title || 'Sin programa'}`);
            this.player.emit('epgProgramChanged', program);
        });
    }

    /**
     * Configura la actualización automática
     * @private
     */
    setupAutoUpdate() {
        const config = this.getEPGConfig();
        
        if (!config.autoUpdate) {
            console.log('⏰ Actualización automática deshabilitada');
            return;
        }

        const intervalMs = (config.updateInterval || 30) * 60 * 1000; // Convertir a ms
        this.lastPlaylistHash = null;
        this.lastUpdateTime = new Date();

        // Configurar actualización periódica
        this.updateInterval = setInterval(() => {
            this.performAutoUpdate();
        }, intervalMs);

        // Configurar detección de cambios en playlist
        this.setupPlaylistChangeDetection();

        console.log(`⏰ Actualización automática configurada cada ${config.updateInterval || 30} minutos`);
    }

    /**
     * Realiza una actualización automática de datos EPG
     * @private
     */
    async performAutoUpdate() {
        if (!this.player.playlistData || this.player.playlistData.length === 0) {
            console.log('⏰ No hay playlist cargada, omitiendo actualización automática');
            return;
        }

        try {
            console.log('⏰ Iniciando actualización automática de datos EPG...');
            
            // Verificar si hay reproducción activa
            const isPlaying = this.player.videoPlayer && !this.player.videoPlayer.paused;
            
            if (isPlaying) {
                console.log('⏰ Reproducción activa, actualizando en background...');
            }

            // Realizar actualización en background
            await this.loadEPGDataInBackground(this.player.playlistData);
            
            this.lastUpdateTime = new Date();
            this.emit('autoUpdateCompleted', {
                timestamp: this.lastUpdateTime,
                channelCount: this.channels.size,
                wasPlaying: isPlaying
            });

            console.log('✅ Actualización automática completada');

        } catch (error) {
            console.error('❌ Error en actualización automática:', error);
            this.emit('autoUpdateError', error);
        }
    }

    /**
     * Carga datos EPG en background sin interrumpir la reproducción
     * @param {Array} channels - Lista de canales
     * @private
     */
    async loadEPGDataInBackground(channels) {
        try {
            // Usar un timeout más corto para operaciones en background
            const originalTimeout = this.dataProvider?.timeout;
            if (this.dataProvider) {
                this.dataProvider.timeout = 10000; // 10 segundos para background
            }

            // Cargar solo canales que realmente necesitan actualización
            const channelsToUpdate = channels.filter(channel => {
                const channelId = channel.tvgId || channel.name;
                const channelData = this.channels.get(channelId);
                
                if (!channelData) return true;
                
                // Actualizar si los datos tienen más de 2 horas
                const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
                return channelData.lastUpdated < twoHoursAgo;
            });

            if (channelsToUpdate.length === 0) {
                console.log('⏰ Todos los canales tienen datos recientes');
                return;
            }

            console.log(`⏰ Actualizando ${channelsToUpdate.length} canales en background`);

            // Procesar en lotes pequeños para no sobrecargar
            const batchSize = 10;
            for (let i = 0; i < channelsToUpdate.length; i += batchSize) {
                const batch = channelsToUpdate.slice(i, i + batchSize);
                
                try {
                    const freshData = await this.dataProvider.fetchEPGData(batch);
                    
                    // Almacenar datos actualizados
                    for (const [channelId, programs] of freshData) {
                        await this.cache.store(channelId, programs);
                        this.channels.set(channelId, {
                            id: channelId,
                            name: this.findChannelName(channelId, channels),
                            programs: programs,
                            lastUpdated: new Date()
                        });
                    }
                    
                    // Pequeña pausa entre lotes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (batchError) {
                    console.warn(`⚠️ Error actualizando lote ${i}-${i + batchSize}:`, batchError);
                }
            }

            // Restaurar timeout original
            if (this.dataProvider && originalTimeout) {
                this.dataProvider.timeout = originalTimeout;
            }

        } catch (error) {
            console.error('❌ Error en carga background:', error);
            throw error;
        }
    }

    /**
     * Configura la detección de cambios en playlist
     * @private
     */
    setupPlaylistChangeDetection() {
        // Escuchar eventos de playlist
        this.player.on('playlistLoaded', (channels) => {
            const newHash = this.calculatePlaylistHash(channels);
            
            if (this.lastPlaylistHash && this.lastPlaylistHash !== newHash) {
                console.log('📋 Cambio en playlist detectado, actualizando EPG...');
                this.emit('playlistChanged', { 
                    oldHash: this.lastPlaylistHash, 
                    newHash: newHash 
                });
                
                // Actualizar inmediatamente cuando cambia la playlist
                setTimeout(() => {
                    this.loadEPGData(channels);
                }, 500);
            }
            
            this.lastPlaylistHash = newHash;
        });

        // Verificación periódica adicional (cada 5 minutos)
        setInterval(() => {
            if (this.player.playlistData) {
                const currentHash = this.calculatePlaylistHash(this.player.playlistData);
                if (this.lastPlaylistHash !== currentHash) {
                    console.log('📋 Cambio en playlist detectado en verificación periódica');
                    this.lastPlaylistHash = currentHash;
                    this.loadEPGData(this.player.playlistData);
                }
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Calcula un hash simple de la playlist para detectar cambios
     * @param {Array} channels - Lista de canales
     * @returns {string}
     * @private
     */
    calculatePlaylistHash(channels) {
        if (!channels || channels.length === 0) return '';
        
        // Crear hash basado en URLs y nombres de canales
        const hashString = channels
            .map(ch => `${ch.name}|${ch.url}|${ch.tvgId || ''}`)
            .join('::');
            
        // Hash simple usando suma de códigos de caracteres
        let hash = 0;
        for (let i = 0; i < hashString.length; i++) {
            const char = hashString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        
        return hash.toString(36);
    }

    /**
     * Actualiza la información del programa actual en la UI
     * @param {number} channelIndex - Índice del canal actual
     * @private
     */
    updateCurrentProgramInfo(channelIndex) {
        if (!this.player.playlistData || channelIndex < 0) return;

        const channel = this.player.playlistData[channelIndex];
        const channelId = channel.tvgId || channel.name;
        const currentProgram = this.getCurrentProgram(channelId);

        // Actualizar elementos de la UI si existen
        const currentProgramTitle = document.getElementById('currentProgramTitle');
        const currentProgramTime = document.getElementById('currentProgramTime');

        if (currentProgramTitle && currentProgramTime) {
            if (currentProgram) {
                currentProgramTitle.textContent = currentProgram.title;
                currentProgramTime.textContent = this.formatTimeRange(
                    currentProgram.startTime, 
                    currentProgram.endTime
                );
                
                // Añadir clase para indicar que hay información EPG
                currentProgramTitle.classList.add('has-epg-info');
                currentProgramTime.classList.add('has-epg-info');
            } else {
                currentProgramTitle.textContent = 'Programa actual';
                currentProgramTime.textContent = '--:-- - --:--';
                
                // Remover clase EPG
                currentProgramTitle.classList.remove('has-epg-info');
                currentProgramTime.classList.remove('has-epg-info');
            }
        }

        // Emitir evento de cambio de programa
        this.emit('programChanged', currentProgram);
    }

    /**
     * Obtiene la configuración EPG
     * @returns {Object}
     * @private
     */
    getEPGConfig() {
        // Intentar cargar configuración del reproductor si existe
        const playerConfig = this.player.config?.epgSettings || {};
        
        return {
            autoUpdate: playerConfig.autoUpdate !== undefined ? playerConfig.autoUpdate : true,
            updateInterval: playerConfig.updateInterval || 30, // minutos
            cacheRetention: playerConfig.cacheRetention || 7, // días
            defaultTimeRange: playerConfig.defaultTimeRange || 24, // horas
            reminderAdvance: playerConfig.reminderAdvance || 5, // minutos
            dataSources: playerConfig.dataSources || ['auto'],
            theme: playerConfig.theme || 'dark'
        };
    }

    /**
     * Actualiza la configuración EPG
     * @param {Object} newConfig - Nueva configuración
     */
    updateEPGConfig(newConfig) {
        // Guardar en configuración del reproductor
        if (!this.player.config) {
            this.player.config = {};
        }
        if (!this.player.config.epgSettings) {
            this.player.config.epgSettings = {};
        }
        
        Object.assign(this.player.config.epgSettings, newConfig);
        
        // Reconfigurar actualización automática si cambió el intervalo
        if (newConfig.updateInterval || newConfig.autoUpdate !== undefined) {
            this.reconfigureAutoUpdate();
        }
        
        console.log('⚙️ Configuración EPG actualizada:', newConfig);
        this.emit('configUpdated', this.getEPGConfig());
    }

    /**
     * Reconfigura la actualización automática con nueva configuración
     * @private
     */
    reconfigureAutoUpdate() {
        // Limpiar intervalo existente
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Reconfigurar con nueva configuración
        this.setupAutoUpdate();
        
        console.log('🔄 Actualización automática reconfigurada');
    }

    /**
     * Fuerza una actualización inmediata de datos EPG
     * @returns {Promise<void>}
     */
    async forceUpdate() {
        if (!this.player.playlistData || this.player.playlistData.length === 0) {
            throw new Error('No hay playlist cargada para actualizar');
        }

        console.log('🔄 Forzando actualización inmediata de EPG...');
        
        try {
            await this.loadEPGData(this.player.playlistData);
            this.lastUpdateTime = new Date();
            
            this.emit('forceUpdateCompleted', {
                timestamp: this.lastUpdateTime,
                channelCount: this.channels.size
            });
            
            console.log('✅ Actualización forzada completada');
            
        } catch (error) {
            console.error('❌ Error en actualización forzada:', error);
            this.emit('forceUpdateError', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de actualización
     * @returns {Object}
     */
    getUpdateStats() {
        return {
            lastUpdateTime: this.lastUpdateTime,
            channelCount: this.channels.size,
            autoUpdateEnabled: this.getEPGConfig().autoUpdate,
            updateInterval: this.getEPGConfig().updateInterval,
            playlistHash: this.lastPlaylistHash,
            cacheStats: this.cache?.getStorageStats() || null
        };
    }

    /**
     * Obtiene el contenedor para el EPG
     * @returns {HTMLElement}
     * @private
     */
    getEPGContainer() {
        let container = document.getElementById('epgModal');
        if (!container) {
            // Crear contenedor si no existe
            container = document.createElement('div');
            container.id = 'epgModal';
            container.className = 'modal epg-modal';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Obtiene el rango de tiempo para cargar datos EPG
     * @returns {Object}
     * @private
     */
    getTimeRange() {
        const now = new Date();
        const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 horas atrás
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas adelante
        
        return { start, end };
    }

    /**
     * Encuentra el nombre del canal por ID
     * @param {string} channelId - ID del canal
     * @param {Array} channels - Lista de canales
     * @returns {string}
     * @private
     */
    findChannelName(channelId, channels) {
        const channel = channels.find(ch => 
            ch.tvgId === channelId || ch.name === channelId
        );
        return channel ? channel.name : channelId;
    }

    /**
     * Formatea un rango de tiempo
     * @param {Date} start - Hora de inicio
     * @param {Date} end - Hora de fin
     * @returns {string}
     * @private
     */
    formatTimeRange(start, end) {
        const formatTime = (date) => {
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        };

        return `${formatTime(start)} - ${formatTime(end)}`;
    }

    /**
     * Sistema de eventos interno del EPGManager
     */
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }

    emit(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en EPG event listener ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Limpia recursos y detiene actualizaciones
     */
    destroy() {
        // Limpiar intervalos de actualización
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Limpiar otros componentes
        if (this.cache) {
            this.cache.cleanup();
        }

        if (this.reminderManager) {
            this.reminderManager.destroy();
        }

        if (this.searchManager) {
            this.searchManager.destroy();
        }

        // Limpiar datos
        this.channels.clear();
        this.eventListeners = {};
        this.lastPlaylistHash = null;
        this.lastUpdateTime = null;
        this.isInitialized = false;
        
        console.log('🧹 EPGManager destruido');
    }
}

export { EPGManager };