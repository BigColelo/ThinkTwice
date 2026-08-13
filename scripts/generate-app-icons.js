#!/usr/bin/env node
/**
 * Generates ThinkTwice's app icons from code.
 *
 * Why this exists: the project must be reproducible from source alone and must not
 * bundle any third-party or employer-owned artwork. The marks below are plain
 * geometry (a shopping-bag glyph) rasterised with a tiny built-in PNG encoder, so
 * the icons can always be regenerated with `npm run icons`.
 *
 * Usage: node scripts/generate-app-icons.js
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// -- Brand -------------------------------------------------------------------

const PURPLE = [109, 63, 243, 255]; // #6D3FF3 — ThinkTwice accent
const WHITE = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

// -- Minimal PNG encoder (RGBA, 8-bit, no interlace) --------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// -- Signed distance helpers (units are normalised 0..1 of the canvas) --------

function sdRoundedBox(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - r;
}

function sdRing(px, py, cx, cy, radius, halfThickness) {
  return Math.abs(Math.hypot(px - cx, py - cy) - radius) - halfThickness;
}

/**
 * The ThinkTwice mark: a shopping bag — a rounded body with a semicircular handle.
 * `scale` shrinks the glyph towards the centre (used for Android's safe zone).
 */
function bagDistance(px, py, scale) {
  const x = (px - 0.5) / scale + 0.5;
  const y = (py - 0.5) / scale + 0.5;

  // Geometry is positioned so the combined glyph is vertically centred on 0.5,
  // which keeps `scale` a pure zoom rather than a zoom plus drift.
  const body = sdRoundedBox(x, y, 0.5, 0.578, 0.235, 0.225, 0.06);

  // Handle: only the upper half of the ring, stopping where the body begins.
  const ring = sdRing(x, y, 0.5, 0.353, 0.125, 0.03);
  const handle = Math.max(ring, y - 0.353);

  return Math.min(body, handle) * scale;
}

function render({ size, background, glyph, scale = 1 }) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4; // supersampling grid per axis, for smooth edges
  const inv = 1 / samples;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let covered = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = (x + (sx + 0.5) * inv) / size;
          const py = (y + (sy + 0.5) * inv) / size;
          if (bagDistance(px, py, scale) < 0) covered += 1;
        }
      }
      const a = covered / (samples * samples);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        rgba[i + c] = Math.round(background[c] * (1 - a) + glyph[c] * a);
      }
      const bgA = background[3] / 255;
      const fgA = glyph[3] / 255;
      rgba[i + 3] = Math.round((bgA * (1 - a) + fgA * a) * 255);
    }
  }
  return encodePng(size, size, rgba);
}

// -- Outputs ------------------------------------------------------------------

const outDir = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon.png', size: 1024, background: PURPLE, glyph: WHITE, scale: 1.1 },
  // Android trims the adaptive foreground to a ~66% safe zone, hence the smaller scale.
  { file: 'adaptive-icon.png', size: 1024, background: TRANSPARENT, glyph: WHITE, scale: 0.95 },
  { file: 'splash-icon.png', size: 512, background: TRANSPARENT, glyph: PURPLE, scale: 1.0 },
  { file: 'favicon.png', size: 64, background: PURPLE, glyph: WHITE, scale: 1.1 },
  { file: 'notification-icon.png', size: 96, background: TRANSPARENT, glyph: WHITE, scale: 1.1 },
];

for (const target of targets) {
  const png = render(target);
  fs.writeFileSync(path.join(outDir, target.file), png);
  console.log(`  ${target.file.padEnd(22)} ${target.size}x${target.size}  ${png.length} bytes`);
}
console.log('ThinkTwice icons generated.');
