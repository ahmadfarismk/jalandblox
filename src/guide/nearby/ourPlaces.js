/**
 * Our own 7 landmarks, in the same shape as a Geoapify result (task X1 spike).
 *
 * They are hand-written in src/data/places.json and stay that way. This file
 * only re-dresses them so the debug list can show them, and makes sure they
 * come FIRST whenever they match. They are marked `ours: true`.
 *
 * Nothing here gives a stamp, a route card or a check-in: this is a second
 * tier of places, not part of the Passport.
 */
import { metresBetween } from '@/core/geo';
import { getPlaces } from '@/data';

/**
 * Which of the three groups one of our landmark categories belongs to.
 * KL Sentral is `transport`, which is none of See, Eat or Stay, so it is left
 * out of the nearby lists rather than squeezed into a group it is not in.
 */
const GROUP_BY_CATEGORY = {
  heritage: 'see',
  culture: 'see',
  modern: 'see',
  nature: 'see',
  transport: null,
};

/**
 * Our 7 landmarks as result-shaped objects.
 * @param {(key: string) => string} nameOf turns a nameKey into readable text,
 *   normally `t` from useTranslation().
 */
export function ourPlacesAsResults(nameOf) {
  return getPlaces()
    .filter((place) => place.coords)
    .map((place) => ({
      id: `ours:${place.id}`,
      placeId: place.id,
      name: nameOf(place.nameKey),
      category: place.category,
      group: GROUP_BY_CATEGORY[place.category] ?? null,
      lat: place.coords[0],
      lng: place.coords[1],
      distance_m: null,
      address: null,
      allCategories: [place.category],
      ours: true,
    }));
}

/** Fills in how far each one is from a point. */
function measured(list, near) {
  if (!near) return list.map((p) => ({ ...p, distance_m: null }));
  return list.map((p) => ({
    ...p,
    distance_m: metresBetween([p.lat, p.lng], [near.lat, near.lng]),
  }));
}

/**
 * Ours whose name contains the typed text, nearest first.
 * @param {Array<object>} ours from ourPlacesAsResults()
 * @param {string} text
 * @param {{lat: number, lng: number}|null} [near]
 */
export function matchOursByName(ours, text, near = null) {
  const typed = String(text ?? '')
    .trim()
    .toLowerCase();
  if (!typed) return [];
  const hits = ours.filter((p) => p.name.toLowerCase().includes(typed));
  return measured(hits, near).sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
}

/**
 * Ours that are inside the circle and belong to this group, nearest first.
 * @param {Array<object>} ours
 * @param {{lat: number, lng: number, radius: number, group: string}} options
 */
export function oursNear(ours, { lat, lng, radius, group }) {
  const near = { lat, lng };
  return measured(
    ours.filter((p) => p.group === group),
    near,
  )
    .filter((p) => p.distance_m <= radius)
    .sort((a, b) => a.distance_m - b.distance_m);
}

/**
 * How close a result has to be to one of our landmarks before we treat it as
 * the same thing. Our 7 are buildings and streets, not points, so their
 * mapped position and a provider's can sit a fair way apart: Geoapify
 * returned three separate objects for Bangunan Sultan Abdul Samad at 2 m,
 * 112 m and 121 m.
 */
export const SAME_PLACE_M = 150;

/**
 * Words in a result's categories that mean "this is the same KIND of thing as
 * our landmark". Without this check, a cafe 30 m from Petronas would be
 * dropped as a duplicate of the towers.
 *
 * Deliberately no "building": Geoapify tags plenty of cafes with it, so it
 * would swallow exactly the results we want to keep.
 */
const SIGHT_WORDS =
  /tourism|heritage|historic|architect|museum|monument|memorial|attraction|sights|religion|place_of_worship|park|garden|skyscraper|tower/i;
const TRANSPORT_WORDS = /station|railway|public_transport|transport|\bbus\b|\btrain\b/i;

/** Every category word a result carries, as one lower-case string. */
function categoryText(result) {
  return [result.category, ...(result.allCategories ?? [])].filter(Boolean).join(' ');
}

/** True when a result is the same kind of thing as one of our landmarks. */
function sameKind(place, result) {
  const text = categoryText(result);
  if (place.group === 'see') return result.group === 'see' || SIGHT_WORDS.test(text);
  // KL Sentral is `transport`, which is none of See, Eat or Stay.
  if (place.category === 'transport') return TRANSPORT_WORDS.test(text);
  return result.group === place.group;
}

/**
 * True when a result is almost certainly one of our 7 under another name.
 * Matching on the name text alone is not enough: Geoapify returned our
 * landmarks as "Menara Berkembar Petronas" and "Bangunan Sultan Abdul Samad",
 * and neither matches the English name we hold.
 * @param {Array<object>} ours
 * @param {object} result
 */
export function isOneOfOurs(ours, result) {
  if (!Number.isFinite(result?.lat) || !Number.isFinite(result?.lng)) return false;
  return ours.some(
    (place) =>
      metresBetween([place.lat, place.lng], [result.lat, result.lng]) <= SAME_PLACE_M &&
      sameKind(place, result),
  );
}

/**
 * Ours first, then everything else, with the same landmark never listed twice.
 * A result is dropped when it has exactly our name, OR when it sits within
 * SAME_PLACE_M of one of ours and is the same kind of thing.
 *
 * `ours` is the shortened list actually on screen, so the distance check uses
 * `allOurs` (all 7) when it is given: a landmark can be filtered out of the
 * list by group or radius and still be the thing a result duplicates.
 *
 * @param {Array<object>} ours the ones being shown, which rank first
 * @param {Array<object>} others results from a provider
 * @param {Array<object>} [allOurs] all 7, for the distance check
 */
export function mergeOursFirst(ours, others, allOurs = ours) {
  const names = new Set(ours.map((p) => p.name.toLowerCase()));
  const rest = others.filter(
    (p) => !names.has(String(p.name ?? '').toLowerCase()) && !isOneOfOurs(allOurs, p),
  );
  return [...ours, ...rest];
}
