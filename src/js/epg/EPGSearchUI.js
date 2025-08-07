/**
 * EPG Search UI - Interfaz de usuario para búsqueda EPG
 * Gestiona la interfaz de búsqueda, filtros y resultados
 */

class EPGSearchUI {
    constructor(container, epgManager) {
        this.container = container;
        this.epgManager = epgManager;
        this.isSearchMode = false;
        this.currentPage = 1;
        this.resultsPerPage = 20;
        this.currentResults = [];
        this.totalResults = 0;
        
        // Referencias a elementos DOM
        this.elements = {
            searchInput: container.querySelector('#epgSearch'),
            clearSearchBtn: container.querySelector('#clearEpgSearchBtn'),
            searchSuggestions: container.querySelector('#epgSearchSuggestions'),
            searchFilters: container.querySelector('#epgSearchFilters'),
            filtersBtn: container.querySelector('#epgFiltersBtn'),
            genreFilter: container.querySelector('#epgGenreFilter'),
            channelFilter: container.querySelector('#epgChannelFilter'),
            timeFilter: container.querySelector('#epgTimeFilter'),
            clearFiltersBtn: container.querySelector('#epgClearFilters'),
            searchResults: container.querySelector('#epgSearchResults'),
            searchResultsTitle: container.querySelector('#searchResultsTitle'),
            searchResultsCount: container.querySelector('#searchResultsCount'),
            backToGridBtn: container.querySelector('#backToGridBtn'),
            searchResultsList: container.querySelector('#searchResultsList'),
            searchPagination: container.querySelector('#searchPagination'),
            prevPageBtn: container.querySelector('#prevPageBtn'),
            nextPageBtn: container.querySelector('#nextPageBtn'),
            pageInfo: container.querySelector('#pageInfo'),
            gridContainer: container.querySelector('#epgGridContainer')
        };
        
        this.setupEventListeners();
        this.initializeFilters();
        
        // EPGSearchUI initialized
    }

    /**
     * Configura los event listeners
     * @private
     */
    setupEventListeners() {
        // Búsqueda con debouncing
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                if (query.length >= 2) {
                    this.showSuggestions(query);
                    this.performSearch(query);
                } else {
                    this.hideSuggestions();
                    this.exitSearchMode();
                }
            });

            // Navegación con teclado en sugerencias
            this.elements.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });

            // Enfocar/desenfocar
            this.elements.searchInput.addEventListener('focus', () => {
                const query = this.elements.searchInput.value.trim();
                if (query.length >= 2) {
                    this.showSuggestions(query);
                }
            });

            this.elements.searchInput.addEventListener('blur', () => {
                // Retrasar para permitir clics en sugerencias
                setTimeout(() => this.hideSuggestions(), 200);
            });
        }

        // Limpiar búsqueda
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Mostrar/ocultar filtros
        if (this.elements.filtersBtn) {
            this.elements.filtersBtn.addEventListener('click', () => {
                this.toggleFilters();
            });
        }

        // Filtros
        if (this.elements.genreFilter) {
            this.elements.genreFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (this.elements.channelFilter) {
            this.elements.channelFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (this.elements.timeFilter) {
            this.elements.timeFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Limpiar filtros
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Volver a la grilla
        if (this.elements.backToGridBtn) {
            this.elements.backToGridBtn.addEventListener('click', () => {
                this.exitSearchMode();
            });
        }

        // Paginación
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.addEventListener('click', () => {
                this.goToPreviousPage();
            });
        }

        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.addEventListener('click', () => {
                this.goToNextPage();
            });
        }

        // Delegación de eventos para resultados de búsqueda
        if (this.elements.searchResultsList) {
            this.elements.searchResultsList.addEventListener('click', (e) => {
                this.handleSearchResultClick(e);
            });
        }

        // Delegación de eventos para sugerencias
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.addEventListener('click', (e) => {
                this.handleSuggestionClick(e);
            });
        }
    }

    /**
     * Inicializa los filtros con datos disponibles
     * @private
     */
    initializeFilters() {
        // Inicializar géneros
        this.updateGenreFilter();
        
        // Inicializar canales
        this.updateChannelFilter();
    }

    /**
     * Actualiza el filtro de géneros
     * @private
     */
    updateGenreFilter() {
        if (!this.elements.genreFilter) return;

        const genres = this.epgManager.getAvailableGenres();
        const currentValue = this.elements.genreFilter.value;
        
        // Limpiar opciones existentes (excepto la primera)
        while (this.elements.genreFilter.children.length > 1) {
            this.elements.genreFilter.removeChild(this.elements.genreFilter.lastChild);
        }

        // Añadir géneros
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            this.elements.genreFilter.appendChild(option);
        });

        // Restaurar valor si existe
        if (currentValue && genres.includes(currentValue)) {
            this.elements.genreFilter.value = currentValue;
        }
    }

    /**
     * Actualiza el filtro de canales
     * @private
     */
    updateChannelFilter() {
        if (!this.elements.channelFilter) return;

        const channels = this.epgManager.getAvailableChannels();
        const currentValue = this.elements.channelFilter.value;
        
        // Limpiar opciones existentes (excepto la primera)
        while (this.elements.channelFilter.children.length > 1) {
            this.elements.channelFilter.removeChild(this.elements.channelFilter.lastChild);
        }

        // Añadir canales
        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            if (channel.group) {
                option.textContent += ` (${channel.group})`;
            }
            this.elements.channelFilter.appendChild(option);
        });

        // Restaurar valor si existe
        if (currentValue) {
            this.elements.channelFilter.value = currentValue;
        }
    }

    /**
     * Realiza búsqueda con debouncing
     * @param {string} query - Término de búsqueda
     * @private
     */
    performSearch(query) {
        this.epgManager.searchProgramsWithDebounce(query, (results) => {
            this.displaySearchResults(results, query);
        });
    }

    /**
     * Muestra sugerencias de búsqueda
     * @param {string} query - Consulta parcial
     * @private
     */
    showSuggestions(query) {
        if (!this.elements.searchSuggestions) return;

        const suggestions = this.epgManager.getSearchSuggestions(query, 5);
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        let suggestionsHTML = '';
        suggestions.forEach((suggestion, index) => {
            suggestionsHTML += `
                <div class="suggestion-item" data-suggestion="${this.escapeHtml(suggestion)}" data-index="${index}">
                    ${this.highlightMatch(suggestion, query)}
                </div>
            `;
        });

        this.elements.searchSuggestions.innerHTML = suggestionsHTML;
        this.elements.searchSuggestions.style.display = 'block';
    }

    /**
     * Oculta sugerencias de búsqueda
     * @private
     */
    hideSuggestions() {
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.style.display = 'none';
        }
    }

    /**
     * Maneja navegación con teclado en búsqueda
     * @param {KeyboardEvent} e - Evento de teclado
     * @private
     */
    handleSearchKeydown(e) {
        const suggestions = this.elements.searchSuggestions?.querySelectorAll('.suggestion-item');
        if (!suggestions || suggestions.length === 0) return;

        const currentActive = this.elements.searchSuggestions.querySelector('.suggestion-active');
        let activeIndex = currentActive ? parseInt(currentActive.dataset.index) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
                this.setActiveSuggestion(activeIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, -1);
                this.setActiveSuggestion(activeIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0) {
                    const suggestion = suggestions[activeIndex].dataset.suggestion;
                    this.selectSuggestion(suggestion);
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                this.elements.searchInput.blur();
                break;
        }
    }

    /**
     * Establece la sugerencia activa
     * @param {number} index - Índice de la sugerencia
     * @private
     */
    setActiveSuggestion(index) {
        const suggestions = this.elements.searchSuggestions?.querySelectorAll('.suggestion-item');
        if (!suggestions) return;

        // Remover clase activa de todas las sugerencias
        suggestions.forEach(item => item.classList.remove('suggestion-active'));

        // Añadir clase activa a la sugerencia seleccionada
        if (index >= 0 && index < suggestions.length) {
            suggestions[index].classList.add('suggestion-active');
        }
    }

    /**
     * Maneja clic en sugerencia
     * @param {Event} e - Evento de clic
     * @private
     */
    handleSuggestionClick(e) {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            const suggestion = suggestionItem.dataset.suggestion;
            this.selectSuggestion(suggestion);
        }
    }

    /**
     * Selecciona una sugerencia
     * @param {string} suggestion - Sugerencia seleccionada
     * @private
     */
    selectSuggestion(suggestion) {
        this.elements.searchInput.value = suggestion;
        this.hideSuggestions();
        this.performSearch(suggestion);
    }

    /**
     * Muestra/oculta filtros
     * @private
     */
    toggleFilters() {
        if (!this.elements.searchFilters) return;

        const isVisible = this.elements.searchFilters.style.display !== 'none';
        this.elements.searchFilters.style.display = isVisible ? 'none' : 'flex';
        
        // Actualizar botón
        if (this.elements.filtersBtn) {
            this.elements.filtersBtn.classList.toggle('active', !isVisible);
        }
    }

    /**
     * Aplica filtros a la búsqueda actual
     * @private
     */
    applyFilters() {
        const filters = {
            genre: this.elements.genreFilter?.value || null,
            channel: this.elements.channelFilter?.value || null,
            timeRange: this.getTimeRangeFromFilter()
        };

        // Aplicar filtros al manager
        this.epgManager.setSearchFilters(filters);

        // Reejecutar búsqueda si hay una consulta activa
        const currentQuery = this.elements.searchInput?.value.trim();
        if (currentQuery && currentQuery.length >= 2) {
            this.performSearch(currentQuery);
        }
    }

    /**
     * Obtiene rango de tiempo del filtro seleccionado
     * @returns {Object|null} Rango de tiempo {start, end}
     * @private
     */
    getTimeRangeFromFilter() {
        const timeFilter = this.elements.timeFilter?.value;
        if (!timeFilter) return null;

        const now = new Date();
        let start, end;

        switch (timeFilter) {
            case 'now':
                start = new Date(now.getTime() - 30 * 60 * 1000); // 30 min antes
                end = new Date(now.getTime() + 30 * 60 * 1000);   // 30 min después
                break;
                
            case 'today':
                start = new Date(now);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 1);
                break;
                
            case 'tomorrow':
                start = new Date(now);
                start.setDate(start.getDate() + 1);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 1);
                break;
                
            case 'next2h':
                start = now;
                end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                break;
                
            case 'next6h':
                start = now;
                end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
                break;
                
            default:
                return null;
        }

        return { start, end };
    }

    /**
     * Limpia todos los filtros
     * @private
     */
    clearFilters() {
        if (this.elements.genreFilter) {
            this.elements.genreFilter.value = '';
        }
        if (this.elements.channelFilter) {
            this.elements.channelFilter.value = '';
        }
        if (this.elements.timeFilter) {
            this.elements.timeFilter.value = '';
        }

        this.epgManager.clearSearchFilters();
        this.applyFilters();
    }

    /**
     * Muestra resultados de búsqueda
     * @param {Object[]} results - Resultados de búsqueda
     * @param {string} query - Consulta de búsqueda
     * @private
     */
    displaySearchResults(results, query) {
        if (!results || results.length === 0) {
            this.showNoResults(query);
            return;
        }

        this.currentResults = results;
        this.totalResults = results.length;
        this.currentPage = 1;
        
        this.enterSearchMode();
        this.updateSearchResultsHeader(query);
        this.renderSearchResults();
        this.updatePagination();
    }

    /**
     * Entra en modo de búsqueda
     * @private
     */
    enterSearchMode() {
        this.isSearchMode = true;
        
        if (this.elements.searchResults) {
            this.elements.searchResults.style.display = 'block';
        }
        if (this.elements.gridContainer) {
            this.elements.gridContainer.style.display = 'none';
        }
    }

    /**
     * Sale del modo de búsqueda
     * @private
     */
    exitSearchMode() {
        this.isSearchMode = false;
        
        if (this.elements.searchResults) {
            this.elements.searchResults.style.display = 'none';
        }
        if (this.elements.gridContainer) {
            this.elements.gridContainer.style.display = 'block';
        }
        
        this.clearSearch();
    }

    /**
     * Actualiza el encabezado de resultados de búsqueda
     * @param {string} query - Consulta de búsqueda
     * @private
     */
    updateSearchResultsHeader(query) {
        if (this.elements.searchResultsTitle) {
            this.elements.searchResultsTitle.textContent = `Resultados para "${query}"`;
        }
        
        if (this.elements.searchResultsCount) {
            const count = this.totalResults;
            this.elements.searchResultsCount.textContent = 
                `${count} resultado${count !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Renderiza los resultados de búsqueda
     * @private
     */
    renderSearchResults() {
        if (!this.elements.searchResultsList) return;

        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = Math.min(startIndex + this.resultsPerPage, this.totalResults);
        const pageResults = this.currentResults.slice(startIndex, endIndex);

        let resultsHTML = '';
        
        pageResults.forEach(result => {
            const program = result.program;
            const channel = result.channel;
            const score = result.score;
            
            const startTime = new Date(program.startTime);
            const endTime = new Date(program.endTime);
            const now = new Date();
            
            const isLive = startTime <= now && endTime > now;
            const isPast = endTime < now;
            const timeString = this.formatTimeRange(startTime, endTime);
            
            resultsHTML += `
                <div class="search-result-item ${isLive ? 'live' : ''} ${isPast ? 'past' : ''}" 
                     data-program-id="${program.id}" 
                     data-channel-id="${channel.id}"
                     data-score="${score}">
                    <div class="result-main">
                        <div class="result-header">
                            <h4 class="result-title">${this.highlightSearchTerms(program.title)}</h4>
                            <div class="result-meta">
                                <span class="result-channel">${this.escapeHtml(channel.name)}</span>
                                <span class="result-time">${timeString}</span>
                                ${isLive ? '<span class="live-indicator">● EN VIVO</span>' : ''}
                            </div>
                        </div>
                        ${program.description ? `
                            <div class="result-description">
                                ${this.highlightSearchTerms(this.truncateText(program.description, 150))}
                            </div>
                        ` : ''}
                        <div class="result-details">
                            ${program.genre && program.genre.length > 0 ? `
                                <span class="result-genre">${program.genre.join(', ')}</span>
                            ` : ''}
                            ${program.rating ? `
                                <span class="result-rating">${program.rating}</span>
                            ` : ''}
                            <span class="result-score" title="Relevancia">⭐ ${Math.round(score)}</span>
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="result-action-btn watch-btn" title="Ver ahora">
                            ${isLive ? '📺' : '⏰'} ${isLive ? 'Ver' : 'Ir a'}
                        </button>
                        <button class="result-action-btn details-btn" title="Ver detalles">ℹ️</button>
                        ${!isPast ? `
                            <button class="result-action-btn reminder-btn" title="Recordatorio">🔔</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        this.elements.searchResultsList.innerHTML = resultsHTML;
    }

    /**
     * Muestra mensaje de sin resultados
     * @param {string} query - Consulta de búsqueda
     * @private
     */
    showNoResults(query) {
        this.enterSearchMode();
        
        if (this.elements.searchResultsTitle) {
            this.elements.searchResultsTitle.textContent = `Sin resultados para "${query}"`;
        }
        
        if (this.elements.searchResultsCount) {
            this.elements.searchResultsCount.textContent = '0 resultados';
        }
        
        if (this.elements.searchResultsList) {
            this.elements.searchResultsList.innerHTML = `
                <div class="no-search-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>No se encontraron programas</h3>
                    <p>Intenta con otros términos de búsqueda o ajusta los filtros.</p>
                    <div class="search-suggestions-help">
                        <h4>Sugerencias:</h4>
                        <ul>
                            <li>Verifica la ortografía</li>
                            <li>Usa términos más generales</li>
                            <li>Prueba con nombres de géneros o canales</li>
                            <li>Limpia los filtros activos</li>
                        </ul>
                    </div>
                </div>
            `;
        }
        
        this.hidePagination();
    }

    /**
     * Actualiza la paginación
     * @private
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        
        if (totalPages <= 1) {
            this.hidePagination();
            return;
        }
        
        this.showPagination();
        
        if (this.elements.pageInfo) {
            this.elements.pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        }
        
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = this.currentPage <= 1;
        }
        
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = this.currentPage >= totalPages;
        }
    }

    /**
     * Muestra la paginación
     * @private
     */
    showPagination() {
        if (this.elements.searchPagination) {
            this.elements.searchPagination.style.display = 'flex';
        }
    }

    /**
     * Oculta la paginación
     * @private
     */
    hidePagination() {
        if (this.elements.searchPagination) {
            this.elements.searchPagination.style.display = 'none';
        }
    }

    /**
     * Va a la página anterior
     * @private
     */
    goToPreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderSearchResults();
            this.updatePagination();
            this.scrollToTop();
        }
    }

    /**
     * Va a la página siguiente
     * @private
     */
    goToNextPage() {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderSearchResults();
            this.updatePagination();
            this.scrollToTop();
        }
    }

    /**
     * Desplaza al inicio de los resultados
     * @private
     */
    scrollToTop() {
        if (this.elements.searchResultsList) {
            this.elements.searchResultsList.scrollTop = 0;
        }
    }

    /**
     * Maneja clic en resultado de búsqueda
     * @param {Event} e - Evento de clic
     * @private
     */
    handleSearchResultClick(e) {
        const resultItem = e.target.closest('.search-result-item');
        if (!resultItem) return;

        const programId = resultItem.dataset.programId;
        const channelId = resultItem.dataset.channelId;
        
        if (e.target.classList.contains('watch-btn')) {
            this.handleWatchProgram(programId, channelId);
        } else if (e.target.classList.contains('details-btn')) {
            this.handleShowProgramDetails(programId, channelId);
        } else if (e.target.classList.contains('reminder-btn')) {
            this.handleSetReminder(programId, channelId);
        }
    }

    /**
     * Maneja ver programa
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @private
     */
    handleWatchProgram(programId, channelId) {
        // Emitir evento para cambiar canal
        this.container.dispatchEvent(new CustomEvent('epg:watchProgram', {
            detail: { programId, channelId }
        }));
        
        console.log(`📺 Solicitud de ver programa: ${programId} en canal ${channelId}`);
    }

    /**
     * Maneja mostrar detalles del programa
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @private
     */
    handleShowProgramDetails(programId, channelId) {
        // Emitir evento para mostrar detalles
        this.container.dispatchEvent(new CustomEvent('epg:showProgramDetails', {
            detail: { programId, channelId }
        }));
        
        console.log(`ℹ️ Solicitud de detalles: ${programId}`);
    }

    /**
     * Maneja configurar recordatorio
     * @param {string} programId - ID del programa
     * @param {string} channelId - ID del canal
     * @private
     */
    handleSetReminder(programId, channelId) {
        // Emitir evento para configurar recordatorio
        this.container.dispatchEvent(new CustomEvent('epg:setReminder', {
            detail: { programId, channelId }
        }));
        
        console.log(`🔔 Solicitud de recordatorio: ${programId}`);
    }

    /**
     * Limpia la búsqueda
     * @private
     */
    clearSearch() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        
        this.hideSuggestions();
        this.currentResults = [];
        this.totalResults = 0;
        this.currentPage = 1;
        
        // Limpiar filtros del manager
        this.epgManager.clearSearchFilters();
    }

    /**
     * Resalta términos de búsqueda en el texto
     * @param {string} text - Texto original
     * @returns {string} Texto con términos resaltados
     * @private
     */
    highlightSearchTerms(text) {
        if (!text) return '';
        
        const query = this.elements.searchInput?.value.trim();
        if (!query || query.length < 2) return this.escapeHtml(text);
        
        return this.highlightMatch(text, query);
    }

    /**
     * Resalta coincidencias en el texto
     * @param {string} text - Texto original
     * @param {string} query - Término a resaltar
     * @returns {string} Texto con coincidencias resaltadas
     * @private
     */
    highlightMatch(text, query) {
        if (!text || !query) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);
        
        // Crear regex para coincidencias (insensible a mayúsculas)
        const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    /**
     * Trunca texto a una longitud específica
     * @param {string} text - Texto a truncar
     * @param {number} maxLength - Longitud máxima
     * @returns {string} Texto truncado
     * @private
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Formatea rango de tiempo
     * @param {Date} start - Hora de inicio
     * @param {Date} end - Hora de fin
     * @returns {string} Rango formateado
     * @private
     */
    formatTimeRange(start, end) {
        const formatTime = (date) => {
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        };

        const formatDate = (date) => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            if (date.toDateString() === today.toDateString()) {
                return 'Hoy';
            } else if (date.toDateString() === tomorrow.toDateString()) {
                return 'Mañana';
            } else {
                return date.toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'short' 
                });
            }
        };

        const startDate = formatDate(start);
        const timeRange = `${formatTime(start)} - ${formatTime(end)}`;
        
        return `${startDate} ${timeRange}`;
    }

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     * @private
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Actualiza los filtros cuando cambian los datos EPG
     */
    updateFilters() {
        this.updateGenreFilter();
        this.updateChannelFilter();
    }

    /**
     * Destruye la instancia y limpia recursos
     */
    destroy() {
        this.clearSearch();
        // EPGSearchUI destroyed
    }
}

export { EPGSearchUI };