/**
 * XMLTV Parser - Parser para formato XMLTV estándar
 * Procesa archivos XMLTV y los convierte a modelos internos EPG
 */

class XMLTVParser {
    constructor() {
        this.channelMap = new Map();
        console.log('📄 XMLTVParser inicializado');
    }

    /**
     * Parsea contenido XMLTV
     * @param {string} xmlData - Datos XML en formato XMLTV
     * @returns {Map<string, EPGProgram[]>}
     */
    parse(xmlData) {
        if (!xmlData || typeof xmlData !== 'string') {
            throw new Error('Datos XMLTV inválidos');
        }

        try {
            console.log('📄 Parseando datos XMLTV...');
            
            // Parsear XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
            
            // Verificar errores de parseo
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Error parseando XML: ' + parseError.textContent);
            }

            // Obtener elemento raíz
            const tvElement = xmlDoc.querySelector('tv');
            if (!tvElement) {
                throw new Error('Elemento <tv> no encontrado en XMLTV');
            }

            // Parsear canales primero
            this.parseChannels(tvElement);
            
            // Parsear programas
            const programsMap = this.parsePrograms(tvElement);
            
            console.log(`✅ XMLTV parseado: ${this.channelMap.size} canales, ${this.getTotalPrograms(programsMap)} programas`);
            
            return programsMap;
            
        } catch (error) {
            console.error('❌ Error parseando XMLTV:', error);
            throw error;
        }
    }

    /**
     * Parsea los canales del XMLTV
     * @param {Element} tvElement - Elemento raíz <tv>
     * @private
     */
    parseChannels(tvElement) {
        const channelElements = tvElement.querySelectorAll('channel');
        
        for (const channelEl of channelElements) {
            const channelId = channelEl.getAttribute('id');
            if (!channelId) continue;

            const displayName = this.getElementText(channelEl, 'display-name');
            const icon = channelEl.querySelector('icon');
            const iconUrl = icon ? icon.getAttribute('src') : null;

            this.channelMap.set(channelId, {
                id: channelId,
                name: displayName || channelId,
                logo: iconUrl,
                group: null // XMLTV no tiene grupos por defecto
            });
        }
        
        console.log(`📺 ${this.channelMap.size} canales parseados`);
    }

    /**
     * Parsea los programas del XMLTV
     * @param {Element} tvElement - Elemento raíz <tv>
     * @returns {Map<string, EPGProgram[]>}
     * @private
     */
    parsePrograms(tvElement) {
        const programsMap = new Map();
        const programElements = tvElement.querySelectorAll('programme');
        
        for (const programEl of programElements) {
            try {
                const program = this.parseProgram(programEl);
                if (program) {
                    const channelId = program.channelId;
                    
                    if (!programsMap.has(channelId)) {
                        programsMap.set(channelId, []);
                    }
                    
                    programsMap.get(channelId).push(program);
                }
            } catch (error) {
                console.warn('⚠️ Error parseando programa individual:', error);
                continue;
            }
        }
        
        // Ordenar programas por hora de inicio
        for (const programs of programsMap.values()) {
            programs.sort((a, b) => a.startTime - b.startTime);
        }
        
        return programsMap;
    }

    /**
     * Parsea un programa individual
     * @param {Element} programEl - Elemento <programme>
     * @returns {EPGProgram|null}
     * @private
     */
    parseProgram(programEl) {
        const channelId = programEl.getAttribute('channel');
        const startStr = programEl.getAttribute('start');
        const stopStr = programEl.getAttribute('stop');
        
        if (!channelId || !startStr) {
            return null;
        }

        // Parsear fechas XMLTV
        const startTime = this.parseXMLTVDate(startStr);
        const endTime = stopStr ? this.parseXMLTVDate(stopStr) : null;
        
        if (!startTime) {
            return null;
        }

        // Si no hay hora de fin, estimar duración de 30 minutos
        const finalEndTime = endTime || new Date(startTime.getTime() + 30 * 60 * 1000);

        // Extraer información del programa
        const title = this.getElementText(programEl, 'title') || 'Programa sin título';
        const description = this.getElementText(programEl, 'desc');
        const category = this.getElementText(programEl, 'category');
        
        // Información de episodio
        const episodeNum = programEl.querySelector('episode-num');
        let episode = null;
        
        if (episodeNum) {
            const episodeText = episodeNum.textContent;
            const episodeMatch = episodeText.match(/(\d+)\.(\d+)/);
            
            if (episodeMatch) {
                episode = {
                    season: parseInt(episodeMatch[1]) + 1, // XMLTV usa base 0
                    episode: parseInt(episodeMatch[2]) + 1,
                    title: null
                };
            }
        }

        // Créditos
        const credits = this.parseCredits(programEl);
        
        // Rating
        const rating = this.parseRating(programEl);

        // Generar ID único
        const programId = this.generateProgramId(channelId, startTime, title);

        return {
            id: programId,
            channelId: channelId,
            title: this.cleanText(title),
            description: description ? this.cleanText(description) : null,
            startTime: startTime,
            endTime: finalEndTime,
            duration: Math.round((finalEndTime - startTime) / (1000 * 60)),
            genre: category ? [this.cleanText(category)] : null,
            rating: rating,
            episode: episode,
            credits: credits
        };
    }

    /**
     * Parsea créditos del programa
     * @param {Element} programEl - Elemento <programme>
     * @returns {Object|null}
     * @private
     */
    parseCredits(programEl) {
        const creditsEl = programEl.querySelector('credits');
        if (!creditsEl) return null;

        const credits = {};
        
        // Directores
        const directors = Array.from(creditsEl.querySelectorAll('director'))
            .map(el => this.cleanText(el.textContent))
            .filter(Boolean);
        
        if (directors.length > 0) {
            credits.director = directors;
        }

        // Actores
        const actors = Array.from(creditsEl.querySelectorAll('actor'))
            .map(el => this.cleanText(el.textContent))
            .filter(Boolean);
        
        if (actors.length > 0) {
            credits.actor = actors;
        }

        // Escritores
        const writers = Array.from(creditsEl.querySelectorAll('writer'))
            .map(el => this.cleanText(el.textContent))
            .filter(Boolean);
        
        if (writers.length > 0) {
            credits.writer = writers;
        }

        return Object.keys(credits).length > 0 ? credits : null;
    }

    /**
     * Parsea rating del programa
     * @param {Element} programEl - Elemento <programme>
     * @returns {string|null}
     * @private
     */
    parseRating(programEl) {
        const ratingEl = programEl.querySelector('rating value');
        if (!ratingEl) return null;

        const ratingText = ratingEl.textContent.trim();
        return ratingText || null;
    }

    /**
     * Parsea una fecha en formato XMLTV
     * @param {string} dateStr - Fecha en formato XMLTV (YYYYMMDDHHmmss +HHMM)
     * @returns {Date|null}
     * @private
     */
    parseXMLTVDate(dateStr) {
        if (!dateStr) return null;

        try {
            // Formato XMLTV: 20231225140000 +0100
            const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
            
            if (!match) {
                console.warn('⚠️ Formato de fecha XMLTV inválido:', dateStr);
                return null;
            }

            const [, year, month, day, hour, minute, second, timezone] = match;
            
            // Crear fecha en UTC
            const date = new Date(Date.UTC(
                parseInt(year),
                parseInt(month) - 1, // Mes base 0
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
            ));

            // Ajustar timezone si está presente
            if (timezone) {
                const tzMatch = timezone.match(/([+-])(\d{2})(\d{2})/);
                if (tzMatch) {
                    const [, sign, tzHours, tzMinutes] = tzMatch;
                    const offsetMinutes = (parseInt(tzHours) * 60 + parseInt(tzMinutes)) * (sign === '+' ? -1 : 1);
                    date.setMinutes(date.getMinutes() + offsetMinutes);
                }
            }

            return date;
            
        } catch (error) {
            console.warn('⚠️ Error parseando fecha XMLTV:', dateStr, error);
            return null;
        }
    }

    /**
     * Obtiene el texto de un elemento hijo
     * @param {Element} parent - Elemento padre
     * @param {string} tagName - Nombre del tag hijo
     * @returns {string|null}
     * @private
     */
    getElementText(parent, tagName) {
        const element = parent.querySelector(tagName);
        return element ? element.textContent.trim() : null;
    }

    /**
     * Limpia y normaliza texto
     * @param {string} text - Texto a limpiar
     * @returns {string}
     * @private
     */
    cleanText(text) {
        if (!text) return '';
        
        return text
            .trim()
            .replace(/\s+/g, ' ') // Normalizar espacios
            .replace(/[\r\n\t]/g, ' ') // Remover saltos de línea y tabs
            .substring(0, 500); // Limitar longitud
    }

    /**
     * Genera un ID único para un programa
     * @param {string} channelId - ID del canal
     * @param {Date} startTime - Hora de inicio
     * @param {string} title - Título del programa
     * @returns {string}
     * @private
     */
    generateProgramId(channelId, startTime, title) {
        const timestamp = startTime.getTime();
        const titleHash = this.simpleHash(title);
        return `xmltv_${channelId}_${timestamp}_${titleHash}`;
    }

    /**
     * Genera un hash simple para una cadena
     * @param {string} str - Cadena a hashear
     * @returns {string}
     * @private
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Cuenta el total de programas en el mapa
     * @param {Map<string, EPGProgram[]>} programsMap - Mapa de programas
     * @returns {number}
     * @private
     */
    getTotalPrograms(programsMap) {
        let total = 0;
        for (const programs of programsMap.values()) {
            total += programs.length;
        }
        return total;
    }

    /**
     * Valida un programa parseado
     * @param {Object} program - Programa a validar
     * @returns {boolean}
     * @private
     */
    validateProgram(program) {
        return !!(
            program &&
            program.id &&
            program.channelId &&
            program.title &&
            program.startTime instanceof Date &&
            program.endTime instanceof Date &&
            program.startTime < program.endTime
        );
    }

    /**
     * Obtiene información de un canal por ID
     * @param {string} channelId - ID del canal
     * @returns {Object|null}
     */
    getChannelInfo(channelId) {
        return this.channelMap.get(channelId) || null;
    }

    /**
     * Obtiene todos los canales parseados
     * @returns {Map<string, Object>}
     */
    getChannels() {
        return new Map(this.channelMap);
    }

    /**
     * Limpia el parser y libera memoria
     */
    destroy() {
        this.channelMap.clear();
        console.log('🧹 XMLTVParser destruido');
    }
}

export { XMLTVParser };