/**
 * The colours of the 3D map (task S13).
 *
 * Plain numbers with no three.js in sight, so the legend can use exactly the
 * same colours as the map without dragging the 3D library into the rest of
 * the app. The scene reads them too, so the key can never drift from the map.
 */
export const COLOURS = {
  sky: 0xe9eef3,
  // The ground is a shade darker than the roads on purpose: white streets on
  // a white background are invisible, which is what the first version looked like.
  ground: 0xdfd9cd,
  green: 0xbcd7a8,
  water: 0x8fc2df,
  road: 0xfbf9f5,
  roadBig: 0xf3d38a, // main roads, the way paper maps pick them out
  buildingLow: 0xd3d7dd,
  buildingMid: 0xc2c9d3,
  buildingTall: 0xb0b9c6,
  // A landmark before its stamp: the same grey as the city, so gold means
  // something when it arrives.
  landmarkGrey: 0xb0b9c6,
};

/** A landmark you have not stamped yet, and one you have. */
export const MARKER_GREY = 0x9aa6b4;
export const MARKER_GOLD = 0xf0a726;

/** "You are here", matching the teal used across the app. */
export const YOU_ARE_HERE = 0x0d9488;
