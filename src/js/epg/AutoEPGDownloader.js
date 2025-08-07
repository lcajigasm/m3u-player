/**
 * Auto EPG Downloader - Descargador automático de EPG
 * Gestiona la descarga programada y el cache local de datos EPG
 */

class AutoEPGDownloader {
    constructor(iptvOrgIntegration) {
        this.iptvOrg = iptvOrgIntegration;
        this.downloadQueue = [];
        this.isDownloading = false;
        this.downloadStats = {
            totalChannels: 0,
            successfulDownloads: 0,
            failedDownloads: 0,
            lastRunTime: null,
            nextRunTime: null
        };
        
        // Configuración
        this.config = {
            maxConcurrentDownloads: 5,
            retryAttempts: 3,
            retryDelay: 2000,
            downloadTimeout: 30000,
            scheduledHours: [6, 14, 22], // 6 AM, 2 PM, 10 PM
            maxDaysToDownload: 7,
            cleanupOldDataDays: 30
        };
        
        this.scheduler = null;
        this.localStorage = null;
        
        // AutoEPGDownloader initialized
    }

    /**
     * Inicializa el descargador automático
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Configurar almacenamiento local
            await this.initializeStorage();
            
            // Configurar programador
            this.setupScheduler();
            
            // Limpiar datos antiguos
            await this.cleanupOldData();
            
            // System initialized
            
        } catch (error) {
            console.error('❌ Error inicializando AutoEPGDownloader:', error);
            throw error;
        }
    }

    /**
     * Inicializa el sistema de almacenamiento
     * @returns {Promise<void>}
     */
    async initializeStorage() {
        try {
            // Usar localStorage del navegador o sistema de archivos en Electron
            if (typeof window !== 'undefined' && window.localStorage) {
                this.localStorage = window.localStorage;
            } else {
                // Para Electron, usar electron-store o sistema de archivos
                this.localStorage = new Map(); // Fallback temporal
            }
            
            // Storage configured
            
        } catch (error) {
            console.error('❌ Error configurando almacenamiento:', error);
            this.localStorage = new Map(); // Fallback
        }
    }

    /**
     * Configura el programador de descargas
     */
    setupScheduler() {
        // Verificar cada hora si es momento de descargar
        this.scheduler = setInterval(() => {
            const now = new Date();
            const currentHour = now.getHours();
            
            if (this.config.scheduledHours.includes(currentHour)) {
                const lastRun = this.downloadStats.lastRunTime;
                
                // Solo ejecutar si no se ha ejecutado en la última hora
                if (!lastRun || (now - lastRun) > 3600000) {
                    this.scheduleEPGDownload();
                }
            }
        }, 3600000); // Cada hora
        
        // Calcular próxima ejecución
        this.calculateNextRunTime();
        
        // EPG scheduler configured
        // Next run time scheduled
    }

    /**
     * Programa una descarga de EPG
     * @param {Array} channels - Canales específicos (opcional)
     * @returns {Promise<void>}
     */
    async scheduleEPGDownload(channels = null) {
        if (this.isDownloading) {
            // Download already in progress
            return;
        }
        
        try {
            // Starting automatic EPG download
            this.isDownloading = true;
            
            // Usar canales proporcionados o todos los mapeados
            const targetChannels = channels || this.getAllMappedChannels();
            
            if (targetChannels.length === 0) {
                console.warn('⚠️ No hay canales mapeados para descargar EPG');
                return;
            }
            
            // Resetear estadísticas
            this.downloadStats.totalChannels = targetChannels.length;
            this.downloadStats.successfulDownloads = 0;
            this.downloadStats.failedDownloads = 0;
            this.downloadStats.lastRunTime = new Date();
            
            // Preparar cola de descarga
            this.downloadQueue = targetChannels.map(channel => ({
                channelId: channel.id,
                channelName: channel.name,
                priority: channel.priority || 1,
                attempts: 0
            }));
            
            // Ordenar por prioridad
            this.downloadQueue.sort((a, b) => a.priority - b.priority);
            
            // Iniciar descarga en lotes
            await this.processDownloadQueue();
            
            // Calcular próxima ejecución
            this.calculateNextRunTime();
            
            // Automatic download completed
            // Download stats updated
            
        } catch (error) {
            console.error('❌ Error en descarga automática:', error);
        } finally {
            this.isDownloading = false;
        }
    }

    /**
     * Procesa la cola de descarga
     * @returns {Promise<void>}
     */
    async processDownloadQueue() {
        const batchSize = this.config.maxConcurrentDownloads;
        
        while (this.downloadQueue.length > 0) {
            const batch = this.downloadQueue.splice(0, batchSize);
            
            // Procesar lote en paralelo
            const promises = batch.map(item => this.downloadChannelEPG(item));
            await Promise.allSettled(promises);
            
            // Pequeña pausa entre lotes
            if (this.downloadQueue.length > 0) {
                await this.delay(1000);
            }
        }
    }

    /**
     * Descarga EPG para un canal específico
     * @param {Object} channelItem - Item de la cola
     * @returns {Promise<boolean>} Éxito de la descarga
     */
    async downloadChannelEPG(channelItem) {
        const { channelId, channelName } = channelItem;
        
        try {
            // Downloading EPG for channel
            
            // Descargar con timeout
            const epgData = await this.downloadWithTimeout(channelId);
            
            if (epgData && epgData.length > 0) {
                // Guardar datos en cache local
                await this.saveEPGToCache(channelId, epgData);
                
                this.downloadStats.successfulDownloads++;
                // EPG downloaded successfully
                
                return true;
            } else {
                throw new Error('No se obtuvieron datos EPG');
            }
            
        } catch (error) {
            console.warn(`⚠️ Error descargando EPG para ${channelName}:`, error.message);
            
            // Intentar reintentos
            channelItem.attempts++;
            if (channelItem.attempts < this.config.retryAttempts) {
                // Re-agregar a la cola con delay
                setTimeout(() => {
                    this.downloadQueue.push(channelItem);
                }, this.config.retryDelay * channelItem.attempts);
                
                // Retrying channel download
            } else {
                this.downloadStats.failedDownloads++;
                console.error(`❌ Falló definitivamente la descarga para ${channelName}`);
            }
            
            return false;
        }
    }

    /**
     * Descarga EPG con timeout
     * @param {string} channelId - ID del canal
     * @returns {Promise<Array>} Datos EPG
     */
    async downloadWithTimeout(channelId) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout de descarga'));
            }, this.config.downloadTimeout);
            
            try {
                const epgData = await this.iptvOrg.getChannelEPG(
                    channelId, 
                    this.config.maxDaysToDownload
                );
                
                clearTimeout(timeout);
                resolve(epgData);
                
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Guarda datos EPG en cache local
     * @param {string} channelId - ID del canal
     * @param {Array} epgData - Datos EPG
     * @returns {Promise<void>}
     */
    async saveEPGToCache(channelId, epgData) {
        try {
            const cacheKey = `epg_${channelId}`;
            const cacheData = {
                channelId,
                programs: epgData,
                downloadedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() // 7 días
            };
            
            if (this.localStorage.setItem) {
                // localStorage del navegador
                this.localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } else {
                // Map temporal
                this.localStorage.set(cacheKey, cacheData);
            }
            
        } catch (error) {
            console.error(`❌ Error guardando EPG en cache para ${channelId}:`, error);
        }
    }

    /**
     * Obtiene EPG del cache local
     * @param {string} channelId - ID del canal
     * @returns {Array|null} Datos EPG o null
     */
    getEPGFromCache(channelId) {
        try {
            const cacheKey = `epg_${channelId}`;
            let cacheData;
            
            if (this.localStorage.getItem) {
                // localStorage del navegador
                const data = this.localStorage.getItem(cacheKey);
                cacheData = data ? JSON.parse(data) : null;
            } else {
                // Map temporal
                cacheData = this.localStorage.get(cacheKey);
            }
            
            if (!cacheData) return null;
            
            // Verificar expiración
            const expiresAt = new Date(cacheData.expiresAt);
            if (expiresAt < new Date()) {
                this.removeFromCache(channelId);
                return null;
            }
            
            return cacheData.programs;
            
        } catch (error) {
            console.error(`❌ Error obteniendo EPG del cache para ${channelId}:`, error);
            return null;
        }
    }

    /**
     * Remueve datos del cache
     * @param {string} channelId - ID del canal
     */
    removeFromCache(channelId) {
        try {
            const cacheKey = `epg_${channelId}`;
            
            if (this.localStorage.removeItem) {
                this.localStorage.removeItem(cacheKey);
            } else {
                this.localStorage.delete(cacheKey);
            }
            
        } catch (error) {
            console.error(`❌ Error removiendo del cache ${channelId}:`, error);
        }
    }

    /**
     * Limpia datos antiguos del cache
     * @returns {Promise<void>}
     */
    async cleanupOldData() {
        try {
            const cutoffDate = new Date(Date.now() - (this.config.cleanupOldDataDays * 24 * 60 * 60 * 1000));
            let cleanedCount = 0;
            
            if (this.localStorage.getItem) {
                // localStorage del navegador
                const keys = Object.keys(this.localStorage).filter(key => key.startsWith('epg_'));
                
                keys.forEach(key => {
                    try {
                        const data = JSON.parse(this.localStorage.getItem(key));
                        const downloadedAt = new Date(data.downloadedAt);
                        
                        if (downloadedAt < cutoffDate) {
                            this.localStorage.removeItem(key);
                            cleanedCount++;
                        }
                    } catch (error) {
                        // Dato corrupto, eliminar
                        this.localStorage.removeItem(key);
                        cleanedCount++;
                    }
                });
                
            } else {
                // Map temporal
                for (const [key, data] of this.localStorage) {
                    if (key.startsWith('epg_')) {
                        const downloadedAt = new Date(data.downloadedAt);
                        
                        if (downloadedAt < cutoffDate) {
                            this.localStorage.delete(key);
                            cleanedCount++;
                        }
                    }
                }
            }
            
            if (cleanedCount > 0) {
                // Cleanup completed
            }
            
        } catch (error) {
            console.error('❌ Error en limpieza de datos antiguos:', error);
        }
    }

    /**
     * Obtiene todos los canales mapeados
     * @returns {Array} Lista de canales mapeados
     */
    getAllMappedChannels() {
        const channels = [];
        
        for (const [m3uChannelId, iptvOrgId] of this.iptvOrg.channelMapping) {
            channels.push({
                id: iptvOrgId,
                name: m3uChannelId,
                priority: 1
            });
        }
        
        return channels;
    }

    /**
     * Calcula la próxima hora de ejecución
     */
    calculateNextRunTime() {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Encontrar la próxima hora programada
        let nextHour = null;
        
        for (const hour of this.config.scheduledHours) {
            if (hour > currentHour) {
                nextHour = hour;
                break;
            }
        }
        
        // Si no hay hora hoy, usar la primera del día siguiente
        if (nextHour === null) {
            nextHour = this.config.scheduledHours[0];
            now.setDate(now.getDate() + 1);
        }
        
        const nextRun = new Date(now);
        nextRun.setHours(nextHour, 0, 0, 0);
        
        this.downloadStats.nextRunTime = nextRun;
    }

    /**
     * Forza una descarga inmediata
     * @param {Array} channels - Canales específicos (opcional)
     * @returns {Promise<void>}
     */
    async forceDownload(channels = null) {
        // Forcing immediate EPG download
        await this.scheduleEPGDownload(channels);
    }

    /**
     * Obtiene estadísticas del descargador
     * @returns {Object} Estadísticas
     */
    getDownloadStats() {
        return {
            ...this.downloadStats,
            isDownloading: this.isDownloading,
            queueSize: this.downloadQueue.length,
            config: this.config
        };
    }

    /**
     * Actualiza la configuración
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Reconfigurar programador si cambió
        if (newConfig.scheduledHours) {
            this.calculateNextRunTime();
        }
        
        // Configuration updated
    }

    /**
     * Pausa de ejecución
     * @param {number} ms - Milisegundos
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Detiene y libera recursos
     */
    destroy() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        this.downloadQueue = [];
        this.isDownloading = false;
        
        // Instance destroyed
    }
}

export { AutoEPGDownloader };
