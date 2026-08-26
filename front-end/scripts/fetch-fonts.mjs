/**
 * front-end/scripts/fetch-fonts.mjs
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Downloads the web fonts into `static/fonts/` and writes `scripts/fonts.json`, which
 * `build-tokens.mjs` turns into the `@font-face` rules in `src/app.css`.
 *
 * WHY SELF-HOST rather than link `fonts.googleapis.com`:
 *
 *   1. A ward network that cannot reach Google renders the whole board in a fallback face. With
 *      `font-display: swap` that is a visible reflow of every number seconds after the screen
 *      appeared; without it, a blank screen. Shipping the files removes the dependency.
 *   2. Otherwise every page load of a screen that displays PHI sends the viewer's IP and the
 *      referring URL to a third party. That is a disclosure decision, and nobody made it.
 *   3. One fewer origin to reach before first paint.
 *
 * LATIN AND LATIN-EXT ONLY. Google also serves cyrillic, greek and vietnamese subsets; this UI
 * renders English clinical copy and `PT-nnnn` identifiers and can produce none of those glyphs.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolvePath(HERE, '../static/fonts');

/** A browser UA, or Google serves a TTF stylesheet instead of woff2. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const SOURCE =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@100..900' +
  '&family=Sansation:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap';

const KEEP = new Set(['latin', 'latin-ext']);

const css = await fetch(SOURCE, { headers: { 'User-Agent': UA } }).then((r) => r.text());

const faces = [];
const block = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g;
let match;
while ((match = block.exec(css)) !== null) {
  const [, subset, body] = match;
  if (!KEEP.has(subset)) continue;
  faces.push({
    subset,
    family: /font-family: '([^']+)'/.exec(body)[1],
    style: /font-style: ([a-z]+)/.exec(body)[1],
    weight: /font-weight: ([0-9 ]+)/.exec(body)[1].trim(),
    url: /url\((https:[^)]+)\)/.exec(body)[1],
    range: /unicode-range: ([^;]+);/.exec(body)[1].trim(),
  });
}

if (faces.length === 0) {
  throw new Error('No latin faces matched — the upstream stylesheet format changed.');
}

mkdirSync(OUT_DIR, { recursive: true });
for (const face of faces) {
  face.file = `${face.family.toLowerCase()}-${face.style}-${face.weight.replace(/\s+/g, '-')}-${face.subset}.woff2`;
  const bytes = Buffer.from(
    await fetch(face.url, { headers: { 'User-Agent': UA } }).then((r) => r.arrayBuffer()),
  );
  writeFileSync(resolvePath(OUT_DIR, face.file), bytes);
  face.bytes = bytes.length;
}

// The remote URL is deliberately absent: this manifest describes what is ON DISK, and carrying an
// address in it invites someone to reference it from the stylesheet — which is the third-party
// request this whole script exists to remove. Listed field by field rather than by rest-spread, so
// adding one upstream cannot leak into the output unnoticed.
const manifest = faces.map((face) => ({
  subset: face.subset,
  family: face.family,
  style: face.style,
  weight: face.weight,
  range: face.range,
  file: face.file,
  bytes: face.bytes,
}));
writeFileSync(resolvePath(HERE, 'fonts.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const total = faces.reduce((sum, face) => sum + face.bytes, 0);
console.log(`${faces.length} faces, ${(total / 1024).toFixed(0)} KB → static/fonts/`);
console.log('Run `node scripts/build-tokens.mjs` to regenerate the @font-face rules.');
