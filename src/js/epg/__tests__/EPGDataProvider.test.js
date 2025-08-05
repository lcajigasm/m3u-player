/**
 * Tests para EPGDataProvider
 * Prueba la lógica de priorización de fuentes y manejo de errores
 */

import { EPGDataProvider } from '../EPGDataProvider.js';

// Mock de parsers
const mockXMLTVParser = {
    parse: jest.fn()
};

const mockJSONEPGParser = {
    parse: jest.fn()
};

const mockEmbeddedEPGParser = {
    parse: jest.fn()
};

// Mock de fetch global
global.fetch = jest.fn();

describe('EPGDataProvider', () => {
    let provider;
    let mockConfig;

    beforeEach(() => {
        mockConfig = {
            autoUpdate: true,
            updateInterval: 30,
            cacheRetention: 7,
            defaultTimeRange: 24,
            reminderAdvance: 5,
            dataSources: ['auto'],
            theme: 'dark'
        };

        provider = new EPGDataProvider(mockConfig);
        
        // Mock de parsers
        provider.parsers.set('xmltv', mockXMLTVParser);
        provider.parsers.set('json', mockJSONEPGParser);
        provider.parsers.set('embedded', mockEmbeddedEPGParser);

        // Limpiar mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        provider.destroy();
    });

    describe('Priorización de fuentes', () => {
        test('debe priorizar fuentes por número de prioridad', () => {
            const sources = [
                { name: 'Source C', priority: 3 },
                { name: 'Source A', priority: 1 },
                { name: 'Source B', priority: 2 }
            ];

            const prioritized = provider.prioritizeSources(sources);

            expect(prioritized).toHaveLength(3);
            expect(prioritized[0].name).toBe('Source A');
            expect(prioritized[1].name).toBe('Source B');
            expect(prioritized[2].name).toBe('Source C');
        });

        test('debe manejar fuentes sin prioridad asignándoles prioridad 999', () => {
            const sources = [
                { name: 'Source B', priority: 2 },
                { name: 'Source No Priority' }, // Sin prioridad
                { name: 'Source A', priority: 1 }
            ];

            const prioritized = provider.prioritizeSources(sources);

            expect(prioritized[0].name).toBe('Source A');
            expect(prioritized[1].name).toBe('Source B');
            expect(prioritized[2].name).toBe('Source No Priority');
        });

        test('debe mantener orden relativo para fuentes con misma prioridad', () => {
            const sources = [
                { name: 'Source B', priority: 1 },
                { name: 'Source A', priority: 1 },
                { name: 'Source C', priority: 1 }
            ];

            const prioritized = provider.prioritizeSources(sources);

            expect(prioritized[0].name).toBe('Source B');
            expect(prioritized[1].name).toBe('Source A');
            expect(prioritized[2].name).toBe('Source C');
        });
    });

    describe('Manejo de errores y reintentos', () => {
        test('debe reintentar fuente fallida según configuración', async () => {
            const mockSource = {
                name: 'Test Source',
                type: 'xmltv',
                url: 'http://test.com/epg.xml',
                enabled: true,
                maxRetries: 3,
                retryDelay: 100
            };

            // Mock fetch que falla las primeras 2 veces
            let callCount = 0;
            global.fetch.mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('<tv></tv>')
                });
            });

            mockXMLTVParser.parse.mockReturnValue(new Map([
                ['channel1', [{ id: 'prog1', title: 'Test Program' }]]
            ]));

            const channels = [{ id: 'channel1' }];
            const result = await provider.fetchFromSourceWithRetry(mockSource, channels);

            expect(global.fetch).toHaveBeenCalledTimes(3);
            expect(result.size).toBe(1);
        });

        test('debe fallar después de agotar todos los reintentos', async () => {
            const mockSource = {
                name: 'Test Source',
                type: 'xmltv',
                url: 'http://test.com/epg.xml',
                enabled: true,
                maxRetries: 2,
                retryDelay: 50
            };

            global.fetch.mockRejectedValue(new Error('Persistent network error'));

            const channels = [{ id: 'channel1' }];

            await expect(
                provider.fetchFromSourceWithRetry(mockSource, channels)
            ).rejects.toThrow('Persistent network error');

            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        test('debe aplicar backoff exponencial en reintentos', async () => {
            const mockSource = {
                name: 'Test Source',
                type: 'xmltv',
                url: 'http://test.com/epg.xml',
                enabled: true,
                maxRetries: 3,
                retryDelay: 100
            };

            global.fetch.mockRejectedValue(new Error('Network error'));

            const startTime = Date.now();
            
            try {
                await provider.fetchFromSourceWithRetry(mockSource, []);
            } catch (error) {
                // Esperado
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Debe haber esperado al menos: 100ms + 200ms = 300ms
            expect(totalTime).toBeGreaterThan(250);
        });
    });

    describe('Rate limiting', () => {
        test('debe respetar intervalo mínimo entre requests', async () => {
            const mockSource = {
                name: 'Test Source',
                type: 'xmltv',
                url: 'http://test.com/epg.xml',
                enabled: true,
                minInterval: 1000,
                lastFetch: Date.now() - 500 // Hace 500ms
            };

            const channels = [{ id: 'channel1' }];

            await expect(
                provider.fetchFromSource(mockSource, channels)
            ).rejects.toThrow(/Rate limit/);
        });

        test('debe permitir request si ha pasado suficiente tiempo', async () => {
            const mockSource = {
                name: 'Test Source',
                type: 'xmltv',
                url: 'http://test.com/epg.xml',
                enabled: true,
                minInterval: 1000,
                lastFetch: Date.now() - 1500 // Hace 1.5 segundos
            };

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<tv></tv>')
            });

            mockXMLTVParser.parse.mockReturnValue(new Map());

            const channels = [{ id: 'channel1' }];
            
            await expect(
                provider.fetchFromSource(mockSource, channels)
            ).resolves.toBeDefined();
        });
    });

    describe('Gestión de fuentes', () => {
        test('debe añadir nueva fuente correctamente', () => {
            const newSource = {
                name: 'New Source',
                type: 'json',
                url: 'http://new.com/epg.json',
                priority: 1
            };

            const initialCount = provider.dataSources.length;
            provider.addDataSource(newSource);

            expect(provider.dataSources.length).toBe(initialCount + 1);
            
            const addedSource = provider.dataSources.find(s => s.name === 'New Source');
            expect(addedSource).toBeDefined();
            expect(addedSource.enabled).toBe(true);
            expect(addedSource.maxRetries).toBe(3);
        });

        test('debe rechazar fuente con nombre duplicado', () => {
            const existingName = provider.dataSources[0].name;
            const duplicateSource = {
                name: existingName,
                type: 'json',
                url: 'http://duplicate.com/epg.json'
            };

            expect(() => {
                provider.addDataSource(duplicateSource);
            }).toThrow(/Ya existe una fuente/);
        });

        test('debe remover fuente correctamente', () => {
            const sourceName = provider.dataSources[0].name;
            const initialCount = provider.dataSources.length;

            provider.removeDataSource(sourceName);

            expect(provider.dataSources.length).toBe(initialCount - 1);
            expect(provider.dataSources.find(s => s.name === sourceName)).toBeUndefined();
        });

        test('debe habilitar/deshabilitar fuente', () => {
            const sourceName = provider.dataSources[0].name;
            
            provider.setSourceEnabled(sourceName, false);
            const source = provider.dataSources.find(s => s.name === sourceName);
            expect(source.enabled).toBe(false);

            provider.setSourceEnabled(sourceName, true);
            expect(source.enabled).toBe(true);
        });
    });

    describe('Estadísticas de fuentes', () => {
        test('debe generar estadísticas correctas', () => {
            // Simular algunas fuentes con errores
            provider.dataSources[0].lastError = { message: 'Test error' };
            provider.dataSources[1].enabled = false;

            const stats = provider.getSourceStats();

            expect(stats.total).toBe(provider.dataSources.length);
            expect(stats.withErrors).toBe(1);
            expect(stats.disabled).toBe(1);
            expect(stats.enabled).toBe(provider.dataSources.length - 1);
            expect(stats.byType).toBeDefined();
            expect(stats.byPriority).toBeDefined();
        });
    });

    describe('Fuentes de respaldo', () => {
        test('debe intentar fuentes de respaldo cuando falla fuente crítica', async () => {
            // Configurar fuente crítica que falla
            const criticalSource = {
                name: 'Critical Source',
                type: 'xmltv',
                url: 'http://critical.com/epg.xml',
                enabled: true,
                critical: true,
                priority: 1
            };

            // Configurar fuente de respaldo
            const backupSource = {
                name: 'Backup Source',
                type: 'xmltv',
                url: 'http://backup.com/epg.xml',
                enabled: true,
                isBackupFor: 'Critical Source',
                priority: 2
            };

            provider.dataSources = [criticalSource, backupSource];

            // Mock: fuente crítica falla, respaldo funciona
            global.fetch.mockImplementation((url) => {
                if (url.includes('critical.com')) {
                    return Promise.reject(new Error('Critical source failed'));
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('<tv></tv>')
                });
            });

            mockXMLTVParser.parse.mockReturnValue(new Map([
                ['channel1', [{ id: 'prog1', title: 'Backup Program' }]]
            ]));

            const channels = [{ id: 'channel1' }];
            const results = new Map();

            await provider.tryBackupSources(criticalSource, channels, results);

            expect(results.size).toBe(1);
            expect(results.get('channel1')).toBeDefined();
        });
    });

    describe('Validación de datos', () => {
        test('debe validar respuesta XMLTV antes de parsear', async () => {
            const mockSource = {
                name: 'Test Source',
                type: 'xmltv',
                url: 'http://test.com/epg.xml',
                enabled: true
            };

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('Not XML content')
            });

            const channels = [{ id: 'channel1' }];

            await expect(
                provider.fetchXMLTVSource(mockSource, channels)
            ).rejects.toThrow(/no parece ser XMLTV válido/);
        });

        test('debe validar respuesta JSON antes de parsear', async () => {
            const mockSource = {
                name: 'Test Source',
                type: 'json',
                url: 'http://test.com/epg.json',
                enabled: true
            };

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('Not JSON content')
            });

            const channels = [{ id: 'channel1' }];

            await expect(
                provider.fetchJSONSource(mockSource, channels)
            ).rejects.toThrow(/no es JSON válido/);
        });
    });
});