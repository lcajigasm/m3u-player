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
      // Expected rejection-path for disallowed schemes; swallow for test
    }
  });
  // Espera y verifica que la URL sigue siendo la de la app y no cambió a esquemas inseguros
  const url = await window.url();
  expect(url).toMatch(/^file:\/\//);
  expect(url).not.toMatch(/^(data:|javascript:)/);
  expect(url).toBe(initialUrl);
  await electronApp.close();
});
