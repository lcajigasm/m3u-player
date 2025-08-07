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
        
        // EPGManager initialized
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
            const { IPTVOrgIntegration } = await import('./IPTVOrgIntegration.js');
            const { AutoEPGDownloader } = await import('./AutoEPGDownloader.js');

            // Inicializar componentes
            this.dataProvider = new EPGDataProvider(this.getEPGConfig());
            this.cache = new EPGCache();
            this.renderer = new EPGRenderer(this.getEPGContainer());
            this.reminderManager = new ReminderManager(this.player);
            this.searchManager = new EPGSearchManager();
            
            // Inicializar integración con iptv-org
            this.iptvOrgIntegration = new IPTVOrgIntegration();
            await this.iptvOrgIntegration.initialize();
            
            // Inicializar descargador automático
            this.autoDownloader = new AutoEPGDownloader(this.iptvOrgIntegration);
            await this.autoDownloader.initialize();

            // Configurar eventos
            this.setupEventListeners();

            // Inicializar interfaz de búsqueda
            await this.renderer.initializeSearchUI(this);

            // Configurar actualización automática
            this.setupAutoUpdate();

            this.isInitialized = true;
            // EPG system initialized

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
            // Loading EPG data for channels
            
            // Debug: Mostrar estructura de los primeros canales
            if (channels.length > 0) {
                console.log('🔍 Estructura del primer canal:', channels[0]);
                console.log('🔍 Propiedades disponibles:', Object.keys(channels[0] || {}));
            }

            // 1. Mapear canales M3U con iptv-org
            // Mapping channels with iptv-org database
            const channelMapping = this.iptvOrgIntegration.mapM3UChannels(channels);
            // Channels mapped successfully

            // 2. Intentar cargar desde caché local primero
            const cachedData = new Map();
            const channelsNeedingUpdate = [];

            for (const channel of channels) {
                const channelId = channel.tvgId || channel.name;
                const iptvOrgId = channelMapping.get(channelId);
                
                if (iptvOrgId) {
                    // Verificar cache local del descargador automático
                    const cachedPrograms = this.autoDownloader.getEPGFromCache(iptvOrgId);
                    
                    if (cachedPrograms && cachedPrograms.length > 0) {
                        cachedData.set(channelId, {
                            id: channelId,
                            name: channel.name,
                            programs: cachedPrograms,
                            lastUpdated: new Date(),
                            source: 'iptv-org-cache'
                        });
                        // EPG loaded from cache
                    } else {
                        channelsNeedingUpdate.push({
                            ...channel,
                            iptvOrgId: iptvOrgId
                        });
                    }
                } else {
                    // Canal no mapeado, intentar con fuentes tradicionales
                    channelsNeedingUpdate.push(channel);
                }
            }

            // 3. Descargar datos faltantes
            if (channelsNeedingUpdate.length > 0) {
                // Downloading EPG for channels needing update
                
                await this.downloadMissingEPGData(channelsNeedingUpdate, cachedData);
            }

            // 4. Aplicar datos cacheados y nuevos
            for (const [channelId, data] of cachedData) {
                this.channels.set(channelId, data);
            }

            // EPG data loaded
            
            // 5. Construir índice de búsqueda
            if (this.searchManager) {
                this.searchManager.buildSearchIndex(Array.from(this.channels.values()));
            }
            
            // 6. Programar descarga automática si no está configurada
            if (this.autoDownloader && channelMapping.size > 0) {
                // Scheduling automatic EPG download
                // No forzar descarga inmediata, dejar que el programador lo maneje
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
     * Descarga datos EPG faltantes
     * @param {Array} channels - Canales que necesitan descarga
     * @param {Map} cachedData - Datos ya cacheados
     * @returns {Promise<void>}
     */
    async downloadMissingEPGData(channels, cachedData) {
        const downloadPromises = [];
        const maxConcurrent = 3; // Limitar descargas concurrentes
        
        for (let i = 0; i < channels.length; i += maxConcurrent) {
            const batch = channels.slice(i, i + maxConcurrent);
            
            const batchPromises = batch.map(async (channel) => {
                try {
                    const channelId = channel.tvgId || channel.name;
                    let programs = [];
                    
                    if (channel.iptvOrgId) {
                        // Usar integración iptv-org
                        // Downloading EPG from iptv-org
                        programs = await this.iptvOrgIntegration.getChannelEPG(channel.iptvOrgId);
                        
                        if (programs.length > 0) {
                            // Guardar en cache del descargador
                            await this.autoDownloader.saveEPGToCache(channel.iptvOrgId, programs);
                        }
                    }
                    
                    // Fallback a fuentes tradicionales si no se obtuvieron datos
                    if (programs.length === 0) {
                        // Fallback to traditional sources
                        const traditionalData = await this.dataProvider.fetchEPGData([channel]);
                        programs = traditionalData.get(channelId) || [];
                    }
                    
                    if (programs.length > 0) {
                        cachedData.set(channelId, {
                            id: channelId,
                            name: channel.name,
                            programs: programs,
                            lastUpdated: new Date(),
                            source: channel.iptvOrgId ? 'iptv-org' : 'traditional'
                        });
                        
                        // Almacenar en caché tradicional también
                        await this.cache.store(channelId, programs);
                        
                        // EPG downloaded successfully
                    } else {
                        console.warn(`⚠️ No se pudo obtener EPG para: ${channel.name}`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error descargando EPG para ${channel.name}:`, error);
                }
            });
            
            await Promise.allSettled(batchPromises);
            
            // Pausa entre lotes para evitar sobrecargar servidores
            if (i + maxConcurrent < channels.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Muestra la grilla EPG
     */
    showEPGGrid() {
        if (!this.isInitialized || !this.renderer) {
            console.warn('⚠️ EPG no inicializado, mostrando modal básico...');
            this.showBasicEPGModal();
            return;
        }

        const channelsArray = Array.from(this.channels.values());
        const timeRange = this.getTimeRange();
        
        this.renderer.renderGrid(channelsArray, timeRange);
        this.renderer.show();
        
        // EPG grid shown
    }

    /**
     * Muestra modal EPG básico cuando el sistema no está inicializado
     */
    showBasicEPGModal() {
        const epgModal = document.getElementById('epgModal');
        if (!epgModal) {
            console.error('❌ Modal EPG no encontrado');
            return;
        }

        // Mostrar modal
        epgModal.style.display = 'flex';
        epgModal.classList.add('show');

        // Obtener información del canal actual
        const currentChannel = this.getCurrentChannelInfo();
        const channelCount = this.player.playlistData ? this.player.playlistData.length : 0;
        const loadedChannels = this.channels.size;

        // Agregar contenido básico
        const container = epgModal.querySelector('.epg-grid-container');
        if (container) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: white;">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 15px; padding: 30px; margin: 20px 0;">
                        <h2 style="margin: 0 0 20px 0; font-size: 2rem;">📺 Electronic Program Guide</h2>
                        
                        ${currentChannel ? `
                            <div style="background: rgba(255,255,255,0.15); border-radius: 10px; padding: 20px; margin: 20px 0;">
                                <h3 style="margin: 0 0 10px 0; color: #fbbf24;">📡 Canal Actual:</h3>
                                <p style="font-size: 1.2rem; margin: 5px 0; font-weight: bold;">${currentChannel.name}</p>
                                ${currentChannel.group ? `<p style="opacity: 0.8; margin: 5px 0;">Grupo: ${currentChannel.group}</p>` : ''}
                            </div>
                        ` : ''}
                        
                        <div style="background: rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin: 25px 0; text-align: left;">
                            <h3 style="margin: 0 0 15px 0; color: #fbbf24;">🔄 Estado del Sistema:</h3>
                            <p style="margin: 8px 0;">✅ Modal EPG funcionando</p>
                            <p style="margin: 8px 0;">� Canales en playlist: ${channelCount}</p>
                            <p style="margin: 8px 0;">${loadedChannels > 0 ? `✅ Canales con EPG: ${loadedChannels}` : '�🔄 Cargando datos de programación...'}</p>
                            <p style="margin: 8px 0;">⏳ Descargando guía de iptv.org...</p>
                        </div>
                        
                        <div style="margin: 25px 0;">
                            <button onclick="document.getElementById('epgModal').style.display='none'" 
                                    style="background: #4ade80; color: white; border: none; padding: 12px 24px; border-radius: 8px; margin: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">
                                ✅ Cerrar
                            </button>
                            <button onclick="window.player.epgManager.retryEPGLoad()" 
                                    style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; margin: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">
                                🔄 Reintentar EPG
                            </button>
                            <button onclick="location.reload()" 
                                    style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 8px; margin: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">
                                🔄 Recargar App
                            </button>
                        </div>
                        
                        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 20px;">
                            ${channelCount > 0 ? 
                                'El EPG se está cargando en segundo plano para los canales de la playlist.<br>La funcionalidad completa estará disponible pronto.' :
                                'Carga una playlist primero para ver la guía de programación.<br>Ve a Dashboard → Load File o Load URL.'
                            }
                        </p>
                    </div>
                </div>
            `;
        }

        // Basic EPG modal shown
    }

    /**
     * Obtiene información del canal actual
     * @returns {Object|null}
     */
    getCurrentChannelInfo() {
        if (!this.player.playlistData || this.player.currentIndex < 0) {
            return null;
        }

        const current = this.player.playlistData[this.player.currentIndex];
        return current ? {
            name: current.name || 'Canal sin nombre',
            group: current.group || null,
            index: this.player.currentIndex
        } : null;
    }

    /**
     * Reintenta la carga de EPG
     */
    async retryEPGLoad() {
        // Retrying EPG load
        
        if (!this.player.playlistData || this.player.playlistData.length === 0) {
            alert('⚠️ No hay playlist cargada.\nCarga una playlist primero desde Dashboard.');
            return;
        }

        try {
            await this.loadEPGData(this.player.playlistData);
            // EPG reloaded successfully
            
            // Cerrar modal y abrir EPG normal
            document.getElementById('epgModal').style.display = 'none';
            
            // Esperar un momento y mostrar EPG real
            setTimeout(() => {
                this.showEPGGrid();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error reintentando carga EPG:', error);
            alert('❌ Error cargando EPG: ' + error.message);
        }
    }

    /**
     * Oculta la grilla EPG
     */
    hideEPGGrid() {
        if (this.renderer) {
            this.renderer.hide();
            // EPG grid hidden
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
            // EPG: Playlist loaded, starting EPG data load
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
        const baseStats = {
            lastUpdateTime: this.lastUpdateTime,
            channelCount: this.channels.size,
            autoUpdateEnabled: this.getEPGConfig().autoUpdate,
            updateInterval: this.getEPGConfig().updateInterval,
            playlistHash: this.lastPlaylistHash,
            cacheStats: this.cache?.getStorageStats() || null
        };
        
        // Agregar estadísticas de iptv-org si está disponible
        if (this.iptvOrgIntegration) {
            baseStats.iptvOrgStats = this.iptvOrgIntegration.getStats();
        }
        
        // Agregar estadísticas del descargador automático
        if (this.autoDownloader) {
            baseStats.downloadStats = this.autoDownloader.getDownloadStats();
        }
        
        return baseStats;
    }

    /**
     * Busca canales en la base de datos iptv-org
     * @param {string} query - Consulta de búsqueda
     * @param {Object} filters - Filtros opcionales
     * @returns {Array} Canales encontrados
     */
    searchIPTVOrgChannels(query, filters = {}) {
        if (!this.iptvOrgIntegration) {
            console.warn('⚠️ Integración iptv-org no disponible');
            return [];
        }
        
        return this.iptvOrgIntegration.searchChannels(query, filters);
    }

    /**
     * Fuerza descarga inmediata de EPG
     * @param {Array} channels - Canales específicos (opcional)
     * @returns {Promise<void>}
     */
    async forceEPGDownload(channels = null) {
        if (!this.autoDownloader) {
            console.warn('⚠️ Descargador automático no disponible');
            return;
        }
        
        try {
            console.log('⚡ Forzando descarga inmediata de EPG...');
            await this.autoDownloader.forceDownload(channels);
            
            // Recargar datos después de la descarga
            if (this.player.playlistData) {
                await this.loadEPGData(this.player.playlistData);
            }
            
            this.emit('forceDownloadCompleted', {
                timestamp: new Date(),
                channelCount: channels ? channels.length : 'all'
            });
            
            console.log('✅ Descarga forzada completada');
            
        } catch (error) {
            console.error('❌ Error en descarga forzada:', error);
            this.emit('forceDownloadError', error);
            throw error;
        }
    }

    /**
     * Configura el descargador automático
     * @param {Object} config - Nueva configuración
     */
    configureAutoDownloader(config) {
        if (!this.autoDownloader) {
            console.warn('⚠️ Descargador automático no disponible');
            return;
        }
        
        this.autoDownloader.updateConfig(config);
        console.log('⚙️ Configuración del descargador automático actualizada');
    }

    /**
     * Obtiene información sobre el mapeo de canales
     * @returns {Object} Información de mapeo
     */
    getChannelMappingInfo() {
        if (!this.iptvOrgIntegration) {
            return { mapped: 0, total: 0, mappings: [] };
        }
        
        const mappings = [];
        for (const [m3uChannel, iptvOrgId] of this.iptvOrgIntegration.channelMapping) {
            mappings.push({
                m3uChannel: m3uChannel,
                iptvOrgId: iptvOrgId,
                hasEPG: this.autoDownloader ? 
                    !!this.autoDownloader.getEPGFromCache(iptvOrgId) : false
            });
        }
        
        return {
            mapped: this.iptvOrgIntegration.channelMapping.size,
            total: this.player.playlistData ? this.player.playlistData.length : 0,
            mappings: mappings
        };
    }

    /**
     * Limpia el cache de EPG
     * @returns {Promise<void>}
     */
    async clearEPGCache() {
        try {
            // Limpiar cache tradicional
            if (this.cache) {
                await this.cache.clear();
            }
            
            // Limpiar cache del descargador automático
            if (this.autoDownloader) {
                await this.autoDownloader.cleanupOldData();
            }
            
            // Limpiar channels en memoria
            this.channels.clear();
            
            console.log('🗑️ Cache de EPG limpiado');
            
            this.emit('cacheCleared');
            
        } catch (error) {
            console.error('❌ Error limpiando cache:', error);
            throw error;
        }
    }

    /**
     * Exporta configuración de EPG
     * @returns {Object} Configuración exportable
     */
    exportEPGConfig() {
        const config = {
            epgConfig: this.getEPGConfig(),
            channelMappings: this.getChannelMappingInfo(),
            stats: this.getUpdateStats()
        };
        
        if (this.autoDownloader) {
            config.downloaderConfig = this.autoDownloader.getDownloadStats().config;
        }
        
        return config;
    }

    /**
     * Importa configuración de EPG
     * @param {Object} config - Configuración a importar
     * @returns {Promise<void>}
     */
    async importEPGConfig(config) {
        try {
            // Importar configuración del descargador si está disponible
            if (config.downloaderConfig && this.autoDownloader) {
                this.autoDownloader.updateConfig(config.downloaderConfig);
            }
            
            // Aplicar configuración EPG
            if (config.epgConfig) {
                // La configuración EPG se maneja en el player principal
                this.emit('configImported', config.epgConfig);
            }
            
            console.log('📥 Configuración EPG importada exitosamente');
            
        } catch (error) {
            console.error('❌ Error importando configuración:', error);
            throw error;
        }
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

        // Limpiar componentes tradicionales
        if (this.cache) {
            this.cache.cleanup();
        }

        if (this.reminderManager) {
            this.reminderManager.destroy();
        }

        if (this.searchManager) {
            this.searchManager.destroy();
        }

        // Limpiar nuevos componentes
        if (this.autoDownloader) {
            this.autoDownloader.destroy();
            this.autoDownloader = null;
        }

        if (this.iptvOrgIntegration) {
            this.iptvOrgIntegration.destroy();
            this.iptvOrgIntegration = null;
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