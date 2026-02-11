import HybridController from './HybridController.js';

function shouldEnableHybridMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hybrid') === '0') return false;
  } catch {}
  return true;
}

if (shouldEnableHybridMode()) {
  try {
    window.hybridController = new HybridController();
  } catch (error) {
    console.warn('⚠️ Hybrid bootstrap failed:', error);
  }
}
