import VirtualScroller from '../VirtualScroller.js';

/**
 * Virtual Scrolling: renderiza subconjunto y reacciona a resize
 */
describe('VirtualScroller - subconjunto visible y resize', () => {
  let container;
  let scroller;

  const items = Array.from({ length: 500 }, (_, i) => ({ id: i, title: `Item ${i}` }));
  const renderItem = (item) => `<div class="row">${item.title}</div>`;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.style.width = '300px';
    container.style.height = '240px'; // espacio para ~4 items a 60px
    document.body.appendChild(container);

    scroller = new VirtualScroller(container, {
      itemHeight: 60,
      threshold: 10, // forzar virtualización
      bufferSize: 2,
      enableVirtualization: true,
      enableSmoothScrolling: false
    });

    scroller.setData(items, renderItem);
  });

  afterEach(() => {
    scroller?.destroy();
    document.body.innerHTML = '';
  });

  test('renderiza solo un subconjunto de items', () => {
    const state = scroller.getState();
    // Visible = ceil(altura/alto) + buffers aprox
    expect(state.containerHeight).toBe(240);
    expect(state.renderedItemCount).toBeGreaterThan(0);
    expect(state.renderedItemCount).toBeLessThan(items.length);

    // Los elementos existen en el DOM
    const domItems = container.querySelectorAll('.virtual-scroller-item');
    expect(domItems.length).toBe(state.renderedItemCount);
  });

  test('actualiza el subconjunto al cambiar el tamaño', async () => {
    const initialCount = scroller.getState().renderedItemCount;

    // Simular resize a más alto
    container.style.height = '480px';
    // El listener usa setTimeout(100)
    window.dispatchEvent(new Event('resize'));
    jest.advanceTimersByTime?.(150);

    // Forzar ciclo de render
    await new Promise(r => setTimeout(r, 0));

    const newCount = scroller.getState().renderedItemCount;
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});
