# EPG Search Functionality

Advanced search system for the M3U player's Electronic Program Guide (EPG).

## Main Features

- 🔍 **Real-time search** with debouncing
- 📊 **Optimized search index** for large data volumes
- 🎯 **Advanced filters** by genre, channel and time
- 📝 **Automatic suggestions** while typing
- 📄 **Pagination** for many results
- ⚡ **Optimized performance** with virtualization
- 🎨 **Responsive interface** with dark theme

## Architecture

```
EPGSearchManager          EPGSearchUI
       |                        |
       |-- Search index         |-- Search interface
       |-- Score algorithm      |-- Visual filters
       |-- Filters & cache      |-- Paginated results
       |-- Suggestions          |-- Navigation
```

## Components

### EPGSearchManager

Manages search logic and data indexing.

#### Main Methods:

```javascript
// Construir índice de búsqueda
searchManager.buildSearchIndex(channels);

// Búsqueda inmediata
const results = searchManager.search('noticias');

// Búsqueda con debouncing
searchManager.searchWithDebounce('query', (results) => {
    // Manejar resultados
});

// Aplicar filtros
searchManager.setFilter('genre', 'Deportes');
searchManager.setFilter('channel', 'ch1');
searchManager.setFilter('timeRange', 'today');

# Get suggestions
const suggestions = searchManager.getSuggestions('not', 5);

# Clear filters
searchManager.clearFilters();
```

#### Search Algorithm Features:

- **Relevance Score**: Calculates score based on matches
- **Multi-criteria Search**: Title, description, genre, channel
- **Stop Words**: Filters empty words in English and Spanish
- **Accents**: Properly handles special characters
- **Keywords**: Automatically extracts relevant terms

### EPGSearchUI

Provides the visual interface for searching.

#### Interface Features:

```javascript
// Initialize search UI
const searchUI = new EPGSearchUI(container, epgManager);

// Show results
searchUI.showSearchResults(results);

// Toggle between modes
searchUI.showSearchMode();  // Results view
searchUI.showGridMode();    // EPG grid view

// Handle pagination
searchUI.nextPage();
searchUI.prevPage();
searchUI.goToPage(3);
```

## Basic Usage

### 1. Integration with EPGManager

```javascript
// EPGManager automatically initializes search
const epgManager = new EPGManager(player);
await epgManager.initialize();

// Search programs
const results = epgManager.searchPrograms('news');
```

#### Características del algoritmo de búsqueda:

- **Score de relevancia**: Calcula puntuación basada en coincidencias
- **Búsqueda multicriterio**: Título, descripción, género, canal
- **Stop words**: Filtra palabras vacías en español e inglés
- **Acentos**: Maneja correctamente caracteres especiales
- **Palabras clave**: Extrae términos relevantes automáticamente

### EPGSearchUI

Proporciona la interfaz visual para la búsqueda.

#### Características de la interfaz:

```javascript
// Inicializar UI de búsqueda
const searchUI = new EPGSearchUI(container, epgManager);

// Mostrar resultados
searchUI.showSearchResults(results);

// Alternar entre modos
searchUI.showSearchMode();  // Vista de resultados
searchUI.showGridMode();    // Vista de grilla EPG

// Manejar paginación
searchUI.nextPage();
searchUI.prevPage();
searchUI.goToPage(3);
```

## Uso Básico

### 1. Integración con EPGManager

```javascript
// El EPGManager inicializa automáticamente la búsqueda
const epgManager = new EPGManager(player);
await epgManager.initialize();

// Buscar programas
const results = epgManager.searchPrograms('noticias');

// Búsqueda con debouncing
epgManager.searchProgramsWithDebounce('deporte', (results) => {
    console.log('Resultados:', results);
});
```

### 2. HTML Interface

The search is integrated into the existing EPG modal:

```html
<div class="epg-search-container">
    <input type="text" id="epgSearch" placeholder="Search programs...">
    <button id="clearEpgSearchBtn">✕</button>
</div>

<div class="epg-search-filters" id="epgSearchFilters">
    <select id="epgGenreFilter">...</select>
    <select id="epgChannelFilter">...</select>
    <select id="epgTimeFilter">...</select>
</div>

<div class="epg-search-results" id="epgSearchResults">
    <!-- Dynamically generated results -->
</div>
```

### 3. Search Events

```javascript
// Listen for search results
container.addEventListener('epg:searchResults', (e) => {
    console.log('New results:', e.detail.results);
});

// Listen for filter changes
container.addEventListener('epg:filtersChanged', (e) => {
    console.log('Applied filters:', e.detail.filters);
});
```

## Available Filters

### By Genre

- Extracts unique genres from all programs
- Dynamic filtering based on available content

### By Channel

- Lists all channels with programs
- Shows channel name and ID

### By Time

- `now` - Currently airing programs
- `today` - Today's programs
- `tomorrow` - Tomorrow's programs
- `next2h` - Next 2 hours
- `next6h` - Next 6 hours

## Configuration

### SearchManager Options

```javascript
const searchManager = new EPGSearchManager();

// Configure debouncing delay (default: 300ms)
searchManager.debounceDelay = 500;

// Maximum number of suggestions (default: 5)
const suggestions = searchManager.getSuggestions('query', 10);
```

### UI Configuration

```javascript
const searchUI = new EPGSearchUI(container, epgManager);

// Results per page (default: 20)
searchUI.resultsPerPage = 50;

// Customize elements
searchUI.elements.searchInput.placeholder = 'Search...';
```

## Performance

### Implemented Optimizations

- **In-memory Index**: O(n) search instead of O(n²)
- **Debouncing**: Prevents excessive searches while typing
- **Virtualization**: Only renders visible results
- **Results Cache**: Reuses results for same query
- **Pagination**: Splits large results into pages

### Typical Metrics

- Index building: ~5ms for 1000 programs
- Search: ~10ms for 1000 programs
- Rendering: ~50ms for 100 results

## Style Customization

The CSS styles follow the player's dark theme:

```css
/* Search Container */
.epg-search-container {
    position: relative;
    display: flex;
    align-items: center;
}

/* Search Input */
.epg-search-input {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid #555;
    color: #e2e8f0;
    /* ... more styles */
}

/* Filters */
.epg-search-filters {
    display: flex;
    gap: 15px;
    padding: 10px 0;
    /* ... more styles */
}

/* Results */
.search-result-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #444;
    border-radius: 8px;
    /* ... more styles */
}
```

## Testing

Se incluyen tests completos para ambos componentes:

```bash
# Ejecutar tests de búsqueda
npm test -- --grep "EPGSearch"

# Tests específicos
npm test src/js/epg/__tests__/EPGSearchManager.test.js
npm test src/js/epg/__tests__/EPGSearchUI.test.js
```

### Test Coverage

- Basic text search
- Genre filtering
- Channel filtering
- Time filtering
- EPGManager integration
- Result events
- Search suggestions
- Results cache
- Search index
- UI and rendering
- Pagination
- Performance

### Main Files

- `EPGSearchManager.js` - Search engine
- `EPGSearchUI.js` - User interface

### Use Cases

- Text search
- Search with filters
- Predefined search examples
- Search suggestions
- Search history
- Paginated results

### Common Issues

#### No Results

- Verify index is built: `searchManager.searchIndex.size > 0`
- Check active filters
- Validate search text

#### Slow Performance

- Reduce `resultsPerPage` if there are many results
- Verify virtualization
- Optimize filters

#### UI Issues

- Verify `epg.css` is loaded
- Check DOM events
- Validate containers

### Debugging

```javascript
// View current index
console.log(searchManager.searchIndex);

// Monitor events
container.addEventListener('epg:*', console.log);

// View cache status
console.log(searchManager.cache);

// Verify filters
console.log(searchUI.currentFilters);
```

### Future Improvements

1. **Search**
   - Phonetic search
   - Spell checking
   - Synonyms and aliases

2. **Performance**
   - Worker for searches
   - Persistent index
   - Data compression

3. **UX**
   - Persistent history
   - Favorite filters
   - Hover preview

## References

### Related Files

- `src/js/epg/EPGSearchManager.js`
- `src/js/epg/EPGSearchUI.js`
- `src/styles/epg.css`

## Demo

Se incluye una demostración interactiva:

```javascript
import { EPGSearchDemo } from './epg/EPGSearchDemo.js';

// La demo se inicializa automáticamente
// Busca el botón "🔍 Demo Búsqueda" en el EPG
```

La demo incluye:
- Ejemplos de búsqueda predefinidos
- Datos de prueba realistas
- Interfaz para probar filtros
- Visualización de resultados

## Troubleshooting

### Common Issues

**1. No Results Appear**

- Verify that the index is built: `searchManager.searchIndex.size > 0`
- Check that the query has more than 2 characters
- Review active filters

**2. Slow Performance**

- Reduce `resultsPerPage` if there are many results
- Verify there are no memory leaks in the index
- Consider increasing `debounceDelay` for slow users

**3. Incorrect Styles**

- Verify that `epg.css` is loaded
- Check for CSS conflicts
- Use developer tools to inspect elements

### Debug:

```javascript
// Activar logs detallados
console.log('Índice:', searchManager.searchIndex);
console.log('Filtros:', searchManager.filters);
console.log('Resultados:', searchManager.searchResults);

// Estadísticas de búsqueda
const stats = searchManager.getSearchStats();
console.log('Estadísticas:', stats);
```

## Roadmap

### Future Improvements

- [ ] Voice search
- [ ] Search history
- [ ] Fuzzy search (error tolerance)
- [ ] Rating and duration filters 
- [ ] Export results
- [ ] Favorites integration
- [ ] Episode description search
- [ ] History-based suggestions

## Contribución

Para contribuir a la funcionalidad de búsqueda:

1. Revisar la arquitectura existente
2. Seguir los patrones de nomenclatura
3. Agregar tests para nuevas funcionalidades
4. Mantener compatibilidad con tema oscuro
5. Documentar cambios significativos

Los archivos principales están en:
- `src/js/epg/EPGSearchManager.js`
- `src/js/epg/EPGSearchUI.js`
- `src/styles/epg.css` (sección de búsqueda)
- Tests en `src/js/epg/__tests__/`
