import UIManager from '../..//src/js/modules/UIManager.js';
import { getEventBus } from '../../src/js/core/EventBus.js';

describe('UIManager loading overlay', () => {
  let ui;
  let bus;

  beforeEach(() => {
    document.body.innerHTML = '';
    // UIManager may access window sizes; provide minimal environment
    ui = new UIManager({ enableAnimations: false });
    bus = getEventBus();
  });

  afterEach(() => {
    ui?.destroy?.();
  });

  test('showLoading creates overlay with ARIA and message', () => {
    ui.showLoading('Cargando...', { showProgress: true });
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-live')).toBe('polite');
    expect(overlay.getAttribute('aria-busy')).toBe('true');
    expect(overlay.style.display).toBe('flex');
    expect(overlay.querySelector('.loading-message').textContent).toBe('Cargando...');
  });

  test('updateLoadingProgress updates width, text and ARIA', () => {
    ui.showLoading('Test', { showProgress: true });
    ui.updateLoadingProgress(37);
    const bar = document.querySelector('.loading-progress .progress-bar');
    const fill = document.querySelector('.loading-progress .progress-fill');
    const text = document.querySelector('.loading-progress .progress-text');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-valuenow')).toBe('37');
    expect(fill.style.width).toBe('37%');
    expect(text.textContent).toBe('37%');
  });

  test('hideLoading removes aria-busy and hides', () => {
    ui.showLoading('Test', {});
    ui.hideLoading();
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay.getAttribute('aria-busy')).toBe('false');
    expect(overlay.style.display).toBe('none');
  });

  test('EventBus triggers show/progress/hide + emits events', () => {
    const shownSpy = jest.fn();
    const hiddenSpy = jest.fn();
    bus.on('ui:loading-shown', shownSpy);
    bus.on('ui:loading-hidden', hiddenSpy);

    bus.emit('ui:loading-show', { message: 'Desde bus', options: { showProgress: true } });
    expect(document.querySelector('.loading-overlay')).toBeTruthy();
    expect(shownSpy).toHaveBeenCalled();

    bus.emit('ui:loading-progress', { progress: 64 });
    expect(document.querySelector('.loading-progress .progress-fill').style.width).toBe('64%');

    bus.emit('ui:loading-hide');
    expect(hiddenSpy).toHaveBeenCalled();
  });
});
