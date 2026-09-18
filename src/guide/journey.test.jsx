// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Fake core/progress, so these tests check the screen and not the saving.
const state = vi.hoisted(() => ({ progress: null, listeners: new Set() }));

vi.mock('@/core/progress', () => ({
  getProgress: () => state.progress,
  setJourneyStep: vi.fn((routeId, stepIndex) => {
    state.progress = {
      ...state.progress,
      journeys: { ...state.progress.journeys, [routeId]: { stepIndex } },
    };
    state.listeners.forEach((fn) => fn(state.progress));
  }),
  onProgressChange: (fn) => {
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  },
}));

const { default: JourneyScreen } = await import('./JourneyScreen');

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

function ShowPath() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/journey/:routeId" element={<JourneyScreen />} />
        <Route path="*" element={<ShowPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setProgress({ journeys = {}, stamps = {} } = {}) {
  state.progress = {
    version: 1,
    prefs: { lang: 'en', nationality: null, startedFrom: 'arrival' },
    opened: [],
    stamps,
    journeys,
    reviewed: [],
  };
}

const imHere = () => screen.getByRole('button', { name: "I'm Here" });

beforeEach(() => {
  vi.clearAllMocks();
  state.listeners.clear();
  setProgress();
  // jsdom has no layout, so scrolling a step into view does nothing here.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

describe('S5 Journey', () => {
  it('shows the route card with its reason and the step you are on', () => {
    renderAt('/journey/klia__kl-sentral');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('KL Sentral');
    expect(screen.getByText('Why this way')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps'),
    );
  });

  it('saves each step, so closing the app returns to the same one', () => {
    renderAt('/journey/klia__kl-sentral');

    fireEvent.click(imHere());
    expect(state.progress.journeys['klia__kl-sentral']).toEqual({ stepIndex: 1 });
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();

    fireEvent.click(imHere());
    expect(state.progress.journeys['klia__kl-sentral']).toEqual({ stepIndex: 2 });
  });

  it('opens at the saved step and says so', () => {
    setProgress({ journeys: { 'klia__kl-sentral': { stepIndex: 3 } } });
    renderAt('/journey/klia__kl-sentral');

    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
    expect(screen.getByText('Pick up where you left off')).toBeInTheDocument();
  });

  it('opens the GPS check-in on the last step instead of ticking it off', () => {
    setProgress({ journeys: { 'klia__kl-sentral': { stepIndex: 4 } } });
    renderAt('/journey/klia__kl-sentral');

    fireEvent.click(imHere());
    expect(screen.getByTestId('path')).toHaveTextContent('/checkin/kl-sentral');
  });

  it('says "You made it!" once the check-in earned a gold stamp', () => {
    setProgress({
      journeys: { 'klia__kl-sentral': { stepIndex: 4 } },
      stamps: { 'kl-sentral': { kind: 'gold', at: '2026-10-03T02:42:00Z' } },
    });
    renderAt('/journey/klia__kl-sentral');

    expect(screen.getByText('You made it!')).toBeInTheDocument();
  });

  it('does not say that for an outline stamp from opening the story', () => {
    setProgress({
      journeys: { 'klia__kl-sentral': { stepIndex: 4 } },
      stamps: { 'kl-sentral': { kind: 'outline', at: '2026-10-03T02:42:00Z' } },
    });
    renderAt('/journey/klia__kl-sentral');

    expect(screen.queryByText('You made it!')).not.toBeInTheDocument();
  });

  it('shows a route card that does not exist as a missing page', () => {
    renderAt('/journey/not-a-route');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "We couldn't find that page.",
    );
  });
});
