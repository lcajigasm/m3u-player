/**
 * ConfigManager - Gestor avanzado de configuración
 * Maneja configuración persistente, validación, y sincronización
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from '../core/EventBus.js';

class ConfigManager {
    constructor(options = {}) {
        this.eventBus = getEventBus();
        
        // Configuración actual
        this.config = {};
        this.defaultConfig = {};
        this.schema = new Map();
        
        // Estado del gestor
        this.initialized = false;
        this.dirty = false;
        this.syncInProgress = false;
        
        // Configuración del gestor
        this.options = {
            autoSave: options.autoSave !== false,
            autoSaveDelay: options.autoSaveDelay || 1000,
            enableValidation: options.enableValidation !== false,
            enableEncryption: options.enableEncryption || false,
            enableSync: options.enableSync || false,
            syncInterval: options.syncInterval || 30000,
            storageKey: options.storageKey || 'm3u_config',
            backupCount: options.backupCount || 5,
            enableSchema: options.enableSchema !== false,
            enableWatching: options.enableWatching !== false
        };

        // Watchers y callbacks
        this.watchers = new Map();
        this.validators = new Map();
        
        // Timers
        this.saveTimer = null;
        this.syncTimer = null;
        
        // Backup system
        this.backups = [];
        
        // Encryption key (si está habilitado)
        this.encryptionKey = null;

        this.init();
    }

    /**
     * Inicializar el gestor de configuración
     */
    async init() {
        try {
            // Establecer configuración por defecto
            this.setupDefaultConfig();
            
            // Establecer schema de validación
            this.setupValidationSchema();
            
            // Cargar configuración
            await this.load();
            
            // Configurar auto-save
            if (this.options.autoSave) {
                this.setupAutoSave();
            }
            
            // Configurar sincronización
            if (this.options.enableSync) {
                this.setupSync();
            }
            
            // Configurar event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            this.eventBus.emit('config:initialized', { config: this.config });
            
            console.log('⚙️ ConfigManager initialized');
            
        } catch (error) {
            console.error('❌ Error initializing ConfigManager:', error);
            throw error;
        }
    }

    /**
     * Configuración por defecto del sistema
     */
    setupDefaultConfig() {
        this.defaultConfig = {
            // Configuración de la aplicación
            app: {
                version: '2.0.0',
                firstRun: true,
                language: 'en',
                autoUpdate: true,
                telemetry: false,
                crashReporting: true
            },
            
            // Configuración de ventana
            window: {
                width: 1200,
                height: 800,
                x: null,
                y: null,
                maximized: false,
                alwaysOnTop: false,
                startMinimized: false,
                rememberPosition: true,
                rememberSize: true
            },
            
            // Configuración del reproductor
            player: {
                volume: 0.8,
                muted: false,
                autoplay: true,
                preload: 'metadata',
                userAgent: 'M3U Player/2.0.0',
                referer: '',
                origin: '',
                timeout: 15000,
                retries: 3,
                bufferSize: 30,
                lowLatencyMode: false,
                hardwareAcceleration: true
            },
            
            // Configuración de interfaz
            ui: {
                theme: 'dark',
                layout: 'default',
                enableAnimations: true,
                animationSpeed: 'normal',
                fontSize: 'medium',
                showThumbnails: true,
                compactMode: false,
                sidebarCollapsed: false,
                enableVirtualScrolling: true,
                showChannelNumbers: false,
                enableKeyboardShortcuts: true
            },
            
            // Configuración de red
            network: {
                timeout: 30000,
                maxConcurrentRequests: 5,
                enableProxy: false,
                proxyUrl: '',
                proxyAuth: false,
                proxyUsername: '',
                proxyPassword: '',
                enableIPv6: false,
                userAgent: 'M3U Player/2.0.0',
                customHeaders: {}
            },
            
            // Configuración EPG
            epg: {
                enabled: true,
                enableAutoUpdate: true,
                multiLevelCache: true,
                updateInterval: 3600000, // 1 hora
                cacheSize: 5000,
                enableReminders: true,
                enableNotifications: true,
                languages: ['en'],
                timezone: 'auto'
            },
            
            // Configuración de audio/video
            media: {
                audioLanguage: 'auto',
                subtitleLanguage: 'auto',
                enableSubtitles: false,
                audioNormalization: false,
                videoScaling: 'auto',
                deinterlacing: 'auto',
                aspectRatio: 'auto',
                audioDelay: 0,
                subtitleDelay: 0
            },
            
            // Configuración de privacidad
            privacy: {
                saveHistory: true,
                savePlaylistHistory: true,
                maxHistoryItems: 100,
                clearHistoryOnExit: false,
                enableAnalytics: false,
                shareUsageData: false
            },
            
            // Configuración avanzada
            advanced: {
                debugMode: false,
                enableLogs: true,
                logLevel: 'info',
                maxLogSize: 10485760, // 10MB
                enablePerformanceMonitoring: false,
                enableExperimentalFeatures: false,
                customCSS: '',
                enablePlugins: false
            }
        };

        // Copiar configuración por defecto a configuración actual
        this.config = this.deepClone(this.defaultConfig);
    }

    /**
     * Configurar schema de validación
     */
    setupValidationSchema() {
        if (!this.options.enableSchema) return;

        // Schema para validación de tipos y rangos
        this.schema.set('app.version', { type: 'string', required: true });
        this.schema.set('app.firstRun', { type: 'boolean' });
        this.schema.set('app.language', { type: 'string', enum: ['en', 'es', 'fr', 'de', 'it', 'pt'] });
        
        this.schema.set('window.width', { type: 'number', min: 800, max: 4096 });
        this.schema.set('window.height', { type: 'number', min: 600, max: 2160 });
        this.schema.set('window.maximized', { type: 'boolean' });
        
        this.schema.set('player.volume', { type: 'number', min: 0, max: 1 });
        this.schema.set('player.autoplay', { type: 'boolean' });
        this.schema.set('player.timeout', { type: 'number', min: 5000, max: 60000 });
        this.schema.set('player.retries', { type: 'number', min: 0, max: 10 });
        
        this.schema.set('ui.theme', { type: 'string', enum: ['dark', 'light', 'gaming', 'cinema'] });
        this.schema.set('ui.layout', { type: 'string', enum: ['default', 'compact', 'tv', 'mobile'] });
        this.schema.set('ui.fontSize', { type: 'string', enum: ['small', 'medium', 'large', 'xlarge'] });
        
        this.schema.set('network.timeout', { type: 'number', min: 5000, max: 120000 });
        this.schema.set('network.maxConcurrentRequests', { type: 'number', min: 1, max: 20 });
        
    this.schema.set('epg.updateInterval', { type: 'number', min: 3600000, max: 604800000 }); // 1h - 7d
    this.schema.set('epg.cacheSize', { type: 'number', min: 100, max: 10000 });
    this.schema.set('epg.enableAutoUpdate', { type: 'boolean' });
    this.schema.set('epg.multiLevelCache', { type: 'boolean' });
    this.schema.set('epg.enabled', { type: 'boolean' });
    this.schema.set('epg.enableReminders', { type: 'boolean' });
    this.schema.set('epg.enableNotifications', { type: 'boolean' });
        
        this.schema.set('privacy.maxHistoryItems', { type: 'number', min: 10, max: 1000 });
        this.schema.set('advanced.maxLogSize', { type: 'number', min: 1048576, max: 104857600 }); // 1MB - 100MB
    }

    /**
     * Obtener valor de configuración
     * @param {string} key - Clave de configuración (formato dot notation)
     * @param {*} defaultValue - Valor por defecto si no existe
     * @returns {*} Valor de configuración
     */
    get(key, defaultValue = undefined) {
        const value = this.getNestedValue(this.config, key);
        
        if (value === undefined) {
            // Intentar obtener del defaultConfig
            const defaultVal = this.getNestedValue(this.defaultConfig, key);
            return defaultVal !== undefined ? defaultVal : defaultValue;
        }
        
        return value;
    }

    /**
     * Establecer valor de configuración
     * @param {string} key - Clave de configuración
     * @param {*} value - Valor a establecer
     * @param {Object} options - Opciones adicionales
     * @returns {boolean} true si se estableció correctamente
     */
    set(key, value, options = {}) {
        const {
            validate = this.options.enableValidation,
            notify = true,
            immediate = false
        } = options;

        // Validar si está habilitado
        if (validate && !this.validateValue(key, value)) {
            const errorMsg = this.getValidationError(key, value);
            console.error(`❌ Config validation failed for '${key}': ${errorMsg}`);
            this.eventBus.emit('config:validation-error', { key, value, error: errorMsg });
            return false;
        }

        // Obtener valor anterior
        const oldValue = this.get(key);
        
        // Establecer nuevo valor
        this.setNestedValue(this.config, key, value);
        
        // Marcar como dirty
        this.dirty = true;
        
        // Notificar watchers
        if (notify) {
            this.notifyWatchers(key, value, oldValue);
        }
        
        // Emit event
        this.eventBus.emit('config:changed', { 
            key, 
            value, 
            oldValue 
        });

        // Auto-save si está habilitado
        if (this.options.autoSave && !immediate) {
            this.scheduleAutoSave();
        } else if (immediate) {
            this.save();
        }

        return true;
    }

    /**
     * Obtener múltiples valores de configuración
     * @param {Array<string>} keys - Array de claves
     * @returns {Object} Objeto con los valores
     */
    getMultiple(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = this.get(key);
        }
        return result;
    }

    /**
     * Establecer múltiples valores de configuración
     * @param {Object} values - Objeto con clave-valor
     * @param {Object} options - Opciones adicionales
     * @returns {boolean} true si todos se establecieron correctamente
     */
    setMultiple(values, options = {}) {
        const results = [];
        
        for (const [key, value] of Object.entries(values)) {
            results.push(this.set(key, value, { ...options, notify: false }));
        }
        
        // Notificar cambio múltiple
        if (options.notify !== false && results.some(r => r)) {
            this.eventBus.emit('config:multiple-changed', { values });
        }
        
        return results.every(r => r);
    }

    /**
     * Resetear configuración a valores por defecto
     * @param {string|Array} keys - Clave específica o array de claves (opcional)
     */
    reset(keys = null) {
        if (keys === null) {
            // Reset completo
            this.config = this.deepClone(this.defaultConfig);
            this.eventBus.emit('config:reset', { full: true });
        } else {
            // Reset de claves específicas
            const keysArray = Array.isArray(keys) ? keys : [keys];
            
            for (const key of keysArray) {
                const defaultValue = this.getNestedValue(this.defaultConfig, key);
                if (defaultValue !== undefined) {
                    this.set(key, defaultValue, { notify: false });
                }
            }
            
            this.eventBus.emit('config:reset', { keys: keysArray });
        }
        
        this.dirty = true;
        
        if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
    }

    /**
     * Validar valor según schema
     * @param {string} key - Clave de configuración
     * @param {*} value - Valor a validar
     * @returns {boolean} true si es válido
     */
    validateValue(key, value) {
        if (!this.options.enableValidation || !this.schema.has(key)) {
            return true;
        }

        const rule = this.schema.get(key);
        
        // Validar tipo
        if (rule.type && typeof value !== rule.type) {
            return false;
        }
        
        // Validar rango numérico
        if (rule.type === 'number') {
            if (rule.min !== undefined && value < rule.min) return false;
            if (rule.max !== undefined && value > rule.max) return false;
        }
        
        // Validar enum
        if (rule.enum && !rule.enum.includes(value)) {
            return false;
        }
        
        // Validar requerido
        if (rule.required && (value === undefined || value === null)) {
            return false;
        }
        
        // Validar con función personalizada
        if (rule.validator && typeof rule.validator === 'function') {
            return rule.validator(value, key);
        }
        
        return true;
    }

    /**
     * Obtener mensaje de error de validación legible
     * @param {string} key
     * @param {*} value
     * @returns {string}
     */
    getValidationError(key, value) {
        if (!this.schema.has(key)) return 'No validation rule defined';
        const rule = this.schema.get(key);
        const typeOfVal = typeof value;

        if (rule.type && typeOfVal !== rule.type) {
            return `expected type ${rule.type}, got ${typeOfVal}`;
        }
        if (rule.type === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                return `value ${value} is less than minimum ${rule.min}`;
            }
            if (rule.max !== undefined && value > rule.max) {
                return `value ${value} exceeds maximum ${rule.max}`;
            }
        }
        if (rule.enum && !rule.enum.includes(value)) {
            return `value '${value}' not in allowed set: ${rule.enum.join(', ')}`;
        }
        if (rule.required && (value === undefined || value === null)) {
            return 'value is required but missing';
        }
        if (rule.validator && typeof rule.validator === 'function') {
            // No detalle adicional sin ejecutar el validador personalizado
            return 'custom validator rejected value';
        }
        return 'invalid value';
    }

    /**
     * Agregar validador personalizado
     * @param {string} key - Clave de configuración
     * @param {Function} validator - Función validadora
     */
    addValidator(key, validator) {
        if (this.schema.has(key)) {
            const rule = this.schema.get(key);
            rule.validator = validator;
        } else {
            this.schema.set(key, { validator });
        }
    }

    /**
     * Observar cambios en una clave específica
     * @param {string} key - Clave a observar
     * @param {Function} callback - Función callback
     * @param {Object} options - Opciones del watcher
     * @returns {string} ID del watcher
     */
    watch(key, callback, options = {}) {
        if (!this.options.enableWatching) {
            console.warn('⚠️ Watching is disabled');
            return null;
        }

        const watcherId = `watcher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const watcher = {
            id: watcherId,
            key,
            callback,
            immediate: options.immediate || false,
            deep: options.deep || false,
            once: options.once || false
        };

        if (!this.watchers.has(key)) {
            this.watchers.set(key, []);
        }
        
        this.watchers.get(key).push(watcher);

        // Ejecutar inmediatamente si está configurado
        if (watcher.immediate) {
            const currentValue = this.get(key);
            try {
                callback(currentValue, undefined, key);
            } catch (error) {
                console.error(`❌ Error in immediate watcher for '${key}':`, error);
            }
        }

        return watcherId;
    }

    /**
     * Remover watcher
     * @param {string} watcherId - ID del watcher
     * @returns {boolean} true si se removió correctamente
     */
    unwatch(watcherId) {
        for (const [key, watchers] of this.watchers) {
            const index = watchers.findIndex(w => w.id === watcherId);
            if (index !== -1) {
                watchers.splice(index, 1);
                if (watchers.length === 0) {
                    this.watchers.delete(key);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Cargar configuración desde almacenamiento
     */
    async load() {
        try {
            let configData = null;

            // Intentar cargar desde Electron store primero
            if (window.electronAPI) {
                const result = await window.electronAPI.loadConfig();
                if (result && typeof result === 'object') {
                    configData = result;
                }
            }

            // Fallback a localStorage
            if (!configData && typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(this.options.storageKey);
                if (stored) {
                    configData = JSON.parse(stored);
                }
            }

            if (configData) {
                // Desencriptar si es necesario
                if (this.options.enableEncryption && configData.encrypted) {
                    configData = await this.decrypt(configData);
                }

                // Merge con configuración actual
                this.config = this.mergeConfig(this.defaultConfig, configData);

                // Migraciones de esquema (compatibilidad)
                this.migrateConfig();
                
                // Validar configuración cargada
                if (this.options.enableValidation) {
                    this.validateLoadedConfig();
                }

                console.log('⚙️ Configuration loaded successfully');
            } else {
                console.log('⚙️ No saved configuration found, using defaults');
            }

            this.dirty = false;
            this.eventBus.emit('config:loaded', { config: this.config });

        } catch (error) {
            console.error('❌ Error loading configuration:', error);
            
            // Intentar cargar backup
            await this.loadFromBackup();
        }
    }

    /**
     * Guardar configuración
     */
    async save() {
        if (!this.dirty) return;

        try {
            let configData = this.deepClone(this.config);

            // Encriptar si es necesario
            if (this.options.enableEncryption) {
                configData = await this.encrypt(configData);
            }

            // Crear backup antes de guardar
            await this.createBackup();

            // Guardar en Electron store primero
            if (window.electronAPI) {
                await window.electronAPI.saveConfig(configData);
            }

            // Guardar en localStorage como fallback
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.options.storageKey, JSON.stringify(configData));
            }

            this.dirty = false;
            this.eventBus.emit('config:saved', { config: this.config });
            
            console.log('⚙️ Configuration saved successfully');

        } catch (error) {
            console.error('❌ Error saving configuration:', error);
            this.eventBus.emit('config:save-error', { error: error.message });
            throw error;
        }
    }

    /**
     * Exportar configuración
     * @param {Object} options - Opciones de exportación
     * @returns {Object} Configuración exportada
     */
    export(options = {}) {
        const {
            includeDefaults = false,
            excludeKeys = [],
            format = 'json'
        } = options;

        let exportData = includeDefaults ? 
            this.deepClone(this.config) : 
            this.getChangedConfig();

        // Excluir claves específicas
        if (excludeKeys.length > 0) {
            exportData = this.excludeKeys(exportData, excludeKeys);
        }

        // Agregar metadata
        exportData._metadata = {
            version: this.get('app.version'),
            exportDate: new Date().toISOString(),
            source: 'M3U Player ConfigManager'
        };

        this.eventBus.emit('config:exported', { size: Object.keys(exportData).length });

        return exportData;
    }

    /**
     * Importar configuración
     * @param {Object} configData - Datos de configuración
     * @param {Object} options - Opciones de importación
     */
    async import(configData, options = {}) {
        const {
            merge = true,
            validate = true,
            backup = true
        } = options;

        try {
            // Crear backup antes de importar
            if (backup) {
                await this.createBackup();
            }

            // Validar datos importados
            if (validate) {
                this.validateImportedConfig(configData);
            }

            if (merge) {
                // Merge con configuración actual
                this.config = this.mergeConfig(this.config, configData);
            } else {
                // Reemplazar completamente
                this.config = this.mergeConfig(this.defaultConfig, configData);
            }

            this.dirty = true;
            
            if (this.options.autoSave) {
                await this.save();
            }

            this.eventBus.emit('config:imported', { merge });
            console.log('⚙️ Configuration imported successfully');

        } catch (error) {
            console.error('❌ Error importing configuration:', error);
            this.eventBus.emit('config:import-error', { error: error.message });
            throw error;
        }
    }

    // Métodos privados

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    mergeConfig(base, override) {
        const result = this.deepClone(base);
        
        function mergeRecursive(target, source) {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key] || typeof target[key] !== 'object') {
                            target[key] = {};
                        }
                        mergeRecursive(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
        }
        
        mergeRecursive(result, override);
        return result;
    }

    notifyWatchers(key, newValue, oldValue) {
        if (!this.watchers.has(key)) return;

        const watchers = this.watchers.get(key);
        const watchersToRemove = [];

        for (const watcher of watchers) {
            try {
                watcher.callback(newValue, oldValue, key);
                
                // Remover si es 'once'
                if (watcher.once) {
                    watchersToRemove.push(watcher.id);
                }
            } catch (error) {
                console.error(`❌ Error in watcher for '${key}':`, error);
            }
        }

        // Remover watchers 'once'
        for (const watcherId of watchersToRemove) {
            this.unwatch(watcherId);
        }
    }

    setupAutoSave() {
        // Auto-save ya está manejado en el método set()
        console.log('⚙️ Auto-save enabled');
    }

    scheduleAutoSave() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        this.saveTimer = setTimeout(() => {
            this.save().catch(error => {
                console.error('❌ Auto-save failed:', error);
            });
        }, this.options.autoSaveDelay);
    }

    setupSync() {
        if (!this.options.enableSync) return;

        this.syncTimer = setInterval(() => {
            this.sync().catch(error => {
                console.error('❌ Config sync failed:', error);
            });
        }, this.options.syncInterval);

        console.log('⚙️ Config sync enabled');
    }

    async sync() {
        if (this.syncInProgress) return;

        this.syncInProgress = true;
        
        try {
            // TODO: Implementar sincronización con servidor remoto
            console.log('🔄 Config sync completed');
        } catch (error) {
            console.error('❌ Config sync error:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async createBackup() {
        if (this.backups.length >= this.options.backupCount) {
            this.backups.shift(); // Remover backup más antiguo
        }

        const backup = {
            timestamp: Date.now(),
            config: this.deepClone(this.config)
        };

        this.backups.push(backup);
        
        // Guardar backups en localStorage
        try {
            localStorage.setItem(`${this.options.storageKey}_backups`, JSON.stringify(this.backups));
        } catch (error) {
            console.warn('⚠️ Could not save config backup:', error);
        }
    }

    async loadFromBackup() {
        try {
            const backupsData = localStorage.getItem(`${this.options.storageKey}_backups`);
            if (backupsData) {
                this.backups = JSON.parse(backupsData);
                
                if (this.backups.length > 0) {
                    const latestBackup = this.backups[this.backups.length - 1];
                    this.config = this.mergeConfig(this.defaultConfig, latestBackup.config);
                    console.log('⚙️ Configuration loaded from backup');
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Error loading from backup:', error);
        }
        
        return false;
    }

    migrateConfig() {
        try {
            // Migrar epg.autoUpdate -> epg.enableAutoUpdate
            if (this.config && this.config.epg) {
                const epg = this.config.epg;
                if (Object.prototype.hasOwnProperty.call(epg, 'autoUpdate') &&
                    !Object.prototype.hasOwnProperty.call(epg, 'enableAutoUpdate')) {
                    epg.enableAutoUpdate = Boolean(epg.autoUpdate);
                    delete epg.autoUpdate;
                }
            }
        } catch (e) {
            console.warn('⚠️ EPG config migration skipped:', e?.message || e);
        }
    }

    validateLoadedConfig() {
        const errors = [];
        
        for (const [key, rule] of this.schema) {
            const value = this.get(key);
            if (!this.validateValue(key, value)) {
                const reason = this.getValidationError(key, value);
                errors.push({ key, reason, value });
                // Reset a valor por defecto
                const defaultValue = this.getNestedValue(this.defaultConfig, key);
                if (defaultValue !== undefined) {
                    this.set(key, defaultValue, { validate: false, notify: false });
                }
            }
        }

        if (errors.length > 0) {
            console.warn('⚠️ Invalid config values reset to defaults:', errors);
            this.eventBus.emit('config:validation-error', { errors });
        }
    }

    validateImportedConfig(configData) {
        if (!configData || typeof configData !== 'object') {
            throw new Error('Invalid configuration data');
        }

        // Validar estructura básica
        if (configData._metadata && configData._metadata.version) {
            const importVersion = configData._metadata.version;
            const currentVersion = this.get('app.version');
            
            if (importVersion !== currentVersion) {
                console.warn(`⚠️ Version mismatch: importing ${importVersion}, current ${currentVersion}`);
            }
        }
    }

    getChangedConfig() {
        const changed = {};
        
        const compareObjects = (current, defaults, path = '') => {
            for (const key in current) {
                if (current.hasOwnProperty(key)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    const currentValue = current[key];
                    const defaultValue = defaults[key];
                    
                    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
                        if (typeof defaultValue === 'object' && defaultValue !== null) {
                            compareObjects(currentValue, defaultValue, currentPath);
                        } else {
                            this.setNestedValue(changed, currentPath, currentValue);
                        }
                    } else if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
                        this.setNestedValue(changed, currentPath, currentValue);
                    }
                }
            }
        };
        
        compareObjects(this.config, this.defaultConfig);
        return changed;
    }

    excludeKeys(obj, excludeKeys) {
        const result = this.deepClone(obj);
        
        for (const key of excludeKeys) {
            const parts = key.split('.');
            let current = result;
            
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) break;
                current = current[parts[i]];
            }
            
            if (current && current.hasOwnProperty(parts[parts.length - 1])) {
                delete current[parts[parts.length - 1]];
            }
        }
        
        return result;
    }

    async encrypt(data) {
        // TODO: Implementar encriptación
        return { encrypted: true, data };
    }

    async decrypt(encryptedData) {
        // TODO: Implementar desencriptación
        return encryptedData.data;
    }

    setupEventListeners() {
        // Escuchar eventos del EventBus
        this.eventBus.on('config:get', (event) => {
            const { key, callback } = event.data;
            const value = this.get(key);
            if (callback) callback(value);
        });

        this.eventBus.on('config:set', (event) => {
            const { key, value, options } = event.data;
            this.set(key, value, options);
        });

        this.eventBus.on('config:reset', (event) => {
            const { keys } = event.data;
            this.reset(keys);
        });

        this.eventBus.on('config:save', () => {
            this.save();
        });

        this.eventBus.on('config:load', () => {
            this.load();
        });
    }

    /**
     * Destruir el gestor de configuración
     */
    destroy() {
        // Guardar configuración pendiente
        if (this.dirty) {
            this.save().catch(console.error);
        }

        // Limpiar timers
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        // Limpiar watchers
        this.watchers.clear();
        this.validators.clear();

        // Limpiar estado
        this.config = {};
        this.defaultConfig = {};
        this.schema.clear();
        this.backups = [];

        this.eventBus.emit('config:destroyed');
        console.log('⚙️ ConfigManager destroyed');
    }
}

export default ConfigManager;