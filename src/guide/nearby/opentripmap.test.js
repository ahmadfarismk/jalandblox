// Task X2: the second provider, the two-source switch, and the duplicate fix.
// The Geoapify tests stay in nearby.test.js. No test here touches a real API.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OTM_SEE_KINDS, groupForKinds, pickKind } from './categories';
import * as otm from './opentripmap';
import * as source from './nearbySource';
import { isOneOfOurs, mergeOursFirst, ourPlacesAsResults } from './ourPlaces';

/** OpenTripMap answers format=json with a plain array. */
function ok(body) {
  return { ok: true, status: 200, json: async () => body };
}

/** Geoapify answers with GeoJSON, needed where both providers are in play. */
function geoapifyAnswer() {
  return { ok: true, status: 200, json: async () => ({ type: 'FeatureCollection', features: [] }) };
}

const KL = { lat: 3.1488, lng: 101.6943 };

describe('OpenTripMap kinds', () => {
  it('leaves squares-and-streets and view points out of the curated list', () => {
    // OpenTripMap calls `squares` "squares and streets", so asking for it
    // brings back roads, the exact problem Geoapify had in task X1.
    expect(OTM_SEE_KINDS).not.toContain('squares');
    expect(OTM_SEE_KINDS).not.toContain('view_points');
    expect(OTM_SEE_KINDS).not.toContain('cultural');
    expect(OTM_SEE_KINDS).not.toContain('unclassified_objects');
  });

  it('asks for the six kinds a tourist sights list needs', () => {
    expect(OTM_SEE_KINDS).toEqual([
      'museums',
      'historic',
      'architecture',
      'religion',
      'gardens_and_parks',
      'natural',
    ]);
  });

  it('shows the telling kind, not the broad branch name', () => {
    expect(pickKind('architecture,historic_architecture,interesting_places')).toBe(
      'historic_architecture',
    );
    expect(pickKind('museums,cultural,interesting_places')).toBe('museums');
    expect(pickKind('')).toBe(null);
  });

  it('works out which group a search result belongs to', () => {
    expect(groupForKinds('religion,interesting_places')).toBe('see');
    expect(groupForKinds('foods,tourist_facilities')).toBe('eat');
    expect(groupForKinds('accomodations,other_hotels')).toBe('stay');
    expect(groupForKinds('shops,marketplaces')).toBe(null);
  });
});

describe('opentripmap requests', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OPENTRIPMAP_KEY', 'otm-test-key');
    source.clearCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('asks the radius endpoint for our curated See kinds', async () => {
    const fetchMock = vi.fn(async () => ok([]));
    vi.stubGlobal('fetch', fetchMock);

    await otm.getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 1000, group: 'see' });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.opentripmap.com/0.1/en/places/radius');
    expect(url.searchParams.get('kinds')).toBe(OTM_SEE_KINDS.join(','));
    expect(url.searchParams.get('lat')).toBe(String(KL.lat));
    expect(url.searchParams.get('lon')).toBe(String(KL.lng));
    expect(url.searchParams.get('radius')).toBe('1000');
    expect(url.searchParams.get('format')).toBe('json');
    // No rate unless one was asked for: that is the API default.
    expect(url.searchParams.get('rate')).toBe(null);
  });

  it('asks for everything under interesting_places on the wide probe', async () => {
    const fetchMock = vi.fn(async () => ok([]));
    vi.stubGlobal('fetch', fetchMock);

    await otm.getNearbyPlaces({
      lat: KL.lat,
      lng: KL.lng,
      radius: 1000,
      group: 'see',
      wide: true,
    });

    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('kinds')).toBe(
      'interesting_places',
    );
  });

  it('sends rate as the string the API wants, not a number', async () => {
    const fetchMock = vi.fn(async () => ok([]));
    vi.stubGlobal('fetch', fetchMock);

    await otm.getNearbyPlaces({
      lat: KL.lat,
      lng: KL.lng,
      radius: 1000,
      group: 'see',
      rate: '2h',
    });

    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('rate')).toBe('2h');
  });

  it('turns a feature into the same shape Geoapify returns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ok([
          {
            xid: 'W123',
            name: 'Sultan Abdul Samad Building',
            kinds: 'architecture,historic_architecture,interesting_places',
            osm: 'way/123',
            wikidata: 'Q1234',
            rate: 3,
            dist: 42.7,
            point: { lon: 101.6944, lat: 3.1488 },
          },
        ]),
      ),
    );

    const [item] = await otm.getNearbyPlaces({
      lat: KL.lat,
      lng: KL.lng,
      radius: 1000,
      group: 'see',
    });

    expect(item).toMatchObject({
      id: 'otm:W123',
      name: 'Sultan Abdul Samad Building',
      category: 'historic_architecture',
      group: 'see',
      lat: 3.1488,
      lng: 101.6944,
      distance_m: 43,
      significance: 3,
    });
    // Nothing the data does not contain.
    expect(item).not.toHaveProperty('rating');
    expect(item).not.toHaveProperty('price');
  });

  it('uses the autosuggest endpoint for a typed search', async () => {
    const fetchMock = vi.fn(async () =>
      ok([
        {
          xid: 'N9',
          name: 'Masjid Jamek',
          kinds: 'religion,interesting_places',
          dist: 210,
          point: { lon: 101.6957, lat: 3.1494 },
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const items = await otm.searchPlaces('masjid jamek', KL);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.opentripmap.com/0.1/en/places/autosuggest');
    expect(url.searchParams.get('name')).toBe('masjid jamek');
    // The API makes all three of these required, so we always send them.
    expect(url.searchParams.get('lat')).toBe(String(KL.lat));
    expect(url.searchParams.get('lon')).toBe(String(KL.lng));
    expect(Number(url.searchParams.get('radius'))).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ name: 'Masjid Jamek', group: 'see' });
  });

  it('refuses to search without a point instead of guessing a centre for KL', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(otm.searchPlaces('petronas', null)).rejects.toMatchObject({
      reason: 'needs_point',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses Eat and Stay rather than pretending to support them', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const group of ['eat', 'stay']) {
      await expect(
        otm.getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 1000, group }),
      ).rejects.toMatchObject({ reason: 'unsupported_group' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a 200 that is not an array as a bad answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ok({ error: 'Invalid apikey' })),
    );
    await expect(
      otm.getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 1000, group: 'see' }),
    ).rejects.toMatchObject({ reason: 'bad_answer' });
  });

  it('never leaks the key in an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const error = await otm
      .getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 1000, group: 'see' })
      .catch((e) => e);

    expect(error.reason).toBe('network');
    expect(error.safeUrl).toContain('apikey=***');
    expect(`${error.message} ${error.safeUrl}`).not.toContain('otm-test-key');
  });

  it('says no_key before touching the network when no key is set', async () => {
    vi.stubEnv('VITE_OPENTRIPMAP_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(otm.hasKey()).toBe(false);
    await expect(
      otm.getNearbyPlaces({ lat: KL.lat, lng: KL.lng, radius: 1000, group: 'see' }),
    ).rejects.toMatchObject({ reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the source switch with two providers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('offers fake, geoapify and opentripmap', () => {
    expect(source.SOURCES).toEqual(['fake', 'geoapify', 'opentripmap']);
    expect(source.isRealSource('fake')).toBe(false);
    expect(source.isRealSource('geoapify')).toBe(true);
    expect(source.isRealSource('opentripmap')).toBe(true);
  });

  it('reads the new VITE_NEARBY_SOURCE name', () => {
    vi.stubEnv('VITE_NEARBY_SOURCE', 'opentripmap');
    expect(source.defaultSource()).toBe('opentripmap');
  });

  it('still reads the old VITE_GEOAPIFY_SOURCE, so no existing .env breaks', () => {
    vi.stubEnv('VITE_NEARBY_SOURCE', undefined);
    vi.stubEnv('VITE_GEOAPIFY_SOURCE', 'geoapify');
    expect(source.defaultSource()).toBe('geoapify');
  });

  it('prefers the new name when both are set', () => {
    vi.stubEnv('VITE_NEARBY_SOURCE', 'fake');
    vi.stubEnv('VITE_GEOAPIFY_SOURCE', 'geoapify');
    expect(source.defaultSource()).toBe('fake');
  });

  it('falls back to fake for a provider name it does not know', () => {
    vi.stubEnv('VITE_NEARBY_SOURCE', 'googleplaces');
    expect(source.defaultSource()).toBe('fake');
  });

  it('keeps the two providers apart in the cache and the counts', async () => {
    vi.stubEnv('VITE_GEOAPIFY_KEY', 'geo-test-key');
    vi.stubEnv('VITE_OPENTRIPMAP_KEY', 'otm-test-key');
    source.clearCache();
    const fetchMock = vi.fn(async (url) =>
      String(url).includes('opentripmap') ? ok([]) : geoapifyAnswer(),
    );
    vi.stubGlobal('fetch', fetchMock);

    const question = { ...KL, radius: 1000, group: 'see' };
    await source.getNearbyPlaces({ ...question, source: 'geoapify' });
    await source.getNearbyPlaces({ ...question, source: 'opentripmap' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(source.getCacheSize()).toBe(2);
    expect(Object.keys(source.getRequestCounts())).toEqual(['geoapify', 'opentripmap']);
  });

  it('asks again when the significance or the kinds change', async () => {
    vi.stubEnv('VITE_OPENTRIPMAP_KEY', 'otm-test-key');
    source.clearCache();
    const fetchMock = vi.fn(async () => ok([]));
    vi.stubGlobal('fetch', fetchMock);

    const question = { ...KL, radius: 1000, group: 'see', source: 'opentripmap' };
    await source.getNearbyPlaces(question);
    await source.getNearbyPlaces({ ...question, rate: '2' });
    await source.getNearbyPlaces({ ...question, wide: true });
    // The first question again: cached, so no fourth request.
    await source.getNearbyPlaces(question);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('the duplicate filter', () => {
  const ours = ourPlacesAsResults((key) => key);
  const samad = ours.find((p) => p.placeId === 'abdul-samad');
  const petronas = ours.find((p) => p.placeId === 'petronas');

  /** Moves a number of metres north of a point. */
  const north = (place, metres) => place.lat + metres / 111320;

  it('drops our landmark under its Malay name, which the name match missed', () => {
    const result = {
      id: 'geoapify:1',
      name: 'Menara Berkembar Petronas',
      category: 'tourism.attraction',
      group: 'see',
      allCategories: ['tourism', 'tourism.attraction'],
      lat: petronas.lat,
      lng: petronas.lng,
    };
    expect(isOneOfOurs(ours, result)).toBe(true);
    expect(mergeOursFirst([], [result], ours)).toEqual([]);
  });

  it('drops all three copies Geoapify returned for one building', () => {
    const copies = [2, 112, 121].map((offset, i) => ({
      id: `geoapify:${i}`,
      name: 'Bangunan Sultan Abdul Samad',
      category: i === 0 ? 'entertainment.museum' : 'tourism.attraction',
      group: 'see',
      allCategories: [],
      lat: north(samad, offset),
      lng: samad.lng,
    }));
    expect(mergeOursFirst([], copies, ours)).toEqual([]);
  });

  it('keeps a cafe next door, because it is not the same kind of thing', () => {
    const cafe = {
      id: 'geoapify:cafe',
      name: 'Courthouse Cafe',
      category: 'catering.cafe',
      group: 'eat',
      // Geoapify tags plenty of cafes as buildings, which must not count as a
      // sight, or every cafe near a landmark would vanish.
      allCategories: ['building', 'catering.cafe'],
      lat: samad.lat,
      lng: samad.lng,
    };
    expect(isOneOfOurs(ours, cafe)).toBe(false);
    expect(mergeOursFirst([], [cafe], ours).map((p) => p.id)).toEqual(['geoapify:cafe']);
  });

  it('keeps a real sight that is simply far enough away', () => {
    const far = {
      id: 'otm:far',
      name: 'Muzium Tekstil Negara',
      category: 'museums',
      group: 'see',
      allCategories: ['museums'],
      lat: north(samad, 400),
      lng: samad.lng,
    };
    expect(isOneOfOurs(ours, far)).toBe(false);
  });

  it('still drops an exact name match, however far away it is', () => {
    const shown = [{ id: 'ours:x', name: 'Petaling Street', ours: true, lat: 3.1, lng: 101.7 }];
    const other = {
      id: 'geoapify:9',
      name: 'petaling street',
      lat: 4,
      lng: 102,
      allCategories: [],
    };
    expect(mergeOursFirst(shown, [other], ours).map((p) => p.id)).toEqual(['ours:x']);
  });

  it('works the same whichever provider the result came from', () => {
    const fromOtm = {
      id: 'otm:W1',
      name: 'Bangunan Sultan Abdul Samad',
      category: 'historic_architecture',
      group: 'see',
      allCategories: ['architecture', 'historic_architecture'],
      lat: samad.lat,
      lng: samad.lng,
    };
    expect(isOneOfOurs(ours, fromOtm)).toBe(true);
  });

  it('checks against all 7, not only the ones on screen', () => {
    const result = {
      id: 'geoapify:2',
      name: 'Menara Berkembar Petronas',
      category: 'tourism.attraction',
      group: 'see',
      allCategories: [],
      lat: petronas.lat,
      lng: petronas.lng,
    };
    // Nothing of ours is on screen, but Petronas is still what this duplicates.
    expect(mergeOursFirst([], [result], ours)).toEqual([]);
    // Without the full list to check against, it survives.
    expect(mergeOursFirst([], [result]).map((p) => p.id)).toEqual(['geoapify:2']);
  });
});
