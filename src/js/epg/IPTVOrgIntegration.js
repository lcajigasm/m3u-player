/**
 * IPTV-Org Integration - Integración con la biblioteca iptv-org/epg
 * Proporciona descarga automática de EPG desde múltiples fuentes
 */

class IPTVOrgIntegration {
    constructor() {
        this.apiBaseUrl = 'https://iptv-org.github.io/api';
        this.epgBaseUrl = 'https://iptv-org.github.io/epg';
        this.cache = new Map();
        this.supportedSites = new Map();
        this.channelMapping = new Map();
        this.lastUpdate = null;
        this.updateInterval = null;
        
        // System initialized
    }

    /**
     * Inicializa la integración con iptv-org
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Cargar datos iniciales
            await this.loadChannelsData();
            await this.loadGuidesData();
            await this.loadSupportedSites();
            
            // Configurar actualización automática
            this.setupAutoUpdate();
            
            // Initialization completed
            
        } catch (error) {
            console.error('❌ Error inicializando IPTVOrgIntegration:', error);
            throw error;
        }
    }

    /**
     * Carga la lista de canales disponibles
     * @returns {Promise<void>}
     */
    async loadChannelsData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/channels.json`);
            const channels = await response.json();
            
            channels.forEach(channel => {
                this.cache.set(`channel_${channel.id}`, {
                    ...channel,
                    cached_at: Date.now()
                });
            });
            
            // Channels loaded
            
        } catch (error) {
            console.error('❌ Error cargando canales:', error);
            throw error;
        }
    }

    /**
     * Carga los datos de las guías EPG disponibles
     * @returns {Promise<void>}
     */
    async loadGuidesData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/guides.json`);
            const guides = await response.json();
            
            guides.forEach(guide => {
                const key = `guide_${guide.channel}_${guide.feed || 'main'}`;
                this.cache.set(key, {
                    ...guide,
                    cached_at: Date.now()
                });
            });
            
            // Guides loaded
            
        } catch (error) {
            console.error('❌ Error cargando guías:', error);
            throw error;
        }
    }

    /**
     * Carga la lista de sitios soportados para EPG
     * @returns {Promise<void>}
     */
    async loadSupportedSites() {
        // Lista de sitios principales con alta disponibilidad
        const prioritySites = [
            'i.mjh.nz', 'epgshare01.online', 'tvpassport.com', 'ontvtonight.com',
            'sat.tv', 'tvprofil.com', 'mi.tv', 'streamingtvguides.com',
            'epg.iptvx.one', 'gatotv.com', 'guida.tv', 'programetv.ro'
        ];
        
        prioritySites.forEach((site, index) => {
            this.supportedSites.set(site, {
                name: site,
                priority: index + 1,
                status: 'active',
                lastCheck: null,
                reliability: 0.9
            });
        });
        
        // Priority sites configured
    }

    /**
     * Busca canales por nombre, grupo o país
     * @param {string} query - Consulta de búsqueda
     * @param {Object} filters - Filtros adicionales
     * @returns {Array} Lista de canales encontrados
     */
    searchChannels(query, filters = {}) {
        const channels = [];
        const searchTerm = query.toLowerCase();
        
        for (const [key, channel] of this.cache) {
            if (!key.startsWith('channel_')) continue;
            
            const matchesQuery = 
                channel.name.toLowerCase().includes(searchTerm) ||
                channel.alt_names?.some(name => name.toLowerCase().includes(searchTerm)) ||
                channel.network?.toLowerCase().includes(searchTerm);
            
            if (matchesQuery) {
                // Aplicar filtros
                if (filters.country && channel.country !== filters.country) continue;
                if (filters.category && !channel.categories.includes(filters.category)) continue;
                if (filters.language && !this.channelSupportsLanguage(channel, filters.language)) continue;
                
                channels.push(channel);
            }
        }
        
        return channels.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtiene EPG para un canal específico
     * @param {string} channelId - ID del canal
     * @param {number} days - Días de programación (por defecto 7)
     * @returns {Promise<Array>} Programas del canal
     */
    async getChannelEPG(channelId, days = 7) {
        try {
            // Buscar guía disponible para el canal
            const guideKey = `guide_${channelId}_main`;
            let guide = this.cache.get(guideKey);
            
            if (!guide) {
                // Buscar por nombre alternativo
                guide = this.findGuideByAlternativeName(channelId);
            }
            
            if (!guide) {
                console.warn(`⚠️ No se encontró guía EPG para canal: ${channelId}`);
                return [];
            }
            
            return await this.downloadEPGFromSite(guide.site, guide.site_id, days);
            
        } catch (error) {
            console.error(`❌ Error obteniendo EPG para ${channelId}:`, error);
            return [];
        }
    }

    /**
     * Descarga EPG desde un sitio específico
     * @param {string} site - Sitio web
     * @param {string} siteId - ID del canal en el sitio
     * @param {number} days - Días de programación
     * @returns {Promise<Array>} Programas descargados
     */
    async downloadEPGFromSite(site, siteId, days = 7) {
        try {
            // URL del EPG precompilado (actualizado diariamente)
            const epgUrl = `${this.epgBaseUrl}/guides/${site}/${siteId}.xml`;
            
            const response = await fetch(epgUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const xmlData = await response.text();
            return await this.parseXMLTVData(xmlData, days);
            
        } catch (error) {
            console.error(`❌ Error descargando EPG de ${site}:`, error);
            
            // Intentar con fuente alternativa
            return await this.tryAlternativeEPGSource(site, siteId, days);
        }
    }

    /**
     * Intenta obtener EPG de una fuente alternativa
     * @param {string} originalSite - Sitio original que falló
     * @param {string} siteId - ID del canal
     * @param {number} days - Días de programación
     * @returns {Promise<Array>} Programas alternativos
     */
    async tryAlternativeEPGSource(originalSite, siteId, days) {
        const alternatives = Array.from(this.supportedSites.keys())
            .filter(site => site !== originalSite)
            .sort((a, b) => this.supportedSites.get(a).priority - this.supportedSites.get(b).priority);
        
        for (const altSite of alternatives.slice(0, 3)) {
            try {
                // Alternative source found
                
                const altUrl = `${this.epgBaseUrl}/guides/${altSite}/${siteId}.xml`;
                const response = await fetch(altUrl);
                
                if (response.ok) {
                    const xmlData = await response.text();
                    const programs = await this.parseXMLTVData(xmlData, days);
                    
                    if (programs.length > 0) {
                        // EPG obtained from alternative source
                        return programs;
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Fuente alternativa ${altSite} también falló:`, error.message);
                continue;
            }
        }
        
        return [];
    }

    /**
     * Parsea datos XMLTV
     * @param {string} xmlData - Datos XML
     * @param {number} days - Días a filtrar
     * @returns {Promise<Array>} Programas parseados
     */
    async parseXMLTVData(xmlData, days) {
        try {
            // Usar parser existente si está disponible
            if (window.DOMParser) {
                return this.parseXMLTVWithDOMParser(xmlData, days);
            }
            
            // Fallback a parseado manual
            return this.parseXMLTVManually(xmlData, days);
            
        } catch (error) {
            console.error('❌ Error parseando XMLTV:', error);
            return [];
        }
    }

    /**
     * Parsea XMLTV usando DOMParser
     * @param {string} xmlData - Datos XML
     * @param {number} days - Días a filtrar
     * @returns {Array} Programas parseados
     */
    parseXMLTVWithDOMParser(xmlData, days) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlData, 'text/xml');
        
        const programs = [];
        const now = new Date();
        const maxDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
        
        const programElements = doc.querySelectorAll('programme');
        
        programElements.forEach(element => {
            const startTime = new Date(element.getAttribute('start').replace(/\s/, 'T'));
            const stopTime = new Date(element.getAttribute('stop').replace(/\s/, 'T'));
            
            // Filtrar por rango de fechas
            if (startTime > maxDate) return;
            
            const titleElement = element.querySelector('title');
            const descElement = element.querySelector('desc');
            const categoryElements = element.querySelectorAll('category');
            
            const program = {
                id: `${element.getAttribute('channel')}_${startTime.getTime()}`,
                channelId: element.getAttribute('channel'),
                title: titleElement ? titleElement.textContent : 'Sin título',
                description: descElement ? descElement.textContent : '',
                startTime: startTime,
                endTime: stopTime,
                duration: Math.round((stopTime - startTime) / (1000 * 60)), // en minutos
                genre: Array.from(categoryElements).map(cat => cat.textContent),
                source: 'iptv-org'
            };
            
            programs.push(program);
        });
        
        return programs.sort((a, b) => a.startTime - b.startTime);
    }

    /**
     * Mapea canales de M3U con canales de iptv-org
     * @param {Array} m3uChannels - Canales del M3U
     * @returns {Map} Mapa de correspondencias
     */
    mapM3UChannels(m3uChannels) {
        const mapping = new Map();
        
        if (!Array.isArray(m3uChannels)) {
            console.warn('⚠️ m3uChannels no es un array válido');
            return mapping;
        }
        
        m3uChannels.forEach((m3uChannel, index) => {
            // Verificar que el canal es válido
            if (!m3uChannel || typeof m3uChannel !== 'object') {
                console.warn(`⚠️ Canal ${index} no válido:`, m3uChannel);
                return;
            }
            
            const matches = this.findChannelMatches(m3uChannel);
            
            if (matches.length > 0) {
                // Tomar la mejor coincidencia
                const bestMatch = matches[0];
                mapping.set(m3uChannel.id || m3uChannel.name, bestMatch.id);
                
                // Channel mapped
            } else {
                console.warn(`⚠️ No se encontró mapeo para canal: "${m3uChannel.name}"`);
            }
        });
        
        this.channelMapping = mapping;
        return mapping;
    }

    /**
     * Encuentra coincidencias para un canal M3U
     * @param {Object} m3uChannel - Canal del M3U
     * @returns {Array} Coincidencias encontradas
     */
    findChannelMatches(m3uChannel) {
        const matches = [];
        
        // Verificar que el canal tiene nombre
        if (!m3uChannel || !m3uChannel.name || typeof m3uChannel.name !== 'string') {
            return matches;
        }
        
        const searchTerms = [
            m3uChannel.name.toLowerCase(),
            m3uChannel.name.toLowerCase().replace(/\s+hd$/i, ''),
            m3uChannel.name.toLowerCase().replace(/\s+tv$/i, ''),
            ...(m3uChannel.group ? [m3uChannel.group.toLowerCase()] : [])
        ];
        
        for (const [key, channel] of this.cache) {
            if (!key.startsWith('channel_')) continue;
            
            let score = 0;
            
            // Coincidencia exacta de nombre
            if (searchTerms.includes(channel.name.toLowerCase())) {
                score += 100;
            }
            
            // Coincidencia con nombres alternativos
            if (channel.alt_names) {
                channel.alt_names.forEach(altName => {
                    if (searchTerms.includes(altName.toLowerCase())) {
                        score += 80;
                    }
                });
            }
            
            // Coincidencia parcial
            searchTerms.forEach(term => {
                if (channel.name.toLowerCase().includes(term) || 
                    term.includes(channel.name.toLowerCase())) {
                    score += 50;
                }
            });
            
            if (score > 0) {
                matches.push({ ...channel, score });
            }
        }
        
        // Ordenar por puntuación descendente
        return matches.sort((a, b) => b.score - a.score);
    }

    /**
     * Configura actualización automática
     */
    setupAutoUpdate() {
        // Actualizar datos de la API cada 24 horas
        this.updateInterval = setInterval(async () => {
            try {
                // Data updated
                await this.loadChannelsData();
                await this.loadGuidesData();
                this.lastUpdate = new Date();
                // Update completed
            } catch (error) {
                console.error('❌ Error en actualización automática:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24 horas
        
        this.lastUpdate = new Date();
    }

    /**
     * Obtiene estadísticas de la integración
     * @returns {Object} Estadísticas
     */
    getStats() {
        const channelCount = Array.from(this.cache.keys())
            .filter(key => key.startsWith('channel_')).length;
        
        const guideCount = Array.from(this.cache.keys())
            .filter(key => key.startsWith('guide_')).length;
        
        return {
            channels: channelCount,
            guides: guideCount,
            supportedSites: this.supportedSites.size,
            mappedChannels: this.channelMapping.size,
            lastUpdate: this.lastUpdate,
            cacheSize: this.cache.size
        };
    }

    /**
     * Busca guía por nombre alternativo
     * @param {string} channelName - Nombre del canal
     * @returns {Object|null} Guía encontrada
     */
    findGuideByAlternativeName(channelName) {
        const searchTerm = channelName.toLowerCase();
        
        for (const [key, guide] of this.cache) {
            if (!key.startsWith('guide_')) continue;
            
            if (guide.site_name && guide.site_name.toLowerCase().includes(searchTerm)) {
                return guide;
            }
        }
        
        return null;
    }

    /**
     * Verifica si un canal soporta un idioma
     * @param {Object} channel - Canal
     * @param {string} language - Código de idioma
     * @returns {boolean} Si soporta el idioma
     */
    channelSupportsLanguage(channel, language) {
        // Implementación básica - se puede mejorar
        if (channel.country) {
            const countryLanguages = {
                'US': ['en'], 'GB': ['en'], 'ES': ['es'], 'FR': ['fr'],
                'DE': ['de'], 'IT': ['it'], 'PT': ['pt'], 'BR': ['pt'],
                'MX': ['es'], 'AR': ['es'], 'CO': ['es'], 'PE': ['es']
            };
            
            const supportedLangs = countryLanguages[channel.country] || [];
            return supportedLangs.includes(language);
        }
        
        return false;
    }

    /**
     * Libera recursos
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.cache.clear();
        this.supportedSites.clear();
        this.channelMapping.clear();
        
        // Instance destroyed
    }
}

export { IPTVOrgIntegration };
