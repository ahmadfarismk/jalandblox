/**
 * The category groups for the nearby-places spike (tasks X1 and X2).
 *
 * This is the ONE place to edit them. Everything else imports from here.
 * Each provider names its categories differently, so both lists live here
 * side by side. Do not invent names: check the provider's own docs first.
 *   Geoapify     https://apidocs.geoapify.com/docs/places/
 *   OpenTripMap  https://dev.opentripmap.org/en/catalog.tree.json
 *
 * We always ask for ONE group at a time. Kuala Lumpur has far more food than
 * sights, so asking for all three together would drown the list in restaurants.
 */

/** @typedef {'see' | 'eat' | 'stay'} Group */

export const GROUPS = {
  see: {
    label: 'See',
    categories: [
      'tourism.sights',
      'tourism.attraction',
      'entertainment.museum',
      'heritage',
      'leisure.park',
    ],
  },
  eat: {
    label: 'Eat',
    categories: [
      'catering.restaurant',
      'catering.cafe',
      'catering.fast_food',
      'catering.food_court',
    ],
  },
  stay: {
    label: 'Stay',
    categories: ['accommodation.hotel', 'accommodation.hostel', 'accommodation.guest_house'],
  },
};

/** The group names in the order the buttons show them. @type {Group[]} */
export const GROUP_IDS = /** @type {Group[]} */ (Object.keys(GROUPS));

/** True for 'see', 'eat' or 'stay'. */
export function isGroup(group) {
  return Object.prototype.hasOwnProperty.call(GROUPS, group);
}

/** The comma-separated list for the `categories=` parameter. */
export function categoriesFor(group) {
  if (!isGroup(group)) throw new Error(`Unknown group "${group}". Use one of: ${GROUP_IDS}`);
  return GROUPS[group].categories.join(',');
}

/**
 * True when a Geoapify category belongs to a group name. Geoapify returns
 * deeper names than we ask for ("catering.restaurant.italian"), so a name
 * counts as a match when it is the group name or sits under it.
 */
function under(category, name) {
  return category === name || category.startsWith(`${name}.`);
}

/**
 * Which of our three groups a Geoapify category belongs to, or null if none.
 * @param {string} category
 * @returns {Group | null}
 */
export function groupForCategory(category) {
  if (typeof category !== 'string') return null;
  for (const id of GROUP_IDS) {
    if (GROUPS[id].categories.some((name) => under(category, name))) return id;
  }
  return null;
}

/**
 * The most useful category to show for a result: the first one that belongs to
 * the group we asked for, otherwise the first one Geoapify gave us.
 * @param {string[]} categories
 * @param {Group | null} group
 * @returns {string | null}
 */
export function pickCategory(categories, group) {
  const list = Array.isArray(categories) ? categories.filter((c) => typeof c === 'string') : [];
  if (group && isGroup(group)) {
    const wanted = GROUPS[group].categories;
    const hit = list.find((c) => wanted.some((name) => under(c, name)));
    if (hit) return hit;
  }
  return list[0] ?? null;
}

// --- OpenTripMap (task X2) -------------------------------------------------
//
// OpenTripMap has its own tree of 263 categories, nothing like Geoapify's.
// Asking for a parent also asks for everything under it, and several may be
// listed with OR logic.

/**
 * The kinds we ask for in the See group, and why each one is here.
 *
 *   museums            Muzium Tekstil, Islamic Arts, KL City Gallery
 *   historic           historical places, monuments, memorials, fortifications
 *   architecture       historic architecture, skyscrapers, towers, bridges
 *   religion           Masjid Jamek, Sri Mahamariamman: top-tier KL sights
 *   gardens_and_parks  Perdana Botanical Garden, KLCC Park
 *   natural            nature reserves and water, e.g. Taman Eko Rimba
 *
 * Two kinds are LEFT OUT on purpose, and it matters when reading the results:
 *   cultural > urban_environment > squares  is named "squares and streets" in
 *     OpenTripMap's own catalogue, so asking for it brings back roads — the
 *     exact problem Geoapify had in task X1.
 *   other > view_points  is where numbered photo markers live, like the five
 *     "Petronas Towers Viewpoint #n" entries Geoapify returned.
 * Also left out: wall_painting, sculptures and installation (mostly unnamed
 * street art), unclassified_objects, and everything outside interesting_places
 * (amusements, sport, adult, tourist_facilities, accomodations).
 */
export const OTM_SEE_KINDS = [
  'museums',
  'historic',
  'architecture',
  'religion',
  'gardens_and_parks',
  'natural',
];

/**
 * Everything under "Interesting places", which is OpenTripMap's own default.
 * Only used by the debug page's wide probe, to show what the curated list
 * above is filtering out. Not what we would ship.
 */
export const OTM_WIDE_KINDS = ['interesting_places'];

/**
 * How significant a place has to be. OpenTripMap's `rate` is an enum of
 * strings, not a number: 1 is least significant, 3 is most, and the "h"
 * suffix means the place is on a cultural heritage list.
 *
 * This is a significance score for the place, NOT a review rating from
 * visitors. OpenTripMap has no visitor ratings and we must never show it
 * as one.
 */
export const OTM_RATES = [
  { value: '', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3' },
  { value: '1h', label: 'Heritage' },
];

/** The kinds list for a group, as the `kinds=` parameter wants it. */
export function kindsFor(group, { wide = false } = {}) {
  if (group !== 'see') {
    throw new Error(
      `OpenTripMap is only wired up for the See group in this spike, not "${group}".`,
    );
  }
  return (wide ? OTM_WIDE_KINDS : OTM_SEE_KINDS).join(',');
}

/**
 * The broad branch names. They appear on almost every result, so they are no
 * use as a label: "historic_architecture" tells you more than "architecture".
 */
const OTM_BROAD = new Set([
  'interesting_places',
  'amusements',
  'sport',
  'adult',
  'tourist_facilities',
  'accomodations',
  'natural',
  'cultural',
  'historic',
  'religion',
  'architecture',
  'industrial_facilities',
  'other',
]);

/** Splits OpenTripMap's comma-separated `kinds` string into a clean list. */
export function splitKinds(kinds) {
  return String(kinds ?? '')
    .split(',')
    .map((kind) => kind.trim())
    .filter(Boolean);
}

/**
 * The most telling kind to show for a result: the first one that is not a
 * broad branch name, falling back to whatever came first.
 * @param {string} kinds OpenTripMap's comma-separated string
 * @returns {string | null}
 */
export function pickKind(kinds) {
  const list = splitKinds(kinds);
  return list.find((kind) => !OTM_BROAD.has(kind)) ?? list[0] ?? null;
}

/**
 * Which of our three groups an OpenTripMap result belongs to, or null.
 * A search can return anything, so this works out the group from the kinds.
 * @param {string} kinds
 * @returns {Group | null}
 */
export function groupForKinds(kinds) {
  const list = splitKinds(kinds);
  if (list.includes('foods')) return 'eat';
  if (list.includes('accomodations')) return 'stay';
  if (list.some((kind) => kind === 'interesting_places' || OTM_SEE_KINDS.includes(kind))) {
    return 'see';
  }
  return null;
}
