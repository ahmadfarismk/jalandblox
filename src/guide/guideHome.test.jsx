// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Fake the three core doors this screen uses (docs/PLAN.md section 8), so the
// test is about the screen: the list, the order, and the stamps on it.
const state = vi.hoisted(() => ({
  progress: null,
  listeners: new Set(),
  permission: 'granted',
  position: { ok: true, lat: 3.1488, lng: 101.6943, accuracy_m: 18 },
}));

vi.mock('@/core/progress', () => ({
  getProgress: () => state.progress,
  onProgressChange: (fn) => {
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  },
}));

vi.mock('@/core/location', () => ({
  getPermissionState: async () => state.permission,
  getPosition: async () => state.position,
  distanceTo: (placeId, position) => {
    if (!position?.ok) return null;
    // Stand-in distances, so the test does not depend on the real maths.
    return { 'abdul-samad': 30, 'petaling-street': 600, petronas: 2200 }[placeId] ?? null;
  },
}));

// The location explainer is Faris's and shows nothing when location is on.
vi.mock('@/core/LocationExplainer', () => ({ default: () => null }));

const { default: GuideHomeScreen } = await import('./GuideHomeScreen');

const files = import.meta.glob('../data/locales/*.json', { eager: true, import: 'default' });
const resources = Object.fromEntries(
  Object.entries(files).map(([path, json]) => [
    path.match(/(\w+)\.json$/)[1],
    { translation: json },
  ]),
);
await i18n
  .use(initReactI18next)
  .init({ resources, lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false } });

function setProgress(stamps = {}) {
  state.progress = {
    version: 1,
    prefs: { lang: 'en', nationality: null, startedFrom: 'city' },
    opened: [],
    stamps,
    journeys: {},
    reviewed: [],
  };
}

/** Renders and lets the first GPS reading land. */
async function renderList() {
  const result = render(
    <MemoryRouter>
      <GuideHomeScreen />
    </MemoryRouter>,
  );
  await act(async () => {});
  return result;
}

const names = () => screen.getAllByRole('link').map((link) => link.textContent);

beforeEach(() => {
  state.listeners.clear();
  state.permission = 'granted';
  state.position = { ok: true, lat: 3.1488, lng: 101.6943, accuracy_m: 18 };
  setProgress();
});

afterEach(cleanup);

describe('S3 Guide home', () => {
  it('lists every check-in spot, nearest first, when location is on', async () => {
    await renderList();

    expect(screen.getByText('Nearest first')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(7);
    const [first, second] = names();
    expect(first).toContain('Abdul Samad');
    expect(first).toContain('30 m away');
    expect(second).toContain('Petaling St');
  });

  it('falls back to the suggested order when location is off', async () => {
    state.permission = 'denied';
    await renderList();

    expect(screen.getByText('In our suggested order')).toBeInTheDocument();
    expect(screen.getByText('Turn on location to sort by distance.')).toBeInTheDocument();
    // places.json order: KL Sentral is 1, Merdeka 118 is 2.
    expect(names()[0]).toContain('KL Sentral');
    expect(names()[1]).toContain('Merdeka 118');
  });

  it('puts a place we cannot measure yet last, without a distance', async () => {
    await renderList();
    const last = names().at(-1);
    expect(last).not.toMatch(/away/);
  });

  it('shows the stamp each place has', async () => {
    setProgress({
      petronas: { kind: 'gold', at: '2026-10-03T02:42:00Z' },
      'kl-tower': { kind: 'outline', at: '2026-10-02T09:00:00Z' },
    });
    await renderList();

    expect(screen.getByRole('img', { name: 'Gold stamp' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Outline stamp' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'No stamp' })).toHaveLength(5);
  });

  it('follows a new stamp with no reload', async () => {
    await renderList();
    expect(screen.queryByRole('img', { name: 'Gold stamp' })).not.toBeInTheDocument();

    // A check-in somewhere else in the app tells every screen at once.
    act(() => {
      setProgress({ petronas: { kind: 'gold', at: '2026-10-03T02:42:00Z' } });
      state.listeners.forEach((fn) => fn(state.progress));
    });

    expect(screen.getByRole('img', { name: 'Gold stamp' })).toBeInTheDocument();
  });
});
