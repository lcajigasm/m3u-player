// i18n initialization using i18next (ES/EN) for renderer
// Fallbacks gracefully if i18next UMD isn't present

(function () {
  async function loadLocales() {
    const [en, es] = await Promise.all([
      fetch('locales/en.json').then((r) => r.json()),
      fetch('locales/es.json').then((r) => r.json()),
    ]);
    return {
      en: { translation: en },
      es: { translation: es },
    };
  }

  function detectLanguage(supported) {
    const saved = localStorage.getItem('m3u-player-language');
    if (saved && supported.includes(saved)) return saved;
    const nav = (navigator.language || 'en').slice(0, 2);
    if (supported.includes(nav)) return nav;
    return 'en';
  }

  function applyTranslations() {
    const t = window.__t || ((k) => k);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      el.setAttribute('placeholder', t(key));
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (!key) return;
      el.setAttribute('title', t(key));
    });
  }

  function setupLanguageSelector() {
    const select = document.getElementById('languageSelect');
    if (!select) return;
    select.addEventListener('change', async () => {
      const next = select.value;
      localStorage.setItem('m3u-player-language', next);
      if (window.i18next && window.i18next.changeLanguage) {
        await window.i18next.changeLanguage(next);
      } else {
        // minimal fallback just re-pulls resources and reapplies
        window.__currentLng = next;
      }
      applyTranslations();
    });
  }

  async function initI18n() {
    const resources = await loadLocales();
    const supported = Object.keys(resources);
    const lng = detectLanguage(supported);

    if (window.i18next && typeof window.i18next.init === 'function') {
      await window.i18next.init({
        lng,
        fallbackLng: 'en',
        resources,
        interpolation: { escapeValue: false },
      });
      window.__t = function (key, options) {
        return window.i18next.t(key, options);
      };
    } else {
      const dict = resources[lng].translation;
      window.__t = function (key, options) {
        var raw = dict[key] || key;
        if (!options) return raw;
        return Object.keys(options).reduce(function (acc, k) {
          return acc.replace('{' + k + '}', String(options[k]));
        }, raw);
      };
    }

    // Compatibility shim for existing code using window.i18n/window.t
    window.t = function (key, defaultValue) {
      try {
        const res = window.__t ? window.__t(key) : key;
        return res || defaultValue || key;
      } catch (_) {
        return defaultValue || key;
      }
    };

    window.i18n = {
      currentLanguage: (window.i18next && window.i18next.language) || lng,
      setLanguage: async function (next) {
        localStorage.setItem('m3u-player-language', next);
        if (window.i18next && window.i18next.changeLanguage) {
          await window.i18next.changeLanguage(next);
          this.currentLanguage = window.i18next.language;
        } else {
          this.currentLanguage = next;
        }
        applyTranslations();
      },
      updateUI: function () {
        applyTranslations();
      }
    };

    applyTranslations();
    setupLanguageSelector();

    // Sync language selector to current language
    var select = document.getElementById('languageSelect');
    if (select && window.i18n?.currentLanguage) {
      select.value = window.i18n.currentLanguage;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();


