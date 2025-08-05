/**
 * Tests unitarios para funcionalidad multinivel de EPGCache
 */

import { EPGCache } from '../EPGCache.js';

// Mock de performance.now para testing
global.performance = {
    now: jest.fn(() => Date.now())
};

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
                    createIndex: jest.fn(),
                    index: jest.fn(() => ({
                        openCursor: jest.fn(() => ({
                            onsuccess: null
                        }))
                    }))
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

// Mock de Blob
global.Blob = jest.fn().mockImplementation((content) => ({
    size: JSON.stringify(content).length
}));

describe('EPGCache - Funcionalidad Multinivel', () => {
    let cache;
    let mockPrograms;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.length = 0;
        
        cache = new EPGCache();
        
        mockPrograms = [
            {
                id: 'prog1',
                channelId: 'ch1',
                title: 'Programa 1',
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                duration: 3600
            }
        ];
    });

    afterEach(() => {
        if (cache) {
            cache.destroy();
        }
    });

    describe('Métricas de Rendimiento', () => {
        test('debe inicializar métricas correctamente', () => {
            const metrics = cache.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('hitRate');
            expect(metrics).toHaveProperty('totalRequests');
            expect(metrics).toHaveProperty('hits');
            expect(metrics).toHaveProperty('misses');
            expect(metrics).toHaveProperty('stores');
            expect(metrics).toHaveProperty('evictions');
            expect(metrics).toHaveProperty('averageResponseTime');
            expect(metrics).toHaveProperty('accessPatterns');
            
            expect(metrics.totalRequests).toBe(0);
            expect(metrics.hitRate).toBe(0);
        });

        test('debe rastrear hits de memoria correctamente', async () => {
            const channelId = 'test-channel';
            
            // Almacenar en caché
            await cache.store(channelId, mockPrograms);
            
            // Recuperar (debería ser hit de memoria)
            await cache.retrieve(channelId);
            
            const metrics = cache.getPerformanceMetrics();
            expect(metrics.hits.memory).toBe(1);
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.hitRate).toBe(100);
        });

        test('debe rastrear misses correctamente', async () => {
            await cache.retrieve('nonexistent-channel');
            
            const metrics = cache.getPerformanceMetrics();
            expect(metrics.misses).toBe(1);
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.hitRate).toBe(0);
        });

        test('debe calcular tiempo de respuesta promedio', async () => {
            const channelId = 'test-channel';
            await cache.store(channelId, mockPrograms);
            
            // Simular múltiples accesos
            await cache.retrieve(channelId);
            await cache.retrieve(channelId);
            await cache.retrieve(channelId);
            
            const metrics = cache.getPerformanceMetrics();
            expect(metrics.averageResponseTime).toBeGreaterThan(0);
            expect(typeof metrics.averageResponseTime).toBe('number');
        });
    });

    describe('Patrones de Acceso', () => {
        test('debe rastrear patrones de acceso', async () => {
            const channelId = 'test-channel';
            await cache.store(channelId, mockPrograms);
            
            // Múltiples accesos
            await cache.retrieve(channelId);
            await cache.retrieve(channelId);
            await cache.retrieve(channelId);
            
            const metrics = cache.getPerformanceMetrics();
            expect(metrics.accessPatterns.totalChannels).toBe(1);
            expect(metrics.accessPatterns.mostAccessed).toHaveLength(1);
            expect(metrics.accessPatterns.mostAccessed[0].channelId).toBe(channelId);
            expect(metrics.accessPatterns.mostAccessed[0].accessCount).toBe(3);
        });

        test('debe calcular frecuencia de acceso', async () => {
            const channelId = 'test-channel';
            await cache.store(channelId, mockPrograms);
            
            // Simular accesos con delay
            await cache.retrieve(channelId);
            
            // Simular paso del tiempo
            jest.advanceTimersByTime(60000); // 1 minuto
            
            await cache.retrieve(channelId);
            
            const pattern = cache.accessPatterns.get(channelId);
            expect(pattern.frequency).toBeGreaterThan(0);
        });

        test('debe determinar promoción a memoria basada en patrones', async () => {
            const channelId = 'frequent-channel';
            
            // Simular patrón de acceso frecuente
            cache.accessPatterns.set(channelId, {
                count: 5,
                frequency: 0.2,
                lastAccess: Date.now(),
                firstAccess: Date.now() - 300000 // 5 minutos atrás
            });
            
            const shouldPromote = cache.shouldPromoteToMemory(channelId);
            expect(shouldPromote).toBe(true);
        });

        test('no debe promover canales poco accedidos', async () => {
            const channelId = 'rare-channel';
            
            cache.accessPatterns.set(channelId, {
                count: 1,
                frequency: 0.01,
                lastAccess: Date.now() - 600000, // 10 minutos atrás
                firstAccess: Date.now() - 600000
            });
            
            const shouldPromote = cache.shouldPromoteToMemory(channelId);
            expect(shouldPromote).toBe(false);
        });
    });

    describe('Estrategia de Eviction Inteligente', () => {
        test('debe expulsar entradas basándose en patrones de uso', async () => {
            // Llenar memoria hasta el límite
            const channels = [];
            for (let i = 0; i < 10; i++) {
                const channelId = `channel-${i}`;
                channels.push(channelId);
                await cache.store(channelId, mockPrograms);
                
                // Simular diferentes patrones de acceso
                if (i < 5) {
                    // Canales frecuentes
                    cache.accessPatterns.set(channelId, {
                        count: 10,
                        frequency: 0.5,
                        lastAccess: Date.now()
                    });
                } else {
                    // Canales poco frecuentes
                    cache.accessPatterns.set(channelId, {
                        count: 1,
                        frequency: 0.01,
                        lastAccess: Date.now() - 3600000 // 1 hora atrás
                    });
                }
            }
            
            // Forzar eviction
            await cache.evictFromMemory();
            
            // Los canales frecuentes deberían mantenerse
            for (let i = 0; i < 5; i++) {
                expect(cache.memoryCache.has(`channel-${i}`)).toBe(true);
            }
        });
    });

    describe('Optimización Automática', () => {
        test('debe optimizar caché basándose en patrones', async () => {
            const channelId = 'optimize-test';
            
            // Simular datos en localStorage
            localStorageMock.getItem.mockReturnValue(JSON.stringify({
                programs: mockPrograms,
                lastUpdated: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                size: 1000
            }));
            
            // Simular patrón de acceso frecuente
            cache.accessPatterns.set(channelId, {
                count: 10,
                frequency: 0.3,
                lastAccess: Date.now()
            });
            
            await cache.optimizeCache();
            
            // Verificar que se intentó promover a memoria
            expect(cache.memoryCache.has(channelId)).toBe(true);
        });

        test('debe limpiar patrones de acceso obsoletos', async () => {
            const oldChannelId = 'old-channel';
            const recentChannelId = 'recent-channel';
            
            // Patrón antiguo
            cache.accessPatterns.set(oldChannelId, {
                count: 1,
                frequency: 0.01,
                lastAccess: Date.now() - (25 * 60 * 60 * 1000) // 25 horas atrás
            });
            
            // Patrón reciente
            cache.accessPatterns.set(recentChannelId, {
                count: 5,
                frequency: 0.1,
                lastAccess: Date.now()
            });
            
            await cache.optimizeCache();
            
            expect(cache.accessPatterns.has(oldChannelId)).toBe(false);
            expect(cache.accessPatterns.has(recentChannelId)).toBe(true);
        });
    });

    describe('Rebalanceo de Niveles', () => {
        test('debe promover datos a memoria cuando hay espacio disponible', async () => {
            const channelId = 'rebalance-test';
            
            // Mock localStorage con datos
            localStorageMock.key.mockImplementation((index) => {
                return index === 0 ? `epg_cache_${channelId}` : null;
            });
            localStorageMock.length = 1;
            localStorageMock.getItem.mockReturnValue(JSON.stringify({
                programs: mockPrograms,
                lastUpdated: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                size: 1000
            }));
            
            // Simular patrón de acceso frecuente
            cache.accessPatterns.set(channelId, {
                count: 8,
                frequency: 0.4,
                lastAccess: Date.now()
            });
            
            await cache.rebalanceCacheLevels();
            
            // Debería haber promovido a memoria
            expect(cache.memoryCache.has(channelId)).toBe(true);
        });
    });

    describe('Reset de Métricas', () => {
        test('debe resetear métricas correctamente', async () => {
            const channelId = 'metrics-test';
            await cache.store(channelId, mockPrograms);
            await cache.retrieve(channelId);
            
            // Verificar que hay métricas
            let metrics = cache.getPerformanceMetrics();
            expect(metrics.totalRequests).toBeGreaterThan(0);
            
            // Reset
            cache.resetMetrics();
            
            // Verificar reset
            metrics = cache.getPerformanceMetrics();
            expect(metrics.totalRequests).toBe(0);
            expect(metrics.hits.memory).toBe(0);
            expect(metrics.misses).toBe(0);
        });

        test('debe limpiar patrones de acceso antiguos en reset', () => {
            const oldChannelId = 'old-pattern';
            const recentChannelId = 'recent-pattern';
            
            // Patrón muy antiguo (8 días)
            cache.accessPatterns.set(oldChannelId, {
                count: 1,
                lastAccess: Date.now() - (8 * 24 * 60 * 60 * 1000)
            });
            
            // Patrón reciente
            cache.accessPatterns.set(recentChannelId, {
                count: 5,
                lastAccess: Date.now()
            });
            
            cache.resetMetrics();
            
            expect(cache.accessPatterns.has(oldChannelId)).toBe(false);
            expect(cache.accessPatterns.has(recentChannelId)).toBe(true);
        });
    });

    describe('Integración Multinivel', () => {
        test('debe usar fallback entre niveles correctamente', async () => {
            const channelId = 'fallback-test';
            
            // Simular miss en memoria, hit en localStorage
            localStorageMock.getItem.mockReturnValue(JSON.stringify({
                programs: mockPrograms,
                lastUpdated: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                size: 1000
            }));
            
            const result = await cache.retrieve(channelId);
            
            expect(result).toEqual(mockPrograms);
            
            const metrics = cache.getPerformanceMetrics();
            expect(metrics.hits.localStorage).toBe(1);
            expect(metrics.hits.memory).toBe(0);
        });

        test('debe promover datos entre niveles automáticamente', async () => {
            const channelId = 'promotion-test';
            
            // Simular datos en localStorage
            localStorageMock.getItem.mockReturnValue(JSON.stringify({
                programs: mockPrograms,
                lastUpdated: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                size: 1000
            }));
            
            // Simular patrón que justifica promoción
            cache.accessPatterns.set(channelId, {
                count: 5,
                frequency: 0.2,
                lastAccess: Date.now()
            });
            
            await cache.retrieve(channelId);
            
            // Debería haber sido promovido a memoria
            expect(cache.memoryCache.has(channelId)).toBe(true);
        });
    });
});