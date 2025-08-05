/**
 * EPG Renderer - Renderizador de interfaz EPG
 * Gestiona la visualización de la grilla EPG y la interacción del usuario
 */

class EPGRenderer {
    /**
     * @param {HTMLElement} container - Contenedor principal del EPG
     */
    constructor(container) {
        this.container = container;
        this.isVisible = false;
        this.currentTimeRange = null;
        this.currentDate = new Date();
        this.channels = [];
        this.virtualizedRows = new Map();
        this.scrollPosition = { x: 0, y: 0 };
        this.elements = null;
        this.searchUI = null;
        this.epgManager = null;
        
        // Configuración de virtualización
        this.config = {
            rowHeight: 60,
            timeSlotWidth: 120,
            visibleRows: 10,
            bufferRows: 5,
            timeSlotMinutes: 30
        };
        
        this.initializeDOM();
        this.setupEventListeners();
        this.initializeKeyboardNavigation();
        
        console.log('🎨 EPGRenderer inicializado');
    }

    /**
     * Inicializa la interfaz de búsqueda
     * @param {EPGManager} epgManager - Instancia del EPGManager
     */
    async initializeSearchUI(epgManager) {
        try {
            const { EPGSearchUI } = await import('./EPGSearchUI.js');
            this.epgManager = epgManager;
            this.searchUI = new EPGSearchUI(this.container, epgManager);
            
            // Configurar eventos de búsqueda
            this.setupSearchEventListeners();
            
            console.log('🔍 Interfaz de búsqueda EPG inicializada');
        } catch (error) {
            console.error('❌ Error inicializando interfaz de búsqueda:', error);
        }
    }

    /**
     * Configura event listeners específicos de búsqueda
     * @private
     */
    setupSearchEventListeners() {
        if (!this.container) return;

        // Eventos de búsqueda
        this.container.addEventListener('epg:watchProgram', (e) => {
            this.handleWatchProgram(e.detail);
        });

        this.container.addEventListener('epg:showProgramDetails', (e) => {
            this.handleShowProgramDetails(e.detail);
        });

        this.container.addEventListener('epg:setReminder', (e) => {
            this.handleSetReminder(e.detail);
        });
    }

    /**
     * Maneja solicitud de ver programa
     * @param {Object} detail - Detalles del evento
     * @private
     */
    handleWatchProgram(detail) {
        const { programId, channelId } = detail;
        
        // Emitir evento para el reproductor principal
        this.container.dispatchEvent(new CustomEvent('epg:changeChannel', {
            detail: { channelId, programId }
        }));
        
        // Cerrar EPG después de cambiar canal
        setTimeout(() => {
            this.hide();
        }, 500);
    }

    /**
     * Maneja solicitud de mostrar detalles
     * @param {Object} detail - Detalles del evento
     * @private
     */
    handleShowProgramDetails(detail) {
        const { programId, channelId } = detail;
        
        // Buscar el programa en los datos
        const channel = this.channels.find(ch => ch.id === channelId);
        if (channel && channel.programs) {
            const program = channel.programs.find(p => p.id === programId);
            if (program) {
                this.showProgramDetails(program);
            }
        }
    }

    /**
     * Maneja solicitud de recordatorio
     * @param {Object} detail - Detalles del evento
     * @private
     */
    handleSetReminder(detail) {
        const { programId, channelId } = detail;
        
        // Emitir evento para configurar recordatorio
        this.container.dispatchEvent(new CustomEvent('epg:configureReminder', {
            detail: { programId, channelId }
        }));
    }

    /**
     * Renderiza la grilla EPG con los canales y programas
     * @param {EPGChannel[]} channels - Lista de canales con programas
     * @param {Object} timeRange - Rango de tiempo {start, end}
     */
    renderGrid(channels, timeRange) {
        if (!channels || channels.length === 0) {
            this.showEmptyState();
            return;
        }

        this.channels = channels;
        this.currentTimeRange = timeRange;
        this.currentDate = new Date(timeRange.start);
        
        console.log(`🎨 Renderizando grilla EPG: ${channels.length} canales`);
        
        try {
            this.hideLoadingState();
            this.renderTimeline();
            this.renderChannelList();
            this.renderProgramGrid();
            this.updateCurrentTimeIndicator();
            this.updateStatusBar();
            
            // Actualizar filtros de búsqueda
            if (this.searchUI) {
                this.searchUI.updateFilters();
            }
            
            console.log('✅ Grilla EPG renderizada');
            
        } catch (error) {
            console.error('❌ Error renderizando grilla EPG:', error);
            this.showErrorState(error.message);
        }
    }

    /**
     * Muestra el modal EPG
     */
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.container.classList.add('show');
            this.isVisible = true;
            
            // Enfocar en el tiempo actual
            this.scrollToCurrentTime();
            
            console.log('📺 EPG mostrado');
        }
    }

    /**
     * Oculta el modal EPG
     */
    hide() {
        if (this.container) {
            this.container.classList.remove('show');
            setTimeout(() => {
                this.container.style.display = 'none';
            }, 300); // Esperar animación
            this.isVisible = false;
            
            console.log('📺 EPG ocultado');
        }
    }

    /**
     * Muestra detalles de un programa
     * @param {EPGProgram} program - Programa a mostrar
     */
    showProgramDetails(program) {
        if (!program) return;
        const modal = this.createProgramDetailsModal(program);
        document.body.appendChild(modal);

        // Acción: Ver ahora (cambiar canal)
        const watchBtn = modal.querySelector('.watch-now-btn');
        if (watchBtn) {
            watchBtn.addEventListener('click', () => {
                this.container.dispatchEvent(new CustomEvent('epg:changeChannel', {
                    detail: { channelId: program.channelId, programId: program.id }
                }));
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            });
        }

        // Acción: Recordatorio
        const reminderBtn = modal.querySelector('.reminder-btn');
        if (reminderBtn) {
            reminderBtn.addEventListener('click', () => {
                this.container.dispatchEvent(new CustomEvent('epg:setReminder', {
                    detail: { programId: program.id, channelId: program.channelId }
                }));
                reminderBtn.disabled = true;
                reminderBtn.textContent = 'Recordatorio añadido';
                setTimeout(() => {
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                }, 1000);
            });
        }

        // Mostrar modal con animación
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
        console.log(`📋 Mostrando detalles: ${program.title}`);
    }

    /**
     * Resalta el programa actual en la grilla
     * @param {string} channelId - ID del canal
     * @param {string} programId - ID del programa
     */
    highlightCurrentProgram(channelId, programId) {
        // Remover resaltado anterior
        const previousHighlight = this.container.querySelector('.program-current');
        if (previousHighlight) {
            previousHighlight.classList.remove('program-current');
        }
        
        // Resaltar nuevo programa
        const programElement = this.container.querySelector(
            `[data-channel-id="${channelId}"][data-program-id="${programId}"]`
        );
        
        if (programElement) {
            programElement.classList.add('program-current');
        }
    }

    /**
     * Desplaza la vista a un tiempo específico
     * @param {Date} timestamp - Tiempo al que desplazarse
     */
    scrollToTime(timestamp) {
        if (!this.currentTimeRange || !this.elements.gridContainer) return;
        
        const totalDuration = this.currentTimeRange.end - this.currentTimeRange.start;
        const targetOffset = timestamp - this.currentTimeRange.start;
        const scrollRatio = Math.max(0, Math.min(1, targetOffset / totalDuration));
        
        const maxScroll = this.elements.gridContainer.scrollWidth - this.elements.gridContainer.clientWidth;
        const targetScroll = maxScroll * scrollRatio;
        
        this.elements.gridContainer.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    /**
     * Actualiza el indicador de tiempo actual
     */
    updateCurrentTimeIndicator() {
        if (!this.currentTimeRange || !this.elements.grid) return;
        
        const now = new Date();
        const existingIndicator = this.elements.grid.querySelector('.current-time-indicator');
        
        // Remover indicador existente
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Calcular posición del indicador
        const { start, end } = this.currentTimeRange;
        
        // Solo mostrar si el tiempo actual está en el rango visible
        if (now >= start && now <= end) {
            const totalDuration = end - start;
            const currentOffset = now - start;
            const totalWidth = Math.ceil((totalDuration / (1000 * 60)) / this.config.timeSlotMinutes) * this.config.timeSlotWidth;
            const position = (currentOffset / totalDuration) * totalWidth;
            
            const indicator = document.createElement('div');
            indicator.className = 'current-time-indicator';
            indicator.style.left = `${position}px`;
            
            this.elements.grid.appendChild(indicator);
        }
    }

    /**
     * Inicializa la estructura DOM del EPG
     * @private
     */
    initializeDOM() {
        // El DOM ya está creado en el HTML, solo necesitamos obtener referencias
        this.elements = {
            container: this.container.querySelector('.epg-container'),
            header: this.container.querySelector('.epg-header'),
            content: this.container.querySelector('.epg-content'),
            statusBar: this.container.querySelector('.epg-status-bar'),
            timeline: this.container.querySelector('.epg-timeline'),
            timelineContainer: this.container.querySelector('.epg-timeline-container'),
            channelsSidebar: this.container.querySelector('.epg-channels-sidebar'),
            gridContainer: this.container.querySelector('.epg-grid-container'),
            grid: this.container.querySelector('.epg-grid'),
            loading: this.container.querySelector('.epg-loading'),
            noData: this.container.querySelector('.epg-no-data'),
            searchInput: this.container.querySelector('#epgSearch'),
            clearSearchBtn: this.container.querySelector('#clearEpgSearchBtn'),
            todayBtn: this.container.querySelector('#epgTodayBtn'),
            tomorrowBtn: this.container.querySelector('#epgTomorrowBtn'),
            prevDayBtn: this.container.querySelector('#epgPrevDayBtn'),
            nextDayBtn: this.container.querySelector('#epgNextDayBtn'),
            refreshBtn: this.container.querySelector('#epgRefreshBtn'),
            settingsBtn: this.container.querySelector('#epgSettingsBtn'),
            closeBtn: this.container.querySelector('#closeEPG'),
            currentTime: this.container.querySelector('#epgCurrentTime'),
            currentDate: this.container.querySelector('#epgCurrentDate'),
            dataStatus: this.container.querySelector('#epgDataStatus'),
            lastUpdate: this.container.querySelector('#epgLastUpdate'),
            retryBtn: this.container.querySelector('#epgRetryBtn')
        };
        
        // Inicializar estado de la barra de estado
        this.updateStatusBar();
        
        console.log('🏗️ Referencias DOM del EPG obtenidas');
    }

    /**
     * Configura los event listeners
     * @private
     */
    setupEventListeners() {
        if (!this.container || !this.elements) return;
        
        // Botón cerrar
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Búsqueda
        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }
        
        // Limpiar búsqueda
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => {
                this.elements.searchInput.value = '';
                this.clearSearchHighlight();
            });
        }
        
        // Navegación temporal
        if (this.elements.todayBtn) {
            this.elements.todayBtn.addEventListener('click', () => {
                this.transitionToView('today');
                this.setActiveNavButton(this.elements.todayBtn);
            });
        }
        
        if (this.elements.tomorrowBtn) {
            this.elements.tomorrowBtn.addEventListener('click', () => {
                this.transitionToView('tomorrow');
                this.setActiveNavButton(this.elements.tomorrowBtn);
            });
        }
        
        if (this.elements.prevDayBtn) {
            this.elements.prevDayBtn.addEventListener('click', () => {
                this.navigatePreviousDay();
                this.updateTimeNavigation();
            });
        }
        
        if (this.elements.nextDayBtn) {
            this.elements.nextDayBtn.addEventListener('click', () => {
                this.navigateNextDay();
                this.updateTimeNavigation();
            });
        }
        
        // Botones de acción
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refreshEPGData());
        }
        
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.showEPGSettings());
        }
        
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.retryLoadData());
        }
        
        // Scroll sincronizado
        if (this.elements.gridContainer && this.elements.timeline) {
            this.elements.gridContainer.addEventListener('scroll', (e) => {
                this.syncTimelineScroll(e.target.scrollLeft);
                this.syncChannelScroll(e.target.scrollTop);
                this.scrollPosition.x = e.target.scrollLeft;
                this.scrollPosition.y = e.target.scrollTop;
                this.updateVisibleTimeRange();
            });
        }

        // Scroll de la línea de tiempo
        if (this.elements.timeline) {
            this.elements.timeline.addEventListener('scroll', (e) => {
                if (this.elements.gridContainer) {
                    this.elements.gridContainer.scrollLeft = e.target.scrollLeft;
                }
            });
        }

        // Scroll de canales
        if (this.elements.channelsSidebar) {
            this.elements.channelsSidebar.addEventListener('scroll', (e) => {
                if (this.elements.gridContainer) {
                    this.elements.gridContainer.scrollTop = e.target.scrollTop;
                }
            });
        }
        
        // Delegación de eventos para programas
        if (this.elements.grid) {
            this.elements.grid.addEventListener('click', (e) => {
                const programElement = e.target.closest('.program-item');
                if (programElement) {
                    this.handleProgramClick(programElement, e);
                }
            });
        }
        
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        console.log('🎮 Event listeners del EPG configurados');
    }

    /**
     * Renderiza la línea de tiempo
     * @private
     */
    renderTimeline() {
        const timeline = this.container.querySelector('.epg-timeline');
        if (!timeline || !this.currentTimeRange) return;
        
        const { start, end } = this.currentTimeRange;
        const totalMinutes = (end - start) / (1000 * 60);
        const timeSlots = Math.ceil(totalMinutes / this.config.timeSlotMinutes);
        
        let timelineHTML = '';
        
        for (let i = 0; i < timeSlots; i++) {
            const slotTime = new Date(start.getTime() + i * this.config.timeSlotMinutes * 60 * 1000);
            const timeString = slotTime.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            timelineHTML += `
                <div class="time-slot" style="width: ${this.config.timeSlotWidth}px;">
                    <span class="time-label">${timeString}</span>
                </div>
            `;
        }
        
        timeline.innerHTML = timelineHTML;
        timeline.style.width = `${timeSlots * this.config.timeSlotWidth}px`;
    }

    /**
     * Renderiza la lista de canales
     * @private
     */
    renderChannelList() {
        const channelsList = this.container.querySelector('.epg-channels');
        if (!channelsList) return;
        
        let channelsHTML = '';
        
        this.channels.forEach((channel, index) => {
            channelsHTML += `
                <div class="channel-item" style="height: ${this.config.rowHeight}px;" data-channel-id="${channel.id}">
                    <div class="channel-logo">
                        ${channel.logo ? 
                            `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'">` : 
                            '<div class="channel-placeholder">📺</div>'
                        }
                    </div>
                    <div class="channel-info">
                        <div class="channel-name">${this.escapeHtml(channel.name)}</div>
                        <div class="channel-group">${this.escapeHtml(channel.group || '')}</div>
                    </div>
                </div>
            `;
        });
        
        channelsList.innerHTML = channelsHTML;
        channelsList.style.height = `${this.channels.length * this.config.rowHeight}px`;
    }

    /**
     * Renderiza la grilla de programas
     * @private
     */
    renderProgramGrid() {
        const grid = this.container.querySelector('.epg-grid');
        if (!grid || !this.currentTimeRange) return;
        
        const { start, end } = this.currentTimeRange;
        const totalDuration = end - start;
        const totalWidth = Math.ceil((totalDuration / (1000 * 60)) / this.config.timeSlotMinutes) * this.config.timeSlotWidth;
        
        let gridHTML = '';
        
        this.channels.forEach((channel, channelIndex) => {
            const rowTop = channelIndex * this.config.rowHeight;
            
            gridHTML += `<div class="channel-row" style="top: ${rowTop}px; height: ${this.config.rowHeight}px;">`;
            
            if (channel.programs && channel.programs.length > 0) {
                channel.programs.forEach(program => {
                    const programStart = new Date(program.startTime);
                    const programEnd = new Date(program.endTime);
                    
                    // Calcular posición y ancho del programa
                    const startOffset = Math.max(0, programStart - start);
                    const endOffset = Math.min(totalDuration, programEnd - start);
                    const programDuration = endOffset - startOffset;
                    
                    if (programDuration > 0) {
                        const left = (startOffset / totalDuration) * totalWidth;
                        const width = (programDuration / totalDuration) * totalWidth;
                        
                        gridHTML += this.createProgramElement(program, left, width, channel.id);
                    }
                });
            } else {
                // Mostrar placeholder si no hay programas
                gridHTML += `
                    <div class="program-placeholder" style="left: 0; width: ${totalWidth}px;">
                        <span>Sin información de programación</span>
                    </div>
                `;
            }
            
            gridHTML += '</div>';
        });
        
        grid.innerHTML = gridHTML;
        grid.style.width = `${totalWidth}px`;
        grid.style.height = `${this.channels.length * this.config.rowHeight}px`;
    }

    /**
     * Crea un elemento de programa
     * @param {EPGProgram} program - Programa
     * @param {number} left - Posición izquierda
     * @param {number} width - Ancho
     * @param {string} channelId - ID del canal
     * @returns {string} HTML del programa
     * @private
     */
    createProgramElement(program, left, width, channelId) {
        const now = new Date();
        const isCurrentProgram = program.startTime <= now && program.endTime > now;
        const isPastProgram = program.endTime < now;
        
        const classes = [
            'program-item',
            isCurrentProgram ? 'program-current' : '',
            isPastProgram ? 'program-past' : '',
            program.genre && program.genre.length > 0 ? `genre-${program.genre[0].toLowerCase()}` : ''
        ].filter(Boolean).join(' ');
        
        const timeString = `${this.formatTime(program.startTime)} - ${this.formatTime(program.endTime)}`;
        
        // Barra de progreso para el programa actual
        let progressBar = '';
        if (isCurrentProgram) {
            const total = program.endTime - program.startTime;
            const elapsed = now - program.startTime;
            const percent = Math.max(0, Math.min(100, (elapsed / total) * 100));
            progressBar = `
                <div class="program-progress">
                    <div class="progress-bar-epg">
                        <div class="progress-fill-epg" style="width: ${percent}%;"></div>
                    </div>
                </div>
            `;
        }
        return `
            <div class="${classes}" 
                 style="left: ${left}px; width: ${Math.max(width, 80)}px;"
                 data-program-id="${program.id}"
                 data-channel-id="${channelId}"
                 title="${this.escapeHtml(program.title)} (${timeString})">
                <div class="program-content">
                    <div class="program-title">${this.escapeHtml(program.title)}</div>
                    <div class="program-time">${timeString}</div>
                    ${program.genre && program.genre.length > 0 ? 
                        `<div class="program-genre">${this.escapeHtml(program.genre[0])}</div>` : 
                        ''
                    }
                    ${progressBar}
                </div>
                <div class="program-actions">
                    <button class="program-action-btn details-btn" title="Ver detalles">ℹ️</button>
                    ${!isPastProgram ? 
                        `<button class="program-action-btn reminder-btn" title="Recordatorio">⏰</button>` : 
                        ''
                    }
                </div>
            </div>
        `;
    }

    /**
     * Crea modal de detalles del programa
     * @param {EPGProgram} program - Programa
     * @returns {HTMLElement}
     * @private
     */
    createProgramDetailsModal(program) {
        const modal = document.createElement('div');
        modal.className = 'program-details-modal';
        
        const timeString = `${this.formatTime(program.startTime)} - ${this.formatTime(program.endTime)}`;
        const duration = Math.round((program.endTime - program.startTime) / (1000 * 60));
        
        modal.innerHTML = `
            <div class="program-details-content">
                <div class="program-details-header">
                    <h2>${this.escapeHtml(program.title)}</h2>
                    <button class="close-details-btn">&times;</button>
                </div>
                <div class="program-details-body">
                    <div class="program-meta">
                        <div class="meta-item">
                            <strong>Horario:</strong> ${timeString}
                        </div>
                        <div class="meta-item">
                            <strong>Duración:</strong> ${duration} minutos
                        </div>
                        ${program.genre && program.genre.length > 0 ? 
                            `<div class="meta-item">
                                <strong>Género:</strong> ${program.genre.join(', ')}
                            </div>` : ''
                        }
                        ${program.rating ? 
                            `<div class="meta-item">
                                <strong>Clasificación:</strong> ${program.rating}
                            </div>` : ''
                        }
                    </div>
                    ${program.description ? 
                        `<div class="program-description">
                            <h3>Descripción</h3>
                            <p>${this.escapeHtml(program.description)}</p>
                        </div>` : ''
                    }
                    ${program.episode ? 
                        `<div class="program-episode">
                            <h3>Información del episodio</h3>
                            <p>Temporada ${program.episode.season}, Episodio ${program.episode.episode}</p>
                            ${program.episode.title ? 
                                `<p><strong>${this.escapeHtml(program.episode.title)}</strong></p>` : ''
                            }
                        </div>` : ''
                    }
                    ${program.credits ? 
                        `<div class="program-credits">
                            <h3>Créditos</h3>
                            ${program.credits.director ? 
                                `<p><strong>Director:</strong> ${program.credits.director.join(', ')}</p>` : ''
                            }
                            ${program.credits.actor ? 
                                `<p><strong>Actores:</strong> ${program.credits.actor.join(', ')}</p>` : ''
                            }
                        </div>` : ''
                    }
                </div>
                <div class="program-details-actions">
                    <button class="action-btn watch-now-btn">Ver ahora</button>
                    <button class="action-btn reminder-btn">Recordatorio</button>
                </div>
            </div>
        `;
        
        // Event listeners para el modal
        const closeBtn = modal.querySelector('.close-details-btn');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
        
        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
        
        return modal;
    }

    /**
     * Maneja la búsqueda de programas
     * @param {string} query - Término de búsqueda
     * @private
     */
    handleSearch(query) {
        if (!query || query.trim().length < 2) {
            this.clearSearchHighlight();
            return;
        }
        
        const searchTerm = query.toLowerCase().trim();
        const programElements = this.container.querySelectorAll('.program-item');
        
        let matchCount = 0;
        
        programElements.forEach(element => {
            const title = element.querySelector('.program-title')?.textContent?.toLowerCase() || '';
            const isMatch = title.includes(searchTerm);
            
            if (isMatch) {
                element.classList.add('search-match');
                matchCount++;
            } else {
                element.classList.remove('search-match');
            }
        });
        
        console.log(`🔍 Búsqueda "${query}": ${matchCount} resultados`);
    }

    /**
     * Limpia el resaltado de búsqueda
     * @private
     */
    clearSearchHighlight() {
        const matchElements = this.container.querySelectorAll('.search-match');
        matchElements.forEach(element => {
            element.classList.remove('search-match');
        });
    }

    /**
     * Navega al día de hoy
     * @private
     */
    navigateToToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.scrollToTime(today);
    }

    /**
     * Navega al día de mañana
     * @private
     */
    navigateToTomorrow() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        this.scrollToTime(tomorrow);
    }

    /**
     * Desplaza a la hora actual
     * @private
     */
    scrollToCurrentTime() {
        this.scrollToTime(new Date());
    }

    /**
     * Muestra estado vacío
     * @private
     */
    showEmptyState() {
        const content = this.container.querySelector('.epg-content');
        const empty = this.container.querySelector('.epg-empty');
        
        if (content) content.style.display = 'none';
        if (empty) empty.style.display = 'flex';
    }

    /**
     * Muestra estado de error
     * @param {string} message - Mensaje de error
     * @private
     */
    showErrorState(message) {
        const content = this.container.querySelector('.epg-content');
        const error = this.container.querySelector('.epg-error');
        const errorMessage = this.container.querySelector('.error-message');
        
        if (content) content.style.display = 'none';
        if (error) error.style.display = 'flex';
        if (errorMessage) errorMessage.textContent = message;
    }

    /**
     * Formatea una hora
     * @param {Date} date - Fecha a formatear
     * @returns {string}
     * @private
     */
    formatTime(date) {
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string}
     * @private
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Actualiza la barra de estado
     * @private
     */
    updateStatusBar() {
        if (!this.elements) return;
        
        const now = new Date();
        
        // Actualizar tiempo actual
        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = now.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Actualizar fecha actual
        if (this.elements.currentDate) {
            this.elements.currentDate.textContent = now.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long'
            });
        }
        
        // Actualizar estado de datos
        if (this.elements.dataStatus) {
            this.elements.dataStatus.className = 'status-indicator online';
        }
        
        // Actualizar última actualización
        if (this.elements.lastUpdate) {
            this.elements.lastUpdate.textContent = `Última actualización: ${now.toLocaleTimeString('es-ES')}`;
        }
    }

    /**
     * Establece el botón de navegación activo
     * @param {HTMLElement} activeButton - Botón activo
     * @private
     */
    setActiveNavButton(activeButton) {
        // Remover clase activa de todos los botones
        const navButtons = this.container.querySelectorAll('.epg-nav-btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Añadir clase activa al botón seleccionado
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    /**
     * Navega al día anterior
     * @private
     */
    navigatePreviousDay() {
        if (this.currentDate) {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.requestDataRefresh();
        }
    }

    /**
     * Navega al día siguiente
     * @private
     */
    navigateNextDay() {
        if (this.currentDate) {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.requestDataRefresh();
        }
    }

    /**
     * Actualiza los datos EPG
     * @private
     */
    refreshEPGData() {
        if (this.elements.dataStatus) {
            this.elements.dataStatus.className = 'status-indicator loading';
        }
        
        // Emitir evento para solicitar actualización
        this.container.dispatchEvent(new CustomEvent('epg:refresh'));
        
        console.log('🔄 Solicitando actualización de datos EPG');
    }

    /**
     * Muestra configuración EPG
     * @private
     */
    showEPGSettings() {
        // Emitir evento para mostrar configuración
        this.container.dispatchEvent(new CustomEvent('epg:showSettings'));
        
        console.log('⚙️ Mostrando configuración EPG');
    }

    /**
     * Reintenta cargar datos
     * @private
     */
    retryLoadData() {
        this.showLoadingState();
        
        // Emitir evento para reintentar carga
        this.container.dispatchEvent(new CustomEvent('epg:retry'));
        
        console.log('🔄 Reintentando carga de datos EPG');
    }

    /**
     * Solicita actualización de datos
     * @private
     */
    requestDataRefresh() {
        this.container.dispatchEvent(new CustomEvent('epg:dateChange', {
            detail: { date: this.currentDate }
        }));
    }

    /**
     * Maneja clic en programa
     * @param {HTMLElement} programElement - Elemento del programa
     * @param {Event} event - Evento de clic
     * @private
     */
    handleProgramClick(programElement, event) {
        const programId = programElement.dataset.programId;
        const channelId = programElement.dataset.channelId;
        
        // Si se hizo clic en un botón de acción, manejar específicamente
        if (event.target.classList.contains('details-btn')) {
            this.showProgramDetailsById(programId, channelId);
            return;
        }
        
        if (event.target.classList.contains('reminder-btn')) {
            this.setReminderForProgram(programId, channelId);
            return;
        }
        
        // Clic general en el programa - mostrar detalles
        this.showProgramDetailsById(programId, channelId);
    }

    /**
     * Muestra detalles de programa por ID
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @private
     */
    showProgramDetailsById(programId, channelId) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (!channel) return;
        
        const program = channel.programs?.find(prog => prog.id === programId);
        if (!program) return;
        
        this.showProgramDetails(program);
    }

    /**
     * Establece recordatorio para programa
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @private
     */
    setReminderForProgram(programId, channelId) {
        this.container.dispatchEvent(new CustomEvent('epg:setReminder', {
            detail: { programId, channelId }
        }));
        
        console.log(`⏰ Recordatorio establecido para programa ${programId}`);
    }

    /**
     * Muestra estado de carga
     */
    showLoadingState() {
        if (this.elements.content) this.elements.content.style.display = 'none';
        if (this.elements.noData) this.elements.noData.style.display = 'none';
        if (this.elements.loading) this.elements.loading.style.display = 'flex';
        
        if (this.elements.dataStatus) {
            this.elements.dataStatus.className = 'status-indicator loading';
        }
    }

    /**
     * Oculta estado de carga
     */
    hideLoadingState() {
        if (this.elements.loading) this.elements.loading.style.display = 'none';
        if (this.elements.content) this.elements.content.style.display = 'flex';
        
        if (this.elements.dataStatus) {
            this.elements.dataStatus.className = 'status-indicator online';
        }
    }

    /**
     * Renderiza la línea de tiempo
     * @private
     */
    renderTimeline() {
        if (!this.elements.timeline || !this.currentTimeRange) return;
        
        const { start, end } = this.currentTimeRange;
        const totalMinutes = (end - start) / (1000 * 60);
        const timeSlots = Math.ceil(totalMinutes / this.config.timeSlotMinutes);
        
        let timelineHTML = '';
        
        for (let i = 0; i < timeSlots; i++) {
            const slotTime = new Date(start.getTime() + i * this.config.timeSlotMinutes * 60 * 1000);
            const timeString = slotTime.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            timelineHTML += `
                <div class="time-slot" style="width: ${this.config.timeSlotWidth}px;">
                    <span class="time-label">${timeString}</span>
                </div>
            `;
        }
        
        this.elements.timeline.innerHTML = timelineHTML;
        this.elements.timeline.style.width = `${timeSlots * this.config.timeSlotWidth}px`;
    }

    /**
     * Renderiza la lista de canales
     * @private
     */
    renderChannelList() {
        if (!this.elements.channelsSidebar) return;
        
        let channelsHTML = '';
        
        this.channels.forEach((channel, index) => {
            channelsHTML += `
                <div class="channel-item" style="height: ${this.config.rowHeight}px;" data-channel-id="${channel.id}">
                    <div class="channel-logo">
                        ${channel.logo ? 
                            `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'">` : 
                            '<div class="channel-placeholder">📺</div>'
                        }
                    </div>
                    <div class="channel-info">
                        <div class="channel-name">${this.escapeHtml(channel.name)}</div>
                        <div class="channel-group">${this.escapeHtml(channel.group || '')}</div>
                    </div>
                </div>
            `;
        });
        
        this.elements.channelsSidebar.innerHTML = channelsHTML;
        this.elements.channelsSidebar.style.height = `${this.channels.length * this.config.rowHeight}px`;
    }

    /**
     * Renderiza la grilla de programas
     * @private
     */
    renderProgramGrid() {
        if (!this.elements.grid || !this.currentTimeRange) return;
        
        const { start, end } = this.currentTimeRange;
        const totalDuration = end - start;
        const totalWidth = Math.ceil((totalDuration / (1000 * 60)) / this.config.timeSlotMinutes) * this.config.timeSlotWidth;
        
        let gridHTML = '';
        
        this.channels.forEach((channel, channelIndex) => {
            const rowTop = channelIndex * this.config.rowHeight;
            
            gridHTML += `<div class="channel-row" style="top: ${rowTop}px; height: ${this.config.rowHeight}px;">`;
            
            if (channel.programs && channel.programs.length > 0) {
                channel.programs.forEach(program => {
                    const programStart = new Date(program.startTime);
                    const programEnd = new Date(program.endTime);
                    
                    // Calcular posición y ancho del programa
                    const startOffset = Math.max(0, programStart - start);
                    const endOffset = Math.min(totalDuration, programEnd - start);
                    const programDuration = endOffset - startOffset;
                    
                    if (programDuration > 0) {
                        const left = (startOffset / totalDuration) * totalWidth;
                        const width = (programDuration / totalDuration) * totalWidth;
                        
                        gridHTML += this.createProgramElement(program, left, width, channel.id);
                    }
                });
            } else {
                // Mostrar placeholder si no hay programas
                gridHTML += `
                    <div class="program-placeholder" style="left: 0; width: ${totalWidth}px;">
                        <span>Sin información de programación</span>
                    </div>
                `;
            }
            
            gridHTML += '</div>';
        });
        
        this.elements.grid.innerHTML = gridHTML;
        this.elements.grid.style.width = `${totalWidth}px`;
        this.elements.grid.style.height = `${this.channels.length * this.config.rowHeight}px`;
        
        // Añadir indicador de tiempo actual
        this.addCurrentTimeIndicator(totalWidth);
    }

    /**
     * Añade indicador de tiempo actual
     * @param {number} totalWidth - Ancho total de la grilla
     * @private
     */
    addCurrentTimeIndicator(totalWidth) {
        if (!this.currentTimeRange) return;
        
        const now = new Date();
        const { start, end } = this.currentTimeRange;
        
        // Verificar si el tiempo actual está en el rango visible
        if (now >= start && now <= end) {
            const totalDuration = end - start;
            const currentOffset = now - start;
            const position = (currentOffset / totalDuration) * totalWidth;
            
            const indicator = document.createElement('div');
            indicator.className = 'current-time-indicator';
            indicator.style.left = `${position}px`;
            
            this.elements.grid.appendChild(indicator);
        }
    }

    /**
     * Muestra estado vacío
     * @private
     */
    showEmptyState() {
        if (this.elements.content) this.elements.content.style.display = 'none';
        if (this.elements.loading) this.elements.loading.style.display = 'none';
        if (this.elements.noData) this.elements.noData.style.display = 'flex';
    }

    /**
     * Muestra estado de error
     * @param {string} message - Mensaje de error
     * @private
     */
    showErrorState(message) {
        if (this.elements.content) this.elements.content.style.display = 'none';
        if (this.elements.loading) this.elements.loading.style.display = 'none';
        if (this.elements.noData) this.elements.noData.style.display = 'flex';
        
        // Actualizar mensaje de error en el estado no-data
        const noDataMessage = this.elements.noData?.querySelector('p');
        if (noDataMessage) {
            noDataMessage.textContent = `Error: ${message}`;
        }
        
        if (this.elements.dataStatus) {
            this.elements.dataStatus.className = 'status-indicator offline';
        }
        
        console.error('❌ Estado de error mostrado:', message);
    }

    /**
     * Sincroniza el scroll de la línea de tiempo
     * @param {number} scrollLeft - Posición de scroll horizontal
     * @private
     */
    syncTimelineScroll(scrollLeft) {
        if (this.elements.timeline && this.elements.timeline.scrollLeft !== scrollLeft) {
            this.elements.timeline.scrollLeft = scrollLeft;
        }
    }

    /**
     * Sincroniza el scroll de canales
     * @param {number} scrollTop - Posición de scroll vertical
     * @private
     */
    syncChannelScroll(scrollTop) {
        if (this.elements.channelsSidebar && this.elements.channelsSidebar.scrollTop !== scrollTop) {
            this.elements.channelsSidebar.scrollTop = scrollTop;
        }
    }

    /**
     * Actualiza el rango de tiempo visible
     * @private
     */
    updateVisibleTimeRange() {
        if (!this.currentTimeRange || !this.elements.gridContainer) return;
        
        const container = this.elements.gridContainer;
        const scrollLeft = container.scrollLeft;
        const containerWidth = container.clientWidth;
        const totalWidth = container.scrollWidth;
        
        if (totalWidth === 0) return;
        
        const { start, end } = this.currentTimeRange;
        const totalDuration = end - start;
        
        // Calcular tiempo visible
        const startRatio = scrollLeft / totalWidth;
        const endRatio = (scrollLeft + containerWidth) / totalWidth;
        
        const visibleStart = new Date(start.getTime() + startRatio * totalDuration);
        const visibleEnd = new Date(start.getTime() + endRatio * totalDuration);
        
        // Emitir evento de cambio de rango visible
        this.container.dispatchEvent(new CustomEvent('epg:visibleRangeChange', {
            detail: { start: visibleStart, end: visibleEnd }
        }));
    }

    /**
     * Navega suavemente a un programa específico
     * @param {string} channelId - ID del canal
     * @param {string} programId - ID del programa
     */
    navigateToProgram(channelId, programId) {
        const programElement = this.elements.grid?.querySelector(
            `[data-channel-id="${channelId}"][data-program-id="${programId}"]`
        );
        
        if (!programElement) return;
        
        const rect = programElement.getBoundingClientRect();
        const containerRect = this.elements.gridContainer.getBoundingClientRect();
        
        // Calcular posición de scroll necesaria
        const scrollLeft = this.elements.gridContainer.scrollLeft + rect.left - containerRect.left - 50;
        const scrollTop = this.elements.gridContainer.scrollTop + rect.top - containerRect.top - 50;
        
        // Scroll suave al programa
        this.elements.gridContainer.scrollTo({
            left: Math.max(0, scrollLeft),
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
        });
        
        // Resaltar programa temporalmente
        this.highlightProgramTemporarily(programElement);
        
        console.log(`🎯 Navegando a programa: ${programId} en canal: ${channelId}`);
    }

    /**
     * Resalta un programa temporalmente
     * @param {HTMLElement} programElement - Elemento del programa
     * @private
     */
    highlightProgramTemporarily(programElement) {
        programElement.classList.add('program-highlighted');
        
        setTimeout(() => {
            programElement.classList.remove('program-highlighted');
        }, 3000);
    }

    /**
     * Actualiza indicadores visuales para el programa actual
     */
    updateCurrentProgramIndicators() {
        if (!this.channels || !this.currentTimeRange) return;
        
        const now = new Date();
        
        // Remover indicadores anteriores
        const previousIndicators = this.elements.grid?.querySelectorAll('.program-current');
        previousIndicators?.forEach(el => el.classList.remove('program-current'));
        
        // Encontrar y marcar programas actuales
        this.channels.forEach(channel => {
            if (!channel.programs) return;
            
            const currentProgram = channel.programs.find(program => 
                new Date(program.startTime) <= now && new Date(program.endTime) > now
            );
            
            if (currentProgram) {
                const programElement = this.elements.grid?.querySelector(
                    `[data-channel-id="${channel.id}"][data-program-id="${currentProgram.id}"]`
                );
                
                if (programElement) {
                    programElement.classList.add('program-current');
                }
            }
        });
    }

    /**
     * Implementa navegación por teclado
     * @param {KeyboardEvent} event - Evento de teclado
     */
    handleKeyboardNavigation(event) {
        if (!this.isVisible) return;
        
        const { key, ctrlKey, shiftKey } = event;
        
        switch (key) {
            case 'ArrowLeft':
                if (ctrlKey) {
                    this.navigatePreviousDay();
                } else {
                    this.scrollHorizontally(-100);
                }
                event.preventDefault();
                break;
                
            case 'ArrowRight':
                if (ctrlKey) {
                    this.navigateNextDay();
                } else {
                    this.scrollHorizontally(100);
                }
                event.preventDefault();
                break;
                
            case 'ArrowUp':
                this.scrollVertically(-this.config.rowHeight);
                event.preventDefault();
                break;
                
            case 'ArrowDown':
                this.scrollVertically(this.config.rowHeight);
                event.preventDefault();
                break;
                
            case 'Home':
                if (ctrlKey) {
                    this.scrollToCurrentTime();
                } else {
                    this.scrollToStart();
                }
                event.preventDefault();
                break;
                
            case 'End':
                this.scrollToEnd();
                event.preventDefault();
                break;
                
            case 'PageUp':
                this.scrollVertically(-this.config.rowHeight * 5);
                event.preventDefault();
                break;
                
            case 'PageDown':
                this.scrollVertically(this.config.rowHeight * 5);
                event.preventDefault();
                break;
        }
    }

    /**
     * Scroll horizontal
     * @param {number} delta - Cantidad de scroll
     * @private
     */
    scrollHorizontally(delta) {
        if (!this.elements.gridContainer) return;
        
        this.elements.gridContainer.scrollBy({
            left: delta,
            behavior: 'smooth'
        });
    }

    /**
     * Scroll vertical
     * @param {number} delta - Cantidad de scroll
     * @private
     */
    scrollVertically(delta) {
        if (!this.elements.gridContainer) return;
        
        this.elements.gridContainer.scrollBy({
            top: delta,
            behavior: 'smooth'
        });
    }

    /**
     * Scroll al inicio
     * @private
     */
    scrollToStart() {
        if (!this.elements.gridContainer) return;
        
        this.elements.gridContainer.scrollTo({
            left: 0,
            behavior: 'smooth'
        });
    }

    /**
     * Scroll al final
     * @private
     */
    scrollToEnd() {
        if (!this.elements.gridContainer) return;
        
        this.elements.gridContainer.scrollTo({
            left: this.elements.gridContainer.scrollWidth,
            behavior: 'smooth'
        });
    }

    /**
     * Implementa transiciones suaves entre vistas
     * @param {string} viewType - Tipo de vista ('today', 'tomorrow', etc.)
     */
    transitionToView(viewType) {
        // Añadir clase de transición
        if (this.elements.content) {
            this.elements.content.classList.add('epg-transitioning');
        }
        
        // Ejecutar transición después de un breve delay
        setTimeout(() => {
            switch (viewType) {
                case 'today':
                    this.navigateToToday();
                    break;
                case 'tomorrow':
                    this.navigateToTomorrow();
                    break;
                case 'now':
                    this.scrollToCurrentTime();
                    break;
            }
            
            // Remover clase de transición
            setTimeout(() => {
                if (this.elements.content) {
                    this.elements.content.classList.remove('epg-transitioning');
                }
            }, 300);
        }, 50);
    }

    /**
     * Actualiza la navegación temporal con indicadores visuales
     */
    updateTimeNavigation() {
        if (!this.currentDate) return;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const currentDay = new Date(this.currentDate);
        currentDay.setHours(0, 0, 0, 0);
        
        // Actualizar botones de navegación
        if (this.elements.todayBtn) {
            this.elements.todayBtn.classList.toggle('active', 
                currentDay.getTime() === today.getTime());
        }
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (this.elements.tomorrowBtn) {
            this.elements.tomorrowBtn.classList.toggle('active', 
                currentDay.getTime() === tomorrow.getTime());
        }
        
        // Habilitar/deshabilitar botones de navegación
        if (this.elements.prevDayBtn) {
            const minDate = new Date(today);
            minDate.setDate(minDate.getDate() - 7); // Máximo 7 días atrás
            this.elements.prevDayBtn.disabled = currentDay <= minDate;
        }
        
        if (this.elements.nextDayBtn) {
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + 7); // Máximo 7 días adelante
            this.elements.nextDayBtn.disabled = currentDay >= maxDate;
        }
    }

    /**
     * Inicializa la navegación por teclado
     * @private
     */
    initializeKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }

    /**
     * Destruye el renderer y limpia recursos
     */
    destroy() {
        this.channels = [];
        this.virtualizedRows.clear();
        this.isVisible = false;
        this.elements = null;
        
        console.log('🧹 EPGRenderer destruido');
    }
}

export { EPGRenderer };