// REAL settings — not built yet (task F5). Set VITE_USE_MOCKS=true in .env until then.
const notYet = (fn) => () => {
  throw new Error(`settings.${fn}() is not built yet (task F5). Use VITE_USE_MOCKS=true.`);
};

export const getPrefs = notYet('getPrefs');
export const setPrefs = notYet('setPrefs');
