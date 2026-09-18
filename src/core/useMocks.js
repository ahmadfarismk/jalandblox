/**
 * The one place that decides fake vs real.
 * Set VITE_USE_MOCKS=false in .env to use the real versions.
 * If the variable is missing, fakes are used (safe default while building).
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';
