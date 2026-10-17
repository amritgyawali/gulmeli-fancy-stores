/*
 * Draws the illustrated product images for the sample clothing catalogue.
 *
 *   node --experimental-strip-types scripts/generate-catalog-art.ts
 *
 * Each garment is vector art in the product's own first colour, rendered to
 * an 800×800 JPEG with Playwright's Chromium and written to
 *   mobile/assets/catalog/<imageKey>.jpg   (bundled into the app)
 *   web/public/img/<imageKey>.jpg          (served by the website)
 *
 * They are honest illustrations, flagged `imageIllustrative` in the catalogue
 * so the storefront labels them. Replace them with photos of your own stock
 * from the dashboard whenever you can.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { products } from "../src/data/catalog.ts";

type Spec = {
  garment: string;
  accent?: string;
  pattern?: string;
  print?: string;
  bg?: string;
};

/* Which drawing each illustrated product uses. Colours come from the
   product's first colour unless overridden here. */
const SPECS: Record<string, Spec> = {
  "art-men-oxford-shirt": { garment: "shirt", pattern: "oxford" },
  "art-men-linen-shirt": { garment: "campShirt", pattern: "linen" },
  "art-men-slim-jeans": { garment: "jeans", pattern: "denim", accent: "#d39b4a" },
  "art-men-chinos": { garment: "chinos", pattern: "twill" },
  "art-men-graphic-tee": { garment: "tee", print: "mountain" },
  "art-women-wrap-dress": { garment: "wrapDress", pattern: "floral", accent: "#f6e3c9" },
  "art-women-ribbed-top": { garment: "squareTop", pattern: "rib" },
  "art-women-mom-jeans": { garment: "momJeans", pattern: "denim", accent: "#d39b4a" },
  "art-women-pleated-skirt": { garment: "pleatedSkirt", pattern: "satin" },
  "art-women-puff-blouse": { garment: "puffBlouse" },
  "art-kids-party-frock": { garment: "frock", accent: "#ffffff" },
  "art-kids-tee-shorts-set": { garment: "kidsSet", accent: "#26334f" },
  "art-kids-zip-hoodie": { garment: "kidsZipHoodie", pattern: "fleece" },
  "art-kids-daura-suruwal": { garment: "kidsDaura", pattern: "linen" },
  "art-ethnic-daura-suruwal": { garment: "daura", pattern: "linen" },
  "art-ethnic-dhaka-topi": { garment: "topi", pattern: "dhaka" },
  "art-ethnic-silk-saree": { garment: "saree", accent: "#d8b25a" },
  "art-ethnic-cotton-kurti": { garment: "kurti", pattern: "block", accent: "#f2e6cf" },
  "art-ethnic-kurta-pajama": { garment: "kurta", pattern: "linen" },
  "art-ethnic-lehenga": { garment: "lehenga", accent: "#e2c06b" },
  "art-winter-puffer-jacket": { garment: "puffer" },
  "art-winter-fleece-hoodie": { garment: "hoodie", pattern: "fleece" },
  "art-winter-pashmina-shawl": { garment: "shawl", pattern: "weave" },
  "art-winter-cable-sweater": { garment: "sweater", pattern: "cable" },
  "art-winter-women-cardigan": { garment: "cardigan", pattern: "knit" },
  "art-winter-pompom-beanie": { garment: "beanie", pattern: "knit" },
  "art-active-track-jacket": { garment: "trackJacket", accent: "#ffffff" },
  "art-active-jogger-pants": { garment: "joggers", pattern: "melange" },
  "art-acc-baseball-cap": { garment: "cap", pattern: "twill", accent: "#f2ead8" },
  "art-offer-basic-tee-pack": { garment: "teePack" },
  "art-offer-ankle-socks": { garment: "socks" },
  "art-offer-leggings-pair": { garment: "leggingsPair", accent: "#26334f" },
  "art-offer-check-muffler": { garment: "muffler", pattern: "check" },
  "art-offer-kids-tee-pack": { garment: "kidsTeePack" },
  "art-offer-boxer-briefs": { garment: "boxers" },
  "art-choice-denim-jacket": { garment: "denimJacket", pattern: "denim", accent: "#d39b4a" },
  "art-choice-floral-kurta-set": { garment: "kurtaSet", pattern: "floral", accent: "#fbe9de" },
  "art-choice-kids-jeans": { garment: "kidsJoggers", pattern: "denim", accent: "#d39b4a" },
  "art-choice-dhaka-jacket": { garment: "waistcoat", pattern: "dhaka" },
  "art-rec-printed-scarf": { garment: "scarf", pattern: "paisley", accent: "#fff3e6" },
  "art-rec-thermal-top": { garment: "thermal", pattern: "waffle" },
  "art-rec-cotton-shorts": { garment: "shorts", pattern: "twill" },
  "art-rec-kids-beanie": { garment: "earflapCap", pattern: "knit", accent: "#ffffff" },
};

/* ---------------------------------------------------------------- colour */

const hexToRgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
};
const shade = (hex: string, t: number) => (t < 0 ? mix(hex, "#000000", -t) : mix(hex, "#ffffff", t));
const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/* ---------------------------------------------------------------- shapes */

interface Ctx {
  base: string;
  dark: string;
  darker: string;
  light: string;
  accent: string;
  stitch: string;
  /* Fill for a garment surface: base colour, then pattern and shading. */
  fill: (d: string, color?: string, opts?: { pattern?: boolean; shadeOnly?: boolean }) => string;
}

const stitchLine = (d: string, color: string, w = 1.6) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-dasharray="5 4" stroke-linecap="round" opacity="0.75"/>`;
const line = (d: string, color: string, w = 2, opacity = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
const button = (x: number, y: number, color: string, r = 4.5) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x - 1.2}" cy="${y - 1.2}" r="${r * 0.35}" fill="#ffffff" opacity="0.35"/>`;
const mirror = (inner: string) => `${inner}<g transform="translate(400 0) scale(-1 1)">${inner}</g>`;

const TEE = "M148 62 C166 82 234 82 252 62 L306 82 L352 140 L314 172 L292 148 L294 338 C230 348 170 348 106 338 L108 148 L86 172 L48 140 L94 82 Z";
const LONG = "M150 58 C168 74 232 74 250 58 L300 80 Q318 90 324 122 L352 300 L312 310 L290 172 L292 344 C230 352 170 352 108 344 L110 172 L88 310 L48 300 L76 122 Q82 90 100 80 Z";
const SHIRT = "M150 58 L250 58 L300 80 Q318 90 324 122 L352 300 L312 310 L290 172 L290 345 L110 345 L110 172 L88 310 L48 300 L76 122 Q82 90 100 80 Z";
const SHORT_SHIRT = "M150 58 L250 58 L300 80 L348 150 L308 178 L290 152 L290 345 L110 345 L110 152 L92 178 L52 150 L100 80 Z";

function tee(c: Ctx, print?: string, d = TEE) {
  let out = c.fill(d);
  out += `<path d="M156 66 C174 86 226 86 244 66 C226 76 174 76 156 66 Z" fill="${c.darker}" opacity="0.55"/>`;
  out += line("M148 62 C166 90 234 90 252 62", c.dark, 7);
  out += stitchLine("M148 70 C166 98 234 98 252 70", c.darker);
  out += mirror(stitchLine("M86 162 L56 137", c.darker));
  out += stitchLine("M108 328 C170 337 230 337 292 328", c.darker);
  if (print === "mountain")
    out += `<g transform="translate(200 190)">
      <path d="M-70 40 L-30 -18 L-12 4 L12 -34 L40 6 L52 -8 L78 40 Z" fill="#2b3f66"/>
      <path d="M12 -34 L22 -20 L14 -16 L6 -22 L0 -16 Z M-30 -18 L-22 -6 L-30 -8 L-36 -6 Z" fill="#ffffff"/>
      <circle cx="44" cy="-30" r="10" fill="#e3a03a"/>
      <text x="0" y="66" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="17" letter-spacing="4" fill="#2b3f66">HIMALAYA</text>
    </g>`;
  return out;
}

function polo(c: Ctx) {
  let out = tee(c);
  out += `<path d="M200 96 L150 60 L136 82 L176 112 Z" fill="${c.light}" stroke="${c.dark}" stroke-width="1.5"/>`;
  out += `<path d="M200 96 L250 60 L264 82 L224 112 Z" fill="${c.light}" stroke="${c.dark}" stroke-width="1.5"/>`;
  out += `<rect x="191" y="96" width="18" height="62" rx="3" fill="${c.dark}" opacity="0.35"/>`;
  out += button(200, 118, c.light) + button(200, 142, c.light);
  return out;
}

function collar(c: Ctx, color = c.light) {
  return `<path d="M150 58 L200 92 L176 120 L138 72 Z" fill="${color}" stroke="${c.dark}" stroke-width="1.6"/>
    <path d="M250 58 L200 92 L224 120 L262 72 Z" fill="${color}" stroke="${c.dark}" stroke-width="1.6"/>`;
}

function shirt(c: Ctx) {
  let out = c.fill(SHIRT);
  out += mirror(`<path d="M48 300 L88 310 L84 330 L44 320 Z" fill="${c.dark}" opacity="0.55"/>` + stitchLine("M80 160 L96 300", c.darker));
  out += `<path d="M150 58 C172 70 228 70 250 58 L200 92 Z" fill="${c.darker}" opacity="0.5"/>`;
  out += collar(c);
  out += line("M200 92 L200 345", c.dark, 1.6, 0.8);
  out += line("M208 96 L208 345", c.dark, 1, 0.45);
  for (let y = 124; y < 340; y += 40) out += button(200, y, c.light, 4);
  out += `<path d="M226 146 h40 v44 l-20 7 l-20 -7 Z" fill="none" stroke="${c.dark}" stroke-width="1.6"/>`;
  out += stitchLine("M110 336 C170 342 230 342 290 336", c.darker);
  return out;
}

function campShirt(c: Ctx) {
  let out = c.fill(SHORT_SHIRT);
  out += `<path d="M150 58 C172 70 228 70 250 58 L200 100 Z" fill="${c.darker}" opacity="0.5"/>`;
  out += `<path d="M150 58 L200 100 L166 128 L132 76 Z" fill="${c.light}" stroke="${c.dark}" stroke-width="1.6"/>
    <path d="M250 58 L200 100 L234 128 L268 76 Z" fill="${c.light}" stroke="${c.dark}" stroke-width="1.6"/>`;
  out += mirror(stitchLine("M92 168 L58 145", c.darker));
  out += line("M200 100 L200 345", c.dark, 1.6, 0.8);
  for (let y = 140; y < 340; y += 44) out += button(200, y, "#7a5a3a", 4.5);
  out += `<path d="M226 150 h40 v42 l-20 6 l-20 -6 Z" fill="none" stroke="${c.dark}" stroke-width="1.6"/>`;
  return out;
}

function ribCuffs(c: Ctx, d: string) {
  return `<path d="${d}" fill="${c.dark}"/>` + line(d, c.darker, 1, 0.5);
}

function longBody(c: Ctx, d = LONG) {
  let out = c.fill(d);
  out += mirror(ribCuffs(c, "M48 300 L88 310 L84 332 L44 322 Z"));
  out += ribCuffs(c, "M108 344 C170 352 230 352 292 344 L292 366 C230 374 170 374 108 366 Z");
  return out;
}

function hoodie(c: Ctx, zip = false) {
  let out = `<path d="M134 78 C120 18 280 18 266 78 C254 108 146 108 134 78 Z" fill="${c.dark}"/>`;
  out += longBody(c);
  out += c.fill("M136 76 C124 26 276 26 264 76 C252 104 148 104 136 76 Z");
  out += `<path d="M160 72 C156 40 244 40 240 72 C232 90 168 90 160 72 Z" fill="${c.darker}"/>`;
  if (zip) {
    out += line("M200 96 L200 366", "#9aa0a6", 4);
    out += `<rect x="195" y="104" width="10" height="16" rx="2" fill="#c7ccd1"/>`;
    out += mirror(`<path d="M130 250 L188 250 L188 322 L118 322 Z" fill="none" stroke="${c.darker}" stroke-width="2"/>`);
  } else {
    out += `<path d="M140 250 L260 250 L286 322 L114 322 Z" fill="${c.dark}" opacity="0.35"/>`;
    out += line("M140 250 L260 250 L286 322 L114 322 Z", c.darker, 2, 0.6);
    out += line("M182 98 L178 172", "#f2efe8", 3) + line("M218 98 L222 172", "#f2efe8", 3);
    out += `<rect x="174" y="170" width="8" height="12" rx="2" fill="#c7ccd1"/><rect x="218" y="170" width="8" height="12" rx="2" fill="#c7ccd1"/>`;
  }
  return out;
}

function puffer(c: Ctx) {
  let out = `<path d="M134 78 C120 14 280 14 266 78 C254 108 146 108 134 78 Z" fill="${c.dark}"/>`;
  out += c.fill(LONG);
  out += `<g clip-path="url(#garment)">`;
  for (let y = 112; y < 360; y += 34)
    out += line(`M20 ${y} Q200 ${y + 10} 380 ${y}`, c.darker, 2.2, 0.55) + line(`M20 ${y - 14} Q200 ${y - 4} 380 ${y - 14}`, "#ffffff", 6, 0.08);
  out += `</g>`;
  out += c.fill("M138 76 C126 22 274 22 262 76 C250 102 150 102 138 76 Z");
  out += `<path d="M162 72 C158 42 242 42 238 72 C230 88 170 88 162 72 Z" fill="${c.darker}"/>`;
  out += line("M200 92 L200 350", "#2b2b2b", 4);
  out += `<rect x="195" y="98" width="10" height="18" rx="2" fill="#d0d4d8"/>`;
  out += mirror(line("M128 236 L136 290", c.darker, 3, 0.8));
  out += mirror(`<path d="M48 300 L88 310 L84 330 L44 320 Z" fill="${c.darker}"/>`);
  return out;
}

function sweater(c: Ctx) {
  let out = longBody(c);
  out += `<path d="M156 64 C174 84 226 84 244 64 C226 74 174 74 156 64 Z" fill="${c.darker}" opacity="0.5"/>`;
  out += line("M150 60 C168 92 232 92 250 60", c.dark, 10);
  out += `<g clip-path="url(#garment)" opacity="0.55">`;
  for (const x of [150, 200, 250]) {
    for (let y = 100; y < 340; y += 28)
      out += line(`M${x - 10} ${y} C${x - 10} ${y + 14} ${x + 10} ${y + 6} ${x + 10} ${y + 22}`, c.darker, 3.5) +
        line(`M${x + 10} ${y} C${x + 10} ${y + 14} ${x - 10} ${y + 6} ${x - 10} ${y + 22}`, c.light, 3);
    out += line(`M${x - 18} 96 L${x - 18} 340`, c.darker, 1.4) + line(`M${x + 18} 96 L${x + 18} 340`, c.darker, 1.4);
  }
  out += `</g>`;
  return out;
}

function cardigan(c: Ctx) {
  let out = longBody(c);
  out += `<path d="M150 58 C168 70 232 70 250 58 L206 210 L194 210 Z" fill="${shade(c.base, 0.55)}"/>`;
  out += line("M150 58 L196 212", c.dark, 9) + line("M250 58 L204 212", c.dark, 9);
  out += line("M200 212 L200 366", c.dark, 10);
  for (let y = 226; y < 360; y += 30) out += button(200, y, "#7a5a3a", 5);
  out += mirror(`<path d="M128 262 h40 v34 h-40 Z" fill="none" stroke="${c.darker}" stroke-width="1.8"/>`);
  return out;
}

function trackJacket(c: Ctx) {
  let out = c.fill(LONG);
  out += mirror(line("M92 92 Q76 140 56 300", c.accent, 5) + line("M102 96 Q86 146 68 304", c.accent, 5));
  out += mirror(`<path d="M48 300 L88 310 L84 330 L44 320 Z" fill="${c.darker}"/>`);
  out += `<path d="M108 344 C170 352 230 352 292 344 L292 364 C230 372 170 372 108 364 Z" fill="${c.darker}"/>`;
  out += `<path d="M152 52 C170 62 230 62 248 52 L252 76 C230 86 170 86 148 76 Z" fill="${c.darker}"/>`;
  out += line("M200 70 L200 362", "#cfd3d8", 3.5);
  out += `<rect x="195" y="74" width="10" height="18" rx="2" fill="#e6e9ec"/>`;
  out += mirror(line("M130 250 L140 300", "#cfd3d8", 2.5));
  return out;
}

function denimJacket(c: Ctx) {
  const d = "M150 58 L250 58 L300 80 Q318 90 324 122 L352 300 L312 310 L290 172 L290 320 L110 320 L110 172 L88 310 L48 300 L76 122 Q82 90 100 80 Z";
  let out = c.fill(d);
  out += `<path d="M110 300 L290 300 L290 330 L110 330 Z" fill="${c.dark}"/>`;
  out += stitchLine("M110 306 L290 306", c.accent) + stitchLine("M110 324 L290 324", c.accent);
  out += mirror(`<path d="M48 300 L88 310 L84 330 L44 320 Z" fill="${c.dark}"/>` + stitchLine("M50 306 L86 315", c.accent));
  out += `<path d="M150 58 C172 70 228 70 250 58 L200 92 Z" fill="${c.darker}" opacity="0.5"/>`;
  out += collar(c, c.dark);
  out += line("M200 92 L200 330", c.darker, 2);
  for (let y = 120; y < 320; y += 44) out += button(206, y, "#b98a4a", 5);
  out += mirror(`<path d="M126 140 h48 v14 l-24 10 l-24 -10 Z" fill="${c.dark}"/>` + stitchLine("M130 160 L130 220 L170 220 L170 160", c.accent) + button(150, 150, "#b98a4a", 4));
  out += mirror(stitchLine("M150 222 L150 300", c.accent));
  return out;
}

function kurta(c: Ctx, length = 384) {
  const d = `M156 52 L244 52 L292 74 Q308 84 312 112 L338 300 L304 308 L284 164 L288 ${length - 10} L276 ${length} L124 ${length} L112 ${length - 10} L116 164 L96 308 L62 300 L88 112 Q92 84 108 74 Z`;
  let out = c.fill(d);
  out += `<rect x="168" y="46" width="64" height="16" rx="6" fill="${c.dark}"/>`;
  out += line("M200 62 L200 172", c.dark, 2);
  for (let y = 86; y < 170; y += 26) out += button(200, y, shade(c.base, 0.5), 4);
  out += mirror(line(`M118 ${length - 70} L116 ${length}`, c.darker, 2));
  out += mirror(`<path d="M62 300 L96 308 L94 324 L60 316 Z" fill="${c.dark}"/>`);
  return out;
}

function kurti(c: Ctx) {
  const d = "M158 54 C176 70 224 70 242 54 L290 74 Q304 84 308 110 L326 236 L292 244 L280 160 L300 376 L100 376 L120 160 L108 244 L74 236 L92 110 Q96 84 110 74 Z";
  let out = c.fill(d);
  out += `<path d="M158 54 C172 104 228 104 242 54 C228 74 172 74 158 54 Z" fill="${c.darker}" opacity="0.6"/>`;
  out += `<path d="M150 58 C166 124 234 124 250 58" fill="none" stroke="${c.accent}" stroke-width="10" opacity="0.9"/>`;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = 150 + t * 100;
    const y = 58 + Math.sin(t * Math.PI) * 50;
    out += `<circle cx="${x}" cy="${y + 2}" r="2.6" fill="${c.dark}"/>`;
  }
  out += mirror(`<path d="M74 236 L108 244 L106 258 L72 250 Z" fill="${c.accent}"/>`);
  out += `<path d="M100 376 L300 376 L298 358 L102 358 Z" fill="${c.accent}" opacity="0.9"/>`;
  out += mirror(line("M118 300 L104 376", c.darker, 2));
  return out;
}

function daura(c: Ctx, legs = true) {
  let out = "";
  if (legs)
    out += c.fill("M142 300 L258 300 L250 392 L214 392 L200 330 L186 392 L150 392 Z", shade(c.base, -0.06));
  const d = "M156 52 L244 52 L292 74 Q308 84 312 112 L336 290 L302 298 L284 164 L292 336 L108 336 L116 164 L98 298 L64 290 L88 112 Q92 84 108 74 Z";
  out += c.fill(d);
  out += `<rect x="168" y="46" width="64" height="15" rx="6" fill="${c.dark}"/>`;
  out += line("M232 60 C214 150 160 230 126 334", c.dark, 2.5);
  out += line("M238 62 C222 150 168 234 134 334", c.darker, 1, 0.4);
  const ties: [number, number][] = [[224, 96], [206, 150], [182, 200], [156, 258]];
  for (const [x, y] of ties)
    out += `<path d="M${x} ${y} l14 -6 l-2 10 Z M${x} ${y} l14 6 l-6 6 Z" fill="${c.darker}"/>` + line(`M${x} ${y} l10 18`, c.darker, 2);
  out += mirror(`<path d="M64 290 L98 298 L96 312 L62 304 Z" fill="${c.dark}"/>`);
  return out;
}

function waistcoat(c: Ctx) {
  const d = "M150 52 L250 52 L270 70 L276 120 Q262 150 266 170 L286 352 L210 360 L200 350 L190 360 L114 352 L134 170 Q138 150 124 120 L130 70 Z";
  let out = c.fill(d);
  out += `<path d="M150 52 L200 170 L250 52 Z" fill="#f1ece2"/>`;
  out += `<rect x="168" y="44" width="64" height="16" rx="6" fill="${c.darker}"/>`;
  out += line("M150 52 L200 172 L250 52", c.darker, 3);
  out += line("M200 172 L200 352", c.darker, 2);
  for (let y = 196; y < 350; y += 34) out += button(206, y, "#d8b25a", 5);
  out += mirror(line("M136 250 L176 246", c.darker, 3));
  return out;
}

function topi(c: Ctx) {
  /* The Dhaka topi: higher on one side, with the dip at the front. */
  const d = "M82 292 C76 240 86 184 104 150 C150 132 220 100 300 84 C318 140 326 220 320 292 C270 278 230 276 204 284 C180 276 130 278 82 292 Z";
  let out = c.fill(d);
  out += `<path d="M82 292 C130 278 180 276 204 284 C230 276 270 278 320 292 L322 308 C270 294 230 292 204 300 C180 292 130 294 80 308 Z" fill="${c.darker}"/>`;
  out += line("M104 150 C160 150 250 120 300 84", c.darker, 3, 0.7);
  return out;
}

function dress(c: Ctx) {
  let out = c.fill("M160 54 L240 54 L276 80 L300 120 L268 138 L256 120 L246 196 L330 384 L70 384 L154 196 L144 120 L132 138 L100 120 L124 80 Z");
  out += `<path d="M160 54 L200 150 L240 54 C226 60 174 60 160 54 Z" fill="${c.darker}" opacity="0.55"/>`;
  out += line("M160 54 L200 150 L240 54", c.dark, 3);
  out += line("M200 150 L120 384", c.dark, 2.5, 0.7);
  out += `<path d="M150 192 L250 192 L248 208 L152 208 Z" fill="${c.dark}"/>`;
  out += `<path d="M246 198 C268 188 280 206 262 214 Z M246 198 C270 212 262 228 248 222 Z" fill="${c.dark}"/>`;
  out += line("M248 206 L238 286", c.dark, 6) + line("M252 206 L268 276", c.dark, 6);
  out += mirror(`<path d="M100 120 C112 132 124 140 132 138" fill="none" stroke="${c.dark}" stroke-width="2"/>`);
  return out;
}

function squareTop(c: Ctx) {
  const d = "M140 58 L174 58 L176 100 L224 100 L226 58 L260 58 L286 84 L312 140 L280 156 L268 136 L266 330 C230 338 170 338 134 330 L132 136 L120 156 L88 140 L114 84 Z";
  let out = c.fill(d);
  out += `<path d="M176 100 L224 100 L226 58 L174 58 Z" fill="${shade(c.base, 0.75)}"/>`;
  out += line("M174 58 L176 100 L224 100 L226 58", c.dark, 6);
  return out;
}

function puffBlouse(c: Ctx) {
  let out = "";
  out += mirror(c.fill("M118 82 C60 70 34 140 52 196 C70 236 112 222 122 196 Z") + `<path d="M50 190 C66 216 100 214 116 196 L120 214 C102 232 66 232 46 206 Z" fill="${c.dark}"/>`);
  out += c.fill("M150 58 C170 76 230 76 250 58 L284 80 L290 340 C230 350 170 350 110 340 L116 80 Z");
  out += `<path d="M158 62 C176 90 224 90 242 62 C224 74 176 74 158 62 Z" fill="${c.darker}" opacity="0.4"/>`;
  out += line("M150 58 C170 94 230 94 250 58", c.dark, 4);
  for (let y = 112; y < 340; y += 34) out += `<circle cx="200" cy="${y}" r="5" fill="${c.light}" stroke="${c.dark}" stroke-width="1.2"/>`;
  out += mirror(`<path d="M68 110 Q84 140 72 180" fill="none" stroke="${c.dark}" stroke-width="1.5" opacity="0.6"/>`);
  return out;
}

function pleatedSkirt(c: Ctx) {
  let out = c.fill("M140 82 L260 82 L340 372 C250 384 150 384 60 372 Z");
  out += `<g clip-path="url(#garment)">`;
  for (let i = 0; i <= 16; i++) {
    const top = 140 + (120 * i) / 16;
    const bottom = 60 + (280 * i) / 16;
    out += line(`M${top} 90 L${bottom} 384`, i % 2 ? c.dark : c.light, i % 2 ? 2 : 3, 0.55);
  }
  out += `</g>`;
  out += `<path d="M136 60 L264 60 L262 88 L138 88 Z" fill="${c.dark}"/>`;
  return out;
}

function jeans(c: Ctx, mom = false) {
  const d = mom
    ? "M128 48 L272 48 L300 370 L216 370 L200 168 L184 370 L100 370 Z"
    : "M128 54 L272 54 L290 370 L220 370 L200 160 L180 370 L110 370 Z";
  let out = c.fill(d);
  out += `<path d="M128 ${mom ? 48 : 54} L272 ${mom ? 48 : 54} L273 ${mom ? 76 : 80} L127 ${mom ? 76 : 80} Z" fill="${c.dark}"/>`;
  out += stitchLine(`M128 ${mom ? 72 : 76} L272 ${mom ? 72 : 76}`, c.accent);
  for (const x of [140, 176, 224, 260]) out += `<rect x="${x - 4}" y="${mom ? 44 : 50}" width="8" height="34" rx="2" fill="${c.dark}" stroke="${c.accent}" stroke-width="1" stroke-dasharray="3 2"/>`;
  out += button(200, mom ? 62 : 67, "#b98a4a", 5.5);
  out += stitchLine("M210 84 L210 146 Q206 160 196 162", c.accent);
  out += mirror(stitchLine(`M132 ${mom ? 80 : 84} Q150 132 178 ${mom ? 80 : 84}`, c.accent));
  out += stitchLine("M226 92 L246 92 L246 112 L226 112", c.accent, 1.2);
  out += mirror(stitchLine(`M${mom ? 104 : 113} 356 L184 356`, c.accent));
  out += `<g clip-path="url(#garment)" opacity="0.35">` + mirror(line("M150 140 Q160 240 146 360", "#ffffff", 14, 0.25)) + `</g>`;
  return out;
}

function chinos(c: Ctx) {
  let out = c.fill("M130 56 L270 56 L286 370 L220 370 L200 162 L180 370 L114 370 Z");
  out += `<path d="M130 56 L270 56 L271 80 L129 80 Z" fill="${c.dark}"/>`;
  for (const x of [142, 178, 222, 258]) out += `<rect x="${x - 4}" y="52" width="8" height="32" rx="2" fill="${c.dark}"/>`;
  out += button(200, 68, c.darker, 5);
  out += line("M206 84 L206 150 Q204 158 196 160", c.darker, 1.5, 0.6);
  out += mirror(line("M134 82 L156 128", c.darker, 2, 0.7));
  out += mirror(line("M152 180 L148 366", c.dark, 1.4, 0.6));
  out += mirror(stitchLine("M116 356 L182 356", c.darker));
  return out;
}

function joggers(c: Ctx, denim = false) {
  let out = c.fill("M128 56 L272 56 L280 120 L274 350 L216 350 L200 168 L184 350 L126 350 L120 120 Z");
  out += mirror(`<path d="M124 340 L186 340 L184 374 L128 374 Z" fill="${c.dark}"/>` + line("M132 350 L182 350 M132 362 L182 362", c.darker, 1, 0.5));
  out += `<path d="M126 52 L274 52 L276 86 L124 86 Z" fill="${c.dark}"/>`;
  out += line("M126 62 L274 62 M126 70 L274 70 M126 78 L274 78", c.darker, 1, 0.4);
  if (!denim) out += line("M192 84 Q188 120 178 126", "#f2efe8", 3) + line("M208 84 Q212 120 222 126", "#f2efe8", 3);
  else out += mirror(stitchLine("M132 90 Q150 132 176 90", c.accent));
  out += mirror(line("M132 110 L146 170", c.darker, 3, 0.7));
  return out;
}

function shorts(c: Ctx) {
  let out = c.fill("M126 96 L274 96 L300 270 L216 282 L200 176 L184 282 L100 270 Z");
  out += `<path d="M126 96 L274 96 L275 120 L125 120 Z" fill="${c.dark}"/>`;
  for (const x of [140, 178, 222, 260]) out += `<rect x="${x - 4}" y="92" width="8" height="32" rx="2" fill="${c.dark}"/>`;
  out += button(200, 108, c.darker, 5);
  out += mirror(line("M130 122 L152 166", c.darker, 2, 0.7));
  out += mirror(stitchLine("M104 256 L184 268", c.darker));
  return out;
}

function frock(c: Ctx) {
  let out = "";
  out += c.fill("M146 192 L254 192 C300 250 334 310 346 360 C280 382 120 382 54 360 C66 310 100 250 146 192 Z", shade(c.base, 0.35), { pattern: false });
  for (let x = 60; x < 340; x += 28) out += `<path d="M${x} 364 q14 14 28 0" fill="none" stroke="${c.dark}" stroke-width="1.5" opacity="0.5"/>`;
  out += c.fill("M148 192 L252 192 C290 246 314 296 324 340 C270 358 130 358 76 340 C86 296 110 246 148 192 Z");
  out += `<g clip-path="url(#garment)">` + [110, 150, 200, 250, 290].map((x) => line(`M200 196 L${x} 356`, c.dark, 2, 0.35)).join("") + `</g>`;
  out += mirror(c.fill("M150 76 C108 62 92 106 106 130 C120 148 146 138 152 120 Z", shade(c.base, 0.2)));
  out += c.fill("M152 66 C170 82 230 82 248 66 L254 194 L146 194 Z");
  out += line("M152 66 C170 92 230 92 248 66", c.dark, 5);
  out += `<path d="M144 184 L256 184 L256 202 L144 202 Z" fill="${c.accent}"/>`;
  out += `<path d="M200 193 C176 172 160 200 176 208 Z M200 193 C224 172 240 200 224 208 Z" fill="${c.accent}" stroke="${c.dark}" stroke-width="1.2"/><circle cx="200" cy="194" r="7" fill="${c.accent}" stroke="${c.dark}" stroke-width="1.2"/>`;
  return out;
}

function kidsSet(c: Ctx) {
  let out = `<g transform="translate(60 -6) scale(0.7)">${tee(c)}</g>`;
  const s = { ...c, base: c.accent, dark: shade(c.accent, -0.25), darker: shade(c.accent, -0.45), light: shade(c.accent, 0.3) };
  out += `<g transform="translate(90 168) scale(0.55)">` +
    s.fill("M126 96 L274 96 L300 270 L216 282 L200 176 L184 282 L100 270 Z", c.accent) +
    `<path d="M126 96 L274 96 L275 124 L125 124 Z" fill="${s.dark}"/>` + line("M190 120 Q186 150 176 158", "#ffffff", 4) + line("M210 120 Q214 150 224 158", "#ffffff", 4) + `</g>`;
  out += `<g transform="translate(200 120)"><path d="M-14 -10 l6 12 l13 2 l-10 9 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -9 l13 -2 Z" fill="#ffffff" opacity="0.9"/></g>`;
  return out;
}

function saree(c: Ctx) {
  const gold = c.accent;
  let out = c.fill("M70 160 C150 140 250 140 330 160 L330 330 C250 346 150 346 70 330 Z");
  out += `<path d="M70 300 C150 316 250 316 330 300 L330 330 C250 346 150 346 70 330 Z" fill="${gold}"/>`;
  out += `<path d="M70 160 C150 140 250 140 330 160 L330 182 C250 164 150 164 70 182 Z" fill="${gold}"/>`;
  out += `<g clip-path="url(#garment)">`;
  for (let x = 82; x < 330; x += 20) out += `<path d="M${x} 318 l6 -8 l6 8 l-6 8 Z" fill="${c.darker}"/><path d="M${x} 170 l6 -6 l6 6 l-6 6 Z" fill="${c.darker}"/>`;
  out += `</g>`;
  for (let y = 200; y < 300; y += 26) for (let x = 96; x < 320; x += 30) out += `<circle cx="${x + ((y / 26) % 2) * 15}" cy="${y}" r="3.2" fill="${gold}"/>`;
  out += c.fill("M188 154 C220 150 268 118 300 70 L344 92 C320 170 262 222 226 232 C210 214 196 186 188 154 Z", c.dark, { pattern: false });
  out += `<path d="M300 70 L344 92 C340 110 334 124 326 138 L284 112 C292 98 298 84 300 70 Z" fill="${gold}"/>`;
  for (let i = 0; i < 6; i++) out += `<circle cx="${300 + i * 6}" cy="${100 + i * 4}" r="3" fill="${c.darker}"/>`;
  out += `<path d="M84 96 L172 96 L172 140 L84 140 Z" fill="${c.dark}" stroke="${gold}" stroke-width="5"/>`;
  return out;
}

function lehenga(c: Ctx) {
  const gold = c.accent;
  let out = c.fill("M150 120 L250 120 L350 380 C250 394 150 394 50 380 Z");
  out += `<g clip-path="url(#garment)">`;
  out += `<path d="M30 340 C150 356 250 356 370 340 L370 400 L30 400 Z" fill="${gold}"/>`;
  for (let x = 50; x < 360; x += 26) out += `<path d="M${x} 352 l8 -10 l8 10 l-8 10 Z" fill="${c.darker}"/>`;
  for (let y = 160; y < 330; y += 32)
    for (let x = 60; x < 350; x += 36)
      out += `<g transform="translate(${x + ((y / 32) % 2) * 18} ${y})"><circle r="5" fill="${gold}"/><circle r="9" fill="none" stroke="${gold}" stroke-width="1.2" opacity="0.7"/></g>`;
  out += `</g>`;
  out += `<path d="M146 112 L254 112 L256 132 L144 132 Z" fill="${gold}"/>`;
  out += c.fill("M156 40 C176 54 224 54 244 40 L282 54 L300 86 L272 98 L262 84 L258 108 L142 108 L138 84 L128 98 L100 86 L118 54 Z", c.dark, { pattern: false });
  out += line("M156 40 C176 70 224 70 244 40", gold, 4);
  out += `<path d="M262 60 C300 140 320 260 306 380 L330 380 C344 260 320 130 278 52 Z" fill="${gold}" opacity="0.35"/>`;
  return out;
}

function shawl(c: Ctx) {
  /* Hung over a hanger bar: two layers falling in soft folds, fringed. */
  let out = line("M200 40 C200 26 214 24 214 36 C214 46 200 48 200 58", "#9b8a72", 4);
  out += line("M120 80 L200 58 L280 80", "#9b8a72", 5);
  out += c.fill("M104 84 L296 84 L306 312 C240 322 160 322 94 312 Z", shade(c.base, -0.1));
  out += c.fill("M114 80 L286 80 L292 290 C236 300 164 300 108 290 Z");
  out += `<g clip-path="url(#garment)">` + [130, 160, 200, 240, 270].map((x, i) => line(`M${x} 84 C${x + (i % 2 ? 8 : -8)} 180 ${x + (i % 2 ? -6 : 6)} 240 ${x} 300`, i % 2 ? c.dark : c.light, i % 2 ? 6 : 8, 0.25)).join("") + `</g>`;
  out += `<rect x="108" y="78" width="184" height="10" rx="5" fill="${c.dark}"/>`;
  out += `<path d="M108 276 C164 286 236 286 292 276 L292 290 C236 300 164 300 108 290 Z" fill="${c.dark}" opacity="0.6"/>`;
  for (let x = 110; x < 292; x += 7) out += line(`M${x} ${290 + Math.sin(x) * 1.5} L${x + (x % 3) - 1} 334`, c.dark, 2.2);
  for (let x = 98; x < 306; x += 7) out += line(`M${x} 314 L${x + (x % 3) - 1} 352`, c.darker, 2, 0.7);
  return out;
}

function muffler(c: Ctx) {
  let out = c.fill("M120 60 C80 120 96 200 150 230 L196 360 L250 352 L208 214 C250 180 300 120 280 60 C240 40 160 40 120 60 Z");
  out += c.fill("M150 70 C240 60 268 120 230 190 L206 210 C240 140 210 96 150 100 Z", shade(c.base, -0.15));
  for (let x = 198; x < 250; x += 6) out += line(`M${x} ${360 - (x - 196) * 0.15} L${x + 2} 386`, c.dark, 2.2);
  return out;
}

function scarf(c: Ctx) {
  let out = c.fill("M70 90 C150 60 250 120 330 90 L330 300 C250 330 150 270 70 300 Z");
  out += c.fill("M70 300 C150 270 250 330 330 300 L322 340 C240 366 150 300 80 330 Z", shade(c.base, -0.15));
  out += line("M70 90 C150 60 250 120 330 90", c.dark, 3, 0.6);
  return out;
}

function beanie(c: Ctx, earflap = false) {
  let out = "";
  if (earflap) out += mirror(c.fill("M110 240 L170 250 L132 330 Z", shade(c.base, -0.08)) + line("M132 330 L128 384", c.accent, 3));
  out += c.fill("M100 260 C90 120 310 120 300 260 Z");
  out += `<g clip-path="url(#garment)">`;
  for (let x = 100; x < 300; x += 14) out += line(`M${x} 130 L${x} 260`, c.dark, 2, 0.35);
  out += `</g>`;
  if (!earflap) {
    out += c.fill("M92 240 C160 226 240 226 308 240 L308 300 C240 286 160 286 92 300 Z", shade(c.base, -0.1), { pattern: false });
    for (let x = 96; x < 306; x += 10) out += line(`M${x} 240 L${x} 298`, c.darker, 2.4, 0.5);
    out += `<circle cx="200" cy="112" r="40" fill="${shade(c.base, 0.55)}"/>`;
    for (let a = 0; a < 360; a += 15) {
      const r = (a * Math.PI) / 180;
      out += line(`M200 112 L${200 + Math.cos(r) * 42} ${112 + Math.sin(r) * 42}`, shade(c.base, 0.3), 3, 0.6);
    }
  } else {
    out += `<path d="M100 250 C160 238 240 238 300 250 L300 266 C240 254 160 254 100 266 Z" fill="${c.accent}"/>`;
    out += `<circle cx="200" cy="136" r="16" fill="${c.accent}"/>`;
  }
  return out;
}

function cap(c: Ctx) {
  /* Three-quarter view: crown on the left, the bill reaching out to the right. */
  const crown = "M70 270 C60 160 150 110 220 118 C280 124 316 176 312 262 C240 250 140 252 70 270 Z";
  let out = c.fill(crown);
  out += `<g clip-path="url(#garment)">` +
    line("M196 118 C176 160 168 210 172 262", c.dark, 2, 0.6) +
    line("M250 132 C252 170 258 214 262 256", c.dark, 2, 0.6) +
    line("M136 140 C118 180 106 226 110 264", c.dark, 2, 0.5) + `</g>`;
  out += `<ellipse cx="210" cy="120" rx="10" ry="6" fill="${c.dark}"/>`;
  out += c.fill("M250 252 C300 244 352 250 378 268 C380 286 352 296 318 294 C290 290 262 280 248 270 Z", shade(c.base, -0.12), { pattern: false });
  out += stitchLine("M262 262 C304 254 346 260 366 274", c.light);
  out += `<path d="M70 270 C140 252 240 250 312 262 L314 276 C240 264 140 266 72 284 Z" fill="${c.darker}"/>`;
  out += `<g transform="translate(176 200)"><path d="M-30 14 L-11 -14 L-1 0 L10 -18 L30 14 Z" fill="${c.accent}"/></g>`;
  return out;
}

function socks(c: Ctx) {
  const colors = ["#2a2f3a", "#e9e6df", "#8b8f96", "#3f5f8a", "#7a2f3a"];
  let out = "";
  colors.forEach((col, i) => {
    const dark = shade(col, -0.25);
    out += `<g transform="translate(${70 + i * 52} ${120 + (i % 2) * 22}) rotate(${-14 + i * 7})">`;
    out += c.fill("M-26 0 L26 0 L26 70 C26 110 58 112 74 124 C88 136 80 160 58 160 L-6 160 C-28 160 -30 140 -26 112 Z", col, { pattern: false });
    out += `<path d="M-26 0 L26 0 L26 20 L-26 20 Z" fill="${dark}"/>`;
    out += line("M-26 7 L26 7 M-26 14 L26 14", shade(col, -0.4), 1, 0.4);
    out += `<path d="M46 120 C70 122 88 140 58 160 L44 160 C58 148 58 132 46 120 Z" fill="${dark}"/>`;
    out += `<path d="M-26 118 C-30 144 -22 160 -6 160 L6 160 C-6 150 -12 134 -26 118 Z" fill="${dark}"/>`;
    out += `</g>`;
  });
  return out;
}

function boxers(c: Ctx) {
  const colors = ["#2f3442", "#5a6577", "#7a2f3a"];
  let out = "";
  colors.forEach((col, i) => {
    out += `<g transform="translate(${-70 + i * 70} ${-40 + i * 50}) scale(0.82)" >`;
    out += c.fill("M110 100 L290 100 L300 230 L214 244 L200 190 L186 244 L100 230 Z", col, { pattern: false });
    out += `<path d="M108 92 L292 92 L292 124 L108 124 Z" fill="${shade(col, -0.35)}"/>`;
    out += line("M108 108 L292 108", "#ffffff", 3, 0.8);
    out += line("M200 124 L200 186", shade(col, -0.3), 2, 0.6);
    out += `</g>`;
  });
  return out;
}

function teePack(c: Ctx, kids = false) {
  const colors = kids ? ["#e8a63a", "#4fa3d9", "#e2566b"] : ["#1d1d1f", "#f1efe9", "#8b8f96"];
  let out = "";
  colors.forEach((col, i) => {
    const sub: Ctx = { ...c, base: col, dark: shade(col, -0.18), darker: shade(col, -0.35), light: shade(col, 0.25) };
    out += `<g transform="translate(${-48 + i * 48} ${-24 + i * 30}) scale(${kids ? 0.74 : 0.8}) translate(${kids ? 70 : 50} ${kids ? 70 : 50})">${tee(sub)}`;
    if (kids) {
      const icon = [
        `<path d="M0 -26 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2 Z" fill="#ffffff"/>`,
        `<circle r="22" fill="#ffffff"/><circle cx="-8" cy="-4" r="4" fill="${col}"/><circle cx="8" cy="-4" r="4" fill="${col}"/><path d="M-10 8 Q0 16 10 8" stroke="${col}" stroke-width="3" fill="none"/>`,
        `<path d="M-26 10 C-26 -24 26 -24 26 10 Z" fill="#ffffff"/><path d="M-26 10 L26 10" stroke="#ffffff" stroke-width="5"/>`,
      ][i];
      out += `<g transform="translate(200 200)">${icon}</g>`;
    }
    out += `</g>`;
  });
  return out;
}

function leggingsPair(c: Ctx) {
  let out = "";
  [c.base, c.accent].forEach((col, i) => {
    const sub = { ...c, base: col, dark: shade(col, -0.2) };
    out += `<g transform="translate(${-50 + i * 100} ${i * 10}) rotate(${i ? 6 : -6} 200 200)">`;
    out += sub.fill("M150 50 L250 50 L256 120 L238 372 L210 372 L200 150 L190 372 L162 372 L144 120 Z", col, { pattern: false });
    out += `<path d="M148 44 L252 44 L254 76 L146 76 Z" fill="${sub.dark}"/>`;
    out += `</g>`;
  });
  return out;
}

function thermal(c: Ctx) {
  const d = "M152 58 C170 74 230 74 248 58 L290 78 Q304 88 308 120 L330 310 L298 318 L280 170 L280 344 C230 350 170 350 120 344 L120 170 L102 318 L70 310 L92 120 Q96 88 110 78 Z";
  let out = c.fill(d);
  out += line("M152 58 C170 86 230 86 248 58", c.dark, 7);
  out += mirror(`<path d="M70 310 L102 318 L100 336 L68 328 Z" fill="${c.dark}"/>`);
  return out;
}

function kurtaSet(c: Ctx) {
  let out = kurti(c);
  out += `<path d="M236 50 C300 120 320 250 300 384 L330 384 C350 250 330 110 262 44 Z" fill="${c.accent}" opacity="0.75"/>`;
  out += line("M262 44 C330 110 350 250 330 384", c.dark, 2, 0.5);
  return out;
}

const DRAW: Record<string, (c: Ctx, s: Spec) => string> = {
  tee: (c, s) => tee(c, s.print),
  polo,
  shirt,
  campShirt,
  hoodie: (c) => hoodie(c),
  kidsZipHoodie: (c) => `<g transform="translate(30 30) scale(0.85)">${hoodie(c, true)}</g>`,
  puffer,
  sweater,
  cardigan,
  trackJacket,
  denimJacket,
  kurta: (c) => kurta(c),
  kurti,
  daura: (c) => daura(c),
  kidsDaura: (c) => `<g transform="translate(40 24) scale(0.8)">${daura(c)}</g>`,
  waistcoat,
  topi,
  wrapDress: dress,
  squareTop,
  puffBlouse,
  pleatedSkirt,
  jeans: (c) => jeans(c),
  momJeans: (c) => jeans(c, true),
  chinos,
  joggers: (c) => joggers(c),
  kidsJoggers: (c) => `<g transform="translate(40 30) scale(0.8)">${joggers(c, true)}</g>`,
  shorts,
  frock,
  kidsSet,
  saree,
  lehenga,
  shawl,
  muffler,
  scarf,
  beanie: (c) => beanie(c),
  earflapCap: (c) => beanie(c, true),
  cap,
  socks,
  boxers,
  teePack: (c) => teePack(c),
  kidsTeePack: (c) => teePack(c, true),
  leggingsPair,
  thermal,
  kurtaSet,
};

/* -------------------------------------------------------------- patterns */

function patternDef(name: string | undefined, c: Ctx) {
  const id = "pat";
  const wrap = (w: number, h: number, inner: string, extra = "") =>
    `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" ${extra}>${inner}</pattern>`;
  switch (name) {
    case "denim":
      return wrap(6, 6, `<path d="M0 6 L6 0" stroke="#ffffff" stroke-width="1" opacity="0.18"/><path d="M-1 1 L1 -1 M5 7 L7 5" stroke="#000" stroke-width="1" opacity="0.15"/>`);
    case "twill":
      return wrap(5, 5, `<path d="M0 5 L5 0" stroke="#000" stroke-width="0.8" opacity="0.12"/>`);
    case "oxford":
      return wrap(4, 4, `<rect width="2" height="2" fill="#ffffff" opacity="0.22"/><rect x="2" y="2" width="2" height="2" fill="#ffffff" opacity="0.22"/>`);
    case "linen":
      return wrap(8, 8, `<path d="M0 2 H8 M0 6 H8" stroke="#000" stroke-width="0.6" opacity="0.08"/><path d="M3 0 V8" stroke="#fff" stroke-width="0.8" opacity="0.15"/>`);
    case "rib":
      return wrap(8, 8, `<rect width="3" height="8" fill="#000" opacity="0.1"/>`);
    case "knit":
      return wrap(12, 10, `<path d="M0 0 L6 6 L12 0 M0 5 L6 11 L12 5" fill="none" stroke="#000" stroke-width="1.2" opacity="0.12"/>`);
    case "cable":
      return wrap(10, 10, `<path d="M0 0 L5 5 L10 0" fill="none" stroke="#000" stroke-width="1" opacity="0.1"/>`);
    case "fleece":
      return wrap(6, 6, `<circle cx="2" cy="2" r="1" fill="#fff" opacity="0.12"/><circle cx="5" cy="5" r="0.8" fill="#000" opacity="0.1"/>`);
    case "melange":
      return wrap(5, 5, `<circle cx="1" cy="1" r="0.9" fill="#fff" opacity="0.25"/><circle cx="3.5" cy="3" r="0.8" fill="#000" opacity="0.15"/>`);
    case "waffle":
      return wrap(10, 10, `<rect x="1" y="1" width="8" height="8" fill="none" stroke="#000" stroke-width="1" opacity="0.12"/>`);
    case "weave":
      return wrap(6, 6, `<path d="M0 3 H6" stroke="#fff" stroke-width="1" opacity="0.15"/><path d="M3 0 V6" stroke="#000" stroke-width="0.6" opacity="0.08"/>`);
    case "satin":
      return wrap(40, 40, `<rect width="40" height="40" fill="url(#sheen)" />`);
    case "check":
      return wrap(40, 40, `<rect width="40" height="14" fill="#000" opacity="0.22"/><rect width="14" height="40" fill="#000" opacity="0.22"/><path d="M0 26 H40 M26 0 V40" stroke="#ffffff" stroke-width="2" opacity="0.5"/>`);
    case "floral":
      return wrap(46, 46, [[10, 10], [33, 32]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.6" ry="6.5" cy="-6" fill="${c.accent}" opacity="0.85" transform="rotate(${a})"/>`).join("")}<circle r="2.6" fill="#e3a03a"/></g>`).join("") + `<path d="M24 6 q4 4 0 8 M4 30 q4 4 0 8" stroke="#3f7a52" stroke-width="2" fill="none" opacity="0.6"/>`);
    case "block":
      return wrap(36, 36, `<g transform="translate(18 18)" fill="${c.accent}" opacity="0.8"><circle r="4"/>${[0, 90, 180, 270].map((a) => `<path d="M0 -6 L4 -12 L0 -16 L-4 -12 Z" transform="rotate(${a})"/>`).join("")}</g><circle cx="0" cy="0" r="2" fill="${c.accent}" opacity="0.6"/><circle cx="36" cy="36" r="2" fill="${c.accent}" opacity="0.6"/>`);
    case "paisley":
      return wrap(54, 54, `<g transform="translate(16 18) rotate(-20)"><path d="M0 12 C-14 4 -10 -16 4 -14 C14 -12 14 0 6 2 C2 3 2 8 0 12 Z" fill="${c.accent}" opacity="0.85"/><circle cx="2" cy="-6" r="3" fill="${c.darker}"/></g><g transform="translate(42 44) rotate(160)"><path d="M0 12 C-14 4 -10 -16 4 -14 C14 -12 14 0 6 2 C2 3 2 8 0 12 Z" fill="${c.accent}" opacity="0.85"/></g>`);
    case "dhaka": {
      const cols = ["#d13a3a", "#f0b429", "#2f6db5", "#2e8b57", "#f4f1ea", "#8b2e9b"];
      let inner = "";
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++) {
          const x = col * 16;
          const y = row * 16;
          const k = (row * 3 + col) % cols.length;
          inner += `<path d="M${x} ${y + 8} L${x + 8} ${y} L${x + 16} ${y + 8} L${x + 8} ${y + 16} Z" fill="${cols[k]}"/>`;
          inner += `<path d="M${x + 4} ${y + 8} L${x + 8} ${y + 4} L${x + 12} ${y + 8} L${x + 8} ${y + 12} Z" fill="${cols[(k + 3) % cols.length]}"/>`;
        }
      return wrap(48, 48, inner + `<path d="M0 0 H48 M0 16 H48 M0 32 H48" stroke="#1d1d1f" stroke-width="1.2" opacity="0.7"/>`);
    }
    default:
      return "";
  }
}

/* -------------------------------------------------------------- render */

function svgFor(key: string, spec: Spec, color: string) {
  const base = color;
  const lum = luminance(base);
  const c: Ctx = {
    base,
    dark: shade(base, lum > 0.75 ? -0.14 : -0.22),
    darker: shade(base, lum > 0.75 ? -0.3 : -0.42),
    light: shade(base, 0.22),
    accent: spec.accent ?? shade(base, 0.6),
    stitch: shade(base, -0.4),
    fill: () => "",
  };
  const pattern = patternDef(spec.pattern, c);
  let clipD = "";
  c.fill = (d, col = c.base, opts = {}) => {
    if (!clipD) clipD = d;
    const usePattern = opts.pattern !== false && !!pattern;
    return (
      `<path d="${d}" fill="${col}"/>` +
      (usePattern ? `<path d="${d}" fill="url(#pat)"/>` : "") +
      `<path d="${d}" fill="url(#shade)"/>` +
      `<path d="${d}" fill="none" stroke="${shade(col, -0.35)}" stroke-width="1.2" opacity="0.5"/>`
    );
  };
  const body = DRAW[spec.garment](c, spec);
  const bg = spec.bg ?? (lum > 0.8 ? "#e9e4dc" : shade(base, 0.86));
  const bg2 = shade(bg, -0.06);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="${shade(bg, 0.35)}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </radialGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#2a2016" flood-opacity="0.28"/>
    </filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>
    ${pattern}
    <clipPath id="garment"><path d="__CLIP__"/></clipPath>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <rect width="400" height="400" filter="url(#grain)"/>
  <g filter="url(#shadow)">${body}</g>
</svg>`.replace("__CLIP__", clipD);
}

const outMobile = new URL("../assets/catalog/", import.meta.url);
const outWeb = new URL("../../web/public/img/", import.meta.url);
mkdirSync(outMobile, { recursive: true });
mkdirSync(outWeb, { recursive: true });

const wanted = products.filter((p) => p.imageKey?.startsWith("art-"));
const missing = wanted.filter((p) => !SPECS[p.imageKey!]);
if (missing.length) throw new Error(`No drawing for: ${missing.map((p) => p.imageKey).join(", ")}`);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
const only = process.argv[2];
for (const product of wanted) {
  const key = product.imageKey!;
  if (only && !key.includes(only)) continue;
  const spec = SPECS[key];
  const svg = svgFor(key, spec, product.colors?.[0]?.hex ?? "#8b8f96");
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  const jpg = await page.screenshot({ type: "jpeg", quality: 84, clip: { x: 0, y: 0, width: 800, height: 800 } });
  writeFileSync(new URL(`${key}.jpg`, outMobile), jpg);
  writeFileSync(new URL(`${key}.jpg`, outWeb), jpg);
  console.log(`drew ${key}`);
}
await browser.close();
