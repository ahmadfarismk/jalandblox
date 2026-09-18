// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

beforeEach(() => {
  setPrefs({ lang: 'en', startedFrom: null }); // a first-time visitor
});

afterEach(cleanup);

describe('first open goes to Welcome', () => {
  it.each(['/', '/map', '/passport'])('%s sends a new visitor to /welcome', (path) => {
    expect(openApp(path)).toBe('/welcome');
  });

  it('does not redirect again once the Welcome questions are answered', () => {
    setPrefs({ startedFrom: 'city' });
    expect(openApp('/')).toBe('/');
    cleanup();
    expect(openApp('/passport')).toBe('/passport');
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
