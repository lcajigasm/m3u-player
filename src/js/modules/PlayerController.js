/**
 * PlayerController - Controlador avanzado de reproducción multimedia
 * Maneja reproducción de video/audio, HLS, controles avanzados
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from '../core/EventBus.js';

class PlayerController {
    constructor(options = {}) {
        this.eventBus = getEventBus();
        this.videoElement = null;
        this.hls = null;
        
        // Estado del reproductor
        this.state = {
            currentTime: 0,
            duration: 0,
            volume: 0.8,
            muted: false,
            playing: false,
            loading: false,
            buffering: false,
            error: null,
            currentStream: null,
            networkState: 'idle', // 'idle', 'loading', 'error', 'success'
            bufferHealth: 0 // 0-100%
        };

        // Configuración avanzada
        this.config = {
            autoplay: options.autoplay || false,
            preload: options.preload || 'metadata',
            enableHLS: options.enableHLS !== false,
            hlsConfig: {
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                ...options.hlsConfig
            },
            retryConfig: {
                maxRetries: 3,
                retryDelay: 1000,
                backoffMultiplier: 2,
                ...options.retryConfig
            },
            timeouts: {
                loadTimeout: 15000,
                stallTimeout: 10000,
                ...options.timeouts
            }
        };

        // Performance monitoring
        this.metrics = {
            startTime: 0,
            loadTime: 0,
            bufferUnderruns: 0,
            totalStalls: 0,
            averageBitrate: 0,
            bytesLoaded: 0
        };

        // Retry mechanism
        this.retryCount = 0;
        this.retryTimer = null;

        // Timeouts
        this.loadTimeout = null;
        this.stallTimeout = null;

        // Event listeners registry
        this.eventListeners = new Map();

        this.init();
    }

    /**
     * Inicializar el controlador
     */
    init() {
        this.setupEventListeners();
        this.eventBus.emit('player:initialized', { controller: this });
        console.log('🎮 PlayerController initialized');
    }

    /**
     * Configurar el elemento de video
     * @param {HTMLVideoElement} videoElement - Elemento de video
     */
    setVideoElement(videoElement) {
        if (this.videoElement) {
            this.removeVideoEventListeners();
        }

        this.videoElement = videoElement;
        
        if (videoElement) {
            this.setupVideoEventListeners();
            this.applyInitialConfig();
            this.eventBus.emit('player:video-element-set', { element: videoElement });
        }
    }

    /**
     * Cargar y reproducir un stream
     * @param {Object} streamInfo - Información del stream
     * @param {string} streamInfo.url - URL del stream
     * @param {string} streamInfo.type - Tipo de stream ('hls', 'direct', 'dash')
     * @param {Object} streamInfo.metadata - Metadatos adicionales
     * @returns {Promise<void>}
     */
    async loadStream(streamInfo) {
        if (!this.videoElement) {
            throw new Error('Video element not set');
        }

        this.metrics.startTime = performance.now();
        this.retryCount = 0;
        
        try {
            this.setState({ 
                loading: true, 
                error: null, 
                currentStream: streamInfo,
                networkState: 'loading'
            });

            this.eventBus.emit('player:load-start', { stream: streamInfo });

            // Limpiar stream anterior
            await this.cleanup();

            // Determinar método de carga
            if (streamInfo.type === 'hls' || streamInfo.url.includes('.m3u8')) {
                await this.loadHLSStream(streamInfo);
            } else {
                await this.loadDirectStream(streamInfo);
            }

            this.metrics.loadTime = performance.now() - this.metrics.startTime;
            this.setState({ 
                loading: false, 
                networkState: 'success' 
            });

            this.eventBus.emit('player:load-success', { 
                stream: streamInfo, 
                loadTime: this.metrics.loadTime 
            });

            // Auto-play si está configurado
            if (this.config.autoplay) {
                await this.play();
            }

        } catch (error) {
            console.error('❌ Error loading stream:', error);
            this.handleError(error, streamInfo);
            throw error;
        }
    }

    /**
     * Cargar stream HLS
     * @param {Object} streamInfo - Información del stream
     * @returns {Promise<void>}
     */
    async loadHLSStream(streamInfo) {
        if (!window.Hls || !window.Hls.isSupported()) {
            throw new Error('HLS not supported in this browser');
        }

        return new Promise((resolve, reject) => {
            this.hls = new window.Hls(this.config.hlsConfig);
            
            // Setup HLS event listeners
            this.setupHLSEventListeners(resolve, reject);
            
            // Load source
            this.hls.loadSource(streamInfo.url);
            this.hls.attachMedia(this.videoElement);

            // Set timeout
            this.loadTimeout = setTimeout(() => {
                reject(new Error(`HLS load timeout after ${this.config.timeouts.loadTimeout}ms`));
            }, this.config.timeouts.loadTimeout);
        });
    }

    /**
     * Cargar stream directo
     * @param {Object} streamInfo - Información del stream
     * @returns {Promise<void>}
     */
    async loadDirectStream(streamInfo) {
        return new Promise((resolve, reject) => {
            const handleCanPlay = () => {
                this.clearLoadTimeout();
                this.videoElement.removeEventListener('canplay', handleCanPlay);
                this.videoElement.removeEventListener('error', handleError);
                resolve();
            };

            const handleError = (e) => {
                this.clearLoadTimeout();
                this.videoElement.removeEventListener('canplay', handleCanPlay);
                this.videoElement.removeEventListener('error', handleError);
                reject(new Error('Failed to load direct stream'));
            };

            this.videoElement.addEventListener('canplay', handleCanPlay);
            this.videoElement.addEventListener('error', handleError);

            // Set source and load
            this.videoElement.src = streamInfo.url;
            this.videoElement.load();

            // Set timeout
            this.loadTimeout = setTimeout(() => {
                this.videoElement.removeEventListener('canplay', handleCanPlay);
                this.videoElement.removeEventListener('error', handleError);
                reject(new Error(`Direct stream load timeout after ${this.config.timeouts.loadTimeout}ms`));
            }, this.config.timeouts.loadTimeout);
        });
    }

    /**
     * Reproducir
     * @returns {Promise<void>}
     */
    async play() {
        if (!this.videoElement) {
            throw new Error('Video element not set');
        }

        try {
            await this.videoElement.play();
            this.setState({ playing: true });
            this.eventBus.emit('player:play', { currentTime: this.state.currentTime });
        } catch (error) {
            console.error('❌ Play error:', error);
            this.eventBus.emit('player:play-error', { error: error.message });
            throw error;
        }
    }

    /**
     * Pausar
     */
    pause() {
        if (!this.videoElement) return;

        this.videoElement.pause();
        this.setState({ playing: false });
        this.eventBus.emit('player:pause', { currentTime: this.state.currentTime });
    }

    /**
     * Detener reproducción
     */
    stop() {
        if (!this.videoElement) return;

        this.videoElement.pause();
        this.videoElement.currentTime = 0;
        this.setState({ 
            playing: false, 
            currentTime: 0,
            currentStream: null 
        });
        
        this.cleanup();
        this.eventBus.emit('player:stop');
    }

    /**
     * Establecer volumen
     * @param {number} volume - Volumen (0-1)
     */
    setVolume(volume) {
        if (!this.videoElement) return;

        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.videoElement.volume = clampedVolume;
        this.setState({ volume: clampedVolume });
        this.eventBus.emit('player:volume-change', { volume: clampedVolume });
    }

    /**
     * Alternar mute
     */
    toggleMute() {
        if (!this.videoElement) return;

        const muted = !this.videoElement.muted;
        this.videoElement.muted = muted;
        this.setState({ muted });
        this.eventBus.emit('player:mute-toggle', { muted });
    }

    /**
     * Buscar posición específica
     * @param {number} time - Tiempo en segundos
     */
    seek(time) {
        if (!this.videoElement) return;

        const clampedTime = Math.max(0, Math.min(this.state.duration, time));
        this.videoElement.currentTime = clampedTime;
        this.setState({ currentTime: clampedTime });
        this.eventBus.emit('player:seek', { time: clampedTime });
    }

    /**
     * Obtener estado actual del reproductor
     * @returns {Object} Estado actual
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Obtener métricas de rendimiento
     * @returns {Object} Métricas actuales
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Obtener información de calidad del stream
     * @returns {Object|null} Información de calidad
     */
    getQualityInfo() {
        if (!this.hls) return null;

        return {
            levels: this.hls.levels,
            currentLevel: this.hls.currentLevel,
            autoLevelEnabled: this.hls.autoLevelEnabled,
            loadLevel: this.hls.loadLevel,
            nextLevel: this.hls.nextLevel
        };
    }

    /**
     * Cambiar calidad manualmente (para HLS)
     * @param {number} levelIndex - Índice del nivel de calidad (-1 para auto)
     */
    setQuality(levelIndex) {
        if (!this.hls) return;

        this.hls.currentLevel = levelIndex;
        this.eventBus.emit('player:quality-change', { level: levelIndex });
    }

    // Métodos privados

    setupEventListeners() {
        // Escuchar eventos del EventBus
        this.eventBus.on('player:set-video-element', (event) => {
            this.setVideoElement(event.data.element);
        });

        this.eventBus.on('player:load-stream', async (event) => {
            await this.loadStream(event.data.stream);
        });

        this.eventBus.on('player:play-command', async () => {
            await this.play();
        });

        this.eventBus.on('player:pause-command', () => {
            this.pause();
        });

        this.eventBus.on('player:stop-command', () => {
            this.stop();
        });
    }

    setupVideoEventListeners() {
        if (!this.videoElement) return;

        const events = {
            'loadstart': () => this.setState({ loading: true }),
            'loadedmetadata': () => this.setState({ duration: this.videoElement.duration }),
            'canplay': () => this.setState({ loading: false }),
            'play': () => this.setState({ playing: true }),
            'pause': () => this.setState({ playing: false }),
            'timeupdate': () => this.updateTime(),
            'volumechange': () => this.updateVolume(),
            'waiting': () => this.handleBuffering(true),
            'playing': () => this.handleBuffering(false),
            'ended': () => this.handleEnd(),
            'error': (e) => this.handleVideoError(e),
            'stalled': () => this.handleStall(),
            'progress': () => this.updateBufferHealth()
        };

        Object.entries(events).forEach(([event, handler]) => {
            this.videoElement.addEventListener(event, handler);
            this.eventListeners.set(event, handler);
        });
    }

    removeVideoEventListeners() {
        if (!this.videoElement || !this.eventListeners.size) return;

        this.eventListeners.forEach((handler, event) => {
            this.videoElement.removeEventListener(event, handler);
        });
        
        this.eventListeners.clear();
    }

    setupHLSEventListeners(resolve, reject) {
        if (!this.hls) return;

        this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            this.clearLoadTimeout();
            resolve();
        });

        this.hls.on(window.Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data);
            
            if (data.fatal) {
                this.clearLoadTimeout();
                
                switch (data.type) {
                    case window.Hls.ErrorTypes.NETWORK_ERROR:
                        reject(new Error('Network error loading HLS stream'));
                        break;
                    case window.Hls.ErrorTypes.MEDIA_ERROR:
                        // Try to recover from media error
                        this.hls.recoverMediaError();
                        break;
                    default:
                        reject(new Error(`HLS fatal error: ${data.details}`));
                        break;
                }
            }
        });

        this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
            this.eventBus.emit('player:quality-switched', { level: data.level });
        });
    }

    updateTime() {
        if (!this.videoElement) return;

        const currentTime = this.videoElement.currentTime;
        this.setState({ currentTime });
        
        // Emit time update less frequently for performance
        if (Math.floor(currentTime) !== Math.floor(this.state.currentTime)) {
            this.eventBus.emit('player:time-update', { 
                currentTime, 
                duration: this.state.duration 
            });
        }
    }

    updateVolume() {
        if (!this.videoElement) return;

        this.setState({
            volume: this.videoElement.volume,
            muted: this.videoElement.muted
        });
    }

    updateBufferHealth() {
        if (!this.videoElement) return;

        const buffered = this.videoElement.buffered;
        const currentTime = this.videoElement.currentTime;
        
        let bufferHealth = 0;
        
        if (buffered.length > 0) {
            for (let i = 0; i < buffered.length; i++) {
                if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
                    const bufferAhead = buffered.end(i) - currentTime;
                    bufferHealth = Math.min(100, (bufferAhead / 30) * 100); // 30s = 100%
                    break;
                }
            }
        }

        this.setState({ bufferHealth });
    }

    handleBuffering(isBuffering) {
        this.setState({ buffering: isBuffering });
        
        if (isBuffering) {
            this.eventBus.emit('player:buffering-start');
        } else {
            this.eventBus.emit('player:buffering-end');
        }
    }

    handleEnd() {
        this.setState({ playing: false });
        this.eventBus.emit('player:ended');
    }

    handleVideoError(event) {
        const error = this.videoElement.error;
        let message = 'Unknown video error';

        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    message = 'Video playback aborted';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    message = 'Network error occurred';
                    break;
                case error.MEDIA_ERR_DECODE:
                    message = 'Video decoding error';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Video format not supported';
                    break;
            }
        }

        this.handleError(new Error(message));
    }

    handleStall() {
        this.metrics.totalStalls++;
        this.eventBus.emit('player:stall');
        
        // Set stall timeout
        this.stallTimeout = setTimeout(() => {
            this.handleError(new Error('Video stalled for too long'));
        }, this.config.timeouts.stallTimeout);
    }

    handleError(error, streamInfo = null) {
        this.clearTimeouts();
        
        this.setState({ 
            error: error.message, 
            loading: false,
            networkState: 'error'
        });

        this.eventBus.emit('player:error', { 
            error: error.message, 
            stream: streamInfo || this.state.currentStream,
            retryCount: this.retryCount
        });

        // Attempt retry if configured
        if (this.retryCount < this.config.retryConfig.maxRetries && streamInfo) {
            this.attemptRetry(streamInfo);
        }
    }

    async attemptRetry(streamInfo) {
        const delay = this.config.retryConfig.retryDelay * 
                     Math.pow(this.config.retryConfig.backoffMultiplier, this.retryCount);
        
        this.retryCount++;
        
        this.eventBus.emit('player:retry-attempt', { 
            attempt: this.retryCount, 
            delay,
            stream: streamInfo 
        });

        this.retryTimer = setTimeout(async () => {
            try {
                await this.loadStream(streamInfo);
            } catch (error) {
                console.error(`Retry ${this.retryCount} failed:`, error);
            }
        }, delay);
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.eventBus.emit('player:state-change', { state: this.state });
    }

    applyInitialConfig() {
        if (!this.videoElement) return;

        this.videoElement.volume = this.state.volume;
        this.videoElement.muted = this.state.muted;
        this.videoElement.preload = this.config.preload;
    }

    clearTimeouts() {
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
        }
        
        if (this.stallTimeout) {
            clearTimeout(this.stallTimeout);
            this.stallTimeout = null;
        }
        
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    clearLoadTimeout() {
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
        }
    }

    async cleanup() {
        this.clearTimeouts();
        
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        if (this.videoElement) {
            this.videoElement.src = '';
            this.videoElement.load();
        }

        this.retryCount = 0;
    }

    /**
     * Destruir el controlador y limpiar recursos
     */
    destroy() {
        this.cleanup();
        this.removeVideoEventListeners();
        
        // Remove EventBus listeners
        this.eventBus.removeAllListeners('player:set-video-element');
        this.eventBus.removeAllListeners('player:load-stream');
        this.eventBus.removeAllListeners('player:play-command');
        this.eventBus.removeAllListeners('player:pause-command');
        this.eventBus.removeAllListeners('player:stop-command');

        this.videoElement = null;
        this.eventBus.emit('player:destroyed');
        
        console.log('🎮 PlayerController destroyed');
    }
}

export default PlayerController;