import { describe, expect, it, vi } from 'vitest';
import { START_CHOICES, isWelcomeDone } from './welcomePrefs';

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
    setPrefs({ lang: 'ms', nationality: 'Japan', startedFrom: 'arrival' });

    const prefs = getPrefs();
    expect(prefs).toMatchObject({ lang: 'ms', nationality: 'Japan', startedFrom: 'arrival' });
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
      expect(choice.label).toBeTruthy();
    }
  });
});
