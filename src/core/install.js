/**
 * Install-to-home-screen helpers (task F11).
 *
 * Android Chrome fires 'beforeinstallprompt' once, early. We catch it here
 * (this file loads when the app starts) so a button can show the real
 * install popup later. iPhones never fire it: there, visitors use
 * Share → Add to Home Screen, so the hint shows those steps instead.
 */

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((cb) => cb());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own button at a good moment instead
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** True when the app is already opened from the home screen. */
export function isInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** True on iPhone and iPad (including iPads that say they are a Mac). */
export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  );
}

/** True when the browser can show its own install popup (Android Chrome and similar). */
export function canPromptInstall() {
  return deferredPrompt !== null;
}

/** Shows the browser's install popup. Returns true if the visitor accepted. */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === 'accepted';
}

/** Calls `callback` when install becomes possible or happens. Returns a stop function. */
export function onInstallChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
