### i18n quick guide

This app uses i18next with two locales: ES and EN.

- Files: `src/locales/en.json`, `src/locales/es.json`
- Initializer: `src/i18n/index.js` (no bundler required)
- HTML attributes supported:
  - `data-i18n="key"` → sets textContent
  - `data-i18n-placeholder="key"` → sets input placeholder
  - `data-i18n-title="key"` → sets title attribute

Language detection order: saved preference (`localStorage:m3u-player-language`) → browser language → `en`.

Programmatic usage:

```js
// translate a key
const label = window.t('open_file');

// change language at runtime
window.i18n.setLanguage('es');
```

Add new strings by adding keys to both JSON files and using `data-i18n` in HTML or `window.t('key')` in JS.


