/**
 * Auto EPG Downloader - Automatic EPG Downloader
 * Manages scheduled downloads and local cache of EPG data
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
     * Initializes the automatic downloader
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Configure local storage
            await this.initializeStorage();
            
            // Set up scheduler
            this.setupScheduler();
            
            // Clean up old data
            await this.cleanupOldData();
            
            // System initialized
            
        } catch (error) {
            console.error('❌ Error inicializando AutoEPGDownloader:', error);
            throw error;
        }
    }

    /**
     * Initializes the storage system
     * @returns {Promise<void>}
     */
    async initializeStorage() {
        try {
            // Use browser localStorage or filesystem in Electron
            if (typeof window !== 'undefined' && window.localStorage) {
                this.localStorage = window.localStorage;
            } else {
                // For Electron, use electron-store or filesystem
                this.localStorage = new Map(); // Temporary fallback
            }
            
            // Storage configured
            
        } catch (error) {
            console.error('❌ Error configurando almacenamiento:', error);
            this.localStorage = new Map(); // Fallback
        }
    }

    /**
     * Sets up the download scheduler
     */
    setupScheduler() {
        // Check every hour if it's time to download
        this.scheduler = setInterval(() => {
            const now = new Date();
            const currentHour = now.getHours();
            
            if (this.config.scheduledHours.includes(currentHour)) {
                const lastRun = this.downloadStats.lastRunTime;
                
            // Only run if it hasn't run in the last hour
                if (!lastRun || (now - lastRun) > 3600000) {
                    this.scheduleEPGDownload();
                }
            }
        }, 3600000); // Every hour
        
        // Calculate next run time
        this.calculateNextRunTime();
        
        // EPG scheduler configured
        // Next run time scheduled
    }

    /**
     * Schedules an EPG download
     * @param {Array} channels - Specific channels (optional)
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
            
            // Use provided channels or all mapped channels
            const targetChannels = channels || this.getAllMappedChannels();
            
            if (targetChannels.length === 0) {
                console.warn('⚠️ No hay canales mapeados para descargar EPG');
                return;
            }
            
            // Reset statistics
            this.downloadStats.totalChannels = targetChannels.length;
            this.downloadStats.successfulDownloads = 0;
            this.downloadStats.failedDownloads = 0;
            this.downloadStats.lastRunTime = new Date();
            
            // Prepare download queue
            this.downloadQueue = targetChannels.map(channel => ({
                channelId: channel.id,
                channelName: channel.name,
                priority: channel.priority || 1,
                attempts: 0
            }));
            
            // Sort by priority
            this.downloadQueue.sort((a, b) => a.priority - b.priority);
            
            // Start batch download
            await this.processDownloadQueue();
            
            // Calculate next run time
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
     * Processes the download queue
     * @returns {Promise<void>}
     */
    async processDownloadQueue() {
        const batchSize = this.config.maxConcurrentDownloads;
        
        while (this.downloadQueue.length > 0) {
            const batch = this.downloadQueue.splice(0, batchSize);
            
            // Process batch in parallel
            const promises = batch.map(item => this.downloadChannelEPG(item));
            await Promise.allSettled(promises);
            
            // Small pause between batches
            if (this.downloadQueue.length > 0) {
                await this.delay(1000);
            }
        }
    }

    /**
     * Downloads EPG for a specific channel
     * @param {Object} channelItem - Queue item
     * @returns {Promise<boolean>} Download success
     */
    async downloadChannelEPG(channelItem) {
        const { channelId, channelName } = channelItem;
        
        try {
            // Downloading EPG for channel
            
            // Download with timeout
            const epgData = await this.downloadWithTimeout(channelId);
            
            if (epgData && epgData.length > 0) {
                // Save data to local cache
                await this.saveEPGToCache(channelId, epgData);
                
                this.downloadStats.successfulDownloads++;
                // EPG downloaded successfully
                
                return true;
            } else {
                throw new Error('No se obtuvieron datos EPG');
            }
            
        } catch (error) {
            console.warn(`⚠️ Error descargando EPG para ${channelName}:`, error.message);
            
            // Try retries
            channelItem.attempts++;
            if (channelItem.attempts < this.config.retryAttempts) {
                // Re-add to queue with delay
                setTimeout(() => {
                    this.downloadQueue.push(channelItem);
                }, this.config.retryDelay * channelItem.attempts);
                
                // Retrying channel download
            } else {
                this.downloadStats.failedDownloads++;
                console.error(`❌ Download permanently failed for ${channelName}`);
            }
            
            return false;
        }
    }

    /**
     * Downloads EPG with timeout
     * @param {string} channelId - Channel ID
     * @returns {Promise<Array>} EPG data
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
     * Saves EPG data to local cache
     * @param {string} channelId - Channel ID
     * @param {Array} epgData - EPG data
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
                // Browser localStorage
                this.localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } else {
                // Temporary Map
                this.localStorage.set(cacheKey, cacheData);
            }
            
        } catch (error) {
            console.error(`❌ Error guardando EPG en cache para ${channelId}:`, error);
        }
    }

    /**
     * Gets EPG from local cache
     * @param {string} channelId - Channel ID
     * @returns {Array|null} EPG data or null
     */
    getEPGFromCache(channelId) {
        try {
            const cacheKey = `epg_${channelId}`;
            let cacheData;
            
            if (this.localStorage.getItem) {
                // Browser localStorage
                const data = this.localStorage.getItem(cacheKey);
                cacheData = data ? JSON.parse(data) : null;
            } else {
                // Temporary Map
                cacheData = this.localStorage.get(cacheKey);
            }
            
            if (!cacheData) return null;
            
            // Check expiration
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
     * Removes data from cache
     * @param {string} channelId - Channel ID
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
     * Cleans up old cache data
     * @returns {Promise<void>}
     */
    async cleanupOldData() {
        try {
            const cutoffDate = new Date(Date.now() - (this.config.cleanupOldDataDays * 24 * 60 * 60 * 1000));
            let cleanedCount = 0;
            
            if (this.localStorage.getItem) {
                // Browser localStorage
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
                        // Corrupt data, remove
                        this.localStorage.removeItem(key);
                        cleanedCount++;
                    }
                });
                
            } else {
                // Temporary Map
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
     * Gets all mapped channels
     * @returns {Array} List of mapped channels
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
     * Calculates the next run time
     */
    calculateNextRunTime() {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Find the next scheduled hour
        let nextHour = null;
        
        for (const hour of this.config.scheduledHours) {
            if (hour > currentHour) {
                nextHour = hour;
                break;
            }
        }
        
        // If no hour left today, use the first of the next day
        if (nextHour === null) {
            nextHour = this.config.scheduledHours[0];
            now.setDate(now.getDate() + 1);
        }
        
        const nextRun = new Date(now);
        nextRun.setHours(nextHour, 0, 0, 0);
        
        this.downloadStats.nextRunTime = nextRun;
    }

    /**
     * Forces an immediate download
     * @param {Array} channels - Specific channels (optional)
     * @returns {Promise<void>}
     */
    async forceDownload(channels = null) {
        // Forcing immediate EPG download
        await this.scheduleEPGDownload(channels);
    }

    /**
     * Gets downloader statistics
     * @returns {Object} Statistics
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
     * Updates configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Reconfigure scheduler if changed
        if (newConfig.scheduledHours) {
            this.calculateNextRunTime();
        }
        
        // Configuration updated
    }

    /**
     * Execution delay
     * @param {number} ms - Milliseconds
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stops and releases resources
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
