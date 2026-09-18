import { describe, expect, it } from 'vitest';
import { getRoute } from '@/data';
import { boardedAt, routeLegs, textOn } from './routeLegs';

describe('routeLegs', () => {
  it('turns a train card into walk, line, walk', () => {
    expect(routeLegs(getRoute('kl-sentral__petronas').steps)).toEqual([
      { type: 'walk' },
      { type: 'line', line: 'kelana-jaya', stops: 5, from: 'KJ15 KL Sentral', to: 'KJ10 KLCC' },
      { type: 'walk' },
    ]);
  });

  it('keeps a walking card to one walk leg', () => {
    expect(routeLegs(getRoute('petronas__klcc-park').steps)).toEqual([{ type: 'walk' }]);
  });

  it('shows a board step without a line as a car ride', () => {
    expect(routeLegs(getRoute('klcc-park__kl-tower').steps).map((leg) => leg.type)).toEqual([
      'walk',
      'car',
      'walk',
    ]);
  });

  it('leaves the stop count empty when it is not known yet', () => {
    const legs = routeLegs([
      { type: 'board', line: 'klia-ekspres' },
      { type: 'ride', stops: null },
    ]);
    expect(legs[0].stops).toBeNull();
  });
});

describe('boardedAt', () => {
  it('finds the station of the board step before a ride', () => {
    const steps = getRoute('kl-sentral__petronas').steps;
    const ride = steps.findIndex((s) => s.type === 'ride');
    expect(boardedAt(steps, ride)).toBe('KJ15 KL Sentral');
  });
});

describe('textOn', () => {
  it('puts white text on dark lines and dark text on the light green monorail', () => {
    expect(textOn('#E0115F')).toBe('#ffffff');
    expect(textOn('#11753A')).toBe('#ffffff');
    expect(textOn('#7DBA00')).toBe('#0f172a');
  });
});
