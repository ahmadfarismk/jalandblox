// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Fake core/settings, so these tests check the screen and not the saving.
const state = vi.hoisted(() => ({ prefs: null, saved: [] }));

vi.mock('@/core/settings', () => ({
  getPrefs: () => state.prefs,
  setPrefs: vi.fn((changes) => {
    state.saved.push(changes);
    state.prefs = { ...state.prefs, ...changes };
    return state.prefs;
  }),
  getLanguages: () => [
    { code: 'en', name: 'English' },
    { code: 'ms', name: 'Bahasa Melayu' },
  ],
}));

const { default: WelcomeScreen } = await import('./WelcomeScreen');
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

function ShowPath() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

function renderAt(path = '/welcome') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/" element={<GuideHomeScreen />} />
        <Route path="*" element={<ShowPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.prefs = { lang: 'en', nationality: null, startedFrom: null };
  state.saved = [];
});

afterEach(cleanup);

describe('S2 Welcome', () => {
  it('asks the three questions', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to KL');
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Bahasa Melayu' })).not.toBeChecked();
    expect(screen.getByLabelText('Where are you from?')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Just landed/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Already in KL/ })).toBeInTheDocument();
  });

  it('saves the language the moment it is picked, so the screen changes language', () => {
    renderAt();
    fireEvent.click(screen.getByRole('radio', { name: 'Bahasa Melayu' }));
    expect(state.saved).toContainEqual({ lang: 'ms' });
  });

  it('saves all three answers with one setPrefs when a start is chosen', () => {
    renderAt();
    fireEvent.change(screen.getByLabelText('Where are you from?'), { target: { value: 'JP' } });
    fireEvent.click(screen.getByRole('button', { name: /Just landed/ }));

    expect(state.saved.at(-1)).toEqual({
      lang: 'en',
      nationality: 'JP',
      startedFrom: 'arrival',
    });
  });

  it('lets the visitor skip the country', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: /Already in KL/ }));

    expect(state.saved.at(-1)).toEqual({ lang: 'en', startedFrom: 'city' });
    expect(state.prefs.nationality).toBeNull();
  });

  it('sends "Just landed" to the arrival journey and "Already in KL" to the guide', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: /Just landed/ }));
    expect(screen.getByTestId('path')).toHaveTextContent('/arrival');

    cleanup();
    state.prefs = { lang: 'en', nationality: null, startedFrom: null };
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: /Already in KL/ }));
    // '/' is the Guide home, which renders instead of showing the path.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('City Centre');
  });

  it('is shown on a fresh phone and skipped once a start is saved', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to KL');

    cleanup();
    state.prefs = { lang: 'en', nationality: 'JP', startedFrom: 'city' };
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('City Centre');
  });
});
