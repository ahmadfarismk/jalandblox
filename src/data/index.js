// Data helpers (owner: Danial). Screens import from here, never from the JSON
// files directly. Every helper returns a copy, so a screen can't change the data
// by accident. Fields still marked "TBC" (field-day values) come back as null.

import placesData from './places.json';
import routesData from './routes.json';
import arrivalData from './arrival.json';
import learnData from './learn.json';
import linesData from './lines.json';
import nationalitiesData from './nationalities.json';

/**
 * @typedef {Object} Place
 * @property {string} id            Never changes after launch. Used in URLs, stamps, routes.
 * @property {string} nameKey
 * @property {string} storyKey
 * @property {string} hoursKey
 * @property {'transport'|'modern'|'heritage'|'culture'|'nature'} category
 * @property {[number, number]} coords   [latitude, longitude]
 * @property {number} radius_m      How close counts as "there" (tuned on field day).
 * @property {string} photo
 * @property {string} iconGrey
 * @property {string} iconColour
 * @property {string} nearestStation
 * @property {boolean} hasPostcard
 * @property {number} order         Suggested visiting order (used when location is off).
 * @property {string} verified
 * @property {string[]} sources
 */

/**
 * @typedef {Object} RouteStep
 * @property {'walk'|'board'|'ride'|'exit'|'arrive'} type
 * @property {string} textKey
 * @property {string|null} [photo]
 * @property {string} [line]         Line id from lines.json (board steps).
 * @property {string} [lineColour]
 * @property {string} [towards]      Last station of the line, as on the platform sign.
 * @property {string} [at]           Station where you board.
 * @property {number|null} [stops]   Stops to ride (ride steps).
 * @property {string} [alightAt]     Station where you get off (ride steps).
 * @property {string} [checkinPlace] Only on the last step. Opens the GPS check-in.
 */

/**
 * A tip from someone who lives in KL. Only real tips from real people: never
 * write one on someone's behalf. The text lives in the locale files under
 * `routes.<routeId>.tips.<n>`, in every language.
 * @typedef {Object} LocalTip
 * @property {string} textKey  Locale key, e.g. "routes.kl-sentral__petronas.tips.1".
 * @property {string} by       First name of the local who gave the tip.
 */

/**
 * @typedef {Object} Route
 * @property {string} id            Always `${from}__${to}`.
 * @property {string} from          Place id, or "klia".
 * @property {string} to            Place id.
 * @property {'train'|'walk'|'car'} mode
 * @property {string} why           Locale key.
 * @property {number|null} totalMinutes  Estimate. null until measured.
 * @property {RouteStep[]} steps
 * @property {LocalTip[]} localTips  Real tips from locals, shown as "What locals say". Empty until someone adds one.
 * @property {string} googleMapsUrl
 * @property {string} verified
 * @property {string[]} sources
 */

/**
 * @typedef {Object} ArrivalOption
 * @property {string} id
 * @property {boolean} recommended
 * @property {'train'|'bus'|'car'} mode   Picks the vehicle picture and the Google Maps travel mode.
 * @property {string} nameKey
 * @property {string} priceNoteKey
 * @property {string} minutesNoteKey
 * @property {string} whyKey
 * @property {string} tagKey          Short label, e.g. "Non-stop".
 * @property {string} payKey          How to pay for this option.
 * @property {string} priceShortKey   Price for the right-hand column, e.g. "RM55".
 * @property {string|null} routeId   Only the recommended option has a route card.
 */

/**
 * @typedef {{type: 'text', key: string} | {type: 'photo', src: string, captionKey: string} | {type: 'lines'}} LearnBlock
 * A "lines" block means: show the list from getLines() here (name, code, colour).
 */

/**
 * @typedef {Object} LearnTopic
 * @property {string} id
 * @property {string} titleKey
 * @property {LearnBlock[]} blocks
 */

/**
 * @typedef {Object} Line
 * @property {string} id
 * @property {string|null} code     Station code prefix, e.g. "KJ".
 * @property {string} kind          "LRT", "MRT", "Monorail" or "ERL".
 * @property {string} colour
 * @property {string} nameKey
 */

export const TBC = 'TBC';

/** True for a value that is still waiting for a real fact. */
export function isTBC(value) {
  return value === TBC || (typeof value === 'string' && value.startsWith(`${TBC}:`));
}

const copy = (value) => structuredClone(value);
const orNull = (value) => (value === undefined || isTBC(value) ? null : value);

function cleanStep(step) {
  const out = { ...step };
  if ('photo' in out) out.photo = orNull(out.photo);
  if ('stops' in out) out.stops = orNull(out.stops);
  return out;
}

function cleanRoute(route) {
  return {
    ...copy(route),
    totalMinutes: orNull(route.totalMinutes),
    steps: route.steps.map(cleanStep),
  };
}

/** All check-in spots in the suggested visiting order. @returns {Place[]} */
export function getPlaces() {
  return copy(placesData).sort((a, b) => a.order - b.order);
}

/** @returns {Place|null} */
export function getPlace(id) {
  const place = placesData.find((p) => p.id === id);
  return place ? copy(place) : null;
}

/** @returns {Route|null} */
export function getRoute(id) {
  const route = routesData.find((r) => r.id === id);
  return route ? cleanRoute(route) : null;
}

/** The route card from one place to another, or null if we haven't written one. @returns {Route|null} */
export function findRoute(fromId, toId) {
  return getRoute(`${fromId}__${toId}`);
}

/** Every route card that ends at this place, so the app can pick the nearest start. @returns {Route[]} */
export function getRoutesTo(toId) {
  return routesData.filter((r) => r.to === toId).map(cleanRoute);
}

/** KLIA to KL Sentral options, recommended first. @returns {ArrivalOption[]} */
export function getArrivalOptions() {
  return copy(arrivalData).sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

/** Learn topics. Photos still marked TBC are left out until the field-day photos exist. @returns {LearnTopic[]} */
export function getLearnTopics() {
  return learnData.map((topic) => ({
    ...copy(topic),
    blocks: topic.blocks
      .filter((b) => !(b.type === 'photo' && isTBC(b.src)))
      .map((b) => ({ ...b })),
  }));
}

/** @returns {LearnTopic|null} */
export function getLearnTopic(id) {
  return getLearnTopics().find((t) => t.id === id) ?? null;
}

/** @returns {Line[]} */
export function getLines() {
  return copy(linesData);
}

/** @returns {Line|null} */
export function getLine(id) {
  const line = linesData.find((l) => l.id === id);
  return line ? copy(line) : null;
}

/**
 * Where the small JPG preview of a place's postcard lives (task D11), or null if
 * the place has no postcard. The file may not exist yet, so screens need a fallback.
 */
export function getPostcardPreview(placeId) {
  const place = placesData.find((p) => p.id === placeId);
  return place?.hasPostcard ? `/postcards/${placeId}-preview.jpg` : null;
}

/**
 * Every postcard design that exists, in visiting order. Which ones a visitor may
 * choose depends on their gold stamps; the postcard picker screen decides that.
 * @returns {{placeId: string, preview: string}[]}
 */
export function getPostcards() {
  return getPlaces()
    .filter((p) => p.hasPostcard)
    .map((p) => ({ placeId: p.id, preview: `/postcards/${p.id}-preview.jpg` }));
}

/**
 * ISO 3166 country codes for the nationality picker. Show names with
 * `new Intl.DisplayNames([lang], { type: 'region' }).of(code)`, so no
 * translation files are needed for country names.
 * @returns {string[]}
 */
export function getNationalities() {
  return [...nationalitiesData];
}
