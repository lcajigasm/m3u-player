// M3U Player Electron - Main Script
// IPTV Player without CORS limitations

const runtimeDebugEnabled = (() => {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('debug') === '1' || localStorage.getItem('m3u-debug') === '1';
    } catch {
        return false;
    }
})();

const appLog = (...args) => {
    if (runtimeDebugEnabled) {
        console.log(...args);
    }
};

class M3UPlayer {
    constructor() {
        this.playlist = [];
        this.currentIndex = -1;
        this.hls = null;
        this.config = {};
        this.isElectron = window.appInfo?.isElectron || false;
        this.iptvOrgContent = null;
        this.freeTvContent = null;

        this.initializeElements();
        this.setupEventListeners();
        this.loadConfiguration();

        // M3U Player initialized

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

        // Virtual list and search state
        this.isVirtualMode = false;
        this.channelList = null;
        this.searchComponent = null;
        this._currentFilteredItems = null;

        // Check IPTV-ORG playlist status on startup
        this.checkIPTVOrgPlaylistStatus();
        
        // Check Free-TV playlist status on startup
        this.checkFreeTvPlaylistStatus();

        // Initialize dashboard features
        this.initializeDashboard();
        this.initializeEnhancedSearch();
        
        // Initialize internationalization after DOM is ready
        setTimeout(() => {
            try {
                if (window.i18n && typeof window.i18n.updateUI === 'function') {
                    // Sync language selector
                    if (this.languageSelect && window.i18n.currentLanguage) {
                        this.languageSelect.value = window.i18n.currentLanguage;
                    }
                    window.i18n.updateUI();
                }
            } catch (e) {
                console.warn('i18n init warning:', e);
            }
        }, 200);
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
                // Picture-in-Picture not supported
            } else {
                // Picture-in-Picture supported
            }
        }
    }

    hideOverlay() {
        if (this.videoOverlay) {
            this.videoOverlay.classList.remove('show');
            this.videoOverlay.style.display = 'none';
            // Overlay hidden on initialization
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

        // Styles updated to avoid cache
    }

    forceRefresh() {
        // Forcing complete reload

        if (this.isElectron && window.electronAPI) {
            // In Electron, reload window
            location.reload();
        } else {
            // In browser, forced reload
            window.location.reload(true);
        }
    }

    forceHideOverlay() {
        // Forcing overlay hide

        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            overlay.style.visibility = 'hidden';
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '-1';
            // Overlay forcefully hidden
        }

        // Also force controls visibility
        forceControlsVisibility();
    }

    initializeElements() {
        // Botones principales
        this.fileBtn = document.getElementById('fileBtn');
        this.urlBtn = document.getElementById('urlBtn');
        this.iptvOrgBtn = document.getElementById('iptvOrgBtn');
        this.freeTvBtn = document.getElementById('freeTvBtn');
        
        // Now Playing widget elements
        this.nowPlayingWidget = document.getElementById('nowPlayingWidget');
        this.minimizeNowPlayingBtn = document.getElementById('minimizeNowPlayingBtn');
        this.returnToPlayerBtn = document.getElementById('returnToPlayerBtn');
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        this.nowPlayingGroup = document.getElementById('nowPlayingGroup');
        this.nowPlayingType = document.getElementById('nowPlayingType');
        this.nowPlayingLogo = document.getElementById('nowPlayingLogo');
        this.nowPlayingIcon = document.getElementById('nowPlayingIcon');
        
        // Language selector
        this.languageSelect = document.getElementById('languageSelect');
        
        // Elements that only exist in the initial interface
        this.refreshBtn = document.getElementById('refreshBtn');
        this.hideOverlayBtn = document.getElementById('hideOverlayBtn');
        
        // Navigation elements
        this.backToDashboardBtn = document.getElementById('backToDashboardBtn');

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
        
        // Bandwidth monitoring elements
        this.bandwidthInfo = document.getElementById('bandwidthInfo');
        this.currentBandwidth = document.getElementById('currentBandwidth');
        this.peakBandwidth = document.getElementById('peakBandwidth');
        this.averageBandwidth = document.getElementById('averageBandwidth');
        this.streamQuality = document.getElementById('streamQuality');
        
        // Bandwidth monitoring stats
        this.bandwidthStats = {
            current: 0,
            peak: 0,
            average: 0,
            samples: [],
            maxSamples: 30,
            monitoring: false
        };

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

    // Header: Shortcuts modal elements
    this.shortcutsModal = document.getElementById('shortcutsModal');
    this.shortcutsHeaderBtn = document.getElementById('shortcutsHeaderBtn');
    this.closeShortcutsBtn = document.getElementById('closeShortcuts');
    }

    setupEventListeners() {
        // Botones principales
        this.fileBtn?.addEventListener('click', () => this.openFileDialog());
        this.urlBtn?.addEventListener('click', () => this.showUrlInput());
        this.iptvOrgBtn?.addEventListener('click', () => this.handleIPTVOrgButton());
        this.freeTvBtn?.addEventListener('click', () => this.handleFreeTvButton());
        
        // Now Playing widget event listeners
        this.minimizeNowPlayingBtn?.addEventListener('click', () => this.toggleNowPlayingWidget());
        
        // Return to Player button with enhanced debugging and multiple attachment strategies
        this.attachReturnToPlayerListener();
        
        // Language selector event listener
        this.languageSelect?.addEventListener('change', (e) => {
            // Language changed
            this.changeLanguage(e.target.value);
        });
        this.refreshBtn?.addEventListener('click', () => this.forceRefresh());
        this.hideOverlayBtn?.addEventListener('click', () => this.forceHideOverlay());
        
        // Navigation event listeners
        this.backToDashboardBtn?.addEventListener('click', () => this.goBackToDashboard());

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
        this.groupFilter?.addEventListener('change', () => {
            this.updateFilterCounts();
            this.handleSearch();
        });
        this.typeFilter?.addEventListener('change', () => {
            this.updateFilterCounts();
            this.handleSearch();
        });
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
            // Picture-in-Picture activated
            if (this.pipBtn) {
                this.pipBtn.innerHTML = '📺 Salir PiP';
                this.pipBtn.classList.add('pip-active');
            }
        });

        this.videoPlayer?.addEventListener('leavepictureinpicture', () => {
            // Picture-in-Picture deactivated
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

        // Keyboard Shortcuts modal
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

    setupElectronEvents() {
        // File loaded from main process
        window.electronAPI.onFileLoaded(async (data) => {
            await this.processM3UContent(data.content, data.filename);
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
            this.initializeUrlSuggestions();
        }
    }

    initializeUrlSuggestions() {
        if (!this.m3uUrl) return;

        // Setup URL suggestions
        this.m3uUrl.addEventListener('input', (e) => {
            this.handleUrlInput(e.target.value);
        });

        this.m3uUrl.addEventListener('focus', () => {
            this.showUrlSuggestions();
        });

        this.m3uUrl.addEventListener('blur', () => {
            // Delay hiding to allow click on suggestions
            setTimeout(() => this.hideUrlSuggestions(), 150);
        });
    }

    handleUrlInput(value) {
        if (value.length > 3) {
            this.generateUrlSuggestions(value);
            this.showUrlSuggestions();
        } else {
            this.hideUrlSuggestions();
        }
    }

    generateUrlSuggestions(input) {
        const urlSuggestions = document.getElementById('urlSuggestions');
        if (!urlSuggestions) return;

        const suggestions = [];

        // Popular IPTV URLs (example suggestions)
        const popularUrls = [
            'https://iptv-org.github.io/iptv/index.m3u',
            'https://raw.githubusercontent.com/iptv-org/iptv/master/index.m3u',
            'https://example.com/playlist.m3u8',
            'https://streams.example.com/live.m3u8'
        ];

        // Recent URLs from localStorage
        const recentUrls = this.loadRecentUrls();

        // Filter suggestions based on input
        const inputLower = input.toLowerCase();
        
        // Add matching recent URLs
        recentUrls
            .filter(url => url.toLowerCase().includes(inputLower))
            .slice(0, 3)
            .forEach(url => {
                suggestions.push({
                    url: url,
                    type: 'recent',
                    icon: '🕒'
                });
            });

        // Add matching popular URLs
        popularUrls
            .filter(url => url.toLowerCase().includes(inputLower))
            .slice(0, 3)
            .forEach(url => {
                suggestions.push({
                    url: url,
                    type: 'popular',
                    icon: '⭐'
                });
            });

        this.renderUrlSuggestions(suggestions);
    }

    renderUrlSuggestions(suggestions) {
        const urlSuggestions = document.getElementById('urlSuggestions');
        if (!urlSuggestions) return;

        urlSuggestions.innerHTML = '';

        if (suggestions.length === 0) {
            urlSuggestions.style.display = 'none';
            return;
        }

        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'url-suggestion-item';
            suggestionItem.innerHTML = `
                <span class="suggestion-icon">${suggestion.icon}</span>
                <span class="suggestion-url">${suggestion.url}</span>
                <span class="suggestion-type">${suggestion.type}</span>
            `;

            suggestionItem.addEventListener('click', () => {
                this.m3uUrl.value = suggestion.url;
                this.addToRecentUrls(suggestion.url);
                this.hideUrlSuggestions();
            });

            urlSuggestions.appendChild(suggestionItem);
        });
    }

    showUrlSuggestions() {
        const urlSuggestions = document.getElementById('urlSuggestions');
        if (urlSuggestions) {
            urlSuggestions.style.display = 'block';
        }
    }

    hideUrlSuggestions() {
        const urlSuggestions = document.getElementById('urlSuggestions');
        if (urlSuggestions) {
            urlSuggestions.style.display = 'none';
        }
    }

    loadRecentUrls() {
        try {
            const stored = localStorage.getItem('m3u_recent_urls');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Error loading recent URLs:', error);
            return [];
        }
    }

    addToRecentUrls(url) {
        let recentUrls = this.loadRecentUrls();
        
        // Remove if already exists
        recentUrls = recentUrls.filter(u => u !== url);
        
        // Add to beginning
        recentUrls.unshift(url);
        
        // Keep only last 10
        recentUrls = recentUrls.slice(0, 10);
        
        // Save to localStorage
        try {
            localStorage.setItem('m3u_recent_urls', JSON.stringify(recentUrls));
        } catch (error) {
            console.warn('Error saving recent URLs:', error);
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
                    reader.onload = async (e) => {
                        await this.processM3UContent(e.target.result, file.name);
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
            let requestOptions = {
                userAgent: this.config.playerSettings?.userAgent,
                referer: this.config.playerSettings?.referer,
                origin: this.config.playerSettings?.origin
            };

            // Special handling for IPTV API endpoints that need authentication
            if (this.streamNeedsAuthentication(url)) {
                // Using VLC headers for authentication
                const urlObj = new URL(url);
                const referer = `${urlObj.protocol}//${urlObj.hostname}/`;
                
                requestOptions = {
                    userAgent: 'VLC/3.0.8 LibVLC/3.0.8',
                    referer: referer,
                    headers: {
                        'User-Agent': 'VLC/3.0.8 LibVLC/3.0.8',
                        'Referer': referer,
                        'Accept': '*/*',
                        'Connection': 'keep-alive'
                    }
                };
            }

            if (this.isElectron && window.electronAPI) {
                // Use Electron main-process fetch to bypass renderer CSP
                const response = await window.api.fetchUrl(url, requestOptions);

                if (response.success) {
                    content = response.data;
                } else {
                    throw new Error(response.error);
                }
            } else {
                // In browser, ensure CSP allows http(s) connect-src, otherwise show a friendly error
                const fetchHeaders = requestOptions.headers || {};
                const response = await fetch(url, { headers: fetchHeaders, mode: 'cors' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                content = await response.text();
            }

            await this.processM3UContent(content, new URL(url).pathname.split('/').pop() || 'playlist.m3u');
            this.addToRecentUrls(url);
            this.hideUrlInput();

        } catch (error) {
            console.error('Error loading URL:', error);
            this.showError(`Error loading URL: ${error.message}`);
        }
    }

    async checkIPTVOrgPlaylistStatus() {
        // Checking IPTV-ORG playlist status
        try {
            if (this.isElectron && window.electronAPI) {
                // Looking for iptv-org-channels.m3u file
                const fileResult = await window.electronAPI.readFile('examples/iptv-org-channels.m3u');
                if (fileResult.success && fileResult.data && !fileResult.data.includes('404: Not Found')) {
                    // File exists and has valid content
                    // IPTV-ORG file found, counting channels
                    this.iptvOrgContent = fileResult.data;
                    const tempData = await this.parseM3U(fileResult.data);
                    const channelCount = tempData.length;
                    appLog(`📊 Canales encontrados en IPTV-ORG: ${channelCount}`);
                    
                    if (channelCount > 0) {
                        this.updateIPTVOrgButton(`▶ Play IPTV-ORG (${channelCount})`, false);
                        appLog(`✅ Found existing IPTV-ORG playlist with ${channelCount} channels`);
                        
                        // Auto-cargar IPTV-ORG existente
                        // Auto-loading existing IPTV-ORG
                        setTimeout(() => {
                            this.loadIPTVOrgPlaylist();
                        }, 1000);
                        return;
                    }
                } else {
                    // IPTV-ORG file not found or empty
                }
            }
            
            // No valid file found, show download button
            this.updateIPTVOrgButton('📡 Download IPTV-ORG', false);
            // IPTV-ORG playlist not found, showing download option
            
        } catch (error) {
            // Could not check IPTV-ORG status, showing download option
            this.updateIPTVOrgButton('📡 Download IPTV-ORG', false);
        }
    }

    async handleIPTVOrgButton() {
        // IPTV-ORG button clicked
        if (!this.iptvOrgBtn) {
            console.error('❌ IPTV-ORG button not found!');
            return;
        }
        
        // Check the tile title instead of full textContent
        const tileTitle = this.iptvOrgBtn.querySelector('.tile-title');
        const titleText = tileTitle ? tileTitle.textContent.trim() : '';
        appLog(`📝 IPTV-ORG button title: "${titleText}"`);
        
        if (titleText.includes('Download') || titleText.includes('Update') || titleText.includes('IPTV-ORG')) {
            // Starting IPTV-ORG download
            await this.downloadIPTVOrgPlaylist();
        } else if (titleText.includes('Play') || titleText.includes('Reproducir')) {
            // Starting IPTV-ORG playback
            await this.loadIPTVOrgPlaylist();
        } else {
            // Unrecognized IPTV-ORG action
        }
    }

    async downloadIPTVOrgPlaylist() {
        try {
            // Downloading IPTV-ORG playlist
            this.showLoadingScreen('Downloading IPTV-ORG', 'Fetching the latest playlist from iptv-org.github.io...');
            this.updateIPTVOrgButton('⏳ Downloading...', true);
            
            this.updateLoadingProgress(10, 'Connecting to server...');
            
            const iptvOrgUrl = 'https://iptv-org.github.io/iptv/index.m3u';
            let content;
            
            if (this.isElectron && window.electronAPI) {
                const response = await window.api.fetchUrl(iptvOrgUrl, {
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
                    // IPTV-ORG playlist saved locally
                } catch (saveError) {
                    console.warn('⚠️ Could not save playlist locally:', saveError);
                }
            }

            this.updateLoadingProgress(75, 'Parsing channels...');

            // Store content in memory for immediate use
            this.iptvOrgContent = content;
            
            // Parse to get channel count
            const tempData = await this.parseM3U(content);
            const channelCount = tempData.length;
            
            this.updateLoadingProgress(100, 'Complete!', channelCount, channelCount);
            
            // Show completion for a moment, then auto-load
            setTimeout(async () => {
                this.hideLoadingScreen();
                this.showFileInfo(`✅ IPTV-ORG playlist downloaded - ${channelCount} channels`, 'success');
                this.updateIPTVOrgButton(`▶ Play IPTV-ORG (${channelCount})`, false);
                
                // Auto-cargar playlist descargada y cambiar a reproductor
                // Auto-loading IPTV-ORG after download
                setTimeout(() => {
                    this.loadIPTVOrgPlaylist();
                }, 1000);
            }, 1000);
            
            appLog(`✅ Downloaded ${channelCount} channels from IPTV-ORG`);
            
        } catch (error) {
            console.error('❌ Error downloading IPTV-ORG playlist:', error);
            this.hideLoadingScreen();
            this.showFileInfo(`Error downloading: ${error.message}`, 'error');
            this.updateIPTVOrgButton('📡 Download IPTV-ORG', false);
        }
    }

    async loadIPTVOrgPlaylist() {
        try {
            // Loading IPTV-ORG playlist
            this.showFileInfo('Loading IPTV-ORG playlist...', 'loading');
            
            let content = this.iptvOrgContent;
            let isLargeFile = false;
            
            // If not in memory, try to load from file
            if (!content && this.isElectron && window.electronAPI) {
                try {
                    const fileResult = await window.electronAPI.readFile('examples/iptv-org-channels.m3u');
                    if (fileResult.success) {
                        content = fileResult.data;
                        isLargeFile = content.length > 50000; // Real IPTV-ORG files are large
                        // Loaded IPTV-ORG from local file
                    }
                } catch (fileError) {
                    // Local file not found
                }
            }
            
            // If still no content, use fallback
            if (!content) {
                // Using fallback test content
                content = this.getTestPlaylistContent();
                isLargeFile = false; // Test content is small
            }
            
            // Content loaded and processed
            // Content preview available for debugging
            
            // Use appropriate processing method based on content size
            if (isLargeFile) {
                // Using large file processing
                await this.processLargeM3UContent(content, 'iptv-org-channels.m3u');
            } else {
                // Using standard processing for small content
                await this.processM3UContent(content, 'iptv-org-channels.m3u');
            }
            
        } catch (error) {
            console.error('❌ Error loading IPTV-ORG playlist:', error);
            this.showFileInfo(`Error: ${error.message}`, 'error');
        }
    }






    goBackToDashboard() {
        // Going back to dashboard
        
        // Hide player section
        if (this.playerSection) {
            this.playerSection.style.display = 'none';
        }
        
        // Show dashboard section
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
        }
        
        // Note: Don't clear playlist data - users expect to return to their loaded playlist
        // The memory savings aren't worth losing the user's playlist
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Update now playing widget since we're now in dashboard
        this.updateNowPlayingWidget();
        
        // Back to dashboard complete
    }

    updatePlaylistTitle(filename = null) {
        const playlistTitleElement = document.getElementById('playlistTitle');
        if (playlistTitleElement) {
            let title = 'Loaded Playlist';
            
            if (filename) {
                title = filename.replace('.m3u', '').replace('.m3u8', '');
                // Capitalize first letter and replace dashes/underscores
                title = title.charAt(0).toUpperCase() + title.slice(1)
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
            } else if (this.lastLoadedFilename) {
                title = this.lastLoadedFilename;
            }
            
            const channelCount = this.playlistData?.length || 0;
            playlistTitleElement.textContent = `${title} (${channelCount} channels)`;
        }
    }


    updateIPTVOrgButton(text, disabled = false) {
        if (this.iptvOrgBtn) {
            // Parse the text to extract icon, title and subtitle
            let icon = '📡';
            let title = window.t ? window.t('iptv_org') : 'IPTV-ORG';
            let subtitle = window.t ? window.t('free_channels') : 'Free channels';
            
            if (text.includes('⏳')) {
                icon = '⏳';
                title = window.t ? window.t('downloading') : 'Downloading...';
                subtitle = window.t ? window.t('please_wait') : 'Please wait';
            } else if (text.includes('▶')) {
                icon = '▶';
                title = window.t ? window.t('play_iptv_org') : 'Play IPTV-ORG';
                // Extract channel count from text like "▶ Play IPTV-ORG (1234)"
                const match = text.match(/\((\d+)\)/);
                subtitle = match ? `${match[1]} ${window.t ? window.t('channels') : 'channels'}` : (window.t ? window.t('ready_to_play') : 'Ready to play');
            } else if (text.includes('Download')) {
                icon = '📡';
                title = window.t ? window.t('download_iptv_org') : 'Download IPTV-ORG';
                subtitle = window.t ? window.t('free_channels') : 'Free channels';
            }
            
            // Update the tile structure instead of replacing textContent
            const tileIcon = this.iptvOrgBtn.querySelector('.tile-icon');
            const tileTitle = this.iptvOrgBtn.querySelector('.tile-title');
            const tileSubtitle = this.iptvOrgBtn.querySelector('.tile-subtitle');
            
            if (tileIcon) tileIcon.textContent = icon;
            if (tileTitle) tileTitle.textContent = title;
            if (tileSubtitle) tileSubtitle.textContent = subtitle;
            
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

    // Free-TV Methods (copied from IPTV-ORG logic)
    async checkFreeTvPlaylistStatus() {
        // Checking Free-TV playlist status
        try {
            // Check if Free-TV playlist exists and get channel count
            if (this.isElectron && window.electronAPI) {
                // Looking for free-tv-channels.m3u8 file
                const fileResult = await window.electronAPI.readFile('examples/free-tv-channels.m3u8');
                if (fileResult.success && fileResult.data) {
                    appLog('✅ Archivo Free-TV encontrado, contando canales...');
                    const channelCount = this.countChannelsInM3U(fileResult.data);
                    appLog(`📊 Canales encontrados en Free-TV: ${channelCount}`);
                    if (channelCount > 0) {
                        this.freeTvContent = fileResult.data; // Store content in memory
                        this.updateFreeTvButton(`▶ Play Free-TV (${channelCount})`, false);
                        
                        // Auto-load existing Free-TV playlist
                        appLog('🚀 Auto-cargando Free-TV existente...');
                        setTimeout(() => {
                            this.loadFreeTvPlaylist();
                        }, 1000);
                        return;
                    }
                } else {
                    appLog('❌ Archivo Free-TV no encontrado o vacío');
                }
            }

            // If file doesn't exist or has no channels, show download option
            appLog('📺 Mostrando opción de descarga para Free-TV');
            this.updateFreeTvButton('📺 Download Free-TV', false);
        } catch (error) {
            console.error('Error checking Free-TV playlist status:', error);
            this.updateFreeTvButton('📺 Download Free-TV', false);
        }
    }

    async handleFreeTvButton() {
        appLog('🖱️ Free-TV button clicked!');
        if (!this.freeTvBtn) {
            console.error('❌ Free-TV button not found!');
            return;
        }
        
        // Check the tile title instead of full textContent
        const tileTitle = this.freeTvBtn.querySelector('.tile-title');
        const titleText = tileTitle ? tileTitle.textContent.trim() : '';
        appLog(`📝 Free-TV button title: "${titleText}"`);
        
        if (titleText.includes('Download') || titleText.includes('Update') || titleText.includes('Free-TV')) {
            appLog('⬇️ Iniciando descarga de Free-TV...');
            await this.downloadFreeTvPlaylist();
        } else if (titleText.includes('Play') || titleText.includes('Reproducir')) {
            appLog('▶️ Iniciando reproducción de Free-TV...');
            await this.loadFreeTvPlaylist();
        } else {
            appLog('❓ Acción no reconocida para Free-TV');
        }
    }

    async downloadFreeTvPlaylist() {
        try {
            appLog('📺 Downloading Free-TV playlist...');
            this.showLoadingScreen(
                window.t ? window.t('downloading_free_tv') : 'Downloading Free-TV', 
                window.t ? window.t('fetching_free_tv_playlist') : 'Fetching the latest playlist from Free-TV/IPTV...'
            );
            this.updateFreeTvButton('⏳ Downloading...', true);
            
            this.updateLoadingProgress(10, window.t ? window.t('connecting_server') : 'Connecting to server...');
            
            const freeTvUrl = 'https://raw.githubusercontent.com/Free-TV/IPTV/refs/heads/master/playlist.m3u8';
            let content;
            
            if (this.isElectron && window.electronAPI) {
                const response = await window.api.fetchUrl(freeTvUrl, {
                    userAgent: this.config.playerSettings?.userAgent || 'M3U Player/1.0.0'
                });
                
                if (response.success) {
                    content = response.data;
                } else {
                    throw new Error(response.error);
                }
            } else {
                const response = await fetch(freeTvUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                content = await response.text();
            }

            this.updateLoadingProgress(50, 'Download complete, processing...');

            // Save the downloaded content
            if (this.isElectron && window.electronAPI) {
                try {
                    await window.electronAPI.saveFile('examples/free-tv-channels.m3u8', content);
                    appLog('✅ Free-TV playlist saved to local file');
                } catch (saveError) {
                    console.warn('⚠️  Could not save Free-TV playlist locally:', saveError.message);
                }
            }

            // Store content in memory for immediate use
            this.freeTvContent = content;

            this.updateLoadingProgress(80, 'Validating playlist...');

            // Count channels for user feedback
            const channelCount = this.countChannelsInM3U(content);
            appLog(`📺 Free-TV playlist downloaded: ${channelCount} channels`);

            this.updateLoadingProgress(100, 'Download complete!');

            setTimeout(async () => {
                this.hideLoadingScreen();
                if (channelCount > 0) {
                    this.showFileInfo(`✅ Free-TV playlist downloaded: ${channelCount} channels`, 'success');
                    this.updateFreeTvButton(`▶ Play Free-TV (${channelCount})`, false);
                    
                    // Auto-load the downloaded playlist
                    appLog('🚀 Auto-cargando Free-TV después de descarga...');
                    setTimeout(() => {
                        this.loadFreeTvPlaylist();
                    }, 1000);
                } else {
                    this.showFileInfo('⚠️ Downloaded playlist appears to be empty', 'warning');
                    this.updateFreeTvButton('📺 Download Free-TV', false);
                }
            }, 500);

        } catch (error) {
            console.error('❌ Error downloading Free-TV playlist:', error);
            this.hideLoadingScreen();
            this.showFileInfo(`❌ Download failed: ${error.message}`, 'error');
            this.updateFreeTvButton('📺 Download Free-TV', false);
        }
    }

    async loadFreeTvPlaylist() {
        try {
            appLog('📺 Loading Free-TV playlist...');
            this.showFileInfo('Loading Free-TV playlist...', 'loading');
            
            let content = this.freeTvContent;
            let isLargeFile = false;
            
            // If not in memory, try to load from file
            if (!content && this.isElectron && window.electronAPI) {
                try {
                    const fileResult = await window.electronAPI.readFile('examples/free-tv-channels.m3u8');
                    if (fileResult.success) {
                        content = fileResult.data;
                        isLargeFile = content.length > 50000; // Real Free-TV files are large
                        appLog('✅ Loaded Free-TV from local file');
                    }
                } catch (fileError) {
                    appLog('📁 Local file not found');
                }
            }
            
            // If still no content, use fallback
            if (!content) {
                appLog('📋 Using fallback test content');
                content = this.getTestPlaylistContent();
                isLargeFile = false; // Test content is small
            }
            
            appLog(`📋 Content loaded, size: ${content.length} characters, isLarge: ${isLargeFile}`);
            appLog(`📋 Content preview: ${content.substring(0, 200)}...`);
            
            // Use appropriate processing method based on content size
            if (isLargeFile) {
                appLog('📋 Using large file processing');
                await this.processLargeM3UContent(content, 'free-tv-channels.m3u8');
            } else {
                appLog('📋 Using standard processing for small content');
                await this.processM3UContent(content, 'free-tv-channels.m3u8');
            }
            
        } catch (error) {
            console.error('❌ Error loading Free-TV playlist:', error);
            this.showFileInfo(`Error: ${error.message}`, 'error');
        }
    }

    updateFreeTvButton(text, disabled = false) {
        if (this.freeTvBtn) {
            // Parse the text to extract icon, title and subtitle
            let icon = '📺';
            let title = window.t ? window.t('free_tv') : 'Free-TV';
            let subtitle = window.t ? window.t('community_channels') : 'Community channels';
            
            if (text.includes('⏳')) {
                icon = '⏳';
                title = window.t ? window.t('downloading') : 'Downloading...';
                subtitle = window.t ? window.t('please_wait') : 'Please wait';
            } else if (text.includes('▶')) {
                icon = '▶';
                title = window.t ? window.t('play_free_tv') : 'Play Free-TV';
                // Extract channel count from text like "▶ Play Free-TV (1234)"
                const match = text.match(/\((\d+)\)/);
                subtitle = match ? `${match[1]} ${window.t ? window.t('channels') : 'channels'}` : (window.t ? window.t('ready_to_play') : 'Ready to play');
            } else if (text.includes('Download')) {
                icon = '📺';
                title = window.t ? window.t('download_free_tv') : 'Download Free-TV';
                subtitle = window.t ? window.t('community_channels') : 'Community channels';
            }
            
            // Update the tile structure instead of replacing textContent
            const tileIcon = this.freeTvBtn.querySelector('.tile-icon');
            const tileTitle = this.freeTvBtn.querySelector('.tile-title');
            const tileSubtitle = this.freeTvBtn.querySelector('.tile-subtitle');
            
            if (tileIcon) tileIcon.textContent = icon;
            if (tileTitle) tileTitle.textContent = title;
            if (tileSubtitle) tileSubtitle.textContent = subtitle;
            
            this.freeTvBtn.disabled = disabled;
            
            if (disabled) {
                this.freeTvBtn.style.opacity = '0.6';
                this.freeTvBtn.style.cursor = 'not-allowed';
            } else {
                this.freeTvBtn.style.opacity = '1';
                this.freeTvBtn.style.cursor = 'pointer';
            }
        }
    }

    async loadTestFile() {
        // Redirect to IPTV-ORG functionality
        await this.loadIPTVOrgPlaylist();
    }

    countChannelsInM3U(content) {
        if (!content || typeof content !== 'string') {
            return 0;
        }
        
        // Count #EXTINF lines, which represent individual channels
        const extinf_matches = content.match(/#EXTINF:/g);
        return extinf_matches ? extinf_matches.length : 0;
    }

    // Now Playing Widget Methods
    updateNowPlayingWidget(channel = null) {
        appLog('🎵 === NOW PLAYING WIDGET UPDATE ===');
        appLog('🎵 Widget element found:', !!this.nowPlayingWidget);
        
        if (!this.nowPlayingWidget) {
            console.error('🎵 Now Playing widget element not found!');
            return;
        }
        
        if (!channel && this.currentIndex >= 0 && this.playlistData[this.currentIndex]) {
            channel = this.playlistData[this.currentIndex];
            appLog('🎵 Using current channel from index:', this.currentIndex);
        }
        
        appLog('🎵 Channel data:', channel ? channel.title : 'No channel');
        
        if (channel) {
            appLog('🎵 Updating widget with channel:', channel.title);
            
            // Update widget content
            this.nowPlayingTitle.textContent = channel.title || 'Unknown Channel';
            this.nowPlayingGroup.textContent = channel.group || '';
            this.nowPlayingType.textContent = channel.type || 'Stream';
            
            // Update thumbnail/logo
            if (channel.logo && channel.logo.trim()) {
                this.nowPlayingLogo.src = channel.logo;
                this.nowPlayingLogo.style.display = 'block';
                this.nowPlayingIcon.style.display = 'none';
            } else {
                this.nowPlayingLogo.style.display = 'none';
                this.nowPlayingIcon.style.display = 'block';
                this.nowPlayingIcon.textContent = this.getChannelIcon(channel);
            }
            
            // Only show the widget if we're in dashboard - simple check
            const dashboardSection = document.getElementById('dashboardSection');
            const playerSection = document.getElementById('playerSection');
            const isInDashboard = dashboardSection && (window.getComputedStyle(dashboardSection).display !== 'none');
            const isInPlayer = playerSection && (window.getComputedStyle(playerSection).display !== 'none');
            
            if (isInDashboard && !isInPlayer) {
                // Show the widget only when in dashboard
                this.nowPlayingWidget.style.display = 'block';
                appLog('🎵 Widget shown, display set to block');
                
                // Ensure the Return to Player button listener is attached
                setTimeout(() => this.attachReturnToPlayerListener(), 50);
            } else {
                // Hide the widget when in player section
                this.nowPlayingWidget.style.display = 'none';
                appLog('🎵 Widget hidden - in player section');
            }
        } else {
            appLog('🎵 No channel, hiding widget');
            // Hide the widget if no channel is playing
            this.nowPlayingWidget.style.display = 'none';
        }
        
        appLog('🎵 === NOW PLAYING WIDGET UPDATE END ===');
    }
    
    getChannelIcon(channel) {
        if (!channel) return '📺';
        
        const title = (channel.title || '').toLowerCase();
        const group = (channel.group || '').toLowerCase();
        
        // Icon mapping based on content
        if (group.includes('news') || title.includes('news')) return '📰';
        if (group.includes('sports') || title.includes('sport')) return '⚽';
        if (group.includes('music') || title.includes('music')) return '🎵';
        if (group.includes('movie') || title.includes('movie')) return '🎬';
        if (group.includes('kids') || title.includes('cartoon')) return '🧸';
        if (group.includes('documentary')) return '🎓';
        if (group.includes('religion')) return '⛪';
        if (channel.type === 'Radio' || title.includes('radio')) return '📻';
        
        return '📺'; // Default TV icon
    }
    
    toggleNowPlayingWidget() {
        if (!this.nowPlayingWidget) return;
        
        this.nowPlayingWidget.classList.toggle('minimized');
        
        // Update minimize button text
        const isMinimized = this.nowPlayingWidget.classList.contains('minimized');
        this.minimizeNowPlayingBtn.textContent = isMinimized ? '+' : '−';
        this.minimizeNowPlayingBtn.title = isMinimized ? 'Expand' : 'Minimize';
    }
    
    returnToPlayer() {
        appLog('🎬 === RETURN TO PLAYER DEBUG ===');
        appLog('🎬 Method called successfully');
        
        // Debug current state
        const dashboardSection = document.getElementById('dashboardSection');
        const playerSection = document.getElementById('playerSection');
        
        appLog('🎬 Dashboard section:', dashboardSection ? 'found' : 'NOT FOUND');
        appLog('🎬 Dashboard display style:', dashboardSection?.style.display || 'not set');
        appLog('🎬 Dashboard computed display:', dashboardSection ? window.getComputedStyle(dashboardSection).display : 'not found');
        appLog('🎬 Player section:', playerSection ? 'found' : 'NOT FOUND');
        appLog('🎬 Player display style:', playerSection?.style.display || 'not set');
        appLog('🎬 Player computed display:', playerSection ? window.getComputedStyle(playerSection).display : 'not found');
        appLog('🎬 Playlist data available:', this.playlistData ? `Yes (${this.playlistData.length} items)` : 'No');
        appLog('🎬 Current index:', this.currentIndex);
        
        const isInDashboard = dashboardSection && (window.getComputedStyle(dashboardSection).display !== 'none');
        const isInPlayer = playerSection && (window.getComputedStyle(playerSection).display !== 'none');
        appLog('🎬 Is in dashboard:', isInDashboard);
        appLog('🎬 Is in player:', isInPlayer);
        
        // If we have a playlist loaded
        if (this.playlistData && this.playlistData.length > 0) {
            appLog('🎬 Playlist available, proceeding...');
            
            // Always hide the now playing widget first
            if (this.nowPlayingWidget) {
                appLog('🎬 Hiding Now Playing widget');
                this.nowPlayingWidget.style.display = 'none';
            }
            
            if (isInDashboard && !isInPlayer) {
                // We're in dashboard, need to navigate to player
                appLog('🎬 In dashboard, calling showPlayerSection...');
                this.showPlayerSection();
                appLog('🎬 showPlayerSection called');
            } else if (isInPlayer) {
                // We're already in player section
                appLog('🎬 Already in player section - just hiding widget');
            } else {
                // Neither dashboard nor player is visible, force show player
                appLog('🎬 Neither section visible, forcing player section...');
                this.showPlayerSection();
            }
        } else {
            appLog('🎬 No playlist data available');
            // No playlist loaded, just hide the widget and show message
            if (this.nowPlayingWidget) {
                this.nowPlayingWidget.style.display = 'none';
            }
            this.showFileInfo(window.t ? window.t('no_playlist_loaded') : 'No playlist currently loaded', 'warning');
        }
        
        appLog('🎬 === RETURN TO PLAYER DEBUG END ===');
    }

    // Enhanced method to attach Return to Player listener with multiple strategies
    attachReturnToPlayerListener() {
        appLog('🎬 === ATTACHING RETURN TO PLAYER LISTENER ===');
        
        const attachListener = () => {
            this.returnToPlayerBtn = document.getElementById('returnToPlayerBtn');
            
            if (this.returnToPlayerBtn) {
                appLog('✅ Return to Player button found');
                
                // Remove any existing listeners to prevent duplicates
                this.returnToPlayerBtn.replaceWith(this.returnToPlayerBtn.cloneNode(true));
                this.returnToPlayerBtn = document.getElementById('returnToPlayerBtn');
                
                // Add click event listener
                this.returnToPlayerBtn.addEventListener('click', (e) => {
                    appLog('🎬 Return to Player button clicked!', e);
                    e.preventDefault();
                    e.stopPropagation();
                    this.returnToPlayer();
                });
                
                // Add enter key support
                this.returnToPlayerBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        appLog('🎬 Return to Player activated via keyboard');
                        e.preventDefault();
                        this.returnToPlayer();
                    }
                });
                
                // Mark as having listeners attached
                this.returnToPlayerBtn.dataset.listenerAttached = 'true';
                
                appLog('✅ Return to Player event listeners attached successfully');
                return true;
            } else {
                console.error('❌ Return to Player button NOT found');
                return false;
            }
        };
        
        // Try to attach immediately
        if (!attachListener()) {
            // If not found, try again after DOM is fully loaded
            appLog('🎬 Retrying Return to Player attachment after DOM load...');
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', attachListener);
            } else {
                // Try with a small delay
                setTimeout(attachListener, 100);
            }
            
            // Also try with MutationObserver to watch for DOM changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        const returnBtn = document.getElementById('returnToPlayerBtn');
                        if (returnBtn && !returnBtn.dataset.listenerAttached) {
                            appLog('🎬 Return to Player button found via MutationObserver');
                            returnBtn.dataset.listenerAttached = 'true';
                            observer.disconnect();
                            attachListener();
                        }
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Stop observing after 5 seconds
            setTimeout(() => observer.disconnect(), 5000);
        }
    }

    // Internationalization Methods
    initializeI18n() {
        appLog('🌐 Initializing i18n system...');
        
        if (typeof window.i18n !== 'undefined') {
            // Set the language selector to current language
            if (this.languageSelect) {
                this.languageSelect.value = window.i18n.currentLanguage;
            }
            
            // Initialize UI with current language
            setTimeout(() => {
                window.i18n.updateUI();
            }, 100);
        } else {
            console.error('🌐 i18n system not available!');
        }
    }
    
    changeLanguage(languageCode) {
        appLog('🌐 Changing language to:', languageCode);
        
        if (typeof window.i18n !== 'undefined') {
            window.i18n.setLanguage(languageCode);
            
            // Update dynamic content that's not handled by data-i18n attributes
            this.updateDynamicTranslations();
        } else {
            console.error('🌐 i18n system not available during language change!');
        }
    }
    
    // Debug method to force translation update (can be called from console)
    forceTranslationUpdate() {
        appLog('🌐 Forcing translation update...');
        if (typeof window.i18n !== 'undefined') {
            window.i18n.updateUI();
            this.updateDynamicTranslations();
            appLog('🌐 Translation update forced successfully');
        } else {
            console.error('🌐 i18n system not available!');
        }
    }
    
    // Debug method to test Return to Player functionality
    testReturnToPlayer() {
        appLog('🎬 === TESTING RETURN TO PLAYER ===');
        
        // Re-scan for button
        this.returnToPlayerBtn = document.getElementById('returnToPlayerBtn');
        
        appLog('🎬 returnToPlayerBtn element:', this.returnToPlayerBtn);
        appLog('🎬 Button visible:', this.returnToPlayerBtn ? window.getComputedStyle(this.returnToPlayerBtn).display : 'N/A');
        appLog('🎬 nowPlayingWidget element:', this.nowPlayingWidget);
        appLog('🎬 Widget visible:', this.nowPlayingWidget ? window.getComputedStyle(this.nowPlayingWidget).display : 'N/A');
        appLog('🎬 Playlist data length:', this.playlistData?.length || 0);
        appLog('🎬 Current index:', this.currentIndex);
        
        if (this.returnToPlayerBtn) {
            appLog('🎬 Button found, testing click event...');
            
            // Test if event listeners are properly attached
            const hasListeners = this.returnToPlayerBtn.dataset.listenerAttached === 'true';
            appLog('🎬 Has listeners attached:', hasListeners);
            
            if (!hasListeners) {
                appLog('🎬 Re-attaching listeners...');
                this.attachReturnToPlayerListener();
            }
            
            // Simulate click
            appLog('🎬 Simulating button click...');
            this.returnToPlayer();
        } else {
            console.error('🎬 Return to Player button not found! Re-attaching...');
            this.attachReturnToPlayerListener();
        }
        
        appLog('🎬 === TEST COMPLETE ===');
    }
    
    // Debug method to force show Now Playing widget for testing
    forceShowNowPlayingWidget() {
        appLog('🎵 Forcing Now Playing widget to show...');
        
        if (this.nowPlayingWidget) {
            // Show the widget regardless of state
            this.nowPlayingWidget.style.display = 'block';
            
            // Add some test content
            if (this.nowPlayingTitle) {
                this.nowPlayingTitle.textContent = 'Test Channel';
            }
            if (this.nowPlayingGroup) {
                this.nowPlayingGroup.textContent = 'Test Group';
            }
            if (this.nowPlayingType) {
                this.nowPlayingType.textContent = 'Test Stream';
            }
            
            appLog('🎵 Widget forced to show with test content');
        } else {
            console.error('🎵 Now Playing widget element not found!');
        }
    }
    
    updateDynamicTranslations() {
        // Update dashboard stats labels if they need dynamic updates
        this.updateDashboardStats();
        
        // Update any dynamic content in Now Playing widget
        if (this.nowPlayingTitle && this.nowPlayingTitle.textContent === 'No channel selected') {
            this.nowPlayingTitle.textContent = window.t('no_channel_selected');
        }
        
        // Update placeholder texts and other dynamic content
        if (this.languageSelect) {
            this.languageSelect.title = window.t('language_setting');
        }
        
        // Update any error messages or status texts that might be visible
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo && fileInfo.textContent) {
            // Re-translate common status messages
            const text = fileInfo.textContent.toLowerCase();
            if (text.includes('loading') || text.includes('cargando')) {
                this.showFileInfo(window.t('loading'), 'loading');
            }
        }
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

    async processM3UContent(content, filename) {
        try {
            appLog(`📁 Processing file: ${filename}`);
            
            // Store filename for playlist title
            this.lastLoadedFilename = filename;

            // Show loading screen for large files
            const isLargeFile = content.length > 100000; // 100KB threshold
            if (isLargeFile) {
                this.showLoadingScreen('Processing Playlist', `Parsing ${filename}...`);
                this.updateLoadingProgress(10, 'Parsing M3U content...');
            }

            this.playlistData = await this.parseM3U(content, isLargeFile);
            appLog(`📋 ${this.playlistData.length} elements in playlist`);

            // Update dashboard stats after loading playlist
            this.updateDashboardStats();

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

    async processLargeM3UContent(content, filename) {
        try {
            appLog(`📁 Processing large file: ${filename} (${Math.round(content.length / 1024)}KB)`);
            
            // Store filename for playlist title
            this.lastLoadedFilename = filename;

            // Always show loading screen for large files
            this.showLoadingScreen('Processing Large Playlist', `Parsing ${filename}...`);
            this.updateLoadingProgress(5, 'Initializing parser...');

            // Show skeleton loading in playlist area
            this.showSkeletonLoading();

            // Use chunked parsing for better performance
            this.playlistData = await this.parseM3UChunked(content);
            appLog(`📋 ${this.playlistData.length} elements in playlist`);

            // Update dashboard stats after loading playlist
            this.updateDashboardStats();

            if (this.playlistData.length === 0) {
                this.hideLoadingScreen();
                this.hideSkeletonLoading();
                this.showError('No valid elements found in M3U file');
                return;
            }

            this.updateLoadingProgress(85, 'Rendering playlist...');
            
            // Use requestAnimationFrame for smooth rendering
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.renderPlaylist();
                    this.updateLoadingProgress(100, 'Complete!');
                    
                    setTimeout(() => {
                        this.hideLoadingScreen();
                        this.showPlayerSection();
                        resolve();
                    }, 300);
                });
            });

            this.showFileInfo(`✅ ${filename} - ${this.playlistData.length} elements loaded`, 'success');

        } catch (error) {
            this.hideLoadingScreen();
            this.hideSkeletonLoading();
            console.error('Error processing large M3U:', error);
            this.showError(`Error processing file: ${error.message}`);
        }
    }

    async parseM3U(content, showProgress = false) {
        const lines = content.split('\n');
        const items = [];
        let currentItem = {};
        let progressUpdateInterval = Math.max(1, Math.floor(lines.length / 100)); // Update progress max 100 times

        for (let i = 0; i < lines.length; i++) {
            // Update progress for large files less frequently
            if (showProgress && i % progressUpdateInterval === 0) {
                const progress = 10 + (i / lines.length) * 60; // 10-70% range
                this.updateLoadingProgress(progress, `Processing ${Math.floor((i / lines.length) * 100)}%...`, items.length, items.length);
                // Yield to UI thread periodically
                if (i % (progressUpdateInterval * 10) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            const line = lines[i].trim();
            if (!line || line.startsWith('#EXTM3U')) continue;

            if (line.startsWith('#EXTINF:')) {
                // Optimized parsing with single regex
                const extinf = line.match(/#EXTINF:([^,]*),(.*)$/);
                if (!extinf) continue;

                currentItem = {
                    duration: extinf[1],
                    title: extinf[2].trim(),
                    group: '',
                    logo: '',
                    tvgId: '',
                    tvgName: ''
                };

                // Fast attribute parsing with optimized regex
                const attrMatches = line.matchAll(/(\w+(?:-\w+)*)="([^"]*)"/g);
                for (const match of attrMatches) {
                    const [, key, value] = match;
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
                }

                // Use tvgName as fallback title
                if (!currentItem.title && currentItem.tvgName) {
                    currentItem.title = currentItem.tvgName;
                }
            } else if (line && !line.startsWith('#') && currentItem.title) {
                // Optimized stream type detection
                currentItem.url = line;
                currentItem.type = this.detectStreamType(line);
                items.push(currentItem);
                currentItem = {};
            }
        }

        return items;
    }

    async parseM3UChunked(content) {
        const lines = content.split('\n');
        const items = [];
        let currentItem = {};
        const chunkSize = 500; // Process 500 lines at a time
        const totalLines = lines.length;
        
        appLog(`📋 Processing ${totalLines} lines in chunks of ${chunkSize}`);

        for (let startIdx = 0; startIdx < totalLines; startIdx += chunkSize) {
            const endIdx = Math.min(startIdx + chunkSize, totalLines);
            const progress = 10 + (startIdx / totalLines) * 70; // 10-80% range
            
            this.updateLoadingProgress(
                progress, 
                `Processing chunk ${Math.floor(startIdx / chunkSize) + 1}/${Math.ceil(totalLines / chunkSize)}...`, 
                items.length,
                totalLines
            );

            // Process current chunk
            for (let i = startIdx; i < endIdx; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('#EXTM3U')) continue;

                if (line.startsWith('#EXTINF:')) {
                    // Optimized parsing with single regex
                    const extinf = line.match(/#EXTINF:([^,]*),(.*)$/);
                    if (!extinf) continue;

                    currentItem = {
                        duration: extinf[1],
                        title: extinf[2].trim(),
                        group: '',
                        logo: '',
                        tvgId: '',
                        tvgName: ''
                    };

                    // Fast attribute parsing with optimized regex
                    const attrMatches = line.matchAll(/(\w+(?:-\w+)*)="([^"]*)"/g);
                    for (const match of attrMatches) {
                        const [, key, value] = match;
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
                    }

                    // Use tvgName as fallback title
                    if (!currentItem.title && currentItem.tvgName) {
                        currentItem.title = currentItem.tvgName;
                    }
                } else if (line && !line.startsWith('#') && currentItem.title) {
                    // Optimized stream type detection
                    currentItem.url = line;
                    currentItem.type = this.detectStreamType(line);
                    items.push(currentItem);
                    currentItem = {};
                }
            }

            // Yield to UI thread after each chunk to prevent blocking
            await new Promise(resolve => requestAnimationFrame(resolve));
        }

        appLog(`✅ Chunked parsing complete: ${items.length} items processed`);
        return items;
    }

    detectStreamType(url) {
        const urlLower = url.toLowerCase();
        
        // HLS streams
        if (urlLower.includes('.m3u8') || urlLower.includes('/hls/')) {
            return 'HLS';
        }
        
        // Transport Stream files (should be treated as direct)
        if (urlLower.includes('.ts') || urlLower.includes('.mts')) {
            return 'Direct';
        }
        
        // Direct video files
        if (urlLower.includes('.mp4') || urlLower.includes('.webm') || 
            urlLower.includes('.ogg') || urlLower.includes('.mkv') || 
            urlLower.includes('.avi') || urlLower.includes('.mov')) {
            return 'Direct';
        }
        
        // DASH streams
        if (urlLower.includes('.mpd')) {
            return 'DASH';
        }
        
        // RTMP/RTSP streams
        if (urlLower.startsWith('rtmp://') || urlLower.startsWith('rtmps://')) {
            return 'RTMP';
        }
        if (urlLower.startsWith('rtsp://')) {
            return 'RTSP';
        }
        
        // IPTV streams with authentication pattern (user/pass/channel or similar)
        // Matches patterns like: /user/pass/12345.ts or /TV-user/pass/12345
        const iptvPattern = /\/[^\/]+\/[^\/]+\/\d+/;
        if (iptvPattern.test(url)) {
            return 'IPTV';
        }
        
        // Also detect URLs that contain encoded IPTV tokens (from redirects)
        if (url.includes('/play/mpegts/') || url.includes('lvtoken=')) {
            return 'IPTV';
        }
        
        // Detect proxy URLs for IPTV streams
        if (url.includes('localhost:13337/proxy/')) {
            return 'IPTV';
        }
        
        // HTTP Live streams (detect by URL patterns)
        if (urlLower.includes('/live/') || urlLower.includes('/stream/') || 
            urlLower.includes('?') || urlLower.includes('channel=')) {
            return 'Stream';
        }
        
        // Default to Stream for unknown formats
        return 'Stream';
    }

    renderPlaylist() {
        appLog('🔍 renderPlaylist called - Starting debug...');
        appLog('this.playlist:', this.playlist);
        appLog('this.playlistData:', this.playlistData);
        appLog('this.playlistData length:', this.playlistData?.length);
        
        if (!this.playlist || !this.playlistData) {
            console.error('❌ Cannot render playlist - missing elements:', {
                playlist: !!this.playlist,
                playlistData: !!this.playlistData,
                dataLength: this.playlistData?.length || 0
            });
            return;
        }

        appLog(`📋 Rendering ${this.playlistData.length} elements...`);
        
        // Show skeleton loading for better UX
        this.showSkeletonLoading();

        // For large playlists, use virtual scrolling + indexed search
        if (this.playlistData.length > 1000) {
            appLog('🚀 Using virtual list + indexed search for large playlist');
            this.setupVirtualPlaylist();
            // Configure filters and counter
            this.populateGroupFilter();
            if (typeof this.updateFilterCounts === 'function') {
                this.updateFilterCounts();
            }
            this.updateChannelCount(this.playlistData.length, this.playlistData.length);
            return;
        }

        // For smaller playlists, use optimized batch rendering
        appLog('📋 Using batched rendering for smaller playlist');
        this.renderBatchedPlaylist();

        // Configure filters and counter
        this.populateGroupFilter();
        this.updateFilterCounts();
        this.updateChannelCount(this.playlistData.length, this.playlistData.length);

        // Hide skeleton loading after rendering
        setTimeout(() => {
            this.hideSkeletonLoading();
            appLog('✅ Playlist rendering complete, skeleton hidden');
        }, 100);
        
        // Preload logos in background (limited for performance)
        setTimeout(() => this.preloadLogos(), 200);
    }

    setupVirtualPlaylist() {
        try {
            this.isVirtualMode = true;
            const items = this.playlistData;

            // Ensure playlist container has height for virtualization
            if (!this.playlist.style.height) {
                this.playlist.style.height = '60vh';
            }
            this.playlist.style.display = 'block';
            this.playlist.style.overflow = 'auto';

            if (window.UI && window.UI.ChannelList) {
                this.channelList = window.UI.ChannelList({
                    container: this.playlist,
                    items,
                    onItemClick: (item, idx) => {
                        const target = this._currentFilteredItems ? this._currentFilteredItems[idx] : items[idx];
                        const originalIndex = this.playlistData.indexOf(target);
                        if (originalIndex >= 0) this.playItem(originalIndex);
                    },
                    onTestClick: (item, idx) => {
                        const target = this._currentFilteredItems ? this._currentFilteredItems[idx] : items[idx];
                        const originalIndex = this.playlistData.indexOf(target);
                        if (originalIndex >= 0) this.testStream(originalIndex);
                    }
                });
            }

            if (window.UI && window.UI.SearchBar) {
                this.searchComponent = window.UI.SearchBar({
                    items,
                    onResults: (indices) => {
                        this._currentFilteredItems = indices.map(i => items[i]);
                        if (this.channelList) this.channelList.update(this._currentFilteredItems);
                        this.updateChannelCount(this._currentFilteredItems.length, this.playlistData.length);
                    }
                });
            }

            // Initial state
            this._currentFilteredItems = items;

            // Hide skeleton once ready
            setTimeout(() => this.hideSkeletonLoading(), 100);

            appLog('✅ Virtual list initialized');
        } catch (e) {
            console.warn('⚠️ Virtual list failed, falling back to built-in virtual scrolling:', e);
            this.isVirtualMode = false;
            this.initVirtualScrolling();
        }
    }

    virtualHandleSearch() {
        if (!this.isVirtualMode || !this.searchComponent) return;
        const query = this.searchInput?.value || '';
        const group = this.groupFilter?.value || '';
        const type = this.typeFilter?.value || '';
        this.searchComponent.run(query, { group, type });
    }

    showSkeletonLoading() {
        const playlistSkeleton = document.getElementById('playlistSkeleton');
        const playlist = document.getElementById('playlist');
        
        if (playlistSkeleton && playlist) {
            playlistSkeleton.style.display = 'block';
            playlist.style.display = 'none';
        }
    }

    hideSkeletonLoading() {
        const playlistSkeleton = document.getElementById('playlistSkeleton');
        const playlist = document.getElementById('playlist');
        
        appLog('🔄 Hiding skeleton loading...');
        
        if (playlistSkeleton && playlist) {
            // Force hide skeleton
            playlistSkeleton.style.display = 'none';
            playlistSkeleton.style.visibility = 'hidden';
            
            // Force show playlist
            playlist.style.display = 'block';
            playlist.style.visibility = 'visible';
            
            appLog('✅ Skeleton hidden, playlist shown');
            appLog('Playlist has', playlist.children.length, 'children');
        } else {
            console.error('❌ Could not hide skeleton - elements missing:', {
                skeleton: !!playlistSkeleton,
                playlist: !!playlist
            });
        }
    }

    renderBatchedPlaylist() {
        const fragment = document.createDocumentFragment();
        const batchSize = 100; // Increased batch size
        let currentBatch = 0;
        let totalItemsRendered = 0;

        appLog(`📋 Starting batched rendering with ${this.playlistData.length} items, batch size: ${batchSize}`);

        const renderBatch = () => {
            const start = currentBatch * batchSize;
            const end = Math.min(start + batchSize, this.playlistData.length);

            appLog(`📋 Rendering batch ${currentBatch + 1}, items ${start}-${end-1}`);

            for (let i = start; i < end; i++) {
                const item = this.playlistData[i];
                try {
                    const playlistItem = this.createPlaylistItem(item, i);
                    if (playlistItem) {
                        fragment.appendChild(playlistItem);
                        totalItemsRendered++;
                    } else {
                        console.warn(`⚠️ Failed to create playlist item for index ${i}:`, item);
                    }
                } catch (error) {
                    console.error(`❌ Error creating playlist item ${i}:`, error, item);
                }
            }

            currentBatch++;

            if (end < this.playlistData.length) {
                // Continue with next batch
                requestAnimationFrame(renderBatch);
            } else {
                // Insert everything at once at the end
                if (this.playlist) {
                    this.playlist.innerHTML = '';
                    this.playlist.appendChild(fragment);
                    appLog(`✅ Playlist rendered completely: ${totalItemsRendered}/${this.playlistData.length} items`);
                    
                    // Verify the playlist is visible
                    if (this.playlist.children.length > 0) {
                        appLog(`✅ Playlist container has ${this.playlist.children.length} visible items`);
                    } else {
                        console.error('❌ Playlist container is empty after rendering!');
                    }
                } else {
                    console.error('❌ Playlist element not found during rendering!');
                }
            }
        };

        renderBatch();
    }

    initVirtualScrolling() {
        appLog(`🚀 Using virtual scrolling for ${this.playlistData.length} items`);
        
        // CRITICAL: Ensure playlist is visible
        this.playlist.style.display = 'block';
        this.playlist.innerHTML = '';
        this.playlist.style.height = '400px';
        this.playlist.style.overflow = 'auto';
        this.playlist.style.position = 'relative';

        // Virtual scrolling parameters
        this.itemHeight = 60; // Fixed item height
        this.containerHeight = 400;
        this.visibleItemCount = Math.ceil(this.containerHeight / this.itemHeight) + 5; // Add buffer
        this.startIndex = 0;
        this.endIndex = Math.min(this.visibleItemCount, this.playlistData.length);


        // Create virtual container
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.style.height = `${this.playlistData.length * this.itemHeight}px`;
        this.virtualContainer.style.position = 'relative';

        // Create visible items container
        this.visibleContainer = document.createElement('div');
        this.visibleContainer.style.position = 'absolute';
        this.visibleContainer.style.top = '0px';
        this.visibleContainer.style.width = '100%';

        this.virtualContainer.appendChild(this.visibleContainer);
        this.playlist.appendChild(this.virtualContainer);

        // Render initial items
        this.renderVirtualItems();
        
        // CRITICAL: Hide skeleton loading after virtual scroll setup
        setTimeout(() => {
            this.hideSkeletonLoading();
        }, 100);

        // Add scroll listener with throttling
        let scrollTimeout;
        this.playlist.addEventListener('scroll', () => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                this.handleVirtualScroll();
                scrollTimeout = null;
            }, 16); // ~60fps
        });
    }

    renderVirtualItems() {
        const fragment = document.createDocumentFragment();
        let itemsRendered = 0;
        
        
        for (let i = this.startIndex; i < this.endIndex; i++) {
            if (i >= this.playlistData.length) break;
            
            const item = this.playlistData[i];
            try {
                const playlistItem = this.createPlaylistItem(item, i);
                playlistItem.style.position = 'absolute';
                playlistItem.style.top = `${(i - this.startIndex) * this.itemHeight}px`;
                playlistItem.style.height = `${this.itemHeight}px`;
                playlistItem.style.width = '100%';
                playlistItem.style.boxSizing = 'border-box';
                fragment.appendChild(playlistItem);
                itemsRendered++;
            } catch (error) {
            }
        }

        this.visibleContainer.innerHTML = '';
        this.visibleContainer.appendChild(fragment);
        
        // Update container position
        this.visibleContainer.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
        
    }

    handleVirtualScroll() {
        const scrollTop = this.playlist.scrollTop;
        const newStartIndex = Math.floor(scrollTop / this.itemHeight);
        const newEndIndex = Math.min(newStartIndex + this.visibleItemCount, this.playlistData.length);

        if (newStartIndex !== this.startIndex || newEndIndex !== this.endIndex) {
            this.startIndex = newStartIndex;
            this.endIndex = newEndIndex;
            this.renderVirtualItems();
        }
    }

    preloadLogos() {
        // Limit preloading based on playlist size
        const maxLogos = this.playlistData.length > 1000 ? 10 : 20;
        const logosToPreload = this.playlistData
            .filter(item => item.logo && item.logo.trim())
            .slice(0, maxLogos)
            .map(item => item.logo);

        // Preload with delay to avoid overwhelming the browser
        logosToPreload.forEach((logoUrl, index) => {
            setTimeout(() => {
                const img = new Image();
                img.src = logoUrl;
            }, index * 100); // 100ms delay between each image
        });

        if (logosToPreload.length > 0) {
            appLog(`🖼️ Preloading ${logosToPreload.length} logos...`);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showPlayerSection() {
        appLog('🎬 Attempting to show player section...');
        
        if (this.playerSection) {
            appLog('✅ Player section element found');
            
            // Ocultar sección de dashboard
            const dashboardSection = document.getElementById('dashboardSection');
            if (dashboardSection) {
                dashboardSection.style.display = 'none';
                appLog('📱 Dashboard section hidden');
            } else {
                console.warn('⚠️ Dashboard section not found');
            }

            // Mostrar reproductor con animación
            this.playerSection.style.display = 'block';
            this.playerSection.style.opacity = '0';
            this.playerSection.style.transform = 'translateY(20px)';
            appLog('🎬 Player section display set to block');

            requestAnimationFrame(() => {
                this.playerSection.style.transition = 'all 0.5s ease';
                this.playerSection.style.opacity = '1';
                this.playerSection.style.transform = 'translateY(0)';
                appLog('🎬 Player section animation applied');
            });
            
            // Verify playlist element is visible within player section
            if (this.playlist) {
                const childrenCount = this.playlist.children.length;
                const displayStyle = getComputedStyle(this.playlist).display;
                const visibility = getComputedStyle(this.playlist).visibility;
                
                appLog(`📋 Playlist element found with ${childrenCount} children`);
                appLog(`📋 Playlist display style: ${displayStyle}`);
                appLog(`📋 Playlist visibility: ${visibility}`);
                
            } else {
                console.error('❌ Playlist element not found in player section!');
            }
        } else {
            console.error('❌ Player section element not found!');
        }

        // Inicializar controles
        try {
            this.updatePlayPauseButton();
            this.initializeTimeDisplay();
            appLog('✅ Player controls initialized');
        } catch (error) {
            console.error('❌ Error initializing player controls:', error);
        }

        // Update playlist title info
        this.updatePlaylistTitle();
        
        appLog('🎬 Reproductor mostrado');
    }

    async playItem(index) {
        if (index < 0 || index >= this.playlistData.length) return;

        const item = this.playlistData[index];
        appLog(`🎬 Cargando: ${item.title}`);

        // Clear any previous audio-only styling
        this.clearAudioOnlyDisplay();

        this.currentIndex = index;
        this.updateCurrentInfo(item);
        this.updatePlaylistSelection();
        
        // Update Now Playing widget
        this.updateNowPlayingWidget(item);

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

        // Stop previous bandwidth monitoring
        this.stopBandwidthMonitoring();

        // Limpiar HLS anterior si existe
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Resetear filtros de video a valores por defecto
        this.resetVideoFilters();

        if (item.type === 'HLS' && window.Hls && window.Hls.isSupported()) {
            await this.loadHLSStream(item);
        } else if (item.type === 'IPTV') {
            await this.loadIPTVStream(item);
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

            appLog('🔄 Filtros de video reseteados');
        }
    }

    async loadHLSStream(item) {
        // Check if this is an audio-only stream
        const isAudioOnly = await this.isAudioOnlyStream(item.url);
        if (isAudioOnly) {
            this.setupAudioOnlyDisplay(item);
        }
        
        return new Promise((resolve, reject) => {
            appLog('📡 Cargando stream HLS con HLS.js');

            // Configure HLS.js with special headers for Solanaflix
            const hlsConfig = {
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90
            };

            // Add VLC headers for streams that need authentication
            // Check if URL contains credentials or comes from IPTV providers
            const needsAuth = this.streamNeedsAuthentication(item.url);
            if (needsAuth) {
                appLog('🔐 Aplicando headers de autenticación para stream HLS');
                const url = new URL(item.url);
                const referer = `${url.protocol}//${url.hostname}/`;
                
                hlsConfig.xhrSetup = function(xhr, url) {
                    xhr.setRequestHeader('User-Agent', 'VLC/3.0.8 LibVLC/3.0.8');
                    xhr.setRequestHeader('Referer', referer);
                    xhr.setRequestHeader('Accept', '*/*');
                    xhr.setRequestHeader('Connection', 'keep-alive');
                };
            }

            this.hls = new window.Hls(hlsConfig);

            this.hls.loadSource(item.url);
            this.hls.attachMedia(this.videoPlayer);

            this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                appLog('✅ Stream HLS cargado correctamente');
                this.hideLoading();
                this.startBandwidthMonitoring();

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

            // Add bandwidth monitoring events
            this.hls.on(window.Hls.Events.FRAG_LOADED, (event, data) => {
                this.updateBandwidthStats(data);
            });

            this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
                this.updateStreamQuality(data);
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
            appLog(`🎥 Cargando stream directo (${item.type}): ${item.url}`);

            // Special handling for TS streams
            const isTS = item.url.toLowerCase().includes('.ts');
            
            const handleCanPlay = () => {
                appLog('✅ Stream directo cargado correctamente');
                this.hideLoading();

                if (this.config.playerSettings?.autoplay) {
                    this.videoPlayer.play().catch(e => {
                        console.warn('Autoplay bloqueado:', e);
                    });
                }

                this.updatePlayPauseButton();
                this.videoPlayer.removeEventListener('canplay', handleCanPlay);
                this.videoPlayer.removeEventListener('error', handleError);
                this.videoPlayer.removeEventListener('loadeddata', handleLoadedData);
                resolve();
            };

            const handleLoadedData = () => {
                appLog('✅ Stream data loaded');
                this.hideLoading();
                
                if (this.config.playerSettings?.autoplay) {
                    this.videoPlayer.play().catch(e => {
                        console.warn('Autoplay bloqueado:', e);
                    });
                }
                
                this.updatePlayPauseButton();
                this.videoPlayer.removeEventListener('canplay', handleCanPlay);
                this.videoPlayer.removeEventListener('error', handleError);
                this.videoPlayer.removeEventListener('loadeddata', handleLoadedData);
                resolve();
            };

            const handleError = (e) => {
                console.error('❌ Error en stream directo:', e.target.error);
                this.videoPlayer.removeEventListener('canplay', handleCanPlay);
                this.videoPlayer.removeEventListener('error', handleError);
                this.videoPlayer.removeEventListener('loadeddata', handleLoadedData);
                
                const errorMsg = e.target.error ? 
                    `Error ${e.target.error.code}: ${this.getMediaErrorMessage(e.target.error.code)}` :
                    'Error desconocido cargando stream';
                reject(new Error(errorMsg));
            };

            // Add event listeners
            this.videoPlayer.addEventListener('canplay', handleCanPlay);
            this.videoPlayer.addEventListener('loadeddata', handleLoadedData);
            this.videoPlayer.addEventListener('error', handleError);

            // Configure video element for better TS support
            this.videoPlayer.preload = 'metadata';
            this.videoPlayer.crossOrigin = 'anonymous';
            
            // Set source with proper headers for TS streams
            if (isTS) {
                appLog('🎬 Configurando para stream TS');
                this.videoPlayer.src = item.url;
            } else {
                this.videoPlayer.src = item.url;
            }
            
            this.videoPlayer.load();

            // Extended timeout for TS streams
            const timeout = isTS ? 15000 : 10000;
            setTimeout(() => {
                if (this.videoPlayer.readyState === 0) {
                    this.videoPlayer.removeEventListener('canplay', handleCanPlay);
                    this.videoPlayer.removeEventListener('error', handleError);
                    this.videoPlayer.removeEventListener('loadeddata', handleLoadedData);
                    reject(new Error(`Timeout cargando stream (${timeout/1000}s)`));
                }
            }, timeout);
        });
    }

    streamNeedsAuthentication(url) {
        // Only apply authentication headers to known IPTV providers that need them
        // Be very specific to avoid false positives with public streams
        
        // Specific IPTV provider patterns
        if (url.includes('solanaflix.com')) return true;
        if (/xtream.*codes/i.test(url)) return true;
        if (/stalker.*portal/i.test(url)) return true;
        
        // Specific credential patterns in path (not query parameters)
        if (/\/[A-Z]+-\d+\/\d+\/\d+/.test(url)) return true;  // TV-12345/67890/123 pattern
        
        // API endpoints with explicit username/password
        if (url.includes('get.php') && /username.*password/i.test(url)) return true;
        
        // Avoid false positives with public streaming services
        const publicServices = [
            'pluto.tv', 'youtube.com', 'twitch.tv', 'vimeo.com',
            'dailymotion.com', 'facebook.com', 'cdn.', 'akamai',
            'cloudfront.net', 'fastly.com', 'netlify.com'
        ];
        
        if (publicServices.some(service => url.includes(service))) {
            return false;
        }
        
        return false;  // Default to no auth for unknown URLs
    }

    async isAudioOnlyStream(url) {
        try {
            appLog('🎵 Checking if stream is audio-only...');
            const response = await window.api.fetchUrl(url, {
                method: 'HEAD',
                timeout: 5000
            });
            
            if (response.success) {
                const contentType = response.headers['content-type'];
                if (contentType && contentType.includes('audio/')) {
                    return true;
                }
            }
            
            // If it's an M3U8, check the manifest for codec information
            if (url.includes('.m3u8')) {
                const manifestResponse = await window.api.fetchUrl(url, { timeout: 5000 });
                if (manifestResponse.success && manifestResponse.data) {
                    const manifest = manifestResponse.data;
                    // Check for audio-only codec patterns
                    if (manifest.includes('CODECS="mp4a.') && !manifest.includes('avc1.') && !manifest.includes('hvc1.')) {
                        appLog('🎵 Detected audio-only stream from manifest');
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            appLog('⚠️ Could not determine if stream is audio-only:', error.message);
            return false;
        }
    }

    async loadIPTVStream(item) {
        appLog(`📡 Cargando stream IPTV: ${item.url}`);
        
        // Use original item for now to avoid conflicts with normal streams
        let finalItem = { ...item };
        
        // Try multiple approaches for IPTV streams
        const approaches = [
            () => this.tryIPTVAsHLS(finalItem),
            () => this.tryIPTVAsDirect(finalItem),
            () => this.tryIPTVWithHeaders(finalItem),
            () => this.tryIPTVWithProxy(finalItem)
        ];
        
        for (let i = 0; i < approaches.length; i++) {
            try {
                appLog(`🔄 Intentando método ${i + 1}/${approaches.length}`);
                await approaches[i]();
                appLog(`✅ Stream IPTV cargado con método ${i + 1}`);
                return;
            } catch (error) {
                console.warn(`⚠️ Método ${i + 1} falló:`, error.message);
                if (i === approaches.length - 1) {
                    throw new Error(`Todos los métodos fallaron. Último error: ${error.message}`);
                }
            }
        }
    }

    async resolveFinalUrl(originalUrl) {
        try {
            const url = new URL(originalUrl);
            const referer = `${url.protocol}//${url.hostname}/`;
            
            appLog(`🔍 Resolviendo URL final para: ${originalUrl}`);
            
            const headResponse = await window.api.fetchUrl(originalUrl, {
                method: 'HEAD',
                timeout: 10000,
                userAgent: 'VLC/3.0.8 LibVLC/3.0.8',
                headers: {
                    'User-Agent': 'VLC/3.0.8 LibVLC/3.0.8',
                    'Referer': referer,
                    'Accept': '*/*',
                    'Connection': 'keep-alive'
                }
            });

            if (headResponse.success) {
                const finalUrl = headResponse.finalUrl || originalUrl;
                appLog(`✅ URL final obtenida: ${finalUrl}`);
                return finalUrl;
            } else {
                console.warn(`⚠️ HEAD request falló: ${headResponse.error}`);
                return originalUrl;
            }
        } catch (error) {
            console.warn('❌ Error resolving final URL:', error);
            return originalUrl;
        }
    }

    async tryIPTVWithProxy(item) {
        return new Promise(async (resolve, reject) => {
            appLog('🧪 Probando IPTV con proxy local...');
            
            if (!this.isElectron || !window.electronAPI) {
                reject(new Error('Proxy requiere Electron'));
                return;
            }

            try {
                // Get proxy URL for the final stream URL
                const proxyResponse = await window.electronAPI.getProxyUrl(item.url);
                
                if (!proxyResponse.success) {
                    throw new Error(`Error creando proxy: ${proxyResponse.error}`);
                }

                appLog(`✅ HLS Manifest URL creada: ${proxyResponse.proxyUrl}`);

                // Use HLS.js with the generated manifest
                if (!window.Hls || !window.Hls.isSupported()) {
                    throw new Error('HLS.js no soportado para proxy streams');
                }

                this.hls = new window.Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: false,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                    fragLoadingTimeOut: 20000,
                    manifestLoadingTimeOut: 10000
                });

                this.hls.loadSource(proxyResponse.proxyUrl);
                this.hls.attachMedia(this.videoPlayer);
                
                let resolved = false;
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Timeout esperando que el proxy stream se cargue'));
                    }
                }, 20000);
                
                this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                    if (!resolved) {
                        appLog('✅ IPTV manifest proxy parseado');
                        resolved = true;
                        clearTimeout(timeout);
                        this.hideLoading();
                        if (this.config.playerSettings?.autoplay) {
                            this.videoPlayer.play().catch(e => console.warn('Autoplay:', e));
                        }
                        this.updatePlayPauseButton();
                        resolve();
                    }
                });

                this.hls.on(window.Hls.Events.ERROR, (event, data) => {
                    if (!resolved) {
                        console.error('❌ HLS Proxy Error:', data);
                        if (data.fatal) {
                            resolved = true;
                            clearTimeout(timeout);
                            reject(new Error(`HLS proxy error: ${data.type} - ${data.details}`));
                        }
                    }
                });
                
            } catch (error) {
                console.error('❌ Error en tryIPTVWithProxy:', error);
                reject(error);
            }
        });
    }

    async tryIPTVAsHLS(item) {
        if (!window.Hls || !window.Hls.isSupported()) {
            throw new Error('HLS.js no soportado');
        }

        return new Promise((resolve, reject) => {
            appLog('🧪 Probando IPTV como HLS...');
            
            this.hls = new window.Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                fragLoadingTimeOut: 20000,
                manifestLoadingTimeOut: 10000,
                // Remove xhrSetup for now to avoid CORS issues
                // The redirect handling in fetchUrl should provide the correct final URL
            });

            let resolved = false;

            this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                if (!resolved) {
                    appLog('✅ IPTV stream detectado como HLS');
                    this.hideLoading();
                    if (this.config.playerSettings?.autoplay) {
                        this.videoPlayer.play().catch(e => console.warn('Autoplay:', e));
                    }
                    this.updatePlayPauseButton();
                    resolved = true;
                    resolve();
                }
            });

            this.hls.on(window.Hls.Events.ERROR, (event, data) => {
                if (!resolved) {
                    console.error('❌ HLS Error:', data);
                    if (data.fatal) {
                        resolved = true;
                        reject(new Error(`HLS Error: ${data.details}`));
                    }
                }
            });

            try {
                this.hls.loadSource(item.url);
                this.hls.attachMedia(this.videoPlayer);
                
                // Timeout for HLS detection
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Timeout HLS (10s)'));
                    }
                }, 10000);
            } catch (error) {
                resolved = true;
                reject(error);
            }
        });
    }

    async tryIPTVAsDirect(item) {
        return new Promise((resolve, reject) => {
            appLog('🧪 Probando IPTV como stream directo...');
            
            let resolved = false;
            
            const handleSuccess = () => {
                if (!resolved) {
                    appLog('✅ IPTV cargado como stream directo');
                    this.hideLoading();
                    if (this.config.playerSettings?.autoplay) {
                        this.videoPlayer.play().catch(e => console.warn('Autoplay:', e));
                    }
                    this.updatePlayPauseButton();
                    cleanup();
                    resolved = true;
                    resolve();
                }
            };

            const handleError = (e) => {
                if (!resolved) {
                    cleanup();
                    resolved = true;
                    reject(new Error(`Stream directo error: ${e.target.error?.code || 'unknown'}`));
                }
            };

            const cleanup = () => {
                this.videoPlayer.removeEventListener('canplay', handleSuccess);
                this.videoPlayer.removeEventListener('loadeddata', handleSuccess);
                this.videoPlayer.removeEventListener('error', handleError);
            };

            this.videoPlayer.addEventListener('canplay', handleSuccess);
            this.videoPlayer.addEventListener('loadeddata', handleSuccess);
            this.videoPlayer.addEventListener('error', handleError);

            // Configure for IPTV
            this.videoPlayer.preload = 'metadata';
            this.videoPlayer.crossOrigin = 'anonymous';
            this.videoPlayer.src = item.url;
            this.videoPlayer.load();

            // Timeout for direct stream
            setTimeout(() => {
                if (!resolved) {
                    cleanup();
                    resolved = true;
                    reject(new Error('Timeout stream directo (15s)'));
                }
            }, 15000);
        });
    }

    async tryIPTVWithHeaders(item) {
        return new Promise(async (resolve, reject) => {
            appLog('🧪 Probando IPTV con headers especiales...');
            
            // This approach tries to load with special headers via fetch
            // and then use blob URL
            if (!this.isElectron || !window.electronAPI) {
                reject(new Error('Headers especiales requieren Electron'));
                return;
            }

            try {
                // Extract domain for referer
                const url = new URL(item.url);
                const referer = `${url.protocol}//${url.hostname}/`;

                // First, get the final URL by following redirects
                appLog('🔄 Resolviendo URL final mediante HEAD request...');
                let finalUrl = item.url;
                let attempts = 0;
                const maxRedirects = 5;
                
                while (attempts < maxRedirects) {
                    const headResponse = await window.api.fetchUrl(finalUrl, {
                        method: 'HEAD',
                        timeout: 10000,
                        userAgent: 'VLC/3.0.8 LibVLC/3.0.8',
                        headers: {
                            'User-Agent': 'VLC/3.0.8 LibVLC/3.0.8',
                            'Referer': referer,
                            'Accept': '*/*',
                            'Connection': 'keep-alive'
                        }
                    });

                    if (!headResponse.success) {
                        throw new Error(`HEAD request failed: ${headResponse.statusCode}`);
                    }

                    // Check if there's a redirect
                    if (headResponse.statusCode >= 300 && headResponse.statusCode < 400) {
                        // The fetchUrl already followed redirects, so we should get the final URL
                        break;
                    } else if (headResponse.statusCode === 200) {
                        appLog(`✅ URL final encontrada. Content-Type: ${headResponse.headers['content-type']}`);
                        break;
                    }
                    
                    attempts++;
                }

                // Now try to use the stream directly - MPEG-TS streams should work with direct video element
                appLog('🎬 Intentando reproducir stream TS directamente...');
                
                // For MPEG-TS streams, try direct approach first
                this.videoPlayer.src = finalUrl;
                this.videoPlayer.load();
                
                let resolved = false;
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Timeout esperando que el video se cargue'));
                    }
                }, 15000);
                
                this.videoPlayer.addEventListener('canplay', () => {
                    if (!resolved) {
                        appLog('✅ Stream TS cargado directamente');
                        resolved = true;
                        clearTimeout(timeout);
                        this.hideLoading();
                        if (this.config.playerSettings?.autoplay) {
                            this.videoPlayer.play().catch(e => console.warn('Autoplay:', e));
                        }
                        resolve();
                    }
                }, { once: true });

                this.videoPlayer.addEventListener('loadedmetadata', () => {
                    appLog('✅ Metadata del stream cargada');
                }, { once: true });

                this.videoPlayer.addEventListener('error', (e) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        const error = e.target.error;
                        reject(new Error(`Error de video: ${error?.code} - ${this.getMediaErrorMessage(error?.code)}`));
                    }
                }, { once: true });
            } catch (error) {
                console.error('❌ Error en tryIPTVWithHeaders:', error);
                reject(error);
            }
        });
    }

    getMediaErrorMessage(code) {
        switch(code) {
            case 1: return 'Reproducción abortada';
            case 2: return 'Error de red';
            case 3: return 'Error de decodificación';
            case 4: return 'Formato no soportado';
            default: return 'Error desconocido';
        }
    }

    handleStreamError(error) {
        console.error('❌ Error de stream:', error.message);
        this.showError(`Error: ${error.message}`);

        // Auto-avanzar al siguiente después de un error
        setTimeout(() => {
            if (this.currentIndex < this.playlistData.length - 1) {
                appLog('⏭️ Auto-avanzando al siguiente stream...');
                this.playNext();
            }
        }, 3000);
    }

    async testStream(index) {
        const item = this.playlistData[index];
        appLog(`🔧 Probando stream: ${item.title}`);

        try {
            let result;
            if (this.isElectron && window.electronAPI) {
                result = await window.api.fetchUrl(item.url, {
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
        
        // Stop bandwidth monitoring
        this.stopBandwidthMonitoring();

        this.hideLoading();
        this.hideError();
        this.updatePlayPauseButton();

        // Clean up audio-only styling
        this.clearAudioOnlyDisplay();

        // Resetear información actual
        if (this.currentTitle) this.currentTitle.textContent = 'No hay video seleccionado';
        if (this.currentUrl) this.currentUrl.textContent = '';
        if (this.streamInfo) this.streamInfo.innerHTML = '';

        appLog('⏹️ Reproducción detenida');
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
                appLog('📺 Saliendo de Picture-in-Picture');
            } else {
                await this.videoPlayer.requestPictureInPicture();
                appLog('📺 Entrando en Picture-in-Picture');
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
                appLog('⛶ Saliendo de pantalla completa');
            } else {
                this.videoPlayer.requestFullscreen();
                appLog('⛶ Entrando en pantalla completa');
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
            appLog(`☀️ Brillo ajustado a: ${value}%`);
        }
    }

    setContrast(value) {
        if (this.videoPlayer) {
            const contrast = value / 100;
            const brightness = this.brightnessSlider ? this.brightnessSlider.value / 100 : 1.0;
            this.videoPlayer.style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(1.1)`;
            appLog(`🔆 Contraste ajustado a: ${value}%`);
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
        appLog('⏰ Time display initialized');
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
            appLog(`⏰ Duration updated: ${duration}`);
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

    setupAudioOnlyDisplay(item) {
        appLog('🎵 Setting up audio-only display for radio stream');
        
        // Show a visual indicator that this is an audio-only stream
        if (this.videoPlayer) {
            // Set a background image or color for audio streams
            this.videoPlayer.style.background = `
                linear-gradient(135deg, #667eea 0%, #764ba2 100%),
                url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="40" text-anchor="middle" fill="white">🎵</text></svg>')
            `;
            this.videoPlayer.style.backgroundSize = 'cover, 60px 60px';
            this.videoPlayer.style.backgroundPosition = 'center, center';
            this.videoPlayer.style.backgroundRepeat = 'no-repeat, no-repeat';
        }
        
        // Update UI to show it's a radio stream
        if (this.currentTitle) {
            this.currentTitle.innerHTML = `🎵 ${item.title} <span style="font-size: 0.8em; opacity: 0.7;">(Audio Only)</span>`;
        }
        
        // Show audio visualization or waveform if available
        this.showAudioVisualization();
    }

    showAudioVisualization() {
        // Simple pulsing animation for audio-only streams
        if (this.videoPlayer) {
            this.videoPlayer.classList.add('audio-only-stream');
            
            // Add CSS animation if not already added
            if (!document.getElementById('audio-only-styles')) {
                const style = document.createElement('style');
                style.id = 'audio-only-styles';
                style.textContent = `
                    .audio-only-stream {
                        animation: audioPulse 2s ease-in-out infinite alternate;
                    }
                    
                    @keyframes audioPulse {
                        0% { filter: brightness(1) saturate(1); }
                        100% { filter: brightness(1.2) saturate(1.3); }
                    }
                    
                    .audio-only-stream::after {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 100px;
                        height: 100px;
                        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/><text x="50" y="60" font-size="30" text-anchor="middle" fill="rgba(255,255,255,0.8)">♪</text></svg>');
                        background-size: contain;
                        animation: audioSpin 8s linear infinite;
                        pointer-events: none;
                    }
                    
                    @keyframes audioSpin {
                        from { transform: translate(-50%, -50%) rotate(0deg); }
                        to { transform: translate(-50%, -50%) rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    clearAudioOnlyDisplay() {
        if (this.videoPlayer) {
            // Remove audio-only styling
            this.videoPlayer.classList.remove('audio-only-stream');
            this.videoPlayer.style.background = '';
            this.videoPlayer.style.backgroundSize = '';
            this.videoPlayer.style.backgroundPosition = '';
            this.videoPlayer.style.backgroundRepeat = '';
        }
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

    // Search optimized for instant performance
    handleSearch() {
        if (!this.playlistData || !this.playlist) return;

        // If virtual mode is enabled, delegate to indexed search
        if (this.isVirtualMode && this.searchComponent) {
            this.virtualHandleSearch();
            return;
        }

        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        const selectedGroup = this.groupFilter?.value || '';
        const selectedType = this.typeFilter?.value || '';

        // Usar requestAnimationFrame para no bloquear la UI
        requestAnimationFrame(() => {
            let visibleCount = 0;
            const fragment = document.createDocumentFragment();

            // Limpiar playlist actual
            this.playlist.innerHTML = '';

            // Filtrar datos en memoria pero manteniendo índices originales
            const filteredData = [];
            this.playlistData.forEach((item, originalIndex) => {
                const title = item.title.toLowerCase();
                const group = (item.group || '').toLowerCase();
                const type = item.type.toLowerCase();

                const matchesSearch = !searchTerm ||
                    title.includes(searchTerm) ||
                    group.includes(searchTerm) ||
                    type.includes(searchTerm);

                const matchesGroup = !selectedGroup || group.includes(selectedGroup.toLowerCase());
                const matchesType = !selectedType || type.includes(selectedType.toLowerCase());
                
                // Apply advanced filters if they exist
                let matchesAdvanced = true;
                if (this.advancedFiltersState) {
                    const filters = this.advancedFiltersState;
                    
                    // Quality filters (check title and URL for quality indicators)
                    if (filters.hd || filters.fhd || filters.fourK) {
                        const qualityText = (title + ' ' + item.url).toLowerCase();
                        let matchesQuality = false;
                        
                        if (filters.hd && (qualityText.includes('hd') || qualityText.includes('720'))) {
                            matchesQuality = true;
                        }
                        if (filters.fhd && (qualityText.includes('fhd') || qualityText.includes('1080'))) {
                            matchesQuality = true;
                        }
                        if (filters.fourK && (qualityText.includes('4k') || qualityText.includes('2160'))) {
                            matchesQuality = true;
                        }
                        
                        if (!matchesQuality) matchesAdvanced = false;
                    }
                    
                    // Language filter (check title and group for language indicators)
                    if (filters.language) {
                        const languageText = (title + ' ' + group).toLowerCase();
                        const langMap = {
                            'en': ['english', 'en', 'usa', 'uk', 'america'],
                            'es': ['spanish', 'español', 'es', 'spain', 'mexico'],
                            'fr': ['french', 'français', 'france', 'fr'],
                            'de': ['german', 'deutsch', 'germany', 'de'],
                            'it': ['italian', 'italiano', 'italy', 'it']
                        };
                        
                        const langIndicators = langMap[filters.language] || [filters.language];
                        const hasLanguage = langIndicators.some(indicator => 
                            languageText.includes(indicator)
                        );
                        
                        if (!hasLanguage) matchesAdvanced = false;
                    }
                    
                    // Country filter (similar to language but more specific)
                    if (filters.country) {
                        const countryText = (title + ' ' + group).toLowerCase();
                        const countryMap = {
                            'US': ['usa', 'america', 'united states', 'us'],
                            'UK': ['uk', 'britain', 'england', 'united kingdom'],
                            'ES': ['spain', 'españa', 'spanish', 'es'],
                            'FR': ['france', 'french', 'français', 'fr'],
                            'DE': ['germany', 'german', 'deutsch', 'de']
                        };
                        
                        const countryIndicators = countryMap[filters.country] || [filters.country.toLowerCase()];
                        const hasCountry = countryIndicators.some(indicator => 
                            countryText.includes(indicator)
                        );
                        
                        if (!hasCountry) matchesAdvanced = false;
                    }
                }

                if (matchesSearch && matchesGroup && matchesType && matchesAdvanced) {
                    filteredData.push({ item, originalIndex });
                }
            });

            // Renderizar solo elementos visibles usando índice original
            filteredData.forEach(({ item, originalIndex }, displayIndex) => {
                const playlistItem = this.createPlaylistItem(item, originalIndex, displayIndex + 1);
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
    createPlaylistItem(item, originalIndex, displayNumber = null) {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        playlistItem.dataset.index = originalIndex; // Use original index for data lookup

        // Determinar tipo de stream
        const streamType = this.getStreamType(item.url);
        const streamTypeClassMap = {
            hls: 'hls',
            dash: 'dash',
            audio: 'audio',
            direct: 'direct',
            unknown: 'unknown'
        };
        const typeClass = streamTypeClassMap[(streamType || 'unknown').toLowerCase()] || 'unknown';

        const numberToShow = displayNumber !== null ? displayNumber : originalIndex + 1;

        const itemNumber = document.createElement('div');
        itemNumber.className = 'playlist-item-number';
        itemNumber.textContent = String(numberToShow);

        const logoContainer = document.createElement('div');
        logoContainer.className = 'playlist-item-logo';
        const setLogoPlaceholder = () => {
            logoContainer.replaceChildren();
            const placeholder = document.createElement('div');
            placeholder.className = 'logo-placeholder';
            placeholder.textContent = '📺';
            logoContainer.appendChild(placeholder);
        };

        const rawLogo = typeof item.logo === 'string' ? item.logo.trim() : '';
        if (rawLogo && /^https?:\/\//i.test(rawLogo)) {
            const logoImg = document.createElement('img');
            logoImg.src = rawLogo;
            logoImg.alt = 'Logo';
            logoImg.referrerPolicy = 'no-referrer';
            logoImg.addEventListener('error', () => setLogoPlaceholder());
            logoContainer.appendChild(logoImg);
        } else {
            setLogoPlaceholder();
        }

        const content = document.createElement('div');
        content.className = 'playlist-item-content';

        const title = document.createElement('div');
        title.className = 'playlist-item-title';
        title.textContent = String(item.title || '');
        title.title = String(item.title || '');

        const meta = document.createElement('div');
        meta.className = 'playlist-item-meta';
        const streamTypeEl = document.createElement('span');
        streamTypeEl.classList.add('stream-type', typeClass);
        streamTypeEl.textContent = streamType;
        meta.appendChild(streamTypeEl);

        if (item.group && item.group !== 'Unknown') {
            const groupTag = document.createElement('span');
            groupTag.className = 'group-tag';
            groupTag.textContent = String(item.group);
            meta.appendChild(groupTag);
        }

        content.appendChild(title);
        content.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'playlist-item-actions';
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.title = 'Add to favorites';
        favoriteBtn.dataset.url = String(item.url || '');
        favoriteBtn.textContent = this.isFavoriteChannel(item.url) ? '⭐' : '☆';

        const testBtn = document.createElement('button');
        testBtn.className = 'test-stream-btn';
        testBtn.title = 'Probar stream';
        testBtn.textContent = '🔧';

        actions.appendChild(favoriteBtn);
        actions.appendChild(testBtn);

        playlistItem.appendChild(itemNumber);
        playlistItem.appendChild(logoContainer);
        playlistItem.appendChild(content);
        playlistItem.appendChild(actions);

        // Use the originalIndex parameter directly (no need to redeclare)
        
        // Event listeners optimizados
        playlistItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('test-stream-btn') && !e.target.classList.contains('favorite-btn')) {
                this.playItem(originalIndex);
            }
        });

        testBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.testStream(originalIndex);
        });

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(originalIndex);
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

        appLog('🧹 Filtros limpiados');
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

        appLog(`📂 ${groups.length} grupos encontrados`);
    }

    updateFilterCounts() {
        if (!this.playlistData) return;

        // Update group filter count
        const groupFilterCount = document.getElementById('groupFilterCount');
        if (groupFilterCount && this.groupFilter) {
            const selectedGroup = this.groupFilter.value;
            if (selectedGroup) {
                const count = this.playlistData.filter(item => 
                    (item.group || '').toLowerCase().includes(selectedGroup.toLowerCase())
                ).length;
                groupFilterCount.textContent = count;
                groupFilterCount.style.display = 'inline';
            } else {
                groupFilterCount.style.display = 'none';
            }
        }

        // Update type filter count
        const typeFilterCount = document.getElementById('typeFilterCount');
        if (typeFilterCount && this.typeFilter) {
            const selectedType = this.typeFilter.value;
            if (selectedType) {
                const count = this.playlistData.filter(item => 
                    item.type && item.type.toLowerCase().includes(selectedType.toLowerCase())
                ).length;
                typeFilterCount.textContent = count;
                typeFilterCount.style.display = 'inline';
            } else {
                typeFilterCount.style.display = 'none';
            }
        }
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

        appLog(`🔄 Lista ordenada ${this.sortAscending ? 'A-Z' : 'Z-A'}`);
    }

    refreshPlaylist() {
        appLog('🔄 Actualizando playlist...');
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

    // ===== DASHBOARD FUNCTIONALITY =====
    
    initializeDashboard() {
        // Initialize dashboard elements
        this.dashboardSection = document.getElementById('dashboardSection');
        this.totalChannelsCount = document.getElementById('totalChannelsCount');
        this.audioChannelsCount = document.getElementById('audioChannelsCount');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.favoritesCount = document.getElementById('favoritesCount');
        this.recentChannelsWidget = document.getElementById('recentChannelsWidget');
        this.favoritesWidget = document.getElementById('favoritesWidget');
        this.recentChannelsList = document.getElementById('recentChannelsList');
        this.favoritesList = document.getElementById('favoritesList');
        
        // Initialize recent channels and favorites from localStorage
        this.recentChannels = this.loadRecentChannels();
        this.favoriteChannels = this.loadFavoriteChannels();
        
        // Setup dashboard event listeners
        this.setupDashboardEventListeners();
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        appLog('📊 Dashboard initialized');
    }

    setupDashboardEventListeners() {
        // Recent button functionality
        const recentBtn = document.getElementById('recentBtn');
        if (recentBtn) {
            recentBtn.addEventListener('click', () => this.showRecentChannels());
        }
        
        // Update original button listeners to work with new tile structure
        const fileBtnTile = document.getElementById('fileBtn');
        const urlBtnTile = document.getElementById('urlBtn');
        const iptvOrgBtnTile = document.getElementById('iptvOrgBtn');
        
        // These should already be handled by the original setupEventListeners
        // but we ensure they work with the new tile design
    }

    updateDashboardStats() {
        if (!this.playlistData) {
            return;
        }

        const totalChannels = this.playlistData.length;
        const audioChannels = this.playlistData.filter(item => 
            item.title.toLowerCase().includes('radio') || 
            item.group.toLowerCase().includes('radio') ||
            item.url.includes('audio')
        ).length;
        
        // Calculate HD channels (premium feature)
        const hdChannels = this.playlistData.filter(item => 
            item.title?.toLowerCase().includes('hd') || 
            item.title?.match(/\b(720p|1080p|4k|uhd)\b/i)
        ).length;

        if (this.totalChannelsCount) {
            this.totalChannelsCount.textContent = totalChannels.toLocaleString();
            // Add elegant animation for large numbers
            if (totalChannels > 100) {
                this.totalChannelsCount.style.animation = 'elegantGlow 2s ease-in-out infinite';
            }
        }
        
        if (this.audioChannelsCount) {
            this.audioChannelsCount.textContent = audioChannels.toLocaleString();
        }
        
        
        if (this.favoritesCount) {
            this.favoritesCount.textContent = this.favoriteChannels.length.toLocaleString();
        }
        
        // Update application watermark with channel count
        const watermark = document.getElementById('appWatermark');
        if (watermark && totalChannels > 0) {
            const watermarkText = watermark.querySelector('.watermark-text');
            if (watermarkText) {
                watermarkText.textContent = `M3U Player • ${totalChannels} channels`;
            }
        }
        
        // Update playlist stats in player section
        const playlistChannelCount = document.getElementById('playlistChannelCount');
        
        if (playlistChannelCount) {
            playlistChannelCount.textContent = totalChannels.toLocaleString();
        }

        // Show/hide widgets based on data availability
        this.updateWidgetVisibility();
    }

    updateWidgetVisibility() {
        if (this.recentChannels.length > 0 && this.recentChannelsWidget) {
            this.recentChannelsWidget.style.display = 'block';
            this.renderRecentChannels();
        }
        
        if (this.favoriteChannels.length > 0 && this.favoritesWidget) {
            this.favoritesWidget.style.display = 'block';
            this.renderFavoriteChannels();
        }
    }

    showRecentChannels() {
        if (this.recentChannels.length === 0) {
            alert('No recent channels found');
            return;
        }
        
        // Show recent channels widget if hidden
        if (this.recentChannelsWidget) {
            this.recentChannelsWidget.style.display = 'block';
            this.recentChannelsWidget.scrollIntoView({ behavior: 'smooth' });
        }
    }

    renderRecentChannels() {
        if (!this.recentChannelsList) return;
        
        this.recentChannelsList.innerHTML = '';
        
        this.recentChannels.slice(0, 6).forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'recent-channel-item';
            channelItem.innerHTML = `
                <div class="channel-avatar">${this.getChannelIcon(channel)}</div>
                <div class="channel-info">
                    <div class="channel-name">${this.escapeHtml(channel.title)}</div>
                    <div class="channel-meta">${this.escapeHtml(channel.group)} • ${this.formatLastPlayed(channel.lastPlayed)}</div>
                </div>
            `;
            
            channelItem.addEventListener('click', () => {
                const index = this.playlistData.findIndex(item => item.url === channel.url);
                if (index !== -1) {
                    this.playItem(index);
                }
            });
            
            this.recentChannelsList.appendChild(channelItem);
        });
    }

    renderFavoriteChannels() {
        if (!this.favoritesList) return;
        
        this.favoritesList.innerHTML = '';
        
        this.favoriteChannels.slice(0, 6).forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'favorite-channel-item';
            channelItem.innerHTML = `
                <div class="channel-avatar">${this.getChannelIcon(channel)}</div>
                <div class="channel-info">
                    <div class="channel-name">${this.escapeHtml(channel.title)}</div>
                    <div class="channel-meta">${this.escapeHtml(channel.group)}</div>
                </div>
                <div class="channel-actions">
                    <button class="play-favorite-btn" title="Play channel">▶️</button>
                    <button class="remove-favorite-btn" title="Remove from favorites">🗑️</button>
                </div>
            `;
            
            // Play favorite channel
            const playBtn = channelItem.querySelector('.play-favorite-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playFavoriteChannel(channel);
            });
            
            // Remove from favorites
            const removeBtn = channelItem.querySelector('.remove-favorite-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFavoriteChannel(channel.url);
            });
            
            // Click on item also plays the channel
            channelItem.addEventListener('click', () => {
                this.playFavoriteChannel(channel);
            });
            
            this.favoritesList.appendChild(channelItem);
        });
    }

    getChannelIcon(channel) {
        // Return appropriate icon based on channel type/group
        if (channel.group.toLowerCase().includes('sport')) return '⚽';
        if (channel.group.toLowerCase().includes('news')) return '📰';
        if (channel.group.toLowerCase().includes('movie')) return '🎬';
        if (channel.group.toLowerCase().includes('music') || channel.group.toLowerCase().includes('radio')) return '🎵';
        if (channel.group.toLowerCase().includes('kids')) return '🧸';
        return '📺';
    }

    playFavoriteChannel(channel) {
        appLog('🎬 Playing favorite channel:', channel.title);
        
        // First, try to find the channel in current playlist
        if (this.playlistData && this.playlistData.length > 0) {
            const index = this.playlistData.findIndex(item => item.url === channel.url);
            if (index !== -1) {
                // Channel found in current playlist, play it
                this.playItem(index);
                return;
            }
        }
        
        // If not found in current playlist, create temporary playlist with this channel
        this.playlistData = [{
            title: channel.title,
            url: channel.url,
            group: channel.group,
            logo: channel.logo || '',
            type: this.detectStreamType(channel.url)
        }];
        
        // Show player section
        this.showPlayerSection();
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Render the single-item playlist
        this.renderPlaylist();
        
        // Play the channel
        this.playItem(0);
        
        // Add to recent channels
        this.addToRecentChannels(channel);
        
        // Show feedback
        this.showBriefFeedback(`Playing: ${channel.title}`);
    }

    removeFavoriteChannel(url) {
        appLog('🗑️ Removing favorite channel with URL:', url);
        
        const initialLength = this.favoriteChannels.length;
        this.favoriteChannels = this.favoriteChannels.filter(channel => channel.url !== url);
        
        if (this.favoriteChannels.length < initialLength) {
            // Save updated favorites
            this.saveFavoriteChannels();
            
            // Re-render favorites list
            this.renderFavoriteChannels();
            
            // Update dashboard stats
            this.updateDashboardStats();
            
            // Show feedback
            this.showBriefFeedback('Removed from favorites');
            
            appLog('✅ Favorite channel removed successfully');
        } else {
            console.warn('⚠️ Channel not found in favorites');
        }
    }

    formatLastPlayed(timestamp) {
        if (!timestamp) return 'Never';
        
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    addToRecentChannels(item) {
        const channel = {
            title: item.title,
            url: item.url,
            group: item.group || 'Unknown',
            lastPlayed: Date.now()
        };
        
        // Remove if already exists
        this.recentChannels = this.recentChannels.filter(ch => ch.url !== channel.url);
        
        // Add to beginning
        this.recentChannels.unshift(channel);
        
        // Keep only last 10
        this.recentChannels = this.recentChannels.slice(0, 10);
        
        // Save to localStorage
        this.saveRecentChannels();
        
        // Update dashboard
        this.updateDashboardStats();
    }

    loadRecentChannels() {
        try {
            const stored = localStorage.getItem('m3u_recent_channels');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Error loading recent channels:', error);
            return [];
        }
    }

    saveRecentChannels() {
        try {
            localStorage.setItem('m3u_recent_channels', JSON.stringify(this.recentChannels));
        } catch (error) {
            console.warn('Error saving recent channels:', error);
        }
    }

    loadFavoriteChannels() {
        try {
            const stored = localStorage.getItem('m3u_favorite_channels');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Error loading favorite channels:', error);
            return [];
        }
    }

    saveFavoriteChannels() {
        try {
            localStorage.setItem('m3u_favorite_channels', JSON.stringify(this.favoriteChannels));
        } catch (error) {
            console.warn('Error saving favorite channels:', error);
        }
    }

    isFavoriteChannel(url) {
        return this.favoriteChannels.some(channel => channel.url === url);
    }

    toggleFavorite(index) {
        if (index < 0 || index >= this.playlistData.length) return;
        
        const item = this.playlistData[index];
        const isCurrentlyFavorite = this.isFavoriteChannel(item.url);
        
        if (isCurrentlyFavorite) {
            // Remove from favorites
            this.favoriteChannels = this.favoriteChannels.filter(channel => channel.url !== item.url);
            appLog(`💔 Removed from favorites: ${item.title}`);
        } else {
            // Add to favorites
            const favoriteChannel = {
                title: item.title,
                url: item.url,
                group: item.group || 'Unknown',
                logo: item.logo || '',
                addedAt: Date.now()
            };
            this.favoriteChannels.push(favoriteChannel);
            appLog(`⭐ Added to favorites: ${item.title}`);
        }
        
        // Save to localStorage
        this.saveFavoriteChannels();
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Update the playlist item button
        this.updateFavoriteButton(index, !isCurrentlyFavorite);
        
        // Show brief feedback
        this.showBriefFeedback(isCurrentlyFavorite ? 'Removed from favorites' : 'Added to favorites');
    }

    updateFavoriteButton(index, isFavorite) {
        const playlistItems = document.querySelectorAll('.playlist-item');
        playlistItems.forEach(item => {
            const itemIndex = parseInt(item.dataset.index);
            if (itemIndex === index) {
                const favoriteBtn = item.querySelector('.favorite-btn');
                if (favoriteBtn) {
                    favoriteBtn.textContent = isFavorite ? '⭐' : '☆';
                    favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
                }
            }
        });
    }

    showBriefFeedback(message) {
        // Create a temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'brief-feedback';
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(feedback);
        
        // Animate in
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        }, 10);
        
        // Animate out and remove
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }

    // ===== ENHANCED SEARCH FUNCTIONALITY =====
    
    initializeEnhancedSearch() {
        // Initialize search elements
        this.searchSuggestions = document.getElementById('searchSuggestions');
        this.suggestionsList = document.getElementById('suggestionsList');
        this.suggestionsCount = document.getElementById('suggestionsCount');
        this.voiceSearchBtn = document.getElementById('voiceSearchBtn');
        this.filtersBtn = document.getElementById('filtersBtn');
        this.advancedFilters = document.getElementById('advancedFilters');
        
        // Search state
        this.searchSuggestionIndex = -1;
        this.searchHistory = this.loadSearchHistory();
        
        // Setup enhanced search event listeners
        this.setupEnhancedSearchEventListeners();
        
        appLog('🔍 Enhanced search initialized');
    }

    setupEnhancedSearchEventListeners() {
        // Enhanced search input with suggestions
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleEnhancedSearch(e.target.value);
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });
            
            this.searchInput.addEventListener('focus', () => {
                if (this.searchInput.value) {
                    this.showSearchSuggestions();
                }
            });
            
            this.searchInput.addEventListener('blur', () => {
                // Delay hiding to allow click on suggestions
                setTimeout(() => this.hideSearchSuggestions(), 150);
            });
        }

        // Voice search button
        if (this.voiceSearchBtn) {
            this.voiceSearchBtn.addEventListener('click', () => this.startVoiceSearch());
        }

        // Advanced filters button
        if (this.filtersBtn) {
            this.filtersBtn.addEventListener('click', () => this.toggleAdvancedFilters());
        }

        // Advanced filters form
        const applyFiltersBtn = document.getElementById('applyFilters');
        const resetFiltersBtn = document.getElementById('resetFilters');
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyAdvancedFilters());
        }
        
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetAdvancedFilters());
        }

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-wrapper')) {
                this.hideSearchSuggestions();
            }
        });
    }

    handleEnhancedSearch(query) {
        // Clear existing timeout
        clearTimeout(this.searchTimeout);
        
        // Show suggestions for non-empty queries
        if (query.trim()) {
            this.generateSearchSuggestions(query);
            this.showSearchSuggestions();
        } else {
            this.hideSearchSuggestions();
        }
        
        // Debounced search
        this.searchTimeout = setTimeout(() => {
            this.handleSearch();
        }, 150);
    }

    generateSearchSuggestions(query) {
        if (!this.playlistData || !this.suggestionsList) return;
        
        const suggestions = [];
        const queryLower = query.toLowerCase();
        const maxSuggestions = 8;
        
        // Search in channel names
        const channelMatches = this.playlistData
            .filter(item => item.title.toLowerCase().includes(queryLower))
            .slice(0, 4)
            .map(item => ({
                text: item.title,
                type: 'channel',
                icon: '📺',
                item: item
            }));
        
        // Search in groups
        const groupMatches = [...new Set(this.playlistData
            .filter(item => item.group && item.group.toLowerCase().includes(queryLower))
            .map(item => item.group))]
            .slice(0, 3)
            .map(group => ({
                text: group,
                type: 'group',
                icon: '📂',
                group: group
            }));
        
        // Add search history matches
        const historyMatches = this.searchHistory
            .filter(term => term.toLowerCase().includes(queryLower))
            .slice(0, 2)
            .map(term => ({
                text: term,
                type: 'history',
                icon: '🕒',
                term: term
            }));
        
        suggestions.push(...channelMatches, ...groupMatches, ...historyMatches);
        
        // Render suggestions
        this.renderSearchSuggestions(suggestions.slice(0, maxSuggestions));
        
        // Update suggestions count
        if (this.suggestionsCount) {
            this.suggestionsCount.textContent = `${suggestions.length} results`;
        }
    }

    renderSearchSuggestions(suggestions) {
        if (!this.suggestionsList) return;
        
        this.suggestionsList.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <span class="suggestion-icon">${suggestion.icon}</span>
                <span class="suggestion-text">${this.escapeHtml(suggestion.text)}</span>
                <span class="suggestion-type">${suggestion.type}</span>
            `;
            
            suggestionItem.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });
            
            suggestionItem.addEventListener('mouseenter', () => {
                this.highlightSuggestion(index);
            });
            
            this.suggestionsList.appendChild(suggestionItem);
        });
        
        this.searchSuggestionIndex = -1;
    }

    selectSuggestion(suggestion) {
        if (suggestion.type === 'channel' && suggestion.item) {
            // Play the suggested channel directly
            const index = this.playlistData.findIndex(item => item.url === suggestion.item.url);
            if (index !== -1) {
                this.playItem(index);
            }
        } else {
            // Set search term and perform search
            this.searchInput.value = suggestion.text;
            this.addToSearchHistory(suggestion.text);
            this.handleSearch();
        }
        
        this.hideSearchSuggestions();
    }

    handleSearchKeydown(e) {
        if (!this.searchSuggestions || this.searchSuggestions.style.display === 'none') {
            return;
        }
        
        const suggestions = this.suggestionsList.querySelectorAll('.suggestion-item');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.searchSuggestionIndex = Math.min(this.searchSuggestionIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(this.searchSuggestionIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.searchSuggestionIndex = Math.max(this.searchSuggestionIndex - 1, -1);
                if (this.searchSuggestionIndex === -1) {
                    this.clearSuggestionHighlight();
                } else {
                    this.highlightSuggestion(this.searchSuggestionIndex);
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.searchSuggestionIndex >= 0 && suggestions[this.searchSuggestionIndex]) {
                    suggestions[this.searchSuggestionIndex].click();
                } else {
                    this.addToSearchHistory(this.searchInput.value);
                    this.handleSearch();
                    this.hideSearchSuggestions();
                }
                break;
                
            case 'Escape':
                this.hideSearchSuggestions();
                this.searchInput.blur();
                break;
        }
    }

    highlightSuggestion(index) {
        this.clearSuggestionHighlight();
        const suggestions = this.suggestionsList.querySelectorAll('.suggestion-item');
        if (suggestions[index]) {
            suggestions[index].classList.add('selected');
        }
    }

    clearSuggestionHighlight() {
        const suggestions = this.suggestionsList.querySelectorAll('.suggestion-item');
        suggestions.forEach(item => item.classList.remove('selected'));
    }

    showSearchSuggestions() {
        if (this.searchSuggestions) {
            this.searchSuggestions.style.display = 'block';
        }
    }

    hideSearchSuggestions() {
        if (this.searchSuggestions) {
            this.searchSuggestions.style.display = 'none';
        }
        this.searchSuggestionIndex = -1;
    }

    startVoiceSearch() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice search is not supported in this browser');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            this.voiceSearchBtn.style.color = '#ef4444';
            this.voiceSearchBtn.title = 'Listening...';
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.searchInput.value = transcript;
            this.addToSearchHistory(transcript);
            this.handleEnhancedSearch(transcript);
        };
        
        recognition.onerror = (event) => {
            console.error('Voice search error:', event.error);
            alert('Voice search error: ' + event.error);
        };
        
        recognition.onend = () => {
            this.voiceSearchBtn.style.color = '';
            this.voiceSearchBtn.title = 'Voice search';
        };
        
        recognition.start();
    }

    toggleAdvancedFilters() {
        if (!this.advancedFilters) return;
        
        const isVisible = this.advancedFilters.style.display !== 'none';
        this.advancedFilters.style.display = isVisible ? 'none' : 'block';
        
        // Update button state
        if (this.filtersBtn) {
            this.filtersBtn.classList.toggle('active', !isVisible);
        }
    }

    applyAdvancedFilters() {
        // Get filter values
        const hdFilter = document.getElementById('filterHD')?.checked;
        const fhdFilter = document.getElementById('filterFHD')?.checked;
        const fourKFilter = document.getElementById('filter4K')?.checked;
        const languageFilter = document.getElementById('languageFilter')?.value;
        const countryFilter = document.getElementById('countryFilter')?.value;
        
        // Store advanced filters in instance for use in search
        this.advancedFiltersState = {
            hd: hdFilter,
            fhd: fhdFilter,
            fourK: fourKFilter,
            language: languageFilter,
            country: countryFilter
        };
        
        appLog('Advanced filters applied:', this.advancedFiltersState);
        
        // Trigger search with current filters
        this.handleSearch();
        
        // Hide advanced filters
        this.toggleAdvancedFilters();
        
        // Show brief feedback
        const activeFilters = Object.values(this.advancedFiltersState).filter(v => v && v !== '').length;
        this.showBriefFeedback(`${activeFilters} advanced filters applied`);
    }

    resetAdvancedFilters() {
        // Reset all advanced filter controls
        document.getElementById('filterHD').checked = false;
        document.getElementById('filterFHD').checked = false;
        document.getElementById('filter4K').checked = false;
        
        if (document.getElementById('languageFilter')) {
            document.getElementById('languageFilter').value = '';
        }
        
        if (document.getElementById('countryFilter')) {
            document.getElementById('countryFilter').value = '';
        }
        
        // Clear advanced filters state
        this.advancedFiltersState = null;
        
        // Trigger search
        this.handleSearch();
        
        // Show feedback
        this.showBriefFeedback('Advanced filters cleared');
    }

    addToSearchHistory(term) {
        if (!term || term.trim().length < 2) return;
        
        const normalizedTerm = term.trim();
        
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(t => t !== normalizedTerm);
        
        // Add to beginning
        this.searchHistory.unshift(normalizedTerm);
        
        // Keep only last 20
        this.searchHistory = this.searchHistory.slice(0, 20);
        
        // Save to localStorage
        this.saveSearchHistory();
    }

    loadSearchHistory() {
        try {
            const stored = localStorage.getItem('m3u_search_history');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Error loading search history:', error);
            return [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('m3u_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Error saving search history:', error);
        }
    }

    // Override the original playItem to add to recent channels
    async playItem(index) {
        if (index < 0 || index >= this.playlistData.length) return;

        const item = this.playlistData[index];
        appLog(`🎬 Cargando: ${item.title}`);

        // Add to recent channels
        this.addToRecentChannels(item);

        // Clear any previous audio-only styling
        this.clearAudioOnlyDisplay();

        this.currentIndex = index;
        this.updateCurrentInfo(item);
        this.updatePlaylistSelection();
        
        // Update Now Playing widget
        this.updateNowPlayingWidget(item);

        try {
            await this.loadStream(item);
        } catch (error) {
            console.error('Error cargando stream:', error);
            this.handleStreamError(error);
        }
    }
}

// Función para forzar visibilidad de controles
function forceControlsVisibility() {
    appLog('🔧 Forzando visibilidad de controles...');

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
        appLog('✅ HLS.js cargado');
    } else {
        console.warn('⚠️ HLS.js no disponible - solo streams directos');
    }

    // Forzar visibilidad de controles
    forceControlsVisibility();

    // Inicializar el reproductor
    window.player = new M3UPlayer();
    // Initialize Diagnostics after player is available
    try{ window.Diagnostics && window.Diagnostics.init(window.player); }catch{}
    
    // Make debugging methods globally accessible
    window.testI18n = () => {
        appLog('🌐 Testing i18n system...');
        if (window.i18n && window.i18n.testTranslations) {
            window.i18n.testTranslations();
        }
        if (window.player && window.player.forceTranslationUpdate) {
            window.player.forceTranslationUpdate();
        }
    };
    
    window.testReturnToPlayer = () => {
        if (window.player && window.player.testReturnToPlayer) {
            window.player.testReturnToPlayer();
        } else {
            console.error('Player or testReturnToPlayer method not available');
        }
    };
    
    window.forceShowNowPlaying = () => {
        if (window.player && window.player.forceShowNowPlayingWidget) {
            window.player.forceShowNowPlayingWidget();
        } else {
            console.error('Player or forceShowNowPlayingWidget method not available');
        }
    };

    // Forzar visibilidad cada 2 segundos como medida de emergencia
    setInterval(forceControlsVisibility, 2000);

    // Update library counters (favorites and recents) if available
    try {
        if (window.api && window.api.library && typeof window.api.library.get === 'function') {
            window.api.library.get().then((state) => {
                const favCount = (state && state.favorites && Array.isArray(state.favorites.items)) ? state.favorites.items.length : 0;
                const recentCount = (state && Array.isArray(state.recents)) ? state.recents.length : 0;
                const elFav = document.querySelector('#favoritesCount');
                if (elFav) elFav.textContent = String(favCount);
                const elRecent = document.querySelector('#recentCount');
                if (elRecent) elRecent.textContent = String(recentCount);
            }).catch(() => {});
        }
    } catch {}

    setTimeout(() => {
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            appLog('✅ Controles encontrados y forzados a visible');
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

// Bandwidth monitoring methods for M3UPlayer class
M3UPlayer.prototype.startBandwidthMonitoring = function() {
    appLog('📊 Starting bandwidth monitoring...');
    this.bandwidthStats.monitoring = true;
    this.bandwidthStats.samples = [];
    this.bandwidthStats.peak = 0;
    this.bandwidthStats.average = 0;
    
    // Show bandwidth info panel
    if (this.bandwidthInfo) {
        this.bandwidthInfo.style.display = 'grid';
    }
    
    // Start monitoring interval
    this.bandwidthInterval = setInterval(() => {
        this.updateBandwidthDisplay();
    }, 2000);
};

M3UPlayer.prototype.stopBandwidthMonitoring = function() {
    appLog('📊 Stopping bandwidth monitoring...');
    this.bandwidthStats.monitoring = false;
    
    if (this.bandwidthInterval) {
        clearInterval(this.bandwidthInterval);
        this.bandwidthInterval = null;
    }
    
    // Hide bandwidth info panel
    if (this.bandwidthInfo) {
        this.bandwidthInfo.style.display = 'none';
    }
};

M3UPlayer.prototype.updateBandwidthStats = function(data) {
    if (!this.bandwidthStats.monitoring || !data.stats) return;
    
    const bytesLoaded = data.stats.total;
    const loadingTime = data.stats.loading.end - data.stats.loading.start;
    
    if (bytesLoaded && loadingTime > 0) {
        // Calculate bandwidth in Mbps
        const bandwidth = (bytesLoaded * 8) / (loadingTime * 1000000);
        
        // Add to samples
        this.bandwidthStats.samples.push(bandwidth);
        if (this.bandwidthStats.samples.length > this.bandwidthStats.maxSamples) {
            this.bandwidthStats.samples.shift();
        }
        
        // Update current
        this.bandwidthStats.current = bandwidth;
        
        // Update peak
        if (bandwidth > this.bandwidthStats.peak) {
            this.bandwidthStats.peak = bandwidth;
        }
        
        // Calculate average
        const sum = this.bandwidthStats.samples.reduce((a, b) => a + b, 0);
        this.bandwidthStats.average = sum / this.bandwidthStats.samples.length;
        
        appLog(`📊 Bandwidth: ${bandwidth.toFixed(2)} Mbps`);
    }
};

M3UPlayer.prototype.updateStreamQuality = function(data) {
    if (!this.streamQuality) return;
    
    const level = data.level;
    let quality = 'Unknown';
    let qualityClass = 'unknown';
    
    if (this.hls && this.hls.levels && this.hls.levels[level]) {
        const levelInfo = this.hls.levels[level];
        const bitrate = levelInfo.bitrate / 1000; // Convert to kbps
        
        if (bitrate >= 3000) {
            quality = 'Excellent';
            qualityClass = 'excellent';
        } else if (bitrate >= 1500) {
            quality = 'Good';
            qualityClass = 'good';
        } else if (bitrate >= 800) {
            quality = 'Fair';
            qualityClass = 'fair';
        } else {
            quality = 'Poor';
            qualityClass = 'poor';
        }
        
        this.streamQuality.textContent = `${quality} (${bitrate.toFixed(0)}k)`;
        this.streamQuality.setAttribute('data-quality', qualityClass);
    }
};

M3UPlayer.prototype.updateBandwidthDisplay = function() {
    if (!this.bandwidthStats.monitoring) return;
    
    // Update current bandwidth
    if (this.currentBandwidth) {
        const current = this.bandwidthStats.current;
        this.currentBandwidth.textContent = `${current.toFixed(2)} Mbps`;
        
        // Set status color
        let status = 'low';
        if (current >= 5) status = 'high';
        else if (current >= 2) status = 'medium';
        
        this.currentBandwidth.setAttribute('data-status', status);
    }
    
    // Update peak bandwidth
    if (this.peakBandwidth) {
        this.peakBandwidth.textContent = `${this.bandwidthStats.peak.toFixed(2)} Mbps`;
    }
    
    // Update average bandwidth
    if (this.averageBandwidth) {
        this.averageBandwidth.textContent = `${this.bandwidthStats.average.toFixed(2)} Mbps`;
    }
};

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rechazada:', e.reason);
});

// Debug function for testing Return to Player functionality
window.debugReturnToPlayer = function() {
    if (window.player) {
        window.player.testReturnToPlayer();
    } else {
        console.error('Player not available');
    }
};
