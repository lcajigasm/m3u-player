import UIManager from '../UIManager.js';

/**
 * Tests de UIManager: showLoading/updateLoadingProgress/hideLoading
 */
describe('UIManager - Loading overlay (DOM + ARIA)', () => {
  let ui;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    ui = new UIManager({ enableAnimations: false });
  });

  afterEach(() => {
    ui?.destroy();
    document.body.innerHTML = '';
  });

  test('showLoading crea overlay con ARIA y mensaje', () => {
    ui.showLoading('Cargando prueba', { showProgress: true });

    const overlay = document.querySelector('.loading-overlay');
    expect(overlay).toBeTruthy();

    // ARIA attrs
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-live')).toBe('polite');
    expect(overlay.getAttribute('aria-busy')).toBe('true');
    expect(overlay.getAttribute('aria-modal')).toBe('true');

    // Mensaje
    const messageEl = overlay.querySelector('.loading-message');
    expect(messageEl.textContent).toBe('Cargando prueba');

    // Progreso visible
    const progressWrap = overlay.querySelector('.loading-progress');
    expect(progressWrap.style.display).toBe('block');
  });

  test('updateLoadingProgress actualiza barra y aria-valuenow', () => {
    ui.showLoading('X', { showProgress: true });
    ui.updateLoadingProgress(42);

    const overlay = document.querySelector('.loading-overlay');
    const bar = overlay.querySelector('.loading-progress .progress-bar');
    const fill = overlay.querySelector('.loading-progress .progress-fill');
    const text = overlay.querySelector('.loading-progress .progress-text');

    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');

    expect(fill.style.width).toBe('42%');
    expect(text.textContent).toBe('42%');
  });

  test('hideLoading marca aria-busy=false y oculta overlay', () => {
    ui.showLoading('X');
    ui.hideLoading();

    const overlay = document.querySelector('.loading-overlay');
    expect(overlay.getAttribute('aria-busy')).toBe('false');
    expect(overlay.style.display).toBe('none');
  });
});
