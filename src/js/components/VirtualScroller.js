/**
 * VirtualScroller - Componente de scrolling virtual para listas grandes
 * Optimiza el rendimiento renderizando solo elementos visibles
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

import { getEventBus } from '../core/EventBus.js';

class VirtualScroller {
    constructor(container, options = {}) {
        this.eventBus = getEventBus();
        this.container = container;
        
        // Configuración
        this.config = {
            itemHeight: options.itemHeight || 60,
            bufferSize: options.bufferSize || 10,
            threshold: options.threshold || 1000,
            estimatedItemHeight: options.estimatedItemHeight || 60,
            enableDynamicHeight: options.enableDynamicHeight || false,
            overscan: options.overscan || 5,
            scrollingDelay: options.scrollingDelay || 150,
            enableSmoothScrolling: options.enableSmoothScrolling !== false,
            recycleItems: options.recycleItems !== false,
            enableVirtualization: options.enableVirtualization !== false
        };

        // Estado
        this.state = {
            items: [],
            visibleItems: [],
            startIndex: 0,
            endIndex: 0,
            scrollTop: 0,
            containerHeight: 0,
            totalHeight: 0,
            isScrolling: false,
            averageItemHeight: this.config.itemHeight
        };

        // Elementos DOM
        this.viewport = null;
        this.spacer = null;
        this.itemContainer = null;
        
        // Renderizado
        this.renderFunction = null;
        this.renderedItems = new Map();
        this.itemPool = [];
        this.itemHeights = new Map();
        
        // Performance
        this.renderQueue = [];
        this.isRenderScheduled = false;
        this.measurementCache = new Map();
        this.intersectionObserver = null;
        
        // Timers
        this.scrollTimer = null;
        this.resizeTimer = null;

        this.init();
    }

    /**
     * Inicializar el virtual scroller
     */
    init() {
        this.setupDOM();
        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.updateContainerHeight();
        
        this.eventBus.emit('virtual-scroller:initialized', { scroller: this });
        console.log('📜 VirtualScroller initialized');
    }

    /**
     * Configurar estructura DOM
     */
    setupDOM() {
        // Configurar contenedor principal
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        // Crear viewport
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroller-viewport';
        this.viewport.style.cssText = `
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
        `;
        
        // Crear spacer para altura total
        this.spacer = document.createElement('div');
        this.spacer.className = 'virtual-scroller-spacer';
        this.spacer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
            z-index: -1;
        `;
        
        // Crear contenedor de items
        this.itemContainer = document.createElement('div');
        this.itemContainer.className = 'virtual-scroller-items';
        this.itemContainer.style.cssText = `
            position: relative;
            z-index: 1;
        `;
        
        // Ensamblar estructura
        this.viewport.appendChild(this.spacer);
        this.viewport.appendChild(this.itemContainer);
        this.container.appendChild(this.viewport);
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Scroll event con throttling
        this.container.addEventListener('scroll', this.handleScroll.bind(this), { 
            passive: true 
        });
        
        // Resize event
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Wheel event para smooth scrolling
        if (this.config.enableSmoothScrolling) {
            this.container.addEventListener('wheel', this.handleWheel.bind(this), {
                passive: false
            });
        }
    }

    /**
     * Configurar Intersection Observer para lazy loading
     */
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const itemElement = entry.target;
                    const index = parseInt(itemElement.dataset.index);
                    
                    if (entry.isIntersecting) {
                        this.handleItemVisible(index);
                    } else {
                        this.handleItemHidden(index);
                    }
                });
            },
            {
                root: this.container,
                rootMargin: `${this.config.overscan * this.config.itemHeight}px`,
                threshold: 0
            }
        );
    }

    /**
     * Establecer datos y función de renderizado
     * @param {Array} items - Array de datos
     * @param {Function} renderFn - Función de renderizado
     */
    setData(items, renderFn) {
        this.state.items = items;
        this.renderFunction = renderFn;
        
        // Decidir si usar virtualización
        this.config.enableVirtualization = items.length >= this.config.threshold;
        
        // Calcular altura total
        this.calculateTotalHeight();
        
        // Renderizar inicial
        this.scheduleRender();
        
        this.eventBus.emit('virtual-scroller:data-set', {
            itemCount: items.length,
            virtualized: this.config.enableVirtualization
        });
    }

    /**
     * Manejar evento de scroll
     * @param {Event} event - Evento de scroll
     */
    handleScroll(event) {
        this.state.scrollTop = this.container.scrollTop;
        this.state.isScrolling = true;
        
        // Throttle del renderizado
        this.scheduleRender();
        
        // Resetear estado de scrolling
        clearTimeout(this.scrollTimer);
        this.scrollTimer = setTimeout(() => {
            this.state.isScrolling = false;
            this.eventBus.emit('virtual-scroller:scroll-end', {
                scrollTop: this.state.scrollTop
            });
        }, this.config.scrollingDelay);
        
        this.eventBus.emit('virtual-scroller:scroll', {
            scrollTop: this.state.scrollTop,
            isScrolling: this.state.isScrolling
        });
    }

    /**
     * Manejar evento de resize
     */
    handleResize() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.updateContainerHeight();
            this.scheduleRender();
        }, 100);
    }

    /**
     * Manejar evento de wheel para smooth scrolling
     * @param {WheelEvent} event - Evento de wheel
     */
    handleWheel(event) {
        if (!this.config.enableSmoothScrolling) return;
        
        event.preventDefault();
        
        const delta = event.deltaY;
        const targetScrollTop = Math.max(0, 
            Math.min(this.state.scrollTop + delta, 
                this.state.totalHeight - this.state.containerHeight)
        );
        
        this.smoothScrollTo(targetScrollTop);
    }

    /**
     * Scroll suave a posición específica
     * @param {number} targetScrollTop - Posición objetivo
     */
    smoothScrollTo(targetScrollTop) {
        const startScrollTop = this.container.scrollTop;
        const distance = targetScrollTop - startScrollTop;
        const duration = 200;
        const startTime = performance.now();
        
        const animateScroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            this.container.scrollTop = startScrollTop + (distance * easeOut);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };
        
        requestAnimationFrame(animateScroll);
    }

    /**
     * Actualizar altura del contenedor
     */
    updateContainerHeight() {
        this.state.containerHeight = this.container.clientHeight;
        this.updateVisibleRange();
    }

    /**
     * Calcular altura total de todos los items
     */
    calculateTotalHeight() {
        if (this.config.enableDynamicHeight) {
            // Calcular basado en alturas medidas
            let total = 0;
            for (let i = 0; i < this.state.items.length; i++) {
                total += this.getItemHeight(i);
            }
            this.state.totalHeight = total;
        } else {
            // Altura fija
            this.state.totalHeight = this.state.items.length * this.config.itemHeight;
        }
        
        // Actualizar spacer
        this.spacer.style.height = `${this.state.totalHeight}px`;
    }

    /**
     * Obtener altura de un item específico
     * @param {number} index - Índice del item
     * @returns {number} Altura del item
     */
    getItemHeight(index) {
        if (this.itemHeights.has(index)) {
            return this.itemHeights.get(index);
        }
        
        return this.config.estimatedItemHeight;
    }

    /**
     * Establecer altura medida de un item
     * @param {number} index - Índice del item
     * @param {number} height - Altura medida
     */
    setItemHeight(index, height) {
        if (this.itemHeights.get(index) !== height) {
            this.itemHeights.set(index, height);
            
            // Recalcular altura total si usa altura dinámica
            if (this.config.enableDynamicHeight) {
                this.calculateTotalHeight();
            }
            
            // Actualizar altura promedio
            this.updateAverageItemHeight();
        }
    }

    /**
     * Actualizar altura promedio de items
     */
    updateAverageItemHeight() {
        if (this.itemHeights.size === 0) return;
        
        let total = 0;
        for (const height of this.itemHeights.values()) {
            total += height;
        }
        
        this.state.averageItemHeight = total / this.itemHeights.size;
    }

    /**
     * Actualizar rango de items visibles
     */
    updateVisibleRange() {
        if (!this.config.enableVirtualization) {
            // Renderizar todos los items
            this.state.startIndex = 0;
            this.state.endIndex = this.state.items.length - 1;
            return;
        }
        
        const scrollTop = this.state.scrollTop;
        const containerHeight = this.state.containerHeight;
        const itemHeight = this.state.averageItemHeight;
        
        // Calcular índices con buffer
        const visibleItemCount = Math.ceil(containerHeight / itemHeight);
        const startIndex = Math.floor(scrollTop / itemHeight);
        
        this.state.startIndex = Math.max(0, startIndex - this.config.bufferSize);
        this.state.endIndex = Math.min(
            this.state.items.length - 1,
            startIndex + visibleItemCount + this.config.bufferSize
        );
    }

    /**
     * Programar renderizado
     */
    scheduleRender() {
        if (this.isRenderScheduled) return;
        
        this.isRenderScheduled = true;
        requestAnimationFrame(() => {
            this.render();
            this.isRenderScheduled = false;
        });
    }

    /**
     * Renderizar items visibles
     */
    render() {
        this.updateVisibleRange();
        
        if (!this.config.enableVirtualization) {
            this.renderAllItems();
            return;
        }
        
        this.renderVirtualizedItems();
    }

    /**
     * Renderizar todos los items (sin virtualización)
     */
    renderAllItems() {
        const fragment = document.createDocumentFragment();
        
        this.state.items.forEach((item, index) => {
            const element = this.renderItem(item, index);
            fragment.appendChild(element);
        });
        
    this.itemContainer.innerHTML = '';
        this.itemContainer.appendChild(fragment);
    }

    /**
     * Renderizar items virtualizados
     */
    renderVirtualizedItems() {
        // Remover items fuera del rango
        for (const [index, element] of this.renderedItems) {
            if (index < this.state.startIndex || index > this.state.endIndex) {
                this.recycleItem(element, index);
            }
        }
        
        // Renderizar items en el rango visible
        let offsetTop = 0;
        
        // Calcular offset para items anteriores
        for (let i = 0; i < this.state.startIndex; i++) {
            offsetTop += this.getItemHeight(i);
        }
        
        for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
            if (!this.renderedItems.has(i)) {
                const item = this.state.items[i];
                const element = this.renderItem(item, i);
                
                // Posicionar elemento
                element.style.position = 'absolute';
                element.style.top = `${offsetTop}px`;
                element.style.left = '0';
                element.style.right = '0';
                element.style.zIndex = '1';
                
                this.itemContainer.appendChild(element);
                this.renderedItems.set(i, element);
                
                // Medir altura si es dinámico
                if (this.config.enableDynamicHeight) {
                    this.measureItemHeight(element, i);
                }
                
                // Observar intersección
                if (this.intersectionObserver) {
                    this.intersectionObserver.observe(element);
                }
            }
            
            offsetTop += this.getItemHeight(i);
        }
        
        // Actualizar items visibles
        this.state.visibleItems = [];
        for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
            this.state.visibleItems.push(this.state.items[i]);
        }
    }

    /**
     * Renderizar un item individual
     * @param {*} item - Datos del item
     * @param {number} index - Índice del item
     * @returns {HTMLElement} Elemento renderizado
     */
    renderItem(item, index) {
        let element;
        
        // Usar elemento reciclado si está disponible
        if (this.config.recycleItems && this.itemPool.length > 0) {
            element = this.itemPool.pop();
        } else {
            element = document.createElement('div');
            element.className = 'virtual-scroller-item';
        }
        
        // Configurar elemento
        element.dataset.index = index;
        element.style.height = this.config.enableDynamicHeight ? 'auto' : `${this.config.itemHeight}px`;
        
        // Renderizar contenido
        if (this.renderFunction) {
            const content = this.renderFunction(item, index);
            if (typeof content === 'string') {
                element.innerHTML = this.sanitizeHTML(content);
            } else if (content instanceof HTMLElement) {
                element.innerHTML = '';
                element.appendChild(content);
            }
        }
        
        return element;
    }

    /**
     * Reciclar elemento de item
     * @param {HTMLElement} element - Elemento a reciclar
     * @param {number} index - Índice del elemento
     */
    recycleItem(element, index) {
        // Remover del DOM
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        
        // Dejar de observar
        if (this.intersectionObserver) {
            this.intersectionObserver.unobserve(element);
        }
        
        // Remover del mapa de renderizados
        this.renderedItems.delete(index);
        
        // Agregar al pool si reciclaje está habilitado
        if (this.config.recycleItems && this.itemPool.length < 50) {
            element.innerHTML = '';
    /**
     * Sanitiza HTML para evitar XSS
     * @param {string} html
     * @returns {string}
     */
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
            element.removeAttribute('data-index');
            this.itemPool.push(element);
        }
    }

    /**
     * Medir altura de un item
     * @param {HTMLElement} element - Elemento a medir
     * @param {number} index - Índice del item
     */
    measureItemHeight(element, index) {
        requestAnimationFrame(() => {
            const height = element.offsetHeight;
            if (height > 0) {
                this.setItemHeight(index, height);
            }
        });
    }

    /**
     * Manejar item visible
     * @param {number} index - Índice del item
     */
    handleItemVisible(index) {
        this.eventBus.emit('virtual-scroller:item-visible', {
            index,
            item: this.state.items[index]
        });
    }

    /**
     * Manejar item oculto
     * @param {number} index - Índice del item
     */
    handleItemHidden(index) {
        this.eventBus.emit('virtual-scroller:item-hidden', {
            index,
            item: this.state.items[index]
        });
    }

    /**
     * Scroll a un item específico
     * @param {number} index - Índice del item
     * @param {string} behavior - Comportamiento del scroll ('auto' | 'smooth')
     */
    scrollToItem(index, behavior = 'smooth') {
        if (index < 0 || index >= this.state.items.length) return;
        
        let offsetTop = 0;
        for (let i = 0; i < index; i++) {
            offsetTop += this.getItemHeight(i);
        }
        
        if (behavior === 'smooth' && this.config.enableSmoothScrolling) {
            this.smoothScrollTo(offsetTop);
        } else {
            this.container.scrollTop = offsetTop;
        }
        
        this.eventBus.emit('virtual-scroller:scrolled-to-item', { index });
    }

    /**
     * Actualizar datos sin re-renderizar completamente
     * @param {Array} newItems - Nuevos datos
     */
    updateData(newItems) {
        const oldLength = this.state.items.length;
        this.state.items = newItems;
        
        // Limpiar cache de alturas para items removidos
        if (newItems.length < oldLength) {
            for (let i = newItems.length; i < oldLength; i++) {
                this.itemHeights.delete(i);
            }
        }
        
        this.calculateTotalHeight();
        this.scheduleRender();
        
        this.eventBus.emit('virtual-scroller:data-updated', {
            oldLength,
            newLength: newItems.length
        });
    }

    /**
     * Obtener información del estado actual
     * @returns {Object} Estado del scroller
     */
    getState() {
        return {
            ...this.state,
            config: { ...this.config },
            renderedItemCount: this.renderedItems.size,
            recycledItemCount: this.itemPool.length
        };
    }

    /**
     * Forzar re-renderizado
     */
    forceRender() {
        // Limpiar cache de alturas
        this.itemHeights.clear();
        this.measurementCache.clear();
        
        // Limpiar items renderizados
        for (const [index, element] of this.renderedItems) {
            this.recycleItem(element, index);
        }
        
        this.calculateTotalHeight();
        this.scheduleRender();
        
        this.eventBus.emit('virtual-scroller:force-rendered');
    }

    /**
     * Destruir el virtual scroller
     */
    destroy() {
        // Limpiar timers
        clearTimeout(this.scrollTimer);
        clearTimeout(this.resizeTimer);
        
        // Limpiar observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Limpiar event listeners
        this.container.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        
        if (this.config.enableSmoothScrolling) {
            this.container.removeEventListener('wheel', this.handleWheel);
        }
        
        // Limpiar DOM
        if (this.viewport && this.viewport.parentNode) {
            this.viewport.parentNode.removeChild(this.viewport);
        }
        
        // Limpiar referencias
        this.renderedItems.clear();
        this.itemPool = [];
        this.itemHeights.clear();
        this.measurementCache.clear();
        
        this.eventBus.emit('virtual-scroller:destroyed');
        console.log('📜 VirtualScroller destroyed');
    }
}

export default VirtualScroller;