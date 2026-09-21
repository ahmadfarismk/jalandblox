// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// The Map tab has two maps behind it (task S12). jsdom has no WebGL, so this
// is the fallback case: the flat map must still show all seven landmarks.
// The 3D scene itself is checked on a real phone, not here.
const state = vi.hoisted(() => ({
  progress: null,
  listeners: new Set(),
  permission: 'granted',
  prefs: { lang: 'en', simpleMap: false },
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
  watchPosition: () => () => {},
}));

vi.mock('@/core/settings', () => ({ getPrefs: () => state.prefs }));

const { default: MapScreen } = await import('./MapScreen');

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
    prefs: { lang: 'en', nationality: null, startedFrom: 'city', simpleMap: false },
    opened: [],
    stamps,
    journeys: {},
    reviewed: [],
  };
}

async function renderMap() {
  const result = render(
    <MemoryRouter>
      <MapScreen />
    </MemoryRouter>,
  );
  await act(async () => {});
  return result;
}

const landmarkNames = () =>
  screen
    .getAllByRole('button')
    .map((button) => button.textContent.trim())
    .filter(Boolean);

beforeEach(() => {
  // jsdom has no ResizeObserver; the flat map measures its box with one.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  state.listeners.clear();
  state.permission = 'granted';
  state.prefs = { lang: 'en', simpleMap: false };
  setProgress();
});

afterEach(cleanup);

describe('Map tab without 3D', () => {
  it('falls back to the flat map and still shows all seven landmarks', async () => {
    await renderMap();
    expect(document.querySelector('canvas')).toBeNull();
    expect(landmarkNames()).toHaveLength(7);
    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument();
  });

  it('shows the legend, and no map credit when no map data is drawn', async () => {
    await renderMap();
    expect(screen.getByText('Not collected yet')).toBeInTheDocument();
    expect(screen.getByText('Gold stamp collected')).toBeInTheDocument();
    expect(screen.queryByText(/OpenStreetMap/)).toBeNull();
  });

  it('says so when location is off', async () => {
    state.permission = 'denied';
    await renderMap();
    expect(await screen.findByRole('status')).toHaveTextContent(/Location is off/);
  });

  it('colours a landmark in when its gold stamp arrives, with no reload', async () => {
    await renderMap();
    const petronas = screen.getAllByRole('button').find((b) => b.textContent.includes('Petronas'));
    expect(petronas.querySelector('img')).toHaveAttribute('src', '/landmarks/petronas-grey.png');

    setProgress({ petronas: { kind: 'gold', at: '2026-09-21T02:00:00Z' } });
    await act(async () => {
      state.listeners.forEach((fn) => fn(state.progress));
    });

    const updated = screen.getAllByRole('button').find((b) => b.textContent.includes('Petronas'));
    expect(updated.querySelector('img')).toHaveAttribute('src', '/landmarks/petronas-colour.png');
  });
});
