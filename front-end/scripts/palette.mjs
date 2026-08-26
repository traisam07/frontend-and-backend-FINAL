/**
 * PulseMind — the palette solver.
 *
 *   node scripts/palette.mjs            # search, then print the ledger
 *
 * It answers open question **D-01** with numbers instead of taste. The previous risk ramp separated
 * well for trichromats and COLLAPSED for dichromats — High vs Medium measured ΔE2000 2.7 under
 * protanopia and 3.0 under deuteranopia, against a floor of 15 — so two adjacent risk BANDS were the
 * same colour to a red-green dichromat. Roughly 1 man in 12 is a red-green dichromat, and the
 * screens this palette lands on are read at a glance under time pressure.
 *
 * THE INSIGHT THE SEARCH ENCODES. Under protanopia and deuteranopia, hue collapses onto a
 * blue↔yellow axis; what survives is LIGHTNESS and that one chromatic axis. A red→orange→amber ramp
 * therefore has almost nothing left to separate with, no matter how far apart the hues look to a
 * trichromat. So the search is constrained to spread the four bands along L* as well as hue, and it
 * is scored on the MINIMUM separation across normal vision and all three dichromacies — never on
 * normal vision alone, which is the measurement that let the old ramp pass review.
 *
 * WHAT IS STILL NOT DECIDED HERE. Which hue means which band is a clinical convention question
 * (**G-35**), and the ramp keeps the conventional red/orange/amber/teal reading. What this file
 * decides is only the exact steps, and only against the constraints below.
 */

import {
  CVD_KINDS,
  contrast,
  deltaE2000FromLab,
  oklchToSrgb,
  separationReport,
  simulateCvd,
  toLab,
} from './color.mjs';

const S = (L, C, H) => oklchToSrgb(L, C, H);

/* ------------------------------------------------------------------------------------------------
 * The grounds every ratio is measured against. Neutrals first, because everything else is solved
 * against them.
 * ---------------------------------------------------------------------------------------------- */

export const NEUTRAL = {
  light: {
    canvas: [0.972, 0.0035, 250],
    surface: [1.0, 0.0, 250],
    surfaceSunken: [0.951, 0.006, 250],
    surfaceRaised: [1.0, 0.0, 250],
    surfaceHover: [0.949, 0.009, 250],
  },
  dark: {
    canvas: [0.171, 0.013, 255],
    surface: [0.223, 0.015, 255],
    surfaceSunken: [0.145, 0.012, 255],
    surfaceRaised: [0.272, 0.016, 255],
    surfaceHover: [0.278, 0.018, 255],
  },
};

/**
 * WCAG floors. Text 4.5:1 (SC 1.4.3); UI boundaries and graphical objects 3:1 (SC 1.4.11).
 *
 * Only `TEXT` is used inside the SEARCH — the search's single hard constraint is that a fill carry
 * legible ink. The 3:1 object floor applies to `border` and to the chart marks, which are solved
 * against `OBJECT_TARGET` in the derivation below and verified in `build-tokens.mjs`.
 */
const TEXT = 4.5;

/**
 * The TARGETS the derivation aims at, deliberately above the floors.
 *
 * Solving for the exact floor puts every token on the boundary, where an 8-bit rounding or a later
 * one-step tweak to a surface silently drops it below — and a ledger full of 4.51s is a ledger that
 * will be wrong the first time anything moves. Aiming higher also stops all four bands' text
 * collapsing to the same lightness, which is what happens when each is solved to the same minimum.
 */
const TEXT_TARGET = 6.5;
const TEXT_ON_TINT_TARGET = 5.2;
const OBJECT_TARGET = 3.6;

/** The CVD separation floor the design system sets for the risk ramp. */
export const DELTA_E_FLOOR = 15;

/* ------------------------------------------------------------------------------------------------
 * Solvers
 * ---------------------------------------------------------------------------------------------- */

/**
 * The lightest (or darkest) L at a given hue and chroma that still clears `ratio` against `ground`.
 *
 * Binary search rather than a formula: the oklch→sRGB path is gamut-mapped, so the relationship
 * between L and measured luminance is not analytic once chroma clips.
 */
export function solveL(C, H, ground, ratio, direction) {
  let lo = direction === 'darker' ? 0 : 0.5;
  let hi = direction === 'darker' ? 0.85 : 1;
  // Walk toward the ground until the ratio is met, then bisect for the closest passing value.
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const ok = contrast(S(mid, C, H), ground) >= ratio;
    if (direction === 'darker') {
      // Darker text on a light ground: lower L passes. Keep the HIGHEST L that passes.
      if (ok) lo = mid;
      else hi = mid;
    } else {
      // Lighter text on a dark ground: higher L passes. Keep the LOWEST L that passes.
      if (ok) hi = mid;
      else lo = mid;
    }
  }
  return direction === 'darker' ? lo : hi;
}

/* ------------------------------------------------------------------------------------------------
 * The search
 * ---------------------------------------------------------------------------------------------- */

/**
 * Hue windows per band. Narrow enough to keep the conventional clinical reading (red is worst, teal
 * is best), wide enough for the search to find separation inside them.
 */
const WINDOWS = {
  light: {
    Critical: { H: [18, 28], L: [0.44, 0.52], C: [0.16, 0.21] },
    High: { H: [56, 72], L: [0.63, 0.71], C: [0.13, 0.17] },
    Medium: { H: [86, 100], L: [0.83, 0.9], C: [0.1, 0.16] },
    Low: { H: [192, 214], L: [0.54, 0.63], C: [0.07, 0.12] },
  },
  dark: {
    Critical: { H: [18, 28], L: [0.58, 0.66], C: [0.15, 0.2] },
    High: { H: [56, 72], L: [0.72, 0.8], C: [0.13, 0.17] },
    Medium: { H: [86, 100], L: [0.87, 0.93], C: [0.11, 0.16] },
    Low: { H: [192, 214], L: [0.66, 0.74], C: [0.08, 0.12] },
  },
};

const BANDS = ['Critical', 'High', 'Medium', 'Low'];

/**
 * A `solid` is a FILL THAT CARRIES INK, so the constraint on it is text contrast against that ink —
 * not the 3:1 object floor.
 *
 * Conflating the two is what made the first run of this search return nothing at all: requiring a
 * solid to clear 3:1 against a WHITE surface caps its lightness at roughly L 0.72, which deletes
 * every light amber from the candidate set — and lightness spread is exactly what dichromatic
 * separation has to be built from. The 3:1 object floor belongs to `border` (a boundary) and to the
 * chart marks (graphical objects), and both are solved for it separately below.
 */

/** The ink that sits ON a solid fill: white in light, near-black in dark, whichever clears 4.5:1. */
function bestInk(solid) {
  const white = S(1, 0, 250);
  const black = S(0.16, 0.02, 255);
  const cw = contrast(solid, white);
  const cb = contrast(solid, black);
  return cw >= cb
    ? { ink: white, ratio: cw, kind: 'light' }
    : { ink: black, ratio: cb, kind: 'dark' };
}

/**
 * Branch-and-bound over the four bands.
 *
 * The naive form of this search is 125^4 combinations, each re-simulating four vision models — it
 * does not finish. Two changes make it seconds instead:
 *
 *   1. Every candidate's CIELAB is computed ONCE, under normal vision and each dichromacy, and
 *      cached. The inner loop then does arithmetic on cached Lab triples rather than re-running the
 *      colour pipeline 24 times per combination.
 *   2. The set is built one band at a time and the partial minimum is carried down. A partial set
 *      whose minimum has already fallen to or below the best complete set found so far cannot be
 *      rescued by the bands still to be chosen — separation is a MINIMUM, so adding a colour can
 *      only lower it — and the whole subtree is dropped.
 */
function searchSolids(theme, steps = 5) {
  const w = WINDOWS[theme];
  const axis = ([lo, hi]) =>
    steps === 1
      ? [(lo + hi) / 2]
      : Array.from({ length: steps }, (_, i) => lo + ((hi - lo) * i) / (steps - 1));

  const MODELS = ['normal', ...CVD_KINDS];

  const candidates = BANDS.map((band) => {
    const out = [];
    for (const L of axis(w[band].L)) {
      for (const C of axis(w[band].C)) {
        for (const H of axis(w[band].H)) {
          const colour = S(L, C, H);
          // The only hard constraint on a fill: the ink on it must be legible.
          if (bestInk(colour).ratio < TEXT) continue;
          const labs = MODELS.map((m) => toLab(m === 'normal' ? colour : simulateCvd(colour, m)));
          out.push({ L, C, H, colour, labs });
        }
      }
    }
    return out;
  });

  if (candidates.some((c) => c.length === 0)) return null;

  /** The worst separation between two candidates, taken across all four vision models. */
  const worstPair = (a, b) => {
    let min = Infinity;
    for (let i = 0; i < a.labs.length; i += 1) {
      const d = deltaE2000FromLab(a.labs[i], b.labs[i]);
      if (d < min) min = d;
    }
    return min;
  };

  let best = null;
  const chosen = [];

  const walk = (depth, partialMin) => {
    // Cannot improve on the incumbent: separation only ever falls as bands are added.
    if (best !== null && partialMin <= best.score) return;
    if (depth === BANDS.length) {
      best = { picks: chosen.slice(), score: partialMin };
      return;
    }
    // Try the most promising candidates first, so the bound tightens early.
    const scored = candidates[depth]
      .map((cand) => {
        let m = partialMin;
        for (const prev of chosen) m = Math.min(m, worstPair(prev, cand));
        return { cand, m };
      })
      .filter((x) => (best === null ? true : x.m > best.score))
      .sort((a, b) => b.m - a.m);

    for (const { cand, m } of scored) {
      chosen.push(cand);
      walk(depth + 1, m);
      chosen.pop();
    }
  };

  walk(0, Infinity);
  if (best === null) return null;

  const picks = {};
  BANDS.forEach((band, i) => {
    picks[band] = best.picks[i];
  });
  const report = separationReport(BANDS.map((band) => [band, picks[band].colour]));
  return { picks, report };
}

/* ------------------------------------------------------------------------------------------------
 * Deriving the rest of a band from its solid
 * ---------------------------------------------------------------------------------------------- */

/**
 * A band is five tokens: `solid` (the fill), `on` (ink on that fill), `fg` (text on a surface),
 * `bg` (the tint), `border` (the boundary).
 *
 * `fg` is solved against BOTH the surface and its own tint, because it renders on both; `border` is
 * solved as a graphical object. Every one of them is a solved value, not a hand-picked one, so the
 * ledger cannot drift from the tokens.
 */
export function deriveBand(theme, pick) {
  const n = NEUTRAL[theme];
  const surface = S(...n.surface);
  const canvas = S(...n.canvas);
  const solid = S(pick.L, pick.C, pick.H);
  const { ink, kind } = bestInk(solid);

  if (theme === 'light') {
    // The tint: very light, low chroma, same hue.
    const bg = S(0.958, Math.min(0.045, pick.C * 0.22), pick.H);
    // Text: dark enough for 4.5:1 on BOTH the white surface and its own tint.
    const fgC = Math.min(pick.C, 0.16);
    const L1 = solveL(fgC, pick.H, surface, TEXT_TARGET, 'darker');
    const L2 = solveL(fgC, pick.H, bg, TEXT_ON_TINT_TARGET, 'darker');
    const fg = S(Math.min(L1, L2), fgC, pick.H);
    // Border: a graphical object, aimed above the 3:1 floor on surface and canvas.
    const bC = Math.min(pick.C, 0.2);
    const bL = Math.min(
      solveL(bC, pick.H, surface, OBJECT_TARGET, 'darker'),
      solveL(bC, pick.H, canvas, OBJECT_TARGET, 'darker'),
    );
    const border = S(bL, bC, pick.H);
    return { solid, on: ink, onKind: kind, bg, fg, border, spec: { ...pick } };
  }

  const bg = S(0.295, Math.min(0.06, pick.C * 0.3), pick.H);
  const fgC = Math.min(pick.C, 0.14);
  const L1 = solveL(fgC, pick.H, surface, TEXT_TARGET, 'lighter');
  const L2 = solveL(fgC, pick.H, bg, TEXT_ON_TINT_TARGET, 'lighter');
  const fg = S(Math.max(L1, L2), fgC, pick.H);
  const bC = Math.min(pick.C, 0.18);
  const bL = Math.max(
    solveL(bC, pick.H, surface, OBJECT_TARGET, 'lighter'),
    solveL(bC, pick.H, canvas, OBJECT_TARGET, 'lighter'),
  );
  const border = S(bL, bC, pick.H);
  return { solid, on: ink, onKind: kind, bg, fg, border, spec: { ...pick } };
}

/* ------------------------------------------------------------------------------------------------
 * Report
 * ---------------------------------------------------------------------------------------------- */

function fmt(n) {
  return String(Math.round(n * 10) / 10).padStart(5);
}

export function run() {
  const out = {};
  for (const theme of ['light', 'dark']) {
    const best = searchSolids(theme);
    if (!best) throw new Error(`no ${theme} candidate carried legible ink — widen WINDOWS`);
    out[theme] = { picks: best.picks, report: best.report, bands: {} };
    for (const band of BANDS) out[theme].bands[band] = deriveBand(theme, best.picks[band]);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = run();
  for (const theme of ['light', 'dark']) {
    const { picks, report, bands } = result[theme];
    console.log(`\n${'='.repeat(78)}\n${theme.toUpperCase()} RISK RAMP\n${'='.repeat(78)}`);
    for (const band of BANDS) {
      const p = picks[band];
      const b = bands[band];
      console.log(
        `  ${band.padEnd(9)} oklch(${p.L.toFixed(3)} ${p.C.toFixed(4)} ${Math.round(p.H)})  solid ${b.solid.hex}` +
          `  fg ${b.fg.hex}  bg ${b.bg.hex}  border ${b.border.hex}  ink ${b.onKind}`,
      );
    }
    console.log('\n  separation (CIEDE2000, minimum over every pair):');
    for (const model of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) {
      const r = report[model];
      const verdict = r.min >= DELTA_E_FLOOR ? 'PASS' : 'FAIL';
      console.log(`    ${model.padEnd(14)} ${fmt(r.min)}   ${verdict}   worst: ${r.worst}`);
    }
    console.log(`    ${'OVERALL'.padEnd(14)} ${fmt(report.overallMin)}   floor ${DELTA_E_FLOOR}`);

    console.log('\n  contrast:');
    const n = NEUTRAL[theme];
    const surface = S(...n.surface);
    const sunken = S(...n.surfaceSunken);
    for (const band of BANDS) {
      const b = bands[band];
      console.log(
        `    ${band.padEnd(9)} fg/surface ${fmt(contrast(b.fg, surface))}  fg/own-bg ${fmt(contrast(b.fg, b.bg))}` +
          `  on/solid ${fmt(contrast(b.on, b.solid))}  border/surface ${fmt(contrast(b.border, surface))}` +
          `  solid/sunken ${fmt(contrast(b.solid, sunken))}`,
      );
    }
  }
}
