/**
 * The three category groups for the Geoapify spike (task X1).
 *
 * This is the ONE place to edit the groups. Everything else imports from here.
 * The names are Geoapify's own category names, taken from their docs. Do not
 * invent new ones: check https://apidocs.geoapify.com/docs/places/ first.
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
