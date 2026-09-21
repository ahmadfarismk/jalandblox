/**
 * Imports KL Centre from OpenStreetMap for the 3D map (task F14).
 *
 * Run: npm run import:citymap
 *
 * Four layers, so the map reads as a city and not as a pile of blocks:
 *   buildings  outlines and heights
 *   roads      the street grid, by size
 *   water      the rivers and any lakes or ponds
 *   green      parks and gardens
 *
 * A developer runs this by hand and commits the result. Visitors never call
 * the API, so the map costs nothing, needs no key, and works with no signal.
 * Re-run it only when the city has changed, and review the diff like any
 * other content change.
 *
 * Data © OpenStreetMap contributors, licensed ODbL. The credit shown in the
 * app is <MapAttribution />; do not ship this data without it.
 */
import { writeFileSync } from 'node:fs';

const OUT = 'src/data/citymap.json';
const ENDPOINT = 'https://overpass-api.de/api/interpreter';

/** The City Centre box that holds all 7 check-in spots, with room around them. */
const BBOX = { south: 3.1285, west: 101.6825, north: 3.1605, east: 101.7185 };

const MIN_BUILDING_AREA_M2 = 400;
const MIN_GREEN_AREA_M2 = 2000;
const MIN_WATER_AREA_M2 = 1000;
const MAX_BUILDINGS = 450;
const MAX_ROADS = 1400;
/**
 * Overpass hands back a whole shape when any part of it is inside the box, so
 * a river or a lake can reach far outside KL Centre. Anything bigger than this
 * is not a city-centre feature: it is a shape we only half have.
 */
const MAX_AREA_M2 = 800000;
const MAX_POINTS = 24; // per outline
const STOREY_HEIGHT_M = 3.2;
const DEFAULT_HEIGHT_M = 12;

/** How wide each kind of road is drawn, in metres. */
const ROAD_WIDTH = {
  motorway: 22,
  trunk: 20,
  primary: 16,
  secondary: 13,
  tertiary: 10,
  residential: 7,
  unclassified: 7,
};
const roadWidth = (type) => ROAD_WIDTH[String(type).replace('_link', '')] ?? 0;

const box = `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;
const query = `
[out:json][timeout:300];
(
  way["building"](${box});
  relation["building"]["type"="multipolygon"](${box});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)(_link)?$"](${box});
  way["waterway"~"^(river|canal)$"](${box});
  way["natural"="water"](${box});
  relation["natural"="water"]["type"="multipolygon"](${box});
  way["leisure"~"^(park|garden)$"](${box});
  way["landuse"~"^(grass|forest|recreation_ground|village_green)$"](${box});
);
out geom;`;

/** Height in metres from OSM tags: a real height, else storeys, else a default. */
function heightOf(tags = {}) {
  const height = Number.parseFloat(tags.height ?? tags['building:height']);
  if (Number.isFinite(height) && height > 0) return Math.min(Math.round(height), 700);
  const levels = Number.parseFloat(tags['building:levels']);
  if (Number.isFinite(levels) && levels > 0) return Math.round(levels * STOREY_HEIGHT_M);
  return DEFAULT_HEIGHT_M;
}

/** Rough area of a lat/lng ring in square metres (good enough to sort by size). */
function areaOf(ring) {
  const mPerDegLat = 111132;
  const mPerDegLng = 111320 * Math.cos((ring[0][0] * Math.PI) / 180);
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [y1, x1] = ring[j];
    const [y2, x2] = ring[i];
    sum += x1 * mPerDegLng * (y2 * mPerDegLat) - x2 * mPerDegLng * (y1 * mPerDegLat);
  }
  return Math.abs(sum / 2);
}

/** Fewer points, same shape: phones draw this, not a map server. */
/** True when the middle of a shape is inside the box we asked for. */
function centreInside(points) {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  return lat >= BBOX.south && lat <= BBOX.north && lng >= BBOX.west && lng <= BBOX.east;
}

function simplify(points, max = MAX_POINTS) {
  if (points.length <= max) return points;
  const step = points.length / max;
  const kept = Array.from({ length: max }, (_, i) => points[Math.floor(i * step)]);
  kept[kept.length - 1] = points[points.length - 1]; // keep the real end of a road
  return kept;
}

const round = (n) => Number(n.toFixed(5)); // about 1 m, plenty for a city block
const asPoints = (geometry) => geometry.map((p) => [round(p.lat), round(p.lon)]);
const isClosed = (points) =>
  points.length > 3 &&
  points[0][0] === points[points.length - 1][0] &&
  points[0][1] === points[points.length - 1][1];

function ringsFrom(element) {
  if (element.type === 'way' && element.geometry) return [asPoints(element.geometry)];
  // A multipolygon: outer rings only. Courtyards are not worth the bytes.
  return (element.members ?? [])
    .filter((m) => m.role === 'outer' && m.geometry)
    .map((m) => asPoints(m.geometry));
}

async function main() {
  console.log('Asking OpenStreetMap for KL Centre: buildings, roads, water and parks…');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'JalanKL-student-project/0.1 (one-off city map import)',
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass answered ${res.status}. Try again in a minute.`);
  const { elements = [] } = await res.json();
  console.log(`${elements.length} shapes came back. Sorting them out…`);

  const buildings = [];
  const roads = [];
  const water = [];
  const waterways = [];
  const green = [];

  for (const element of elements) {
    const tags = element.tags ?? {};

    if (tags.building) {
      const height = heightOf(tags);
      for (const ring of ringsFrom(element)) {
        if (ring.length < 4) continue;
        const area = areaOf(ring);
        if (area < MIN_BUILDING_AREA_M2) continue;
        buildings.push({ area, h: height, p: simplify(ring.slice(0, -1)) });
      }
      continue;
    }

    if (tags.highway) {
      const width = roadWidth(tags.highway);
      const points = asPoints(element.geometry ?? []);
      if (width && points.length >= 2) roads.push({ w: width, p: simplify(points, 32) });
      continue;
    }

    if (tags.waterway) {
      const points = asPoints(element.geometry ?? []);
      // Rivers are drawn as wide ribbons, like roads.
      if (points.length >= 2)
        waterways.push({ w: tags.waterway === 'river' ? 34 : 14, p: simplify(points, 32) });
      continue;
    }

    if (tags.natural === 'water') {
      for (const ring of ringsFrom(element)) {
        const area = areaOf(ring);
        if (ring.length < 4 || area < MIN_WATER_AREA_M2) continue;
        if (area > MAX_AREA_M2 || !centreInside(ring)) continue; // reaches outside the box
        water.push({ p: simplify(ring.slice(0, -1), 40) });
      }
      continue;
    }

    if (tags.leisure || tags.landuse) {
      for (const ring of ringsFrom(element)) {
        const area = areaOf(ring);
        if (!isClosed(ring) || area < MIN_GREEN_AREA_M2) continue;
        if (area > MAX_AREA_M2 || !centreInside(ring)) continue;
        green.push({ p: simplify(ring.slice(0, -1), 40) });
      }
    }
  }

  buildings.sort((a, b) => b.area - a.area);
  // Keep every main road, then fill the rest of the budget with small streets.
  // Sorting by width alone would drop every residential street, and a city
  // without small streets does not look like a city.
  const mainRoads = roads.filter((road) => road.w >= 10);
  const sideRoads = roads.filter((road) => road.w < 10);
  const keptRoads = [...mainRoads, ...sideRoads].slice(0, MAX_ROADS);

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'OpenStreetMap via the Overpass API',
    licence: 'ODbL',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    bbox: [BBOX.south, BBOX.west, BBOX.north, BBOX.east],
    note: 'KL Centre for the 3D map (F14): building outlines and heights, roads, water and parks.',
    buildings: buildings.slice(0, MAX_BUILDINGS).map(({ h, p }) => ({ h, p })),
    roads: keptRoads,
    waterways,
    water,
    green,
  };
  writeFileSync(OUT, JSON.stringify(out) + '\n');

  const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0);
  console.log(
    `Wrote ${OUT}: ${out.buildings.length} buildings, ${out.roads.length} roads, ` +
      `${out.waterways.length} rivers, ${out.water.length} lakes, ${out.green.length} parks. ${kb} KB.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
