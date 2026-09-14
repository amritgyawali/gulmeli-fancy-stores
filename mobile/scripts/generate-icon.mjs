// Generates the app icon set (no image libraries needed): writes valid PNGs
// straight from a pixel buffer with zlib + a hand-rolled CRC32.
// Run: node scripts/generate-icon.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";

const ORANGE = [0xf8, 0x56, 0x06];

function crc32(buf) {
  let c = ~0;
  for (let n = 0; n < buf.length; n++) {
    c ^= buf[n];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Signed distance helpers for crisp, antialiased shapes.
const sdRoundRect = (x, y, cx, cy, w, h, r) => {
  const dx = Math.abs(x - cx) - (w - r);
  const dy = Math.abs(y - cy) - (h - r);
  const ax = Math.max(dx, 0), ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
};
const sdRing = (x, y, cx, cy, rOuter, rInner) => {
  const d = Math.hypot(x - cx, y - cy);
  return Math.max(rOuter - d, d - rInner);
};
const cover = (dist, px = 1.5) => Math.min(1, Math.max(0, 0.5 - dist / (2 * px) + 0.5));

function drawBag(size, { bg, fg, bag, handle, inset }) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const bagW = size * 0.27 * (inset ?? 1); // half width
  const bagH = size * 0.235 * (inset ?? 1);
  const bagCy = size * 0.60;
  const ringR = size * 0.155 * (inset ?? 1);
  const ringCy = size * 0.42;
  const thick = size * 0.045 * (inset ?? 1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = bg[0], g = bg[1], b = bg[2], a = bg.length > 3 ? bg[3] : 255;
      if (bg.length === 3) a = 255;
      const inBag = cover(sdRoundRect(x, y, cx, bagCy, bagW, bagH, size * 0.03));
      // Ring only above the bag top edge (handle of a shopping bag).
      const inRing =
        cover(sdRing(x, y, cx, ringCy, ringR, ringR - thick)) *
        (y < bagCy - bagH * 0.55 ? 1 : 0);
      const t = Math.max(inBag, inRing);
      if (t > 0) {
        const src = inRing > inBag ? handle ?? fg : fg;
        r = Math.round(r * (1 - t) + src[0] * t);
        g = Math.round(g * (1 - t) + src[1] * t);
        b = Math.round(b * (1 - t) + src[2] * t);
        const alphaShape = t * (fg.length > 3 ? fg[3] / 255 : 1);
        a = Math.round(a * (1 - alphaShape) + 255 * alphaShape);
      }
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    }
  }
  return buf;
}

const out = (name, size, data) => {
  const file = path.resolve(process.cwd(), "assets", name);
  writeFileSync(file, png(size, data));
  console.log("wrote", path.relative(process.cwd(), file));
};

const WHITE = [255, 255, 255];
// Legacy/Play icon: solid orange tile with a white shopping bag.
out("icon.png", 1024, drawBag(1024, { bg: ORANGE, fg: WHITE }));
// Adaptive foreground: white bag only (transparent), shrunk into the safe zone.
out(
  "adaptive-icon.png",
  1024,
  drawBag(1024, {
    bg: [0, 0, 0, 0],
    fg: [255, 255, 255, 255],
    inset: 0.7,
  }),
);
// Monochrome (themed icons on Android 13+): same shape, one colour.
out(
  "monochrome-icon.png",
  1024,
  drawBag(1024, {
    bg: [0, 0, 0, 0],
    fg: [255, 255, 255, 255],
    inset: 0.7,
  }),
);
// Splash mark: orange bag on the app's background colour.
out("splash-icon.png", 1024, drawBag(1024, { bg: [244, 244, 244, 255], fg: ORANGE, inset: 0.55 }));
