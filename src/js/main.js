// M3U Player Electron - Script Principal
// Reproductor IPTV sin limitaciones CORS

class M3UPlayer {
    constructor() {
        this.playlist = [];
        this.currentIndex = -1;
        this.hls = null;
        this.config = {};
        this.isElectron = window.appInfo?.isElectron || false;

        this.initializeElements();
        this.setupEventListeners();
        this.loadConfiguration();

        console.log('🎬 Iniciando reproductor M3U...');
        console.log(`📱 Plataforma: ${this.isElectron ? 'Electron' : 'Web'}`);

        // Forzar recarga de estilos para evitar problemas de caché
        this.forceStyleRefresh();

        // Ocultar overlay al inicializar
        this.hideOverlay();

        // Verificar soporte de PiP
        this.checkPiPSupport();

        // Inicializar estado de ordenación
        this.sortAscending = false;

        // Configurar debouncing para búsqueda
        this.searchTimeout = null;
        
        // DEBUG: Add EPG debug after a delay
        setTimeout(() => {
            console.log('🔧 Setting up EPG debugging...');
            this.debugEPG();
        }, 2000);
    }

    // Búsqueda con debouncing para mejor rendimiento
    debouncedSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.handleSearch();
        }, 150); // 150ms de delay para evitar búsquedas excesivas
    }

    checkPiPSupport() {
        if (this.pipBtn) {
            if (!document.pictureInPictureEnabled) {
                this.pipBtn.disabled = true;
                this.pipBtn.title = 'Picture-in-Picture no soportado en este navegador';
                this.pipBtn.style.opacity = '0.5';
                console.warn('⚠️ Picture-in-Picture no soportado');
            } else {
                console.log('✅ Picture-in-Picture soportado');
            }
        }
    }

    hideOverlay() {
        if (this.videoOverlay) {
            this.videoOverlay.classList.remove('show');
            this.videoOverlay.style.display = 'none';
            console.log('🔧 Overlay ocultado al inicializar');
        }
    }

    forceStyleRefresh() {
        // Agregar timestamp a los estilos para evitar caché
        const timestamp = Date.now();
        const links = document.querySelectorAll('link[rel="stylesheet"]');

        links.forEach(link => {
            const href = link.href.split('?')[0];
            link.href = `${href}?v=${timestamp}`;
        });

        console.log('🔄 Estilos actualizados para evitar caché');
    }

    forceRefresh() {
        console.log('🔄 Forzando recarga completa...');

        if (this.isElectron && window.electronAPI) {
            // En Electron, recargar la ventana
            location.reload();
        } else {
            // En navegador, recarga forzada
            window.location.reload(true);
        }
    }

    forceHideOverlay() {
        console.log('👁️ Forzando ocultación del overlay...');

        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            overlay.style.visibility = 'hidden';
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '-1';
            console.log('✅ Overlay ocultado forzadamente');
        }

        // También forzar visibilidad de controles
        forceControlsVisibility();
    }

    initializeElements() {
        // Botones principales
        this.fileBtn = document.getElementById('fileBtn');
        this.urlBtn = document.getElementById('urlBtn');
        this.testBtn = document.getElementById('testBtn');
        // Elementos que solo existen en la interfaz inicial
        this.refreshBtn = document.getElementById('refreshBtn');
        this.hideOverlayBtn = document.getElementById('hideOverlayBtn');

        // Input de URL
        this.urlInput = document.getElementById('urlInput');
        this.m3uUrl = document.getElementById('m3uUrl');
        this.loadUrlBtn = document.getElementById('loadUrlBtn');
        this.cancelUrlBtn = document.getElementById('cancelUrlBtn');

        // Información de archivo
        this.fileInfo = document.getElementById('fileInfo');

        // Sección del reproductor
        this.playerSection = document.getElementById('playerSection');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.playlist = document.getElementById('playlist');

        // Controles
        this.prevBtn = document.getElementById('prevBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.pipBtn = document.getElementById('pipBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeLabel = document.getElementById('volumeLabel');
        this.brightnessSlider = document.getElementById('brightnessSlider');
        this.contrastSlider = document.getElementById('contrastSlider');
        this.resetFiltersBtn = document.getElementById('resetFiltersBtn');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.durationDisplay = document.getElementById('duration');

        // Información actual
        this.currentTitle = document.getElementById('currentTitle');
        this.currentUrl = document.getElementById('currentUrl');
        this.streamInfo = document.getElementById('streamInfo');

        // Búsqueda y exportar
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.groupFilter = document.getElementById('groupFilter');
        this.typeFilter = document.getElementById('typeFilter');
        this.sortBtn = document.getElementById('sortBtn');
        this.channelCount = document.getElementById('channelCount');
        this.exportBtn = document.getElementById('exportBtn');
        this.refreshPlaylistBtn = document.getElementById('refreshPlaylistBtn');

        // Modales
        this.settingsModal = document.getElementById('settingsModal');
        this.aboutModal = document.getElementById('aboutModal');
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.shortcutsHeaderBtn = document.getElementById('shortcutsHeaderBtn');
        this.closeShortcutsBtn = document.getElementById('closeShortcuts');

        // Overlay de video
        this.videoOverlay = document.getElementById('videoOverlay');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.retryBtn = document.getElementById('retryBtn');
    }

    setupEventListeners() {
        // Botones principales
        this.fileBtn?.addEventListener('click', () => this.openFileDialog());
        this.urlBtn?.addEventListener('click', () => this.showUrlInput());
        this.testBtn?.addEventListener('click', () => this.loadTestFile());
        this.refreshBtn?.addEventListener('click', () => this.forceRefresh());
        this.hideOverlayBtn?.addEventListener('click', () => this.forceHideOverlay());

        // URL input
        this.loadUrlBtn?.addEventListener('click', () => this.loadFromUrl());
        this.cancelUrlBtn?.addEventListener('click', () => this.hideUrlInput());
        this.m3uUrl?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadFromUrl();
        });

        // Controles del reproductor
        this.prevBtn?.addEventListener('click', () => this.playPrevious());
        this.playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
        this.nextBtn?.addEventListener('click', () => this.playNext());
        this.stopBtn?.addEventListener('click', () => this.stopPlayback());
        this.pipBtn?.addEventListener('click', () => this.togglePictureInPicture());
        this.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());

        // Control de volumen
        this.volumeSlider?.addEventListener('input', (e) => this.setVolume(e.target.value));

        // Controles de video
        this.brightnessSlider?.addEventListener('input', (e) => this.setBrightness(e.target.value));
        this.contrastSlider?.addEventListener('input', (e) => this.setContrast(e.target.value));
        this.resetFiltersBtn?.addEventListener('click', () => this.resetVideoFilters());

        // Búsqueda optimizada con debouncing
        this.searchInput?.addEventListener('input', () => this.debouncedSearch());
        this.clearSearchBtn?.addEventListener('click', () => this.clearSearch());
        this.groupFilter?.addEventListener('change', () => this.handleSearch());
        this.typeFilter?.addEventListener('change', () => this.handleSearch());
        this.sortBtn?.addEventListener('click', () => this.toggleSort());

        // Exportar y acciones
        this.exportBtn?.addEventListener('click', () => this.exportPlaylist());
        this.refreshPlaylistBtn?.addEventListener('click', () => this.refreshPlaylist());
        
        // EPG button - Simple implementation
        this.setupEPGButton();

        // Eventos del reproductor de video
        this.videoPlayer?.addEventListener('loadstart', () => this.showLoading());
        this.videoPlayer?.addEventListener('canplay', () => this.hideLoading());
        this.videoPlayer?.addEventListener('error', (e) => this.handleVideoError(e));
        this.videoPlayer?.addEventListener('ended', () => this.playNext());
        this.videoPlayer?.addEventListener('play', () => this.updatePlayPauseButton());
        this.videoPlayer?.addEventListener('pause', () => this.updatePlayPauseButton());
        this.videoPlayer?.addEventListener('timeupdate', () => this.updateTimeDisplay());
        this.videoPlayer?.addEventListener('loadedmetadata', () => this.updateDuration());

        // Eventos de Picture-in-Picture
        this.videoPlayer?.addEventListener('enterpictureinpicture', () => {
            console.log('📺 Picture-in-Picture activado');
            if (this.pipBtn) {
                this.pipBtn.innerHTML = '📺 Salir PiP';
                this.pipBtn.classList.add('pip-active');
            }
        });

        this.videoPlayer?.addEventListener('leavepictureinpicture', () => {
            console.log('📺 Picture-in-Picture desactivado');
            if (this.pipBtn) {
                this.pipBtn.innerHTML = '📺 PiP';
                this.pipBtn.classList.remove('pip-active');
            }
        });

        // Eventos de pantalla completa
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                if (this.fullscreenBtn) this.fullscreenBtn.textContent = '⛶ Salir';
            } else {
                if (this.fullscreenBtn) this.fullscreenBtn.textContent = '⛶ Pantalla';
            }
        });

        // Retry button
        this.retryBtn?.addEventListener('click', () => this.retryCurrentStream());

        // Eventos de Electron (si está disponible)
        if (this.isElectron && window.electronAPI) {
            this.setupElectronEvents();
        }

        // Cerrar modales
        document.getElementById('closeSettings')?.addEventListener('click', () => this.hideSettings());
        document.getElementById('closeAbout')?.addEventListener('click', () => this.hideAbout());

        // Configuración
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettings')?.addEventListener('click', () => this.resetSettings());

        // Shortcuts modal
        this.shortcutsHeaderBtn?.addEventListener('click', () => this.showShortcuts());
        this.closeShortcutsBtn?.addEventListener('click', () => this.hideShortcuts());
        document.addEventListener('keydown', (e) => {
            // Open shortcuts with Shift+/
            if (e.shiftKey && e.key === '?') {
                e.preventDefault();
                this.showShortcuts();
            }
            if (e.key === 'Escape') {
                // Close shortcuts modal if open
                if (this.shortcutsModal && this.shortcutsModal.style.display !== 'none') {
                    this.hideShortcuts();
                }
            }
        }, { capture: true });
    }

    /**
     * Setup EPG button functionality
     */
    setupEPGButton() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            this.initializeEPGListeners();
        }, 1000); // Wait 1 second for DOM to be fully loaded
    }

    /**
     * Initialize EPG event listeners
     */
    initializeEPGListeners() {
        console.log('🔧 Initializing EPG listeners...');
        
        // EPG button from HTML
        const epgBtn = document.getElementById('epgBtn');
        console.log('EPG button found:', epgBtn);
        
        if (epgBtn) {
            epgBtn.addEventListener('click', () => {
                console.log('📺 EPG button clicked!');
                this.showEPGModal();
            });
            console.log('✅ EPG button listener added');
        } else {
            console.warn('⚠️ EPG button not found in DOM');
        }
        
        // Close EPG modal
        const closeEPGBtn = document.getElementById('closeEPG');
        if (closeEPGBtn) {
            closeEPGBtn.addEventListener('click', () => {
                console.log('❌ Closing EPG modal');
                this.hideEPGModal();
            });
        }
        
        // Close modal when clicking outside
        const epgModal = document.getElementById('epgModal');
        if (epgModal) {
            epgModal.addEventListener('click', (e) => {
                if (e.target === epgModal) {
                    this.hideEPGModal();
                }
            });
        }
    }

    showShortcuts() {
        if (this.shortcutsModal) {
            this.shortcutsModal.style.display = 'block';
            const closeBtn = this.closeShortcutsBtn;
            closeBtn?.focus();
        }
    }

    hideShortcuts() {
        if (this.shortcutsModal) {
            this.shortcutsModal.style.display = 'none';
        }
    }

    /**
     * Show EPG modal
     */
    showEPGModal() {
        console.log('📺 Showing EPG modal...');
        const epgModal = document.getElementById('epgModal');
        
        if (epgModal) {
            epgModal.style.display = 'flex';
            epgModal.classList.add('show');
            console.log('✅ EPG modal shown');
            
            // Add some test content if empty
            const epgContent = epgModal.querySelector('.epg-grid-container');
            if (epgContent && epgContent.children.length === 0) {
                epgContent.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <h3>📺 Electronic Program Guide</h3>
                        <p>EPG system is being initialized...</p>
                        <p>This is a test display to verify the modal is working.</p>
                    </div>
                `;
            }
        } else {
            console.error('❌ EPG modal not found in DOM');
        }
    }

    /**
     * Hide EPG modal
     */
    hideEPGModal() {
        const epgModal = document.getElementById('epgModal');
        
        if (epgModal) {
            epgModal.classList.remove('show');
            setTimeout(() => {
                epgModal.style.display = 'none';
            }, 300);
            console.log('📺 EPG modal hidden');
        }
    }

    /**
     * Debug EPG functionality
     */
    debugEPG() {
        console.log('🐛 EPG Debug Starting...');
        
        // Show visible alert to confirm debugging is working
        alert('🐛 EPG Debug Starting! Check console for details.');
        
        // Check if elements exist
        const epgBtn = document.getElementById('epgBtn');
        const epgModal = document.getElementById('epgModal');
        
        console.log('EPG Button found:', epgBtn);
        console.log('EPG Modal found:', epgModal);
        
        if (epgBtn) {
            console.log('EPG Button text:', epgBtn.textContent);
            console.log('EPG Button classes:', epgBtn.className);
            
            // Make button more visible for testing
            epgBtn.style.background = 'red';
            epgBtn.style.border = '2px solid yellow';
            epgBtn.title = 'EPG DEBUG MODE - Click to test modal';
            
            // Add a direct click handler for testing
            epgBtn.addEventListener('click', () => {
                console.log('🎯 EPG Button clicked! (debug handler)');
                if (epgModal) {
                    epgModal.style.display = 'flex';
                    epgModal.classList.add('show');
                    
                    // Add test content
                    const content = epgModal.querySelector('.epg-grid-container');
                    if (content) {
                        content.innerHTML = `
                            <div style="padding: 20px; text-align: center; color: white;">
                                <h3>🐛 EPG Debug Test</h3>
                                <p>This modal is working correctly!</p>
                                <p>Time: ${new Date().toLocaleTimeString()}</p>
                                <button onclick="document.getElementById('epgModal').style.display='none'" 
                                        style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-top: 10px; cursor: pointer;">
                                    Close
                                </button>
                            </div>
                        `;
                    }
                    console.log('✅ Modal opened with debug content');
                } else {
                    console.error('❌ Modal not found when clicking button');
                }
            });
            
            console.log('✅ Debug click handler added to EPG button');
        } else {
            console.error('❌ EPG Button not found in DOM');
        }
        
        // List all buttons for debugging
        const allButtons = document.querySelectorAll('button');
        console.log(`Found ${allButtons.length} buttons total:`);
        allButtons.forEach((btn, index) => {
            console.log(`  ${index}: ID="${btn.id}", Text="${btn.textContent.trim()}", Classes="${btn.className}"`);
        });
    }

    setupElectronEvents() {
        // Archivo cargado desde el main process
        window.electronAPI.onFileLoaded((data) => {
            this.processM3UContent(data.content, data.filename);
        });

        // Mostrar diálogos
        window.electronAPI.onShowUrlDialog(() => this.showUrlInput());
        window.electronAPI.onShowSettings(() => this.showSettings());
        window.electronAPI.onShowAbout(() => this.showAbout());

        // Controles de teclado
        window.electronAPI.onTogglePlayback(() => this.togglePlayPause());
        window.electronAPI.onStopPlayback(() => this.stopPlayback());
        window.electronAPI.onVolumeUp(() => this.adjustVolume(10));
        window.electronAPI.onVolumeDown(() => this.adjustVolume(-10));
        window.electronAPI.onToggleMute(() => this.toggleMute());

        // Atajos de teclado adicionales
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return; // No interferir con inputs

            switch (e.key.toLowerCase()) {
                case 'p':
                    e.preventDefault();
                    this.togglePictureInPicture();
                    break;
                case 'f':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.adjustBrightness(5);
                    break;
                case '-':
                    e.preventDefault();
                    this.adjustBrightness(-5);
                    break;
            }
        });

        // Playlist keyboard navigation
        this.playlist?.addEventListener('keydown', (e) => {
            const items = Array.from(this.playlist.querySelectorAll('.playlist-item'));
            if (items.length === 0) return;
            const active = document.activeElement;
            const idx = items.indexOf(active);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = items[Math.min((idx >= 0 ? idx + 1 : 0), items.length - 1)];
                next?.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = items[Math.max((idx >= 0 ? idx - 1 : items.length - 1), 0)];
                prev?.focus();
            }
        });
    }

    async loadConfiguration() {
        if (this.isElectron && window.electronAPI) {
            try {
                this.config = await window.electronAPI.loadConfig();
                this.applyConfiguration();
            } catch (error) {
                console.error('Error cargando configuración:', error);
                this.config = this.getDefaultConfig();
            }
        } else {
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            playerSettings: {
                volume: 0.8,
                autoplay: true,
                userAgent: 'M3U Player/1.0.0',
                referer: '',
                origin: ''
            }
        };
    }

    applyConfiguration() {
        if (this.config.playerSettings) {
            const settings = this.config.playerSettings;

            // Aplicar volumen
            if (this.volumeSlider && this.videoPlayer) {
                this.volumeSlider.value = settings.volume * 100;
                this.videoPlayer.volume = settings.volume;
                this.updateVolumeLabel(settings.volume * 100);
            }

            // Aplicar configuraciones en la UI
            const userAgentInput = document.getElementById('userAgentInput');
            const refererInput = document.getElementById('refererInput');
            const originInput = document.getElementById('originInput');
            const autoplayCheck = document.getElementById('autoplayCheck');

            if (userAgentInput) userAgentInput.value = settings.userAgent || '';
            if (refererInput) refererInput.value = settings.referer || '';
            if (originInput) originInput.value = settings.origin || '';
            if (autoplayCheck) autoplayCheck.checked = settings.autoplay;
        }
    }

    showUrlInput() {
        if (this.urlInput) {
            this.urlInput.style.display = 'block';
            this.m3uUrl?.focus();
        }
    }

    hideUrlInput() {
        if (this.urlInput) {
            this.urlInput.style.display = 'none';
            this.m3uUrl.value = '';
        }
    }

    async openFileDialog() {
        if (this.isElectron && window.electronAPI) {
            await window.electronAPI.openFileDialog();
        } else {
            // Fallback para navegador web
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.m3u,.m3u8';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.processM3UContent(e.target.result, file.name);
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }
    }

    async loadFromUrl() {
        const url = this.m3uUrl?.value?.trim();
        if (!url) {
            this.showError('Por favor ingresa una URL válida');
            return;
        }

        try {
            this.showFileInfo('Cargando desde URL...', 'loading');

            let content;
            if (this.isElectron && window.electronAPI) {
                const response = await window.electronAPI.fetchUrl(url, {
                    userAgent: this.config.playerSettings?.userAgent,
                    referer: this.config.playerSettings?.referer,
                    origin: this.config.playerSettings?.origin
                });

                if (response.success) {
                    content = response.data;
                } else {
                    throw new Error(response.error);
                }
            } else {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                content = await response.text();
            }

            this.processM3UContent(content, new URL(url).pathname.split('/').pop() || 'playlist.m3u');
            this.hideUrlInput();

        } catch (error) {
            console.error('Error cargando URL:', error);
            this.showError(`Error cargando URL: ${error.message}`);
        }
    }

    loadTestFile() {
        // Cargar archivo de prueba con logos
        const testContent = `#EXTM3U
#EXTINF:-1 tvg-id="bbc1" tvg-name="BBC One" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/BBC_One_logo_%282021%29.svg/512px-BBC_One_logo_%282021%29.svg.png" group-title="UK",BBC One
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-id="cnn" tvg-name="CNN" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/512px-CNN.svg.png" group-title="News",CNN International
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-id="discovery" tvg-name="Discovery Channel" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Discovery_Channel_-_Logo_2019.svg/512px-Discovery_Channel_-_Logo_2019.svg.png" group-title="Documentary",Discovery Channel
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4`;

        this.processM3UContent(testContent, 'test-with-logos.m3u');
    }

    processM3UContent(content, filename) {
        try {
            console.log(`📁 Procesando archivo: ${filename}`);

            this.playlistData = this.parseM3U(content);
            console.log(`📋 ${this.playlistData.length} elementos en la playlist`);

            if (this.playlistData.length === 0) {
                this.showError('No se encontraron elementos válidos en el archivo M3U');
                return;
            }

            this.showFileInfo(`✅ ${filename} - ${this.playlistData.length} elementos cargados`, 'success');
            this.renderPlaylist();
            this.showPlayerSection();

        } catch (error) {
            console.error('Error procesando M3U:', error);
            this.showError(`Error procesando archivo: ${error.message}`);
        }
    }

    parseM3U(content) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const items = [];
        let currentItem = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('#EXTM3U')) {
                continue;
            }

            if (line.startsWith('#EXTINF:')) {
                // Parsear información del elemento
                const match = line.match(/#EXTINF:([^,]*),(.*)$/);
                if (match) {
                    currentItem = {
                        duration: match[1],
                        title: match[2].trim(),
                        group: '',
                        logo: '',
                        tvgId: '',
                        tvgName: ''
                    };

                    // Extraer atributos adicionales con regex más robusto
                    const attrs = line.match(/(\w+(?:-\w+)*)="([^"]*)"/g);
                    if (attrs) {
                        attrs.forEach(attr => {
                            const equalIndex = attr.indexOf('=');
                            const key = attr.substring(0, equalIndex);
                            const value = attr.substring(equalIndex + 1).replace(/"/g, '');

                            switch (key.toLowerCase()) {
                                case 'group-title':
                                    currentItem.group = value;
                                    break;
                                case 'tvg-logo':
                                    currentItem.logo = value;
                                    break;
                                case 'tvg-id':
                                    currentItem.tvgId = value;
                                    break;
                                case 'tvg-name':
                                    currentItem.tvgName = value;
                                    break;
                            }
                        });
                    }

                    // Si no hay título en los atributos, usar el que viene después de la coma
                    if (!currentItem.title && currentItem.tvgName) {
                        currentItem.title = currentItem.tvgName;
                    }
                }
            } else if (line && !line.startsWith('#') && currentItem.title) {
                // Esta es la URL del stream
                currentItem.url = line;
                currentItem.type = this.detectStreamType(line);
                items.push({ ...currentItem });
                currentItem = {};
            }
        }

        return items;
    }

    detectStreamType(url) {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('.m3u8')) {
            return 'HLS';
        } else if (urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.ogg')) {
            return 'Direct';
        } else {
            return 'Stream';
        }
    }

    renderPlaylist() {
        if (!this.playlist || !this.playlistData) return;

        console.log(`📋 Renderizando ${this.playlistData.length} elementos...`);

        // Usar fragment para mejor rendimiento
        const fragment = document.createDocumentFragment();

        // Renderizar en lotes para no bloquear la UI
        const batchSize = 50;
        let currentBatch = 0;

        const renderBatch = () => {
            const start = currentBatch * batchSize;
            const end = Math.min(start + batchSize, this.playlistData.length);

            for (let i = start; i < end; i++) {
                const item = this.playlistData[i];
                const playlistItem = this.createPlaylistItem(item, i);
                fragment.appendChild(playlistItem);
            }

            currentBatch++;

            if (end < this.playlistData.length) {
                // Continuar con el siguiente lote
                requestAnimationFrame(renderBatch);
            } else {
                // Insertar todo de una vez al final
                this.playlist.innerHTML = '';
                this.playlist.appendChild(fragment);

                // Configurar filtros y contador
                this.populateGroupFilter();
                this.updateChannelCount(this.playlistData.length, this.playlistData.length);

                console.log(`✅ Playlist renderizada completamente`);
            }
        };

        // Iniciar renderizado
        renderBatch();

        // Precargar logos en segundo plano
        setTimeout(() => this.preloadLogos(), 100);
    }

    preloadLogos() {
        const logosToPreload = this.playlistData
            .filter(item => item.logo)
            .slice(0, 20) // Solo precargar los primeros 20 para no sobrecargar
            .map(item => item.logo);

        logosToPreload.forEach(logoUrl => {
            const img = new Image();
            img.src = logoUrl;
            // No necesitamos hacer nada con la imagen, solo precargarla
        });

        if (logosToPreload.length > 0) {
            console.log(`🖼️ Precargando ${logosToPreload.length} logos...`);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showPlayerSection() {
        if (this.playerSection) {
            // Ocultar sección de carga
            const uploadSection = document.getElementById('uploadSection');
            if (uploadSection) {
                uploadSection.style.display = 'none';
            }

            // Mostrar reproductor con animación
            this.playerSection.style.display = 'block';
            this.playerSection.style.opacity = '0';
            this.playerSection.style.transform = 'translateY(20px)';

            requestAnimationFrame(() => {
                this.playerSection.style.transition = 'all 0.5s ease';
                this.playerSection.style.opacity = '1';
                this.playerSection.style.transform = 'translateY(0)';
            });
        }

        // Inicializar controles
        this.updatePlayPauseButton();
        if (this.currentTimeDisplay) this.currentTimeDisplay.textContent = '00:00';
        if (this.durationDisplay) this.durationDisplay.textContent = '00:00';

        console.log('🎬 Reproductor mostrado');
    }

    async playItem(index) {
        if (index < 0 || index >= this.playlistData.length) return;

        const item = this.playlistData[index];
        console.log(`🎬 Cargando: ${item.title}`);

        this.currentIndex = index;
        this.updateCurrentInfo(item);
        this.updatePlaylistSelection();

        try {
            await this.loadStream(item);
        } catch (error) {
            console.error('Error cargando stream:', error);
            this.handleStreamError(error);
        }
    }

    async loadStream(item) {
        this.showLoading();
        this.hideError();

        // Limpiar HLS anterior si existe
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Resetear filtros de video a valores por defecto
        this.resetVideoFilters();

        if (item.type === 'HLS' && window.Hls && window.Hls.isSupported()) {
            await this.loadHLSStream(item);
        } else {
            await this.loadDirectStream(item);
        }
    }

    resetVideoFilters() {
        if (this.videoPlayer) {
            // Resetear a valores normales
            this.videoPlayer.style.filter = 'brightness(1) contrast(1) saturate(1.1)';

            // Resetear sliders a valores por defecto
            if (this.brightnessSlider) this.brightnessSlider.value = 100;
            if (this.contrastSlider) this.contrastSlider.value = 100;

            console.log('🔄 Filtros de video reseteados');
        }
    }

    async loadHLSStream(item) {
        return new Promise((resolve, reject) => {
            console.log('📡 Cargando stream HLS con HLS.js');

            this.hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90
            });

            this.hls.loadSource(item.url);
            this.hls.attachMedia(this.videoPlayer);

            this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                console.log('✅ Stream HLS cargado correctamente');
                this.hideLoading();

                if (this.config.playerSettings?.autoplay) {
                    this.videoPlayer.play().catch(e => {
                        console.warn('Autoplay bloqueado:', e);
                    });
                }
                this.updatePlayPauseButton();
                resolve();
            });

            this.hls.on(window.Hls.Events.ERROR, (event, data) => {
                console.error('❌ Error HLS:', data);

                if (data.fatal) {
                    switch (data.type) {
                        case window.Hls.ErrorTypes.NETWORK_ERROR:
                            reject(new Error('Error de red al cargar el stream HLS'));
                            break;
                        case window.Hls.ErrorTypes.MEDIA_ERROR:
                            reject(new Error('Error de media en el stream HLS'));
                            break;
                        default:
                            reject(new Error(`Error HLS fatal: ${data.details}`));
                            break;
                    }
                }
            });

            // Timeout para HLS
            setTimeout(() => {
                if (this.videoPlayer.readyState === 0) {
                    reject(new Error('Timeout cargando stream HLS (15s)'));
                }
            }, 15000);
        });
    }

    async loadDirectStream(item) {
        return new Promise((resolve, reject) => {
            console.log('🎥 Cargando stream directo');

            const handleCanPlay = () => {
                console.log('✅ Stream directo cargado correctamente');
                this.hideLoading();

                if (this.config.playerSettings?.autoplay) {
                    this.videoPlayer.play().catch(e => {
                        console.warn('Autoplay bloqueado:', e);
                    });
                }

                this.updatePlayPauseButton();
                this.videoPlayer.removeEventListener('canplay', handleCanPlay);
                this.videoPlayer.removeEventListener('error', handleError);
                resolve();
            };

            const handleError = (e) => {
                this.videoPlayer.removeEventListener('canplay', handleCanPlay);
                this.videoPlayer.removeEventListener('error', handleError);
                reject(new Error('Error cargando stream directo'));
            };

            this.videoPlayer.addEventListener('canplay', handleCanPlay);
            this.videoPlayer.addEventListener('error', handleError);

            // Configurar source
            this.videoPlayer.src = item.url;
            this.videoPlayer.load();

            // Timeout para streams directos
            setTimeout(() => {
                if (this.videoPlayer.readyState === 0) {
                    this.videoPlayer.removeEventListener('canplay', handleCanPlay);
                    this.videoPlayer.removeEventListener('error', handleError);
                    reject(new Error('Timeout cargando stream directo (10s)'));
                }
            }, 10000);
        });
    }

    handleStreamError(error) {
        console.error('❌ Error de stream:', error.message);
        this.showError(`Error: ${error.message}`);

        // Auto-avanzar al siguiente después de un error
        setTimeout(() => {
            if (this.currentIndex < this.playlistData.length - 1) {
                console.log('⏭️ Auto-avanzando al siguiente stream...');
                this.playNext();
            }
        }, 3000);
    }

    async testStream(index) {
        const item = this.playlistData[index];
        console.log(`🔧 Probando stream: ${item.title}`);

        try {
            let result;
            if (this.isElectron && window.electronAPI) {
                result = await window.electronAPI.fetchUrl(item.url, {
                    method: 'HEAD',
                    timeout: 5000,
                    userAgent: this.config.playerSettings?.userAgent
                });

                if (result.success) {
                    alert(`✅ Stream accesible\nCódigo: ${result.statusCode}\nTipo: ${result.headers['content-type'] || 'Desconocido'}`);
                } else {
                    alert(`❌ Stream no accesible\nError: ${result.error}`);
                }
            } else {
                // Fallback para navegador
                const response = await fetch(item.url, { method: 'HEAD' });
                if (response.ok) {
                    alert(`✅ Stream accesible\nCódigo: ${response.status}\nTipo: ${response.headers.get('content-type') || 'Desconocido'}`);
                } else {
                    alert(`❌ Stream no accesible\nCódigo: ${response.status}`);
                }
            }
        } catch (error) {
            alert(`❌ Error probando stream\n${error.message}`);
        }
    }

    updateCurrentInfo(item) {
        if (this.currentTitle) {
            this.currentTitle.textContent = item.title;
        }
        if (this.currentUrl) {
            this.currentUrl.textContent = item.url;
        }
        if (this.streamInfo) {
            const logoInfo = item.logo ? `<strong>Logo:</strong> ✅ | ` : '';
            this.streamInfo.innerHTML = `
                ${logoInfo}
                <strong>Tipo:</strong> ${item.type} | 
                <strong>Grupo:</strong> ${item.group || 'Sin grupo'} | 
                <strong>Duración:</strong> ${item.duration === '-1' ? 'En vivo' : item.duration + 's'}
                ${item.tvgId ? ` | <strong>ID:</strong> ${item.tvgId}` : ''}
            `;
        }
    }

    updatePlaylistSelection() {
        // Remover selección anterior
        const items = this.playlist?.querySelectorAll('.playlist-item');
        items?.forEach(item => item.classList.remove('active'));

        // Agregar selección actual
        const currentItem = this.playlist?.querySelector(`[data-index="${this.currentIndex}"]`);
        currentItem?.classList.add('active');

        // Scroll hacia el elemento activo
        currentItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Controles de reproducción
    playPrevious() {
        if (this.currentIndex > 0) {
            this.playItem(this.currentIndex - 1);
        }
    }

    playNext() {
        if (this.currentIndex < this.playlistData.length - 1) {
            this.playItem(this.currentIndex + 1);
        }
    }

    togglePlayPause() {
        if (!this.videoPlayer) return;

        if (this.videoPlayer.paused) {
            this.videoPlayer.play().catch(e => console.warn('Error reproduciendo:', e));
        } else {
            this.videoPlayer.pause();
        }
    }

    stopPlayback() {
        if (this.videoPlayer) {
            this.videoPlayer.pause();
            this.videoPlayer.currentTime = 0;
            this.videoPlayer.src = '';
        }

        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        this.hideLoading();
        this.hideError();
        this.updatePlayPauseButton();

        // Resetear información actual
        if (this.currentTitle) this.currentTitle.textContent = 'No hay video seleccionado';
        if (this.currentUrl) this.currentUrl.textContent = '';
        if (this.streamInfo) this.streamInfo.innerHTML = '';

        console.log('⏹️ Reproducción detenida');
    }

    setVolume(value) {
        if (this.videoPlayer) {
            this.videoPlayer.volume = value / 100;
            this.updateVolumeLabel(value);
        }
    }

    updateVolumeLabel(value) {
        if (this.volumeLabel) {
            const icon = value == 0 ? '🔇' : value < 50 ? '🔉' : '🔊';
            this.volumeLabel.textContent = `${icon} ${Math.round(value)}%`;
        }
    }

    adjustVolume(delta) {
        if (this.volumeSlider) {
            const newValue = Math.max(0, Math.min(100, parseInt(this.volumeSlider.value) + delta));
            this.volumeSlider.value = newValue;
            this.setVolume(newValue);
        }
    }

    toggleMute() {
        if (this.videoPlayer) {
            this.videoPlayer.muted = !this.videoPlayer.muted;
        }
    }

    async togglePictureInPicture() {
        if (!this.videoPlayer) {
            console.warn('No hay reproductor de video disponible');
            return;
        }

        try {
            // Verificar soporte de PiP
            if (!document.pictureInPictureEnabled) {
                this.showError('Picture-in-Picture no está soportado en este navegador');
                return;
            }

            if (this.videoPlayer.disablePictureInPicture) {
                this.showError('Picture-in-Picture está deshabilitado para este video');
                return;
            }

            // Verificar que hay contenido de video
            if (this.videoPlayer.readyState === 0) {
                this.showError('Debe cargar un video antes de usar Picture-in-Picture');
                return;
            }

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                console.log('📺 Saliendo de Picture-in-Picture');
            } else {
                await this.videoPlayer.requestPictureInPicture();
                console.log('📺 Entrando en Picture-in-Picture');
            }
        } catch (error) {
            console.error('Error con Picture-in-Picture:', error);

            let errorMessage = 'Error activando Picture-in-Picture';
            if (error.name === 'InvalidStateError') {
                errorMessage = 'El video debe estar reproduciéndose para usar PiP';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Picture-in-Picture no está soportado';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Picture-in-Picture fue bloqueado por el navegador';
            }

            this.showError(errorMessage);
        }
    }

    toggleFullscreen() {
        if (!this.videoPlayer) return;

        try {
            if (document.fullscreenElement) {
                document.exitFullscreen();
                console.log('⛶ Saliendo de pantalla completa');
            } else {
                this.videoPlayer.requestFullscreen();
                console.log('⛶ Entrando en pantalla completa');
            }
        } catch (error) {
            console.error('Error con pantalla completa:', error);
            alert('Error activando pantalla completa: ' + error.message);
        }
    }

    setBrightness(value) {
        if (this.videoPlayer) {
            const brightness = value / 100;
            const contrast = this.contrastSlider ? this.contrastSlider.value / 100 : 1.0;
            this.videoPlayer.style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(1.1)`;
            console.log(`☀️ Brillo ajustado a: ${value}%`);
        }
    }

    setContrast(value) {
        if (this.videoPlayer) {
            const contrast = value / 100;
            const brightness = this.brightnessSlider ? this.brightnessSlider.value / 100 : 1.0;
            this.videoPlayer.style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(1.1)`;
            console.log(`🔆 Contraste ajustado a: ${value}%`);
        }
    }

    adjustBrightness(delta) {
        if (this.brightnessSlider) {
            const newValue = Math.max(50, Math.min(150, parseInt(this.brightnessSlider.value) + delta));
            this.brightnessSlider.value = newValue;
            this.setBrightness(newValue);
        }
    }

    updatePlayPauseButton() {
        const t = window.__t || ((k) => k);
        if (this.playPauseBtn && this.videoPlayer) {
            if (this.videoPlayer.paused) {
                this.playPauseBtn.textContent = `▶️ ${t('play')}`;
            } else {
                this.playPauseBtn.textContent = `⏸️ ${t('pause')}`;
            }
        }
    }

    updateTimeDisplay() {
        if (this.currentTimeDisplay && this.videoPlayer) {
            const currentTime = this.formatTime(this.videoPlayer.currentTime);
            this.currentTimeDisplay.textContent = currentTime;
        }
    }

    updateDuration() {
        if (this.durationDisplay && this.videoPlayer) {
            const duration = this.formatTime(this.videoPlayer.duration);
            this.durationDisplay.textContent = duration;
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) {
            return '00:00';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    retryCurrentStream() {
        if (this.currentIndex >= 0) {
            this.playItem(this.currentIndex);
        }
    }

    // UI helpers
    showLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'block';
            this.loadingSpinner.setAttribute('aria-busy', 'true');
        }
        if (this.videoOverlay) {
            this.videoOverlay.classList.add('show');
            this.videoOverlay.style.display = 'flex';
        }
        if (this.playPauseBtn) {
            const t = window.__t || ((k) => k);
            this.playPauseBtn.textContent = `⏳ ${t('loading')}`;
            this.playPauseBtn.disabled = true;
        }
        this.hideError();
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
            this.loadingSpinner.setAttribute('aria-busy', 'false');
        }
        if (this.videoOverlay) {
            this.videoOverlay.classList.remove('show');
            this.videoOverlay.style.display = 'none';
        }
        if (this.playPauseBtn) {
            this.playPauseBtn.disabled = false;
        }
        this.updatePlayPauseButton();
    }

    showError(message) {
        if (this.errorMessage && this.errorText) {
            this.errorText.textContent = message;
            this.errorMessage.style.display = 'block';
        }
        if (this.videoOverlay) {
            this.videoOverlay.classList.add('show');
            this.videoOverlay.style.display = 'flex';
        }
        this.hideLoading();
    }

    hideError() {
        if (this.errorMessage) {
            this.errorMessage.style.display = 'none';
        }
        if (this.videoOverlay) {
            this.videoOverlay.classList.remove('show');
            this.videoOverlay.style.display = 'none';
        }
    }

    showFileInfo(message, type = 'info') {
        if (this.fileInfo) {
            this.fileInfo.textContent = message;
            this.fileInfo.style.display = 'block';
            this.fileInfo.className = `file-info ${type}`;
        }
    }

    handleVideoError(e) {
        const error = e.target.error;
        let message = 'Error desconocido de video';

        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    message = 'Reproducción abortada';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    message = 'Error de red';
                    break;
                case error.MEDIA_ERR_DECODE:
                    message = 'Error de decodificación';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Formato no soportado';
                    break;
            }
        }

        this.handleStreamError(new Error(message));
    }

    // Búsqueda optimizada para rendimiento instantáneo
    handleSearch() {
        if (!this.playlistData || !this.playlist) return;

        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        const selectedGroup = this.groupFilter?.value || '';
        const selectedType = this.typeFilter?.value || '';

        // Usar requestAnimationFrame para no bloquear la UI
        requestAnimationFrame(() => {
            let visibleCount = 0;
            const fragment = document.createDocumentFragment();

            // Limpiar playlist actual
            this.playlist.innerHTML = '';

            // Filtrar datos en memoria (más rápido que DOM)
            const filteredData = this.playlistData.filter((item, index) => {
                const title = item.title.toLowerCase();
                const group = (item.group || '').toLowerCase();
                const type = item.type.toLowerCase();

                const matchesSearch = !searchTerm ||
                    title.includes(searchTerm) ||
                    group.includes(searchTerm) ||
                    type.includes(searchTerm);

                const matchesGroup = !selectedGroup || group.includes(selectedGroup.toLowerCase());
                const matchesType = !selectedType || type.includes(selectedType.toLowerCase());

                return matchesSearch && matchesGroup && matchesType;
            });

            // Renderizar solo elementos visibles
            filteredData.forEach((item, index) => {
                const playlistItem = this.createPlaylistItem(item, index);
                fragment.appendChild(playlistItem);
                visibleCount++;
            });

            // Mostrar mensaje si no hay resultados
            if (visibleCount === 0) {
                fragment.appendChild(this.createNoResultsItem());
            }

            // Insertar todo de una vez (más eficiente)
            this.playlist.appendChild(fragment);

            // Actualizar contador
            this.updateChannelCount(visibleCount, this.playlistData.length);
        });
    }

    // Crear elemento de playlist optimizado
    createPlaylistItem(item, index) {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        playlistItem.setAttribute('role', 'listitem');
        playlistItem.setAttribute('tabindex', '0');
        playlistItem.setAttribute('aria-label', item.title);
        playlistItem.dataset.index = index;

        const typeIcon = item.type === 'HLS' ? '📡' : item.type === 'Direct' ? '🎥' : '📺';
        const durationText = item.duration === '-1' ? '🔴 LIVE' : item.duration ? `⏱️ ${item.duration}s` : '';

        playlistItem.innerHTML = `
            <div class="playlist-item-number">${index + 1}</div>
            <div class="playlist-item-logo">
                ${item.logo ?
                `<img src="${this.escapeHtml(item.logo)}" alt="Logo" 
                         onerror="this.parentElement.innerHTML='<div class=\\"logo-placeholder\\">${typeIcon}</div>'" />` :
                `<div class="logo-placeholder">${typeIcon}</div>`
            }
            </div>
            <div class="playlist-item-content">
                <div class="playlist-item-title" title="${this.escapeHtml(item.title)}">
                    ${this.escapeHtml(item.title)}
                </div>
                <div class="playlist-item-meta">
                    <span class="stream-type">${typeIcon} ${item.type}</span>
                    ${item.group ? `<span class="group-tag">📂 ${this.escapeHtml(item.group)}</span>` : ''}
                    ${durationText ? `<span class="playlist-item-duration">${durationText}</span>` : ''}
                </div>
            </div>
            <div class="playlist-item-actions">
                <button class="test-stream-btn" title="Probar stream">🔧</button>
            </div>
        `;

        // Event listeners optimizados
        playlistItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('test-stream-btn')) {
                const originalIndex = this.playlistData.findIndex(dataItem => dataItem === item);
                this.playItem(originalIndex);
            }
        });

        const testBtn = playlistItem.querySelector('.test-stream-btn');
        if (testBtn) {
            testBtn.setAttribute('aria-label', 'Test stream');
            testBtn.setAttribute('title', 'Test stream');
        }
        testBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const originalIndex = this.playlistData.findIndex(dataItem => dataItem === item);
            this.testStream(originalIndex);
        });

        // Keyboard activate
        playlistItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const originalIndex = this.playlistData.findIndex(dataItem => dataItem === item);
                this.playItem(originalIndex);
            }
        });

        return playlistItem;
    }

    createNoResultsItem() {
        const noResultsItem = document.createElement('div');
        noResultsItem.className = 'playlist-item no-results';
        noResultsItem.innerHTML = `
            <div class="no-results-content">
                <div class="no-results-icon">🔍</div>
                <div class="no-results-title">No se encontraron canales</div>
                <div class="no-results-subtitle">Intenta con otros términos de búsqueda</div>
            </div>
        `;
        return noResultsItem;
    }



    clearSearch() {
        // Limpiar todos los filtros
        if (this.searchInput) this.searchInput.value = '';
        if (this.groupFilter) this.groupFilter.value = '';
        if (this.typeFilter) this.typeFilter.value = '';

        // Cancelar búsqueda pendiente
        clearTimeout(this.searchTimeout);

        // Aplicar filtros limpios inmediatamente
        this.handleSearch();

        console.log('🧹 Filtros limpiados');
    }

    updateChannelCount(visible, total = null) {
        if (!this.channelCount) return;

        const totalCount = total || this.playlistData?.length || 0;
        const t = window.__t || ((k) => k);
        const label = (t('channels_label') || 'Channels').toLowerCase();
        if (visible === totalCount) {
            this.channelCount.textContent = `${totalCount} ${label}`;
        } else {
            this.channelCount.textContent = `${visible} / ${totalCount} ${label}`;
        }
    }

    populateGroupFilter() {
        if (!this.groupFilter || !this.playlistData) return;

        // Obtener grupos únicos
        const groups = [...new Set(
            this.playlistData
                .map(item => item.group)
                .filter(group => group && group.trim())
        )].sort();

        // Limpiar opciones existentes (excepto opción "Todos")
        const t = window.__t || ((k) => k);
        this.groupFilter.innerHTML = `<option value="">${t('all_groups')}</option>`;

        // Agregar opciones de grupos
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            this.groupFilter.appendChild(option);
        });

        console.log(`📂 ${groups.length} grupos encontrados`);
    }

    toggleSort() {
        if (!this.playlistData) return;

        // Alternar entre orden alfabético y orden original
        this.sortAscending = !this.sortAscending;

        if (this.sortAscending) {
            this.playlistData.sort((a, b) => a.title.localeCompare(b.title));
            this.sortBtn.innerHTML = '⇈';
            this.sortBtn.title = 'Ordenar Z-A';
        } else {
            this.playlistData.sort((a, b) => b.title.localeCompare(a.title));
            this.sortBtn.innerHTML = '⇊';
            this.sortBtn.title = 'Ordenar A-Z';
        }

        this.renderPlaylist();
        this.handleSearch(); // Reaplicar filtros

        console.log(`🔄 Lista ordenada ${this.sortAscending ? 'A-Z' : 'Z-A'}`);
    }

    refreshPlaylist() {
        console.log('🔄 Actualizando playlist...');
        this.renderPlaylist();
        this.populateGroupFilter();
        this.handleSearch();
    }

    // Exportar playlist
    async exportPlaylist() {
        if (!this.playlistData || this.playlistData.length === 0) {
            alert('No hay playlist para exportar');
            return;
        }

        let m3uContent = '#EXTM3U\n';
        this.playlistData.forEach(item => {
            let extinf = `#EXTINF:${item.duration}`;

            // Agregar atributos si existen
            const attributes = [];
            if (item.tvgId) attributes.push(`tvg-id="${item.tvgId}"`);
            if (item.tvgName) attributes.push(`tvg-name="${item.tvgName}"`);
            if (item.logo) attributes.push(`tvg-logo="${item.logo}"`);
            if (item.group) attributes.push(`group-title="${item.group}"`);

            if (attributes.length > 0) {
                extinf += ` ${attributes.join(' ')}`;
            }

            extinf += `,${item.title}\n`;

            m3uContent += extinf;
            m3uContent += `${item.url}\n`;
        });

        if (this.isElectron && window.electronAPI) {
            try {
                const result = await window.electronAPI.showSaveDialog({
                    title: 'Exportar playlist',
                    defaultPath: 'playlist.m3u',
                    filters: [
                        { name: 'Archivos M3U', extensions: ['m3u'] },
                        { name: 'Todos los archivos', extensions: ['*'] }
                    ]
                });

                if (!result.canceled) {
                    await window.electronAPI.writeFile(result.filePath, m3uContent);
                    alert('Playlist exportada correctamente');
                }
            } catch (error) {
                alert(`Error exportando: ${error.message}`);
            }
        } else {
            // Fallback para navegador
            const blob = new Blob([m3uContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'playlist.m3u';
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    // Configuración y modales
    showSettings() {
        if (this.settingsModal) {
            this.settingsModal.style.display = 'block';
        }
    }

    hideSettings() {
        if (this.settingsModal) {
            this.settingsModal.style.display = 'none';
        }
    }

    async showAbout() {
        if (this.aboutModal) {
            this.aboutModal.style.display = 'block';

            // Actualizar información de la app
            if (this.isElectron && window.electronAPI) {
                try {
                    const version = await window.electronAPI.getAppVersion();
                    const versionEl = document.getElementById('appVersion');
                    if (versionEl) versionEl.textContent = version;
                } catch (error) {
                    console.error('Error obteniendo versión:', error);
                }
            }

            // Información de la plataforma
            const platformEl = document.getElementById('platformInfo');
            const electronVersionEl = document.getElementById('electronVersion');

            if (platformEl && window.appInfo) {
                platformEl.textContent = `${window.appInfo.platform} (${window.appInfo.isElectron ? 'Electron' : 'Web'})`;
            }

            if (electronVersionEl && window.appInfo?.versions) {
                electronVersionEl.textContent = window.appInfo.versions.electron || 'N/A';
            }
        }
    }

    hideAbout() {
        if (this.aboutModal) {
            this.aboutModal.style.display = 'none';
        }
    }

    async saveSettings() {
        const userAgent = document.getElementById('userAgentInput')?.value || '';
        const referer = document.getElementById('refererInput')?.value || '';
        const origin = document.getElementById('originInput')?.value || '';
        const autoplay = document.getElementById('autoplayCheck')?.checked || false;

        this.config.playerSettings = {
            ...this.config.playerSettings,
            userAgent,
            referer,
            origin,
            autoplay,
            volume: this.videoPlayer?.volume || 0.8
        };

        if (this.isElectron && window.electronAPI) {
            try {
                await window.electronAPI.saveConfig(this.config);
                alert('Configuración guardada');
            } catch (error) {
                alert(`Error guardando configuración: ${error.message}`);
            }
        }

        this.hideSettings();
    }

    resetSettings() {
        this.config = this.getDefaultConfig();
        this.applyConfiguration();

        if (this.isElectron && window.electronAPI) {
            window.electronAPI.saveConfig(this.config).catch(console.error);
        }

        alert('Configuración restaurada');
    }
}

// Función para forzar visibilidad de controles
function forceControlsVisibility() {
    console.log('🔧 Forzando visibilidad de controles...');

    // OCULTAR OVERLAY DE EMERGENCIA
    const overlay = document.getElementById('videoOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '-1';
    }

    const controlsElements = [
        '.controls',
        '.control-btn',
        '.video-controls',
        '.volume-controls',
        '.time-display'
    ];

    controlsElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.display = 'flex';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.style.position = 'relative';
            el.style.zIndex = '999';
        });
    });

    // Forzar estilos específicos para botones
    const buttons = document.querySelectorAll('.control-btn');
    buttons.forEach(btn => {
        btn.style.background = 'linear-gradient(45deg, #007bff, #0056b3)';
        btn.style.color = 'white';
        btn.style.border = '2px solid #0056b3';
        btn.style.padding = '15px 25px';
        btn.style.margin = '5px';
        btn.style.fontSize = '1.1rem';
        btn.style.fontWeight = '600';
        btn.style.borderRadius = '30px';
        btn.style.cursor = 'pointer';
        btn.style.minWidth = '120px';
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si HLS.js está disponible
    if (window.Hls) {
        console.log('✅ HLS.js cargado');
    } else {
        console.warn('⚠️ HLS.js no disponible - solo streams directos');
    }

    // Forzar visibilidad de controles
    forceControlsVisibility();

    // Inicializar el reproductor
    window.player = new M3UPlayer();

    // Forzar visibilidad cada 2 segundos como medida de emergencia
    setInterval(forceControlsVisibility, 2000);

    // Mostrar mensaje de debug
    setTimeout(() => {
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            console.log('✅ Controles encontrados y forzados a visible');
            controlsDiv.style.border = '5px solid red';
            controlsDiv.style.background = 'yellow';
            setTimeout(() => {
                controlsDiv.style.border = '3px solid #4CAF50';
                controlsDiv.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
            }, 3000);
        } else {
            console.error('❌ No se encontraron los controles');
        }
    }, 1000);
});

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rechazada:', e.reason);
});