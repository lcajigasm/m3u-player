/**
 * EPG Integration - Integra funcionalidad EPG con M3UPlayer existente
 * Extiende el reproductor con capacidades de guía electróni        
    } else {
        console.error('❌ EPG Button not found');
    } programas
 */

/**
 * Integra funcionalidad EPG con una instancia de M3UPlayer
 * @param {M3UPlayer} player - Instancia del reproductor
 */
async function integrateEPG(player) {
    if (!player) {
        console.error('❌ No se proporcionó instancia de M3UPlayer');
        return;
    }

    try {
        console.log('🔌 Integrando funcionalidad EPG...');

        // Importar EPGManager dinámicamente
        const { EPGManager } = await import('./EPGManager.js');
        
        // Crear instancia del gestor EPG
        player.epgManager = new EPGManager(player);
        
        // Configurar botón EPG
        setupEPGButton(player);
        
        // Configurar eventos del reproductor para EPG
        setupPlayerEvents(player);
        
        // Inicializar EPG si ya hay playlist cargada
        if (player.playlistData && player.playlistData.length > 0) {
            await player.epgManager.loadEPGData(player.playlistData);
        }
        
        console.log('✅ EPG integrado correctamente');
        
    } catch (error) {
        console.error('❌ Error integrando EPG:', error);
    }
}

/**
 * Configura el botón EPG en la interfaz
 * @param {M3UPlayer} player - Instancia del reproductor
 */
function setupEPGButton(player) {
    const epgBtn = document.getElementById('epgBtn');
    
    if (!epgBtn) {
        console.warn('⚠️ Botón EPG no encontrado en la interfaz');
        return;
    }

    // Event listener para mostrar/ocultar EPG
    epgBtn.addEventListener('click', () => {
        if (!player.epgManager) {
            console.warn('⚠️ EPGManager no inicializado');
            return;
        }

        const epgModal = document.getElementById('epgModal');
        const isVisible = epgModal && epgModal.style.display !== 'none';
        
        if (isVisible) {
            player.epgManager.hideEPGGrid();
        } else {
            player.epgManager.showEPGGrid();
        }
    });

    console.log('🎮 Botón EPG configurado');
    
    // Inicializar EPG Manager automáticamente
    setTimeout(async () => {
        await initializeEPGManager(player);
        debugEPGButton();
        
        // Escuchar cuando se cargue una nueva playlist
        setupPlaylistListener(player);
    }, 2000);
}

/**
 * Configura listener para cuando se cargue una nueva playlist
 * @param {M3UPlayer} player - Instancia del reproductor
 */
function setupPlaylistListener(player) {
    // Crear un observer para detectar cambios en playlistData
    let lastPlaylistLength = player.playlistData ? player.playlistData.length : 0;
    
    const checkPlaylistChanges = async () => {
        const currentLength = player.playlistData ? player.playlistData.length : 0;
        
        if (currentLength > 0 && currentLength !== lastPlaylistLength) {
            console.log(`📺 Nueva playlist detectada con ${currentLength} canales (EPG deshabilitado temporalmente)`);
            lastPlaylistLength = currentLength;
            
            // EPG deshabilitado temporalmente para evitar rate limiting
            // if (player.epgManager && player.epgManager.isInitialized) {
            //     console.log('🔄 Cargando EPG para nueva playlist...');
            //     try {
            //         await player.epgManager.loadEPGData(player.playlistData);
            //         console.log('✅ EPG cargado para nueva playlist');
            //     } catch (error) {
            //         console.error('❌ Error cargando EPG para nueva playlist:', error);
            //     }
            // }
        }
    };
    
    // Verificar cambios cada 2 segundos
    setInterval(checkPlaylistChanges, 2000);
    console.log('👁️ Listener de playlist EPG configurado');
}

/**
 * Inicializa el EPG Manager
 * @param {M3UPlayer} player - Instancia del reproductor
 */
async function initializeEPGManager(player) {
    try {
        console.log('🔄 Inicializando EPG Manager...');
        
        if (!player.epgManager) {
            console.error('❌ EPG Manager no encontrado en player');
            return;
        }

        // Inicializar el EPG Manager
        await player.epgManager.initialize();
        
        // Verificar si hay canales cargados
        if (player.playlistData && player.playlistData.length > 0) {
            console.log(`📺 EPG: ${player.playlistData.length} canales detectados (EPG temporalmente deshabilitado para evitar rate limiting)`);
            
            // Temporalmente deshabilitado para evitar rate limiting agresivo
            // await player.epgManager.loadEPGData(player.playlistData);
            
            console.log('✅ EPG Manager inicializado (sin cargar datos EPG)');
        } else {
            console.log('⚠️ No hay canales cargados, EPG esperando playlist...');
        }
        
    } catch (error) {
        console.error('❌ Error inicializando EPG Manager:', error);
        console.log('📺 Continuando con funcionalidad EPG básica...');
        
        // Marcar como inicializado básico para que el modal funcione
        if (player.epgManager) {
            player.epgManager.isInitialized = true;
        }
    }
}

/**
 * Debug EPG button functionality
 */
function debugEPGButton() {
    console.log('🐛 EPG Debug Starting from EPGIntegration...');
    
    const epgBtn = document.getElementById('epgBtn');
    const epgModal = document.getElementById('epgModal');
    
    console.log('EPG Button found:', epgBtn);
    console.log('EPG Modal found:', epgModal);
    
    if (epgBtn) {
        console.log('EPG Button text:', epgBtn.textContent);
        console.log('EPG Button classes:', epgBtn.className);
        console.log('✅ EPG Button found and ready');
        
    } else {
        console.error('❌ EPG Button not found in DOM');
        alert('❌ EPG Button not found!\nCheck the console for more details.');
    }
    
    // List all buttons for debugging
    const allButtons = document.querySelectorAll('button[id]');
    console.log(`Found ${allButtons.length} buttons total:`);
    allButtons.forEach((btn, index) => {
        console.log(`  ${index}: ID="${btn.id}", Text="${btn.textContent.trim()}", Classes="${btn.className}"`);
    });
}

/**
 * Configura eventos del reproductor para EPG
 * @param {M3UPlayer} player - Instancia del reproductor
 */
function setupPlayerEvents(player) {
    // Guardar métodos originales
    const originalProcessM3UContent = player.processM3UContent;
    const originalPlayItem = player.playItem;

    // Extender processM3UContent para cargar datos EPG
    player.processM3UContent = function(content, filename) {
        // Llamar método original
        const result = originalProcessM3UContent.call(this, content, filename);
        
        // Emitir evento de playlist cargada para EPG
        if (this.epgManager && this.playlistData && this.playlistData.length > 0) {
            console.log('🔗 Emitiendo evento playlistLoaded para EPG');
            setTimeout(() => {
                // Usar el sistema de eventos del EPGManager
                if (this.emit) {
                    this.emit('playlistLoaded', this.playlistData);
                } else {
                    // Fallback directo
                    this.epgManager.loadEPGData(this.playlistData);
                }
            }, 1000); // Pequeño delay para permitir que se complete el renderizado
        }
        
        return result;
    };

    // Extender playItem para actualizar información de programa actual
    player.playItem = function(index) {
        // Llamar método original
        const result = originalPlayItem.call(this, index);
        
        // Emitir evento de cambio de canal para EPG
        if (this.epgManager && index >= 0) {
            console.log(`🔗 Emitiendo evento channelChanged para EPG: ${index}`);
            setTimeout(() => {
                if (this.emit) {
                    this.emit('channelChanged', index);
                } else {
                    // Fallback directo
                    this.epgManager.updateCurrentProgramInfo(index);
                }
            }, 500); // Pequeño delay para que se complete la carga del stream
        }
        
        return result;
    };

    // Configurar actualización periódica de programa actual
    const updateInterval = setInterval(() => {
        if (player.epgManager && player.currentIndex >= 0 && player.playlistData) {
            const channel = player.playlistData[player.currentIndex];
            if (channel) {
                const channelId = channel.tvgId || channel.name;
                const currentProgram = player.epgManager.getCurrentProgram(channelId);
                updateCurrentProgramInfo(currentProgram);
                
                // También actualizar en el EPGManager
                player.epgManager.updateCurrentProgramInfo(player.currentIndex);
            }
        }
    }, 60000); // Actualizar cada minuto

    // Guardar referencia del intervalo para limpieza posterior
    player._epgUpdateInterval = updateInterval;

    console.log('🔗 Eventos del reproductor configurados para EPG');
}

/**
 * Actualiza la información del programa actual en la UI
 * @param {EPGProgram|null} program - Programa actual
 */
function updateCurrentProgramInfo(program) {
    const titleElement = document.getElementById('currentProgramTitle');
    const timeElement = document.getElementById('currentProgramTime');
    
    if (titleElement && timeElement) {
        if (program) {
            titleElement.textContent = program.title;
            timeElement.textContent = formatTimeRange(program.startTime, program.endTime);
            
            // Añadir clase para indicar que hay información EPG
            titleElement.classList.add('has-epg-info');
            timeElement.classList.add('has-epg-info');
        } else {
            titleElement.textContent = 'Programa actual';
            timeElement.textContent = '--:-- - --:--';
            
            // Remover clase EPG
            titleElement.classList.remove('has-epg-info');
            timeElement.classList.remove('has-epg-info');
        }
    }
}

/**
 * Formatea un rango de tiempo
 * @param {Date} start - Hora de inicio
 * @param {Date} end - Hora de fin
 * @returns {string}
 */
function formatTimeRange(start, end) {
    const formatTime = (date) => {
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * Añade métodos de utilidad EPG al reproductor
 * @param {M3UPlayer} player - Instancia del reproductor
 */
function addEPGUtilities(player) {
    /**
     * Busca programas en el EPG
     * @param {string} query - Término de búsqueda
     * @returns {EPGProgram[]}
     */
    player.searchEPGPrograms = function(query) {
        if (!this.epgManager) return [];
        return this.epgManager.searchPrograms(query);
    };

    /**
     * Obtiene el programa actual para el canal activo
     * @returns {EPGProgram|null}
     */
    player.getCurrentEPGProgram = function() {
        if (!this.epgManager || this.currentIndex < 0 || !this.playlistData) {
            return null;
        }
        
        const channel = this.playlistData[this.currentIndex];
        const channelId = channel.tvgId || channel.name;
        return this.epgManager.getCurrentProgram(channelId);
    };

    /**
     * Configura un recordatorio para un programa
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @param {Date} startTime - Hora de inicio
     * @returns {Promise<string>}
     */
    player.setEPGReminder = async function(programId, channelId, startTime) {
        if (!this.epgManager) {
            throw new Error('EPG no disponible');
        }
        
        return await this.epgManager.setReminder(programId, channelId, startTime);
    };

    /**
     * Obtiene estadísticas del EPG
     * @returns {Object}
     */
    player.getEPGStats = function() {
        if (!this.epgManager) return null;
        
        return {
            channels: this.epgManager.channels.size,
            cacheStats: this.epgManager.cache?.getStorageStats(),
            reminderStats: this.epgManager.reminderManager?.getStats(),
            updateStats: this.epgManager.getUpdateStats()
        };
    };

    /**
     * Actualiza la configuración EPG
     * @param {Object} config - Nueva configuración
     */
    player.updateEPGConfig = function(config) {
        if (!this.epgManager) {
            throw new Error('EPG no disponible');
        }
        
        return this.epgManager.updateEPGConfig(config);
    };

    /**
     * Fuerza una actualización inmediata del EPG
     * @returns {Promise<void>}
     */
    player.forceEPGUpdate = async function() {
        if (!this.epgManager) {
            throw new Error('EPG no disponible');
        }
        
        return await this.epgManager.forceUpdate();
    };

    /**
     * Obtiene la configuración actual del EPG
     * @returns {Object}
     */
    player.getEPGConfig = function() {
        if (!this.epgManager) return null;
        
        return this.epgManager.getEPGConfig();
    };

    console.log('🛠️ Utilidades EPG añadidas al reproductor');
}

/**
 * Limpia la integración EPG
 * @param {M3UPlayer} player - Instancia del reproductor
 */
function cleanupEPGIntegration(player) {
    // Limpiar intervalo de actualización
    if (player._epgUpdateInterval) {
        clearInterval(player._epgUpdateInterval);
        player._epgUpdateInterval = null;
    }

    if (player.epgManager) {
        player.epgManager.destroy();
        player.epgManager = null;
    }
    
    // Remover event listeners del botón EPG
    const epgBtn = document.getElementById('epgBtn');
    if (epgBtn) {
        epgBtn.replaceWith(epgBtn.cloneNode(true));
    }
    
    console.log('🧹 Integración EPG limpiada');
}

// Exportar funciones de integración
export { 
    integrateEPG, 
    setupEPGButton, 
    setupPlayerEvents, 
    addEPGUtilities, 
    cleanupEPGIntegration 
};