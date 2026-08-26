/**
 * PulseMind — brand asset preparation.
 *
 *   node scripts/build-brand.mjs      # from `front-end/`
 *
 * The product owner supplied three files on 2026-08-19 and they are the SOURCE, kept exactly as
 * delivered in `static/images/`. This script derives what the app actually loads. It exists because
 * all three need work that must not be done by hand:
 *
 *   1. THE WORDMARKS ARE 1920x1080 WITH THE ARTWORK FLOATING IN THE MIDDLE, and they are two files
 *      for what is one drawing. The ink occupies 1706x302 at (92, 417) — 8% of the canvas — and the
 *      two differ only in colour. `scripts/trace-logo.mjs` turns the pair into ONE themeable SVG,
 *      which is what `Logo.svelte` renders; the viewBox does the cropping and a vector needs no
 *      scaling. This script checks the invariant that makes one file legal — that the two sources
 *      still trace to the same shape — and fails if a re-export ever breaks it.
 *
 *   2. `animation.gif` CANNOT BE STOPPED. A GIF animates whatever `prefers-reduced-motion` says, and
 *      there is no CSS or HTML attribute that pauses one. The only honest fix is a still image to
 *      swap to, so this extracts the GIF's first frame — which is why a GIF decoder lives here.
 *
 * Both PNGs were verified to have a FULLY TRANSPARENT background (alpha 0 at every edge pixel, zero
 * opaque near-white pixels), so the dark-theme wordmark does not paint a white slab. If a future
 * re-export loses that, this script says so and exits non-zero rather than shipping the slab.
 *
 * No dependencies. PNG is inflate + unfilter + deflate, and GIF is LZW — both are in `node:zlib` or
 * are short enough to write, and adding an image library to a clinical frontend's toolchain for one
 * build step is a supply-chain cost with no matching benefit.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';
import { traceLogo } from './trace-logo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(HERE, '..');
const SRC = resolvePath(ROOT, 'static/images');
const OUT_BRAND = resolvePath(ROOT, 'src/lib/assets/brand');

/* ------------------------------------------------------------------------------------------------
 * PNG
 * ---------------------------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Decodes 8-bit RGBA PNG into `{ w, h, data }`. Anything else is an error rather than a guess. */
function decodePng(buf) {
  let p = 8;
  let w = 0;
  let h = 0;
  let colour = 0;
  let depth = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      colour = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || colour !== 6) {
    throw new Error(`expected 8-bit RGBA PNG, got depth ${depth} colour type ${colour}`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[q++];
    const line = raw.subarray(q, q + stride);
    q += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, data: out };
}

function encodePng({ w, h, data }) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: None. The images are flat colour; filtering buys little.
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, body) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'ascii');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The tight bounds of everything that is not fully transparent. */
function inkBounds({ w, h, data }) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  let opaqueWhite = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 8) continue;
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
        opaqueWhite++;
        continue;
      }
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, opaqueWhite };
}

/* `crop` and `downscale` lived here until 2026-08-19 and are deliberately gone with the raster
 * wordmark pair they served. An unused export is a claim that something ships (`docs/LESSONS.md`
 * L-079); the vector needs neither, because a viewBox crops and a vector does not scale.
 */

/* ------------------------------------------------------------------------------------------------
 * GIF — first frame only
 * ---------------------------------------------------------------------------------------------- */

function firstGifFrame(buf) {
  const w = buf.readUInt16LE(6);
  const h = buf.readUInt16LE(8);
  const flags = buf[10];
  let p = 13;
  let gct = null;
  if (flags & 0x80) {
    const n = 2 << (flags & 7);
    gct = buf.subarray(p, p + n * 3);
    p += n * 3;
  }
  let transparent = -1;
  while (p < buf.length) {
    const marker = buf[p];
    if (marker === 0x21) {
      const label = buf[p + 1];
      if (label === 0xf9) {
        const size = buf[p + 2];
        if (buf[p + 3] & 1) transparent = buf[p + 6];
        p += 3 + size + 1;
      } else {
        p += 2;
        while (buf[p] !== 0) p += buf[p] + 1;
        p++;
      }
      continue;
    }
    if (marker !== 0x2c) throw new Error(`unexpected GIF block 0x${marker.toString(16)}`);

    const fx = buf.readUInt16LE(p + 1);
    const fy = buf.readUInt16LE(p + 3);
    const fw = buf.readUInt16LE(p + 5);
    const fh = buf.readUInt16LE(p + 7);
    const lflags = buf[p + 9];
    p += 10;
    let table = gct;
    if (lflags & 0x80) {
      const n = 2 << (lflags & 7);
      table = buf.subarray(p, p + n * 3);
      p += n * 3;
    }
    if (table === null) throw new Error('GIF frame has no colour table');

    const minCode = buf[p++];
    const chunks = [];
    while (buf[p] !== 0) {
      const size = buf[p];
      chunks.push(buf.subarray(p + 1, p + 1 + size));
      p += size + 1;
    }
    const lzw = Buffer.concat(chunks);

    // LZW, LSB-first.
    const clear = 1 << minCode;
    const eoi = clear + 1;
    const indices = new Uint8Array(fw * fh);
    let dict = [];
    const reset = () => {
      dict = [];
      for (let i = 0; i < clear; i++) dict.push([i]);
      dict.push([], []);
    };
    reset();
    let codeSize = minCode + 1;
    let bit = 0;
    let prev = null;
    let at = 0;
    const read = () => {
      let v = 0;
      for (let i = 0; i < codeSize; i++, bit++) {
        v |= ((lzw[bit >> 3] >> (bit & 7)) & 1) << i;
      }
      return v;
    };
    while (bit + codeSize <= lzw.length * 8 && at < indices.length) {
      const code = read();
      if (code === clear) {
        reset();
        codeSize = minCode + 1;
        prev = null;
        continue;
      }
      if (code === eoi) break;
      let entry;
      if (code < dict.length && dict[code].length) entry = dict[code];
      else if (prev !== null) entry = [...prev, prev[0]];
      else break;
      for (const v of entry) if (at < indices.length) indices[at++] = v;
      if (prev !== null) {
        dict.push([...prev, entry[0]]);
        if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
      }
      prev = entry;
    }

    const data = Buffer.alloc(w * h * 4); // transparent canvas
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const idx = indices[y * fw + x];
        if (idx === transparent) continue;
        const o = ((fy + y) * w + (fx + x)) * 4;
        data[o] = table[idx * 3];
        data[o + 1] = table[idx * 3 + 1];
        data[o + 2] = table[idx * 3 + 2];
        data[o + 3] = 255;
      }
    }
    return { w, h, data };
  }
  throw new Error('no image frame found in GIF');
}

/* ------------------------------------------------------------------------------------------------
 * Run
 * ---------------------------------------------------------------------------------------------- */

mkdirSync(OUT_BRAND, { recursive: true });

/**
 * The two supplied wordmarks. `logo-white` is the artwork FOR a white background (the crimson one) —
 * not a white logo.
 *
 * NEITHER IS EMITTED ANY MORE. They were cropped and downscaled into a PNG pair until 2026-08-19,
 * when tracing produced a single themeable vector that supersedes both (**D-32**). They are still
 * READ, because they are still the source of truth and their invariants are still worth checking on
 * every build: the geometry must stay identical between them, and the background must stay
 * transparent.
 */
const WORDMARKS = [
  { file: 'logo-white.png', theme: 'light' },
  { file: 'logo-dark.png', theme: 'dark' },
];

let failed = false;

const masks = {};
for (const { file, theme } of WORDMARKS) {
  const img = decodePng(readFileSync(resolvePath(SRC, file)));
  const b = inkBounds(img);
  if (b.x1 < 0) {
    console.error(`FAIL ${file}: no visible ink`);
    failed = true;
    continue;
  }
  if (b.opaqueWhite > 0) {
    // The dark-theme wordmark is light grey on nothing. If a re-export flattens it onto white, the
    // header grows a white slab on every dark screen — loudly, here, rather than in a ward at 03:00.
    console.error(
      `FAIL ${file}: ${b.opaqueWhite} opaque near-white pixels — the background is not transparent`,
    );
    failed = true;
    continue;
  }
  const mask = new Uint8Array(b.w * b.h);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      mask[y * b.w + x] = img.data[((b.y0 + y) * img.w + b.x0 + x) * 4 + 3] > 127 ? 1 : 0;
    }
  }
  masks[theme] = { mask, b, img };
  console.log(
    `source ${theme.padEnd(5)} ${file} ${img.w}x${img.h} -> ink ${b.w}x${b.h} @ ${b.x0},${b.y0}`,
  );
}

/* THE INVARIANT THE VECTOR DEPENDS ON. One traced file serves both themes only because the two
   sources are the same drawing in different colours. Measured at the time: zero mismatches across
   199 994 ink pixels. If a re-export ever changes one and not the other, the trace below would
   silently ship the dark file's shapes for both — so it is checked rather than remembered. */
if (masks.light && masks.dark) {
  const a = masks.light.mask;
  const c = masks.dark.mask;
  let diff = a.length === c.length ? 0 : -1;
  if (diff === 0) for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) diff++;
  if (diff !== 0) {
    console.error(
      `FAIL the two wordmarks are no longer the same shape (${diff < 0 ? 'different sizes' : diff + ' differing pixels'}).` +
        ' One traced SVG cannot serve both themes; re-export them from one drawing, or split the trace.',
    );
    failed = true;
  } else {
    console.log('check  both wordmarks trace to one shape (0 differing ink pixels)');
  }
}

/* THE VECTOR WORDMARK — one file, both themes (**D-32**).
   Traced from the DARK artwork because that is the file whose two colours separate the letters from
   the accent. Verified by re-rasterising the emitted paths and comparing to the source mask, so a
   tracer bug cannot ship a subtly wrong brand mark. */
{
  const dark = decodePng(readFileSync(resolvePath(SRC, 'logo-dark.png')));
  const b = inkBounds(dark);
  const { svg, report, floor } = traceLogo(dark, b);
  for (const [role, r] of Object.entries(report)) {
    const ok = r.fidelity >= floor;
    console.log(
      `trace  ${role.padEnd(6)} ${String(r.loops).padStart(4)} contours, ${r.pixels} px, fidelity ${(r.fidelity * 100).toFixed(2)}% ${ok ? '' : `FAIL (floor ${(floor * 100).toFixed(1)}%)`}`,
    );
    if (!ok) failed = true;
  }
  writeFileSync(resolvePath(OUT_BRAND, 'pulsemind.svg'), svg);
  console.log(`trace  -> pulsemind.svg ${(svg.length / 1024).toFixed(1)} KB`);
}

const still = firstGifFrame(readFileSync(resolvePath(SRC, 'animation.gif')));
writeFileSync(resolvePath(SRC, 'animation-still.png'), encodePng(still));
console.log(`still  animation.gif frame 1 -> animation-still.png ${still.w}x${still.h}`);

if (failed) process.exit(1);
