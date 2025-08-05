/**
 * Tests unitarios para EPGCache
 */

import { EPGCache } from '../EPGCache.js';

// Mock de IndexedDB para testing
global.indexedDB = {
    open: jest.fn(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
            transaction: jest.fn(() => ({
                objectStore: jest.fn(() => ({
                    put: jest.fn(),
                    get: jest.fn(() => ({
                        onsuccess: null,
                        onerror: null,
                        result: null
                    })),
                    createIndex: jest.fn()
                }))
            })),
            objectStoreNames: {
                contains: jest.fn(() => false)
            },
            close: jest.fn()
        }
    }))
};

// Mock de localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    key: jest.fn(),
    length: 0,
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock de Blob para estimación de tamaño
global.Blob = jest.fn().mockImplementation((content) => ({
    size: JSON.stringify(content).length
}));

describe('EPGCache', () => {
    let cache;
    let mockPrograms;

    beforeEach(() => {
        // Limpiar mocks
        jest.clearAllMocks();
        localStorageMock.length = 0;
        
        // Crear instancia de caché
        cache = new EPGCache();
        
        // Datos de prueba
        mockPrograms = [
            {
                id: 'prog1',
                channelId: 'ch1',
                title: 'Programa 1',
                description: 'Descripción del programa 1',
                startTime: new Date('2024-01-01T20:00:00Z'),
                endTime: new Date('2024-01-01T21:00:00Z'),
                duration: 3600,
                genre: ['Drama']
            },
            {
                id: 'prog2',
                channelId: 'ch1',
                title: 'Programa 2',
                description: 'Descripción del programa 2',
                startTime: new Date('2024-01-01T21:00:00Z'),
                endTime: new Date('2024-01-01T22:00:00Z'),
                duration: 3600,
                genre: ['Comedia']
            }
        ];
    });

    afterEach(() => {
        if (cache) {
            cache.destroy();
        }
    });

    describe('Constructor', () => {
        test('debe inicializar correctamente', () => {
            expect(cache.memoryCache).toBeInstanceOf(Map);
            expect(cache.localStoragePrefix).toBe('epg_cache_');
            expect(cache.indexedDBName).toBe('EPGDatabase');
            expect(cache.config).toBeDefined();
            expect(cache.config.memoryMaxSize).toBe(50 * 1024 * 1024);
        });
    });

    describe('store()', () => {
        test('debe almacenar programas correctamente', async () => {
            const channelId = 'test-channel';
            
            await cache.store(channelId, mockPrograms);
            
            // Verificar que se almacenó en memoria
            expect(cache.memoryCache.has(channelId)).toBe(true);
            
            const entry = cache.memoryCache.get(channelId);
            expect(entry.programs).toEqual(mockPrograms);
            expect(entry.lastUpdated).toBeInstanceOf(Date);
            expect(entry.expiresAt).toBeInstanceOf(Date);
            expect(entry.size).toBeGreaterThan(0);
        });

        test('debe rechazar parámetros inválidos', async () => {
            await expect(cache.store(null, mockPrograms)).rejects.toThrow('Parámetros inválidos');
            await expect(cache.store('channel', null)).rejects.toThrow('Parámetros inválidos');
            await expect(cache.store('channel', 'not-array')).rejects.toThrow('Parámetros inválidos');
        });

        test('debe calcular el tamaño correctamente', async () => {
            const channelId = 'test-channel';
            
            await cache.store(channelId, mockPrograms);
            
            const entry = cache.memoryCache.get(channelId);
            expect(entry.size).toBeGreaterThan(0);
            expect(typeof entry.size).toBe('number');
        });
    });

    describe('retrieve()', () => {
        test('debe recuperar programas de memoria', async () => {
            const channelId = 'test-channel';
            
            // Almacenar primero
            await cache.store(channelId, mockPrograms);
            
            // Recuperar
            const retrieved = await cache.retrieve(channelId);
            
            expect(retrieved).toEqual(mockPrograms);
        });

        test('debe retornar null para canal inexistente', async () => {
            const retrieved = await cache.retrieve('nonexistent-channel');
            expect(retrieved).toBeNull();
        });

        test('debe retornar null para channelId inválido', async () => {
            const retrieved = await cache.retrieve(null);
            expect(retrieved).toBeNull();
        });

        test('debe filtrar programas por rango de tiempo', async () => {
            const channelId = 'test-channel';
            await cache.store(channelId, mockPrograms);
            
            const timeRange = {
                start: new Date('2024-01-01T20:30:00Z'),
                end: new Date('2024-01-01T21:30:00Z')
            };
            
            const retrieved = await cache.retrieve(channelId, timeRange);
            
            // Debe incluir ambos programas ya que se solapan con el rango
            expect(retrieved).toHaveLength(2);
        });
    });

    describe('retrieveMultiple()', () => {
        test('debe recuperar datos para múltiples canales', async () => {
            const channelIds = ['ch1', 'ch2'];
            
            // Almacenar datos para ambos canales
            await cache.store('ch1', mockPrograms);
            await cache.store('ch2', mockPrograms);
            
            const results = await cache.retrieveMultiple(channelIds);
            
            expect(results).toBeInstanceOf(Map);
            expect(results.size).toBe(2);
            expect(results.has('ch1')).toBe(true);
            expect(results.has('ch2')).toBe(true);
        });

        test('debe manejar canales sin datos', async () => {
            const channelIds = ['ch1', 'nonexistent'];
            
            await cache.store('ch1', mockPrograms);
            
            const results = await cache.retrieveMultiple(channelIds);
            
            expect(results.size).toBe(1);
            expect(results.has('ch1')).toBe(true);
            expect(results.has('nonexistent')).toBe(false);
        });
    });

    describe('isExpired()', () => {
        test('debe detectar fechas expiradas', () => {
            const pastDate = new Date(Date.now() - 1000);
            const futureDate = new Date(Date.now() + 1000);
            
            expect(cache.isExpired(pastDate)).toBe(true);
            expect(cache.isExpired(futureDate)).toBe(false);
        });

        test('debe considerar fechas nulas como expiradas', () => {
            expect(cache.isExpired(null)).toBe(true);
            expect(cache.isExpired(undefined)).toBe(true);
        });
    });

    describe('cleanup()', () => {
        test('debe limpiar entradas expiradas de memoria', async () => {
            const channelId = 'test-channel';
            
            // Almacenar con fecha de expiración en el pasado
            await cache.store(channelId, mockPrograms);
            const entry = cache.memoryCache.get(channelId);
            entry.expiresAt = new Date(Date.now() - 1000); // Expirado
            
            await cache.cleanup();
            
            expect(cache.memoryCache.has(channelId)).toBe(false);
        });

        test('debe mantener entradas válidas', async () => {
            const channelId = 'test-channel';
            
            await cache.store(channelId, mockPrograms);
            
            await cache.cleanup();
            
            expect(cache.memoryCache.has(channelId)).toBe(true);
        });
    });

    describe('getStorageStats()', () => {
        test('debe retornar estadísticas correctas', async () => {
            await cache.store('ch1', mockPrograms);
            
            const stats = cache.getStorageStats();
            
            expect(stats).toHaveProperty('memory');
            expect(stats).toHaveProperty('localStorage');
            expect(stats).toHaveProperty('indexedDB');
            
            expect(stats.memory.entries).toBe(1);
            expect(stats.memory.sizeBytes).toBeGreaterThan(0);
            expect(stats.memory.sizeMB).toBeGreaterThan(0);
        });
    });

    describe('filterProgramsByTimeRange()', () => {
        test('debe filtrar programas correctamente', () => {
            const timeRange = {
                start: new Date('2024-01-01T20:30:00Z'),
                end: new Date('2024-01-01T21:30:00Z')
            };
            
            const filtered = cache.filterProgramsByTimeRange(mockPrograms, timeRange);
            
            // Ambos programas se solapan con el rango
            expect(filtered).toHaveLength(2);
        });

        test('debe retornar todos los programas sin rango de tiempo', () => {
            const filtered = cache.filterProgramsByTimeRange(mockPrograms, null);
            expect(filtered).toEqual(mockPrograms);
        });

        test('debe manejar programas nulos', () => {
            const filtered = cache.filterProgramsByTimeRange(null, {});
            expect(filtered).toBeNull();
        });
    });

    describe('isCurrentDay()', () => {
        test('debe detectar programas del día actual', () => {
            const todayPrograms = [
                {
                    ...mockPrograms[0],
                    startTime: new Date() // Hoy
                }
            ];
            
            expect(cache.isCurrentDay(todayPrograms)).toBe(true);
        });

        test('debe detectar programas de otros días', () => {
            const oldPrograms = [
                {
                    ...mockPrograms[0],
                    startTime: new Date('2020-01-01T20:00:00Z') // Pasado
                }
            ];
            
            expect(cache.isCurrentDay(oldPrograms)).toBe(false);
        });

        test('debe manejar listas vacías', () => {
            expect(cache.isCurrentDay([])).toBe(false);
            expect(cache.isCurrentDay(null)).toBe(false);
        });
    });

    describe('estimateSize()', () => {
        test('debe estimar el tamaño correctamente', () => {
            const size = cache.estimateSize(mockPrograms);
            
            expect(size).toBeGreaterThan(0);
            expect(typeof size).toBe('number');
        });

        test('debe retornar 0 para listas vacías', () => {
            expect(cache.estimateSize([])).toBe(0);
            expect(cache.estimateSize(null)).toBe(0);
        });
    });

    describe('calculateMemorySize()', () => {
        test('debe calcular el tamaño total de memoria', async () => {
            await cache.store('ch1', mockPrograms);
            await cache.store('ch2', mockPrograms);
            
            const totalSize = cache.calculateMemorySize();
            
            expect(totalSize).toBeGreaterThan(0);
            expect(typeof totalSize).toBe('number');
        });

        test('debe retornar 0 para caché vacío', () => {
            const totalSize = cache.calculateMemorySize();
            expect(totalSize).toBe(0);
        });
    });

    describe('destroy()', () => {
        test('debe limpiar recursos correctamente', () => {
            cache.memoryCache.set('test', { data: 'test' });
            
            cache.destroy();
            
            expect(cache.memoryCache.size).toBe(0);
            expect(cache.db).toBeNull();
        });
    });

    describe('Integración localStorage', () => {
        test('debe intentar almacenar en localStorage para datos del día actual', async () => {
            const todayPrograms = [
                {
                    ...mockPrograms[0],
                    startTime: new Date() // Hoy
                }
            ];
            
            await cache.store('ch1', todayPrograms);
            
            // Verificar que se intentó almacenar en localStorage
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('Manejo de errores', () => {
        test('debe manejar errores de localStorage gracefully', async () => {
            localStorageMock.setItem.mockImplementation(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            });
            
            // No debe lanzar error
            await expect(cache.store('ch1', mockPrograms)).resolves.not.toThrow();
        });

        test('debe manejar datos corruptos en localStorage', async () => {
            localStorageMock.getItem.mockReturnValue('invalid-json');
            
            const result = await cache.retrieveFromLocalStorage('ch1');
            expect(result).toBeNull();
        });
    });
});