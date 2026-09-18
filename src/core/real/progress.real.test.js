import { beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'jalankl-progress-v1';

/** A tiny in-memory stand-in for the browser's localStorage. */
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

/** Loads a fresh copy of progress.real.js with the given storage, like reopening the app. */
async function openApp(storage) {
  vi.resetModules();
  vi.stubGlobal('localStorage', storage);
  return import('./progress.real');
}

let storage;
let p;

beforeEach(async () => {
  vi.unstubAllGlobals();
  storage = fakeStorage();
  p = await openApp(storage);
});

describe('loading a save', () => {
  it('starts empty when nothing is saved', () => {
    expect(p.getProgress()).toEqual({
      version: 1,
      prefs: { lang: 'en', nationality: null, startedFrom: null },
      opened: [],
      stamps: {},
      journeys: {},
      reviewed: [],
    });
  });

  it('does not crash on a broken save, and keeps a backup of it', async () => {
    storage.setItem(KEY, '{not json');
    p = await openApp(storage);
    expect(p.getProgress().stamps).toEqual({});
    expect(storage.getItem(`${KEY}-broken`)).toBe('{not json');
  });

  it('fills defaults for an older save with missing fields', async () => {
    storage.setItem(KEY, JSON.stringify({ stamps: { petronas: { kind: 'gold', at: 'x' } } }));
    p = await openApp(storage);
    const progress = p.getProgress();
    expect(progress.prefs.lang).toBe('en');
    expect(progress.opened).toEqual([]);
    expect(progress.stamps.petronas).toEqual({ kind: 'gold', at: 'x' });
  });

  it('drops invalid values instead of crashing', async () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        prefs: 'nope',
        opened: 'nope',
        stamps: { a: { kind: 'platinum', at: 'x' }, b: null, c: { kind: 'outline', at: 'y' } },
        journeys: { r1: { stepIndex: -1 }, r2: { stepIndex: 3 } },
      }),
    );
    p = await openApp(storage);
    const progress = p.getProgress();
    expect(progress.opened).toEqual([]);
    expect(Object.keys(progress.stamps)).toEqual(['c']);
    expect(progress.journeys).toEqual({ r2: { stepIndex: 3 } });
  });

  it('still works when localStorage is blocked', async () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    p = await openApp(blocked);
    p.addStamp('petronas', 'gold', 10);
    expect(p.getStamp('petronas').kind).toBe('gold');
  });
});

describe('stamps survive a reload', () => {
  it('reloads saved stamps, journeys and reviews', async () => {
    p.addStamp('petronas', 'gold', 18.4);
    p.setJourneyStep('kl-sentral__petronas', 2);
    p.markReviewed('petronas');

    p = await openApp(storage);
    expect(p.getStamp('petronas').kind).toBe('gold');
    expect(p.getProgress().stamps.petronas.accuracy_m).toBe(18);
    expect(p.getProgress().journeys['kl-sentral__petronas']).toEqual({ stepIndex: 2 });
    expect(p.getProgress().reviewed).toEqual(['petronas']);
  });

  it('never saves coordinates', () => {
    p.addStamp('petronas', 'gold', 18);
    expect(storage.getItem(KEY)).not.toMatch(/lat|lng|coords/);
  });
});

describe('stamp rules', () => {
  it('markOpened gives an outline stamp only if there is no stamp yet', () => {
    p.markOpened('kl-tower');
    expect(p.getStamp('kl-tower').kind).toBe('outline');
    expect(p.getProgress().opened).toEqual(['kl-tower']);

    p.addStamp('petronas', 'gold');
    p.markOpened('petronas');
    expect(p.getStamp('petronas').kind).toBe('gold');
  });

  it('upgrades outline to gold', () => {
    p.addStamp('petronas', 'outline');
    expect(p.addStamp('petronas', 'gold', 20).kind).toBe('gold');
  });

  it('never turns gold back into outline, and keeps the first gold date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T02:42:00Z'));
    p.addStamp('petronas', 'gold', 18);
    vi.setSystemTime(new Date('2026-10-05T09:00:00Z'));

    expect(p.addStamp('petronas', 'outline').kind).toBe('gold');
    expect(p.addStamp('petronas', 'gold', 5).at).toBe('2026-10-03T02:42:00.000Z');
    vi.useRealTimers();
  });

  it('rejects an unknown stamp kind', () => {
    expect(() => p.addStamp('petronas', 'silver')).toThrow();
  });

  it('getStamp returns null or { kind, at } only', () => {
    expect(p.getStamp('petronas')).toBeNull();
    p.addStamp('petronas', 'gold', 18);
    expect(Object.keys(p.getStamp('petronas')).sort()).toEqual(['at', 'kind']);
  });
});

describe('reset and preferences', () => {
  it('resetProgress clears progress but keeps preferences', () => {
    p._updatePrefs({ lang: 'ms', nationality: 'JP' });
    p.addStamp('petronas', 'gold');
    p.resetProgress();
    expect(p.getProgress().stamps).toEqual({});
    expect(p.getProgress().prefs).toMatchObject({ lang: 'ms', nationality: 'JP' });
  });

  it('_updatePrefs ignores invalid values', () => {
    const prefs = p._updatePrefs({ startedFrom: 'moon', lang: '' });
    expect(prefs).toEqual({ lang: 'en', nationality: null, startedFrom: null });
  });
});

describe('onProgressChange', () => {
  it('calls the listener on every change until unsubscribed', () => {
    const cb = vi.fn();
    const stop = p.onProgressChange(cb);
    p.markOpened('kl-tower');
    p.setJourneyStep('r', 1);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.lastCall[0].journeys.r).toEqual({ stepIndex: 1 });

    stop();
    p.markReviewed('kl-tower');
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('screens cannot change saved progress by editing the returned object', () => {
    p.getProgress().stamps.petronas = { kind: 'gold', at: 'x' };
    expect(p.getStamp('petronas')).toBeNull();
  });

  it('refreshes when another tab changes the save', async () => {
    const tab = new EventTarget();
    vi.stubGlobal('addEventListener', tab.addEventListener.bind(tab));
    p = await openApp(storage);

    const cb = vi.fn();
    p.onProgressChange(cb);
    storage.setItem(KEY, JSON.stringify({ stamps: { petronas: { kind: 'gold', at: 'x' } } }));
    const event = new Event('storage');
    event.key = KEY;
    tab.dispatchEvent(event);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(p.getStamp('petronas').kind).toBe('gold');
  });
});
