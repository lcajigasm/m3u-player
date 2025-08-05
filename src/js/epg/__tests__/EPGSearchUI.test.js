/**
 * Tests para EPGSearchUI
 * Prueba la interfaz de usuario de búsqueda EPG
 */

// Mock DOM para tests
const createMockDOM = () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="epgSearch"></div>
        <div id="clearEpgSearchBtn"></div>
        <div id="epgSearchSuggestions"></div>
        <div id="epgSearchFilters"></div>
        <div id="epgFiltersBtn"></div>
        <div id="epgGenreFilter"></div>
        <div id="epgChannelFilter"></div>
        <div id="epgTimeFilter"></div>
        <div id="epgClearFilters"></div>
        <div id="epgSearchResults"></div>
        <div id="searchResultsTitle"></div>
        <div id="searchResultsCount"></div>
        <div id="backToGridBtn"></div>
        <div id="searchResultsList"></div>
        <div id="searchPagination"></div>
        <div id="prevPageBtn"></div>
        <div id="nextPageBtn"></div>
        <div id="pageInfo"></div>
        <div id="epgGridContainer"></div>
    `;
    return container;
};

// Mock EPGManager
const createMockEPGManager = () => ({
    searchManager: {
        buildSearchIndex: jest.fn(),
        search: jest.fn(() => []),
        searchWithDebounce: jest.fn(),
        setFilter: jest.fn(),
        clearFilters: jest.fn(),
        getAvailableGenres: jest.fn(() => ['Noticias', 'Deportes']),
        getAvailableChannels: jest.fn(() => [
            { id: 'ch1', name: 'Canal 1' },
            { id: 'ch2', name: 'Canal 2' }
        ])
    },
    reminderManager: {
        addReminder: jest.fn()
    },
    emit: jest.fn(),
    getCurrentProgram: jest.fn(),
    changeChannel: jest.fn()
});

// Mock search results
const mockSearchResults = [
    {
        program: {
            id: 'prog1',
            title: 'Noticias de la Mañana',
            description: 'Programa informativo matutino',
            startTime: new Date('2024-01-01T08:00:00'),
            endTime: new Date('2024-01-01T09:00:00'),
            genre: ['Noticias']
        },
        channel: {
            id: 'ch1',
            name: 'Canal 1'
        },
        score: 95
    },
    {
        program: {
            id: 'prog2',
            title: 'Deportes al Mediodía',
            description: 'Resumen deportivo completo',
            startTime: new Date('2024-01-01T12:00:00'),
            endTime: new Date('2024-01-01T13:00:00'),
            genre: ['Deportes']
        },
        channel: {
            id: 'ch2',
            name: 'Canal 2'
        },
        score: 85
    }
];

describe('EPGSearchUI', () => {
    let searchUI;
    let container;
    let mockEPGManager;

    beforeEach(() => {
        container = createMockDOM();
        mockEPGManager = createMockEPGManager();
        document.body.appendChild(container);
        
        // Mock querySelector methods
        jest.spyOn(container, 'querySelector').mockImplementation((selector) => {
            return container.querySelector(selector) || document.createElement('div');
        });
        
        searchUI = new (require('../EPGSearchUI.js').EPGSearchUI)(container, mockEPGManager);
    });

    afterEach(() => {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        if (searchUI) {
            searchUI.destroy();
        }
    });

    describe('Inicialización', () => {
        test('debería inicializar correctamente', () => {
            expect(searchUI.container).toBe(container);
            expect(searchUI.epgManager).toBe(mockEPGManager);
            expect(searchUI.isSearchMode).toBe(false);
            expect(searchUI.currentPage).toBe(1);
            expect(searchUI.resultsPerPage).toBe(20);
        });

        test('debería configurar event listeners', () => {
            // Verificar que los elementos existen
            expect(searchUI.elements.searchInput).toBeDefined();
            expect(searchUI.elements.clearSearchBtn).toBeDefined();
            expect(searchUI.elements.filtersBtn).toBeDefined();
        });
    });

    describe('Inicialización de filtros', () => {
        test('debería inicializar filtros de género', () => {
            searchUI.initializeFilters();
            
            expect(mockEPGManager.searchManager.getAvailableGenres).toHaveBeenCalled();
        });

        test('debería inicializar filtros de canal', () => {
            searchUI.initializeFilters();
            
            expect(mockEPGManager.searchManager.getAvailableChannels).toHaveBeenCalled();
        });
    });

    describe('Búsqueda', () => {
        test('debería manejar búsqueda con debouncing', () => {
            const searchInput = searchUI.elements.searchInput;
            searchInput.value = 'noticias';
            
            // Simular evento de input
            const inputEvent = new Event('input');
            searchInput.dispatchEvent(inputEvent);
            
            expect(mockEPGManager.searchManager.searchWithDebounce).toHaveBeenCalledWith(
                'noticias',
                expect.any(Function)
            );
        });

        test('debería mostrar resultados de búsqueda', () => {
            searchUI.showSearchResults(mockSearchResults);
            
            expect(searchUI.isSearchMode).toBe(true);
            expect(searchUI.currentResults).toEqual(mockSearchResults);
        });

        test('debería limpiar búsqueda correctamente', () => {
            // Establecer estado de búsqueda
            searchUI.isSearchMode = true;
            searchUI.currentResults = mockSearchResults;
            searchUI.elements.searchInput.value = 'test';
            
            searchUI.clearSearch();
            
            expect(searchUI.isSearchMode).toBe(false);
            expect(searchUI.currentResults).toEqual([]);
            expect(searchUI.elements.searchInput.value).toBe('');
            expect(mockEPGManager.searchManager.clearFilters).toHaveBeenCalled();
        });
    });

    describe('Filtros', () => {
        test('debería aplicar filtro de género', () => {
            searchUI.elements.genreFilter.value = 'Deportes';
            
            // Simular evento de cambio
            const changeEvent = new Event('change');
            searchUI.elements.genreFilter.dispatchEvent(changeEvent);
            
            expect(mockEPGManager.searchManager.setFilter).toHaveBeenCalledWith(
                'genre', 'Deportes'
            );
        });

        test('debería aplicar filtro de canal', () => {
            searchUI.elements.channelFilter.value = 'ch1';
            
            const changeEvent = new Event('change');
            searchUI.elements.channelFilter.dispatchEvent(changeEvent);
            
            expect(mockEPGManager.searchManager.setFilter).toHaveBeenCalledWith(
                'channel', 'ch1'
            );
        });

        test('debería aplicar filtro de tiempo', () => {
            searchUI.elements.timeFilter.value = 'today';
            
            const changeEvent = new Event('change');
            searchUI.elements.timeFilter.dispatchEvent(changeEvent);
            
            expect(mockEPGManager.searchManager.setFilter).toHaveBeenCalledWith(
                'timeRange', 'today'
            );
        });

        test('debería limpiar todos los filtros', () => {
            // Simular clic en limpiar filtros
            const clickEvent = new Event('click');
            searchUI.elements.clearFiltersBtn.dispatchEvent(clickEvent);
            
            expect(mockEPGManager.searchManager.clearFilters).toHaveBeenCalled();
        });

        test('debería alternar visibilidad de filtros', () => {
            const initialDisplay = searchUI.elements.searchFilters.style.display;
            
            searchUI.toggleFilters();
            
            expect(searchUI.elements.searchFilters.style.display).not.toBe(initialDisplay);
        });
    });

    describe('Renderizado de resultados', () => {
        test('debería renderizar lista de resultados', () => {
            const mockResults = mockSearchResults.slice(0, 5); // Menos de una página
            
            searchUI.renderSearchResults(mockResults);
            
            // Verificar que se renderizan los resultados
            expect(searchUI.elements.searchResultsList.children.length).toBeGreaterThan(0);
        });

        test('debería renderizar paginación cuando hay muchos resultados', () => {
            // Crear más resultados de los que caben en una página
            const manyResults = Array.from({ length: 25 }, (_, i) => ({
                ...mockSearchResults[0],
                program: { ...mockSearchResults[0].program, id: `prog${i}` }
            }));
            
            searchUI.renderSearchResults(manyResults);
            
            // Debería mostrar paginación
            expect(searchUI.elements.searchPagination.style.display).not.toBe('none');
        });

        test('debería crear elemento de resultado correctamente', () => {
            const resultElement = searchUI.createSearchResultElement(mockSearchResults[0]);
            
            expect(resultElement.classList.contains('search-result-item')).toBe(true);
            expect(resultElement.textContent).toContain('Noticias de la Mañana');
            expect(resultElement.textContent).toContain('Canal 1');
        });

        test('debería formatear tiempo correctamente', () => {
            const time = new Date('2024-01-01T15:30:00');
            const formatted = searchUI.formatTime(time);
            
            expect(formatted).toBe('15:30');
        });

        test('debería formatear duración correctamente', () => {
            const start = new Date('2024-01-01T15:00:00');
            const end = new Date('2024-01-01T16:30:00');
            const duration = searchUI.formatDuration(start, end);
            
            expect(duration).toBe('1h 30m');
        });
    });

    describe('Paginación', () => {
        beforeEach(() => {
            // Crear muchos resultados para probar paginación
            const manyResults = Array.from({ length: 50 }, (_, i) => ({
                ...mockSearchResults[0],
                program: { ...mockSearchResults[0].program, id: `prog${i}` }
            }));
            searchUI.currentResults = manyResults;
            searchUI.totalResults = manyResults.length;
        });

        test('debería navegar a página siguiente', () => {
            const initialPage = searchUI.currentPage;
            
            searchUI.nextPage();
            
            expect(searchUI.currentPage).toBe(initialPage + 1);
        });

        test('debería navegar a página anterior', () => {
            searchUI.currentPage = 2;
            
            searchUI.prevPage();
            
            expect(searchUI.currentPage).toBe(1);
        });

        test('no debería ir más allá de la primera página', () => {
            searchUI.currentPage = 1;
            
            searchUI.prevPage();
            
            expect(searchUI.currentPage).toBe(1);
        });

        test('no debería ir más allá de la última página', () => {
            const totalPages = Math.ceil(searchUI.totalResults / searchUI.resultsPerPage);
            searchUI.currentPage = totalPages;
            
            searchUI.nextPage();
            
            expect(searchUI.currentPage).toBe(totalPages);
        });

        test('debería calcular páginas totales correctamente', () => {
            const totalPages = searchUI.getTotalPages();
            const expected = Math.ceil(searchUI.totalResults / searchUI.resultsPerPage);
            
            expect(totalPages).toBe(expected);
        });

        test('debería obtener resultados de página actual', () => {
            searchUI.currentPage = 2;
            searchUI.resultsPerPage = 20;
            
            const pageResults = searchUI.getCurrentPageResults();
            
            expect(pageResults.length).toBe(20);
            expect(pageResults[0].program.id).toBe('prog20'); // Segundo página empieza en índice 20
        });
    });

    describe('Acciones de resultados', () => {
        test('debería manejar "ver ahora" correctamente', () => {
            const result = mockSearchResults[0];
            
            searchUI.handleWatchNow(result);
            
            expect(mockEPGManager.changeChannel).toHaveBeenCalledWith(result.channel.id);
        });

        test('debería manejar "ver detalles" correctamente', () => {
            const result = mockSearchResults[0];
            
            searchUI.handleShowDetails(result);
            
            expect(mockEPGManager.emit).toHaveBeenCalledWith('showProgramDetails', result.program);
        });

        test('debería manejar "agregar recordatorio" correctamente', () => {
            const result = mockSearchResults[0];
            
            searchUI.handleSetReminder(result);
            
            expect(mockEPGManager.reminderManager.addReminder).toHaveBeenCalledWith(
                result.program.id,
                result.channel.id,
                result.program.startTime
            );
        });
    });

    describe('Estados de interfaz', () => {
        test('debería mostrar estado de búsqueda', () => {
            searchUI.showSearchMode();
            
            expect(searchUI.isSearchMode).toBe(true);
            expect(searchUI.elements.searchResults.style.display).not.toBe('none');
            expect(searchUI.elements.gridContainer.style.display).toBe('none');
        });

        test('debería mostrar estado de grilla', () => {
            searchUI.isSearchMode = true;
            
            searchUI.showGridMode();
            
            expect(searchUI.isSearchMode).toBe(false);
            expect(searchUI.elements.searchResults.style.display).toBe('none');
            expect(searchUI.elements.gridContainer.style.display).not.toBe('none');
        });

        test('debería mostrar mensaje sin resultados', () => {
            searchUI.showNoResults();
            
            expect(searchUI.elements.searchResultsList.textContent).toContain('No se encontraron');
        });

        test('debería mostrar estado de carga', () => {
            searchUI.showLoading();
            
            expect(searchUI.elements.searchResultsList.textContent).toContain('Buscando');
        });
    });

    describe('Limpieza y destrucción', () => {
        test('debería limpiar eventos correctamente', () => {
            const removeEventListenerSpy = jest.spyOn(container, 'removeEventListener');
            
            searchUI.destroy();
            
            expect(removeEventListenerSpy).toHaveBeenCalled();
        });

        test('debería restablecer estado inicial', () => {
            searchUI.isSearchMode = true;
            searchUI.currentResults = mockSearchResults;
            searchUI.currentPage = 3;
            
            searchUI.destroy();
            
            expect(searchUI.isSearchMode).toBe(false);
            expect(searchUI.currentResults).toEqual([]);
            expect(searchUI.currentPage).toBe(1);
        });
    });
});
