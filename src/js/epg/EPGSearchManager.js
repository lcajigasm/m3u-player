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
            channelWords: this.extractKeywords(channel.name.toLowerCase())
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
        if (!query || query.trim().length < 2) {
            this.searchResults = [];
            this.currentQuery = '';
            return this.searchResults;
        }

        const searchTerm = query.toLowerCase().trim();
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
     * Calcula el score de relevancia para un programa
     * @param {Object} searchData - Datos de búsqueda del programa
     * @param {string} searchTerm - Término de búsqueda completo
     * @param {string[]} searchWords - Palabras de búsqueda
     * @returns {number} Score de relevancia (0-100)
     * @private
     */
    calculateRelevanceScore(searchData, searchTerm, searchWords) {
        let score = 0;

        // Coincidencia exacta en título (peso alto)
        if (searchData.program.title.toLowerCase().includes(searchTerm)) {
            score += 50;
        }

        // Coincidencia exacta en descripción (peso medio)
        if (searchData.program.description && 
            searchData.program.description.toLowerCase().includes(searchTerm)) {
            score += 30;
        }

        // Coincidencias por palabras individuales
        searchWords.forEach(word => {
            // Título (peso alto)
            if (searchData.titleWords.some(titleWord => titleWord.includes(word))) {
                score += 20;
            }

            // Descripción (peso medio)
            if (searchData.descriptionWords.some(descWord => descWord.includes(word))) {
                score += 10;
            }

            // Género (peso medio)
            if (searchData.genreWords.some(genreWord => genreWord.includes(word))) {
                score += 15;
            }

            // Canal (peso bajo)
            if (searchData.channelWords.some(channelWord => channelWord.includes(word))) {
                score += 5;
            }
        });

        // Bonus por coincidencia al inicio del título
        if (searchData.program.title.toLowerCase().startsWith(searchTerm)) {
            score += 25;
        }

        // Bonus por programa actual o próximo
        const now = new Date();
        const programStart = new Date(searchData.program.startTime);
        const programEnd = new Date(searchData.program.endTime);
        
        if (programStart <= now && programEnd > now) {
            score += 10; // Programa actual
        } else if (programStart > now && programStart < new Date(now.getTime() + 2 * 60 * 60 * 1000)) {
            score += 5; // Programa en las próximas 2 horas
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

        // Filtro por género
        if (this.filters.genre) {
            filtered = filtered.filter(result => 
                result.program.genre && 
                result.program.genre.some(g => 
                    g.toLowerCase().includes(this.filters.genre.toLowerCase())
                )
            );
        }

        // Filtro por canal
        if (this.filters.channel) {
            filtered = filtered.filter(result => 
                result.channel.id === this.filters.channel ||
                result.channel.name.toLowerCase().includes(this.filters.channel.toLowerCase())
            );
        }

        // Filtro por rango de tiempo
        if (this.filters.timeRange) {
            const { start, end } = this.filters.timeRange;
            filtered = filtered.filter(result => {
                const programStart = new Date(result.program.startTime);
                const programEnd = new Date(result.program.endTime);
                
                return (programStart >= start && programStart <= end) ||
                       (programEnd >= start && programEnd <= end) ||
                       (programStart <= start && programEnd >= end);
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
        this.filters = {
            genre: null,
            channel: null,
            timeRange: null
        };
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

        const query = partialQuery.toLowerCase();
        const suggestions = new Set();

        // Buscar en títulos de programas
        for (const searchData of this.searchIndex.values()) {
            const title = searchData.program.title.toLowerCase();
            
            if (title.includes(query) && suggestions.size < maxSuggestions * 2) {
                suggestions.add(searchData.program.title);
            }
        }

        return Array.from(suggestions)
            .sort((a, b) => {
                // Priorizar coincidencias al inicio
                const aStartsWith = a.toLowerCase().startsWith(query);
                const bStartsWith = b.toLowerCase().startsWith(query);
                
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;
                
                return a.localeCompare(b);
            })
            .slice(0, maxSuggestions);
    }

    /**
     * Get search statistics
     * @returns {Object} Statistics
     */
    getSearchStats() {
        return {
            totalPrograms: this.searchIndex.size,
            currentQuery: this.currentQuery,
            resultCount: this.searchResults.length,
            activeFilters: Object.entries(this.filters)
                .filter(([key, value]) => value !== null)
                .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {}),
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