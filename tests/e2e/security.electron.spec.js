const { _electron: electron, test, expect } = require('@playwright/test');

test('No navigation to external origins from malicious playlist', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();
  // Simula carga de playlist con entrada maliciosa
  await window.evaluate(() => {
    window.api.playlists.importFromUrl('file:///etc/passwd');
  });
  // Espera y verifica que la URL no cambió a origen externo
  const url = await window.url();
  expect(url).not.toMatch(/file:|data:|javascript:/);
  await electronApp.close();
});
