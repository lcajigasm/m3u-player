# M3U Player - Source Structure

## 📁 Estructura de Carpetas

```
src/
├── index.html          # Página principal
├── styles.css          # Estilos principales
├── js/
│   └── script.js       # Lógica principal de la aplicación
├── styles/
│   ├── variables.css   # Variables CSS
│   ├── components.css  # Componentes reutilizables
│   └── main.css        # Estilos principales modulares
├── assets/
│   ├── icons/          # Iconos de la aplicación
│   └── images/         # Imágenes y logos
├── components/         # Componentes JS modulares (futuro)
└── utils/              # Utilidades y helpers (futuro)
```

## 🔧 Archivos Principales

### index.html
- Estructura HTML principal
- Referencias a CSS y JS optimizadas
- Cache busting con versioning

### styles.css
- Estilos globales mejorados
- Diseño responsive
- Variables CSS para temas
- Lista de canales optimizada
- Búsqueda de ancho completo

### js/script.js
- Clase M3UPlayer principal
- Funciones optimizadas para playlist
- Mejor manejo de tipos de stream
- Diseño de items simplificado

## 🎯 Mejoras Implementadas

1. **Búsqueda al 100% del ancho**: Eliminado max-width, ancho completo
2. **Lista de canales mejorada**: 
   - Logos de 50x50px
   - Solo información relevante (nombre, grupo, tipo)
   - Metadatos con colores distintivos
   - Hover effects suaves
3. **Estructura organizada**: Archivos en carpetas lógicas
4. **CSS optimizado**: Estilos más limpios y eficientes

## 🚀 Uso

El archivo principal está en la raíz: `index.html`
Los archivos fuente están organizados en: `src/`

Para desarrollo, trabajar en `src/` y los cambios se reflejan automáticamente.
