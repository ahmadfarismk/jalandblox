/**
 * Data helpers. Screens use these and never import the JSON files directly.
 * Owner: Danial (task D1). All facts marked "TBC" must be filled from official
 * sources and the field day — see docs/PLAN.md section 7.
 */
import places from './places.json';
import routes from './routes.json';
import arrival from './arrival.json';
import learn from './learn.json';

/** All check-in spots, in suggested visiting order. */
export function getPlaces() {
  return [...places].sort((a, b) => a.order - b.order);
}

/** One place by id, or null. */
export function getPlace(id) {
  return places.find((p) => p.id === id) ?? null;
}

/** One route card by id, or null. */
export function getRoute(id) {
  return routes.find((r) => r.id === id) ?? null;
}

/** The route card from one place to another, or null if none was written. */
export function findRoute(fromId, toId) {
  return routes.find((r) => r.from === fromId && r.to === toId) ?? null;
}

/** KLIA to KL Sentral options. The recommended one comes first. */
export function getArrivalOptions() {
  return [...arrival].sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

/** Topics for the Learn pages. */
export function getLearnTopics() {
  return learn;
}
