// REAL api — not built yet (task F10). Keep "api" in VITE_USE_MOCKS until then.
const notYet = (fn) => () => {
  throw new Error(`api.${fn}() is not built yet (task F10). Keep "api" in VITE_USE_MOCKS.`);
};

export const submitReview = notYet('submitReview');
