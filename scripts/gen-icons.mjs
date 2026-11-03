// Génère les icônes PNG de l'app (haltère dorée sur fond noir), sans dépendance.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const GOLD = [0xd4, 0xaf, 0x37];
const BG = [0x0a, 0x0a, 0x0a];

// Rectangles en coordonnées 0..100 : [x0, y0, x1, y1]
const SHAPES = [
  [30, 46, 70, 54], // poignée
  [22, 27, 30, 73], // gros disques
  [70, 27, 78, 73],
  [15, 36, 21, 64], // petits disques
  [79, 36, 85, 64],
];

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

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 100;
      const v = ((y + 0.5) / size) * 100;
      const inside = SHAPES.some(([x0, y0, x1, y1]) => u >= x0 && u < x1 && v >= y0 && v < y1);
      const [r, g, b] = inside ? GOLD : BG;
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
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
console.log('Icônes générées dans public/');
