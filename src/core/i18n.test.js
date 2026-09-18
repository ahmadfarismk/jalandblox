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
