/**
 * Builds the shapes of the city for the 3D map (task S13).
 *
 * Kept out of the screen so the drawing code stays short, and so the colours
 * of the map live in one place. Everything here is measured in metres, with
 * the middle of the City Centre at (0, 0) — see scene.js.
 *
 * The layers are stacked a few centimetres apart so they never fight over
 * which one is on top: ground, parks, water, then roads.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildingToScene, ribbon, toScene } from './scene';
import { matchFootprints } from './footprints';
import { COLOURS } from './mapColours';

export { COLOURS };

/** How high each flat layer sits, so they stack instead of flickering. */
const Y = { green: 0.3, water: 0.6, road: 0.9, roadBig: 1.0 };

/** A closed outline, flat on the ground. */
function flatShape(points) {
  const shape = new Shape();
  // -z because the shape is drawn flat and then tipped upright, which would
  // otherwise swap north and south.
  points.forEach(({ x, z }, i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  shape.closePath();
  const geometry = new ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** One mesh from many flat outlines (parks, water). */
function areaMesh(areas, centre, colour, y) {
  const parts = [];
  for (const area of areas ?? []) {
    const points = (area.p ?? []).map((p) => toScene(p, centre)).filter(Boolean);
    if (points.length < 3) continue;
    parts.push(flatShape(points));
  }
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  const mesh = new Mesh(merged, new MeshLambertMaterial({ color: colour, side: DoubleSide }));
  mesh.position.y = y;
  return mesh;
}

/** One mesh from many lines with a width (roads, rivers). */
function lineMesh(lines, centre, colour, y) {
  const positions = [];
  for (const line of lines ?? []) {
    const points = (line.p ?? []).map((p) => toScene(p, centre)).filter(Boolean);
    positions.push(...ribbon(points, line.w));
  }
  if (positions.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  // Both sides: which way a ribbon faces depends on which way the road runs,
  // and a road facing away from the sky would simply not be drawn.
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ color: colour, side: DoubleSide }));
  mesh.position.y = y;
  return mesh;
}

/**
 * A building's colour: glass for the towers, concrete for the middle, brick
 * and plaster for the low shophouses. The shade comes from the building's
 * place in the file, so it never changes between visits.
 */
function buildingColour(height, index) {
  const palette =
    height >= 120
      ? COLOURS.buildingsTall
      : height >= 40
        ? COLOURS.buildingsMid
        : COLOURS.buildingsLow;
  return palette[index % palette.length];
}

/** One building, pushed up from its outline. */
function buildingGeometry(building, centre) {
  const shaped = buildingToScene(building, centre);
  if (!shaped) return null;
  const outline = new Shape();
  shaped.points.forEach(({ x, z }, i) => (i === 0 ? outline.moveTo(x, -z) : outline.lineTo(x, -z)));
  outline.closePath();
  const geometry = new ExtrudeGeometry(outline, { depth: shaped.height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  return { geometry, height: shaped.height };
}

/** Every ordinary building as one mesh, coloured per building. */
function buildingsMesh(buildings, centre, skip = new Set()) {
  const parts = [];
  for (const [index, building] of (buildings ?? []).entries()) {
    if (skip.has(index)) continue; // a landmark: it gets its own mesh
    const shaped = buildingToScene(building, centre);
    if (!shaped) continue;
    const paletteIndex = index;
    const outline = new Shape();
    shaped.points.forEach(({ x, z }, i) =>
      i === 0 ? outline.moveTo(x, -z) : outline.lineTo(x, -z),
    );
    outline.closePath();
    const geometry = new ExtrudeGeometry(outline, { depth: shaped.height, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);

    // Colour lives on the shape itself, so all the buildings can still be
    // drawn in one go.
    const colour = buildingColour(shaped.height, paletteIndex);
    const count = geometry.attributes.position.count;
    const colours = new Float32Array(count * 3);
    const r = ((colour >> 16) & 255) / 255;
    const g = ((colour >> 8) & 255) / 255;
    const b = (colour & 255) / 255;
    for (let i = 0; i < count; i++) colours.set([r, g, b], i * 3);
    geometry.setAttribute('color', new BufferAttribute(colours, 3));
    parts.push(geometry);
  }
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return new Mesh(merged, new MeshLambertMaterial({ vertexColors: true }));
}

/**
 * Everything that makes up the city, ready to add to the scene.
 *
 * Landmark buildings come back separately: each has its own material, so the
 * map can turn Petronas gold the moment its stamp is earned, while the rest
 * of the city stays grey.
 *
 * @param {object} city   the imported citymap.json
 * @param {[number, number]} centre
 * @param {number} radius metres from the centre to the furthest landmark
 * @param {{id: string, coords: [number, number]|null}[]} [places]
 * @returns {{layers: import('three').Mesh[], landmarks: Record<string, import('three').Mesh>}}
 */
export function buildCity(city, centre, radius, places = []) {
  const ground = new Mesh(
    new PlaneGeometry(radius * 8, radius * 8),
    new MeshLambertMaterial({ color: COLOURS.ground }),
  );
  ground.rotation.x = -Math.PI / 2;

  const bigRoads = (city.roads ?? []).filter((road) => road.w >= 13);
  const smallRoads = (city.roads ?? []).filter((road) => road.w < 13);

  // Which building belongs to which landmark, so those can be coloured in.
  const matched = matchFootprints(places, city.buildings);
  const landmarks = {};
  for (const [placeId, index] of Object.entries(matched)) {
    const built = buildingGeometry(city.buildings[index], centre);
    if (!built) continue;
    const mesh = new Mesh(built.geometry, new MeshLambertMaterial({ color: COLOURS.landmarkGrey }));
    mesh.userData.material = mesh.material;
    // How tall the real building is, so the map knows whether OpenStreetMap
    // already has the tower (Merdeka 118 is in there at its full 679 m) or
    // whether one needs drawing (the Twin Towers are only a low podium).
    mesh.userData.height = built.height;
    landmarks[placeId] = mesh;
  }

  const layers = [
    ground,
    areaMesh(city.green, centre, COLOURS.green, Y.green),
    areaMesh(city.water, centre, COLOURS.water, Y.water),
    lineMesh(city.waterways, centre, COLOURS.water, Y.water),
    lineMesh(smallRoads, centre, COLOURS.road, Y.road),
    lineMesh(bigRoads, centre, COLOURS.roadBig, Y.roadBig),
    buildingsMesh(city.buildings, centre, new Set(Object.values(matched))),
    ...Object.values(landmarks),
  ].filter(Boolean);

  return { layers, landmarks };
}
