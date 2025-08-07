# EPG Integration Summary - Automatic Download System

## 📺 Descripción General

Se ha implementado un sistema completo de integración EPG (Electronic Program Guide) que permite la descarga automática de guías de programación usando la base de datos de [iptv-org/epg](https://github.com/iptv-org/epg).

## 🚀 Características Implementadas

### 1. Integración con IPTV-Org Database
- **Archivo**: `src/js/epg/IPTVOrgIntegration.js`
- **Funcionalidad**: Mapeo automático de canales M3U con la base de datos de iptv-org
- **Capacidades**:
  - Búsqueda de canales por nombre, país, idioma
  - Descarga de datos EPG en formato XMLTV
  - Mapeo inteligente basado en tvg-id, tvg-name, y título del canal
  - Cache local de datos para reducir llamadas a la API

### 2. Descarga Automática Programada
- **Archivo**: `src/js/epg/AutoEPGDownloader.js`
- **Funcionalidad**: Sistema de descarga automática con programación configurable
- **Capacidades**:
  - Programación de descargas (diario, cada 12h, semanal, etc.)
  - Cola de descarga con gestión de prioridades
  - Reintentos automáticos con backoff exponencial
  - Gestión de caché con expiración configurable
  - Estadísticas de descarga y monitoreo

### 3. Interfaz de Administración
- **Archivos**: `src/js/epg/EPGAdminUI.js` y `src/styles/epg-admin.css`
- **Funcionalidad**: Panel de control completo para gestión de EPG
- **Capacidades**:
  - Vista de estadísticas en tiempo real
  - Control manual de descargas
  - Configuración de programación automática
  - Gestión de caché (limpiar, verificar tamaño)
  - Lista de canales con estado de EPG
  - Búsqueda y filtrado de canales

### 4. Mejoras en el Parser M3U
- **Archivo**: `src/js/main.js` (método `parseM3U`)
- **Mejoras**:
  - Extracción mejorada de atributos tvg-country, tvg-language
  - Detección automática de país desde el título del canal
  - Mejor mapeo de tvg-id y tvg-name
  - Soporte para nombres de canal múltiples

## 📦 Dependencias Agregadas

```json
{
  "node-cron": "^3.0.3",      // Programación de tareas
  "axios": "^1.6.2",          // Cliente HTTP
  "cheerio": "^1.0.0-rc.12",  // Parser HTML/XML
  "xml2js": "^0.6.2"          // Parser XML para XMLTV
}
```

## 🔧 Configuración

### Variables de Configuración en EPGManager
```javascript
const CONFIG = {
  IPTV_ORG_API: 'https://iptv-org.github.io/api',
  EPG_CACHE_EXPIRY: 12 * 60 * 60 * 1000, // 12 horas
  DOWNLOAD_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  SCHEDULE_DEFAULT: '0 */12 * * *' // Cada 12 horas
};
```

### Programación de Descarga Automática
- **Por defecto**: Cada 12 horas
- **Configurable**: Via interfaz de administración
- **Opciones**: Diario, cada 12h, cada 6h, semanal, mensual

## 📋 Uso del Sistema

### 1. Acceso al Panel de Administración
- Se agrega automáticamente un botón "EPG Admin" en la interfaz principal
- Panel modal con todas las funciones de gestión

### 2. Descarga Automática
- Se inicia automáticamente al cargar la aplicación
- Descarga EPG para todos los canales detectados
- Guarda datos en localStorage con expiración

### 3. Búsqueda de Programas
- Integración con el sistema de búsqueda existente
- Filtrado por canal, horario, género
- Búsqueda de texto en títulos y descripciones

## 🔄 Flujo de Trabajo

1. **Carga de Playlist**: El usuario carga un archivo M3U
2. **Análisis de Canales**: Sistema extrae información de canales (tvg-id, país, idioma)
3. **Mapeo Automático**: Busca coincidencias en la base de datos iptv-org
4. **Descarga EPG**: Obtiene guías de programación para canales mapeados
5. **Cache Local**: Almacena datos con expiración de 12 horas
6. **Programación**: Configura descarga automática según horario definido
7. **Actualización**: Refresca datos automáticamente según programación

## 🎯 Beneficios

- ✅ **Automatización completa**: Sin intervención manual del usuario
- ✅ **Base de datos extensa**: Acceso a +200 sitios EPG con miles de canales
- ✅ **Performance optimizada**: Cache local reduce latencia y ancho de banda
- ✅ **Interfaz intuitiva**: Panel de administración fácil de usar
- ✅ **Monitoreo avanzado**: Estadísticas y logs de descarga
- ✅ **Configuración flexible**: Horarios personalizables de actualización

## 🚀 Próximas Mejoras

- [ ] Notificaciones push para recordatorios de programas
- [ ] Exportación de EPG a formatos estándar (XMLTV, JSON)
- [ ] Integración con servicios EPG adicionales
- [ ] Soporte offline con sincronización diferida
- [ ] API REST para acceso externo a datos EPG

## 📝 Modified/Created Files

### New Files
- `src/js/epg/IPTVOrgIntegration.js`
- `src/js/epg/AutoEPGDownloader.js`
- `src/js/epg/EPGAdminUI.js`
- `src/styles/epg-admin.css`

### Modified Files
- `src/js/main.js` - EPG integration and parseM3U improvement
- `src/js/epg/EPGManager.js` - Integration with new modules
- `src/index.html` - EPG styles inclusion
- `package.json` - New dependencies

## ✅ Estado del Proyecto

El sistema EPG está completamente implementado y funcional. La aplicación puede:
- Descargar automáticamente guías de programación
- Mapear canales M3U con base de datos iptv-org
- Gestionar cache local con expiración
- Proporcionar interfaz de administración completa
- Programar actualizaciones automáticas
- Monitorear estadísticas de descarga

La integración está lista para uso en producción con todas las funcionalidades solicitadas implementadas.
