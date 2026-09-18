import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import ms from './locales/ms.json';
import placesData from './places.json';
import routesData from './routes.json';
import arrivalData from './arrival.json';
import learnData from './learn.json';
import {
  findRoute,
  getArrivalOptions,
  getLearnTopics,
  getLine,
  getNationalities,
  getPlace,
  getPlaces,
  getPostcardPreview,
  getPostcards,
  getRoute,
  getRoutesTo,
  isTBC,
} from './index.js';

const locales = { en, ms };
const lookup = (messages, key) => key.split('.').reduce((node, part) => node?.[part], messages);

// All leaf keys, with i18next plural suffixes kept (en and ms must match exactly).
function leafKeys(node, prefix = '') {
  return Object.entries(node).flatMap(([k, v]) =>
    v && typeof v === 'object' ? leafKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function expectKey(key) {
  for (const [lang, messages] of Object.entries(locales)) {
    const value = lookup(messages, key);
    expect(typeof value, `${lang}: missing text for "${key}"`).toBe('string');
    expect(value.trim(), `${lang}: empty text for "${key}"`).not.toBe('');
  }
}

const LANDMARKS = [
  'petronas',
  'klcc-park',
  'kl-tower',
  'merdeka-118',
  'abdul-samad',
  'petaling-street',
];
const STEP_TYPES = ['walk', 'board', 'ride', 'exit', 'arrive'];

describe('locales', () => {
  it('en and ms have exactly the same keys', () => {
    expect(leafKeys(ms).sort()).toEqual(leafKeys(en).sort());
  });

  it('has no empty strings', () => {
    for (const [lang, messages] of Object.entries(locales)) {
      for (const key of leafKeys(messages)) {
        expect(String(lookup(messages, key)).trim(), `${lang}: ${key}`).not.toBe('');
      }
    }
  });

  it('uses the same {{placeholders}} in both languages', () => {
    const vars = (s) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();
    for (const key of leafKeys(en)) {
      expect(vars(String(lookup(ms, key))), key).toEqual(vars(String(lookup(en, key))));
    }
  });
});

describe('places.json', () => {
  it('has the 7 check-in spots with unique ids', () => {
    const ids = placesData.map((p) => p.id);
    expect(new Set(ids).size).toBe(7);
    expect(ids.sort()).toEqual(['kl-sentral', ...LANDMARKS].sort());
  });

  it('has every field in the agreed shape', () => {
    for (const p of placesData) {
      expect(p.nameKey).toBe(`places.${p.id}.name`);
      expect(p.storyKey).toBe(`places.${p.id}.story`);
      expect(p.hoursKey).toBe(`places.${p.id}.hours`);
      expect(['transport', 'modern', 'heritage', 'culture', 'nature']).toContain(p.category);
      expect(p.radius_m).toBeGreaterThanOrEqual(50);
      expect(p.photo).toBe(`/landmarks/${p.id}.jpg`);
      expect(p.iconGrey).toBe(`/landmarks/${p.id}-grey.png`);
      expect(p.iconColour).toBe(`/landmarks/${p.id}-colour.png`);
      expect(typeof p.nearestStation).toBe('string');
      expect(p.sources.length, `${p.id} needs a source`).toBeGreaterThan(0);
      expect(p.verified).not.toBe('');
      [p.nameKey, p.storyKey, p.hoursKey, `categories.${p.category}`].forEach(expectKey);
    }
  });

  it('keeps coordinates inside central Kuala Lumpur', () => {
    for (const { id, coords } of placesData) {
      const [lat, lng] = coords;
      expect(lat, id).toBeGreaterThan(3.12);
      expect(lat, id).toBeLessThan(3.17);
      expect(lng, id).toBeGreaterThan(101.68);
      expect(lng, id).toBeLessThan(101.72);
    }
  });

  it('has postcards only for the 3 agreed landmarks', () => {
    const withPostcard = placesData.filter((p) => p.hasPostcard).map((p) => p.id);
    expect(withPostcard.sort()).toEqual(['abdul-samad', 'petaling-street', 'petronas']);
  });

  it('has a unique visiting order that starts at KL Sentral', () => {
    const orders = getPlaces().map((p) => p.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getPlaces()[0].id).toBe('kl-sentral');
  });
});

describe('routes.json', () => {
  it('has the 12 planned route cards', () => {
    const ids = routesData.map((r) => r.id);
    const landmarksInOrder = getPlaces()
      .filter((p) => p.id !== 'kl-sentral')
      .map((p) => p.id);
    const hops = landmarksInOrder.slice(1).map((to, i) => `${landmarksInOrder[i]}__${to}`);
    const expected = ['klia__kl-sentral', ...LANDMARKS.map((id) => `kl-sentral__${id}`), ...hops];
    expect(hops).toHaveLength(5);
    expect(ids.sort()).toEqual(expected.sort());
  });

  it('builds each id from its start and end', () => {
    const placeIds = placesData.map((p) => p.id);
    for (const r of routesData) {
      expect(r.id).toBe(`${r.from}__${r.to}`);
      expect([...placeIds, 'klia']).toContain(r.from);
      expect(placeIds).toContain(r.to);
    }
  });

  it('has local tips only with real text and a name, in both languages', () => {
    for (const r of routesData) {
      expect(Array.isArray(r.localTips), r.id).toBe(true);
      r.localTips.forEach((tip, i) => {
        expect(tip.textKey, `${r.id} tip ${i + 1}`).toMatch(
          new RegExp(`^routes\\.${r.id}\\.tips\\.`),
        );
        expectKey(tip.textKey);
        expect(lookup(en, tip.textKey)).not.toBe('TBC');
        expect(
          typeof tip.by === 'string' && tip.by.trim().length > 0,
          `${r.id} tip ${i + 1} by`,
        ).toBe(true);
      });
    }
  });

  it('has valid steps that end in a check-in at the destination', () => {
    for (const r of routesData) {
      expect(['train', 'walk', 'car']).toContain(r.mode);
      expectKey(r.why);
      expect(r.why).toBe(`routes.${r.id}.why`);
      r.steps.forEach((step, i) => {
        expect(STEP_TYPES, `${r.id} step ${i + 1}`).toContain(step.type);
        expect(step.textKey).toBe(`routes.${r.id}.s${i + 1}`);
        expectKey(step.textKey);
        const isLast = i === r.steps.length - 1;
        expect('checkinPlace' in step, `${r.id} step ${i + 1}: only the last step checks in`).toBe(
          isLast,
        );
      });
      const last = r.steps.at(-1);
      expect(last.type).toBe('arrive');
      expect(last.checkinPlace).toBe(r.to);
    }
  });

  it('names a real line with the right colour on every train boarding step', () => {
    for (const r of routesData.filter((route) => route.mode === 'train')) {
      const boards = r.steps.filter((s) => s.type === 'board');
      expect(boards.length, r.id).toBeGreaterThan(0);
      for (const step of boards) {
        const line = getLine(step.line);
        expect(line, `${r.id}: unknown line ${step.line}`).not.toBeNull();
        expect(step.lineColour).toBe(line.colour);
        expect(step.towards).toBeTruthy();
        expectKey(line.nameKey);
      }
    }
  });

  it('uses walking routes only for walks of about 12 minutes or less', () => {
    for (const r of routesData.filter((route) => route.mode === 'walk')) {
      expect(r.totalMinutes, r.id).toBeLessThanOrEqual(12);
    }
  });

  it('has a Google Maps link and at least one source on every card', () => {
    for (const r of routesData) {
      expect(r.googleMapsUrl).toMatch(
        /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/,
      );
      expect(r.sources.length, `${r.id} needs a source`).toBeGreaterThan(0);
      r.sources.forEach((s) => expect(isTBC(s), r.id).toBe(false));
    }
  });
});

describe('arrival.json and learn.json', () => {
  it('has exactly one recommended arrival option, with a route card', () => {
    const recommended = arrivalData.filter((o) => o.recommended);
    expect(recommended).toHaveLength(1);
    expect(getRoute(recommended[0].routeId)).not.toBeNull();
    expect(getArrivalOptions()[0].recommended).toBe(true);
    for (const o of arrivalData) {
      [
        o.nameKey,
        o.priceNoteKey,
        o.minutesNoteKey,
        o.whyKey,
        o.tagKey,
        o.payKey,
        o.priceShortKey,
      ].forEach(expectKey);
      expect(['train', 'bus', 'car']).toContain(o.mode);
    }
  });

  it('has the 3 learn topics with text in both languages', () => {
    expect(learnData.map((t) => t.id)).toEqual(['touch-n-go', 'line-colours', 'reading-signs']);
    for (const t of learnData) {
      expectKey(t.titleKey);
      for (const b of t.blocks) {
        expect(['text', 'photo', 'lines']).toContain(b.type);
        if (b.type === 'text') expectKey(b.key);
        if (b.type === 'photo') expectKey(b.captionKey);
      }
    }
  });
});

describe('helpers', () => {
  it('returns copies, so screens cannot change the data', () => {
    const place = getPlace('petronas');
    place.radius_m = 1;
    expect(getPlace('petronas').radius_m).not.toBe(1);
  });

  it('returns null for unknown ids', () => {
    expect(getPlace('nowhere')).toBeNull();
    expect(getRoute('nowhere')).toBeNull();
    expect(findRoute('petronas', 'kl-sentral')).toBeNull();
  });

  it('finds a route card and turns TBC values into null', () => {
    const route = findRoute('kl-sentral', 'petronas');
    expect(route.id).toBe('kl-sentral__petronas');
    expect(route.totalMinutes).toBeNull();
    expect(route.steps.find((s) => s.type === 'exit').photo).toBeNull();
    expect(findRoute('merdeka-118', 'petaling-street').totalMinutes).toBe(10);
  });

  it('lists every card that ends at a place', () => {
    expect(
      getRoutesTo('petronas')
        .map((r) => r.from)
        .sort(),
    ).toEqual(['abdul-samad', 'kl-sentral']);
  });

  it('leaves TBC photos out of the learn topics', () => {
    const photos = getLearnTopics()
      .flatMap((t) => t.blocks)
      .filter((b) => b.type === 'photo');
    photos.forEach((p) => expect(isTBC(p.src)).toBe(false));
  });

  it('lists the postcard designs in visiting order', () => {
    expect(getPostcards()).toEqual([
      { placeId: 'petaling-street', preview: '/postcards/petaling-street-preview.jpg' },
      { placeId: 'abdul-samad', preview: '/postcards/abdul-samad-preview.jpg' },
      { placeId: 'petronas', preview: '/postcards/petronas-preview.jpg' },
    ]);
  });

  it('gives a postcard preview path only for postcard landmarks', () => {
    expect(getPostcardPreview('petronas')).toBe('/postcards/petronas-preview.jpg');
    expect(getPostcardPreview('kl-tower')).toBeNull();
  });

  it('has nationality codes that every phone can name in both languages', () => {
    const codes = getNationalities();
    expect(codes.length).toBeGreaterThan(200);
    expect(codes).toContain('MY');
    for (const lang of ['en', 'ms']) {
      const names = new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' });
      codes.forEach((code) => expect(names.of(code), `${lang} ${code}`).toBeTruthy());
    }
  });
});

// Not a failure: a reminder of what the field day still has to fill in.
it('reports the TBC values still left for the field day', () => {
  const count = (node) =>
    node && typeof node === 'object'
      ? Object.values(node).reduce((n, v) => n + count(v), 0)
      : Number(isTBC(node));
  const left = {
    places: count(placesData),
    routes: count(routesData),
    arrival: count(arrivalData),
    learn: count(learnData),
    en: count(en),
    ms: count(ms),
  };
  console.info('TBC values left:', left);
  expect(left).toBeTypeOf('object');
});
