// REAL checkin — not built yet (task F7). Set VITE_USE_MOCKS=true in .env until then.
const notYet = (fn) => () => {
  throw new Error(`checkin.${fn}() is not built yet (task F7). Use VITE_USE_MOCKS=true.`);
};

export const checkIn = notYet('checkIn');
