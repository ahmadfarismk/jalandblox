/**
 * Imports the shapes of KL Centre's buildings from OpenStreetMap (task F14).
 *
 * Run: npm run import:buildings
 *
 * A developer runs this by hand and commits the result. Visitors never call
 * the API, so the 3D map costs nothing, needs no key, and works with no
 * signal. Re-run it only when the city has changed, and review the diff like
 * any other content change.
 *
 * Data © OpenStreetMap contributors, licensed ODbL. The credit shown in the
 * app is <MapAttribution />; do not ship this data without it.
 */
import { writeFileSync } from 'node:fs';

const OUT = 'src/data/buildings.json';
const ENDPOINT = 'https://overpass-api.de/api/interpreter';

/** The City Centre box that holds all 7 check-in spots, with room around them. */
const BBOX = { south: 3.1285, west: 101.6825, north: 3.1605, east: 101.7185 };

/** Keep the file small: the biggest buildings make the skyline, the sheds do not. */
const MIN_AREA_M2 = 400;
const MAX_BUILDINGS = 450;
const MAX_POINTS = 24; // per building outline
const STOREY_HEIGHT_M = 3.2;
const DEFAULT_HEIGHT_M = 12;

const query = `
[out:json][timeout:180];
(
  way["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["building"]["type"="multipolygon"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
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
  const latRad = (ring[0][0] * Math.PI) / 180;
  const mPerDegLat = 111132;
  const mPerDegLng = 111320 * Math.cos(latRad);
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [y1, x1] = ring[j];
    const [y2, x2] = ring[i];
    sum += x1 * mPerDegLng * (y2 * mPerDegLat) - x2 * mPerDegLng * (y1 * mPerDegLat);
  }
  return Math.abs(sum / 2);
}

/** Fewer points, same shape: phones draw this, not a map server. */
function simplify(ring) {
  const open = ring.slice(0, -1); // the last point repeats the first
  if (open.length <= MAX_POINTS) return open;
  const step = open.length / MAX_POINTS;
  return Array.from({ length: MAX_POINTS }, (_, i) => open[Math.floor(i * step)]);
}

const round = (n) => Number(n.toFixed(5)); // about 1 m, plenty for a city block

function ringsFrom(element) {
  if (element.type === 'way' && element.geometry) {
    return [element.geometry.map((p) => [p.lat, p.lon])];
  }
  // A multipolygon: take its outer rings only. Courtyards are not worth the bytes.
  return (element.members ?? [])
    .filter((m) => m.role === 'outer' && m.geometry)
    .map((m) => m.geometry.map((p) => [p.lat, p.lon]));
}

async function main() {
  console.log('Asking OpenStreetMap for KL Centre buildings…');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'JalanKL-student-project/0.1 (one-off buildings import)',
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass answered ${res.status}. Try again in a minute.`);
  const { elements = [] } = await res.json();
  console.log(`${elements.length} shapes came back. Keeping the biggest ones…`);

  const buildings = [];
  for (const element of elements) {
    const height = heightOf(element.tags);
    for (const ring of ringsFrom(element)) {
      if (ring.length < 4) continue;
      const area = areaOf(ring);
      if (area < MIN_AREA_M2) continue;
      buildings.push({
        area,
        h: height,
        p: simplify(ring).map(([la, ln]) => [round(la), round(ln)]),
      });
    }
  }

  buildings.sort((a, b) => b.area - a.area);
  const kept = buildings.slice(0, MAX_BUILDINGS).map(({ h, p }) => ({ h, p }));

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'OpenStreetMap via the Overpass API',
    licence: 'ODbL',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    bbox: [BBOX.south, BBOX.west, BBOX.north, BBOX.east],
    note: 'Outlines and heights of the biggest buildings in KL Centre, for the 3D map (F14).',
    buildings: kept,
  };
  writeFileSync(OUT, JSON.stringify(out) + '\n');

  const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0);
  const withHeight = kept.filter((b) => b.h !== DEFAULT_HEIGHT_M).length;
  console.log(`Wrote ${OUT}: ${kept.length} buildings, ${kb} KB.`);
  console.log(`${withHeight} have a real height from OSM; the rest use ${DEFAULT_HEIGHT_M} m.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
