// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import './core/i18n';
import App from './App';
import { setPrefs } from './core/settings';

/** Shows the current address so the tests can check where the app went. */
function WhereAmI() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function openApp(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <WhereAmI />
    </MemoryRouter>,
  );
  return screen.getByTestId('path').textContent;
}

const onLanding = () => screen.queryByRole('heading', { name: /KLIA to KL/ }) !== null;

beforeEach(() => {
  setPrefs({ lang: 'en', startedFrom: null }); // a first-time visitor
});

afterEach(cleanup);

describe('the front door', () => {
  it('a new visitor at / sees the landing page', () => {
    expect(openApp('/')).toBe('/');
    expect(onLanding()).toBe(true);
  });

  it('Start on the landing page leads a new visitor to /welcome', () => {
    openApp('/');
    fireEvent.click(screen.getAllByRole('link', { name: /Start/ })[0]);
    expect(screen.getByTestId('path').textContent).toBe('/welcome');
  });

  it.each(['/map', '/passport'])('%s sends a new visitor to the landing page first', (path) => {
    expect(openApp(path)).toBe('/');
    expect(onLanding()).toBe(true);
  });

  it('a returning visitor goes straight to the Guide, and the tabs open directly', () => {
    setPrefs({ startedFrom: 'city' });
    expect(openApp('/')).toBe('/');
    expect(onLanding()).toBe(false);
    cleanup();
    expect(openApp('/passport')).toBe('/passport');
  });

  it('/about always shows the landing page, and Start goes to the Guide for a returning visitor', () => {
    setPrefs({ startedFrom: 'city' });
    expect(openApp('/about')).toBe('/about');
    expect(onLanding()).toBe(true);
    fireEvent.click(screen.getAllByRole('link', { name: /Start/ })[0]);
    expect(screen.getByTestId('path').textContent).toBe('/');
  });

  it.each(['/privacy', '/settings', '/place/petronas', '/checkin/petronas'])(
    'a shared link like %s opens directly',
    (path) => {
      expect(openApp(path)).toBe(path);
    },
  );

  it('the Welcome screen itself never redirects', () => {
    expect(openApp('/welcome')).toBe('/welcome');
  });
});
