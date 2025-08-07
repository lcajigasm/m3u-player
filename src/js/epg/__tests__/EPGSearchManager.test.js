/**
 * Tests para EPGSearchManager
 * Prueba la funcionalidad de búsqueda, indexado y filtros
 */

// Mock data para tests
const mockChannels = [
    {
        id: 'ch1',
        name: 'Canal 1',
        group: 'Noticias',
        programs: [
            {
                id: 'prog1',
                title: 'Noticias de la Mañana',
                description: 'Programa de noticias matutino con las últimas novedades',
                startTime: new Date('2024-01-01T08:00:00'),
                endTime: new Date('2024-01-01T09:00:00'),
                genre: ['Noticias', 'Información'],
                duration: 60
            },
            {
                id: 'prog2',
                title: 'Deportes al Mediodía',
                description: 'Resumen deportivo con los mejores momentos',
                startTime: new Date('2024-01-01T12:00:00'),
                endTime: new Date('2024-01-01T13:00:00'),
                genre: ['Deportes'],
                duration: 60
            }
        ]
    },
    {
        id: 'ch2',
        name: 'Canal Deportivo',
        group: 'Deportes',
        programs: [
            {
                id: 'prog3',
                title: 'Fútbol Internacional',
                description: 'Los mejores partidos de fútbol del mundo',
                startTime: new Date('2024-01-01T20:00:00'),
                endTime: new Date('2024-01-01T22:00:00'),
                genre: ['Deportes', 'Fútbol'],
                duration: 120
            },
            {
                id: 'prog4',
                title: 'Tenis Masters',
                description: 'Torneo de tenis profesional',
                startTime: new Date('2024-01-01T15:00:00'),
                endTime: new Date('2024-01-01T17:00:00'),
                genre: ['Deportes', 'Tenis'],
                duration: 120
            }
        ]
    }
];

describe('EPGSearchManager', () => {
    let searchManager;

    beforeEach(() => {
        // Simular importación dinámica
        global.performance = { now: jest.fn(() => Date.now()) };
        
        // Crear instancia del manager
        searchManager = new (require('../EPGSearchManager.js').EPGSearchManager)();
    });

    afterEach(() => {
        if (searchManager) {
            searchManager.destroy();
        }
    });

    describe('Construcción del índice de búsqueda', () => {
        test('debería construir el índice correctamente', () => {
            searchManager.buildSearchIndex(mockChannels);
            
            expect(searchManager.searchIndex.size).toBe(4);
            
            // Verificar que todos los programas están indexados
            expect(searchManager.searchIndex.has('prog1')).toBe(true);
            expect(searchManager.searchIndex.has('prog2')).toBe(true);
            expect(searchManager.searchIndex.has('prog3')).toBe(true);
            expect(searchManager.searchIndex.has('prog4')).toBe(true);
        });

        test('debería crear datos de búsqueda correctos', () => {
            searchManager.buildSearchIndex(mockChannels);
            
            const searchData = searchManager.searchIndex.get('prog1');
            
            expect(searchData).toBeDefined();
            expect(searchData.program.title).toBe('Noticias de la Mañana');
            expect(searchData.channel.name).toBe('Canal 1');
            expect(searchData.titleWords).toContain('noticias');
            expect(searchData.titleWords).toContain('mañana');
            expect(searchData.genreWords).toContain('noticias');
            expect(searchData.channelWords).toContain('canal');
        });

        test('debería manejar canales sin programas', () => {
            const channelsWithEmpty = [
                ...mockChannels,
                { id: 'ch3', name: 'Canal Vacío', programs: [] }
            ];
            
            searchManager.buildSearchIndex(channelsWithEmpty);
            
            expect(searchManager.searchIndex.size).toBe(4); // Solo 4 programas indexados
        });
    });

    describe('Keyword extraction', () => {
        test('should correctly extract keywords', () => {
            const keywords = searchManager.extractKeywords('Morning News in English');
            
            expect(keywords).toContain('morning');
            expect(keywords).toContain('news');
            expect(keywords).toContain('english');
            expect(keywords).not.toContain('in'); // Stop word
            expect(keywords).not.toContain('the'); // Stop word
            expect(keywords).not.toContain('at'); // Stop word
        });

        test('should filter very short words', () => {
            const keywords = searchManager.extractKeywords('TV HD 4K UHD');
            
            expect(keywords).toContain('uhd'); // 3 chars, valid
            expect(keywords).not.toContain('tv'); // 2 caracteres, muy corto
            expect(keywords).not.toContain('hd'); // 2 caracteres, muy corto
        });

        test('debería manejar acentos y caracteres especiales', () => {
            const keywords = searchManager.extractKeywords('Fútbol Español - Temporada 2024');
            
            expect(keywords).toContain('fútbol');
            expect(keywords).toContain('español');
            expect(keywords).toContain('temporada');
            expect(keywords).toContain('2024');
        });
    });

    describe('Búsqueda de programas', () => {
        beforeEach(() => {
            searchManager.buildSearchIndex(mockChannels);
        });

        test('debería encontrar programas por título', () => {
            const results = searchManager.search('noticias');
            
            expect(results.length).toBe(1);
            expect(results[0].program.title).toBe('Noticias de la Mañana');
        });

        test('debería encontrar programas por descripción', () => {
            const results = searchManager.search('deportivo');
            
            expect(results.length).toBe(1);
            expect(results[0].program.title).toBe('Deportes al Mediodía');
        });

        test('debería encontrar programas por género', () => {
            const results = searchManager.search('deportes');
            
            expect(results.length).toBe(3); // 3 programas con género deportes
            expect(results.map(r => r.program.id)).toContain('prog2');
            expect(results.map(r => r.program.id)).toContain('prog3');
            expect(results.map(r => r.program.id)).toContain('prog4');
        });

        test('debería ordenar resultados por relevancia', () => {
            const results = searchManager.search('deportes');
            
            // El programa con "Deportes" en el título debería tener mayor score
            expect(results[0].program.title).toBe('Deportes al Mediodía');
            expect(results[0].score).toBeGreaterThan(results[1].score);
        });

        test('debería manejar búsquedas vacías', () => {
            expect(searchManager.search('')).toEqual([]);
            expect(searchManager.search('   ')).toEqual([]);
            expect(searchManager.search('a')).toEqual([]); // Muy corto
        });

        test('debería manejar búsquedas sin resultados', () => {
            const results = searchManager.search('inexistente');
            expect(results).toEqual([]);
        });
    });

    describe('Filtros de búsqueda', () => {
        beforeEach(() => {
            searchManager.buildSearchIndex(mockChannels);
        });

        test('debería filtrar por género', () => {
            searchManager.setFilter('genre', 'Fútbol');
            const results = searchManager.search('deportes');
            
            expect(results.length).toBe(1);
            expect(results[0].program.title).toBe('Fútbol Internacional');
        });

        test('debería filtrar por canal', () => {
            searchManager.setFilter('channel', 'ch2');
            const results = searchManager.search('deportes');
            
            expect(results.length).toBe(2);
            expect(results.every(r => r.channel.id === 'ch2')).toBe(true);
        });

        test('debería filtrar por rango de tiempo', () => {
            // Mock para tiempo actual
            const mockNow = new Date('2024-01-01T10:00:00');
            jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());
            
            searchManager.setFilter('timeRange', 'today');
            const results = searchManager.search('');
            
            // Todos los programas son del mismo día
            expect(results.length).toBe(4);
        });

        test('debería combinar múltiples filtros', () => {
            searchManager.setFilter('genre', 'Deportes');
            searchManager.setFilter('channel', 'ch2');
            
            const results = searchManager.search('');
            
            expect(results.length).toBe(2);
            expect(results.every(r => r.channel.id === 'ch2')).toBe(true);
            expect(results.every(r => r.program.genre.includes('Deportes'))).toBe(true);
        });

        test('debería limpiar filtros correctamente', () => {
            searchManager.setFilter('genre', 'Deportes');
            searchManager.setFilter('channel', 'ch2');
            
            searchManager.clearFilters();
            
            expect(searchManager.filters.genre).toBeNull();
            expect(searchManager.filters.channel).toBeNull();
            expect(searchManager.filters.timeRange).toBeNull();
        });
    });

    describe('Búsqueda con debouncing', () => {
        beforeEach(() => {
            searchManager.buildSearchIndex(mockChannels);
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('debería aplicar debouncing correctamente', () => {
            const callback = jest.fn();
            
            // Múltiples búsquedas rápidas
            searchManager.searchWithDebounce('not', callback);
            searchManager.searchWithDebounce('noti', callback);
            searchManager.searchWithDebounce('noticias', callback);
            
            // No debería haberse llamado aún
            expect(callback).not.toHaveBeenCalled();
            
            // Avanzar el tiempo
            jest.advanceTimersByTime(300);
            
            // Ahora debería haberse llamado una vez con la última búsqueda
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        program: expect.objectContaining({
                            title: 'Noticias de la Mañana'
                        })
                    })
                ])
            );
        });
    });

    describe('Géneros y canales disponibles', () => {
        beforeEach(() => {
            searchManager.buildSearchIndex(mockChannels);
        });

        test('debería obtener géneros únicos', () => {
            const genres = searchManager.getAvailableGenres();
            
            expect(genres).toContain('Noticias');
            expect(genres).toContain('Deportes');
            expect(genres).toContain('Información');
            expect(genres).toContain('Fútbol');
            expect(genres).toContain('Tenis');
            
            // Verificar que no hay duplicados
            const uniqueGenres = [...new Set(genres)];
            expect(genres.length).toBe(uniqueGenres.length);
        });

        test('debería obtener canales únicos', () => {
            const channels = searchManager.getAvailableChannels();
            
            expect(channels).toHaveLength(2);
            expect(channels.map(c => c.id)).toContain('ch1');
            expect(channels.map(c => c.id)).toContain('ch2');
            expect(channels.map(c => c.name)).toContain('Canal 1');
            expect(channels.map(c => c.name)).toContain('Canal Deportivo');
        });
    });

    describe('Estadísticas de búsqueda', () => {
        beforeEach(() => {
            searchManager.buildSearchIndex(mockChannels);
        });

        test('debería proporcionar estadísticas correctas', () => {
            searchManager.search('deportes');
            searchManager.setFilter('genre', 'Deportes');
            
            const stats = searchManager.getSearchStats();
            
            expect(stats.totalPrograms).toBe(4);
            expect(stats.currentQuery).toBe('deportes');
            expect(stats.resultCount).toBe(3);
            expect(stats.activeFilters.genre).toBe('Deportes');
            expect(stats.availableGenres).toBe(5);
            expect(stats.availableChannels).toBe(2);
        });
    });

    describe('Limpieza y destrucción', () => {
        test('debería limpiar correctamente', () => {
            searchManager.buildSearchIndex(mockChannels);
            searchManager.search('test');
            
            searchManager.clear();
            
            expect(searchManager.searchIndex.size).toBe(0);
            expect(searchManager.searchResults).toEqual([]);
            expect(searchManager.currentQuery).toBe('');
            expect(searchManager.filters.genre).toBeNull();
        });

        test('debería destruir correctamente', () => {
            const clearSpy = jest.spyOn(searchManager, 'clear');
            
            searchManager.destroy();
            
            expect(clearSpy).toHaveBeenCalled();
        });
    });
});
