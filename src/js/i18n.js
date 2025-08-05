// Internationalization (i18n) system for M3U Player
// Supports Spanish (es) and English (en)

const TRANSLATIONS = {
    es: {
        // Dashboard
        'total_channels': 'Canales Totales',
        'audio_streams': 'Streams de Audio',
        'connection': 'Conexión',
        'favorites': 'Favoritos',
        'quick_actions': 'Acciones Rápidas',
        'now_playing': 'Reproduciendo Ahora',
        'recently_played': 'Reproducidos Recientemente',
        'favorite_channels': 'Canales Favoritos',
        
        // Action Tiles
        'open_file': 'Abrir Archivo',
        'load_local_m3u': 'Cargar M3U local',
        'load_url': 'Cargar URL',
        'stream_from_web': 'Stream desde web',
        'iptv_org': 'IPTV-ORG',
        'free_channels': 'Canales gratuitos',
        'free_tv': 'Free-TV',
        'community_channels': 'Canales de la comunidad',
        'recent': 'Recientes',
        'last_played': 'Último reproducido',
        
        // Now Playing Widget
        'no_channel_selected': 'No hay canal seleccionado',
        'return_to_player': 'Volver al Reproductor',
        'minimize': 'Minimizar',
        'expand': 'Expandir',
        
        // Player Controls
        'previous': 'Anterior',
        'play_pause': 'Reproducir/Pausar',
        'next': 'Siguiente',
        'stop': 'Detener',
        'mute_unmute': 'Silenciar/Activar',
        'picture_in_picture': 'Imagen en imagen',
        'fullscreen': 'Pantalla completa',
        'back_to_dashboard': 'Volver al Panel',
        
        // Search and Filters
        'search_placeholder': 'Buscar canales, grupos o tipos de stream...',
        'voice_search': 'Búsqueda por voz',
        'clear_search': 'Limpiar búsqueda',
        'suggestions': 'Sugerencias',
        'results': 'resultados',
        'navigate': 'Navegar',
        'select': 'Seleccionar',
        'close': 'Cerrar',
        'all_groups': 'Todos los grupos',
        'all_types': 'Todos los tipos',
        'quality_hd': 'Calidad HD+',
        'language': 'Idioma',
        'country': 'País',
        
        // Playlist
        'channel_list': 'Lista de Canales',
        'loaded_playlist': 'Lista Cargada',
        'channels': 'canales',
        'no_channels_found': 'No se encontraron canales',
        'loading_channels': 'Cargando canales...',
        
        // URL Input
        'load_from_url': 'Cargar desde URL',
        'enter_url_description': 'Introduce la URL de tu playlist M3U/M3U8',
        'url_placeholder': 'https://ejemplo.com/lista.m3u8',
        'load_playlist': 'Cargar Lista',
        'cancel': 'Cancelar',
        'recent_urls': 'URLs Recientes',
        'popular_urls': 'URLs Populares',
        
        // Loading and Messages
        'loading': 'Cargando...',
        'processing': 'Procesando...',
        'please_wait': 'Por favor espere',
        'downloading': 'Descargando...',
        'connecting_server': 'Conectando al servidor...',
        'download_complete': 'Descarga completa',
        'processing_playlist': 'Procesando lista...',
        'validating_playlist': 'Validando lista...',
        
        // IPTV-ORG specific
        'downloading_iptv_org': 'Descargando IPTV-ORG',
        'fetching_latest_playlist': 'Obteniendo la última lista de iptv-org.github.io...',
        'download_iptv_org': 'Descargar IPTV-ORG',
        'play_iptv_org': 'Reproducir IPTV-ORG',
        'ready_to_play': 'Listo para reproducir',
        
        // Free-TV specific
        'downloading_free_tv': 'Descargando Free-TV',
        'fetching_free_tv_playlist': 'Obteniendo la última lista de Free-TV/IPTV...',
        'download_free_tv': 'Descargar Free-TV',
        'play_free_tv': 'Reproducir Free-TV',
        
        // Favorites
        'add_to_favorites': 'Añadir a favoritos',
        'remove_from_favorites': 'Quitar de favoritos',
        'play_favorite': 'Reproducir favorito',
        'remove_favorite': 'Eliminar favorito',
        
        // Errors and Status
        'error': 'Error',
        'success': 'Éxito',
        'warning': 'Advertencia',
        'info': 'Información',
        'download_failed': 'Descarga fallida',
        'playlist_empty': 'La lista descargada parece estar vacía',
        'no_playlist_loaded': 'No hay lista cargada actualmente',
        'stream_error': 'Error de stream',
        'connection_failed': 'Conexión fallida',
        'file_not_found': 'Archivo no encontrado',
        
        // File Info
        'channels_loaded': 'canales cargados',
        'playlist_downloaded': 'Lista descargada',
        'error_loading': 'Error cargando',
        
        // Keyboard Shortcuts
        'keyboard_shortcuts': 'Atajos de teclado',
        'space_play_pause': 'Espacio: Reproducir/Pausar',
        'arrow_keys': 'Flechas: Navegar',
        'enter_select': 'Enter: Seleccionar',
        'esc_close': 'Esc: Cerrar',
        
        // Settings
        'settings': 'Configuración',
        'language_setting': 'Idioma',
        'theme': 'Tema',
        'auto_play': 'Reproducción automática',
        'volume': 'Volumen',
        'quality': 'Calidad',
        
        // Stream Types
        'stream': 'Stream',
        'hls': 'HLS',
        'direct': 'Directo',
        'radio': 'Radio',
        
        // Time and Duration
        'live': 'En vivo',
        'duration': 'Duración',
        'unknown': 'Desconocido'
    },
    en: {
        // Dashboard
        'total_channels': 'Total Channels',
        'audio_streams': 'Audio Streams',
        'connection': 'Connection',
        'favorites': 'Favorites',
        'quick_actions': 'Quick Actions',
        'now_playing': 'Now Playing',
        'recently_played': 'Recently Played',
        'favorite_channels': 'Favorite Channels',
        
        // Action Tiles
        'open_file': 'Open File',
        'load_local_m3u': 'Load local M3U',
        'load_url': 'Load URL',
        'stream_from_web': 'Stream from web',
        'iptv_org': 'IPTV-ORG',
        'free_channels': 'Free channels',
        'free_tv': 'Free-TV',
        'community_channels': 'Community channels',
        'recent': 'Recent',
        'last_played': 'Last played',
        
        // Now Playing Widget
        'no_channel_selected': 'No channel selected',
        'return_to_player': 'Return to Player',
        'minimize': 'Minimize',
        'expand': 'Expand',
        
        // Player Controls
        'previous': 'Previous',
        'play_pause': 'Play/Pause',
        'next': 'Next',
        'stop': 'Stop',
        'mute_unmute': 'Mute/Unmute',
        'picture_in_picture': 'Picture in Picture',
        'fullscreen': 'Fullscreen',
        'back_to_dashboard': 'Back to Dashboard',
        
        // Search and Filters
        'search_placeholder': 'Search channels, groups, or stream types...',
        'voice_search': 'Voice search',
        'clear_search': 'Clear search',
        'suggestions': 'Suggestions',
        'results': 'results',
        'navigate': 'Navigate',
        'select': 'Select',
        'close': 'Close',
        'all_groups': 'All groups',
        'all_types': 'All types',
        'quality_hd': 'HD+ Quality',
        'language': 'Language',
        'country': 'Country',
        
        // Playlist
        'channel_list': 'Channel List',
        'loaded_playlist': 'Loaded Playlist',
        'channels': 'channels',
        'no_channels_found': 'No channels found',
        'loading_channels': 'Loading channels...',
        
        // URL Input
        'load_from_url': 'Load from URL',
        'enter_url_description': 'Enter the URL of your M3U/M3U8 playlist',
        'url_placeholder': 'https://example.com/playlist.m3u8',
        'load_playlist': 'Load Playlist',
        'cancel': 'Cancel',
        'recent_urls': 'Recent URLs',
        'popular_urls': 'Popular URLs',
        
        // Loading and Messages
        'loading': 'Loading...',
        'processing': 'Processing...',
        'please_wait': 'Please wait',
        'downloading': 'Downloading...',
        'connecting_server': 'Connecting to server...',
        'download_complete': 'Download complete!',
        'processing_playlist': 'Processing playlist...',
        'validating_playlist': 'Validating playlist...',
        
        // IPTV-ORG specific
        'downloading_iptv_org': 'Downloading IPTV-ORG',
        'fetching_latest_playlist': 'Fetching the latest playlist from iptv-org.github.io...',
        'download_iptv_org': 'Download IPTV-ORG',
        'play_iptv_org': 'Play IPTV-ORG',
        'ready_to_play': 'Ready to play',
        
        // Free-TV specific
        'downloading_free_tv': 'Downloading Free-TV',
        'fetching_free_tv_playlist': 'Fetching the latest playlist from Free-TV/IPTV...',
        'download_free_tv': 'Download Free-TV',
        'play_free_tv': 'Play Free-TV',
        
        // Favorites
        'add_to_favorites': 'Add to favorites',
        'remove_from_favorites': 'Remove from favorites',
        'play_favorite': 'Play favorite',
        'remove_favorite': 'Remove favorite',
        
        // Errors and Status
        'error': 'Error',
        'success': 'Success',
        'warning': 'Warning',
        'info': 'Info',
        'download_failed': 'Download failed',
        'playlist_empty': 'Downloaded playlist appears to be empty',
        'no_playlist_loaded': 'No playlist currently loaded',
        'stream_error': 'Stream error',
        'connection_failed': 'Connection failed',
        'file_not_found': 'File not found',
        
        // File Info
        'channels_loaded': 'channels loaded',
        'playlist_downloaded': 'Playlist downloaded',
        'error_loading': 'Error loading',
        
        // Keyboard Shortcuts
        'keyboard_shortcuts': 'Keyboard Shortcuts',
        'space_play_pause': 'Space: Play/Pause',
        'arrow_keys': 'Arrows: Navigate',
        'enter_select': 'Enter: Select',
        'esc_close': 'Esc: Close',
        
        // Settings
        'settings': 'Settings',
        'language_setting': 'Language',
        'theme': 'Theme',
        'auto_play': 'Auto play',
        'volume': 'Volume',
        'quality': 'Quality',
        
        // Stream Types
        'stream': 'Stream',
        'hls': 'HLS',
        'direct': 'Direct',
        'radio': 'Radio',
        
        // Time and Duration
        'live': 'Live',
        'duration': 'Duration',
        'unknown': 'Unknown'
    }
};

class I18n {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = TRANSLATIONS;
    }
    
    detectLanguage() {
        // Check localStorage first
        const savedLanguage = localStorage.getItem('m3u-player-language');
        if (savedLanguage && this.translations[savedLanguage]) {
            return savedLanguage;
        }
        
        // Check browser language
        const browserLang = navigator.language.substring(0, 2);
        if (this.translations[browserLang]) {
            return browserLang;
        }
        
        // Default to Spanish
        return 'es';
    }
    
    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('m3u-player-language', language);
            this.updateUI();
        }
    }
    
    t(key, defaultValue = null) {
        const translation = this.translations[this.currentLanguage]?.[key];
        return translation || defaultValue || key;
    }
    
    // Format strings with variables
    format(key, variables = {}) {
        let text = this.t(key);
        
        Object.keys(variables).forEach(variable => {
            text = text.replace(`{${variable}}`, variables[variable]);
        });
        
        return text;
    }
    
    updateUI() {
        // Update all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach((element) => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Check if element has specific attribute to update
            const attr = element.getAttribute('data-i18n-attr');
            if (attr) {
                element.setAttribute(attr, translation);
            } else {
                element.textContent = translation;
            }
        });
        
        // Update placeholder texts
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
        
        // Update title attributes
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }
    
    getAvailableLanguages() {
        return Object.keys(this.translations).map(code => ({
            code,
            name: code === 'es' ? 'Español' : 'English'
        }));
    }
    
    // Debug method to test translations
    testTranslations() {
        console.log('🌐 Testing translation system...');
        console.log('🌐 Current language:', this.currentLanguage);
        console.log('🌐 Available languages:', Object.keys(this.translations));
        
        // Test a few key translations
        const testKeys = ['total_channels', 'quick_actions', 'now_playing', 'open_file'];
        testKeys.forEach(key => {
            console.log(`🌐 "${key}" -> "${this.t(key)}"`);
        });
        
        // Count elements with data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        console.log('🌐 Elements with data-i18n:', elements.length);
        
        // Force UI update
        this.updateUI();
        console.log('🌐 UI update forced');
    }
}

// Global i18n instance
console.log('🌐 Creating global i18n instance...');
window.i18n = new I18n();
console.log('🌐 i18n instance created, current language:', window.i18n.currentLanguage);

// Helper function for easy access
window.t = (key, defaultValue = null) => window.i18n.t(key, defaultValue);

console.log('🌐 i18n system fully loaded');