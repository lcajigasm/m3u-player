// E2E Playwright: playlist maliciosa, verificar que no navega fuera de la app
const { _electron: electron, test, expect } = require('@playwright/test');

test('No navigation to external origins from malicious playlist', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();
  const initialUrl = await window.url();
  // Simula carga de playlist con entrada maliciosa
  await window.evaluate(() => {
    try {
      window.api.playlists.importFromUrl('file:///etc/passwd');
    } catch (e) {
      // Expected error path; ensure app remains on allowed origin
    }
  });
  // Espera y verifica que la URL no cambió a origen externo
  const url = await window.url();
  expect(url).toMatch(/^file:\/\//);
  expect(url).not.toMatch(/^(data:|javascript:)/);
  expect(url).toBe(initialUrl);
  await electronApp.close();
});
