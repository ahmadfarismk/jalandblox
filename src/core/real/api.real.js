// REAL api — not built yet (task F10). Set VITE_USE_MOCKS=true in .env until then.
const notYet = (fn) => () => {
  throw new Error(`api.${fn}() is not built yet (task F10). Use VITE_USE_MOCKS=true.`);
};

export const submitReview = notYet('submitReview');
