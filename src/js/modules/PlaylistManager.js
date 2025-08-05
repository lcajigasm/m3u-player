/**
 * PlaylistManager - Gestor avanzado de listas de reproducción M3U
 * Maneja parsing, filtrado, búsqueda, y gestión de múltiples listas
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from '../core/EventBus.js';

class PlaylistManager {
    constructor(options = {}) {
        this.eventBus = getEventBus();
        
        // Estado de las listas
        this.playlists = new Map(); // Map<id, PlaylistData>
        this.activePlaylistId = null;
        this.currentIndex = -1;
        this.searchIndex = new Map(); // Para búsqueda rápida
        
        // Configuración
        this.config = {
            maxPlaylists: options.maxPlaylists || 10,
            cacheSize: options.cacheSize || 1000,
            enableSearch: options.enableSearch !== false,
            enableAutoRefresh: options.enableAutoRefresh || false,
            refreshInterval: options.refreshInterval || 30000, // 30s
            enableHistory: options.enableHistory !== false,
            historySize: options.historySize || 100,
            enableFavorites: options.enableFavorites !== false,
            enableStatistics: options.enableStatistics !== false
        };

        // Cache y optimizaciones
        this.parseCache = new Map();
        this.searchCache = new Map();
        this.searchWorker = null;

        // Historial y estadísticas
        this.playHistory = [];
        this.favorites = new Set();
        this.statistics = {
            totalPlayed: 0,
            mostPlayed: new Map(),
            averagePlayTime: 0,
            totalPlayTime: 0
        };

        // Auto-refresh timers
        this.refreshTimers = new Map();

        this.init();
    }

    /**
     * Inicializar el gestor
     */
    init() {
        this.setupEventListeners();
        this.initSearchWorker();
        this.loadFromStorage();
        this.eventBus.emit('playlist:manager-initialized');
        console.log('📋 PlaylistManager initialized');
    }

    /**
     * Cargar y parsear una lista M3U
     * @param {string} content - Contenido M3U
     * @param {string} filename - Nombre del archivo
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<string>} ID de la playlist creada
     */
    async loadPlaylist(content, filename, options = {}) {
        try {
            const playlistId = this.generatePlaylistId(filename);
            
            this.eventBus.emit('playlist:load-start', { 
                id: playlistId, 
                filename 
            });

            // Parsear contenido
            const items = await this.parseM3UContent(content, filename);
            
            if (items.length === 0) {
                throw new Error('No valid items found in playlist');
            }

            // Crear objeto de playlist
            const playlist = {
                id: playlistId,
                filename,
                content,
                items,
                metadata: {
                    createdAt: Date.now(),
                    lastModified: Date.now(),
                    totalItems: items.length,
                    totalDuration: this.calculateTotalDuration(items),
                    groups: this.extractGroups(items),
                    streamTypes: this.extractStreamTypes(items),
                    hasLogos: items.some(item => item.logo),
                    sourceUrl: options.sourceUrl || null,
                    autoRefresh: options.autoRefresh || false
                },
                statistics: {
                    timesLoaded: 1,
                    lastAccessed: Date.now(),
                    totalPlayTime: 0,
                    mostPlayedItem: null
                }
            };

            // Almacenar playlist
            this.playlists.set(playlistId, playlist);
            
            // Establecer como activa si es la primera
            if (!this.activePlaylistId) {
                this.setActivePlaylist(playlistId);
            }

            // Actualizar índice de búsqueda
            this.updateSearchIndex(playlistId, items);

            // Configurar auto-refresh si está habilitado
            if (playlist.metadata.autoRefresh && playlist.metadata.sourceUrl) {
                this.setupAutoRefresh(playlistId);
            }

            // Guardar en almacenamiento
            this.saveToStorage();

            this.eventBus.emit('playlist:loaded', { 
                id: playlistId, 
                playlist,
                itemCount: items.length 
            });

            console.log(`📋 Playlist '${filename}' loaded with ${items.length} items`);
            return playlistId;

        } catch (error) {
            console.error('❌ Error loading playlist:', error);
            this.eventBus.emit('playlist:load-error', { 
                filename, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Parsear contenido M3U de forma avanzada
     * @param {string} content - Contenido M3U
     * @param {string} filename - Nombre del archivo
     * @returns {Promise<Array>} Array de items parseados
     */
    async parseM3UContent(content, filename) {
        // Verificar cache primero
        const cacheKey = this.generateCacheKey(content);
        if (this.parseCache.has(cacheKey)) {
            console.log('📋 Using cached parse result');
            return this.parseCache.get(cacheKey);
        }

        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const items = [];
        let currentItem = {};
        let lineNumber = 0;

        for (const line of lines) {
            lineNumber++;

            try {
                if (line.startsWith('#EXTM3U')) {
                    // Header de playlist M3U
                    continue;
                } else if (line.startsWith('#EXTINF:')) {
                    // Línea de información
                    currentItem = this.parseExtinfLine(line, lineNumber);
                } else if (line.startsWith('#EXTGRP:')) {
                    // Grupo alternativo
                    currentItem.group = line.substring(8);
                } else if (line.startsWith('#EXTVLCOPT:')) {
                    // Opciones VLC
                    currentItem.vlcOptions = currentItem.vlcOptions || [];
                    currentItem.vlcOptions.push(line.substring(11));
                } else if (line.startsWith('#EXT-X-')) {
                    // Headers HLS específicos
                    currentItem.hlsHeaders = currentItem.hlsHeaders || [];
                    currentItem.hlsHeaders.push(line);
                } else if (!line.startsWith('#') && currentItem.title) {
                    // URL del stream
                    currentItem.url = line;
                    currentItem.type = this.detectStreamType(line);
                    currentItem.id = this.generateItemId(currentItem, items.length);
                    currentItem.index = items.length;
                    currentItem.parseLineNumber = lineNumber;
                    
                    // Validar URL
                    if (this.isValidUrl(line)) {
                        items.push({ ...currentItem });
                    } else {
                        console.warn(`⚠️ Invalid URL at line ${lineNumber}: ${line}`);
                    }
                    
                    currentItem = {};
                }
            } catch (error) {
                console.warn(`⚠️ Parse error at line ${lineNumber}: ${error.message}`);
                currentItem = {};
            }
        }

        // Guardar en cache
        this.parseCache.set(cacheKey, items);
        
        // Limpiar cache si es muy grande
        if (this.parseCache.size > this.config.cacheSize) {
            const firstKey = this.parseCache.keys().next().value;
            this.parseCache.delete(firstKey);
        }

        console.log(`📋 Parsed ${items.length} items from ${filename}`);
        return items;
    }

    /**
     * Parsear línea EXTINF avanzada
     * @param {string} line - Línea EXTINF
     * @param {number} lineNumber - Número de línea
     * @returns {Object} Item parseado
     */
    parseExtinfLine(line, lineNumber) {
        const match = line.match(/#EXTINF:([^,]*),(.*)$/);
        if (!match) {
            throw new Error(`Invalid EXTINF format at line ${lineNumber}`);
        }

        const item = {
            duration: this.parseDuration(match[1]),
            title: match[2].trim(),
            group: '',
            logo: '',
            tvgId: '',
            tvgName: '',
            tvgShift: 0,
            radioTrack: false,
            language: '',
            country: '',
            region: '',
            aspectRatio: '',
            resolution: '',
            frameRate: '',
            audioCodec: '',
            videoCodec: '',
            customAttributes: {}
        };

        // Extraer atributos con regex mejorado
        const attributeRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
        let attrMatch;

        while ((attrMatch = attributeRegex.exec(line)) !== null) {
            const key = attrMatch[1].toLowerCase();
            const value = attrMatch[2];

            switch (key) {
                case 'tvg-id':
                    item.tvgId = value;
                    break;
                case 'tvg-name':
                    item.tvgName = value;
                    break;
                case 'tvg-logo':
                    item.logo = value;
                    break;
                case 'tvg-shift':
                    item.tvgShift = parseInt(value) || 0;
                    break;
                case 'group-title':
                    item.group = value;
                    break;
                case 'radio':
                    item.radioTrack = value.toLowerCase() === 'true';
                    break;
                case 'language':
                    item.language = value;
                    break;
                case 'country':
                    item.country = value;
                    break;
                case 'region':
                    item.region = value;
                    break;
                case 'aspect-ratio':
                    item.aspectRatio = value;
                    break;
                case 'resolution':
                    item.resolution = value;
                    break;
                case 'frame-rate':
                    item.frameRate = value;
                    break;
                case 'audio-codec':
                    item.audioCodec = value;
                    break;
                case 'video-codec':
                    item.videoCodec = value;
                    break;
                default:
                    // Atributos personalizados
                    item.customAttributes[key] = value;
                    break;
            }
        }

        // Usar tvg-name como título si no hay título específico
        if (!item.title && item.tvgName) {
            item.title = item.tvgName;
        }

        return item;
    }

    /**
     * Buscar en listas de reproducción
     * @param {string} query - Término de búsqueda
     * @param {Object} options - Opciones de búsqueda
     * @returns {Promise<Array>} Resultados de búsqueda
     */
    async search(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchKey = `${query}_${JSON.stringify(options)}`;
        
        // Verificar cache de búsqueda
        if (this.searchCache.has(searchKey)) {
            return this.searchCache.get(searchKey);
        }

        const {
            playlistId = this.activePlaylistId,
            fields = ['title', 'group', 'tvgName'],
            caseSensitive = false,
            fuzzy = true,
            limit = 100
        } = options;

        try {
            let results = [];

            if (playlistId && this.playlists.has(playlistId)) {
                // Buscar en playlist específica
                results = this.searchInPlaylist(playlistId, query, {
                    fields, caseSensitive, fuzzy, limit
                });
            } else {
                // Buscar en todas las listas
                for (const [id] of this.playlists) {
                    const playlistResults = this.searchInPlaylist(id, query, {
                        fields, caseSensitive, fuzzy, limit: limit / this.playlists.size
                    });
                    results.push(...playlistResults);
                }
            }

            // Ordenar por relevancia
            results.sort((a, b) => b.relevance - a.relevance);
            results = results.slice(0, limit);

            // Guardar en cache
            this.searchCache.set(searchKey, results);

            // Limpiar cache si es muy grande
            if (this.searchCache.size > 100) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
            }

            this.eventBus.emit('playlist:search-completed', {
                query,
                results: results.length,
                playlistId
            });

            return results;

        } catch (error) {
            console.error('❌ Search error:', error);
            this.eventBus.emit('playlist:search-error', { query, error: error.message });
            return [];
        }
    }

    /**
     * Buscar en una playlist específica
     * @param {string} playlistId - ID de la playlist
     * @param {string} query - Término de búsqueda
     * @param {Object} options - Opciones de búsqueda
     * @returns {Array} Resultados de búsqueda
     */
    searchInPlaylist(playlistId, query, options) {
        const playlist = this.playlists.get(playlistId);
        if (!playlist) return [];

        const { fields, caseSensitive, fuzzy, limit } = options;
        const searchTerm = caseSensitive ? query : query.toLowerCase();
        const results = [];

        for (const item of playlist.items) {
            let relevance = 0;
            const matchedFields = [];

            for (const field of fields) {
                const fieldValue = item[field] || '';
                const searchValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();

                if (fuzzy) {
                    // Búsqueda fuzzy básica
                    if (searchValue.includes(searchTerm)) {
                        relevance += this.calculateRelevance(searchValue, searchTerm, field);
                        matchedFields.push(field);
                    }
                } else {
                    // Búsqueda exacta
                    if (searchValue === searchTerm) {
                        relevance += 10;
                        matchedFields.push(field);
                    }
                }
            }

            if (relevance > 0) {
                results.push({
                    ...item,
                    playlistId,
                    relevance,
                    matchedFields
                });
            }
        }

        return results.slice(0, limit);
    }

    /**
     * Filtrar items por criterios
     * @param {Object} criteria - Criterios de filtrado
     * @param {string} playlistId - ID de playlist (opcional)
     * @returns {Array} Items filtrados
     */
    filter(criteria, playlistId = null) {
        const targetPlaylists = playlistId ? 
            [this.playlists.get(playlistId)] : 
            Array.from(this.playlists.values());

        let results = [];

        for (const playlist of targetPlaylists) {
            if (!playlist) continue;

            const filtered = playlist.items.filter(item => {
                return Object.entries(criteria).every(([key, value]) => {
                    if (value === null || value === undefined) return true;
                    
                    const itemValue = item[key];
                    
                    if (Array.isArray(value)) {
                        return value.includes(itemValue);
                    } else if (typeof value === 'string') {
                        return itemValue && itemValue.toLowerCase().includes(value.toLowerCase());
                    } else {
                        return itemValue === value;
                    }
                });
            });

            results.push(...filtered.map(item => ({
                ...item,
                playlistId: playlist.id
            })));
        }

        this.eventBus.emit('playlist:filtered', {
            criteria,
            results: results.length,
            playlistId
        });

        return results;
    }

    /**
     * Obtener item actual
     * @returns {Object|null} Item actual o null
     */
    getCurrentItem() {
        const playlist = this.getActivePlaylist();
        if (!playlist || this.currentIndex < 0 || this.currentIndex >= playlist.items.length) {
            return null;
        }
        return playlist.items[this.currentIndex];
    }

    /**
     * Mover al siguiente item
     * @returns {Object|null} Siguiente item o null
     */
    next() {
        const playlist = this.getActivePlaylist();
        if (!playlist) return null;

        if (this.currentIndex < playlist.items.length - 1) {
            this.currentIndex++;
            const item = playlist.items[this.currentIndex];
            this.eventBus.emit('playlist:item-changed', { 
                item, 
                index: this.currentIndex,
                direction: 'next'
            });
            return item;
        }
        return null;
    }

    /**
     * Mover al item anterior
     * @returns {Object|null} Item anterior o null
     */
    previous() {
        const playlist = this.getActivePlaylist();
        if (!playlist) return null;

        if (this.currentIndex > 0) {
            this.currentIndex--;
            const item = playlist.items[this.currentIndex];
            this.eventBus.emit('playlist:item-changed', { 
                item, 
                index: this.currentIndex,
                direction: 'previous'
            });
            return item;
        }
        return null;
    }

    /**
     * Saltar a un item específico
     * @param {number} index - Índice del item
     * @returns {Object|null} Item seleccionado o null
     */
    jumpTo(index) {
        const playlist = this.getActivePlaylist();
        if (!playlist || index < 0 || index >= playlist.items.length) {
            return null;
        }

        this.currentIndex = index;
        const item = playlist.items[index];
        
        this.eventBus.emit('playlist:item-changed', { 
            item, 
            index,
            direction: 'jump'
        });

        return item;
    }

    /**
     * Agregar item a favoritos
     * @param {string} itemId - ID del item
     */
    addToFavorites(itemId) {
        if (!this.config.enableFavorites) return;

        this.favorites.add(itemId);
        this.saveToStorage();
        this.eventBus.emit('playlist:favorite-added', { itemId });
    }

    /**
     * Remover item de favoritos
     * @param {string} itemId - ID del item
     */
    removeFromFavorites(itemId) {
        if (!this.config.enableFavorites) return;

        this.favorites.delete(itemId);
        this.saveToStorage();
        this.eventBus.emit('playlist:favorite-removed', { itemId });
    }

    /**
     * Obtener items favoritos
     * @returns {Array} Array de items favoritos
     */
    getFavorites() {
        if (!this.config.enableFavorites) return [];

        const favorites = [];
        for (const playlist of this.playlists.values()) {
            for (const item of playlist.items) {
                if (this.favorites.has(item.id)) {
                    favorites.push({
                        ...item,
                        playlistId: playlist.id
                    });
                }
            }
        }
        return favorites;
    }

    /**
     * Exportar playlist en formato M3U
     * @param {string} playlistId - ID de la playlist
     * @param {Object} options - Opciones de exportación
     * @returns {string} Contenido M3U
     */
    exportPlaylist(playlistId, options = {}) {
        const playlist = this.playlists.get(playlistId);
        if (!playlist) {
            throw new Error('Playlist not found');
        }

        const {
            includeGroups = true,
            includeLogos = true,
            includeTvgInfo = true,
            includeCustomAttributes = false
        } = options;

        let m3uContent = '#EXTM3U\n';

        for (const item of playlist.items) {
            let extinf = `#EXTINF:${item.duration}`;

            // Agregar atributos
            const attributes = [];
            
            if (includeTvgInfo && item.tvgId) {
                attributes.push(`tvg-id="${item.tvgId}"`);
            }
            if (includeTvgInfo && item.tvgName) {
                attributes.push(`tvg-name="${item.tvgName}"`);
            }
            if (includeLogos && item.logo) {
                attributes.push(`tvg-logo="${item.logo}"`);
            }
            if (includeGroups && item.group) {
                attributes.push(`group-title="${item.group}"`);
            }
            if (item.language) {
                attributes.push(`language="${item.language}"`);
            }
            if (item.country) {
                attributes.push(`country="${item.country}"`);
            }

            // Atributos personalizados
            if (includeCustomAttributes) {
                for (const [key, value] of Object.entries(item.customAttributes)) {
                    attributes.push(`${key}="${value}"`);
                }
            }

            if (attributes.length > 0) {
                extinf += ` ${attributes.join(' ')}`;
            }

            extinf += `,${item.title}\n`;
            m3uContent += extinf;
            m3uContent += `${item.url}\n`;
        }

        this.eventBus.emit('playlist:exported', { 
            playlistId, 
            itemCount: playlist.items.length 
        });

        return m3uContent;
    }

    // Métodos privados y utilitarios

    generatePlaylistId(filename) {
        return `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateItemId(item, index) {
        return `item_${index}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateCacheKey(content) {
        // Simple hash del contenido para cache
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    parseDuration(durationStr) {
        const duration = parseFloat(durationStr);
        return isNaN(duration) ? -1 : duration;
    }

    detectStreamType(url) {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('.m3u8')) {
            return 'HLS';
        } else if (urlLower.includes('.mpd')) {
            return 'DASH';
        } else if (urlLower.match(/\.(mp4|mkv|avi|webm|ogg)$/)) {
            return 'Direct';
        } else {
            return 'Stream';
        }
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    calculateRelevance(text, searchTerm, field) {
        let relevance = 0;
        
        // Coincidencia exacta al inicio
        if (text.startsWith(searchTerm)) {
            relevance += 5;
        }
        
        // Coincidencia en cualquier lugar
        if (text.includes(searchTerm)) {
            relevance += 3;
        }
        
        // Peso por campo
        const fieldWeights = {
            title: 3,
            tvgName: 2,
            group: 1
        };
        relevance *= (fieldWeights[field] || 1);
        
        return relevance;
    }

    calculateTotalDuration(items) {
        return items.reduce((total, item) => {
            return total + (item.duration > 0 ? item.duration : 0);
        }, 0);
    }

    extractGroups(items) {
        const groups = new Set();
        items.forEach(item => {
            if (item.group) groups.add(item.group);
        });
        return Array.from(groups);
    }

    extractStreamTypes(items) {
        const types = new Set();
        items.forEach(item => {
            if (item.type) types.add(item.type);
        });
        return Array.from(types);
    }

    updateSearchIndex(playlistId, items) {
        // Actualizar índice de búsqueda
        for (const item of items) {
            const searchTerms = [
                item.title,
                item.tvgName,
                item.group,
                item.language,
                item.country
            ].filter(term => term).join(' ').toLowerCase();

            this.searchIndex.set(item.id, {
                playlistId,
                searchTerms,
                item
            });
        }
    }

    setupEventListeners() {
        // Escuchar eventos del EventBus
        this.eventBus.on('playlist:load-from-url', async (event) => {
            const { url, filename, options } = event.data;
            // Implementar carga desde URL
        });

        this.eventBus.on('playlist:refresh', async (event) => {
            const { playlistId } = event.data;
            await this.refreshPlaylist(playlistId);
        });
    }

    initSearchWorker() {
        // Inicializar Web Worker para búsqueda si está disponible
        if (typeof Worker !== 'undefined') {
            try {
                // El worker se puede implementar más tarde
                console.log('🔍 Search worker ready');
            } catch (error) {
                console.warn('⚠️ Search worker not available:', error);
            }
        }
    }

    setupAutoRefresh(playlistId) {
        if (this.refreshTimers.has(playlistId)) {
            clearInterval(this.refreshTimers.get(playlistId));
        }

        const timer = setInterval(() => {
            this.refreshPlaylist(playlistId);
        }, this.config.refreshInterval);

        this.refreshTimers.set(playlistId, timer);
    }

    async refreshPlaylist(playlistId) {
        const playlist = this.playlists.get(playlistId);
        if (!playlist || !playlist.metadata.sourceUrl) return;

        try {
            // Implementar refresh desde URL original
            this.eventBus.emit('playlist:refresh-start', { playlistId });
            
            // TODO: Implementar fetch y actualización
            
            this.eventBus.emit('playlist:refreshed', { playlistId });
        } catch (error) {
            console.error('❌ Playlist refresh error:', error);
            this.eventBus.emit('playlist:refresh-error', { playlistId, error: error.message });
        }
    }

    getActivePlaylist() {
        return this.activePlaylistId ? this.playlists.get(this.activePlaylistId) : null;
    }

    setActivePlaylist(playlistId) {
        if (this.playlists.has(playlistId)) {
            this.activePlaylistId = playlistId;
            this.currentIndex = -1;
            this.eventBus.emit('playlist:active-changed', { playlistId });
        }
    }

    saveToStorage() {
        if (typeof localStorage === 'undefined') return;

        try {
            const data = {
                playlists: Array.from(this.playlists.entries()),
                activePlaylistId: this.activePlaylistId,
                favorites: Array.from(this.favorites),
                playHistory: this.playHistory,
                statistics: this.statistics
            };

            localStorage.setItem('m3u_playlist_data', JSON.stringify(data));
        } catch (error) {
            console.warn('⚠️ Failed to save to storage:', error);
        }
    }

    loadFromStorage() {
        if (typeof localStorage === 'undefined') return;

        try {
            const data = localStorage.getItem('m3u_playlist_data');
            if (data) {
                const parsed = JSON.parse(data);
                
                this.playlists = new Map(parsed.playlists || []);
                this.activePlaylistId = parsed.activePlaylistId || null;
                this.favorites = new Set(parsed.favorites || []);
                this.playHistory = parsed.playHistory || [];
                this.statistics = { ...this.statistics, ...parsed.statistics };

                console.log(`📋 Loaded ${this.playlists.size} playlists from storage`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load from storage:', error);
        }
    }

    /**
     * Destruir el gestor y limpiar recursos
     */
    destroy() {
        // Limpiar timers
        for (const timer of this.refreshTimers.values()) {
            clearInterval(timer);
        }
        this.refreshTimers.clear();

        // Limpiar caches
        this.parseCache.clear();
        this.searchCache.clear();
        this.searchIndex.clear();

        // Limpiar worker
        if (this.searchWorker) {
            this.searchWorker.terminate();
            this.searchWorker = null;
        }

        // Limpiar estado
        this.playlists.clear();
        this.activePlaylistId = null;
        this.currentIndex = -1;

        this.eventBus.emit('playlist:manager-destroyed');
        console.log('📋 PlaylistManager destroyed');
    }
}

export default PlaylistManager;