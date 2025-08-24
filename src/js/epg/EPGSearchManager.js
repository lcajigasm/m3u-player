/**
 * EPG Search Manager - Sistema de búsqueda avanzada para EPG
 * Gestiona búsqueda en tiempo real, índices de búsqueda y filtros
 */

class EPGSearchManager {
    constructor() {
        this.searchIndex = new Map();
        this.searchResults = [];
        this.currentQuery = '';
        this.filters = {
            genre: null,
            channel: null,
            timeRange: null
        };
        this.debounceTimeout = null;
        this.debounceDelay = 300;
        
        console.log('🔍 EPGSearchManager inicializado');
    }

    /**
     * Normaliza texto para comparaciones: minúsculas y sin acentos/diacríticos
     * @param {string} text
     * @returns {string}
     * @private
     */
    normalizeText(text) {
        if (!text && text !== 0) return '';
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    /**
     * Construye el índice de búsqueda a partir de los canales y programas
     * @param {EPGChannel[]} channels - Lista de canales con programas
     */
    buildSearchIndex(channels) {
        console.log('🔍 Construyendo índice de búsqueda...');
        
        this.searchIndex.clear();
        let totalPrograms = 0;

        channels.forEach(channel => {
            if (!channel.programs || channel.programs.length === 0) return;

            channel.programs.forEach(program => {
                const searchData = this.createSearchData(program, channel);
                this.searchIndex.set(program.id, searchData);
                totalPrograms++;
            });
        });

        console.log(`✅ Índice de búsqueda construido: ${totalPrograms} programas indexados`);
    }

    /**
     * Crea datos de búsqueda para un programa
     * @param {EPGProgram} program - Programa
     * @param {EPGChannel} channel - Canal del programa
     * @returns {Object} Datos de búsqueda
     * @private
     */
    createSearchData(program, channel) {
        // Crear texto de búsqueda combinado
        const searchText = [
            program.title,
            program.description || '',
            program.genre ? program.genre.join(' ') : '',
            channel.name,
            channel.group || ''
        ].join(' ').toLowerCase();

        // Crear palabras clave para búsqueda rápida
        const keywords = this.extractKeywords(searchText);

        // Precalcular campos normalizados para comparaciones insensibles a acentos
        const normalizedTitle = this.normalizeText(program.title || '');
        const normalizedDescription = this.normalizeText(program.description || '');
        const normalizedGenreWords = (program.genre || []).map(g => this.normalizeText(g));
        const normalizedChannelName = this.normalizeText(channel.name || '');

        return {
            program,
            channel,
            searchText,
            keywords,
            titleWords: this.extractKeywords(program.title.toLowerCase()),
            descriptionWords: program.description ? 
                this.extractKeywords(program.description.toLowerCase()) : [],
            genreWords: program.genre ? 
                program.genre.map(g => g.toLowerCase()) : [],
            channelWords: this.extractKeywords(channel.name.toLowerCase()),
            // Versiones normalizadas (sin acentos)
            _normalized: {
                title: normalizedTitle,
                description: normalizedDescription,
                genreWords: normalizedGenreWords,
                channelName: normalizedChannelName,
                titleWords: this.extractKeywords(normalizedTitle),
                descriptionWords: this.extractKeywords(normalizedDescription),
                channelWords: this.extractKeywords(normalizedChannelName)
            }
        };
    }

    /**
     * Extract keywords from text
     * @param {string} text - Text to process
     * @returns {string[]} Array of keywords
     * @private
     */
    extractKeywords(text) {
        if (!text) return [];
        
        return text
            .toLowerCase()
            .replace(/[^\w\sáéíóúñü]/g, ' ') // Remove punctuation, keep accents
            .split(/\s+/)
            .filter(word => word.length > 2) // Filter very short words
            .filter(word => !this.isStopWord(word)); // Filter stop words
    }

    /**
     * Check if a word is a stop word
     * @param {string} word - Word to check
     * @returns {boolean}
     * @private
     */
    isStopWord(word) {
        const stopWords = [
            'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
            'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como',
            'pero', 'sus', 'fue', 'ser', 'han', 'más', 'muy', 'sin', 'sobre', 'todo', 'también',
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
        ];
        return stopWords.includes(word);
    }

    /**
     * Realiza búsqueda con debouncing
     * @param {string} query - Término de búsqueda
     * @param {Function} callback - Callback con resultados
     */
    searchWithDebounce(query, callback) {
        // Limpiar timeout anterior
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Configurar nuevo timeout
        this.debounceTimeout = setTimeout(() => {
            const results = this.search(query);
            callback(results);
        }, this.debounceDelay);
    }

    /**
     * Realiza búsqueda inmediata
     * @param {string} query - Término de búsqueda
     * @returns {Object[]} Resultados de búsqueda
     */
    search(query) {
        const trimmed = (query || '').trim();
        const hasActiveFilters = !!(this.filters.genre || this.filters.channel || this.filters.timeRange);
        if (!trimmed || trimmed.length < 2) {
            this.currentQuery = '';
            // Si no hay query pero hay filtros activos, devolver todo filtrado
            if (hasActiveFilters) {
                const allResults = [];
                for (const [programId, searchData] of this.searchIndex) {
                    // Score base 0; aún aplicamos bonus now/next para ordenar mejor
                    const score = this.calculateRelevanceScore(searchData, '', []);
                    allResults.push({ ...searchData, score, programId });
                }
                const filtered = this.applyFilters(allResults);
                // Ordenar por score descendente (bonus de now/next) y título
                filtered.sort((a, b) => b.score - a.score || a.program.title.localeCompare(b.program.title));
                this.searchResults = filtered;
                return this.searchResults;
            }

            this.searchResults = [];
            return this.searchResults;
        }

        const searchTerm = trimmed.toLowerCase();
        this.currentQuery = searchTerm;
        
        console.log(`🔍 Buscando: "${searchTerm}"`);
        
        const startTime = performance.now();
        const results = [];
        const searchWords = this.extractKeywords(searchTerm);

        // Buscar en el índice
        for (const [programId, searchData] of this.searchIndex) {
            const score = this.calculateRelevanceScore(searchData, searchTerm, searchWords);
            
            if (score > 0) {
                results.push({
                    ...searchData,
                    score,
                    programId
                });
            }
        }

        // Ordenar por relevancia
        results.sort((a, b) => b.score - a.score);

        // Aplicar filtros
        const filteredResults = this.applyFilters(results);

        const endTime = performance.now();
        console.log(`✅ Búsqueda completada: ${filteredResults.length} resultados en ${(endTime - startTime).toFixed(2)}ms`);

        this.searchResults = filteredResults;
        return this.searchResults;
    }

    /**
     * Convierte token de tiempo en un rango {start, end}
     * @param {string} token
     * @returns {{start: Date, end: Date}|null}
     * @private
     */
    _timeRangeFromToken(token) {
        if (!token) return null;
        const now = new Date();
        let start, end;
        switch (token) {
            case 'now':
                start = new Date(now.getTime() - 30 * 60 * 1000);
                end = new Date(now.getTime() + 30 * 60 * 1000);
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
     * Establece un filtro genérico (compatibilidad con tests)
     * @param {'genre'|'channel'|'timeRange'} type
     * @param {string|Object|null} value
     */
    setFilter(type, value) {
        if (type === 'genre') {
            this.setGenreFilter(value);
        } else if (type === 'channel') {
            this.setChannelFilter(value);
        } else if (type === 'timeRange') {
            // Permitir tokens de tiempo (e.g., 'today') además de objetos {start, end}
            const range = typeof value === 'string' ? this._timeRangeFromToken(value) : value;
            this.setTimeRangeFilter(range || null);
        }
    }

    /**
     * Calcula el score de relevancia para un programa
     * @param {Object} searchData - Datos de búsqueda del programa
     * @param {string} searchTerm - Término de búsqueda completo
     * @param {string[]} searchWords - Palabras de búsqueda
     * @returns {number} Score de relevancia (0-100)
     * @private
     */
    calculateRelevanceScore(searchData, searchTerm, searchWords) {
        let score = 0;

        // Normalizar término y palabras para comparaciones consistentes
        const normTerm = this.normalizeText(searchTerm);
        const normWords = searchWords.map(w => this.normalizeText(w));
        const norm = searchData._normalized || {
            title: this.normalizeText(searchData.program.title || ''),
            description: this.normalizeText(searchData.program.description || ''),
            genreWords: (searchData.program.genre || []).map(g => this.normalizeText(g)),
            channelName: this.normalizeText(searchData.channel?.name || ''),
            titleWords: this.extractKeywords(this.normalizeText(searchData.program.title || '')),
            descriptionWords: this.extractKeywords(this.normalizeText(searchData.program.description || '')),
            channelWords: this.extractKeywords(this.normalizeText(searchData.channel?.name || ''))
        };

        const hasQuery = !!normTerm && normTerm.length > 0;

        if (hasQuery) {
            // Coincidencia en título (peso alto)
            if (norm.title.includes(normTerm)) {
                score += 50;
            }

            // Coincidencia en descripción (peso medio)
            if (norm.description && norm.description.includes(normTerm)) {
                score += 30;
            }

            // Coincidencias por palabras individuales
            normWords.forEach(word => {
                // Título (peso alto)
                if (norm.titleWords.some(titleWord => titleWord.includes(word))) {
                    score += 20;
                }

                // Descripción (peso medio)
                if (norm.descriptionWords.some(descWord => descWord.includes(word))) {
                    score += 10;
                }

                // Género (peso medio)
                if (norm.genreWords.some(genreWord => genreWord.includes(word))) {
                    score += 15;
                }

                // Canal (peso bajo)
                if (norm.channelWords.some(channelWord => channelWord.includes(word))) {
                    score += 5;
                }
            });

            // Bonus por coincidencia al inicio del título
            if (norm.title.startsWith(normTerm)) {
                score += 25;
            }
        }

        // Bonus por programa actual o próximo
        const now = new Date();
        const programStart = new Date(searchData.program.startTime);
        const programEnd = new Date(searchData.program.endTime);
        
        if (programStart <= now && programEnd > now) {
            score += 10; // Programa actual
        } else if (programStart > now && programStart < new Date(now.getTime() + 2 * 60 * 60 * 1000)) {
            score += 10; // Próximo (siguiente ~2h)
        }

        return Math.min(score, 100); // Limitar a 100
    }

    /**
     * Aplica filtros a los resultados de búsqueda
     * @param {Object[]} results - Resultados sin filtrar
     * @returns {Object[]} Resultados filtrados
     * @private
     */
    applyFilters(results) {
        let filtered = results;

        // Filtro por género (coincidencia exacta, insensible a acentos/case)
        if (this.filters.genre) {
            const target = this.normalizeText(this.filters.genre);
            filtered = filtered.filter(result => 
                Array.isArray(result.program.genre) &&
                result.program.genre.some(g => this.normalizeText(g) === target)
            );
        }

        // Filtro por canal (coincidencia exacta por ID)
        if (this.filters.channel) {
            filtered = filtered.filter(result => result.channel.id === this.filters.channel);
        }

        // Filtro por rango de tiempo (intersección de intervalos)
        if (this.filters.timeRange && this.filters.timeRange.start && this.filters.timeRange.end) {
            const { start, end } = this.filters.timeRange;
            filtered = filtered.filter(result => {
                const programStart = new Date(result.program.startTime);
                const programEnd = new Date(result.program.endTime);
                // Hay intersección si el inicio del programa es antes del fin del filtro
                // y el fin del programa es después del inicio del filtro
                return programStart <= end && programEnd >= start;
            });
        }

        return filtered;
    }

    /**
     * Establece filtro por género
     * @param {string|null} genre - Género a filtrar (null para limpiar)
     */
    setGenreFilter(genre) {
        this.filters.genre = genre;
        console.log(`🔍 Filtro de género: ${genre || 'ninguno'}`);
    }

    /**
     * Establece filtro por canal
     * @param {string|null} channel - Canal a filtrar (null para limpiar)
     */
    setChannelFilter(channel) {
        this.filters.channel = channel;
        console.log(`🔍 Filtro de canal: ${channel || 'ninguno'}`);
    }

    /**
     * Establece filtro por rango de tiempo
     * @param {Object|null} timeRange - Rango {start, end} (null para limpiar)
     */
    setTimeRangeFilter(timeRange) {
        this.filters.timeRange = timeRange;
        console.log(`🔍 Filtro de tiempo: ${timeRange ? 
            `${timeRange.start.toLocaleString()} - ${timeRange.end.toLocaleString()}` : 
            'ninguno'}`);
    }

    /**
     * Limpia todos los filtros
     */
    clearFilters() {
    this.filters.genre = null;
    this.filters.channel = null;
    this.filters.timeRange = null;
    // Limpiar cachés/resultados relacionados
    this.searchResults = [];
        console.log('🔍 Filtros limpiados');
    }

    /**
     * Obtiene géneros únicos disponibles
     * @returns {string[]} Lista de géneros
     */
    getAvailableGenres() {
        const genres = new Set();
        
        for (const searchData of this.searchIndex.values()) {
            if (searchData.program.genre) {
                searchData.program.genre.forEach(genre => genres.add(genre));
            }
        }
        
        return Array.from(genres).sort();
    }

    /**
     * Obtiene canales únicos disponibles
     * @returns {Object[]} Lista de canales {id, name}
     */
    getAvailableChannels() {
        const channels = new Map();
        
        for (const searchData of this.searchIndex.values()) {
            const channel = searchData.channel;
            if (!channels.has(channel.id)) {
                channels.set(channel.id, {
                    id: channel.id,
                    name: channel.name,
                    group: channel.group
                });
            }
        }
        
        return Array.from(channels.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtiene sugerencias de búsqueda basadas en el texto parcial
     * @param {string} partialQuery - Consulta parcial
     * @param {number} maxSuggestions - Máximo número de sugerencias
     * @returns {string[]} Lista de sugerencias
     */
    getSuggestions(partialQuery, maxSuggestions = 5) {
        if (!partialQuery || partialQuery.length < 2) return [];

        const queryNorm = this.normalizeText(partialQuery);
        const starts = [];
        const includes = [];
        const seen = new Set(); // Evitar duplicados por título normalizado

        for (const { program, _normalized } of this.searchIndex.values()) {
            const title = program.title || '';
            const titleNorm = _normalized?.title ?? this.normalizeText(title);

            if (!titleNorm.includes(queryNorm)) continue;

            const key = titleNorm;
            if (seen.has(key)) continue;
            seen.add(key);

            if (titleNorm.startsWith(queryNorm)) {
                starts.push(title);
            } else {
                includes.push(title);
            }
        }

        // Ordenar alfabéticamente dentro de cada grupo
        starts.sort((a, b) => a.localeCompare(b));
        includes.sort((a, b) => a.localeCompare(b));

        return [...starts, ...includes].slice(0, maxSuggestions);
    }

    /**
     * Get search statistics
     * @returns {Object} Statistics
     */
    getSearchStats() {
        const activeFilters = {};
        if (this.filters.genre !== null) activeFilters.genre = this.filters.genre;
        if (this.filters.channel !== null) activeFilters.channel = this.filters.channel;
        if (this.filters.timeRange !== null) activeFilters.timeRange = this.filters.timeRange;

        return {
            totalPrograms: this.searchIndex.size,
            currentQuery: this.currentQuery,
            resultCount: this.searchResults.length,
            activeFilters,
            availableGenres: this.getAvailableGenres().length,
            availableChannels: this.getAvailableChannels().length
        };
    }

    /**
     * Limpia el índice de búsqueda y resultados
     */
    clear() {
        this.searchIndex.clear();
        this.searchResults = [];
        this.currentQuery = '';
        this.clearFilters();
        
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = null;
        }
        
        console.log('🔍 EPGSearchManager limpiado');
    }

    /**
     * Destruye el manager y limpia recursos
     */
    destroy() {
        this.clear();
        console.log('🔍 EPGSearchManager destruido');
    }
}

export { EPGSearchManager };