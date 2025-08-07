/**
 * EPG Admin UI - Interfaz de administración de EPG
 * Proporciona controles para gestionar la descarga automática y configuración de EPG
 */

class EPGAdminUI {
    constructor(epgManager) {
        this.epgManager = epgManager;
        this.isVisible = false;
        this.updateInterval = null;
        this.adminPanel = null;
        
        console.log('⚙️ EPGAdminUI inicializado');
    }

    /**
     * Crea e inicializa la interfaz de administración
     */
    initialize() {
        this.createAdminPanel();
        this.setupEventListeners();
        this.startStatusUpdates();
        
        console.log('✅ EPGAdminUI inicializado correctamente');
    }

    /**
     * Crea el panel de administración
     */
    createAdminPanel() {
        // Crear contenedor principal
        this.adminPanel = document.createElement('div');
        this.adminPanel.id = 'epgAdminPanel';
        this.adminPanel.className = 'epg-admin-panel hidden';
        
        this.adminPanel.innerHTML = `
            <div class="epg-admin-header">
                <h3>🔧 Administración EPG</h3>
                <button class="epg-admin-close" title="Cerrar">×</button>
            </div>
            
            <div class="epg-admin-content">
                <!-- Estadísticas -->
                <div class="epg-admin-section">
                    <h4>📊 Estadísticas</h4>
                    <div class="epg-stats-grid">
                        <div class="epg-stat-card">
                            <div class="stat-label">Canales con EPG</div>
                            <div class="stat-value" id="epgChannelCount">0</div>
                        </div>
                        <div class="epg-stat-card">
                            <div class="stat-label">Canales mapeados</div>
                            <div class="stat-value" id="epgMappedCount">0</div>
                        </div>
                        <div class="epg-stat-card">
                            <div class="stat-label">Última actualización</div>
                            <div class="stat-value" id="epgLastUpdate">-</div>
                        </div>
                        <div class="epg-stat-card">
                            <div class="stat-label">Próxima descarga</div>
                            <div class="stat-value" id="epgNextDownload">-</div>
                        </div>
                    </div>
                </div>

                <!-- Estado de descarga -->
                <div class="epg-admin-section">
                    <h4>📥 Estado de descarga</h4>
                    <div class="epg-download-status">
                        <div class="status-indicator" id="epgDownloadIndicator">
                            <span class="status-dot"></span>
                            <span class="status-text">Esperando...</span>
                        </div>
                        <div class="download-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" id="epgDownloadProgress" style="width: 0%"></div>
                            </div>
                            <div class="progress-text" id="epgDownloadText">0/0</div>
                        </div>
                    </div>
                </div>

                <!-- Controles -->
                <div class="epg-admin-section">
                    <h4>🎮 Controles</h4>
                    <div class="epg-controls-grid">
                        <button class="epg-control-btn primary" id="forceDownloadBtn">
                            ⚡ Descarga inmediata
                        </button>
                        <button class="epg-control-btn secondary" id="clearCacheBtn">
                            🗑️ Limpiar cache
                        </button>
                        <button class="epg-control-btn secondary" id="mapChannelsBtn">
                            🔗 Remapear canales
                        </button>
                        <button class="epg-control-btn secondary" id="exportConfigBtn">
                            📤 Exportar config
                        </button>
                    </div>
                </div>

                <!-- Configuración -->
                <div class="epg-admin-section">
                    <h4>⚙️ Configuración</h4>
                    <div class="epg-config-form">
                        <div class="config-group">
                            <label>Horas de descarga automática:</label>
                            <input type="text" id="scheduledHours" placeholder="6,14,22" />
                            <small>Horas separadas por coma (formato 24h)</small>
                        </div>
                        <div class="config-group">
                            <label>Días de programación:</label>
                            <input type="number" id="maxDays" min="1" max="14" value="7" />
                            <small>Número de días de EPG a descargar</small>
                        </div>
                        <div class="config-group">
                            <label>Descargas concurrentes:</label>
                            <input type="number" id="maxConnections" min="1" max="10" value="5" />
                            <small>Número máximo de descargas simultáneas</small>
                        </div>
                        <button class="epg-control-btn primary" id="saveConfigBtn">
                            💾 Guardar configuración
                        </button>
                    </div>
                </div>

                <!-- Lista de canales -->
                <div class="epg-admin-section">
                    <h4>📺 Canales mapeados</h4>
                    <div class="epg-channel-search">
                        <input type="text" id="channelSearchInput" placeholder="Buscar canales..." />
                        <button id="channelSearchBtn">🔍</button>
                    </div>
                    <div class="epg-channel-list" id="epgChannelList">
                        <div class="loading-placeholder">Cargando canales...</div>
                    </div>
                </div>

                <!-- Log de actividad -->
                <div class="epg-admin-section collapsible">
                    <h4 onclick="this.parentElement.classList.toggle('expanded')">
                        📝 Log de actividad
                        <span class="collapse-indicator">▼</span>
                    </h4>
                    <div class="epg-log-container">
                        <div class="epg-log" id="epgActivityLog">
                            <div class="log-entry">Sistema EPG inicializado</div>
                        </div>
                        <button class="epg-control-btn small" id="clearLogBtn">Limpiar log</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.adminPanel);
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón cerrar
        this.adminPanel.querySelector('.epg-admin-close').onclick = () => {
            this.hide();
        };

        // Control de descarga inmediata
        document.getElementById('forceDownloadBtn').onclick = () => {
            this.forceDownload();
        };

        // Limpiar cache
        document.getElementById('clearCacheBtn').onclick = () => {
            this.clearCache();
        };

        // Remapear canales
        document.getElementById('mapChannelsBtn').onclick = () => {
            this.remapChannels();
        };

        // Exportar configuración
        document.getElementById('exportConfigBtn').onclick = () => {
            this.exportConfiguration();
        };

        // Guardar configuración
        document.getElementById('saveConfigBtn').onclick = () => {
            this.saveConfiguration();
        };

        // Búsqueda de canales
        document.getElementById('channelSearchBtn').onclick = () => {
            this.searchChannels();
        };

        document.getElementById('channelSearchInput').onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.searchChannels();
            }
        };

        // Limpiar log
        document.getElementById('clearLogBtn').onclick = () => {
            this.clearLog();
        };

        // Listeners del EPGManager
        this.epgManager.on('dataLoaded', (count) => {
            this.logActivity(`✅ EPG cargado para ${count} canales`);
        });

        this.epgManager.on('forceDownloadCompleted', (data) => {
            this.logActivity(`⚡ Descarga forzada completada: ${data.channelCount} canales`);
        });

        this.epgManager.on('cacheCleared', () => {
            this.logActivity('🗑️ Cache de EPG limpiado');
        });
    }

    /**
     * Muestra el panel de administración
     */
    show() {
        this.adminPanel.classList.remove('hidden');
        this.isVisible = true;
        this.updateStats();
        this.updateChannelList();
        
        console.log('📊 Panel de administración EPG mostrado');
    }

    /**
     * Oculta el panel de administración
     */
    hide() {
        this.adminPanel.classList.add('hidden');
        this.isVisible = false;
        
        console.log('📊 Panel de administración EPG ocultado');
    }

    /**
     * Alterna la visibilidad del panel
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Inicia las actualizaciones periódicas del estado
     */
    startStatusUpdates() {
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateStats();
                this.updateDownloadStatus();
            }
        }, 5000); // Actualizar cada 5 segundos
    }

    /**
     * Actualiza las estadísticas mostradas
     */
    updateStats() {
        const stats = this.epgManager.getUpdateStats();
        
        document.getElementById('epgChannelCount').textContent = stats.channelCount;
        
        if (stats.iptvOrgStats) {
            document.getElementById('epgMappedCount').textContent = 
                `${stats.iptvOrgStats.mappedChannels}/${stats.iptvOrgStats.channels}`;
        }
        
        if (stats.lastUpdateTime) {
            document.getElementById('epgLastUpdate').textContent = 
                stats.lastUpdateTime.toLocaleString();
        }
        
        if (stats.downloadStats && stats.downloadStats.nextRunTime) {
            document.getElementById('epgNextDownload').textContent = 
                stats.downloadStats.nextRunTime.toLocaleString();
        }
    }

    /**
     * Actualiza el estado de descarga
     */
    updateDownloadStatus() {
        const stats = this.epgManager.getUpdateStats();
        const indicator = document.getElementById('epgDownloadIndicator');
        const progress = document.getElementById('epgDownloadProgress');
        const progressText = document.getElementById('epgDownloadText');
        
        if (stats.downloadStats && stats.downloadStats.isDownloading) {
            indicator.className = 'status-indicator downloading';
            indicator.querySelector('.status-text').textContent = 'Descargando...';
            
            const successful = stats.downloadStats.successfulDownloads;
            const total = stats.downloadStats.totalChannels;
            const percentage = total > 0 ? (successful / total) * 100 : 0;
            
            progress.style.width = `${percentage}%`;
            progressText.textContent = `${successful}/${total}`;
            
        } else {
            indicator.className = 'status-indicator ready';
            indicator.querySelector('.status-text').textContent = 'Esperando...';
            progress.style.width = '0%';
            progressText.textContent = '0/0';
        }
    }

    /**
     * Fuerza una descarga inmediata
     */
    async forceDownload() {
        try {
            const btn = document.getElementById('forceDownloadBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Descargando...';
            
            await this.epgManager.forceEPGDownload();
            
            this.logActivity('⚡ Descarga inmediata iniciada');
            
        } catch (error) {
            console.error('Error en descarga forzada:', error);
            this.logActivity(`❌ Error en descarga: ${error.message}`);
        } finally {
            const btn = document.getElementById('forceDownloadBtn');
            btn.disabled = false;
            btn.textContent = '⚡ Descarga inmediata';
        }
    }

    /**
     * Limpia el cache de EPG
     */
    async clearCache() {
        try {
            const btn = document.getElementById('clearCacheBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Limpiando...';
            
            await this.epgManager.clearEPGCache();
            this.logActivity('🗑️ Cache limpiado exitosamente');
            
        } catch (error) {
            console.error('Error limpiando cache:', error);
            this.logActivity(`❌ Error limpiando cache: ${error.message}`);
        } finally {
            const btn = document.getElementById('clearCacheBtn');
            btn.disabled = false;
            btn.textContent = '🗑️ Limpiar cache';
        }
    }

    /**
     * Remapea los canales
     */
    async remapChannels() {
        try {
            const btn = document.getElementById('mapChannelsBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Mapeando...';
            
            // Forzar remapeo de canales
            if (this.epgManager.player.playlistData) {
                this.epgManager.iptvOrgIntegration.mapM3UChannels(
                    this.epgManager.player.playlistData
                );
                
                this.logActivity('🔗 Canales remapeados exitosamente');
                this.updateChannelList();
            }
            
        } catch (error) {
            console.error('Error en remapeo:', error);
            this.logActivity(`❌ Error en remapeo: ${error.message}`);
        } finally {
            const btn = document.getElementById('mapChannelsBtn');
            btn.disabled = false;
            btn.textContent = '🔗 Remapear canales';
        }
    }

    /**
     * Exporta la configuración
     */
    exportConfiguration() {
        try {
            const config = this.epgManager.exportEPGConfig();
            const blob = new Blob([JSON.stringify(config, null, 2)], 
                { type: 'application/json' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `epg-config-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.logActivity('📤 Configuración exportada');
            
        } catch (error) {
            console.error('Error exportando configuración:', error);
            this.logActivity(`❌ Error exportando: ${error.message}`);
        }
    }

    /**
     * Guarda la configuración
     */
    saveConfiguration() {
        try {
            const config = {
                scheduledHours: document.getElementById('scheduledHours').value
                    .split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h)),
                maxDaysToDownload: parseInt(document.getElementById('maxDays').value),
                maxConcurrentDownloads: parseInt(document.getElementById('maxConnections').value)
            };
            
            this.epgManager.configureAutoDownloader(config);
            this.logActivity('💾 Configuración guardada');
            
        } catch (error) {
            console.error('Error guardando configuración:', error);
            this.logActivity(`❌ Error guardando configuración: ${error.message}`);
        }
    }

    /**
     * Actualiza la lista de canales
     */
    updateChannelList() {
        const mappingInfo = this.epgManager.getChannelMappingInfo();
        const listContainer = document.getElementById('epgChannelList');
        
        if (mappingInfo.mappings.length === 0) {
            listContainer.innerHTML = '<div class="no-channels">No hay canales mapeados</div>';
            return;
        }
        
        const channelsHTML = mappingInfo.mappings.map(mapping => `
            <div class="channel-item ${mapping.hasEPG ? 'has-epg' : 'no-epg'}">
                <div class="channel-info">
                    <div class="channel-name">${mapping.m3uChannel}</div>
                    <div class="channel-mapping">→ ${mapping.iptvOrgId}</div>
                </div>
                <div class="channel-status">
                    ${mapping.hasEPG ? '✅ EPG' : '❌ Sin EPG'}
                </div>
            </div>
        `).join('');
        
        listContainer.innerHTML = channelsHTML;
    }

    /**
     * Busca canales
     */
    searchChannels() {
        const query = document.getElementById('channelSearchInput').value;
        
        if (query.length < 2) {
            this.updateChannelList();
            return;
        }
        
        try {
            const results = this.epgManager.searchIPTVOrgChannels(query);
            const listContainer = document.getElementById('epgChannelList');
            
            if (results.length === 0) {
                listContainer.innerHTML = '<div class="no-channels">No se encontraron canales</div>';
                return;
            }
            
            const resultsHTML = results.slice(0, 20).map(channel => `
                <div class="channel-item search-result">
                    <div class="channel-info">
                        <div class="channel-name">${channel.name}</div>
                        <div class="channel-details">${channel.country} • ${channel.categories.join(', ')}</div>
                    </div>
                    <div class="channel-actions">
                        <button class="add-channel-btn" data-channel-id="${channel.id}">
                            ➕ Agregar
                        </button>
                    </div>
                </div>
            `).join('');
            
            listContainer.innerHTML = resultsHTML;
            
        } catch (error) {
            console.error('Error buscando canales:', error);
        }
    }

    /**
     * Registra actividad en el log
     * @param {string} message - Mensaje a registrar
     */
    logActivity(message) {
        const logContainer = document.getElementById('epgActivityLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">${message}</span>
        `;
        
        logContainer.insertBefore(entry, logContainer.firstChild);
        
        // Mantener solo las últimas 50 entradas
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    /**
     * Limpia el log de actividad
     */
    clearLog() {
        document.getElementById('epgActivityLog').innerHTML = '';
    }

    /**
     * Destruye la interfaz
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.adminPanel) {
            document.body.removeChild(this.adminPanel);
            this.adminPanel = null;
        }
        
        this.isVisible = false;
        
        console.log('🗑️ EPGAdminUI destruido');
    }
}

export { EPGAdminUI };
