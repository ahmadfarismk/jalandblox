// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Fake core/progress so these tests only check Danial's screens.
const state = vi.hoisted(() => ({ progress: null, listeners: new Set() }));

vi.mock('@/core/progress', () => ({
  getProgress: () => state.progress,
  getStamp: (id) => state.progress.stamps[id] ?? null,
  markReviewed: vi.fn((id) => {
    state.progress = { ...state.progress, reviewed: [...state.progress.reviewed, id] };
    state.listeners.forEach((fn) => fn());
  }),
  onProgressChange: (fn) => {
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  },
}));

const { default: PassportScreen } = await import('./PassportScreen');

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

function setProgress({ stamps = {}, reviewed = [], nationality = 'JP' } = {}) {
  state.progress = {
    version: 1,
    prefs: { lang: 'en', nationality },
    opened: [],
    stamps,
    journeys: {},
    reviewed,
  };
}

function ShowPath() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/passport" element={<PassportScreen />} />
        <Route path="*" element={<ShowPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

const GOLD_PETRONAS = { petronas: { kind: 'gold', at: '2026-10-03T02:42:00Z', accuracy_m: 18 } };

beforeEach(async () => {
  vi.clearAllMocks();
  state.listeners.clear();
  setProgress();
  await i18n.changeLanguage('en');
});

afterEach(cleanup);

describe('D3 Passport', () => {
  it('shows none, outline and gold correctly from getProgress()', () => {
    setProgress({
      stamps: {
        ...GOLD_PETRONAS,
        'abdul-samad': { kind: 'outline', at: '2026-10-02T09:00:00Z', accuracy_m: null },
      },
    });
    renderAt('/passport');

    expect(screen.getByText('2 of 7 stamps')).toBeInTheDocument();
    expect(screen.getByText('1 gold')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    const petronas = screen.getByText('Petronas Twin Towers').closest('li');
    expect(within(petronas).getByText(/Gold/)).toBeInTheDocument();
    expect(within(petronas).getByText('Confirmed 3 Oct 2026')).toBeInTheDocument();
    expect(petronas.querySelector('image')).toHaveAttribute(
      'href',
      '/landmarks/petronas-colour.png',
    );
    expect(within(petronas).getByRole('link', { name: 'Write a review' })).toHaveAttribute(
      'href',
      '/review/petronas',
    );

    const samad = screen.getByText('Sultan Abdul Samad Building').closest('li');
    expect(within(samad).getByText('Outline stamp')).toBeInTheDocument();
    expect(within(samad).getByText('Opened 2 Oct 2026')).toBeInTheDocument();
    expect(samad.querySelector('image')).toHaveAttribute('href', '/landmarks/abdul-samad-grey.png');
    expect(within(samad).queryByText('Write a review')).not.toBeInTheDocument();

    expect(screen.getAllByText('Not visited yet')).toHaveLength(5);
    expect(screen.getByText(/Japan/)).toBeInTheDocument();
  });

  it('filters to gold stamps and to places still to visit', () => {
    setProgress({
      stamps: { ...GOLD_PETRONAS, 'abdul-samad': { kind: 'outline', at: '2026-10-02T09:00:00Z' } },
    });
    renderAt('/passport');
    const names = () =>
      screen.getAllByRole('listitem').map((li) => li.querySelector('a span + span').textContent);

    fireEvent.click(screen.getByRole('button', { name: 'Gold' }));
    expect(screen.getByRole('button', { name: 'Gold' })).toHaveAttribute('aria-pressed', 'true');
    expect(names()).toEqual(['Petronas Twin Towers']);

    fireEvent.click(screen.getByRole('button', { name: 'To visit' }));
    expect(names()).toHaveLength(6);
    expect(names()).toContain('Sultan Abdul Samad Building');
  });

  it('points to the first place without a gold stamp', () => {
    setProgress({ stamps: { 'kl-sentral': { kind: 'gold', at: '2026-10-03T01:00:00Z' } } });
    renderAt('/passport');
    fireEvent.click(screen.getByRole('link', { name: /Find your next stamp/ }));
    expect(screen.getByTestId('path')).toHaveTextContent('/place/merdeka-118');
  });

  it('shows "Review sent" instead of the button once reviewed', () => {
    setProgress({ stamps: GOLD_PETRONAS, reviewed: ['petronas'] });
    renderAt('/passport');
    const petronas = screen.getByText('Petronas Twin Towers').closest('li');
    expect(within(petronas).getByText('Review sent')).toBeInTheDocument();
    expect(within(petronas).queryByText('Write a review')).not.toBeInTheDocument();
  });

  it('shows the empty message and survives a broken save', () => {
    state.progress = { prefs: {} }; // no stamps or reviewed fields at all
    renderAt('/passport');
    expect(screen.getByText('0 of 7 stamps')).toBeInTheDocument();
    expect(screen.getByText(/Your passport is empty/)).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('updates live when progress changes', () => {
    renderAt('/passport');
    expect(screen.getByText('0 of 7 stamps')).toBeInTheDocument();
    act(() => {
      setProgress({ stamps: GOLD_PETRONAS });
      state.listeners.forEach((fn) => fn());
    });
    expect(screen.getByText('1 of 7 stamps')).toBeInTheDocument();
  });

  it('reads fully in Malay with no raw key names', async () => {
    await i18n.changeLanguage('ms');
    setProgress({ stamps: GOLD_PETRONAS });
    const { container } = renderAt('/passport');
    expect(screen.getByText('1 daripada 7 cop')).toBeInTheDocument();
    expect(screen.getByText('Disahkan 3 Okt 2026')).toBeInTheDocument();
    expect(screen.getByText('Menara Berkembar Petronas')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b(passport|places|stamps|review)\.[\w.-]+/);
  });
});
