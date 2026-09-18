/**
 * Draws the PLACEHOLDER app icons (task F11): a teal square with a white stamp
 * and a teal star. Replace the files in public/icons/ with the real design when
 * it is ready; keep the same file names and sizes.
 *
 * Run: node scripts/make-placeholder-icons.js
 * No libraries needed: it writes PNG files by hand.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TEAL = [15, 118, 110]; // #0f766e, same as theme-color
const WHITE = [255, 255, 255];
const OUT = 'public/icons';

// --- tiny PNG writer ---
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  const rows = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 3 + 1)] = 0; // no filter
    rgb.copy(rows, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- the drawing, in a 0..1 square ---
function star(cx, cy, outer, inner) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}
function inPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** `scale` shrinks the stamp so "maskable" icons survive being cropped to a circle. */
function draw(size, scale) {
  const circleR = 0.3 * scale;
  const starPts = star(0.5, 0.515, 0.19 * scale, 0.08 * scale);
  const colourAt = (x, y) => {
    if (inPolygon(x, y, starPts)) return TEAL;
    if ((x - 0.5) ** 2 + (y - 0.5) ** 2 <= circleR ** 2) return WHITE;
    return TEAL;
  };
  const SS = 4; // 4x4 samples per pixel for smooth edges
  const rgb = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colourAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          sum[0] += c[0];
          sum[1] += c[1];
          sum[2] += c[2];
        }
      }
      const o = (py * size + px) * 3;
      for (let k = 0; k < 3; k++) rgb[o + k] = Math.round(sum[k] / (SS * SS));
    }
  }
  return png(size, rgb);
}

mkdirSync(OUT, { recursive: true });
const icons = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 1],
];
for (const [name, size, scale] of icons) {
  writeFileSync(`${OUT}/${name}`, draw(size, scale));
  console.log(`wrote ${OUT}/${name}`);
}
