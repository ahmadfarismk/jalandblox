// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import './i18n';

const checkIn = vi.hoisted(() => vi.fn());
vi.mock('./checkin', () => ({ checkIn }));
vi.mock('./location', () => ({
  getPermissionState: async () => 'granted',
  getPosition: vi.fn(),
}));

const { default: CheckinScreen } = await import('./CheckinScreen');

function open(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/checkin/:id" element={<CheckinScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Let promises and re-renders finish. */
const settle = () => act(() => new Promise((r) => setTimeout(r, 50)));

afterEach(() => {
  cleanup();
  checkIn.mockReset();
});

describe('CheckinScreen', () => {
  it('checks in once when opened, and again only when the visitor taps Try again', async () => {
    checkIn.mockResolvedValue({ result: 'too_far', distance_m: 2167, accuracy_m: 12 });
    open('/checkin/abdul-samad');

    expect(await screen.findByText('Not there yet')).toBeInTheDocument();
    await settle();
    await settle();
    expect(checkIn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    await settle();
    expect(checkIn).toHaveBeenCalledTimes(2);
  });

  it('shows the distance from the real answer', async () => {
    checkIn.mockResolvedValue({ result: 'too_far', distance_m: 2167, accuracy_m: 12 });
    open('/checkin/abdul-samad');
    expect(await screen.findByText(/about 2167 m away/)).toBeInTheDocument();
  });

  it('a debug state never checks in', async () => {
    open('/checkin/abdul-samad?debug=gold');
    expect(await screen.findByText('Gold stamp collected!')).toBeInTheDocument();
    await settle();
    expect(checkIn).not.toHaveBeenCalled();
  });
});
