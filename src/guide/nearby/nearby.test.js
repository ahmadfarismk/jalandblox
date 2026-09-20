import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { categoriesFor, groupForCategory, pickCategory } from './categories';
import { getNearbyPlaces, hasKey, searchPlaces } from './geoapify';
import * as source from './nearbySource';
import { matchOursByName, mergeOursFirst, ourPlacesAsResults, oursNear } from './ourPlaces';

/** A Geoapify Places answer (GeoJSON), trimmed to the fields we read. */
function placesAnswer(features) {
  return { type: 'FeatureCollection', features };
}

function feature(props) {
  return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [0, 0] } };
}

function ok(body) {
  return { ok: true, status: 200, json: async () => body };
}

function status(code) {
  return { ok: false, status: code, json: async () => ({}) };
}

const KL = { lat: 3.1488, lng: 101.6943 };

describe('category groups', () => {
  it('sends the exact category names Geoapify was checked against', () => {
    expect(categoriesFor('see')).toBe(
      'tourism.sights,tourism.attraction,entertainment.museum,heritage,leisure.park',
    );
    expect(categoriesFor('eat')).toBe(
      'catering.restaurant,catering.cafe,catering.fast_food,catering.food_court',
    );
    expect(categoriesFor('stay')).toBe(
      'accommodation.hotel,accommodation.hostel,accommodation.guest_house',
    );
  });

  it('refuses a group it does not know', () => {
    expect(() => categoriesFor('shop')).toThrow();
  });

  it('places a deeper category under the group we asked for', () => {
    expect(groupForCategory('catering.restaurant.italian')).toBe('eat');
    expect(groupForCategory('heritage.unesco')).toBe('see');
    expect(groupForCategory('accommodation.hotel')).toBe('stay');
    expect(groupForCategory('commercial.supermarket')).toBe(null);
    expect(groupForCategory(undefined)).toBe(null);
  });

  it('shows the category that belongs to the group, not the first one', () => {
    expect(pickCategory(['building.tourism', 'catering.cafe'], 'eat')).toBe('catering.cafe');
    expect(pickCategory(['building.tourism'], 'eat')).toBe('building.tourism');
    expect(pickCategory([], 'eat')).toBe(null);
  });
});

describe('geoapify requests', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GEOAPIFY_KEY', 'test-key');
    source.clearCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('asks for one group at a time, with longitude before latitude', async () => {
    const fetchMock = vi.fn(async () => ok(placesAnswer([])));
    vi.stubGlobal('fetch', fetchMock);

    await getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 1000, group: 'eat' });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.geoapify.com/v2/places');
    expect(url.searchParams.get('categories')).toBe(categoriesFor('eat'));
    expect(url.searchParams.get('filter')).toBe(`circle:${KL.lng},${KL.lat},1000`);
    expect(url.searchParams.get('bias')).toBe(`proximity:${KL.lng},${KL.lat}`);
    expect(url.searchParams.get('categories')).not.toContain('accommodation');
  });

  it('turns a Geoapify feature into our own shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ok(
          placesAnswer([
            feature({
              place_id: 'abc123',
              name: 'A cafe',
              categories: ['building', 'catering.cafe'],
              lat: 3.15,
              lon: 101.7,
              distance: 42,
              address_line2: 'Jalan Somewhere, Kuala Lumpur',
            }),
          ]),
        ),
      ),
    );

    const [item] = await getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 1000, group: 'eat' });

    expect(item).toMatchObject({
      id: 'geoapify:abc123',
      name: 'A cafe',
      category: 'catering.cafe',
      group: 'eat',
      lat: 3.15,
      lng: 101.7,
      distance_m: 42,
    });
    // Nothing the data does not contain
    expect(item).not.toHaveProperty('rating');
    expect(item).not.toHaveProperty('price');
  });

  it('works out the distance itself when Geoapify does not send one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ok(placesAnswer([feature({ place_id: 'x', name: 'Near', lat: KL.lat, lon: KL.lng })])),
      ),
    );
    const [item] = await getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 500, group: 'see' });
    expect(item.distance_m).toBe(0);
  });

  it('drops anything without coordinates, and the same place twice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ok(
          placesAnswer([
            feature({ place_id: 'a', name: 'One', lat: 3.15, lon: 101.7 }),
            feature({ place_id: 'a', name: 'One again', lat: 3.15, lon: 101.7 }),
            feature({ place_id: 'b', name: 'No position' }),
          ]),
        ),
      ),
    );
    const items = await getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 500, group: 'see' });
    expect(items.map((i) => i.id)).toEqual(['geoapify:a']);
  });

  it('uses the autocomplete endpoint for a typed search', async () => {
    const fetchMock = vi.fn(async () =>
      ok({
        results: [
          {
            place_id: 'p1',
            name: 'Central Market',
            category: 'commercial.marketplace',
            lat: 3.1457,
            lon: 101.6958,
            distance: 300,
            address_line2: 'Kuala Lumpur, Malaysia',
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const items = await searchPlaces('central market', KL);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.geoapify.com/v1/geocode/autocomplete');
    expect(url.searchParams.get('text')).toBe('central market');
    expect(url.searchParams.get('filter')).toBe('countrycode:my');
    expect(url.searchParams.get('bias')).toBe(`proximity:${KL.lng},${KL.lat}`);
    expect(url.searchParams.get('format')).toBe('json');
    expect(items[0]).toMatchObject({ name: 'Central Market', group: null, distance_m: 300 });
  });

  it('sends nothing at all for an empty search', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchPlaces('   ', KL)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'bad_key'],
    [403, 'bad_key'],
    [429, 'rate_limited'],
    [500, 'server'],
    [418, 'error'],
  ])('turns HTTP %i into the reason "%s"', async (code, reason) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => status(code)),
    );
    await expect(
      getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 500, group: 'see' }),
    ).rejects.toMatchObject({ reason });
  });

  it('calls a dead connection "network" and never leaks the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const error = await getNearbyPlaces({
      lat: KL.lat,
      lng: KL.lng,
      radius: 500,
      group: 'see',
    }).catch((e) => e);

    expect(error.reason).toBe('network');
    expect(error.safeUrl).toContain('apiKey=***');
    expect(`${error.message} ${error.safeUrl}`).not.toContain('test-key');
  });

  it('says "no_key" before touching the network when no key is set', async () => {
    vi.stubEnv('VITE_GEOAPIFY_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(hasKey()).toBe(false);
    await expect(
      getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 500, group: 'see' }),
    ).rejects.toMatchObject({ reason: 'no_key' });
    await expect(searchPlaces('petronas', KL)).rejects.toMatchObject({ reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the fake/real switch and the cache', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GEOAPIFY_KEY', 'test-key');
    source.clearCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('answers from the fake without a key and without the network', async () => {
    vi.stubEnv('VITE_GEOAPIFY_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const answer = await source.getNearbyPlaces({
      ...KL,
      radius: 3000,
      group: 'eat',
      source: 'fake',
    });

    expect(answer.ok).toBe(true);
    expect(answer.items.length).toBeGreaterThan(0);
    expect(answer.items.every((item) => item.group === 'eat')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never asks the same question twice', async () => {
    const fetchMock = vi.fn(async () => ok(placesAnswer([])));
    vi.stubGlobal('fetch', fetchMock);

    const before = source.getRequestCount();
    const question = { ...KL, radius: 1000, group: 'see', source: 'geoapify' };
    const first = await source.getNearbyPlaces(question);
    const second = await source.getNearbyPlaces(question);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(source.getRequestCount()).toBe(before + 1);
  });

  it('does not count a request that never left the browser', async () => {
    vi.stubEnv('VITE_GEOAPIFY_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const before = source.getRequestCount();
    const answer = await source.getNearbyPlaces({
      ...KL,
      radius: 1000,
      group: 'see',
      source: 'geoapify',
    });

    expect(answer).toMatchObject({ ok: false, reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(source.getRequestCount()).toBe(before);
  });

  it('asks again for a different group, and keeps both answers', async () => {
    const fetchMock = vi.fn(async () => ok(placesAnswer([])));
    vi.stubGlobal('fetch', fetchMock);

    await source.getNearbyPlaces({ ...KL, radius: 1000, group: 'see', source: 'geoapify' });
    await source.getNearbyPlaces({ ...KL, radius: 1000, group: 'eat', source: 'geoapify' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(source.getCacheSize()).toBe(2);
  });

  it('does not remember a failure, so it can be tried again', async () => {
    const fetchMock = vi.fn(async () => status(429));
    vi.stubGlobal('fetch', fetchMock);

    const question = { ...KL, radius: 1000, group: 'stay', source: 'geoapify' };
    const first = await source.getNearbyPlaces(question);
    const second = await source.getNearbyPlaces(question);

    expect(first).toMatchObject({ ok: false, reason: 'rate_limited' });
    expect(second).toMatchObject({ ok: false, reason: 'rate_limited' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('defaults to the fake when .env says nothing', () => {
    vi.stubEnv('VITE_GEOAPIFY_SOURCE', '');
    expect(source.defaultSource()).toBe('fake');
    vi.stubEnv('VITE_GEOAPIFY_SOURCE', 'geoapify');
    expect(source.defaultSource()).toBe('geoapify');
    vi.stubEnv('VITE_GEOAPIFY_SOURCE', 'something-else');
    expect(source.defaultSource()).toBe('fake');
  });
});

describe('our own 7 landmarks', () => {
  const ours = ourPlacesAsResults((key) => key);

  it('re-dresses every landmark that has coordinates', () => {
    expect(ours.length).toBeGreaterThan(0);
    for (const place of ours) {
      expect(place.ours).toBe(true);
      expect(place.id.startsWith('ours:')).toBe(true);
      expect(Number.isFinite(place.lat)).toBe(true);
      expect(Number.isFinite(place.lng)).toBe(true);
    }
  });

  it('keeps KL Sentral out of See, Eat and Stay, because it is none of them', () => {
    const sentral = ours.find((p) => p.placeId === 'kl-sentral');
    expect(sentral.group).toBe(null);
  });

  it('finds ours by name and measures the distance', () => {
    const hits = matchOursByName(ours, 'places.abdul-samad', KL);
    expect(hits.length).toBe(1);
    expect(hits[0].distance_m).toBeLessThan(500);
  });

  it('only shows ours that are inside the radius', () => {
    const wide = oursNear(ours, { ...KL, radius: 5000, group: 'see' });
    const tight = oursNear(ours, { ...KL, radius: 200, group: 'see' });
    expect(wide.length).toBeGreaterThan(tight.length);
    expect(tight.every((p) => p.distance_m <= 200)).toBe(true);
  });

  it('puts ours first and drops a Geoapify copy of the same name', () => {
    const mine = [{ id: 'ours:x', name: 'Petronas Twin Towers', ours: true }];
    const theirs = [
      { id: 'geoapify:1', name: 'petronas twin towers' },
      { id: 'geoapify:2', name: 'A cafe' },
    ];
    expect(mergeOursFirst(mine, theirs).map((p) => p.id)).toEqual(['ours:x', 'geoapify:2']);
  });
});
