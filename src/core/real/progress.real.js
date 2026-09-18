// REAL progress — not built yet (task F4). Set VITE_USE_MOCKS=true in .env until then.
const notYet = (fn) => () => {
  throw new Error(`progress.${fn}() is not built yet (task F4). Use VITE_USE_MOCKS=true.`);
};

export const getProgress = notYet('getProgress');
export const markOpened = notYet('markOpened');
export const addStamp = notYet('addStamp');
export const getStamp = notYet('getStamp');
export const setJourneyStep = notYet('setJourneyStep');
export const markReviewed = notYet('markReviewed');
export const resetProgress = notYet('resetProgress');
export const onProgressChange = notYet('onProgressChange');
