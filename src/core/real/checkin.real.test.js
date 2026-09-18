import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addStamp, getStamp, resetProgress } from '../progress';
import { getPosition } from './location.real';
import { checkIn } from './checkin.real';

// Keep the real distance maths, but control what the "GPS" answers.
vi.mock('./location.real', async (importOriginal) => ({
  ...(await importOriginal()),
  getPosition: vi.fn(),
}));

// A made-up place whose coordinates are still TBC (every real place has them now).
vi.mock('@/data', async (importOriginal) => {
  const data = await importOriginal();
  const noCoords = { ...data.getPlace('petronas'), id: 'no-coords-yet', coords: null };
  return { ...data, getPlace: (id) => (id === noCoords.id ? noCoords : data.getPlace(id)) };
});

// abdul-samad is at [3.14861, 101.69444] with a 90 m radius in places.json.
const AT_ABDUL_SAMAD = { ok: true, lat: 3.14861, lng: 101.69444, accuracy_m: 18 };
// 0.002 degrees of latitude north is about 222 m away.
const FAR_FROM_ABDUL_SAMAD = { ok: true, lat: 3.15061, lng: 101.69444, accuracy_m: 18 };

const gpsAnswers = (position) => getPosition.mockResolvedValue(position);

beforeEach(() => {
  vi.useRealTimers();
  resetProgress();
  getPosition.mockReset();
});

describe('checkIn', () => {
  it('gives gold inside the radius and saves the stamp with its accuracy', async () => {
    gpsAnswers(AT_ABDUL_SAMAD);
    expect(await checkIn('abdul-samad')).toEqual({
      result: 'gold',
      distance_m: 0,
      accuracy_m: 18,
    });
    expect(getStamp('abdul-samad').kind).toBe('gold');
  });

  it('answers too_far outside the radius, with the distance, and saves nothing', async () => {
    gpsAnswers(FAR_FROM_ABDUL_SAMAD);
    expect(await checkIn('abdul-samad')).toEqual({
      result: 'too_far',
      distance_m: 222,
      accuracy_m: 18,
    });
    expect(getStamp('abdul-samad')).toBeNull();
  });

  it('answers poor_signal when accuracy is worse than 50 m', async () => {
    gpsAnswers({ ...AT_ABDUL_SAMAD, accuracy_m: 51 });
    expect(await checkIn('abdul-samad')).toEqual({ result: 'poor_signal', accuracy_m: 51 });
    expect(getStamp('abdul-samad')).toBeNull();
  });

  it('accepts accuracy of exactly 50 m', async () => {
    gpsAnswers({ ...AT_ABDUL_SAMAD, accuracy_m: 50 });
    expect((await checkIn('abdul-samad')).result).toBe('gold');
  });

  it('answers poor_signal when there is no fix or it takes too long', async () => {
    gpsAnswers({ ok: false, reason: 'unavailable' });
    expect(await checkIn('abdul-samad')).toEqual({ result: 'poor_signal' });
    gpsAnswers({ ok: false, reason: 'timeout' });
    expect(await checkIn('abdul-samad')).toEqual({ result: 'poor_signal' });
  });

  it('answers no_permission when location is denied', async () => {
    gpsAnswers({ ok: false, reason: 'no_permission' });
    expect(await checkIn('abdul-samad')).toEqual({ result: 'no_permission' });
  });

  it('answers error when the place has no coordinates yet, without asking for GPS', async () => {
    expect(await checkIn('no-coords-yet')).toEqual({ result: 'error' });
    expect(getPosition).not.toHaveBeenCalled();
  });

  it('answers error for an unknown place, or if reading GPS throws', async () => {
    expect(await checkIn('nowhere')).toEqual({ result: 'error' });
    getPosition.mockRejectedValue(new Error('boom'));
    expect(await checkIn('abdul-samad')).toEqual({ result: 'error' });
  });
});

describe('impossible jumps (anti-cheat)', () => {
  it('answers too_soon within 2 minutes of a gold at another landmark', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T02:00:00Z'));
    addStamp('petaling-street', 'gold', 10);

    vi.setSystemTime(new Date('2026-10-03T02:01:59Z'));
    gpsAnswers(AT_ABDUL_SAMAD);
    expect((await checkIn('abdul-samad')).result).toBe('too_soon');
    expect(getStamp('abdul-samad')).toBeNull();
  });

  it('allows gold again after 2 minutes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T02:00:00Z'));
    addStamp('petaling-street', 'gold', 10);

    vi.setSystemTime(new Date('2026-10-03T02:02:00Z'));
    gpsAnswers(AT_ABDUL_SAMAD);
    expect((await checkIn('abdul-samad')).result).toBe('gold');
  });

  it('ignores an outline stamp elsewhere, and a repeat check-in at the same place', async () => {
    addStamp('petaling-street', 'outline');
    gpsAnswers(AT_ABDUL_SAMAD);
    expect((await checkIn('abdul-samad')).result).toBe('gold');
    expect((await checkIn('abdul-samad')).result).toBe('gold');
  });
});
