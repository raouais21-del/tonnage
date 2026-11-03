// Génère les icônes PNG de l'app (haltère dorée sur fond noir), sans dépendance.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const GOLD = [0xd4, 0xaf, 0x37];
const BG = [0x0a, 0x0a, 0x0a];

// Rectangles arrondis en coordonnées 0..100 : [x0, y0, x1, y1, rayon] — même dessin que l'animation d'ouverture.
const SHAPES = [
  [28, 46, 72, 54, 2], // poignée
  [18, 28, 28, 72, 3], // gros disques
  [72, 28, 82, 72, 3],
  [8, 36, 16, 64, 3], // petits disques
  [84, 36, 92, 64, 3],
];
const SCALE = 0.78; // marge autour du logo dans l'icône

function inRoundRect(u, v, [x0, y0, x1, y1, r]) {
  if (u < x0 || u >= x1 || v < y0 || v >= y1) return false;
  const cx = Math.min(Math.max(u, x0 + r), x1 - r);
  const cy = Math.min(Math.max(v, y0 + r), y1 - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Image width × height ; le logo occupe un carré de `logo` px centré. */
function png(width, height = width, logo = width) {
  const ox = (width - logo) / 2;
  const oy = (height - logo) / 2;
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const u = 50 + (((x + 0.5 - ox) / logo) * 100 - 50) / SCALE;
      const v = 50 + (((y + 0.5 - oy) / logo) * 100 - 50) / SCALE;
      const inside = SHAPES.some((s) => inRoundRect(u, v, s));
      const [r, g, b] = inside ? GOLD : BG;
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon.png', 64]]) {
  writeFileSync(`public/${name}`, png(size));
}
// Écran de démarrage iOS — iPhone 13 Pro Max (428 × 926 pt @3x). Noir uni : l'animation
// d'ouverture de l'app fait ensuite apparaître le logo.
writeFileSync('public/splash-1284x2778.png', png(1284, 2778, 0.001));
console.log('Icônes générées dans public/');
