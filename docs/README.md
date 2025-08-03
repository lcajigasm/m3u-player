# M3U Player Electron 🎬

Una aplicación de escritorio desarrollada con Electron para reproducir contenido desde archivos M3U/M3U8, **sin las limitaciones CORS del navegador**.

## ✨ Características principales

- 🚀 **Sin limitaciones CORS** - Reproduce streams que no funcionan en navegadores web
- 📁 **Parser M3U completo** - Soporte para metadatos, grupos, logos y atributos TVG
- 🎥 **Múltiples formatos** - MP4, WebM, HLS (.m3u8) y más
- 🔧 **Diagnóstico integrado** - Prueba streams antes de reproducir
- ⚙️ **Configuración avanzada** - Headers personalizados, User-Agent, etc.
- 📱 **Interface moderna** - Diseño responsive y fácil de usar
- 💾 **Exportar playlists** - Guarda tus listas modificadas
- 🔍 **Búsqueda integrada** - Filtra canales por nombre o grupo
- 📺 **Picture-in-Picture** - Reproduce en ventana flotante
- ⛶ **Pantalla completa** - Experiencia inmersiva
- ☀️ **Controles de video** - Ajusta brillo y contraste en tiempo real

## ✨ Lo que SÍ funciona perfectamente

- 📁 **Archivos M3U locales** - Parser completo y robusto
- 🎥 **Videos directos** - MP4, WebM, etc. sin restricciones
- 🔴 **Streams HLS públicos** - Con soporte automático de HLS.js
- 📋 **Interface moderna** - Lista interactiva con información detallada
- 🔧 **Diagnóstico integrado** - Prueba streams antes de reproducir
- 📱 **Responsive** - Funciona en móvil y desktop

## 🚀 Instalación y uso

### Opción 1: Inicio rápido (recomendado)

```bash
# Clonar o descargar el proyecto
cd m3u-player-electron

# Ejecutar script de inicio automático
./start.sh
```

### Opción 2: Manual

```bash
# Instalar dependencias
npm install

# Iniciar la aplicación
npm start
```

### Opción 3: Desarrollo

```bash
# Modo desarrollo con DevTools
npm run dev
```

## 📖 Cómo usar la aplicación

1. **Abrir archivo M3U**:

   - Usa el botón "📁 Abrir Archivo Local"
   - O arrastra un archivo .m3u/.m3u8 a la ventana

2. **Cargar desde URL**:

   - Botón "🌐 Cargar desde URL"
   - Pega la URL de tu playlist M3U

3. **Archivo de prueba**:

   - Botón "🧪 Archivo de Prueba" para probar la funcionalidad

4. **Reproducir**:
   - Haz clic en cualquier elemento de la lista
   - Los logos de canales se muestran automáticamente si están disponibles
   - Usa los controles de reproducción avanzados
   - Botón "🔧" para probar conectividad del stream

## 🎮 Controles avanzados

### Botones de control:

- **⏮️ ⏯️ ⏭️** - Navegación básica
- **📺 PiP** - Picture-in-Picture (ventana flotante)
- **⛶ Pantalla** - Modo pantalla completa
- **☀️ Brillo** - Ajusta luminosidad del video
- **🔆 Contraste** - Mejora definición de imagen

### Atajos de teclado:

- **Espacio** - Play/Pause
- **P** - Toggle Picture-in-Picture
- **F** - Toggle pantalla completa
- **+/-** - Ajustar brillo
- **↑/↓** - Control de volumen
- **M** - Silenciar

## 🖼️ Soporte para logos de canales

La aplicación soporta automáticamente logos de canales definidos en archivos M3U:

```m3u
#EXTINF:-1 tvg-logo="https://ejemplo.com/logo.png" group-title="Noticias",Canal de Noticias
https://ejemplo.com/stream.m3u8
```

**Características de logos:**

- ✅ Carga automática desde URLs
- ✅ Placeholder con icono si no hay logo
- ✅ Manejo de errores (fallback a icono)
- ✅ Precarga inteligente para mejor rendimiento
- ✅ Diseño responsive

## 🛠️ Solución de problemas

### Si NO reproduce ningún video:

1. ✅ ¿Probaste con `basic-test.m3u`?
2. ✅ ¿Hay errores en la consola (F12)?
3. ✅ ¿Funciona el servidor local?

### Si algunos videos NO funcionan:

- **Esperado**: Muchos streams IPTV tienen protecciones
- **Usa**: El botón "🔧 Probar Stream" para diagnóstico
- **Revisa**: Los logs en la consola del navegador

### Para debugging detallado:

- Lee `DEBUG.md` para guía completa de solución de problemas

## 🏗️ Arquitectura técnica

**Stack tecnológico:**

- **Electron** - Framework de aplicación de escritorio
- **HTML5 Video + HLS.js** - Reproducción de video y streams
- **JavaScript ES6+** - Lógica de aplicación moderna
- **CSS Grid/Flexbox** - Interface responsive

**Ventajas sobre versión web:**

- ✅ **Sin restricciones CORS** - Acceso directo a streams
- ✅ **Headers personalizados** - User-Agent, Referer, etc.
- ✅ **Acceso al sistema de archivos** - Abrir archivos locales
- ✅ **Configuración persistente** - Guarda preferencias
- ✅ **Mejor rendimiento** - Sin limitaciones del navegador

**Estrategia de reproducción:**

1. **Análisis de URL** - Detecta tipo de stream automáticamente
2. **Carga inteligente** - HLS.js solo cuando es necesario
3. **Fallback robusto** - Múltiples estrategias de carga
4. **Error handling** - Diagnóstico detallado y auto-recuperación

## 📁 Estructura del proyecto

```
m3u-player-electron/
├── main.js              # Proceso principal de Electron
├── preload.js           # Script de preload (seguridad)
├── index.html           # Interface de usuario
├── styles.css           # Estilos modernos y responsive
├── script.js            # Lógica de la aplicación (800+ líneas)
├── package.json         # Configuración y dependencias
├── start.sh             # Script de inicio automático
├── assets/              # Iconos y recursos
├── m3u/                 # Archivos M3U de ejemplo
│   └── iptv-org.m3u     # Playlist de ejemplo
├── basic-test.m3u       # Videos de prueba garantizados
├── test-streams.m3u     # Streams HLS de prueba
├── sample.m3u           # Más ejemplos de prueba
├── README.md            # Esta documentación
├── DEBUG.md             # Guía detallada de debugging
└── TROUBLESHOOTING.md   # Solución de problemas técnicos
```

## 🔧 Compilación y distribución

### Crear ejecutables:

```bash
# Para todas las plataformas
npm run build

# Solo empaquetado (sin instalador)
npm run pack

# Distribución específica
npm run dist
```

### Plataformas soportadas:

- 🍎 **macOS** - .dmg y .app
- 🪟 **Windows** - .exe y instalador NSIS
- 🐧 **Linux** - AppImage y .deb

## 💡 Recomendaciones de uso

**Para contenido que funciona bien:**

- Videos alojados en CDNs públicos
- Streams HLS sin protección
- Contenido educativo/demostrativo

**Para IPTV comercial:**

- Usa aplicaciones nativas: VLC, Kodi, IPTVnator
- Este reproductor web tiene limitaciones de seguridad inherentes

## 🔍 Logs de debugging

La aplicación incluye logging detallado en consola:

```
🎬 Iniciando reproductor M3U...
✅ HLS.js cargado
📋 3 elementos en la playlist
🎬 Cargando: Big Buck Bunny
✅ Stream cargado correctamente
```

**Para debugging**: Abre herramientas de desarrollador (F12) y ve a "Console"
