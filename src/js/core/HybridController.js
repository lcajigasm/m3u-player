/**
 * HybridController - Controlador híbrido que integra gradualmente los nuevos módulos
 * Mantiene compatibilidad con el sistema original mientras introduce funcionalidades nuevas
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from './EventBus.js';

class HybridController {
    constructor() {
        console.log('🔄 HybridController initializing...');
        
        this.eventBus = getEventBus();
        this.originalPlayer = null;
        this.enhancedModules = {};
        this.state = {
            initialized: false,
            hybridMode: true,
            version: '2.0.0'
        };

        this.init();
    }

    /**
     * Inicializar controlador híbrido
     */
    init() {
        // Esperar a que el player original esté disponible
        this.waitForOriginalPlayer().then(() => {
            this.setupHybridFeatures();
        });
    }

    /**
     * Esperar a que el player original esté disponible
     */
    async waitForOriginalPlayer() {
        return new Promise((resolve) => {
            const checkPlayer = () => {
                if (window.player) {
                    this.originalPlayer = window.player;
                    console.log('✅ Original player detected');
                    resolve();
                } else {
                    setTimeout(checkPlayer, 100);
                }
            };
            checkPlayer();
        });
    }

    /**
     * Configurar funcionalidades híbridas
     */
    async setupHybridFeatures() {
        try {
            console.log('🔧 Setting up hybrid features...');

            // Integrar EventBus con el player original
            this.integrateEventBus();

            // Cargar módulos mejorados gradualmente
            await this.loadEnhancedModules();

            // Configurar interceptores para funcionalidades mejoradas
            this.setupInterceptors();

            this.state.initialized = true;
            console.log('✅ HybridController ready');

            this.eventBus.emit('hybrid:ready', {
                originalPlayer: !!this.originalPlayer,
                enhancedModules: Object.keys(this.enhancedModules),
                version: this.state.version
            });

        } catch (error) {
            console.error('❌ HybridController setup failed:', error);
        }
    }

    /**
     * Integrar EventBus con el sistema original
     */
    integrateEventBus() {
        // Interceptar eventos del player original
        if (this.originalPlayer && this.originalPlayer.video) {
            const video = this.originalPlayer.video;

            // Eventos de reproducción
            video.addEventListener('play', () => {
                this.eventBus.emit('player:play', { source: 'original' });
            });

            video.addEventListener('pause', () => {
                this.eventBus.emit('player:pause', { source: 'original' });
            });

            video.addEventListener('loadstart', () => {
                this.eventBus.emit('player:load-start', { source: 'original' });
            });

            video.addEventListener('loadeddata', () => {
                this.eventBus.emit('player:load-success', { source: 'original' });
            });

            video.addEventListener('error', (e) => {
                this.eventBus.emit('player:error', { 
                    error: e.target.error, 
                    source: 'original' 
                });
            });
        }

        console.log('🔗 EventBus integrated with original player');
    }

    /**
     * Cargar módulos mejorados de forma opcional
     */
    async loadEnhancedModules() {
        const modules = [
            { name: 'VirtualScroller', path: '../components/VirtualScroller.js' },
            { name: 'ConfigManager', path: '../modules/ConfigManager.js' },
            { name: 'NetworkManager', path: '../modules/NetworkManager.js' }
        ];

        for (const moduleConfig of modules) {
            try {
                const module = await import(moduleConfig.path);
                this.enhancedModules[moduleConfig.name] = module.default;
                console.log(`✅ Enhanced module loaded: ${moduleConfig.name}`);
            } catch (error) {
                console.warn(`⚠️ Failed to load ${moduleConfig.name}:`, error.message);
            }
        }
    }

    /**
     * Configurar interceptores para funcionalidades mejoradas
     */
    setupInterceptors() {
        // Interceptar carga de playlists para usar virtual scrolling
        if (this.originalPlayer && this.enhancedModules.VirtualScroller) {
            this.interceptPlaylistRendering();
        }

        // Interceptar configuraciones para usar ConfigManager mejorado
        if (this.enhancedModules.ConfigManager) {
            this.interceptConfigManagement();
        }

        // Interceptar requests de red para usar NetworkManager mejorado
        if (this.enhancedModules.NetworkManager) {
            this.interceptNetworkRequests();
        }
    }

    /**
     * Interceptar renderizado de playlist para usar virtual scrolling
     */
    interceptPlaylistRendering() {
        const playlistContainer = document.getElementById('playlist');
        if (!playlistContainer) return;

        // Observar cambios en la playlist
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const items = Array.from(playlistContainer.children);
                    
                    // Si hay muchos items, usar virtual scrolling
                    if (items.length > 100) {
                        this.enableVirtualScrolling(playlistContainer, items);
                    }
                }
            });
        });

        observer.observe(playlistContainer, { childList: true });
        console.log('🔄 Playlist rendering interceptor active');
    }

    /**
     * Habilitar virtual scrolling para listas grandes
     */
    enableVirtualScrolling(container, items) {
        try {
            const VirtualScroller = this.enhancedModules.VirtualScroller;
            
            // Extraer datos de los items existentes
            const itemsData = items.map((item, index) => ({
                element: item,
                index,
                data: {
                    name: item.querySelector('.channel-name')?.textContent || `Item ${index}`,
                    url: item.dataset.url || '',
                    group: item.dataset.group || 'General'
                }
            }));

            // Crear virtual scroller
            const scroller = new VirtualScroller(container, {
                itemHeight: 60,
                bufferSize: 10,
                threshold: 100
            });

            // Función de renderizado
            const renderItem = (itemData, index) => {
                return itemData.element.cloneNode(true);
            };

            scroller.setData(itemsData, renderItem);
            
            console.log(`📜 Virtual scrolling enabled for ${items.length} items`);
            
            this.eventBus.emit('hybrid:virtual-scrolling-enabled', {
                itemCount: items.length,
                container: container.id
            });

        } catch (error) {
            console.warn('⚠️ Failed to enable virtual scrolling:', error);
        }
    }

    /**
     * Interceptar gestión de configuración
     */
    interceptConfigManagement() {
        try {
            const ConfigManager = this.enhancedModules.ConfigManager;
            window.enhancedConfig = new ConfigManager();
            
            console.log('⚙️ Enhanced configuration management available');
            
            this.eventBus.emit('hybrid:config-enhanced', {
                manager: 'ConfigManager'
            });

        } catch (error) {
            console.warn('⚠️ Failed to setup enhanced config:', error);
        }
    }

    /**
     * Interceptar requests de red
     */
    interceptNetworkRequests() {
        try {
            const NetworkManager = this.enhancedModules.NetworkManager;
            window.enhancedNetwork = new NetworkManager();
            
            console.log('🌐 Enhanced network management available');
            
            this.eventBus.emit('hybrid:network-enhanced', {
                manager: 'NetworkManager'
            });

        } catch (error) {
            console.warn('⚠️ Failed to setup enhanced network:', error);
        }
    }

    /**
     * Obtener estado del controlador híbrido
     */
    getState() {
        return {
            ...this.state,
            originalPlayer: !!this.originalPlayer,
            enhancedModules: Object.keys(this.enhancedModules),
            eventBusActive: !!this.eventBus
        };
    }

    /**
     * Obtener métricas del sistema híbrido
     */
    getMetrics() {
        return {
            hybridMode: this.state.hybridMode,
            originalPlayerActive: !!this.originalPlayer,
            enhancedModulesCount: Object.keys(this.enhancedModules).length,
            eventBusMetrics: this.eventBus.getMetrics ? this.eventBus.getMetrics() : null
        };
    }

    /**
     * Destruir controlador híbrido
     */
    destroy() {
        console.log('🔄 Destroying HybridController...');
        
        if (this.eventBus && this.eventBus.destroy) {
            this.eventBus.destroy();
        }

        // Limpiar referencias
        this.originalPlayer = null;
        this.enhancedModules = {};
        
        console.log('✅ HybridController destroyed');
    }
}

export default HybridController;