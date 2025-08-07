// E2E Playwright: playlist maliciosa, verificar que no navega fuera de la app
const { test, expect } = require('@playwright/test');

test('No navigation to external origins from malicious playlist', async ({ electronApp }) => {
  const window = await electronApp.firstWindow();
  // Simula carga de playlist con entrada maliciosa
  await window.evaluate(() => {
    window.api.playlists.importFromUrl('file:///etc/passwd');
  });
  // Espera y verifica que la URL no cambió a origen externo
  await expect(window).not.toHaveURL(/file:\/|data:|javascript:/);
});
