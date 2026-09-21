/**
 * The landmarks on the 3D map (task S13).
 *
 * Each check-in spot is built here from a few simple shapes: enough that
 * anyone who knows KL recognises what they are looking at, and small enough
 * that a phone draws them all without noticing. They are not models and are
 * not meant to be. KrackedDev's real models (task K1, spec in
 * public/models/README.md) replace them one at a time.
 *
 * Grey until the stamp is earned, then the landmark's own colours. The plan
 * calls this "the landmark icon turns from grey to colour on the map".
 *
 * Heights come from the landmark stories in src/data (Danial's sources):
 * the Twin Towers are 451.9 m, KL Tower 421 m, Merdeka 118 678.9 m. Merdeka
 * 118 is not drawn here: OpenStreetMap already has the real tower at full
 * height, so the map colours that building instead.
 */
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three';
import { MARKER_GOLD, MARKER_GREY } from './mapColours';

export { MARKER_GOLD, MARKER_GREY };

/** The real colours of the landmarks, shown once their stamp is earned. */
const C = {
  steel: 0x9fb3c8, // the Twin Towers' stainless steel
  glass: 0x7f9fb5,
  concrete: 0xe8e4dc, // KL Tower's shaft
  mast: 0xd0453c,
  brick: 0xc08161, // Sultan Abdul Samad's brickwork
  plaster: 0xf3ece1,
  copper: 0x6f9e8b, // its weathered copper domes
  clock: 0xf7f3ea,
  gateRed: 0xb3322c, // the Petaling Street gate
  gateGreen: 0x2f6b4f,
  gateGold: 0xd8a640,
  roofWhite: 0xeef1f4, // KL Sentral's roof
  roofBlue: 0x8fb6cf,
  water: 0x6fb3d6, // the KLCC Park fountain
  leaf: 0x5f9e56,
  trunk: 0x7a5c42,
};

/**
 * Every shape keeps its own materials and the colour each one should be once
 * collected, so the map can swap a whole landmark between grey and colour
 * without rebuilding anything.
 */
function painter() {
  const painted = [];
  return {
    painted,
    mat(colour) {
      const material = new MeshLambertMaterial({ color: MARKER_GREY });
      painted.push({ material, colour });
      return material;
    },
  };
}

const put = (geometry, material, y, x = 0, z = 0) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
};

/** One tapered tower with a spire: the shape both Petronas towers share. */
function twinTower(steel, glass, x, z) {
  const group = new Group();
  const shaft = 375; // to the roof; the spire carries on above
  group.add(put(new CylinderGeometry(15, 22, shaft, 16), glass, shaft / 2, x, z));
  group.add(put(new CylinderGeometry(8, 15, 35, 16), steel, shaft + 17, x, z));
  group.add(put(new ConeGeometry(3, 45, 12), steel, shaft + 57, x, z));
  return group;
}

/** Petronas Twin Towers: two towers and the skybridge between them. */
function makePetronas({ mat }) {
  const steel = mat(C.steel);
  const glass = mat(C.glass);
  const group = new Group();
  const gap = 32; // half the distance between the towers
  group.add(twinTower(steel, glass, -gap, 0));
  group.add(twinTower(steel, glass, gap, 0));
  // The skybridge joins them at the 41st and 42nd floors, about 170 m up.
  const bridge = put(new CylinderGeometry(3, 3, gap * 2, 8), steel, 170);
  bridge.rotation.z = Math.PI / 2;
  group.add(bridge);
  return group;
}

/** KL Tower: a slim concrete shaft with the round head near the top. */
function makeKlTower({ mat }) {
  const concrete = mat(C.concrete);
  const head = mat(C.roofWhite);
  const mast = mat(C.mast);
  const group = new Group();
  const shaft = 335;
  group.add(put(new CylinderGeometry(7, 14, shaft, 12), concrete, shaft / 2));
  group.add(put(new CylinderGeometry(19, 13, 30, 14), head, shaft + 15));
  group.add(put(new CylinderGeometry(9, 14, 20, 12), head, shaft + 40));
  group.add(put(new ConeGeometry(3, 55, 10), mast, shaft + 78)); // to 421 m
  return group;
}

/**
 * Sultan Abdul Samad Building: the long brick arcade, the clock tower in the
 * middle, and the domes at each end.
 */
function makeAbdulSamad({ mat }) {
  const brick = mat(C.brick);
  const plaster = mat(C.plaster);
  const copper = mat(C.copper);
  const clockFace = mat(C.clock);
  const group = new Group();
  const dome = () => new SphereGeometry(8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);

  // The arcade along Merdeka Square, about 130 m of it.
  group.add(put(new BoxGeometry(130, 16, 22), brick, 8));
  group.add(put(new BoxGeometry(132, 2, 24), plaster, 17)); // the white band under the roof

  // The clock tower in the middle, 41 m to the top of its spire.
  group.add(put(new BoxGeometry(14, 30, 14), brick, 15));
  group.add(put(new BoxGeometry(15, 6, 15), clockFace, 32)); // the clock faces
  group.add(put(dome(), copper, 35));
  group.add(put(new ConeGeometry(1.5, 10, 8), copper, 47));

  // The smaller domes at each end.
  for (const x of [-46, 46]) {
    group.add(put(new BoxGeometry(16, 20, 16), brick, 10, x));
    group.add(put(dome(), copper, 20, x));
    group.add(put(new ConeGeometry(1.2, 8, 8), copper, 30, x));
  }
  return group;
}

/** Petaling Street: the gate over the entrance to the market. */
function makePetalingGate({ mat }) {
  const red = mat(C.gateRed);
  const green = mat(C.gateGreen);
  const gold = mat(C.gateGold);
  const group = new Group();

  for (const x of [-11, 11]) group.add(put(new BoxGeometry(3, 26, 3), red, 13, x));
  group.add(put(new BoxGeometry(28, 3, 4), gold, 22)); // the sign across the gate
  group.add(put(new BoxGeometry(32, 2, 7), red, 27));
  // A flattened four-sided cone reads as the sweeping tiled roof.
  group.add(put(new ConeGeometry(20, 9, 4), green, 33));
  group.add(put(new ConeGeometry(12, 6, 4), green, 40));
  return group;
}

/** KL Sentral: a long station hall under a curved white roof. */
function makeKlSentral({ mat }) {
  const glass = mat(C.roofBlue);
  const roof = mat(C.roofWhite);
  const group = new Group();

  group.add(put(new BoxGeometry(120, 18, 70), glass, 9));
  // Half a cylinder, lying along the hall, makes the arched roof.
  const arch = put(new CylinderGeometry(36, 36, 120, 16, 1, false, 0, Math.PI), roof, 18);
  arch.rotation.z = Math.PI / 2;
  group.add(arch);
  return group;
}

/** KLCC Park: the fountain in the lake, with trees around it. */
function makeKlccPark({ mat }) {
  const water = mat(C.water);
  const leaf = mat(C.leaf);
  const trunk = mat(C.trunk);
  const group = new Group();

  group.add(put(new CylinderGeometry(55, 55, 2, 24), water, 1)); // the lake
  group.add(put(new ConeGeometry(6, 34, 10), water, 18)); // the fountain

  for (const [x, z] of [
    [-70, 20],
    [-45, -55],
    [60, -35],
    [75, 40],
    [10, 70],
  ]) {
    group.add(put(new CylinderGeometry(1.5, 2, 12, 6), trunk, 6, x, z));
    group.add(put(new SphereGeometry(9, 10, 8), leaf, 17, x, z));
  }
  return group;
}

/** Anything not drawn yet: a pillar with a disc, clearly a marker. */
function makeMarker({ mat }) {
  const plain = mat(MARKER_GOLD);
  const group = new Group();
  group.add(put(new CylinderGeometry(6, 9, 70, 12), plain, 35));
  group.add(put(new CylinderGeometry(22, 22, 6, 18), plain, 74));
  return group;
}

const SHAPES = {
  petronas: makePetronas,
  'kl-tower': makeKlTower,
  'abdul-samad': makeAbdulSamad,
  'petaling-street': makePetalingGate,
  'kl-sentral': makeKlSentral,
  'klcc-park': makeKlccPark,
};

/** How high above the ground a landmark's name floats, in metres. */
const TOPS = {
  petronas: 470,
  'merdeka-118': 700,
  'kl-tower': 440,
  'abdul-samad': 70,
  'petaling-street': 60,
  'kl-sentral': 70,
  'klcc-park': 60,
};
export const labelHeight = (placeId) => TOPS[placeId] ?? 88;

/** True when this landmark has a shape of its own rather than a plain marker. */
export const hasOwnShape = (placeId) => placeId in SHAPES;

/**
 * The shape for a landmark, ready to stand on the map.
 * @param {string} placeId
 * @returns {import('three').Group} with `userData.painted` for recolouring
 */
export function makeLandmark(placeId) {
  const brush = painter();
  const group = (SHAPES[placeId] ?? makeMarker)(brush);
  group.userData.painted = brush.painted;
  return group;
}

/**
 * Grey before the stamp, the landmark's real colours after it.
 * @param {import('three').Object3D} group from makeLandmark
 * @param {boolean} collected
 */
export function setLandmarkColour(group, collected) {
  for (const { material, colour } of group?.userData?.painted ?? []) {
    material.color.setHex(collected ? colour : MARKER_GREY);
  }
}
