# TODO de correcciones y mejoras (revisión técnica)

Fecha de revisión: 2026-02-11

## Contexto de la revisión
- No fue posible ejecutar `npm run lint` ni `npm test` en este entorno porque faltan dependencias locales (`eslint: command not found`, `jest: command not found`).
- La lista siguiente está basada en revisión estática del código y configuración del repositorio.

## P0 (alta prioridad / seguridad)
- [x] Endurecer la configuración de seguridad de Electron y eliminar flags globalmente inseguras en runtime: `ignore-certificate-errors`, `disable-web-security`, `allow-running-insecure-content`, `disable-site-isolation-trials`, etc. Referencias: `main.js:1130`, `main.js:1134`, `main.js:1138`, `main.js:1140`.
- [x] Restringir IPC de sistema de archivos para evitar lectura/escritura arbitraria desde renderer (path traversal y acceso a rutas sensibles). Referencias: `main.js:1054`, `main.js:1062`, `main.js:1101`.
- [x] Corregir política de navegación/ventanas: el comentario dice “bloquear externos”, pero se permite `http/https` en `setWindowOpenHandler`. Decidir política explícita (deny + `shell.openExternal`) y aplicarla. Referencias: `main.js:267`, `main.js:280`.
- [x] Evitar XSS por HTML templating con datos de playlist no confiables (`innerHTML` + atributos interpolados). Hay uso de `item.logo`, `item.url`, `item.title` en HTML. Referencias: `src/js/script.js:3681`.
- [x] Revisar `escapeHtml` para contexto de atributos (no es suficiente para escapar comillas en todos los casos al interpolar dentro de `title="..."` o `data-*`). Referencias: `src/js/script.js:3681`.
- [x] Proteger proxy local contra uso como open-proxy/SSRF local (actualmente CORS `*` y sin token de sesión). Referencias: `main.js:875`, `main.js:886`, `main.js:958`.

## P1 (funcionalidad y confiabilidad)
- [x] Unificar contrato `preload` ↔ renderer: el renderer usa `window.electronAPI`/`window.appInfo`, pero `preload` expone `window.api`. Definir una sola API pública y migrar llamadas. Referencias: `preload.js:19`, `src/js/script.js:10`, `src/js/script.js:395`.
- [x] Implementar o eliminar canales IPC expuestos pero sin handler (`settings-get`, `settings-put`, `playlists-import-file`, `playlists-import-url`, `streams-test`) para evitar API “rota”. Referencias: `preload.js:25`, `preload.js:52`, `preload.js:68`; handlers existentes en `main.js` no cubren esos canales.
- [x] Validar esquemas/hosts en `fetch-url` también del lado main process (no solo en preload), para que la validación no dependa del renderer. Referencias: `main.js:586`, `main.js:503`.
- [x] Corregir manejo de redirects HTTP relativos en `fetchUrl` (`res.headers.location` puede ser relativa y romper `new URL(...)`). Referencias: `main.js:531`, `main.js:533`.
- [x] Eliminar inline script incompatible con CSP actual (`script-src` no permite inline). Referencias: `src/index.html:9`, `src/index.html:261`.
- [x] Revisar uso de CDN en runtime (`hls.js`, `i18next`) para builds desktop/offline y superficie de supply chain; idealmente empaquetar localmente. Referencias: `src/index.html:938`, `src/index.html:939`.

## P1 (CI / testing)
- [x] Mejorar workflow de CI principal: actualmente “Build and Test” solo hace `pack` y no ejecuta lint/tests. Referencias: `.github/workflows/build-test.yml:30`.
- [x] Unificar versión de Node en workflows (hay mezcla de Node 20.18.1 y 18). Referencias: `.github/workflows/build-test.yml:24`, `.github/workflows/release-branch.yml:24`, `.github/workflows/release-tagged.yml:16`.
- [x] Endurecer Jest: `coverageThreshold` está a `0` en todo y se ignoran suites relevantes (`tests/modules`, `tests/core`, `src/js/epg/__tests__`). Referencias: `jest.config.js:50`, `jest.config.js:107`.
- [x] Corregir E2E con falsos positivos y duplicados:
  - Se eliminó el duplicado `tests/e2e/security.spec.js` y se dejó un único test en `tests/e2e/security.electron.spec.js`.
  - Se corrigió `tests/e2e/performance.spec.js` para validar una medición real (evitando pasar con `dt=0`).
  Referencias: `tests/e2e/security.electron.spec.js:3`, `tests/e2e/performance.spec.js:45`.

## P2 (mantenibilidad y deuda técnica)
- [x] Resolver duplicación de entrypoints grandes (`src/js/script.js` ~5175 líneas y `src/js/main.js` ~1848 líneas) y dejar un único flujo de ejecución. Referencias: `src/index.html:952`, `src/js/script.js`, `docs/development/EPG-INTEGRATION-SUMMARY.md:40`.
- [x] Revisar módulos “nuevos” (`src/js/core/*`, `src/js/modules/*`) que no están integrados en el runtime principal cargado por `index.html`; definir si se adoptan o se eliminan. Referencias: `src/index.html:953`, `src/js/core/hybrid-bootstrap.js:1`.
- [x] Completar o eliminar TODOs funcionales de módulos:
  - Sync remoto sin implementar.
  - Encriptación/desencriptación placeholders.
  - Refresh de playlists desde URL sin implementar.
  Referencias: `src/js/modules/ConfigManager.js:834`, `src/js/modules/ConfigManager.js:1038`, `src/js/modules/PlaylistManager.js:841`.
- [x] Añadir `typecheck` real y ampliar `tsconfig.include` para cubrir todos los TS del proyecto (`src/player`, `src/store` actualmente fuera). Referencias: `package.json:27`, `tsconfig.json:17`.
- [x] Alinear versiones de toolchain de tests (Jest 30 con `babel-jest` 29) para evitar incompatibilidades futuras. Se eliminó la dependencia directa desalineada de `babel-jest` y se usa el transform por defecto de Jest 30. Referencias: `package.json`, `jest.config.js`, `jest.m3u.config.js`.
- [x] Reducir ruido de logs (`console.*`) en producción y centralizar logger por niveles/debug flag. Referencias: `src/js/script.js:4`, `main.js:22`.
- [x] Limpiar archivos vacíos/artefactos de debug y documentos placeholder para evitar confusión de mantenimiento. Referencias: `debug-script.js`, `debug-channels.html`, `docs/development/IMPLEMENTATION-SUMMARY.md`.
- [x] Eliminar configuración ESLint duplicada para evitar drift (`eslint.config.js` + `.eslintrc.json`). Referencias: `eslint.config.js`, `.eslintrc.json`.
- [x] Actualizar prerequisitos documentados de Node (README indica Node 16+, workflows usan Node 18/20). Referencias: `README.md:250`, `.github/workflows/build-test.yml:24`.
