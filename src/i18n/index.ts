/* i18n initialization using i18next (ES/EN) */
/* global window, document, localStorage */

type LocaleResources = {
  [lng: string]: { translation: Record<string, string> };
};

declare global {
  interface Window {
    i18next?: any;
    i18nReady?: Promise<void>;
    __t?: (key: string, options?: Record<string, unknown>) => string;
  }
}

// Lightweight loader to avoid bundler; expects i18next UMD to be present or will fallback
async function loadLocales(): Promise<LocaleResources> {
  const [en, es] = await Promise.all([
    fetch('locales/en.json').then((r) => r.json()),
    fetch('locales/es.json').then((r) => r.json()),
  ]);
  return {
    en: { translation: en },
    es: { translation: es },
  };
}

function detectLanguage(supported: string[]): string {
  const saved = localStorage.getItem('m3u-player-language');
  if (saved && supported.includes(saved)) return saved;
  const nav = (navigator.language || 'en').slice(0, 2);
  if (supported.includes(nav)) return nav;
  return 'en';
}

export async function initI18n(): Promise<void> {
  const resources = await loadLocales();
  const supported = Object.keys(resources);
  const lng = detectLanguage(supported);

  // If i18next is available globally (UMD), use it; otherwise provide minimal fallback
  if (window.i18next && typeof window.i18next.init === 'function') {
    await window.i18next.init({
      lng,
      fallbackLng: 'en',
      resources,
      interpolation: { escapeValue: false },
    });
    window.__t = (key: string, options?: Record<string, unknown>) => window.i18next.t(key, options);
  } else {
    // Minimal fallback: simple dictionary lookup
    const dict = resources[lng].translation;
    window.__t = (key: string, options?: Record<string, unknown>) => {
      const raw = dict[key] || key;
      if (!options) return raw;
      return Object.keys(options).reduce((acc, k) => acc.replace(`{${k}}`, String(options[k])), raw);
    };
  }

  applyTranslations();
  setupLanguageSelector();
}

export function applyTranslations(): void {
  const t = window.__t || ((k: string) => k);

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = t(key);
  });

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    el.placeholder = t(key);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (!key) return;
    el.setAttribute('title', t(key));
  });
}

function setupLanguageSelector(): void {
  const select = document.getElementById('languageSelect') as HTMLSelectElement | null;
  if (!select) return;
  select.addEventListener('change', async () => {
    const next = select.value;
    localStorage.setItem('m3u-player-language', next);
    if (window.i18next?.changeLanguage) {
      await window.i18next.changeLanguage(next);
    }
    applyTranslations();
  });
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.i18nReady = initI18n();
  });
} else {
  window.i18nReady = initI18n();
}


