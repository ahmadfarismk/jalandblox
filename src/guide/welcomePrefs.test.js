import { describe, expect, it, vi } from 'vitest';
import { getNationalities } from '@/data';
import { START_CHOICES, countryOptions, isWelcomeDone } from './welcomePrefs';

/** A fresh copy of settings, like opening the app again. */
async function openApp() {
  vi.resetModules();
  return await import('@/core/settings');
}

describe('isWelcomeDone', () => {
  it('is false on a fresh phone, so the Welcome screen shows', async () => {
    const { getPrefs } = await openApp();
    expect(isWelcomeDone(getPrefs())).toBe(false);
  });

  it('is false when the preferences are missing or broken', () => {
    expect(isWelcomeDone(undefined)).toBe(false);
    expect(isWelcomeDone(null)).toBe(false);
    expect(isWelcomeDone({})).toBe(false);
    expect(isWelcomeDone({ startedFrom: null })).toBe(false);
    expect(isWelcomeDone({ startedFrom: 'somewhere-else' })).toBe(false);
  });

  it('is true for either start choice', () => {
    for (const { value } of START_CHOICES) {
      expect(isWelcomeDone({ startedFrom: value })).toBe(true);
    }
  });

  it('is true after the Welcome screen saves a choice, so it is skipped next open', async () => {
    const { getPrefs, setPrefs } = await openApp();
    setPrefs({ lang: 'ms', nationality: 'JP', startedFrom: 'arrival' });

    const prefs = getPrefs();
    expect(prefs).toMatchObject({ lang: 'ms', nationality: 'JP', startedFrom: 'arrival' });
    expect(isWelcomeDone(prefs)).toBe(true);
  });
});

describe('START_CHOICES', () => {
  // If core stops accepting one of these values, this test fails instead of the
  // screen quietly saving nothing.
  it('are all values that core/settings.js actually saves', async () => {
    const { getPrefs, setPrefs } = await openApp();
    for (const { value } of START_CHOICES) {
      setPrefs({ startedFrom: value });
      expect(getPrefs().startedFrom).toBe(value);
    }
  });

  it('gives every choice a locale key and an English default', () => {
    for (const choice of START_CHOICES) {
      expect(choice.key).toMatch(/^welcome\./);
      expect(choice.hintKey).toMatch(/^welcome\./);
      expect(choice.label).toBeTruthy();
      expect(choice.hint).toBeTruthy();
    }
  });
});

describe('countryOptions', () => {
  it('shows every country Danial listed, once', () => {
    const options = countryOptions('en');
    expect(options).toHaveLength(getNationalities().length);
    expect(new Set(options.map((o) => o.code)).size).toBe(options.length);
  });

  it('gives every country a name to show', () => {
    for (const { code, name } of countryOptions('en')) {
      expect(name).toBeTruthy();
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('names countries in the chosen language', () => {
    const nameIn = (lang, code) => countryOptions(lang).find((o) => o.code === code)?.name;
    expect(nameIn('en', 'MY')).toBe('Malaysia');
    expect(nameIn('en', 'JP')).toBe('Japan');
    // Malay names its own way. If the phone can't, it falls back to English.
    expect(nameIn('ms', 'JP')).toBeTruthy();
  });

  it('sorts the list by name, so a visitor can scroll to theirs', () => {
    const names = countryOptions('en').map((o) => o.name);
    expect(names).toEqual([...names].sort(new Intl.Collator('en').compare));
  });

  it('falls back to the codes when the phone has no country names', () => {
    const DisplayNames = Intl.DisplayNames;
    vi.stubGlobal('Intl', {
      ...Intl,
      DisplayNames: function Broken() {
        throw new Error('not supported');
      },
    });
    try {
      const options = countryOptions('en');
      expect(options).toHaveLength(getNationalities().length);
      expect(options.every((o) => o.name === o.code)).toBe(true);
    } finally {
      vi.stubGlobal('Intl', { ...Intl, DisplayNames });
      vi.unstubAllGlobals();
    }
  });
});
