import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Loads fresh copies of the modules, like reopening the app. */
async function openApp() {
  vi.resetModules();
  const i18n = (await import('./i18n')).default;
  const { getLanguages } = await import('./i18n');
  const settings = await import('./settings');
  return { i18n, getLanguages, ...settings };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('translations', () => {
  it('lists every language file with its own name', async () => {
    const { getLanguages } = await openApp();
    expect(getLanguages()).toEqual(
      expect.arrayContaining([
        { code: 'en', name: 'English' },
        { code: 'ms', name: 'Bahasa Melayu' },
      ]),
    );
  });

  it('starts in English with no saved preference', async () => {
    const { i18n } = await openApp();
    expect(i18n.language).toBe('en');
    expect(i18n.t('ui.tabs.guide')).toBe('Guide');
  });

  it('switches every translation when setPrefs changes the language', async () => {
    const { i18n, setPrefs } = await openApp();
    setPrefs({ lang: 'ms' });
    expect(i18n.language).toBe('ms');
    expect(i18n.t('ui.tabs.guide')).toBe('Panduan');
  });

  it('getLanguages is also available from settings.js', async () => {
    const { getLanguages } = await openApp();
    expect(getLanguages().length).toBeGreaterThanOrEqual(2);
  });

  it('starts in the saved language after a reload', async () => {
    const data = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => data[k] ?? null,
      setItem: (k, v) => (data[k] = v),
    });
    (await openApp()).setPrefs({ lang: 'ms' });

    const { i18n } = await openApp();
    expect(i18n.language).toBe('ms');
  });

  it('falls back to English for an unknown language', async () => {
    const { i18n, setPrefs } = await openApp();
    setPrefs({ lang: 'ms' });
    setPrefs({ lang: 'xx' });
    expect(i18n.language).toBe('en');
  });

  it('falls back to English when a Malay text is missing', async () => {
    const { i18n, setPrefs } = await openApp();
    i18n.addResource('en', 'translation', 'test.onlyEnglish', 'Only in English');
    setPrefs({ lang: 'ms' });
    expect(i18n.t('test.onlyEnglish')).toBe('Only in English');
  });
});

describe('language files', () => {
  /** Every key in a nested object, like 'checkin.gold.title'. */
  const keysOf = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? keysOf(v, `${prefix}${k}.`)
        : [`${prefix}${k}`],
    );

  const files = import.meta.glob('../data/locales/*.json', { eager: true, import: 'default' });
  const byLang = Object.fromEntries(
    Object.entries(files).map(([path, json]) => [path.match(/([\w-]+)\.json$/)[1], json]),
  );

  it('every language has exactly the same keys as English', () => {
    const english = keysOf(byLang.en).sort();
    for (const [lang, json] of Object.entries(byLang)) {
      const keys = keysOf(json).sort();
      const missing = english.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !english.includes(k));
      expect({ lang, missing, extra }).toEqual({ lang, missing: [], extra: [] });
    }
  });

  it('no text is empty', () => {
    for (const [lang, json] of Object.entries(byLang)) {
      const empty = keysOf(json).filter((k) => {
        const value = k.split('.').reduce((o, part) => o[part], json);
        return typeof value === 'string' && value.trim() === '';
      });
      expect({ lang, empty }).toEqual({ lang, empty: [] });
    }
  });
});
