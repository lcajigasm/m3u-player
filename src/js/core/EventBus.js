/**
 * EventBus - Sistema de eventos centralizado
 * Implementa patrón Observer para comunicación entre módulos
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = process.env.NODE_ENV === 'development';
        this.eventHistory = [];
        this.maxHistorySize = 1000;
        
        // Performance metrics
        this.metrics = {
            totalEvents: 0,
            eventTypes: new Map(),
            averageProcessingTime: 0
        };
        
        if (this.debugMode) {
            console.log('🚌 EventBus initialized in debug mode');
        }
    }

    /**
     * Suscribirse a un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     * @param {Object} options - Opciones adicionales
     * @param {boolean} options.once - Ejecutar solo una vez
     * @param {number} options.priority - Prioridad (mayor número = mayor prioridad)
     * @param {Object} options.context - Contexto para el callback
     * @returns {string} ID único del listener
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listenerId = this._generateListenerId();
        const listener = {
            id: listenerId,
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            createdAt: Date.now()
        };

        const listeners = this.events.get(eventName);
        listeners.push(listener);
        
        // Ordenar por prioridad (mayor prioridad primero)
        listeners.sort((a, b) => b.priority - a.priority);
        
        this.events.set(eventName, listeners);

        if (this.debugMode) {
            console.log(`📡 Listener registered for '${eventName}' (ID: ${listenerId})`);
        }

        return listenerId;
    }

    /**
     * Suscribirse a un evento que se ejecuta solo una vez
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     * @param {Object} options - Opciones adicionales
     * @returns {string} ID único del listener
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    /**
     * Desuscribirse de un evento
     * @param {string} eventName - Nombre del evento
     * @param {string|Function} listenerIdOrCallback - ID del listener o función callback
     * @returns {boolean} true si se removió correctamente
     */
    off(eventName, listenerIdOrCallback) {
        if (!this.events.has(eventName)) {
            return false;
        }

        const listeners = this.events.get(eventName);
        const initialLength = listeners.length;

        if (typeof listenerIdOrCallback === 'string') {
            // Remover por ID
            const filteredListeners = listeners.filter(l => l.id !== listenerIdOrCallback);
            this.events.set(eventName, filteredListeners);
        } else if (typeof listenerIdOrCallback === 'function') {
            // Remover por callback
            const filteredListeners = listeners.filter(l => l.callback !== listenerIdOrCallback);
            this.events.set(eventName, filteredListeners);
        }

        const removed = listeners.length !== initialLength;
        
        if (this.debugMode && removed) {
            console.log(`🗑️ Listener removed from '${eventName}'`);
        }

        return removed;
    }

    /**
     * Emitir un evento
     * @param {string} eventName - Nombre del evento
     * @param {*} data - Datos del evento
     * @param {Object} options - Opciones de emisión
     * @param {boolean} options.async - Ejecutar callbacks de forma asíncrona
     * @param {number} options.timeout - Timeout para callbacks async (ms)
     * @returns {Promise<Array>} Resultados de los callbacks
     */
    async emit(eventName, data = null, options = {}) {
        const startTime = performance.now();
        
        if (!this.events.has(eventName)) {
            if (this.debugMode) {
                console.warn(`⚠️ No listeners for event '${eventName}'`);
            }
            return [];
        }

        const listeners = this.events.get(eventName);
        const results = [];
        const listenersToRemove = [];

        // Crear objeto de evento
        const eventObject = {
            name: eventName,
            data,
            timestamp: Date.now(),
            preventDefault: false,
            stopPropagation: false
        };

        // Agregar al historial
        this._addToHistory(eventObject);

        try {
            for (const listener of listeners) {
                if (eventObject.stopPropagation) {
                    break;
                }

                try {
                    let result;
                    
                    if (options.async) {
                        // Ejecutar con timeout si es async
                        const timeout = options.timeout || 5000;
                        result = await this._executeWithTimeout(
                            listener.callback.bind(listener.context),
                            [eventObject],
                            timeout
                        );
                    } else {
                        // Ejecutar sincrónicamente
                        result = listener.callback.call(listener.context, eventObject);
                    }

                    results.push(result);

                    // Marcar para remoción si es 'once'
                    if (listener.once) {
                        listenersToRemove.push(listener.id);
                    }

                } catch (error) {
                    console.error(`❌ Error in event listener for '${eventName}':`, error);
                    results.push({ error: error.message });
                }
            }

            // Remover listeners 'once'
            if (listenersToRemove.length > 0) {
                const updatedListeners = listeners.filter(l => !listenersToRemove.includes(l.id));
                this.events.set(eventName, updatedListeners);
            }

            // Actualizar métricas
            this._updateMetrics(eventName, performance.now() - startTime);

            if (this.debugMode) {
                console.log(`📡 Event '${eventName}' emitted to ${listeners.length} listeners`);
            }

            return results;

        } catch (error) {
            console.error(`❌ Error emitting event '${eventName}':`, error);
            throw error;
        }
    }

    /**
     * Emitir evento de forma síncrona
     * @param {string} eventName - Nombre del evento
     * @param {*} data - Datos del evento
     * @returns {Array} Resultados de los callbacks
     */
    emitSync(eventName, data = null) {
        return this.emit(eventName, data, { async: false });
    }

    /**
     * Remover todos los listeners de un evento
     * @param {string} eventName - Nombre del evento
     * @returns {number} Número de listeners removidos
     */
    removeAllListeners(eventName) {
        if (!this.events.has(eventName)) {
            return 0;
        }

        const count = this.events.get(eventName).length;
        this.events.delete(eventName);

        if (this.debugMode) {
            console.log(`🗑️ Removed ${count} listeners for '${eventName}'`);
        }

        return count;
    }

    /**
     * Obtener todos los nombres de eventos registrados
     * @returns {Array<string>} Array de nombres de eventos
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Obtener número de listeners para un evento
     * @param {string} eventName - Nombre del evento
     * @returns {number} Número de listeners
     */
    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Obtener métricas de rendimiento
     * @returns {Object} Objeto con métricas
     */
    getMetrics() {
        return {
            ...this.metrics,
            totalEventTypes: this.events.size,
            totalActiveListeners: Array.from(this.events.values()).reduce((sum, listeners) => sum + listeners.length, 0),
            historySize: this.eventHistory.length
        };
    }

    /**
     * Obtener historial de eventos (solo en debug mode)
     * @param {number} limit - Límite de eventos a retornar
     * @returns {Array} Array de eventos históricos
     */
    getEventHistory(limit = 50) {
        if (!this.debugMode) {
            return [];
        }
        return this.eventHistory.slice(-limit);
    }

    /**
     * Limpiar historial de eventos
     */
    clearHistory() {
        this.eventHistory = [];
        if (this.debugMode) {
            console.log('🧹 Event history cleared');
        }
    }

    /**
     * Destruir EventBus y limpiar todos los listeners
     */
    destroy() {
        const totalListeners = Array.from(this.events.values()).reduce((sum, listeners) => sum + listeners.length, 0);
        
        this.events.clear();
        this.eventHistory = [];
        this.metrics = {
            totalEvents: 0,
            eventTypes: new Map(),
            averageProcessingTime: 0
        };

        if (this.debugMode) {
            console.log(`🗑️ EventBus destroyed. Removed ${totalListeners} listeners`);
        }
    }

    // Métodos privados

    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _addToHistory(eventObject) {
        if (!this.debugMode) return;

        this.eventHistory.push({
            ...eventObject,
            id: this._generateListenerId()
        });

        // Mantener tamaño del historial
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    _updateMetrics(eventName, processingTime) {
        this.metrics.totalEvents++;
        
        if (!this.metrics.eventTypes.has(eventName)) {
            this.metrics.eventTypes.set(eventName, 0);
        }
        this.metrics.eventTypes.set(eventName, this.metrics.eventTypes.get(eventName) + 1);

        // Calcular tiempo promedio de procesamiento
        this.metrics.averageProcessingTime = 
            (this.metrics.averageProcessingTime * (this.metrics.totalEvents - 1) + processingTime) / this.metrics.totalEvents;
    }

    async _executeWithTimeout(fn, args, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Callback timeout after ${timeout}ms`));
            }, timeout);

            try {
                const result = fn(...args);
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
}

// Singleton instance
let eventBusInstance = null;

/**
 * Obtener instancia singleton del EventBus
 * @returns {EventBus} Instancia del EventBus
 */
export function getEventBus() {
    if (!eventBusInstance) {
        eventBusInstance = new EventBus();
    }
    return eventBusInstance;
}

/**
 * Crear nueva instancia del EventBus (para testing)
 * @returns {EventBus} Nueva instancia del EventBus
 */
export function createEventBus() {
    return new EventBus();
}

export default EventBus;