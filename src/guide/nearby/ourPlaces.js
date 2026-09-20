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
 * Ours first, then everything else. A Geoapify result with exactly the same
 * name as one of ours is dropped, so the same landmark is not listed twice.
 * @param {Array<object>} ours
 * @param {Array<object>} others
 */
export function mergeOursFirst(ours, others) {
  const names = new Set(ours.map((p) => p.name.toLowerCase()));
  const rest = others.filter((p) => !names.has(String(p.name ?? '').toLowerCase()));
  return [...ours, ...rest];
}
