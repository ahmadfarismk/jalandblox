import { describe, expect, it } from 'vitest';
import { getRoute } from '@/data';
import { currentStepIndex, imHereAction, isJourneyFinished, stepState } from './journeySteps';

describe('currentStepIndex', () => {
  it('starts at the first step', () => {
    expect(currentStepIndex(undefined, 5)).toBe(0);
    expect(currentStepIndex(null, 5)).toBe(0);
    expect(currentStepIndex(-2, 5)).toBe(0);
    expect(currentStepIndex(1.5, 5)).toBe(0);
  });

  it('returns to the saved step, so closing the app loses nothing', () => {
    expect(currentStepIndex(3, 5)).toBe(3);
  });

  it('never points past the end, even if a route card got shorter', () => {
    expect(currentStepIndex(9, 5)).toBe(5);
  });
});

describe('stepState', () => {
  it('marks steps done, now and later', () => {
    expect(stepState(0, 2)).toBe('done');
    expect(stepState(2, 2)).toBe('now');
    expect(stepState(3, 2)).toBe('later');
  });
});

describe('imHereAction', () => {
  it('moves to the next step on an ordinary step', () => {
    expect(imHereAction({ type: 'walk' }, 0)).toEqual({ kind: 'next', stepIndex: 1 });
  });

  it('opens the GPS check-in on the arriving step', () => {
    expect(imHereAction({ type: 'arrive', checkinPlace: 'petronas' }, 4)).toEqual({
      kind: 'checkin',
      to: '/checkin/petronas',
    });
  });

  it('sends the real KLIA route card to the KL Sentral check-in', () => {
    const steps = getRoute('klia__kl-sentral').steps;
    const last = steps.length - 1;
    expect(imHereAction(steps[last], last)).toEqual({
      kind: 'checkin',
      to: '/checkin/kl-sentral',
    });
    expect(imHereAction(steps[0], 0)).toEqual({ kind: 'next', stepIndex: 1 });
  });
});

describe('isJourneyFinished', () => {
  const steps = [{ type: 'walk' }, { type: 'arrive', checkinPlace: 'petronas' }];

  it('is not finished while there are steps left', () => {
    expect(isJourneyFinished(steps, 0, {})).toBe(false);
  });

  it('is not finished while standing on the check-in step with no gold stamp', () => {
    expect(isJourneyFinished(steps, 1, {})).toBe(false);
    expect(isJourneyFinished(steps, 1, { petronas: { kind: 'outline' } })).toBe(false);
  });

  it('is finished once the check-in earned a gold stamp', () => {
    expect(isJourneyFinished(steps, 1, { petronas: { kind: 'gold' } })).toBe(true);
  });

  it('is finished when every step is ticked off', () => {
    expect(isJourneyFinished(steps, 2, {})).toBe(true);
  });
});
