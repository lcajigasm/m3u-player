/**
 * JSON EPG Parser - Parser para formato JSON EPG personalizado
 * Procesa archivos JSON EPG y los convierte a modelos internos
 */

class JSONEPGParser {
    constructor() {
        console.log('📄 JSONEPGParser inicializado');
    }

    /**
     * Parsea contenido JSON EPG
     * @param {string} jsonData - Datos JSON
     * @returns {Map<string, EPGProgram[]>}
     */
    parse(jsonData) {
        if (!jsonData || typeof jsonData !== 'string') {
            throw new Error('Datos JSON EPG inválidos');
        }

        try {
            console.log('📄 Parseando datos JSON EPG...');
            
            const data = JSON.parse(jsonData);
            
            // Validar estructura básica
            if (!this.validateJSONStructure(data)) {
                throw new Error('Estructura JSON EPG inválida');
            }

            const programsMap = new Map();
            
            // Determinar formato del JSON
            if (Array.isArray(data)) {
                // Formato array de canales
                this.parseChannelArray(data, programsMap);
            } else if (data.channels) {
                // Formato con objeto channels
                this.parseChannelsObject(data.channels, programsMap);
            } else if (data.epg) {
                // Formato con objeto epg
                this.parseEPGObject(data.epg, programsMap);
            } else {
                // Formato objeto directo (channelId -> programs)
                this.parseDirectObject(data, programsMap);
            }
            
            // Ordenar programas por hora de inicio
            for (const programs of programsMap.values()) {
                programs.sort((a, b) => a.startTime - b.startTime);
            }
            
            console.log(`✅ JSON EPG parseado: ${programsMap.size} canales, ${this.getTotalPrograms(programsMap)} programas`);
            
            return programsMap;
            
        } catch (error) {
            console.error('❌ Error parseando JSON EPG:', error);
            throw error;
        }
    }

    /**
     * Valida la estructura básica del JSON
     * @param {any} data - Datos a validar
     * @returns {boolean}
     * @private
     */
    validateJSONStructure(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Aceptar arrays o objetos
        return Array.isArray(data) || typeof data === 'object';
    }

    /**
     * Parsea formato array de canales
     * @param {Array} channels - Array de canales
     * @param {Map} programsMap - Mapa de programas a llenar
     * @private
     */
    parseChannelArray(channels, programsMap) {
        for (const channel of channels) {
            if (!channel || typeof channel !== 'object') continue;
            
            const channelId = channel.id || channel.channelId || channel.name;
            if (!channelId) continue;

            const programs = this.parseChannelPrograms(channel.programs || channel.schedule || []);
            
            if (programs.length > 0) {
                // Asignar channelId a todos los programas
                programs.forEach(program => {
                    program.channelId = channelId;
                });
                
                programsMap.set(channelId, programs);
            }
        }
    }

    /**
     * Parsea formato con objeto channels
     * @param {Object} channels - Objeto de canales
     * @param {Map} programsMap - Mapa de programas a llenar
     * @private
     */
    parseChannelsObject(channels, programsMap) {
        for (const [channelId, channelData] of Object.entries(channels)) {
            if (!channelData || typeof channelData !== 'object') continue;
            
            const programs = this.parseChannelPrograms(
                channelData.programs || 
                channelData.schedule || 
                channelData.epg || 
                []
            );
            
            if (programs.length > 0) {
                // Asignar channelId a todos los programas
                programs.forEach(program => {
                    program.channelId = channelId;
                });
                
                programsMap.set(channelId, programs);
            }
        }
    }

    /**
     * Parsea formato con objeto epg
     * @param {Object} epgData - Datos EPG
     * @param {Map} programsMap - Mapa de programas a llenar
     * @private
     */
    parseEPGObject(epgData, programsMap) {
        if (Array.isArray(epgData)) {
            this.parseChannelArray(epgData, programsMap);
        } else if (typeof epgData === 'object') {
            this.parseChannelsObject(epgData, programsMap);
        }
    }

    /**
     * Parsea formato objeto directo
     * @param {Object} data - Datos directos
     * @param {Map} programsMap - Mapa de programas a llenar
     * @private
     */
    parseDirectObject(data, programsMap) {
        for (const [channelId, channelData] of Object.entries(data)) {
            if (Array.isArray(channelData)) {
                // channelId -> array de programas
                const programs = this.parseChannelPrograms(channelData);
                
                if (programs.length > 0) {
                    programs.forEach(program => {
                        program.channelId = channelId;
                    });
                    
                    programsMap.set(channelId, programs);
                }
            } else if (channelData && typeof channelData === 'object') {
                // channelId -> objeto con programas
                const programs = this.parseChannelPrograms(
                    channelData.programs || 
                    channelData.schedule || 
                    []
                );
                
                if (programs.length > 0) {
                    programs.forEach(program => {
                        program.channelId = channelId;
                    });
                    
                    programsMap.set(channelId, programs);
                }
            }
        }
    }

    /**
     * Parsea programas de un canal
     * @param {Array} programsData - Datos de programas
     * @returns {EPGProgram[]}
     * @private
     */
    parseChannelPrograms(programsData) {
        if (!Array.isArray(programsData)) {
            return [];
        }

        const programs = [];
        
        for (const programData of programsData) {
            try {
                const program = this.parseProgram(programData);
                if (program && this.validateProgram(program)) {
                    programs.push(program);
                }
            } catch (error) {
                console.warn('⚠️ Error parseando programa JSON:', error);
                continue;
            }
        }
        
        return programs;
    }

    /**
     * Parsea un programa individual
     * @param {Object} programData - Datos del programa
     * @returns {EPGProgram|null}
     * @private
     */
    parseProgram(programData) {
        if (!programData || typeof programData !== 'object') {
            return null;
        }

        // Extraer campos básicos con múltiples nombres posibles
        const title = programData.title || programData.name || programData.programme;
        const description = programData.description || programData.desc || programData.summary;
        
        // Parsear fechas
        const startTime = this.parseDate(
            programData.startTime || 
            programData.start || 
            programData.starttime || 
            programData.time
        );
        
        const endTime = this.parseDate(
            programData.endTime || 
            programData.end || 
            programData.endtime || 
            programData.stop
        );

        if (!title || !startTime) {
            return null;
        }

        // Si no hay hora de fin, calcular basándose en duración o estimar
        let finalEndTime = endTime;
        
        if (!finalEndTime) {
            const duration = programData.duration || programData.length || 30; // 30 min por defecto
            const durationMs = typeof duration === 'number' ? 
                duration * 60 * 1000 : // Asumir minutos
                this.parseDuration(duration);
            
            finalEndTime = new Date(startTime.getTime() + durationMs);
        }

        // Géneros
        let genres = null;
        if (programData.genre || programData.category || programData.genres) {
            const genreData = programData.genre || programData.category || programData.genres;
            
            if (Array.isArray(genreData)) {
                genres = genreData.map(g => this.cleanText(String(g))).filter(Boolean);
            } else if (typeof genreData === 'string') {
                genres = [this.cleanText(genreData)];
            }
        }

        // Información de episodio
        let episode = null;
        if (programData.episode || programData.episodeNum) {
            const episodeData = programData.episode || programData.episodeNum;
            
            if (typeof episodeData === 'object') {
                episode = {
                    season: episodeData.season || episodeData.s || null,
                    episode: episodeData.episode || episodeData.e || null,
                    title: episodeData.title || null
                };
            } else if (typeof episodeData === 'string') {
                // Intentar parsear formato "S01E05" o "1.5"
                const match = episodeData.match(/S?(\d+)[E\.](\d+)/i);
                if (match) {
                    episode = {
                        season: parseInt(match[1]),
                        episode: parseInt(match[2]),
                        title: null
                    };
                }
            }
        }

        // Créditos
        let credits = null;
        if (programData.credits || programData.cast) {
            const creditsData = programData.credits || programData.cast;
            credits = {};
            
            if (creditsData.director) {
                credits.director = Array.isArray(creditsData.director) ? 
                    creditsData.director : [creditsData.director];
            }
            
            if (creditsData.actor || creditsData.actors) {
                const actors = creditsData.actor || creditsData.actors;
                credits.actor = Array.isArray(actors) ? actors : [actors];
            }
            
            if (creditsData.writer || creditsData.writers) {
                const writers = creditsData.writer || creditsData.writers;
                credits.writer = Array.isArray(writers) ? writers : [writers];
            }
            
            if (Object.keys(credits).length === 0) {
                credits = null;
            }
        }

        // Rating
        const rating = programData.rating || programData.ageRating || null;

        // Generar ID único
        const programId = this.generateProgramId(startTime, title);

        return {
            id: programId,
            channelId: null, // Se asignará después
            title: this.cleanText(title),
            description: description ? this.cleanText(description) : null,
            startTime: startTime,
            endTime: finalEndTime,
            duration: Math.round((finalEndTime - startTime) / (1000 * 60)),
            genre: genres,
            rating: rating ? this.cleanText(String(rating)) : null,
            episode: episode,
            credits: credits
        };
    }

    /**
     * Parsea una fecha desde varios formatos posibles
     * @param {any} dateValue - Valor de fecha
     * @returns {Date|null}
     * @private
     */
    parseDate(dateValue) {
        if (!dateValue) return null;

        try {
            // Si ya es una fecha
            if (dateValue instanceof Date) {
                return dateValue;
            }

            // Si es un timestamp numérico
            if (typeof dateValue === 'number') {
                // Detectar si es en segundos o milisegundos
                const timestamp = dateValue < 10000000000 ? dateValue * 1000 : dateValue;
                return new Date(timestamp);
            }

            // Si es una cadena
            if (typeof dateValue === 'string') {
                // Intentar parseo directo
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    return date;
                }

                // Intentar formato UNIX timestamp
                const timestamp = parseInt(dateValue);
                if (!isNaN(timestamp)) {
                    const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
                    const tsDate = new Date(ts);
                    if (!isNaN(tsDate.getTime())) {
                        return tsDate;
                    }
                }
            }

            return null;
            
        } catch (error) {
            console.warn('⚠️ Error parseando fecha JSON:', dateValue, error);
            return null;
        }
    }

    /**
     * Parsea duración desde string
     * @param {string} durationStr - Cadena de duración
     * @returns {number} Duración en milisegundos
     * @private
     */
    parseDuration(durationStr) {
        if (typeof durationStr !== 'string') {
            return 30 * 60 * 1000; // 30 minutos por defecto
        }

        // Formato "HH:MM:SS" o "MM:SS"
        const timeMatch = durationStr.match(/^(?:(\d+):)?(\d+):(\d+)$/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1] || '0');
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseInt(timeMatch[3]);
            
            return (hours * 3600 + minutes * 60 + seconds) * 1000;
        }

        // Formato "120m" o "2h"
        const unitMatch = durationStr.match(/^(\d+)([hm])$/i);
        if (unitMatch) {
            const value = parseInt(unitMatch[1]);
            const unit = unitMatch[2].toLowerCase();
            
            if (unit === 'h') {
                return value * 60 * 60 * 1000;
            } else if (unit === 'm') {
                return value * 60 * 1000;
            }
        }

        // Formato numérico (asumir minutos)
        const numMatch = durationStr.match(/^(\d+)$/);
        if (numMatch) {
            return parseInt(numMatch[1]) * 60 * 1000;
        }

        return 30 * 60 * 1000; // Fallback 30 minutos
    }

    /**
     * Limpia y normaliza texto
     * @param {string} text - Texto a limpiar
     * @returns {string}
     * @private
     */
    cleanText(text) {
        if (!text) return '';
        
        return String(text)
            .trim()
            .replace(/\s+/g, ' ') // Normalizar espacios
            .replace(/[\r\n\t]/g, ' ') // Remover saltos de línea y tabs
            .substring(0, 500); // Limitar longitud
    }

    /**
     * Genera un ID único para un programa
     * @param {Date} startTime - Hora de inicio
     * @param {string} title - Título del programa
     * @returns {string}
     * @private
     */
    generateProgramId(startTime, title) {
        const timestamp = startTime.getTime();
        const titleHash = this.simpleHash(title);
        return `json_${timestamp}_${titleHash}`;
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
            program.title &&
            program.startTime instanceof Date &&
            program.endTime instanceof Date &&
            program.startTime < program.endTime
        );
    }

    /**
     * Limpia el parser y libera memoria
     */
    destroy() {
        console.log('🧹 JSONEPGParser destruido');
    }
}

export { JSONEPGParser };