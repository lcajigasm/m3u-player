/**
 * Demo de funcionalidad de búsqueda EPG
 * Este archivo demuestra cómo usar el sistema de búsqueda
 */

// Datos de ejemplo para demostración
const demoEPGData = {
    channels: [
        {
            id: 'tvn',
            name: 'TVN',
            group: 'Nacionales',
            logo: 'assets/logos/tvn.png',
            programs: [
                {
                    id: 'tvn-news-morning',
                    title: 'Buenos Días a Todos',
                    description: 'Programa matinal con noticias, entrevistas y entretenimiento',
                    startTime: new Date('2024-01-15T07:00:00'),
                    endTime: new Date('2024-01-15T10:00:00'),
                    genre: ['Noticias', 'Entretenimiento', 'Matinal'],
                    rating: 'ATP',
                    duration: 180
                },
                {
                    id: 'tvn-news-noon',
                    title: 'Teletrece',
                    description: 'Noticiero central con las principales noticias del día',
                    startTime: new Date('2024-01-15T13:00:00'),
                    endTime: new Date('2024-01-15T14:00:00'),
                    genre: ['Noticias'],
                    rating: 'ATP',
                    duration: 60
                }
            ]
        },
        {
            id: 'canal13',
            name: 'Canal 13',
            group: 'Nacionales',
            logo: 'assets/logos/canal13.png',
            programs: [
                {
                    id: 'c13-morning',
                    title: 'Bienvenidos',
                    description: 'Programa de conversación matinal con actualidad y entretenimiento',
                    startTime: new Date('2024-01-15T08:30:00'),
                    endTime: new Date('2024-01-15T12:00:00'),
                    genre: ['Entretenimiento', 'Conversación'],
                    rating: 'ATP',
                    duration: 210
                },
                {
                    id: 'c13-sports',
                    title: 'Deportes 13',
                    description: 'Resumen deportivo con los últimos resultados y noticias',
                    startTime: new Date('2024-01-15T15:00:00'),
                    endTime: new Date('2024-01-15T15:30:00'),
                    genre: ['Deportes'],
                    rating: 'ATP',
                    duration: 30
                }
            ]
        },
        {
            id: 'espn',
            name: 'ESPN',
            group: 'Deportes',
            logo: 'assets/logos/espn.png',
            programs: [
                {
                    id: 'espn-futbol',
                    title: 'Fútbol Total',
                    description: 'Análisis y highlights del fútbol internacional',
                    startTime: new Date('2024-01-15T20:00:00'),
                    endTime: new Date('2024-01-15T21:00:00'),
                    genre: ['Deportes', 'Fútbol'],
                    rating: 'ATP',
                    duration: 60
                },
                {
                    id: 'espn-noticias',
                    title: 'SportsCenter',
                    description: 'Las noticias más importantes del mundo deportivo',
                    startTime: new Date('2024-01-15T22:00:00'),
                    endTime: new Date('2024-01-15T22:30:00'),
                    genre: ['Deportes', 'Noticias'],
                    rating: 'ATP',
                    duration: 30
                }
            ]
        }
    ]
};

/**
 * Clase de demostración para la funcionalidad de búsqueda EPG
 */
class EPGSearchDemo {
    constructor() {
        this.searchManager = null;
        this.searchUI = null;
        this.initialized = false;
    }

    /**
     * Inicializa la demostración
     */
    async init() {
        try {
            console.log('🚀 Iniciando demo de búsqueda EPG...');

            // Importar clases EPG
            const { EPGSearchManager } = await import('./epg/EPGSearchManager.js');
            const { EPGSearchUI } = await import('./epg/EPGSearchUI.js');

            // Crear instancias
            this.searchManager = new EPGSearchManager();
            
            // Crear mock del EPG Manager
            const mockEPGManager = this.createMockEPGManager();
            
            // Obtener contenedor EPG
            const container = document.querySelector('#epgModal');
            if (!container) {
                throw new Error('Contenedor EPG no encontrado');
            }

            this.searchUI = new EPGSearchUI(container, mockEPGManager);

            // Construir índice con datos de ejemplo
            this.searchManager.buildSearchIndex(demoEPGData.channels);

            // Configurar eventos de demostración
            this.setupDemoEvents();

            this.initialized = true;
            console.log('✅ Demo de búsqueda EPG inicializada');

            // Mostrar ejemplos de uso
            this.runSearchExamples();

        } catch (error) {
            console.error('❌ Error inicializando demo:', error);
        }
    }

    /**
     * Crea un mock del EPG Manager para la demostración
     */
    createMockEPGManager() {
        return {
            searchManager: this.searchManager,
            reminderManager: {
                addReminder: (programId, channelId, startTime) => {
                    console.log(`📅 Recordatorio agregado para programa ${programId} en canal ${channelId}`);
                    alert(`Recordatorio configurado para: ${startTime.toLocaleTimeString()}`);
                }
            },
            changeChannel: (channelId) => {
                console.log(`📺 Cambiando a canal: ${channelId}`);
                alert(`Cambiando a canal: ${channelId}`);
            },
            getCurrentProgram: (channelId) => {
                const channel = demoEPGData.channels.find(c => c.id === channelId);
                return channel ? channel.programs[0] : null;
            },
            emit: (event, data) => {
                console.log(`🔔 Evento emitido: ${event}`, data);
            }
        };
    }

    /**
     * Configura eventos de demostración
     */
    setupDemoEvents() {
        // Agregar botón de demo al header
        const epgHeader = document.querySelector('.epg-header');
        if (epgHeader) {
            const demoBtn = document.createElement('button');
            demoBtn.id = 'epgDemoBtn';
            demoBtn.className = 'epg-action-btn';
            demoBtn.textContent = '🔍 Demo Búsqueda';
            demoBtn.onclick = () => this.showDemoModal();
            
            epgHeader.appendChild(demoBtn);
        }

        // Evento personalizado para mostrar resultados
        document.addEventListener('epg:searchResults', (e) => {
            console.log('🔍 Resultados de búsqueda:', e.detail);
        });
    }

    /**
     * Ejecuta ejemplos de búsqueda
     */
    runSearchExamples() {
        console.log('\n📋 Ejecutando ejemplos de búsqueda...\n');

        // Ejemplo 1: Búsqueda por título
        console.log('🔍 Ejemplo 1: Búsqueda por título "noticias"');
        const newsResults = this.searchManager.search('noticias');
        console.log(`✅ Encontrados ${newsResults.length} programas de noticias:`, 
            newsResults.map(r => r.program.title));

        // Ejemplo 2: Búsqueda por género
        console.log('\n🔍 Ejemplo 2: Búsqueda por género "deportes"');
        const sportsResults = this.searchManager.search('deportes');
        console.log(`✅ Encontrados ${sportsResults.length} programas deportivos:`, 
            sportsResults.map(r => r.program.title));

        // Ejemplo 3: Filtros por canal
        console.log('\n🔍 Ejemplo 3: Filtro por canal TVN');
        this.searchManager.setFilter('channel', 'tvn');
        const tvnResults = this.searchManager.search('');
        console.log(`✅ Encontrados ${tvnResults.length} programas en TVN:`, 
            tvnResults.map(r => r.program.title));

        // Ejemplo 4: Filtros por género
        console.log('\n🔍 Ejemplo 4: Filtro por género "Entretenimiento"');
        this.searchManager.clearFilters();
        this.searchManager.setFilter('genre', 'Entretenimiento');
        const entertainmentResults = this.searchManager.search('');
        console.log(`✅ Encontrados ${entertainmentResults.length} programas de entretenimiento:`, 
            entertainmentResults.map(r => r.program.title));

        // Ejemplo 5: Sugerencias
        console.log('\n🔍 Ejemplo 5: Sugerencias para "tel"');
        const suggestions = this.searchManager.getSuggestions('tel', 3);
        console.log(`✅ Sugerencias:`, suggestions);

        // Limpiar filtros
        this.searchManager.clearFilters();
        console.log('\n✅ Ejemplos completados\n');
    }

    /**
     * Muestra modal de demostración
     */
    showDemoModal() {
        const modalHTML = `
            <div id="epgSearchDemoModal" class="modal" style="display: block; z-index: 2000;">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>🔍 Demo de Búsqueda EPG</h2>
                        <button class="close-btn" onclick="this.closest('.modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="demo-section">
                            <h3>Ejemplos de búsqueda:</h3>
                            <div class="demo-buttons">
                                <button onclick="epgSearchDemo.testSearch('noticias')" class="demo-btn">Buscar "noticias"</button>
                                <button onclick="epgSearchDemo.testSearch('deportes')" class="demo-btn">Buscar "deportes"</button>
                                <button onclick="epgSearchDemo.testSearch('entretenimiento')" class="demo-btn">Buscar "entretenimiento"</button>
                                <button onclick="epgSearchDemo.testSearch('fútbol')" class="demo-btn">Buscar "fútbol"</button>
                            </div>
                        </div>
                        
                        <div class="demo-section">
                            <h3>Filtros:</h3>
                            <div class="demo-filters">
                                <select id="demoGenreFilter" onchange="epgSearchDemo.applyFilter('genre', this.value)">
                                    <option value="">Todos los géneros</option>
                                    <option value="Noticias">Noticias</option>
                                    <option value="Deportes">Deportes</option>
                                    <option value="Entretenimiento">Entretenimiento</option>
                                </select>
                                
                                <select id="demoChannelFilter" onchange="epgSearchDemo.applyFilter('channel', this.value)">
                                    <option value="">Todos los canales</option>
                                    <option value="tvn">TVN</option>
                                    <option value="canal13">Canal 13</option>
                                    <option value="espn">ESPN</option>
                                </select>
                                
                                <button onclick="epgSearchDemo.clearFilters()" class="demo-btn">Limpiar filtros</button>
                            </div>
                        </div>
                        
                        <div class="demo-section">
                            <h3>Resultados:</h3>
                            <div id="demoResults" class="demo-results">
                                Ejecuta una búsqueda para ver resultados...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const existingModal = document.querySelector('#epgSearchDemoModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Agregar nuevo modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Agregar estilos del modal
        this.addDemoStyles();
    }

    /**
     * Agrega estilos para la demostración
     */
    addDemoStyles() {
        if (!document.querySelector('#demoStyles')) {
            const styles = document.createElement('style');
            styles.id = 'demoStyles';
            styles.textContent = `
                .demo-section {
                    margin-bottom: 25px;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    border: 1px solid #444;
                }
                
                .demo-section h3 {
                    margin: 0 0 15px 0;
                    color: #4299e1;
                    font-size: 16px;
                }
                
                .demo-buttons, .demo-filters {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                
                .demo-btn {
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .demo-btn:hover {
                    background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
                    transform: translateY(-1px);
                }
                
                .demo-filters select {
                    padding: 6px 10px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid #555;
                    border-radius: 4px;
                    color: #e2e8f0;
                }
                
                .demo-results {
                    max-height: 300px;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid #555;
                    border-radius: 4px;
                    padding: 15px;
                    color: #e2e8f0;
                    font-family: monospace;
                    font-size: 12px;
                    line-height: 1.5;
                }
                
                .result-item {
                    padding: 8px;
                    margin: 4px 0;
                    background: rgba(66, 153, 225, 0.1);
                    border-radius: 4px;
                    border-left: 3px solid #4299e1;
                }
                
                .result-title {
                    font-weight: bold;
                    color: #4299e1;
                }
                
                .result-meta {
                    font-size: 10px;
                    color: #a0aec0;
                    margin-top: 4px;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    /**
     * Prueba una búsqueda específica
     */
    testSearch(query) {
        if (!this.initialized) {
            console.warn('Demo no inicializada');
            return;
        }

        console.log(`🔍 Probando búsqueda: "${query}"`);
        const results = this.searchManager.search(query);
        
        this.displayResults(results, `Búsqueda: "${query}"`);
    }

    /**
     * Aplica un filtro
     */
    applyFilter(type, value) {
        if (!this.initialized) {
            console.warn('Demo no inicializada');
            return;
        }

        console.log(`🔧 Aplicando filtro ${type}: ${value}`);
        
        if (value) {
            this.searchManager.setFilter(type, value);
        } else {
            this.searchManager.setFilter(type, null);
        }

        const results = this.searchManager.search('');
        this.displayResults(results, `Filtro ${type}: ${value || 'ninguno'}`);
    }

    /**
     * Limpia todos los filtros
     */
    clearFilters() {
        if (!this.initialized) {
            console.warn('Demo no inicializada');
            return;
        }

        console.log('🧹 Limpiando filtros');
        this.searchManager.clearFilters();
        
        // Limpiar selectores
        const genreSelect = document.querySelector('#demoGenreFilter');
        const channelSelect = document.querySelector('#demoChannelFilter');
        if (genreSelect) genreSelect.value = '';
        if (channelSelect) channelSelect.value = '';

        const results = this.searchManager.search('');
        this.displayResults(results, 'Todos los programas');
    }

    /**
     * Muestra los resultados en el modal de demo
     */
    displayResults(results, title) {
        const resultsContainer = document.querySelector('#demoResults');
        if (!resultsContainer) return;

        let html = `<strong>${title}</strong><br>`;
        html += `<em>Encontrados ${results.length} resultado(s)</em><br><br>`;

        if (results.length === 0) {
            html += '<div style="color: #ef4444;">No se encontraron resultados</div>';
        } else {
            results.forEach((result, index) => {
                html += `
                    <div class="result-item">
                        <div class="result-title">${result.program.title}</div>
                        <div class="result-meta">
                            Canal: ${result.channel.name} | 
                            Género: ${result.program.genre.join(', ')} | 
                            Score: ${result.score.toFixed(1)} |
                            Hora: ${result.program.startTime.toLocaleTimeString()}
                        </div>
                        <div style="font-size: 10px; color: #a0aec0; margin-top: 2px;">
                            ${result.program.description}
                        </div>
                    </div>
                `;
            });
        }

        resultsContainer.innerHTML = html;
    }
}

// Crear instancia global para la demostración
let epgSearchDemo;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Esperar un poco para asegurar que el EPG esté cargado
    setTimeout(async () => {
        epgSearchDemo = new EPGSearchDemo();
        await epgSearchDemo.init();
    }, 1000);
});

export { EPGSearchDemo };
