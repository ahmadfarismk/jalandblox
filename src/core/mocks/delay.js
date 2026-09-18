/** Wait `ms` milliseconds. Used by the fakes to feel like real network/GPS calls. */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
