/**
 * Embedded EPG Parser - Parser para EPG embebido en playlists M3U
 * Extrae información de programación incluida en archivos M3U
 */

class EmbeddedEPGParser {
    constructor() {
        console.log('📄 EmbeddedEPGParser inicializado');
    }

    /**
     * Parsea EPG embebido en contenido M3U
     * @param {string} m3uContent - Contenido M3U
     * @returns {Map<string, EPGProgram[]>}
     */
    parse(m3uContent) {
        if (!m3uContent || typeof m3uContent !== 'string') {
            throw new Error('Contenido M3U inválido');
        }

        try {
            console.log('📄 Parseando EPG embebido en M3U...');
            
            const programsMap = new Map();
            const lines = m3uContent.split('\n').map(line => line.trim()).filter(line => line);
            
            let currentChannel = null;
            let programCount = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.startsWith('#EXTINF:')) {
                    // Parsear información del canal
                    currentChannel = this.parseChannelInfo(line);
                } else if (line.startsWith('#EXTEPG:') || line.startsWith('#EPG:')) {
                    // Información EPG específica
                    if (currentChannel) {
                        const epgInfo = this.parseEPGLine(line);
                        if (epgInfo) {
                            this.addEPGInfoToChannel(currentChannel, epgInfo);
                        }
                    }
                } else if (line.startsWith('#EXTPROGRAM:')) {
                    // Programa específico embebido
                    if (currentChannel) {
                        const program = this.parseProgramLine(line);
                        if (program) {
                            this.addProgramToMap(programsMap, currentChannel.id, program);
                            programCount++;
                        }
                    }
                } else if (line && !line.startsWith('#') && currentChannel) {
                    // URL del stream - finalizar procesamiento del canal actual
                    if (currentChannel.epgUrl) {
                        // Si hay URL de EPG, intentar generar programas básicos
                        this.generateBasicPrograms(programsMap, currentChannel);
                    }
                    currentChannel = null;
                }
            }
            
            // Procesar información de programación desde atributos tvg-*
            this.processTVGAttributes(m3uContent, programsMap);
            
            console.log(`✅ EPG embebido parseado: ${programsMap.size} canales, ${programCount} programas`);
            
            return programsMap;
            
        } catch (error) {
            console.error('❌ Error parseando EPG embebido:', error);
            throw error;
        }
    }

    /**
     * Parsea información del canal desde línea EXTINF
     * @param {string} line - Línea EXTINF
     * @returns {Object|null}
     * @private
     */
    parseChannelInfo(line) {
        try {
            // Extraer atributos de la línea EXTINF
            const match = line.match(/#EXTINF:([^,]*),(.*)$/);
            if (!match) return null;

            const attributes = match[1];
            const title = match[2].trim();
            
            const channel = {
                id: null,
                name: title,
                logo: null,
                group: null,
                epgUrl: null,
                epgId: null
            };

            // Extraer atributos específicos
            const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
            let attrMatch;
            
            while ((attrMatch = attrRegex.exec(attributes)) !== null) {
                const [, key, value] = attrMatch;
                
                switch (key.toLowerCase()) {
                    case 'tvg-id':
                        channel.id = value;
                        channel.epgId = value;
                        break;
                    case 'tvg-name':
                        if (!channel.id) channel.id = value;
                        break;
                    case 'tvg-logo':
                        channel.logo = value;
                        break;
                    case 'group-title':
                        channel.group = value;
                        break;
                    case 'tvg-url':
                    case 'epg-url':
                        channel.epgUrl = value;
                        break;
                    case 'tvg-shift':
                        channel.timeShift = parseInt(value) || 0;
                        break;
                }
            }

            // Si no hay ID, usar el nombre como ID
            if (!channel.id) {
                channel.id = this.generateChannelId(channel.name);
            }

            return channel;
            
        } catch (error) {
            console.warn('⚠️ Error parseando información de canal:', error);
            return null;
        }
    }

    /**
     * Parsea línea de información EPG
     * @param {string} line - Línea EPG
     * @returns {Object|null}
     * @private
     */
    parseEPGLine(line) {
        try {
            // Formato: #EXTEPG:url="http://..." shift="0"
            const urlMatch = line.match(/url="([^"]*)"/);
            const shiftMatch = line.match(/shift="([^"]*)"/);
            
            return {
                url: urlMatch ? urlMatch[1] : null,
                shift: shiftMatch ? parseInt(shiftMatch[1]) || 0 : 0
            };
            
        } catch (error) {
            console.warn('⚠️ Error parseando línea EPG:', error);
            return null;
        }
    }

    /**
     * Parsea línea de programa específico
     * @param {string} line - Línea de programa
     * @returns {EPGProgram|null}
     * @private
     */
    parseProgramLine(line) {
        try {
            // Formato: #EXTPROGRAM:start="2023-12-25 14:00" end="2023-12-25 15:30" title="Programa"
            const startMatch = line.match(/start="([^"]*)"/);
            const endMatch = line.match(/end="([^"]*)"/);
            const titleMatch = line.match(/title="([^"]*)"/);
            const descMatch = line.match(/desc="([^"]*)"/);
            const genreMatch = line.match(/genre="([^"]*)"/);
            
            if (!startMatch || !titleMatch) {
                return null;
            }

            const startTime = new Date(startMatch[1]);
            const endTime = endMatch ? new Date(endMatch[1]) : 
                new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min por defecto

            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                return null;
            }

            const programId = this.generateProgramId(startTime, titleMatch[1]);

            return {
                id: programId,
                channelId: null, // Se asignará después
                title: this.cleanText(titleMatch[1]),
                description: descMatch ? this.cleanText(descMatch[1]) : null,
                startTime: startTime,
                endTime: endTime,
                duration: Math.round((endTime - startTime) / (1000 * 60)),
                genre: genreMatch ? [this.cleanText(genreMatch[1])] : null,
                rating: null,
                episode: null,
                credits: null
            };
            
        } catch (error) {
            console.warn('⚠️ Error parseando línea de programa:', error);
            return null;
        }
    }

    /**
     * Añade información EPG a un canal
     * @param {Object} channel - Canal
     * @param {Object} epgInfo - Información EPG
     * @private
     */
    addEPGInfoToChannel(channel, epgInfo) {
        if (epgInfo.url) {
            channel.epgUrl = epgInfo.url;
        }
        if (epgInfo.shift !== undefined) {
            channel.timeShift = epgInfo.shift;
        }
    }

    /**
     * Añade un programa al mapa
     * @param {Map} programsMap - Mapa de programas
     * @param {string} channelId - ID del canal
     * @param {EPGProgram} program - Programa
     * @private
     */
    addProgramToMap(programsMap, channelId, program) {
        program.channelId = channelId;
        
        if (!programsMap.has(channelId)) {
            programsMap.set(channelId, []);
        }
        
        programsMap.get(channelId).push(program);
    }

    /**
     * Genera programas básicos para canales con URL EPG
     * @param {Map} programsMap - Mapa de programas
     * @param {Object} channel - Canal
     * @private
     */
    generateBasicPrograms(programsMap, channel) {
        // Por ahora, solo crear un placeholder
        // En una implementación completa, se podría hacer fetch de la URL EPG
        const now = new Date();
        const program = {
            id: this.generateProgramId(now, 'Programación'),
            channelId: channel.id,
            title: 'Programación disponible',
            description: `Consulte la guía EPG en: ${channel.epgUrl}`,
            startTime: now,
            endTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hora
            duration: 60,
            genre: null,
            rating: null,
            episode: null,
            credits: null
        };
        
        this.addProgramToMap(programsMap, channel.id, program);
    }

    /**
     * Procesa atributos TVG para extraer información adicional
     * @param {string} m3uContent - Contenido M3U
     * @param {Map} programsMap - Mapa de programas
     * @private
     */
    processTVGAttributes(m3uContent, programsMap) {
        // Buscar patrones de información de programación en comentarios
        const lines = m3uContent.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('#') && line.includes('tvg-')) {
                // Buscar información de programación en comentarios especiales
                this.extractProgramInfoFromComment(line, programsMap);
            }
        }
    }

    /**
     * Extrae información de programa desde comentarios
     * @param {string} comment - Línea de comentario
     * @param {Map} programsMap - Mapa de programas
     * @private
     */
    extractProgramInfoFromComment(comment, programsMap) {
        // Buscar patrones como:
        // # Canal: Programa actual (14:00-15:30) - Descripción
        const programMatch = comment.match(/#\s*([^:]+):\s*([^(]+)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)\s*-?\s*(.*)?/);
        
        if (programMatch) {
            const [, channelName, title, startTime, endTime, description] = programMatch;
            
            const channelId = this.generateChannelId(channelName.trim());
            const today = new Date();
            
            const start = this.parseTimeToday(startTime.trim(), today);
            const end = this.parseTimeToday(endTime.trim(), today);
            
            if (start && end && start < end) {
                const program = {
                    id: this.generateProgramId(start, title.trim()),
                    channelId: channelId,
                    title: this.cleanText(title.trim()),
                    description: description ? this.cleanText(description.trim()) : null,
                    startTime: start,
                    endTime: end,
                    duration: Math.round((end - start) / (1000 * 60)),
                    genre: null,
                    rating: null,
                    episode: null,
                    credits: null
                };
                
                this.addProgramToMap(programsMap, channelId, program);
            }
        }
    }

    /**
     * Parsea hora del día actual
     * @param {string} timeStr - Cadena de tiempo (HH:MM)
     * @param {Date} baseDate - Fecha base
     * @returns {Date|null}
     * @private
     */
    parseTimeToday(timeStr, baseDate) {
        const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        
        if (hours > 23 || minutes > 59) return null;
        
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        
        return date;
    }

    /**
     * Genera un ID de canal basado en el nombre
     * @param {string} name - Nombre del canal
     * @returns {string}
     * @private
     */
    generateChannelId(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
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
        return `embedded_${timestamp}_${titleHash}`;
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
            .substring(0, 200); // Limitar longitud
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
     * Limpia el parser y libera memoria
     */
    destroy() {
        console.log('🧹 EmbeddedEPGParser destruido');
    }
}

export { EmbeddedEPGParser };