import { describe, expect, it } from 'vitest';
import { getPlaces } from '@/data';
import { formatDistance, shortNameKey, sortPlaces, stampKind } from './placeList';

/** Stands in for react-i18next's t() in these tests. */
const t = (key, options) => `${key}:${JSON.stringify(options ?? {})}`;

describe('sortPlaces', () => {
  const places = [
    { id: 'a', order: 3 },
    { id: 'b', order: 1 },
    { id: 'c', order: 2 },
  ];

  it('follows the suggested order when there is no location', () => {
    expect(sortPlaces(places).map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('puts the nearest place first when there is', () => {
    const distances = { a: 120, b: 4000, c: 900 };
    expect(sortPlaces(places, distances).map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });

  it('puts places with no coordinates yet last, in the suggested order', () => {
    const distances = { a: null, b: null, c: 50 };
    expect(sortPlaces(places, distances).map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('leaves the list it was given alone', () => {
    const original = [...places];
    sortPlaces(places, { a: 1 });
    expect(places).toEqual(original);
  });

  it('works on the real place list', () => {
    const sorted = sortPlaces(getPlaces());
    expect(sorted).toHaveLength(getPlaces().length);
    expect(sorted[0].order).toBe(1);
  });
});

describe('formatDistance', () => {
  it('shows nothing when there is no distance', () => {
    expect(formatDistance(t, null)).toBeNull();
    expect(formatDistance(t, undefined)).toBeNull();
    expect(formatDistance(t, -5)).toBeNull();
  });

  it('rounds metres to the nearest 10, because GPS is never exact', () => {
    expect(formatDistance(t, 812)).toBe(t('ui.metresAway', { count: 810 }));
    expect(formatDistance(t, 4)).toBe(t('ui.metresAway', { count: 0 }));
  });

  it('switches to kilometres from 1 km', () => {
    expect(formatDistance(t, 999)).toBe(t('ui.metresAway', { count: 1000 }));
    expect(formatDistance(t, 1000)).toBe(t('ui.kmAway', { km: '1.0' }));
    expect(formatDistance(t, 48300)).toBe(t('ui.kmAway', { km: '48.3' }));
  });
});

describe('stampKind', () => {
  it('turns a stamp into a badge state', () => {
    expect(stampKind(null)).toBe('none');
    expect(stampKind(undefined)).toBe('none');
    expect(stampKind({ kind: 'outline' })).toBe('outline');
    expect(stampKind({ kind: 'gold' })).toBe('gold');
    expect(stampKind({ kind: 'nonsense' })).toBe('none');
  });
});

describe('shortNameKey', () => {
  it('points at the short name every place has', async () => {
    const en = (await import('@/data/locales/en.json')).default;
    for (const place of getPlaces()) {
      const key = shortNameKey(place);
      const short = key.split('.').reduce((o, k) => o?.[k], en);
      expect(short, key).toBeTruthy();
    }
  });
});
