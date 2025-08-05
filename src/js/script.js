// M3U Player Electron - Main Script
// IPTV Player without CORS limitations

class M3UPlayer {
    constructor() {
        this.playlist = [];
        this.currentIndex = -1;
        this.hls = null;
        this.config = {};
        this.isElectron = window.appInfo?.isElectron || false;
        this.iptvOrgContent = null;

        this.initializeElements();
        this.setupEventListeners();
        this.loadConfiguration();

        console.log('🎬 Starting M3U player...');
        console.log(`📱 Platform: ${this.isElectron ? 'Electron' : 'Web'}`);

        // Force style refresh to avoid cache issues
        this.forceStyleRefresh();

        // Hide overlay on initialization
        this.hideOverlay();

        // Verificar soporte de PiP
        this.checkPiPSupport();

        // Initialize sorting state
        this.sortAscending = false;

        // Configure debouncing for search
        this.searchTimeout = null;

        // Check IPTV-ORG playlist status on startup
        this.checkIPTVOrgPlaylistStatus();
    }

    // Search with debouncing for better performance
    debouncedSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.handleSearch();
        }, 150); // 150ms delay to avoid excessive searches
    }

    checkPiPSupport() {
        if (this.pipBtn) {
            if (!document.pictureInPictureEnabled) {
                this.pipBtn.disabled = true;
                this.pipBtn.title = 'Picture-in-Picture not supported in this browser';
                this.pipBtn.style.opacity = '0.5';
                console.warn('⚠️ Picture-in-Picture not supported');
            } else {
                console.log('✅ Picture-in-Picture supported');
            }
        }
    }

    hideOverlay() {
        if (this.videoOverlay) {
            this.videoOverlay.classList.remove('show');
            this.videoOverlay.style.display = 'none';
            console.log('🔧 Overlay hidden on initialization');
        }
    }

    forceStyleRefresh() {
        // Add timestamp to styles to avoid cache
        const timestamp = Date.now();
        const links = document.querySelectorAll('link[rel="stylesheet"]');

        links.forEach(link => {
            const href = link.href.split('?')[0];
            link.href = `${href}?v=${timestamp}`;
        });

        console.log('🔄 Styles updated to avoid cache');
    }

    forceRefresh() {
        console.log('🔄 Forcing complete reload...');

        if (this.isElectron && window.electronAPI) {
            // In Electron, reload window
            location.reload();
        } else {
            // In browser, forced reload
            window.location.reload(true);
        }
    }

    forceHideOverlay() {
        console.log('👁️ Forcing overlay hide...');

        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            overlay.style.visibility = 'hidden';
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '-1';
            console.log('✅ Overlay forcefully hidden');
        }

        // Also force controls visibility
        forceControlsVisibility();
    }

    initializeElements() {
        // Botones principales
        this.fileBtn = document.getElementById('fileBtn');
        this.urlBtn = document.getElementById('urlBtn');
        this.iptvOrgBtn = document.getElementById('iptvOrgBtn');
        // Elements that only exist in the initial interface
        this.refreshBtn = document.getElementById('refreshBtn');
        this.hideOverlayBtn = document.getElementById('hideOverlayBtn');

        // Input de URL
        this.urlInput = document.getElementById('urlInput');
        this.m3uUrl = document.getElementById('m3uUrl');
        this.loadUrlBtn = document.getElementById('loadUrlBtn');
        this.cancelUrlBtn = document.getElementById('cancelUrlBtn');

        // File information
        this.fileInfo = document.getElementById('fileInfo');

        // Player section
        this.playerSection = document.getElementById('playerSection');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.playlist = document.getElementById('playlist');

        // Controls
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

        // Search and export
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.groupFilter = document.getElementById('groupFilter');
        this.typeFilter = document.getElementById('typeFilter');
        this.sortBtn = document.getElementById('sortBtn');
        this.channelCount = document.getElementById('channelCount');
        this.exportBtn = document.getElementById('exportBtn');
        this.refreshPlaylistBtn = document.getElementById('refreshPlaylistBtn');

        // Modals
        this.settingsModal = document.getElementById('settingsModal');
        this.aboutModal = document.getElementById('aboutModal');

        // Loading screen elements
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingTitle = document.getElementById('loadingTitle');
        this.loadingMessage = document.getElementById('loadingMessage');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        this.progressDetails = document.getElementById('progressDetails');
        this.channelCount = document.getElementById('channelCount');
        this.processedCount = document.getElementById('processedCount');
        this.elapsedTime = document.getElementById('elapsedTime');

        // Video overlay
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
        this.iptvOrgBtn?.addEventListener('click', () => this.handleIPTVOrgButton());
        this.refreshBtn?.addEventListener('click', () => this.forceRefresh());
        this.hideOverlayBtn?.addEventListener('click', () => this.forceHideOverlay());

        // URL input
        this.loadUrlBtn?.addEventListener('click', () => this.loadFromUrl());
        this.cancelUrlBtn?.addEventListener('click', () => this.hideUrlInput());
        this.m3uUrl?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadFromUrl();
        });

        // Player controls
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

        // Electron events (if available)
        if (this.isElectron && window.electronAPI) {
            this.setupElectronEvents();
        }

        // Cerrar modales
        document.getElementById('closeSettings')?.addEventListener('click', () => this.hideSettings());
        document.getElementById('closeAbout')?.addEventListener('click', () => this.hideAbout());

        // Configuración
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettings')?.addEventListener('click', () => this.resetSettings());

        // Header buttons
        document.getElementById('settingsHeaderBtn')?.addEventListener('click', () => this.showSettings());
        document.getElementById('aboutHeaderBtn')?.addEventListener('click', () => this.showAbout());
    }

    setupElectronEvents() {
        // File loaded from main process
        window.electronAPI.onFileLoaded((data) => {
            this.processM3UContent(data.content, data.filename);
        });

        // Show dialogs
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
    }

    async loadConfiguration() {
        if (this.isElectron && window.electronAPI) {
            try {
                this.config = await window.electronAPI.loadConfig();
                this.applyConfiguration();
            } catch (error) {
                console.error('Error loading configuration:', error);
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
            this.showError('Please enter a valid URL');
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
            console.error('Error loading URL:', error);
            this.showError(`Error loading URL: ${error.message}`);
        }
    }

    async checkIPTVOrgPlaylistStatus() {
        try {
            if (this.isElectron && window.electronAPI) {
                const fileResult = await window.electronAPI.readFile('examples/iptv-org-channels.m3u');
                if (fileResult.success && fileResult.data && !fileResult.data.includes('404: Not Found')) {
                    // File exists and has valid content
                    this.iptvOrgContent = fileResult.data;
                    const tempData = this.parseM3U(fileResult.data);
                    const channelCount = tempData.length;
                    
                    if (channelCount > 0) {
                        this.updateIPTVOrgButton(`▶ Play IPTV-ORG (${channelCount})`, false);
                        console.log(`✅ Found existing IPTV-ORG playlist with ${channelCount} channels`);
                        return;
                    }
                }
            }
            
            // No valid file found, show download button
            this.updateIPTVOrgButton('📡 Download IPTV-ORG', false);
            console.log('📡 IPTV-ORG playlist not found, showing download option');
            
        } catch (error) {
            console.log('📡 Could not check IPTV-ORG status, showing download option');
            this.updateIPTVOrgButton('📡 Download IPTV-ORG', false);
        }
    }

    async handleIPTVOrgButton() {
        if (!this.iptvOrgBtn) return;
        
        const buttonText = this.iptvOrgBtn.textContent.trim();
        
        if (buttonText.includes('Download') || buttonText.includes('Update')) {
            await this.downloadIPTVOrgPlaylist();
        } else if (buttonText.includes('Play') || buttonText.includes('Reproducir')) {
            await this.loadIPTVOrgPlaylist();
        }
    }

    async downloadIPTVOrgPlaylist() {
        try {
            console.log('📡 Downloading IPTV-ORG playlist...');
            this.showLoadingScreen('Downloading IPTV-ORG', 'Fetching the latest playlist from iptv-org.github.io...');
            this.updateIPTVOrgButton('⏳ Downloading...', true);
            
            this.updateLoadingProgress(10, 'Connecting to server...');
            
            const iptvOrgUrl = 'https://iptv-org.github.io/iptv/index.m3u';
            let content;
            
            if (this.isElectron && window.electronAPI) {
                const response = await window.electronAPI.fetchUrl(iptvOrgUrl, {
                    userAgent: this.config.playerSettings?.userAgent || 'M3U Player/1.0.0'
                });
                
                if (response.success) {
                    content = response.data;
                } else {
                    throw new Error(response.error);
                }
            } else {
                const response = await fetch(iptvOrgUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                content = await response.text();
            }

            this.updateLoadingProgress(50, 'Download complete, processing...');

            // Save the downloaded content
            if (this.isElectron && window.electronAPI) {
                try {
                    await window.electronAPI.saveFile('examples/iptv-org-channels.m3u', content);
                    console.log('✅ IPTV-ORG playlist saved locally');
                } catch (saveError) {
                    console.warn('⚠️ Could not save playlist locally:', saveError);
                }
            }

            this.updateLoadingProgress(75, 'Parsing channels...');

            // Store content in memory for immediate use
            this.iptvOrgContent = content;
            
            // Parse to get channel count
            const tempData = this.parseM3U(content);
            const channelCount = tempData.length;
            
            this.updateLoadingProgress(100, 'Complete!', channelCount, channelCount);
            
            // Show completion for a moment
            setTimeout(() => {
                this.hideLoadingScreen();
                this.showFileInfo(`✅ IPTV-ORG playlist downloaded - ${channelCount} channels`, 'success');
                this.updateIPTVOrgButton(`▶ Play IPTV-ORG (${channelCount})`, false);
            }, 1000);
            
            console.log(`✅ Downloaded ${channelCount} channels from IPTV-ORG`);
            
        } catch (error) {
            console.error('❌ Error downloading IPTV-ORG playlist:', error);
            this.hideLoadingScreen();
            this.showFileInfo(`Error downloading: ${error.message}`, 'error');
            this.updateIPTVOrgButton('📡 Download IPTV-ORG', false);
        }
    }

    async loadIPTVOrgPlaylist() {
        try {
            console.log('🎬 Loading IPTV-ORG playlist...');
            this.showFileInfo('Loading IPTV-ORG playlist...', 'loading');
            
            let content = this.iptvOrgContent;
            
            // If not in memory, try to load from file
            if (!content && this.isElectron && window.electronAPI) {
                try {
                    const fileResult = await window.electronAPI.readFile('examples/iptv-org-channels.m3u');
                    if (fileResult.success) {
                        content = fileResult.data;
                        console.log('✅ Loaded IPTV-ORG from local file');
                    }
                } catch (fileError) {
                    console.log('📁 Local file not found');
                }
            }
            
            // If still no content, use fallback
            if (!content) {
                console.log('📋 Using fallback test content');
                content = this.getTestPlaylistContent();
            }
            
            this.processM3UContent(content, 'iptv-org-channels.m3u');
            
        } catch (error) {
            console.error('❌ Error loading IPTV-ORG playlist:', error);
            this.showFileInfo(`Error: ${error.message}`, 'error');
        }
    }

    updateIPTVOrgButton(text, disabled = false) {
        if (this.iptvOrgBtn) {
            this.iptvOrgBtn.textContent = text;
            this.iptvOrgBtn.disabled = disabled;
            
            if (disabled) {
                this.iptvOrgBtn.style.opacity = '0.6';
                this.iptvOrgBtn.style.cursor = 'not-allowed';
            } else {
                this.iptvOrgBtn.style.opacity = '1';
                this.iptvOrgBtn.style.cursor = 'pointer';
            }
        }
    }

    async loadTestFile() {
        // Redirect to IPTV-ORG functionality
        await this.loadIPTVOrgPlaylist();
    }

    showLoadingScreen(title = 'Processing...', message = 'Please wait while we process your request') {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
            this.loadingTitle.textContent = title;
            this.loadingMessage.textContent = message;
            this.resetLoadingProgress();
            this.startLoadingTimer();
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
            this.stopLoadingTimer();
        }
    }

    updateLoadingProgress(percent, details = '', channelCount = 0, processedCount = 0) {
        if (this.progressFill) {
            this.progressFill.style.width = `${percent}%`;
        }
        if (this.progressPercent) {
            this.progressPercent.textContent = `${Math.round(percent)}%`;
        }
        if (this.progressDetails) {
            this.progressDetails.textContent = details;
        }
        if (this.channelCount) {
            this.channelCount.textContent = channelCount.toLocaleString();
        }
        if (this.processedCount) {
            this.processedCount.textContent = processedCount.toLocaleString();
        }
    }

    resetLoadingProgress() {
        this.updateLoadingProgress(0, 'Starting...', 0, 0);
    }

    startLoadingTimer() {
        this.loadingStartTime = Date.now();
        this.loadingTimer = setInterval(() => {
            if (this.elapsedTime) {
                const elapsed = Math.floor((Date.now() - this.loadingStartTime) / 1000);
                this.elapsedTime.textContent = `${elapsed}s`;
            }
        }, 1000);
    }

    stopLoadingTimer() {
        if (this.loadingTimer) {
            clearInterval(this.loadingTimer);
            this.loadingTimer = null;
        }
    }

    getTestPlaylistContent() {
        return `#EXTM3U
#EXTINF:-1 tvg-id="BBCOne.uk" tvg-logo="https://i.imgur.com/eNPIQ9f.png" group-title="General",BBC One
https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_one_hd/t=3840/v=pv14/b=5070016/main.m3u8
#EXTINF:-1 tvg-id="CNN.us" tvg-logo="https://i.imgur.com/ilZJT5s.png" group-title="News",CNN International
https://cnn-cnninternational-1-eu.rakuten.wurl.tv/playlist.m3u8
#EXTINF:-1 tvg-id="AlJazeeraEnglish.qa" tvg-logo="https://i.imgur.com/BB93NQP.png" group-title="News",Al Jazeera English
https://live-hls-web-aje.getaj.net/AJE/index.m3u8
#EXTINF:-1 tvg-id="DWEnglish.de" tvg-logo="https://i.imgur.com/A1xzjOI.png" group-title="News",DW English
https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8
#EXTINF:-1 tvg-id="France24English.fr" tvg-logo="https://i.imgur.com/ZnmAXVv.png" group-title="News",France 24 English
https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8
#EXTINF:-1 tvg-id="EuroNews.fr" tvg-logo="https://i.imgur.com/8t9mdg9.png" group-title="News",Euronews English
https://rakuten-euronews-1-eu.rakuten.wurl.tv/playlist.m3u8
#EXTINF:-1 tvg-id="BloombergTVEurope.uk" tvg-logo="https://i.imgur.com/OuogLHx.png" group-title="Business",Bloomberg TV Europe
https://bloomberg.com/media-manifest/streams/eu.m3u8
#EXTINF:-1 tvg-id="NASATelevision.us" tvg-logo="https://i.imgur.com/PjSbkWh.png" group-title="Science",NASA TV
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
#EXTINF:-1 tvg-id="WeatherChannel.us" tvg-logo="https://i.imgur.com/jDLexeM.png" group-title="Weather",The Weather Channel
https://weather-lh.akamaihd.net/i/twc_1@92006/master.m3u8
#EXTINF:-1 tvg-id="MTV.us" tvg-logo="https://i.imgur.com/YF2gS3M.png" group-title="Music",MTV
https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/5ca672f4e0a4456c96c4e41c/master.m3u8
#EXTINF:-1 tvg-id="ComedyCentral.us" tvg-logo="https://i.imgur.com/ko3R7lz.png" group-title="Comedy",Comedy Central
https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/5ca3f7c61652631e36c43bb1/master.m3u8
#EXTINF:-1 tvg-id="CartoonNetwork.us" tvg-logo="https://i.imgur.com/zmODpOG.png" group-title="Kids",Cartoon Network
https://pluto-live.plutotv.net/egress/chandler/pluto01/live/VIACBS02/master.m3u8
#EXTINF:-1 tvg-id="ESPN.us" tvg-logo="https://i.imgur.com/QiqKNkl.png" group-title="Sports",ESPN
https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/5cb0cae7a461406ffe3f5213/master.m3u8`;
    }

    processM3UContent(content, filename) {
        try {
            console.log(`📁 Processing file: ${filename}`);

            // Show loading screen for large files
            const isLargeFile = content.length > 100000; // 100KB threshold
            if (isLargeFile) {
                this.showLoadingScreen('Processing Playlist', `Parsing ${filename}...`);
                this.updateLoadingProgress(10, 'Parsing M3U content...');
            }

            this.playlistData = this.parseM3U(content, isLargeFile);
            console.log(`📋 ${this.playlistData.length} elements in playlist`);

            if (this.playlistData.length === 0) {
                if (isLargeFile) this.hideLoadingScreen();
                this.showError('No valid elements found in M3U file');
                return;
            }

            if (isLargeFile) {
                this.updateLoadingProgress(80, 'Rendering playlist...');
                // Small delay to show progress
                setTimeout(() => {
                    this.renderPlaylist();
                    this.updateLoadingProgress(100, 'Complete!');
                    setTimeout(() => {
                        this.hideLoadingScreen();
                        this.showPlayerSection();
                    }, 500);
                }, 100);
            } else {
                this.renderPlaylist();
                this.showPlayerSection();
            }

            this.showFileInfo(`✅ ${filename} - ${this.playlistData.length} elements loaded`, 'success');

        } catch (error) {
            this.hideLoadingScreen();
            console.error('Error procesando M3U:', error);
            this.showError(`Error procesando archivo: ${error.message}`);
        }
    }

    parseM3U(content, showProgress = false) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const items = [];
        let currentItem = {};

        for (let i = 0; i < lines.length; i++) {
            // Update progress for large files
            if (showProgress && i % 100 === 0) {
                const progress = 10 + (i / lines.length) * 60; // 10-70% range
                this.updateLoadingProgress(progress, `Processing line ${i + 1}/${lines.length}...`, items.length, items.length);
            }
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

        console.log(`📋 Rendering ${this.playlistData.length} elements...`);

        // Use fragment for better performance
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
                // Continue with next batch
                requestAnimationFrame(renderBatch);
            } else {
                // Insert everything at once at the end
                this.playlist.innerHTML = '';
                this.playlist.appendChild(fragment);

                // Configure filters and counter
                this.populateGroupFilter();
                this.updateChannelCount(this.playlistData.length, this.playlistData.length);

                console.log(`✅ Playlist rendered completely`);
            }
        };

        // Iniciar renderizado
        renderBatch();

        // Preload logos in background
        setTimeout(() => this.preloadLogos(), 100);
    }

    preloadLogos() {
        const logosToPreload = this.playlistData
            .filter(item => item.logo)
            .slice(0, 20) // Only preload first 20 to avoid overload
            .map(item => item.logo);

        logosToPreload.forEach(logoUrl => {
            const img = new Image();
            img.src = logoUrl;
            // No necesitamos hacer nada con la imagen, solo precargarla
        });

        if (logosToPreload.length > 0) {
            console.log(`🖼️ Preloading ${logosToPreload.length} logos...`);
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
        this.initializeTimeDisplay();

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
            const icon = value == 0 ? '♪' : '♪';
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
        if (this.playPauseBtn && this.videoPlayer) {
            if (this.videoPlayer.paused) {
                this.playPauseBtn.textContent = '▶ Play';
            } else {
                this.playPauseBtn.textContent = '⏸ Pause';
            }
        }
    }

    initializeTimeDisplay() {
        if (this.currentTimeDisplay) {
            this.currentTimeDisplay.textContent = '00:00';
        }
        if (this.durationDisplay) {
            this.durationDisplay.textContent = '00:00';
        }
        console.log('⏰ Time display initialized');
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
            console.log(`⏰ Duration updated: ${duration}`);
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
        }
        if (this.videoOverlay) {
            this.videoOverlay.classList.add('show');
            this.videoOverlay.style.display = 'flex';
        }
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = '⏳ Cargando...';
            this.playPauseBtn.disabled = true;
        }
        this.hideError();
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
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
        playlistItem.dataset.index = index;

        // Determinar tipo de stream
        const streamType = this.getStreamType(item.url);
        const typeClass = streamType.toLowerCase();

        playlistItem.innerHTML = `
            <div class="playlist-item-number">${index + 1}</div>
            <div class="playlist-item-logo">
                ${item.logo && item.logo.trim() !== '' ?
                    `<img src="${this.escapeHtml(item.logo)}" alt="Logo" onerror="this.parentElement.innerHTML='<div class=&quot;logo-placeholder&quot;>📺</div>'" />` :
                    `<div class="logo-placeholder">📺</div>`
                }
            </div>
            <div class="playlist-item-content">
                <div class="playlist-item-title" title="${this.escapeHtml(item.title)}">
                    ${this.escapeHtml(item.title)}
                </div>
                <div class="playlist-item-meta">
                    <span class="stream-type ${typeClass}">${streamType}</span>
                    ${item.group && item.group !== 'Unknown' ? `<span class="group-tag">${this.escapeHtml(item.group)}</span>` : ''}
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
        testBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const originalIndex = this.playlistData.findIndex(dataItem => dataItem === item);
            this.testStream(originalIndex);
        });

        return playlistItem;
    }

    getStreamType(url) {
        if (url.includes('.m3u8')) return 'HLS';
        if (url.includes('.mpd')) return 'DASH';
        if (url.includes('rtmp://')) return 'RTMP';
        if (url.includes('rtsp://')) return 'RTSP';
        return 'Direct';
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

        if (visible === totalCount) {
            this.channelCount.textContent = `${totalCount} canales`;
        } else {
            this.channelCount.textContent = `${visible} de ${totalCount} canales`;
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

        // Limpiar opciones existentes (excepto "Todos los grupos")
        this.groupFilter.innerHTML = '<option value="">Todos los grupos</option>';

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