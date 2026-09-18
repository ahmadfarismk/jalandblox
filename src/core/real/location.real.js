// REAL location — not built yet (task F6). Set VITE_USE_MOCKS=true in .env until then.
const notYet = (fn) => () => {
  throw new Error(`location.${fn}() is not built yet (task F6). Use VITE_USE_MOCKS=true.`);
};

export const getPosition = notYet('getPosition');
export const distanceTo = notYet('distanceTo');
