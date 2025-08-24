/**
 * UIManager - Gestor avanzado de interfaz de usuario
 * Maneja toda la lógica de UI, themes, responsividad y componentes
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from '../core/EventBus.js';
import VirtualScroller from '../components/VirtualScroller.js';

class UIManager {
    constructor(options = {}) {
        this.eventBus = getEventBus();
        
        // Estado de la UI
        this.state = {
            currentTheme: 'dark',
            layout: 'default', // 'default', 'compact', 'tv', 'mobile'
            currentView: 'upload', // 'upload', 'player', 'settings', 'about'
            loading: false,
            fullscreen: false,
            pipActive: false,
            sidebarCollapsed: false,
            modalStack: [],
            notifications: []
        };

        // Configuración
        this.config = {
            themes: options.themes || ['dark', 'light', 'gaming', 'cinema'],
            enableAnimations: options.enableAnimations !== false,
            animationDuration: options.animationDuration || 300,
            enableVirtualScrolling: options.enableVirtualScrolling !== false,
            virtualScrollThreshold: options.virtualScrollThreshold || 1000,
            enableToasts: options.enableToasts !== false,
            toastDuration: options.toastDuration || 5000,
            enableKeyboardNavigation: options.enableKeyboardNavigation !== false,
            autoHideControls: options.autoHideControls || false,
            controlsHideDelay: options.controlsHideDelay || 3000,
            responsiveBreakpoints: {
                mobile: 768,
                tablet: 1024,
                desktop: 1200,
                tv: 1920
            }
        };

        // Elementos DOM
        this.elements = new Map();
        this.virtualScrollers = new Map();
        
        // Observadores
        this.resizeObserver = null;
        this.intersectionObserver = null;
        
        // Timers
        this.hideControlsTimer = null;
        this.toastTimers = new Map();
    this.loadingTimeoutId = null;
        
        // Animations
        this.activeAnimations = new Set();
        
        // Theme system
        this.themeVariables = new Map();
        this.customCSS = '';
        
        // Virtual scrolling
        this.scrollBuffers = new Map();
        this.renderQueues = new Map();
    // Mapeos para observers por scroller
    this.containerToScrollerId = new Map();
    this.sentinelToScrollerId = new Map();

        this.init();
    }

    /**
     * Inicializar el gestor de UI
     */
    init() {
        this.detectDevice();
        this.setupEventListeners();
        this.initializeObservers();
        this.loadTheme();
        this.setupKeyboardNavigation();
        this.eventBus.emit('ui:initialized');
        console.log('🎨 UIManager initialized');
    }

    /**
     * Detectar tipo de dispositivo y configurar layout inicial
     */
    detectDevice() {
        const width = window.innerWidth;
        const { mobile, tablet, desktop } = this.config.responsiveBreakpoints;
        
        let layout = 'default';
        if (width <= mobile) {
            layout = 'mobile';
        } else if (width <= tablet) {
            layout = 'tablet';
        } else if (width >= desktop) {
            layout = 'desktop';
        }

        // Detectar TV mode
        if (window.navigator.userAgent.includes('TV') || width >= this.config.responsiveBreakpoints.tv) {
            layout = 'tv';
        }

        this.setLayout(layout);
    }

    /**
     * Establecer layout de la interfaz
     * @param {string} layout - Tipo de layout
     */
    setLayout(layout) {
        if (this.state.layout === layout) return;

        const oldLayout = this.state.layout;
        this.state.layout = layout;

        // Aplicar clases CSS
        document.documentElement.className = document.documentElement.className
            .replace(/layout-\w+/g, '')
            .trim();
        document.documentElement.classList.add(`layout-${layout}`);

        // Configurar elementos específicos del layout
        this.configureLayoutElements(layout);

        this.eventBus.emit('ui:layout-changed', { 
            oldLayout, 
            newLayout: layout 
        });

        console.log(`🎨 Layout changed to: ${layout}`);
    }

    /**
     * Configurar elementos específicos del layout
     * @param {string} layout - Tipo de layout
     */
    configureLayoutElements(layout) {
        switch (layout) {
            case 'mobile':
                this.configureMobileLayout();
                break;
            case 'tablet':
                this.configureTabletLayout();
                break;
            case 'tv':
                this.configureTVLayout();
                break;
            default:
                this.configureDesktopLayout();
                break;
        }
    }

    /**
     * Cambiar tema de la interfaz
     * @param {string} theme - Nombre del tema
     */
    setTheme(theme) {
        if (!this.config.themes.includes(theme)) {
            console.warn(`⚠️ Theme '${theme}' not available`);
            return;
        }

        const oldTheme = this.state.currentTheme;
        this.state.currentTheme = theme;

        // Remover clase de tema anterior
        document.documentElement.classList.remove(`theme-${oldTheme}`);
        
        // Aplicar nuevo tema
        document.documentElement.classList.add(`theme-${theme}`);
        
        // Cargar variables CSS específicas del tema
        this.loadThemeVariables(theme);
        
        // Guardar preferencia
        this.saveThemePreference(theme);

        this.eventBus.emit('ui:theme-changed', { 
            oldTheme, 
            newTheme: theme 
        });

        console.log(`🎨 Theme changed to: ${theme}`);
    }

    /**
     * Mostrar vista específica
     * @param {string} view - Nombre de la vista
     * @param {Object} options - Opciones adicionales
     */
    showView(view, options = {}) {
        const oldView = this.state.currentView;
        
        if (oldView === view) return;

        // Ocultar vista anterior
        this.hideView(oldView);
        
        // Mostrar nueva vista
        const viewElement = this.elements.get(`${view}Section`) || 
                           document.getElementById(`${view}Section`);
        
        if (viewElement) {
            this.state.currentView = view;
            
            if (this.config.enableAnimations) {
                this.animateViewTransition(viewElement, 'in', options);
            } else {
                viewElement.style.display = 'block';
            }
            
            // Configurar vista específica
            this.configureView(view, options);
            
            this.eventBus.emit('ui:view-changed', { 
                oldView, 
                newView: view,
                options 
            });
        }
    }

    /**
     * Ocultar vista
     * @param {string} view - Nombre de la vista
     */
    hideView(view) {
        const viewElement = this.elements.get(`${view}Section`) || 
                           document.getElementById(`${view}Section`);
        
        if (viewElement && viewElement.style.display !== 'none') {
            if (this.config.enableAnimations) {
                this.animateViewTransition(viewElement, 'out');
            } else {
                viewElement.style.display = 'none';
            }
        }
    }

    /**
     * Mostrar modal
     * @param {string} modalId - ID del modal
     * @param {Object} options - Opciones del modal
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`⚠️ Modal '${modalId}' not found`);
            return;
        }

        // Agregar a stack de modales
        this.state.modalStack.push({
            id: modalId,
            options,
            timestamp: Date.now()
        });

        // Configurar modal
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        // Configurar overlay
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                if (options.closeOnOverlayClick !== false) {
                    this.hideModal(modalId);
                }
            });
        }

        // Configurar botón cerrar
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal(modalId));
        }

        // Animación de entrada
        if (this.config.enableAnimations) {
            this.animateModal(modal, 'in');
        }

        // Focus management
        this.manageFocus(modal, true);

        this.eventBus.emit('ui:modal-shown', { modalId, options });
    }

    /**
     * Ocultar modal
     * @param {string} modalId - ID del modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Remover del stack
        this.state.modalStack = this.state.modalStack.filter(m => m.id !== modalId);

        // Animación de salida
        if (this.config.enableAnimations) {
            this.animateModal(modal, 'out', () => {
                modal.style.display = 'none';
                modal.classList.remove('active');
            });
        } else {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }

        // Restaurar focus
        this.manageFocus(modal, false);

        this.eventBus.emit('ui:modal-hidden', { modalId });
    }

    /**
     * Mostrar notificación toast
     * @param {string} message - Mensaje
     * @param {Object} options - Opciones de la notificación
     */
    showToast(message, options = {}) {
        if (!this.config.enableToasts) return;

        const {
            type = 'info', // 'info', 'success', 'warning', 'error'
            duration = this.config.toastDuration,
            persistent = false,
            actions = []
        } = options;

        const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Crear elemento toast
        const toast = this.createToastElement(toastId, message, type, actions);
        
        // Agregar al contenedor
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = this.createToastContainer();
        }
        
        container.appendChild(toast);

        // Animación de entrada
        if (this.config.enableAnimations) {
            this.animateToast(toast, 'in');
        }

        // Auto-hide si no es persistente
        if (!persistent && duration > 0) {
            const timer = setTimeout(() => {
                this.hideToast(toastId);
            }, duration);
            
            this.toastTimers.set(toastId, timer);
        }

        // Agregar al estado
        this.state.notifications.push({
            id: toastId,
            message,
            type,
            timestamp: Date.now(),
            persistent
        });

        this.eventBus.emit('ui:toast-shown', { 
            id: toastId, 
            message, 
            type 
        });

        return toastId;
    }

    /**
     * Ocultar notificación toast
     * @param {string} toastId - ID del toast
     */
    hideToast(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;

        // Limpiar timer
        if (this.toastTimers.has(toastId)) {
            clearTimeout(this.toastTimers.get(toastId));
            this.toastTimers.delete(toastId);
        }

        // Animación de salida
        if (this.config.enableAnimations) {
            this.animateToast(toast, 'out', () => {
                toast.remove();
            });
        } else {
            toast.remove();
        }

        // Remover del estado
        this.state.notifications = this.state.notifications.filter(n => n.id !== toastId);

        this.eventBus.emit('ui:toast-hidden', { id: toastId });
    }

    /**
     * Mostrar loading overlay
     * @param {string} message - Mensaje de carga
     * @param {Object} options - Opciones
     */
    showLoading(message = 'Loading...', options = {}) {
        this.state.loading = true;

        const {
            cancellable = false,
            showProgress = true,
            message: msgOpt,
            timeoutMs = 0,
            progress
        } = options;

        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = this.createLoadingOverlay();
        }

        // Atributos ARIA del overlay
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-busy', 'true');
        overlay.setAttribute('aria-modal', 'true');

        // Mensaje
        const effectiveMessage = msgOpt ?? message;
        const messageEl = overlay.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = effectiveMessage;
        }

        // Progreso
        const progressWrap = overlay.querySelector('.loading-progress');
        if (progressWrap) {
            progressWrap.style.display = showProgress ? 'block' : 'none';
        }
        if (typeof progress === 'number') {
            this.updateLoadingProgress(progress);
        } else {
            // Reset a 0 si no se especifica
            this.updateLoadingProgress(0);
        }

        // Cancelable
        const cancelBtn = overlay.querySelector('.loading-cancel');
        if (cancelBtn) {
            cancelBtn.style.display = cancellable ? 'inline-flex' : 'none';
            if (overlay._cancelHandler) {
                cancelBtn.removeEventListener('click', overlay._cancelHandler);
            }
            if (cancellable) {
                overlay._cancelHandler = () => {
                    this.eventBus.emit('ui:loading-cancelled');
                    this.hideLoading();
                };
                cancelBtn.addEventListener('click', overlay._cancelHandler);
            }
        }

        // Auto cierre
        if (this.loadingTimeoutId) {
            clearTimeout(this.loadingTimeoutId);
            this.loadingTimeoutId = null;
        }
        if (timeoutMs > 0) {
            this.loadingTimeoutId = setTimeout(() => {
                this.hideLoading();
            }, timeoutMs);
        }

        overlay.style.display = 'flex';
        if (this.config.enableAnimations) {
            this.animateLoading(overlay, 'in');
        }

        this.eventBus.emit('ui:loading-shown', { message: effectiveMessage, options });
    }

    /**
     * Ocultar loading overlay
     */
    hideLoading() {
        this.state.loading = false;

        // Limpiar timeout si está activo
        if (this.loadingTimeoutId) {
            clearTimeout(this.loadingTimeoutId);
            this.loadingTimeoutId = null;
        }

        const overlay = document.querySelector('.loading-overlay');
        if (!overlay) return;
        overlay.setAttribute('aria-busy', 'false');

        const finalizeHide = () => {
            overlay.style.display = 'none';
        };

        if (this.config.enableAnimations) {
            this.animateLoading(overlay, 'out', finalizeHide);
        } else {
            finalizeHide();
        }

        this.eventBus.emit('ui:loading-hidden');
    }

    /**
     * Actualizar progreso de carga
     * @param {number} progress - Progreso (0-100)
     */
    updateLoadingProgress(progress) {
        const value = Math.max(0, Math.min(100, Number(progress) || 0));
        const overlay = document.querySelector('.loading-overlay');
        const fill = overlay?.querySelector('.loading-progress .progress-fill');
        if (fill) {
            fill.style.width = `${value}%`;
        }

        const bar = overlay?.querySelector('.loading-progress .progress-bar');
        if (bar) {
            bar.setAttribute('role', 'progressbar');
            bar.setAttribute('aria-valuemin', '0');
            bar.setAttribute('aria-valuemax', '100');
            bar.setAttribute('aria-valuenow', String(Math.round(value)));
        }

        const text = overlay?.querySelector('.loading-progress .progress-text');
        if (text) {
            text.textContent = `${Math.round(value)}%`;
            text.setAttribute('aria-live', 'polite');
        }
    }

    /**
     * Configurar virtual scrolling para lista grande
     * @param {HTMLElement} container - Contenedor de la lista
     * @param {Array} items - Items a renderizar
     * @param {Function} renderItem - Función de renderizado
     * @param {Object} options - Opciones de virtual scrolling
    * @returns {{ id: string|null, update: (items:any[])=>void, destroy: ()=>void }} API del virtual scroller
     */
    setupVirtualScrolling(container, items, renderItem, options = {}) {
        // Si no aplica virtualización, render normal
        if (!this.config.enableVirtualScrolling || (Array.isArray(items) && items.length < this.config.virtualScrollThreshold)) {
            this.renderAllItems(container, items, renderItem);
            return {
                id: null,
                update: (newItems) => this.renderAllItems(container, newItems, renderItem),
                destroy: () => {
                    // Limpieza básica del contenedor
                    container.innerHTML = '';
                }
            };
        }

        // Opciones del scroller
        const scrollerOptions = {
            itemHeight: options.itemHeight ?? 60,
            bufferSize: options.bufferSize ?? 10,
            threshold: options.threshold ?? this.config.virtualScrollThreshold,
            enableDynamicHeight: options.enableDynamicHeight ?? false,
            overscan: options.overscan ?? 5,
            scrollingDelay: options.scrollingDelay ?? 150,
            enableSmoothScrolling: options.enableSmoothScrolling !== false,
            recycleItems: options.recycleItems !== false,
            enableVirtualization: options.enableVirtualization !== false
        };

        // Crear instancia
        const instance = new VirtualScroller(container, scrollerOptions);
        instance.setData(items || [], renderItem);

        // ID y registro interno
        const scrollerId = options.scrollerId || `scroller_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // Observer de resize específico del contenedor para recalcular viewport
        if (this.resizeObserver) {
            try {
                this.resizeObserver.observe(container);
            } catch { /* noop */ }
        }
        this.containerToScrollerId.set(container, scrollerId);

        // Crear sentinel inferior para carga progresiva (opcional)
        let bottomSentinel = null;
        let perScrollerIO = null;
        if (window.IntersectionObserver) {
            bottomSentinel = document.createElement('div');
            bottomSentinel.className = 'virtual-scroll-sentinel';
            bottomSentinel.style.cssText = 'position:absolute; left:0; right:0; height:1px; bottom:0; z-index:0;';
            // Insertar dentro del viewport del VirtualScroller si existe, si no en el contenedor
            const parentForSentinel = instance.viewport || container;
            parentForSentinel.appendChild(bottomSentinel);

            // Observer con root = contenedor para reaccionar al scroll interno
            perScrollerIO = new IntersectionObserver((entries) => {
                for (const ent of entries) {
                    if (ent.isIntersecting) {
                        // Pedir re-render si estamos cerca del final (pre-carga)
                        if (typeof instance.scheduleRender === 'function') {
                            instance.scheduleRender();
                        }
                    }
                }
            }, { root: container, rootMargin: `${(scrollerOptions.overscan ?? 5) * (scrollerOptions.itemHeight ?? 60)}px`, threshold: 0 });

            perScrollerIO.observe(bottomSentinel);
            this.sentinelToScrollerId.set(bottomSentinel, scrollerId);
        }

        // Guardar registro enriquecido
        const record = {
            id: scrollerId,
            instance,
            container,
            options: scrollerOptions,
            observers: {
                // Usamos el ResizeObserver global; IntersectionObserver de items lo maneja el componente
                resizeObserver: this.resizeObserver || null,
                intersectionObserver: perScrollerIO
            },
            sentinels: { bottom: bottomSentinel }
        };
        this.virtualScrollers.set(scrollerId, record);

        // API pública mínima
        const api = {
            id: scrollerId,
            update: (newItems) => this.updateVirtualScrollerData(scrollerId, newItems),
            destroy: () => this.destroyVirtualScroller(scrollerId)
        };

        // Telemetría ligera
        const estimateVisible = Math.ceil((container.clientHeight || 600) / (scrollerOptions.itemHeight || 60)) + (scrollerOptions.bufferSize ?? 10) * 2;
        console.log(`📜 Virtual scrolling ready: items=${(items||[]).length}, ~rendered<=${estimateVisible}`);

        return api;
    }

    /**
     * Actualizar datos de un virtual scroller existente
     * @param {string} scrollerId - ID del scroller
     * @param {Array} newItems - Nuevos datos
     */
    updateVirtualScrollerData(scrollerId, newItems) {
        const entry = this.virtualScrollers.get(scrollerId);
        if (!entry) return;
        const vs = entry.instance ?? entry;
        const prevScroll = vs.container?.scrollTop ?? 0;
        vs.updateData(Array.isArray(newItems) ? newItems : []);
        // Preservar desplazamiento y recalcular viewport
        if (typeof prevScroll === 'number' && vs.container) {
            vs.container.scrollTop = prevScroll;
        }
        if (typeof vs.updateContainerHeight === 'function') {
            vs.updateContainerHeight();
        }
        if (typeof vs.scheduleRender === 'function') {
            vs.scheduleRender();
        }
        this.eventBus.emit('ui:virtual-scroller-updated', { scrollerId, itemCount: (newItems || []).length });
    }

    /**
     * Destruir un virtual scroller
     * @param {string} scrollerId - ID del scroller
     */
    destroyVirtualScroller(scrollerId) {
        const entry = this.virtualScrollers.get(scrollerId);
        if (!entry) return;
        const vs = entry.instance ?? entry;

        // Dejar de observar el contenedor (ResizeObserver global)
        const container = entry.container ?? vs.container;
        if (this.resizeObserver && container) {
            try { this.resizeObserver.unobserve(container); } catch { /* noop */ }
        }
        if (container) this.containerToScrollerId.delete(container);

        // IntersectionObserver adicional (si en el futuro añadimos sentinels)
        const sentinel = entry.sentinels?.bottom;
        if (sentinel && sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
        if (entry.observers?.intersectionObserver) {
            try { entry.observers.intersectionObserver.disconnect(); } catch { /* noop */ }
        }

        // Destruir instancia y limpiar
        try { vs.destroy?.(); } catch { /* noop */ }
        this.virtualScrollers.delete(scrollerId);
        this.eventBus.emit('ui:virtual-scroller-destroyed', { scrollerId });
    }

    // Métodos privados

    setupEventListeners() {
        // Eventos del EventBus
        this.eventBus.on('ui:show-view', (event) => {
            this.showView(event.data.view, event.data.options);
        });

        this.eventBus.on('ui:show-modal', (event) => {
            this.showModal(event.data.modalId, event.data.options);
        });

        this.eventBus.on('ui:hide-modal', (event) => {
            this.hideModal(event.data.modalId);
        });

        this.eventBus.on('ui:show-toast', (event) => {
            this.showToast(event.data.message, event.data.options);
        });

        this.eventBus.on('ui:set-theme', (event) => {
            this.setTheme(event.data.theme);
        });

        // Loading overlay via EventBus
        this.eventBus.on('ui:loading-show', (event) => {
            const { message, options } = event.data || {};
            this.showLoading(message, options);
        });

        this.eventBus.on('ui:loading-hide', () => {
            this.hideLoading();
        });

        this.eventBus.on('ui:loading-progress', (event) => {
            const { progress } = event.data || {};
            if (typeof progress === 'number') {
                this.updateLoadingProgress(progress);
            }
        });

        this.eventBus.on('ui:toggle-fullscreen', () => {
            this.toggleFullscreen();
        });

        // Eventos del DOM
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Eventos de fullscreen
        document.addEventListener('fullscreenchange', () => {
            this.state.fullscreen = !!document.fullscreenElement;
            this.eventBus.emit('ui:fullscreen-changed', { 
                fullscreen: this.state.fullscreen 
            });
        });
    }

    initializeObservers() {
        // Observador de resize reutilizable para todos los contenedores
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    this.handleElementResize(entry);
                }
            });
        }

        // Observador de intersección compartido (no imprescindible: VirtualScroller ya usa uno interno)
        if (window.IntersectionObserver) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    this.handleIntersection(entry);
                }
            }, { root: null, threshold: 0 });
        }
    }

    loadTheme() {
        // Cargar tema guardado o usar por defecto
        const savedTheme = localStorage.getItem('m3u_theme') || this.state.currentTheme;
        this.setTheme(savedTheme);
    }

    loadThemeVariables(theme) {
        // Definir variables CSS por tema
        const themeVars = {
            dark: {
                '--bg-primary': '#0f172a',
                '--bg-secondary': '#1e293b',
                '--text-primary': '#e2e8f0',
                '--text-secondary': '#94a3b8',
                '--accent-primary': '#3b82f6',
                '--accent-secondary': '#60a5fa'
            },
            light: {
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f8fafc',
                '--text-primary': '#1e293b',
                '--text-secondary': '#475569',
                '--accent-primary': '#3b82f6',
                '--accent-secondary': '#1d4ed8'
            },
            gaming: {
                '--bg-primary': '#0a0a0a',
                '--bg-secondary': '#1a1a1a',
                '--text-primary': '#00ff88',
                '--text-secondary': '#88ff00',
                '--accent-primary': '#ff0088',
                '--accent-secondary': '#ff8800'
            },
            cinema: {
                '--bg-primary': '#000000',
                '--bg-secondary': '#1a1a1a',
                '--text-primary': '#ffffff',
                '--text-secondary': '#cccccc',
                '--accent-primary': '#ffd700',
                '--accent-secondary': '#ffed4e'
            }
        };

        let vars;
        switch (theme) {
            case 'light':
                vars = themeVars.light;
                break;
            case 'gaming':
                vars = themeVars.gaming;
                break;
            case 'cinema':
                vars = themeVars.cinema;
                break;
            case 'dark':
            default:
                vars = themeVars.dark;
                break;
        }
        
        // Aplicar variables CSS
        Object.entries(vars).forEach(([property, value]) => {
            document.documentElement.style.setProperty(property, value);
        });

        this.themeVariables.set(theme, vars);
    }

    saveThemePreference(theme) {
        try {
            localStorage.setItem('m3u_theme', theme);
        } catch (error) {
            console.warn('⚠️ Could not save theme preference:', error);
        }
    }

    setupKeyboardNavigation() {
        if (!this.config.enableKeyboardNavigation) return;

        // Configurar navegación por teclado
        document.addEventListener('keydown', (e) => {
            // Solo si no hay input activo
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'Escape':
                    this.handleEscapeKey();
                    break;
                case 'Tab':
                    this.handleTabNavigation(e);
                    break;
                case 'Enter':
                    this.handleEnterKey(e);
                    break;
            }
        });
    }

    // Animaciones

    animateViewTransition(element, direction, options = {}) {
        const animation = direction === 'in' ? 'fadeInUp' : 'fadeOutDown';
        const duration = options.duration || this.config.animationDuration;

        element.style.animation = `${animation} ${duration}ms ease-out`;
        
        const animationPromise = new Promise((resolve) => {
            const handleAnimationEnd = () => {
                element.removeEventListener('animationend', handleAnimationEnd);
                element.style.animation = '';
                if (direction === 'out') {
                    element.style.display = 'none';
                }
                resolve();
            };
            element.addEventListener('animationend', handleAnimationEnd);
        });

        this.activeAnimations.add(animationPromise);
        return animationPromise;
    }

    animateModal(modal, direction, callback) {
        const content = modal.querySelector('.modal-content');
        if (!content) return;

        const animation = direction === 'in' ? 'modalSlideIn' : 'modalSlideOut';
        content.style.animation = `${animation} ${this.config.animationDuration}ms ease-out`;

        const handleAnimationEnd = () => {
            content.removeEventListener('animationend', handleAnimationEnd);
            content.style.animation = '';
            if (callback) callback();
        };

        content.addEventListener('animationend', handleAnimationEnd);
    }

    animateToast(toast, direction, callback) {
        const animation = direction === 'in' ? 'toastSlideIn' : 'toastSlideOut';
        toast.style.animation = `${animation} ${this.config.animationDuration}ms ease-out`;

        const handleAnimationEnd = () => {
            toast.removeEventListener('animationend', handleAnimationEnd);
            toast.style.animation = '';
            if (callback) callback();
        };

        toast.addEventListener('animationend', handleAnimationEnd);
    }

    animateLoading(overlay, direction, callback) {
        const animation = direction === 'in' ? 'fadeIn' : 'fadeOut';
        overlay.style.animation = `${animation} ${this.config.animationDuration}ms ease-out`;

        const handleAnimationEnd = () => {
            overlay.removeEventListener('animationend', handleAnimationEnd);
            overlay.style.animation = '';
            if (callback) callback();
        };

        overlay.addEventListener('animationend', handleAnimationEnd);
    }

    // Event handlers

    handleResize() {
        this.detectDevice();
        
        // Actualizar virtual scrollers - ahora usan VirtualScroller component
        for (const entry of this.virtualScrollers.values()) {
            const vs = entry?.instance ?? entry;
            if (vs && typeof vs.updateContainerHeight === 'function') {
                vs.updateContainerHeight();
            }
        }
        
        this.eventBus.emit('ui:resize', { 
            width: window.innerWidth, 
            height: window.innerHeight 
        });
    }

    /**
     * Maneja resize de elementos observados (contenedores de scrollers)
     * @param {ResizeObserverEntry} entry
     */
    handleElementResize(entry) {
        const target = entry.target;
        const scrollerId = this.containerToScrollerId.get(target);
        if (!scrollerId) return;
        const record = this.virtualScrollers.get(scrollerId);
        const vs = record?.instance ?? record;
        if (vs && typeof vs.updateContainerHeight === 'function') {
            vs.updateContainerHeight();
        }
        if (vs && typeof vs.scheduleRender === 'function') {
            vs.scheduleRender();
        }
    }

    /**
     * Maneja intersecciones de sentinels (si se usan)
     * @param {IntersectionObserverEntry} entry
     */
    handleIntersection(entry) {
        const target = entry.target;
        const scrollerId = this.sentinelToScrollerId.get(target);
        if (!scrollerId) return;
        const record = this.virtualScrollers.get(scrollerId);
        const vs = record?.instance ?? record;
        if (entry.isIntersecting && vs?.scheduleRender) {
            vs.scheduleRender();
        }
    }

    handleKeydown(e) {
        // Global keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'f':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 't':
                    e.preventDefault();
                    this.cycleTheme();
                    break;
            }
        }
    }

    handleEscapeKey() {
        // Cerrar modal superior del stack
        if (this.state.modalStack.length > 0) {
            const topModal = this.state.modalStack[this.state.modalStack.length - 1];
            this.hideModal(topModal.id);
        }
        
        // Salir de fullscreen
        if (this.state.fullscreen) {
            this.toggleFullscreen();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    cycleTheme() {
        const allowedThemes = ['dark', 'light', 'gaming', 'cinema'];
        const current = allowedThemes.includes(this.state.currentTheme)
            ? this.state.currentTheme
            : 'dark';
        const currentIndex = allowedThemes.indexOf(current);
        const nextIndex = (currentIndex + 1) % 4;
        let nextTheme;
        switch (nextIndex) {
            case 0:
                nextTheme = 'dark';
                break;
            case 1:
                nextTheme = 'light';
                break;
            case 2:
                nextTheme = 'gaming';
                break;
            case 3:
            default:
                nextTheme = 'cinema';
                break;
        }
        this.setTheme(nextTheme);
    }

    // Configuraciones de layout específicas

    configureMobileLayout() {
        // Configuración específica para móvil
        document.documentElement.style.setProperty('--sidebar-width', '100%');
        document.documentElement.style.setProperty('--control-size', '44px');
    }

    configureTabletLayout() {
        // Configuración específica para tablet
        document.documentElement.style.setProperty('--sidebar-width', '320px');
        document.documentElement.style.setProperty('--control-size', '40px');
    }

    configureTVLayout() {
        // Configuración específica para TV
        document.documentElement.style.setProperty('--font-size-base', '18px');
        document.documentElement.style.setProperty('--control-size', '60px');
        
        // Habilitar navegación con D-pad
        this.enableTVNavigation();
    }

    configureDesktopLayout() {
        // Configuración por defecto para desktop
        document.documentElement.style.setProperty('--sidebar-width', '280px');
        document.documentElement.style.setProperty('--control-size', '36px');
    }

    enableTVNavigation() {
        // Implementar navegación específica para TV
        console.log('📺 TV navigation enabled');
    }

    // Métodos de utilidad para crear elementos

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
        return container;
    }

    createToastElement(id, message, type, actions) {
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            pointer-events: auto;
            min-width: 300px;
            max-width: 500px;
        `;

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                ${actions.length > 0 ? `
                    <div class="toast-actions">
                        ${actions.map(action => `
                            <button class="toast-action" data-action="${action.id}">
                                ${action.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <button class="toast-close">&times;</button>
        `;

        // Event listeners
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideToast(id));
        }

        actions.forEach(action => {
            const btn = toast.querySelector(`[data-action="${action.id}"]`);
            if (btn) {
                btn.addEventListener('click', () => {
                    action.handler();
                    this.hideToast(id);
                });
            }
        });

        return toast;
    }

    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        // Atributos de accesibilidad por defecto
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-busy', 'true');
        overlay.setAttribute('aria-modal', 'true');

        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">Loading...</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">0%</div>
                </div>
                <button class="loading-cancel" type="button" style="display:none">Cancelar</button>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    renderAllItems(container, items, renderItem) {
        // Renderizado normal sin virtual scrolling
        const fragment = document.createDocumentFragment();
        
        items.forEach((item, index) => {
            const element = renderItem(item, index);
            fragment.appendChild(element);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    manageFocus(modal, entering) {
        if (entering) {
            // Guardar elemento con focus actual
            modal._previousFocus = document.activeElement;
            
            // Focus en primer elemento focuseable del modal
            const focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus();
            }
        } else {
            // Restaurar focus anterior
            if (modal._previousFocus) {
                modal._previousFocus.focus();
            }
        }
    }

    /**
     * Destruir el gestor de UI y limpiar recursos
     */
    destroy() {
        // Limpiar timers
        if (this.hideControlsTimer) {
            clearTimeout(this.hideControlsTimer);
        }

        for (const timer of this.toastTimers.values()) {
            clearTimeout(timer);
        }
        this.toastTimers.clear();

        // Destruir virtual scrollers antes de desconectar observers
        for (const [scrollerId] of this.virtualScrollers) {
            this.destroyVirtualScroller(scrollerId);
        }

        // Limpiar observadores
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        // Limpiar estructuras
        this.virtualScrollers.clear();
        this.containerToScrollerId.clear();
        this.sentinelToScrollerId.clear();
        this.renderQueues.clear();

        // Limpiar animaciones activas
        for (const animation of this.activeAnimations) {
            animation.catch(() => {}); // Prevent unhandled rejection
        }
        this.activeAnimations.clear();

        // Limpiar elementos
        this.elements.clear();

        this.eventBus.emit('ui:destroyed');
        console.log('🎨 UIManager destroyed');
    }
}

export default UIManager;