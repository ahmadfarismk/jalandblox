/**
 * The landmarks on the 3D map (task S13).
 *
 * KL is recognised by three towers, so those three are built here as simple
 * shapes with their real heights: the Twin Towers, Merdeka 118 and KL Tower.
 * They are not models: they are a few cylinders each, enough that anyone who
 * knows the skyline knows what they are looking at. KrackedDev's real models
 * (task K1) replace them when they land.
 *
 * Every other check-in spot gets a plain marker, because guessing at the shape
 * of a building we have not modelled would be worse than an obvious marker.
 *
 * Heights come from the landmark stories in src/data (Danial's sources):
 * Merdeka 118 is 678.9 m, the Twin Towers 451.9 m, KL Tower 421 m.
 *
 * Each shape keeps one material, so the map can turn it from grey to gold the
 * moment its stamp is earned.
 */
import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial } from 'three';
import { MARKER_GOLD, MARKER_GREY } from './mapColours';

export { MARKER_GOLD, MARKER_GREY };

function part(geometry, material, y, x = 0, z = 0) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** One tapered tower with a spire: the shape both Petronas towers share. */
function twinTower(material, x, z) {
  const group = new Group();
  const shaft = 375; // to the roof; the spire carries on above
  group.add(part(new CylinderGeometry(15, 22, shaft, 16), material, shaft / 2, x, z));
  // The stepped top and the spire, which together reach 451.9 m.
  group.add(part(new CylinderGeometry(8, 15, 35, 16), material, shaft + 17, x, z));
  group.add(part(new ConeGeometry(3, 45, 12), material, shaft + 57, x, z));
  return group;
}

/** Petronas Twin Towers: two towers with the skybridge between them. */
function makePetronas(material) {
  const group = new Group();
  const gap = 32; // half the distance between the two towers
  group.add(twinTower(material, -gap, 0));
  group.add(twinTower(material, gap, 0));
  // The skybridge joins them at the 41st and 42nd floors, about 170 m up.
  const bridge = part(new CylinderGeometry(3, 3, gap * 2, 8), material, 170);
  bridge.rotation.z = Math.PI / 2;
  group.add(bridge);
  return group;
}

/** Merdeka 118: a tall tapered tower under a long spire. */
function makeMerdeka(material) {
  const group = new Group();
  const shaft = 510;
  group.add(part(new CylinderGeometry(14, 30, shaft, 12), material, shaft / 2));
  group.add(part(new ConeGeometry(14, 169, 12), material, shaft + 84)); // to 678.9 m
  return group;
}

/** KL Tower: a slim concrete shaft with the round head near the top. */
function makeKlTower(material) {
  const group = new Group();
  const shaft = 335;
  group.add(part(new CylinderGeometry(7, 14, shaft, 12), material, shaft / 2));
  group.add(part(new CylinderGeometry(19, 13, 30, 14), material, shaft + 15)); // the head
  group.add(part(new CylinderGeometry(9, 14, 20, 12), material, shaft + 40));
  group.add(part(new ConeGeometry(3, 55, 10), material, shaft + 78)); // the mast, to 421 m
  return group;
}

/** Anything not modelled yet: a pillar with a disc, clearly a marker. */
function makeMarker(material) {
  const group = new Group();
  group.add(part(new CylinderGeometry(6, 9, 70, 12), material, 35));
  group.add(part(new CylinderGeometry(22, 22, 6, 18), material, 74));
  return group;
}

const SHAPES = {
  petronas: makePetronas,
  'merdeka-118': makeMerdeka,
  'kl-tower': makeKlTower,
};

/** How high above the ground a landmark's name floats, in metres. */
const TOPS = { petronas: 470, 'merdeka-118': 700, 'kl-tower': 440 };
export const labelHeight = (placeId) => TOPS[placeId] ?? 88;

/** True when this landmark has a shape of its own rather than a plain marker. */
export const hasOwnShape = (placeId) => placeId in SHAPES;

/**
 * The shape for a landmark, ready to stand on the map.
 * @param {string} placeId
 * @returns {import('three').Group} with `userData.material` to recolour
 */
export function makeLandmark(placeId) {
  const material = new MeshLambertMaterial({ color: MARKER_GREY });
  const group = (SHAPES[placeId] ?? makeMarker)(material);
  group.userData.material = material;
  return group;
}
