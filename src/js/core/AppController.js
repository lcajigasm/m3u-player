/**
 * AppController - Controlador principal de la aplicación
 * Orquesta todos los módulos y maneja el ciclo de vida de la aplicación
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from './EventBus.js';
import PlayerController from '../modules/PlayerController.js';
import PlaylistManager from '../modules/PlaylistManager.js';
import UIManager from '../modules/UIManager.js';
import ConfigManager from '../modules/ConfigManager.js';
import NetworkManager from '../modules/NetworkManager.js';

class AppController {
    constructor(options = {}) {
        this.eventBus = getEventBus();
        
        // Estado de la aplicación
        this.state = {
            initialized: false,
            ready: false,
            currentView: 'upload',
            error: null,
            version: '2.0.0'
        };

        // Configuración
        this.config = {
            enableDebugMode: options.enableDebugMode || false,
            enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
            autoSave: options.autoSave !== false,
            autoSaveInterval: options.autoSaveInterval || 30000,
            enableErrorReporting: options.enableErrorReporting !== false,
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000
        };

        // Módulos de la aplicación
        this.modules = {
            config: null,
            network: null,
            ui: null,
            playlist: null,
            player: null
        };

        // Elementos DOM principales
        this.elements = {
            app: null,
            videoElement: null,
            playlistContainer: null,
            controlsContainer: null
        };

        // Performance y métricas
        this.metrics = {
            startTime: performance.now(),
            loadTime: 0,
            moduleLoadTimes: new Map(),
            errors: [],
            retryAttempts: 0
        };

        // Timers
        this.autoSaveTimer = null;
        this.healthCheckTimer = null;

        this.init();
    }

    /**
     * Inicializar la aplicación
     */
    async init() {
        try {
            console.log('🚀 Initializing M3U Player Application v2.0.0...');
            
            // Configurar event bus para debug si es necesario
            if (this.config.enableDebugMode) {
                this.eventBus.debugMode = true;
            }

            // Inicializar módulos en orden de dependencia
            await this.initializeModules();
            
            // Configurar elementos DOM
            this.setupDOM();
            
            // Configurar event listeners principales
            this.setupEventListeners();
            
            // Configurar servicios de background
            this.setupBackgroundServices();
            
            // Marcar como inicializado
            this.state.initialized = true;
            this.metrics.loadTime = performance.now() - this.metrics.startTime;
            
            console.log(`✅ Application initialized in ${Math.round(this.metrics.loadTime)}ms`);
            
            // Emitir evento de inicialización
            this.eventBus.emit('app:initialized', {
                state: this.state,
                metrics: this.metrics,
                version: this.state.version
            });
            
            // Cargar estado anterior si existe
            await this.restorePreviousState();
            
            this.state.ready = true;
            this.eventBus.emit('app:ready', { version: this.state.version });
            
        } catch (error) {
            this.handleInitializationError(error);
        }
    }

    /**
     * Inicializar módulos de la aplicación
     */
    async initializeModules() {
        const moduleInitOrder = [
            { name: 'config', factory: () => new ConfigManager() },
            { name: 'network', factory: () => new NetworkManager() },
            { name: 'ui', factory: () => new UIManager() },
            { name: 'playlist', factory: () => new PlaylistManager() },
            { name: 'player', factory: () => new PlayerController() }
        ];

        for (const moduleConfig of moduleInitOrder) {
            const startTime = performance.now();
            
            try {
                console.log(`📦 Loading ${moduleConfig.name} module...`);
                
                this.modules[moduleConfig.name] = moduleConfig.factory();
                
                // Esperar a que el módulo esté listo si es necesario
                if (this.modules[moduleConfig.name].init) {
                    await this.modules[moduleConfig.name].init();
                }
                
                const loadTime = performance.now() - startTime;
                this.metrics.moduleLoadTimes.set(moduleConfig.name, loadTime);
                
                console.log(`✅ ${moduleConfig.name} module loaded in ${Math.round(loadTime)}ms`);
                
            } catch (error) {
                console.error(`❌ Failed to load ${moduleConfig.name} module:`, error);
                throw new Error(`Module initialization failed: ${moduleConfig.name}`);
            }
        }

        // Configurar integraciones entre módulos
        this.setupModuleIntegrations();
    }

    /**
     * Configurar integraciones entre módulos
     */
    setupModuleIntegrations() {
        // Conectar player con UI
        this.modules.ui.setVideoElement = (element) => {
            this.modules.player.setVideoElement(element);
            this.elements.videoElement = element;
        };

        // Conectar playlist con UI para renderizado
        this.modules.playlist.setRenderCallback((channels, container, options) => {
            return this.modules.ui.setupVirtualScrolling(
                container, 
                channels, 
                this.renderChannelItem.bind(this), 
                options
            );
        });

        // Conectar network con otros módulos
        this.modules.network.setConfigManager(this.modules.config);
        
        console.log('🔗 Module integrations configured');
    }

    /**
     * Configurar elementos DOM principales
     */
    setupDOM() {
        // Obtener elementos principales
        this.elements.app = document.getElementById('app') || document.body;
        this.elements.videoElement = document.getElementById('videoPlayer');
        this.elements.playlistContainer = document.getElementById('playlistContainer');
        this.elements.controlsContainer = document.getElementById('controlsContainer');

        // Configurar video element si existe
        if (this.elements.videoElement) {
            this.modules.player.setVideoElement(this.elements.videoElement);
        }

        // Configurar contenedores
        if (this.elements.app) {
            this.elements.app.setAttribute('data-app-version', this.state.version);
            this.elements.app.classList.add('app-initialized');
        }

        console.log('🏗️ DOM elements configured');
    }

    /**
     * Configurar event listeners principales
     */
    setupEventListeners() {
        // Eventos de aplicación
        this.eventBus.on('app:change-view', (event) => {
            this.changeView(event.data.view, event.data.options);
        });

        this.eventBus.on('app:load-playlist', (event) => {
            this.loadPlaylist(event.data.file, event.data.options);
        });

        this.eventBus.on('app:play-channel', (event) => {
            this.playChannel(event.data.channel, event.data.options);
        });

        this.eventBus.on('app:error', (event) => {
            this.handleError(event.data.error, event.data.context);
        });

        // Eventos de configuración
        this.eventBus.on('config:changed', (event) => {
            this.handleConfigChange(event.data.key, event.data.value);
        });

        // Eventos de UI
        this.eventBus.on('ui:theme-changed', (event) => {
            this.saveCurrentState();
        });

        // Eventos de playlist
        this.eventBus.on('playlist:loaded', (event) => {
            this.handlePlaylistLoaded(event.data);
        });

        this.eventBus.on('playlist:filtered', (event) => {
            this.handlePlaylistFiltered(event.data);
        });

        // Eventos de player
        this.eventBus.on('player:state-change', (event) => {
            this.handlePlayerStateChange(event.data);
        });

        this.eventBus.on('player:error', (event) => {
            this.handlePlayerError(event.data);
        });

        // Eventos del browser
        window.addEventListener('beforeunload', () => {
            this.saveCurrentState();
            this.cleanup();
        });

        window.addEventListener('unload', () => {
            this.destroy();
        });

        console.log('👂 Event listeners configured');
    }

    /**
     * Configurar servicios de background
     */
    setupBackgroundServices() {
        // Auto-save periódico
        if (this.config.autoSave) {
            this.autoSaveTimer = setInterval(() => {
                this.saveCurrentState();
            }, this.config.autoSaveInterval);
        }

        // Health check periódico
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, 60000); // Cada minuto

        console.log('⚙️ Background services configured');
    }

    /**
     * Cambiar vista de la aplicación
     * @param {string} view - Vista a mostrar
     * @param {Object} options - Opciones adicionales
     */
    async changeView(view, options = {}) {
        try {
            const oldView = this.state.currentView;
            this.state.currentView = view;

            await this.modules.ui.showView(view, options);

            this.eventBus.emit('app:view-changed', {
                oldView,
                newView: view,
                options
            });

        } catch (error) {
            console.error('❌ Error changing view:', error);
            this.handleError(error, { action: 'changeView', view });
        }
    }

    /**
     * Cargar playlist
     * @param {File|string} file - Archivo o contenido de playlist
     * @param {Object} options - Opciones de carga
     */
    async loadPlaylist(file, options = {}) {
        try {
            this.modules.ui.showLoadingIndicator('Loading playlist...');

            const playlist = await this.modules.playlist.loadPlaylist(file, options);
            
            // Cambiar a vista de player si se cargó exitosamente
            if (playlist && playlist.channels.length > 0) {
                await this.changeView('player');
            }

            this.modules.ui.hideLoadingIndicator();

        } catch (error) {
            this.modules.ui.hideLoadingIndicator();
            this.handleError(error, { action: 'loadPlaylist', file: file?.name });
        }
    }

    /**
     * Reproducir canal
     * @param {Object} channel - Canal a reproducir
     * @param {Object} options - Opciones de reproducción
     */
    async playChannel(channel, options = {}) {
        try {
            if (!channel || !channel.url) {
                throw new Error('Invalid channel data');
            }

            // Preparar información del stream
            const streamInfo = {
                url: channel.url,
                type: this.detectStreamType(channel.url),
                metadata: {
                    title: channel.name,
                    group: channel.group,
                    logo: channel.logo,
                    ...channel
                }
            };

            await this.modules.player.loadStream(streamInfo);

            // Auto-play si está habilitado
            if (this.modules.config.get('player.autoplay', true)) {
                await this.modules.player.play();
            }

        } catch (error) {
            this.handleError(error, { action: 'playChannel', channel: channel?.name });
        }
    }

    /**
     * Detectar tipo de stream
     * @param {string} url - URL del stream
     * @returns {string} Tipo de stream
     */
    detectStreamType(url) {
        if (url.includes('.m3u8')) return 'hls';
        if (url.includes('.mpd')) return 'dash';
        if (url.includes('rtmp://')) return 'rtmp';
        return 'direct';
    }

    /**
     * Renderizar item de canal
     * @param {Object} channel - Datos del canal
     * @param {number} index - Índice del canal
     * @returns {HTMLElement} Elemento HTML del canal
     */
    renderChannelItem(channel, index) {
        const element = document.createElement('div');
        element.className = 'channel-item';
        element.dataset.index = index;
        element.dataset.channelId = channel.id || index;

        element.innerHTML = `
            <div class="channel-logo">
                ${channel.logo ? 
                    `<img src="${channel.logo}" alt="${channel.name}" loading="lazy">` : 
                    '<div class="channel-logo-placeholder">📺</div>'
                }
            </div>
            <div class="channel-info">
                <h3 class="channel-name">${channel.name || 'Unknown Channel'}</h3>
                <p class="channel-group">${channel.group || 'General'}</p>
            </div>
            <div class="channel-actions">
                <button class="play-btn" title="Play">▶️</button>
                <button class="favorite-btn" title="Add to favorites">⭐</button>
            </div>
        `;

        // Event listeners para el canal
        const playBtn = element.querySelector('.play-btn');
        const favoriteBtn = element.querySelector('.favorite-btn');

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playChannel(channel);
        });

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChannelFavorite(channel);
        });

        element.addEventListener('click', () => {
            this.playChannel(channel);
        });

        return element;
    }

    /**
     * Toggle favorite de canal
     * @param {Object} channel - Canal
     */
    toggleChannelFavorite(channel) {
        this.modules.playlist.toggleFavorite(channel.id || channel.name);
        this.eventBus.emit('app:channel-favorite-toggled', { channel });
    }

    /**
     * Manejar carga de playlist
     * @param {Object} data - Datos de la playlist
     */
    handlePlaylistLoaded(data) {
        console.log(`📻 Playlist loaded: ${data.channels.length} channels`);
        this.modules.ui.showNotification(`Loaded ${data.channels.length} channels`, 'success');
    }

    /**
     * Manejar filtrado de playlist
     * @param {Object} data - Datos del filtrado
     */
    handlePlaylistFiltered(data) {
        console.log(`🔍 Playlist filtered: ${data.filteredCount}/${data.totalCount} channels`);
    }

    /**
     * Manejar cambio de estado del player
     * @param {Object} data - Datos del estado
     */
    handlePlayerStateChange(data) {
        // Actualizar UI basado en el estado del player
        if (data.state.playing) {
            this.modules.ui.updatePlaybackControls('playing');
        } else {
            this.modules.ui.updatePlaybackControls('paused');
        }
    }

    /**
     * Manejar error del player
     * @param {Object} data - Datos del error
     */
    handlePlayerError(data) {
        this.handleError(new Error(data.error), { module: 'player', ...data });
    }

    /**
     * Manejar cambio de configuración
     * @param {string} key - Clave de configuración
     * @param {*} value - Nuevo valor
     */
    handleConfigChange(key, value) {
        console.log(`⚙️ Config changed: ${key} = ${value}`);
        
        // Aplicar cambios específicos
        if (key.startsWith('ui.theme')) {
            this.modules.ui.setTheme(value);
        } else if (key.startsWith('player.')) {
            this.modules.player.updateConfig(key, value);
        }
    }

    /**
     * Manejar errores de inicialización
     * @param {Error} error - Error ocurrido
     */
    handleInitializationError(error) {
        console.error('❌ Application initialization failed:', error);
        
        this.state.error = error;
        this.state.ready = false;
        
        // Mostrar error en UI si es posible
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="init-error">
                    <h2>🚨 Application Failed to Initialize</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Reload Application</button>
                </div>
            `;
            errorContainer.style.display = 'block';
        }

        this.eventBus.emit('app:initialization-failed', { error });
    }

    /**
     * Manejar errores generales
     * @param {Error} error - Error ocurrido
     * @param {Object} context - Contexto del error
     */
    handleError(error, context = {}) {
        console.error('❌ Application error:', error, context);
        
        // Registrar error
        this.metrics.errors.push({
            error: error.message,
            context,
            timestamp: Date.now(),
            stack: error.stack
        });

        // Mostrar notificación de error
        if (this.modules.ui) {
            this.modules.ui.showNotification(
                `Error: ${error.message}`, 
                'error'
            );
        }

        // Emitir evento de error
        this.eventBus.emit('app:error-handled', { error, context });

        // Intentar recuperación automática en algunos casos
        if (context.action && this.metrics.retryAttempts < this.config.maxRetries) {
            this.attemptRecovery(context);
        }
    }

    /**
     * Intentar recuperación automática
     * @param {Object} context - Contexto para recuperación
     */
    async attemptRecovery(context) {
        this.metrics.retryAttempts++;
        
        console.log(`🔄 Attempting recovery (attempt ${this.metrics.retryAttempts}/${this.config.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        try {
            switch (context.action) {
                case 'loadPlaylist':
                    await this.loadPlaylist(context.file);
                    break;
                case 'playChannel':
                    await this.playChannel(context.channel);
                    break;
                default:
                    console.log('No recovery action available');
            }
            
            // Reset retry counter on success
            this.metrics.retryAttempts = 0;
            
        } catch (error) {
            console.error('Recovery attempt failed:', error);
        }
    }

    /**
     * Realizar health check
     */
    performHealthCheck() {
        const issues = [];

        // Verificar estado de módulos
        for (const [name, module] of Object.entries(this.modules)) {
            if (!module) {
                issues.push(`Module ${name} is not loaded`);
            }
        }

        // Verificar memoria
        if (performance.memory && performance.memory.usedJSHeapSize > 100 * 1024 * 1024) {
            issues.push('High memory usage detected');
        }

        // Verificar errores recientes
        const recentErrors = this.metrics.errors.filter(
            error => Date.now() - error.timestamp < 300000 // 5 minutos
        );
        
        if (recentErrors.length > 5) {
            issues.push('Multiple recent errors detected');
        }

        if (issues.length > 0) {
            console.warn('⚠️ Health check issues:', issues);
            this.eventBus.emit('app:health-issues', { issues });
        }
    }

    /**
     * Guardar estado actual
     */
    saveCurrentState() {
        try {
            const currentState = {
                version: this.state.version,
                view: this.state.currentView,
                config: this.modules.config?.getAll(),
                ui: {
                    theme: this.modules.ui?.getCurrentTheme(),
                    layout: this.modules.ui?.getCurrentLayout()
                },
                playlist: {
                    current: this.modules.playlist?.getCurrentPlaylist(),
                    favorites: this.modules.playlist?.getFavorites()
                },
                player: {
                    currentStream: this.modules.player?.getCurrentStream(),
                    volume: this.modules.player?.getVolume(),
                    position: this.modules.player?.getCurrentTime()
                },
                timestamp: Date.now()
            };

            localStorage.setItem('m3u-player-state', JSON.stringify(currentState));
            
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }

    /**
     * Restaurar estado anterior
     */
    async restorePreviousState() {
        try {
            const savedState = localStorage.getItem('m3u-player-state');
            if (!savedState) return;

            const state = JSON.parse(savedState);
            
            // Verificar versión
            if (state.version !== this.state.version) {
                console.log('State version mismatch, skipping restore');
                return;
            }

            // Restaurar configuración
            if (state.config) {
                await this.modules.config.setMultiple(state.config);
            }

            // Restaurar tema
            if (state.ui?.theme) {
                this.modules.ui.setTheme(state.ui.theme);
            }

            // Restaurar playlist si existe
            if (state.playlist?.current) {
                await this.modules.playlist.loadFromData(state.playlist.current);
            }

            // Restaurar vista
            if (state.view) {
                await this.changeView(state.view);
            }

            console.log('✅ Previous state restored');
            
        } catch (error) {
            console.warn('Failed to restore previous state:', error);
        }
    }

    /**
     * Obtener métricas de la aplicación
     * @returns {Object} Métricas completas
     */
    getMetrics() {
        return {
            ...this.metrics,
            moduleMetrics: Object.fromEntries(
                Object.entries(this.modules).map(([name, module]) => [
                    name,
                    module.getMetrics ? module.getMetrics() : null
                ])
            ),
            eventBusMetrics: this.eventBus.getMetrics(),
            uptime: performance.now() - this.metrics.startTime,
            memoryUsage: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    }

    /**
     * Obtener estado de la aplicación
     * @returns {Object} Estado completo
     */
    getState() {
        return {
            ...this.state,
            modules: Object.fromEntries(
                Object.entries(this.modules).map(([name, module]) => [
                    name,
                    module.getState ? module.getState() : { loaded: !!module }
                ])
            )
        };
    }

    /**
     * Limpiar recursos
     */
    cleanup() {
        // Limpiar timers
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        // Guardar estado final
        this.saveCurrentState();
    }

    /**
     * Destruir la aplicación
     */
    destroy() {
        console.log('🔄 Destroying application...');
        
        this.cleanup();

        // Destruir módulos
        for (const [name, module] of Object.entries(this.modules)) {
            if (module && module.destroy) {
                try {
                    module.destroy();
                } catch (error) {
                    console.warn(`Failed to destroy ${name} module:`, error);
                }
            }
        }

        // Destruir event bus
        this.eventBus.destroy();

        console.log('✅ Application destroyed');
    }
}

export default AppController;