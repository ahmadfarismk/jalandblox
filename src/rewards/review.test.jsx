// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Fake core/ so these tests only check Danial's screens.
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
vi.mock('@/core/settings', () => ({ getPrefs: () => state.progress.prefs }));
vi.mock('@/core/api', () => ({ submitReview: vi.fn() }));

const { submitReview } = await import('@/core/api');
const { markReviewed } = await import('@/core/progress');
const { default: ReviewScreen } = await import('./ReviewScreen');
const { default: PostcardPickScreen } = await import('./PostcardPickScreen');
const { default: PostcardSentScreen } = await import('./PostcardSentScreen');

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

function renderAt(path, { state: routerState } = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state: routerState }]}>
      <Routes>
        <Route path="/review/:id" element={<ReviewScreen />} />
        <Route path="/review/:id/postcard" element={<PostcardPickScreen />} />
        <Route path="/postcard/:id" element={<PostcardSentScreen />} />
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

describe('D8 Review, step 1: stars and text', () => {
  it('is locked until the place has a gold stamp', () => {
    setProgress({ stamps: { petronas: { kind: 'outline', at: '2026-10-02T09:00:00Z' } } });
    renderAt('/review/petronas');
    expect(screen.getByText('Get your gold stamp first')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Next: choose your postcard/ }),
    ).not.toBeInTheDocument();
  });

  it('shows a clear error for missing stars and too much text, and stays put', () => {
    setProgress({ stamps: GOLD_PETRONAS });
    renderAt('/review/petronas');
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your review (optional)'), {
      target: { value: 'x'.repeat(501) },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next: choose your postcard/ }));

    expect(screen.getByText('Choose 1 to 5 stars.')).toBeInTheDocument();
    expect(screen.getByText('Please keep your review under 500 characters.')).toBeInTheDocument();
    expect(screen.getByText('501/500')).toBeInTheDocument();
    expect(screen.getByLabelText('1 star')).toHaveFocus();
    expect(screen.queryByText('Pick one postcard')).not.toBeInTheDocument();
  });

  it('does not ask for the email on this step', () => {
    setProgress({ stamps: GOLD_PETRONAS });
    renderAt('/review/petronas');
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('restores the stars and text when coming back from step 2', () => {
    setProgress({ stamps: GOLD_PETRONAS });
    renderAt('/review/petronas', { state: { draft: { stars: 3, text: 'Nice lights' } } });
    expect(screen.getByLabelText('3 stars')).toBeChecked();
    expect(screen.getByLabelText('Your review (optional)')).toHaveValue('Nice lights');
  });
});

describe('D8 Review, step 2: choose one postcard', () => {
  const DRAFT = { draft: { stars: 4, text: 'Great views!' } };
  const TWO_GOLD = {
    ...GOLD_PETRONAS,
    'petaling-street': { kind: 'gold', at: '2026-10-02T11:00:00Z', accuracy_m: 25 },
    'abdul-samad': { kind: 'outline', at: '2026-10-02T12:00:00Z', accuracy_m: null },
  };
  const radio = (name) => screen.getByRole('radio', { name: new RegExp(name) });
  const fillAndAgree = () => {
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: ' visitor@example.com ' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
  };

  it('goes from step 1 to step 2 and sends the stars and text from step 1', async () => {
    setProgress({ stamps: GOLD_PETRONAS });
    submitReview.mockResolvedValue({ ok: true, postcardQueued: true });
    renderAt('/review/petronas');
    fireEvent.click(screen.getByLabelText('4 stars'));
    fireEvent.change(screen.getByLabelText('Your review (optional)'), {
      target: { value: '  Great views!  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next: choose your postcard/ }));

    expect(screen.getByText('Pick one postcard')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    fillAndAgree();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Send to my email' })),
    );

    expect(submitReview).toHaveBeenCalledWith({
      placeId: 'petronas',
      stars: 4,
      text: 'Great views!',
      email: 'visitor@example.com',
      nationality: 'JP',
      lang: 'en',
      consent: true,
      postcardPlaceId: 'petronas',
    });
    expect(markReviewed).toHaveBeenCalledWith('petronas');
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
  });

  it('sends you back to step 1 when opened without the stars', () => {
    setProgress({ stamps: GOLD_PETRONAS });
    renderAt('/review/petronas/postcard');
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.queryByText('Pick one postcard')).not.toBeInTheDocument();
  });

  it('only lets you pick places with a gold stamp, one at a time', () => {
    setProgress({ stamps: TWO_GOLD });
    renderAt('/review/petronas/postcard', { state: DRAFT });

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(radio('Petronas Twin Towers')).toBeChecked();
    expect(radio('Petronas Twin Towers')).toHaveAccessibleName(/Visited 3 Oct 2026/);
    expect(radio('Petaling Street')).toBeEnabled();
    expect(radio('Petaling Street')).not.toBeChecked();
    expect(radio('Sultan Abdul Samad Building')).toBeDisabled();
    expect(screen.getByText('Visit Sultan Abdul Samad Building to unlock')).toBeInTheDocument();

    fireEvent.click(radio('Petaling Street'));
    expect(radio('Petaling Street')).toBeChecked();
    expect(radio('Petronas Twin Towers')).not.toBeChecked();
    expect(screen.getByText('Postcard: Petaling Street')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Postcard of Petaling Street' })).toBeInTheDocument();
  });

  it('sends the chosen postcard and opens its page', async () => {
    setProgress({ stamps: TWO_GOLD });
    submitReview.mockResolvedValue({ ok: true, postcardQueued: true });
    renderAt('/review/petronas/postcard', { state: DRAFT });
    fireEvent.click(radio('Petaling Street'));
    fillAndAgree();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Send to my email' })),
    );

    expect(submitReview).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: 'petronas', postcardPlaceId: 'petaling-street' }),
    );
    expect(markReviewed).toHaveBeenCalledWith('petronas');
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Postcard of Petaling Street' })).toHaveAttribute(
      'src',
      '/postcards/petaling-street-preview.jpg',
    );
  });

  it('picks another visited place first when the reviewed place has no postcard', () => {
    setProgress({
      stamps: { ...GOLD_PETRONAS, 'kl-tower': { kind: 'gold', at: '2026-10-03T10:00:00Z' } },
    });
    renderAt('/review/kl-tower/postcard', { state: DRAFT });
    expect(radio('Petronas Twin Towers')).toBeChecked();
    expect(
      screen.getByText('No postcard yet for: KL Tower. More are coming soon.'),
    ).toBeInTheDocument();
  });

  it('still saves the review when no postcard place is unlocked yet', async () => {
    setProgress({ stamps: { 'kl-tower': { kind: 'gold', at: '2026-10-03T10:00:00Z' } } });
    submitReview.mockResolvedValue({ ok: true, postcardQueued: false });
    renderAt('/review/kl-tower/postcard', { state: DRAFT });

    expect(screen.getByText(/You haven't checked in at a postcard place yet/)).toBeInTheDocument();
    expect(screen.getAllByRole('radio').every((r) => r.disabled)).toBe(true);
    fillAndAgree();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send review' })));

    expect(submitReview).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: 'kl-tower', postcardPlaceId: null }),
    );
    expect(await screen.findByText('Thanks for your review!')).toBeInTheDocument();
  });

  it('keeps the send button off until the consent box is ticked, and says why', () => {
    setProgress({ stamps: GOLD_PETRONAS });
    renderAt('/review/petronas/postcard', { state: DRAFT });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'visitor@example.com' },
    });
    const send = screen.getByRole('button', { name: 'Send to my email' });

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(send).toBeDisabled();
    expect(send).toHaveAccessibleDescription('Tick the box to agree before sending.');
    fireEvent.click(send);
    expect(submitReview).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(send).toBeEnabled();
    expect(screen.queryByText('Tick the box to agree before sending.')).not.toBeInTheDocument();
  });

  it('links to the privacy notice in a new tab, so the review is not lost', () => {
    setProgress({ stamps: GOLD_PETRONAS });
    renderAt('/review/petronas/postcard', { state: DRAFT });
    const link = screen.getByRole('link', { name: 'Read the privacy notice' });
    expect(link).toHaveAttribute('href', '/privacy');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('checks the email before sending', () => {
    setProgress({ stamps: GOLD_PETRONAS });
    renderAt('/review/petronas/postcard', { state: DRAFT });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to my email' }));

    expect(
      screen.getByText('Enter a valid email address, like name@example.com.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveFocus();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('keeps what was typed and says we will try again when sending fails', async () => {
    setProgress({ stamps: TWO_GOLD });
    submitReview.mockRejectedValue(new Error('offline'));
    renderAt('/review/petronas/postcard', { state: DRAFT });
    fireEvent.click(radio('Petaling Street'));
    fillAndAgree();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Send to my email' })),
    );

    expect(screen.getByText(/We'll try again when you tap Send/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveValue('visitor@example.com');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(radio('Petaling Street')).toBeChecked();
    expect(markReviewed).not.toHaveBeenCalled();
  });

  it('points server rejections at the right field', async () => {
    setProgress({ stamps: GOLD_PETRONAS });
    submitReview.mockResolvedValueOnce({ ok: false, reason: 'invalid_email' });
    renderAt('/review/petronas/postcard', { state: DRAFT });
    fillAndAgree();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Send to my email' })),
    );
    expect(
      screen.getByText('Enter a valid email address, like name@example.com.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveFocus();

    submitReview.mockResolvedValueOnce({ ok: false, reason: 'invalid_postcard' });
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Send to my email' })),
    );
    expect(screen.getByText('Choose a postcard.')).toBeInTheDocument();
    expect(radio('Petronas Twin Towers')).toHaveFocus();
  });

  it('reads fully in Malay with no raw key names', async () => {
    await i18n.changeLanguage('ms');
    setProgress({ stamps: TWO_GOLD });
    const { container } = renderAt('/review/petronas/postcard', { state: DRAFT });
    expect(screen.getByText('Langkah 2 daripada 2')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b(postcardPick|review|places)\.[\w.-]+/);
  });
});

describe('D9 Postcard sent', () => {
  it('shows "check your email" and the preview for a postcard landmark', () => {
    setProgress({ stamps: GOLD_PETRONAS, reviewed: ['petronas'] });
    renderAt('/postcard/petronas', { state: { postcardQueued: true } });
    expect(screen.getByText('Check your email')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Postcard of Petronas Twin Towers' })).toHaveAttribute(
      'src',
      '/postcards/petronas-preview.jpg',
    );
  });

  it('falls back to a plain card when the preview file is missing', () => {
    renderAt('/postcard/petronas', { state: { postcardQueued: true } });
    fireEvent.error(screen.getByRole('img', { name: 'Postcard of Petronas Twin Towers' }));
    expect(screen.getByText('Postcard preview')).toBeInTheDocument();
  });

  it('shows "coming soon" for a landmark without a postcard', () => {
    setProgress({ stamps: { 'kl-tower': { kind: 'gold', at: '2026-10-03T10:00:00Z' } } });
    renderAt('/postcard/kl-tower', { state: { postcardQueued: true } });
    expect(screen.getByText('Thanks for your review!')).toBeInTheDocument();
    expect(
      screen.getByText('Your review is saved. Postcards for KL Tower are coming soon.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
  });

  it('shows "coming soon" when the backend queued no postcard', () => {
    renderAt('/postcard/petronas', { state: { postcardQueued: false } });
    expect(screen.getByText('Thanks for your review!')).toBeInTheDocument();
  });

  it('suggests the next place without a gold stamp', () => {
    setProgress({
      stamps: { 'kl-sentral': { kind: 'gold', at: '2026-10-03T01:00:00Z' }, ...GOLD_PETRONAS },
    });
    renderAt('/postcard/petronas', { state: { postcardQueued: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Next stop: Merdeka 118' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/place/merdeka-118');
  });
});
