import { describe, expect, it } from 'vitest';
import { getPlace, getPlaces, getRoutesTo } from '@/data';
import { ARRIVAL_START, googleMapsUrl, pickRoute } from './routePicker';

const routes = [
  { id: 'kl-sentral__petronas', from: 'kl-sentral' },
  { id: 'abdul-samad__petronas', from: 'abdul-samad' },
  { id: 'klia__petronas', from: ARRIVAL_START },
];

describe('pickRoute', () => {
  it('has nothing to offer when no card was written', () => {
    expect(pickRoute([])).toBeNull();
    expect(pickRoute([{ id: 'klia__x', from: ARRIVAL_START }])).toBeNull();
  });

  it('picks the card starting nearest to the visitor', () => {
    expect(pickRoute(routes, { 'kl-sentral': 4000, 'abdul-samad': 900 }).from).toBe('abdul-samad');
    expect(pickRoute(routes, { 'kl-sentral': 200, 'abdul-samad': 900 }).from).toBe('kl-sentral');
  });

  it('ignores starting points with no distance yet', () => {
    expect(pickRoute(routes, { 'kl-sentral': null, 'abdul-samad': 900 }).from).toBe('abdul-samad');
  });

  it('falls back to KL Sentral without location', () => {
    expect(pickRoute(routes).from).toBe('kl-sentral');
  });

  it('falls back to the first card when even that is missing', () => {
    const noSentral = [{ id: 'abdul-samad__petronas', from: 'abdul-samad' }];
    expect(pickRoute(noSentral).from).toBe('abdul-samad');
  });

  it('never sends a visitor back to the airport', () => {
    const onlyAirport = [{ id: 'klia__kl-sentral', from: ARRIVAL_START }];
    expect(pickRoute(onlyAirport, { [ARRIVAL_START]: 10 })).toBeNull();
  });

  it('finds a real route card for every landmark Danial wrote one for', () => {
    for (const place of getPlaces()) {
      const found = pickRoute(getRoutesTo(place.id));
      if (place.id === 'kl-sentral') continue; // only reached from the airport
      expect(found, place.id).not.toBeNull();
      expect(found.to).toBe(place.id);
    }
  });
});

describe('googleMapsUrl', () => {
  it('builds a link from the place coordinates', () => {
    expect(googleMapsUrl(getPlace('petronas'))).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=3.1578,101.7117&travelmode=transit',
    );
  });

  it('gives nothing when the coordinates are still TBC', () => {
    expect(googleMapsUrl(null)).toBeNull();
    expect(googleMapsUrl({})).toBeNull();
    expect(googleMapsUrl({ coords: null })).toBeNull();
    expect(googleMapsUrl({ coords: [3.1] })).toBeNull();
    expect(googleMapsUrl({ coords: ['TBC', 'TBC'] })).toBeNull();
  });
});
