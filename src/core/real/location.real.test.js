import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { distanceTo, getPermissionState, getPosition, watchPosition } from './location.real';

// A made-up place whose coordinates are still TBC (every real place has them now).
vi.mock('@/data', async (importOriginal) => {
  const data = await importOriginal();
  const noCoords = { ...data.getPlace('petronas'), id: 'no-coords-yet', coords: null };
  return { ...data, getPlace: (id) => (id === noCoords.id ? noCoords : data.getPlace(id)) };
});

/** A pretend phone GPS we control from the tests. */
function fakeGps() {
  const watchers = new Map();
  let nextId = 1;
  return {
    watchers,
    watchPosition(onReading, onError) {
      const id = nextId++;
      watchers.set(id, { onReading, onError });
      return id;
    },
    clearWatch(id) {
      watchers.delete(id);
    },
    reading(lat, lng, accuracy) {
      for (const w of [...watchers.values()]) {
        w.onReading({ coords: { latitude: lat, longitude: lng, accuracy } });
      }
    },
    error(code) {
      for (const w of [...watchers.values()]) w.onError({ code });
    },
  };
}

let gps;

beforeEach(() => {
  vi.useFakeTimers();
  gps = fakeGps();
  vi.stubGlobal('navigator', {
    geolocation: gps,
    permissions: { query: async () => ({ state: 'prompt' }) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getPosition', () => {
  it('keeps the most accurate of 3 readings, then stops the GPS', async () => {
    const result = getPosition();
    gps.reading(3.1, 101.1, 40);
    gps.reading(3.2, 101.2, 12.4);
    gps.reading(3.3, 101.3, 25);
    expect(await result).toEqual({ ok: true, lat: 3.2, lng: 101.2, accuracy_m: 12 });
    expect(gps.watchers.size).toBe(0);
  });

  it('after 10 seconds, uses the best reading it has so far', async () => {
    const result = getPosition();
    gps.reading(3.1, 101.1, 60);
    vi.advanceTimersByTime(10_000);
    expect(await result).toMatchObject({ ok: true, accuracy_m: 60 });
    expect(gps.watchers.size).toBe(0);
  });

  it('after 10 seconds with no reading, answers timeout', async () => {
    const result = getPosition();
    vi.advanceTimersByTime(10_000);
    expect(await result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('answers no_permission when location is denied', async () => {
    const result = getPosition();
    gps.error(1);
    expect(await result).toEqual({ ok: false, reason: 'no_permission' });
  });

  it('answers unavailable when there is no signal', async () => {
    const result = getPosition();
    gps.error(2);
    expect(await result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('answers unavailable when the browser has no GPS', async () => {
    vi.stubGlobal('navigator', {});
    expect(await getPosition()).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('answers unavailable on a non-https address', async () => {
    vi.stubGlobal('isSecureContext', false);
    expect(await getPosition()).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('can take a single quick reading', async () => {
    const result = getPosition({ readings: 1 });
    gps.reading(3.1, 101.1, 30);
    expect(await result).toMatchObject({ ok: true, accuracy_m: 30 });
  });
});

describe('distanceTo', () => {
  // abdul-samad is at [3.14861, 101.69444] in places.json.
  // 0.001 degrees of latitude is about 111 metres.
  it('measures metres to a place', () => {
    expect(distanceTo('abdul-samad', { lat: 3.14961, lng: 101.69444 })).toBe(111);
  });

  it('is 0 when standing on the spot', () => {
    expect(distanceTo('abdul-samad', { lat: 3.14861, lng: 101.69444 })).toBe(0);
  });

  it('is null when the place has no coordinates yet', () => {
    expect(distanceTo('no-coords-yet', { lat: 3.1, lng: 101.6 })).toBeNull();
  });

  it('is null for an unknown place or a failed reading', () => {
    expect(distanceTo('nowhere', { lat: 3.1, lng: 101.6 })).toBeNull();
    expect(distanceTo('abdul-samad', { ok: false, reason: 'timeout' })).toBeNull();
  });
});

describe('watchPosition', () => {
  function fakeDocument() {
    const doc = new EventTarget();
    doc.hidden = false;
    doc.setHidden = (hidden) => {
      doc.hidden = hidden;
      doc.dispatchEvent(new Event('visibilitychange'));
    };
    vi.stubGlobal('document', doc);
    return doc;
  }

  it('sends every reading until stopped', () => {
    fakeDocument();
    const cb = vi.fn();
    const stop = watchPosition(cb);
    gps.reading(3.1, 101.1, 20);
    gps.reading(3.2, 101.2, 15);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith({ ok: true, lat: 3.2, lng: 101.2, accuracy_m: 15 });

    stop();
    expect(gps.watchers.size).toBe(0);
  });

  it('switches GPS off while the app is hidden and back on when it returns', () => {
    const doc = fakeDocument();
    const stop = watchPosition(() => {});
    expect(gps.watchers.size).toBe(1);

    doc.setHidden(true);
    expect(gps.watchers.size).toBe(0);

    doc.setHidden(false);
    expect(gps.watchers.size).toBe(1);

    stop();
    doc.setHidden(false);
    expect(gps.watchers.size).toBe(0);
  });

  it('reports errors to the callback', () => {
    fakeDocument();
    const cb = vi.fn();
    watchPosition(cb);
    gps.error(1);
    expect(cb).toHaveBeenCalledWith({ ok: false, reason: 'no_permission' });
  });
});

describe('getPermissionState', () => {
  it('passes on the browser answer', async () => {
    expect(await getPermissionState()).toBe('prompt');
  });

  it('answers unknown when the browser cannot tell', async () => {
    vi.stubGlobal('navigator', {
      geolocation: gps,
      permissions: {
        query: async () => {
          throw new Error('not supported');
        },
      },
    });
    expect(await getPermissionState()).toBe('unknown');
  });
});
