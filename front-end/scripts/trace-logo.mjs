/**
 * PulseMind — raster wordmark to ONE themeable SVG (**D-32**).
 *
 * The artwork was supplied as two 1920x1080 PNGs. Measured, they are the same drawing twice:
 *
 *   - their alpha masks match on 199 994 of 199 994 ink pixels — ZERO mismatches, so the geometry is
 *     identical and only the colours differ;
 *   - `logo-dark.png` uses exactly two colours, `rgb(230,225,219)` for the PULSE/MIND letters and
 *     `rgb(237,28,36)` for the E, the ECG line and the stethoscope curve;
 *   - `logo-white.png` uses one, `rgb(205,8,45)` — which is `#CD082D`, the brand red already in the
 *     token stack.
 *
 * So the two files are one shape with two ROLES, and the dark version is the one that separates
 * them. Tracing it yields a single SVG whose word paths and accent paths carry CSS variables, which
 * is what closes D-32: one file, both themes, sharp at any size, and a real source for the favicon.
 *
 * WHY A TRACER RATHER THAN A HAND-DRAWN APPROXIMATION. The wordmark has overlapping letterforms, a
 * heart, an ECG line threaded through the type and a stethoscope curve off the D. Drawing that by
 * eye produces something visibly not the logo. Tracing a flat two-colour image at 1706x302 does not
 * approximate anything: the artwork has no gradients and no soft edges, so the pixel boundary IS the
 * outline, and the only loss is the anti-aliased fringe.
 *
 * THE OUTPUT IS CHECKED, NOT TRUSTED. `verifyTrace` re-rasterises the emitted paths with a scanline
 * fill and compares them to the source mask pixel by pixel. The script fails if agreement drops
 * below its floor, so a tracer bug cannot ship a subtly wrong logo — which on a brand mark is
 * exactly the kind of defect nobody notices in review.
 */

/** Anti-aliased edges are blends. Above this alpha a pixel counts as ink; below it, as background. */
const ALPHA_CUTOFF = 128;

/** How far a traced outline may deviate from the pixel boundary, in source pixels. */
const SIMPLIFY_EPSILON = 0.6;

/** Agreement floor for the re-rasterised check, as a fraction of the union of both masks. */
const FIDELITY_FLOOR = 0.995;

/**
 * Splits ink into the two roles the dark artwork already separates.
 *
 * The test is "is this pixel notably redder than it is green or blue". It is not a match against the
 * two exact colours, because anti-aliased edge pixels are blends of a colour and transparency and
 * would all fail an equality test — throwing away the entire outline, which is the only part that
 * matters here.
 */
function classify(r, g, b) {
  return r - Math.max(g, b) > 40 ? 'accent' : 'word';
}

/**
 * Traces a binary mask into closed polygons that follow the exact pixel boundary.
 *
 * Marching squares would give the same loops with more machinery. This walks the boundary EDGES
 * directly: every filled pixel contributes an edge for each of its four sides whose neighbour is
 * empty, wound clockwise, and the edges are then chained end-to-start into loops. Holes come out
 * wound the other way, which is exactly what `fill-rule="evenodd"` wants — no inside/outside test
 * is needed anywhere.
 */
function traceMask(mask, w, h) {
  /** Vertex key. The grid is (w+1) x (h+1) corners, so this is unique and collision-free. */
  const key = (x, y) => y * (w + 1) + x;
  const starts = new Map();
  const edges = [];

  const add = (x0, y0, x1, y1) => {
    const i = edges.length;
    edges.push({ x0, y0, x1, y1, used: false });
    const k = key(x0, y0);
    const list = starts.get(k);
    if (list) list.push(i);
    else starts.set(k, [i]);
  };

  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y); // top,    left to right
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1); // right,  top to bottom
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1); // bottom, right to left
      if (!at(x - 1, y)) add(x, y + 1, x, y); // left,   bottom to top
    }
  }

  const loops = [];
  for (let i = 0; i < edges.length; i++) {
    if (edges[i].used) continue;
    const loop = [];
    let e = edges[i];
    e.used = true;
    loop.push([e.x0, e.y0]);
    for (;;) {
      loop.push([e.x1, e.y1]);
      const candidates = starts.get(key(e.x1, e.y1));
      if (!candidates) break;
      // At a diagonal touch two edges leave the same corner. Either choice closes a valid loop;
      // taking the first unused one keeps this deterministic, which matters because the output is
      // committed and a reordering would show up as a spurious diff.
      const next = candidates.find((j) => !edges[j].used);
      if (next === undefined) break;
      e = edges[next];
      e.used = true;
      if (e.x1 === loop[0][0] && e.y1 === loop[0][1]) {
        loop.push([e.x1, e.y1]);
        break;
      }
    }
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

/** Ramer-Douglas-Peucker. The traced boundary is a staircase; this is what turns it into segments. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    const [ax, ay] = points[lo];
    const [bx, by] = points[hi];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let worst = -1;
    let worstAt = -1;
    for (let i = lo + 1; i < hi; i++) {
      const [px, py] = points[i];
      const d =
        len === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > worst) {
        worst = d;
        worstAt = i;
      }
    }
    if (worst > epsilon && worstAt > 0) {
      keep[worstAt] = 1;
      stack.push([lo, worstAt], [worstAt, hi]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

const fmt = (n) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

function toPathData(loops) {
  const out = [];
  for (const loop of loops) {
    const pts = simplify(loop, SIMPLIFY_EPSILON);
    if (pts.length < 4) continue;
    let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) d += `L${fmt(pts[i][0])} ${fmt(pts[i][1])}`;
    out.push(d + 'Z');
  }
  return out.join('');
}

/**
 * Re-rasterises the emitted polygons with an even-odd scanline fill and compares to the source.
 *
 * This is the assertion that the trace is the drawing rather than something shaped like it. Sampling
 * at pixel centres matches the mask's own definition of a filled pixel, so a perfect trace scores
 * 1.0 and the only expected loss is the simplification tolerance.
 */
function verifyTrace(loops, mask, w, h) {
  const drawn = new Uint8Array(w * h);
  const polys = loops.map((l) => simplify(l, SIMPLIFY_EPSILON)).filter((p) => p.length >= 4);
  for (let y = 0; y < h; y++) {
    const cy = y + 0.5;
    const xs = [];
    for (const p of polys) {
      for (let i = 0; i < p.length - 1; i++) {
        const [x0, y0] = p[i];
        const [x1, y1] = p[i + 1];
        if (y0 === y1) continue;
        if (cy >= Math.min(y0, y1) && cy < Math.max(y0, y1)) {
          xs.push(x0 + ((cy - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.max(0, Math.ceil(xs[i] - 0.5));
      const to = Math.min(w - 1, Math.floor(xs[i + 1] - 0.5));
      for (let x = from; x <= to; x++) drawn[y * w + x] = 1;
    }
  }
  let agree = 0;
  let union = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] || drawn[i]) union++;
    if (mask[i] && drawn[i]) agree++;
  }
  return union === 0 ? 1 : agree / union;
}

/**
 * Builds the themeable SVG from the DARK artwork, which is the file that separates the two roles.
 *
 * `img` is a decoded RGBA image; `bounds` is the ink box to crop to.
 */
export function traceLogo(img, bounds) {
  const { x0, y0, w, h } = bounds;
  const word = new Uint8Array(w * h);
  const accent = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * img.w + (x0 + x)) * 4;
      if (img.data[i + 3] < ALPHA_CUTOFF) continue;
      const role = classify(img.data[i], img.data[i + 1], img.data[i + 2]);
      (role === 'accent' ? accent : word)[y * w + x] = 1;
    }
  }

  const report = {};
  const paths = {};
  for (const [role, mask] of [
    ['word', word],
    ['accent', accent],
  ]) {
    const loops = traceMask(mask, w, h);
    paths[role] = toPathData(loops);
    report[role] = {
      loops: loops.length,
      fidelity: verifyTrace(loops, mask, w, h),
      pixels: mask.reduce((n, v) => n + v, 0),
    };
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="PulseMind" fill-rule="evenodd">
<title>PulseMind</title>
<!-- GENERATED from static/images/logo-dark.png by scripts/trace-logo.mjs (pnpm brand). Do not edit.

     ONE file for BOTH themes, which is what D-32 asked for. The two supplied PNGs were measured to
     be the same drawing in different colours - their alpha masks matched on every one of 199994 ink
     pixels - so the geometry below is traced once and the colours are left to the page.

     The two roles are the two colours the dark artwork already separates: the PULSE/MIND letters,
     and the E with the ECG line and the stethoscope curve. Each takes a CSS variable with a fallback
     to the light-theme value, so this file is still correct when opened on its own or used as a
     favicon source, where no stylesheet defines either. -->
<path fill="var(--pm-logo-word, #CD082D)" d="${paths.word}"/>
<path fill="var(--pm-logo-accent, #CD082D)" d="${paths.accent}"/>
</svg>
`;

  return { svg, report, floor: FIDELITY_FLOOR };
}

export { FIDELITY_FLOOR };
