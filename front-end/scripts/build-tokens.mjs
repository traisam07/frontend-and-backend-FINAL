/**
 * PulseMind — generate the token stack and its measured ledger.
 *
 *   node scripts/build-tokens.mjs
 *
 * Writes three files from ONE model:
 *   src/app.css                                                     the shipped stylesheet
 *   ../.claude/skills/tailwind-design-system/references/tokens.css   the canonical copy
 *   ../docs/spec/contrast-ledger.md                                  every measured ratio and ΔE
 *
 * WHY THIS IS GENERATED. The design system requires a ledger of COMPUTED contrast ratios, and the
 * previous stack kept that ledger in a comment beside the values. A comment cannot be wrong loudly:
 * change one token and the ledger silently describes a colour that is no longer on screen. Here both
 * outputs are derived from the same model in one pass, so they cannot disagree — and the ledger is
 * regenerated, never hand-patched.
 *
 * Every colour is HARNESS-DEFINED, pending design confirmation (**D-01** … **D-04**). What is not
 * harness-defined is the arithmetic: `color.mjs` measures it.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CVD_KINDS,
  contrast,
  deltaE2000FromLab,
  oklchToSrgb,
  over,
  parseHex,
  separationReport,
  simulateCvd,
  toLab,
} from './color.mjs';

/**
 * IS THIS STILL A COLOUR? — the check D-28 was missing.
 *
 * Every separation figure in this ledger is pairwise: it asks whether two bands can be told
 * apart. None of them asks whether a band is still CHROMATIC, and a hue can clear every pair
 * and still simulate to grey, because its siblings moved with it. The teal `Low` did exactly
 * that — 20.2 from an equal-lightness neutral with normal vision, 2.8 under protanopia — so the
 * band meaning `this patient is fine` read as an ABSENCE, joining the disabled/unavailable
 * vocabulary in the one population the ramp had been searched for. A product owner found it
 * before this file did (`docs/LESSONS.md` L-078).
 *
 * The reference is a neutral at the colour's OWN lightness: that isolates hue, which is the
 * only thing under test.
 */
function chromaticity(colour) {
  const neutral = oklchToSrgb(colour.oklch?.L ?? lightnessOf(colour), 0.004, 250);
  const out = {};
  for (const kind of ['normal', ...CVD_KINDS]) {
    const a = kind === 'normal' ? colour : simulateCvd(colour, kind);
    const b = kind === 'normal' ? neutral : simulateCvd(neutral, kind);
    out[kind] = +deltaE2000FromLab(toLab(a), toLab(b)).toFixed(1);
  }
  out.min = Math.min(...Object.values(out));
  return out;
}

/** CIE L* of a measured colour, mapped back onto the oklch L the neutral is built at. */
function lightnessOf(colour) {
  return toLab(colour)[0] / 100;
}
import { DELTA_E_FLOOR, NEUTRAL, run as runPalette, solveL } from './palette.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The self-hosted web fonts, as `scripts/fetch-fonts.mjs` left them on disk. Read rather than
 * hard-coded, so the `@font-face` rules and the files in `static/fonts/` cannot drift: adding a
 * weight means re-running the fetch script, not editing two places.
 */
const FONT_FACES = JSON.parse(readFileSync(resolvePath(HERE, 'fonts.json'), 'utf8'));
const FONT_FACE_CSS = FONT_FACES.map(
  (face) => `@font-face {
  font-family: '${face.family}';
  font-style: ${face.style};
  font-weight: ${face.weight};
  font-display: swap;
  src: url('/fonts/${face.file}') format('woff2');
  unicode-range: ${face.range};
}`,
).join('\n\n');
const FONT_BYTES = FONT_FACES.reduce((sum, face) => sum + face.bytes, 0);
const S = (L, C, H) => oklchToSrgb(L, C, H);
const fmtOklch = ([L, C, H], alpha) =>
  `oklch(${L.toFixed(3)} ${C.toFixed(4)} ${H.toFixed(0)}${alpha === undefined ? '' : ` / ${alpha}`})`;

const TEXT_TARGET = 6.5;
const TEXT_ON_TINT_TARGET = 5.2;
const OBJECT_TARGET = 3.6;
const BANDS = ['Critical', 'High', 'Medium', 'Low'];

/**
 * Hues per family. Two rules govern the choices, and both are safety rules rather than taste:
 *   - the interactive accent sits far from every risk hue, so an ACTION can never be misread as a
 *     SEVERITY;
 *   - review state is violet and data sufficiency is a desaturated slate, so a workflow state and an
 *     "we do not know" never borrow the visual language of a risk band.
 */
const HUES = {
  accent: 258,
  reviewPending: 296,
  reviewDone: 164,
  insufficient: 262,
  dataLimited: 340,
  dataSufficiencyUnknown: 110,
  provNeutral: 262,
  provPopulation: 322,
  stale: 68,
};

const palette = runPalette();

/* ------------------------------------------------------------------------------------------------
 * Model
 * ---------------------------------------------------------------------------------------------- */

function makeTheme(theme) {
  const isLight = theme === 'light';
  const dir = isLight ? 'darker' : 'lighter';
  const pick = isLight ? Math.min : Math.max;
  const n = NEUTRAL[theme];

  const surfaceSpec = n.surface;
  const canvasSpec = n.canvas;
  const surface = S(...surfaceSpec);
  const canvas = S(...canvasSpec);

  /** A token: a name, an oklch spec, the colour it renders as, and an optional note. */
  const tokens = [];
  const add = (name, spec, note, alpha) => {
    const colour = S(...spec);
    tokens.push({ name, spec, alpha, colour, note });
    return colour;
  };

  /**
   * A token whose value is a LITERAL, emitted verbatim. For a supplied brand colour: it must ship as
   * the exact hex someone chose, and round-tripping it through oklch would move it by a unit or two.
   * It is still measured into the ledger like every other token.
   */
  const addLiteral = (name, hex, note) => {
    const colour = parseHex(hex);
    tokens.push({ name, literal: hex, colour, note });
    return colour;
  };

  /** Solve text lightness against the surface AND a tint, taking whichever is stricter. */
  const solveText = (chroma, hue, tint) =>
    pick(
      solveL(chroma, hue, surface, TEXT_TARGET, dir),
      solveL(chroma, hue, tint, TEXT_ON_TINT_TARGET, dir),
    );

  /** Solve a boundary as a graphical object against surface AND canvas. */
  const solveBorder = (chroma, hue) =>
    pick(
      solveL(chroma, hue, surface, OBJECT_TARGET, dir),
      solveL(chroma, hue, canvas, OBJECT_TARGET, dir),
    );

  const tintL = isLight ? 0.958 : 0.295;

  /* ---- surfaces --------------------------------------------------------------------------- */
  add('color-canvas', canvasSpec, 'app background');
  add('color-surface', surfaceSpec, 'cards, panels, rows');
  add('color-surface-sunken', n.surfaceSunken, 'wells, plot area, table head');
  add('color-surface-raised', n.surfaceRaised, 'drawer, popover, tooltip');
  add('color-surface-hover', n.surfaceHover, 'hover wash');
  const disabledSpec = isLight ? [0.955, 0.004, HUES.accent] : [0.262, 0.013, HUES.accent];
  const surfaceDisabled = add('color-surface-disabled', disabledSpec);
  const scrimSpec = isLight ? [0.205, 0.018, HUES.accent] : [0.09, 0.01, HUES.accent];
  add('color-scrim', scrimSpec, 'drawer scrim', isLight ? '0.58' : '0.72');

  /* ---- text ------------------------------------------------------------------------------- */
  const fgSpec = isLight ? [0.205, 0.018, HUES.accent] : [0.965, 0.004, HUES.accent];
  add('color-fg', fgSpec, `${contrast(S(...fgSpec), surface)} on surface`);
  const fgSecSpec = isLight ? [0.438, 0.018, HUES.accent] : [0.812, 0.012, HUES.accent];
  add('color-fg-secondary', fgSecSpec, `${contrast(S(...fgSecSpec), surface)} on surface`);
  const fgMutedSpec = isLight ? [0.518, 0.016, HUES.accent] : [0.716, 0.014, HUES.accent];
  add('color-fg-muted', fgMutedSpec, `${contrast(S(...fgMutedSpec), surface)} on surface`);
  const fgDisSpec = isLight ? [0.525, 0.01, HUES.accent] : [0.655, 0.014, HUES.accent];
  add(
    'color-fg-disabled',
    fgDisSpec,
    `${contrast(S(...fgDisSpec), surfaceDisabled)} on surface-disabled`,
  );
  add('color-fg-on-dark', isLight ? [1, 0, HUES.accent] : [0.15, 0.018, HUES.accent]);

  /* ---- structure -------------------------------------------------------------------------- */
  add(
    'color-border-subtle',
    isLight ? [0.918, 0.005, HUES.accent] : [0.315, 0.014, HUES.accent],
    'DECORATIVE ONLY',
  );
  add(
    'color-border',
    isLight ? [0.862, 0.007, HUES.accent] : [0.398, 0.016, HUES.accent],
    'DECORATIVE ONLY',
  );
  const bsSpec = isLight ? [0.578, 0.013, HUES.accent] : [0.585, 0.02, HUES.accent];
  add('color-border-strong', bsSpec, `${contrast(S(...bsSpec), surface)} — control boundary`);

  /* ---- focus ------------------------------------------------------------------------------ */
  const focusSpec = isLight ? [0.505, 0.17, HUES.accent] : [0.815, 0.115, 242];
  add('color-focus', focusSpec, `${contrast(S(...focusSpec), surface)} on surface`);
  add('color-focus-offset', surfaceSpec, 'a LITERAL copy of --color-surface, never a var()');

  /* ---- accent ----------------------------------------------------------------------------- */
  const accentTintSpec = [tintL, isLight ? 0.022 : 0.055, HUES.accent];
  const accentTint = S(...accentTintSpec);
  const accentFgSpec = [solveText(0.16, HUES.accent, accentTint), 0.16, HUES.accent];
  add('color-accent-fg', accentFgSpec, `${contrast(S(...accentFgSpec), surface)} on surface`);
  const accentSolidSpec = [isLight ? 0.505 : 0.63, 0.17, HUES.accent];
  const accentSolid = S(...accentSolidSpec);
  const onAccentSpec =
    contrast(accentSolid, S(1, 0, HUES.accent)) >= contrast(accentSolid, S(0.16, 0.02, HUES.accent))
      ? [1, 0, HUES.accent]
      : [0.16, 0.02, HUES.accent];
  add(
    'color-accent-solid',
    accentSolidSpec,
    `${contrast(accentSolid, S(...onAccentSpec))} vs its ink`,
  );
  add('color-accent-hover', [isLight ? 0.445 : 0.69, 0.17, HUES.accent]);
  add('color-accent-active', [isLight ? 0.385 : 0.61, 0.17, HUES.accent]);
  add('color-accent-bg', accentTintSpec, 'selected wash');
  const accentBorderSpec = [solveBorder(0.16, HUES.accent), 0.16, HUES.accent];
  add('color-accent-border', accentBorderSpec, `${contrast(S(...accentBorderSpec), surface)}`);
  add(
    'color-on-accent',
    onAccentSpec,
    `${contrast(accentSolid, S(...onAccentSpec))} on accent-solid`,
  );

  /* ---- brand -------------------------------------------------------------------------------
     A SUPPLIED colour, and the only literal value in this file. It ships as the exact hex it was
     given: round-tripping a brand colour through oklch and back moves it by a unit or two, and that
     is not the colour anyone chose.

     IDENTICAL IN BOTH THEMES, fill and ink, because that is what was asked for — the sign-in actions
     stay this red with white type whether the workstation is light or dark. That is unusual here
     (every other family has a light and a dark tone) and it is deliberate.

     WHITE IS THE CORRECT INK, not merely the requested one: measured, white on this red is 5.72:1
     and black is 3.67:1, so white clears SC 1.4.3's 4.5 floor and black would not. The exact figures
     are recomputed into the notes below and into the ledger on every build.

     AUTH SURFACE ONLY. This red sits close to the risk-critical family, and a red primary action on
     a screen that also shows risk bands would put an ACTION and a SEVERITY in the same visual
     language. `/login` renders no patient — e2e/auth.spec.ts asserts exactly that — so the collision
     is not reachable there. Registered as D-20. */
  const brandSolid = addLiteral(
    'color-brand-solid',
    '#CD082D',
    'supplied brand red — auth actions only, identical in both themes',
  );
  addLiteral(
    'color-brand-on',
    '#ffffff',
    `${contrast(brandSolid, parseHex('#ffffff'))} on brand-solid — white in BOTH themes`,
  );

  /**
   * The BOUNDARY, and the reason it is not simply the fill.
   *
   * Against the light surface the fill clears 3:1 on its own. Against the DARK surface it measures
   * only 2.92:1 — under SC 1.4.11's 3:1 floor for the visual boundary of a UI component — so the
   * button's SHAPE would fade into the page even though its label stays perfectly legible. A lighter
   * rim at the same hue restores the edge without touching the fill anyone asked for.
   */
  if (isLight) {
    addLiteral(
      'color-brand-border',
      '#CD082D',
      `${contrast(brandSolid, surface)} vs surface — the fill already carries its own edge here`,
    );
  } else {
    const brandBorderSpec = [solveBorder(0.19, 25), 0.19, 25];
    add(
      'color-brand-border',
      brandBorderSpec,
      `${contrast(S(...brandBorderSpec), surface)} vs surface — SC 1.4.11 edge the fill cannot give here`,
    );
  }

  /* ---- risk -------------------------------------------------------------------------------

     THE CHIP FILLS ARE FIXED, LIGHT, AND CARRY ONE SHARED NEAR-BLACK INK IN BOTH THEMES. They are
     NOT the searched ramp, and the difference is the most consequential decision in this file. The
     ramp below is the product owner's, chosen on 2026-08-18 after the cost of the previous one had
     been measured and put in front of them (**D-26**), and the ledger reads PASS.

     HOW IT GOT HERE, because the reversal is the argument. From 2026-08-17 these fills were vivid
     and DARK and carried WHITE type, asked for twice (**D-21**). White type at 4.5:1 forces every
     band down to roughly L <= 0.58, and the ramp's colour-vision separation was built almost
     entirely from LIGHTNESS SPREAD — flattened, the three warm bands converged and High/Medium
     measured CIEDE2000 **1.2** against a floor of 15. The owner then reported that Critical and High
     looked alike, which is that measurement arriving in a person's eyes. Dark ink inverts the
     binding constraint: every band must now be LIGHT, which opens L 0.64-0.96 and is where the
     separation came back from.

     TWO STANDING CONSTRAINTS follow, and neither is stylistic. No band may be dark again while the
     ink is dark. And the chip fills must never be reused as chart marks — `risk-medium-solid`
     measures 1.13 against the light plot surface, and a mark has nothing but itself to be seen by
     (SC 1.4.11). `-border` is not the alternative either: those four are each solved to the same 3:1
     object floor against the same surface, so they share a lightness and measure 3.6 apart in light
     and 1.1 in dark. That is **D-30**, and it is why no chart colours its marks by band.

     COLOUR STILL NEVER LEADS, and a passing ΔE does not change that. CLAUDE.md rule 8 requires the
     FULL WORD — never abbreviated, never in a tooltip — and a distinct GLYPH SHAPE on every band,
     because greyscale print, dimmed bedside displays and forced-colors mode have no hue at all.

     NEVER RESTATE A FIGURE HERE. Every number above that is a measurement is regenerated into
     `docs/spec/contrast-ledger.md` by this same script; a literal copied into prose is a copy that
     drifts, which is exactly what this block did between 2026-08-18 and 2026-08-19. */
  const CHIP = {
    // SOFTENED 2026-08-23, at the product owner's request ("chưa friendly" — the board read as
    // vivid chips on an otherwise muted grey table). Chroma only, L UNCHANGED: separation under
    // CVD is built from the LIGHTNESS spread (see the essay above), so this does not touch the
    // mechanism that keeps Critical/High/Medium/Low apart for a dichromat — it only pulls each
    // band a step closer to the shared grey the rest of the screen already sits in. Re-verified
    // against the same D-26 floor on every build; the ledger's CHIP-fills section is the proof.
    //
    // CRITICAL WENT DARK, HOURS LATER, at the product owner's request ("chữ màu đen làm nó khó
    // nhìn"): the softened fill kept dark ink at only 4.99:1 — technically over the 4.5 floor,
    // the weakest margin of the four bands, and the one the report named by hand. `L 0.64 -> 0.48`
    // with WHITE ink restores a comfortable 7.10:1. This does NOT reopen D-21 (that incident forced
    // ALL FOUR bands under white ink into one narrow light band, L <= 0.58, and collapsed the
    // spread the ramp needs). Here only Critical moves, and it moves DOWN while the other three
    // stay light — the spread WIDENS (0.64-0.96 to 0.48-0.96), so `separationReport` on the new
    // four-fill set still measures 16.2 overall, identical to before: the worst pair was never
    // Critical, it is High vs Medium, and this change does not touch either. "Most severe = darkest
    // fill" is also the more legible mapping for the band a clinician needs to see fastest.
    Critical: [0.48, 0.15, 16],
    High: [0.8, 0.11, 70],
    Medium: [0.96, 0.09, 86],
    // AZURE, NOT TEAL, since 2026-08-18 (**D-28**). The teal was the one band that stopped being a
    // colour at all for a red-green dichromat: measured against a neutral of its own lightness it
    // held ΔE2000 2.8 under protanopia and 7.8 under deuteranopia — 20.2 with normal vision. The
    // band that should read "this one is fine" read as an absence, while the UNAVAILABLE chip kept a
    // clear blue. It also sat 14.4 from `surface-disabled` under protanopia, inside the floor of 15.
    //
    // Swapping the roles instead — a neutral grey for "unavailable" — was measured and REJECTED:
    // Critical simulates to the warm grey #726f61 under protanopia, so a grey unavailable chip lands
    // ΔE 7-8 from the most severe band. Grey is not available as a semantic in this palette, because
    // a severity band already occupies it.
    //
    // Azure survives because blue-yellow is the axis red-green blindness leaves intact: 25.4 against
    // the neutral, and it simulates to #7ab5fb / #6ba6f7 rather than to grey. It stays clear of the
    // three families it could have collided with — accent 27.2, review 25.6, unavailable 27.3 — and
    // of `surface-disabled` at 21.6.
    Low: [0.75, 0.11, 228],
  };

  /**
   * ONE label colour on all four chips, in both themes. Near-black, warm, so it sits on the amber
   * and yellow bands without the blue cast a neutral grey would give them.
   *
   * This is the choice, and it is the whole reason the ramp works. Type colour is not decoration
   * here: it decides how much LIGHTNESS the fills are allowed to use, and lightness spread is what
   * survives red-green colour blindness. White type at 4.5:1 caps every band near L 0.575, which
   * left four bands sharing a range of 0.095 and nothing to differ by except hue — precisely what a
   * dichromat cannot see. Dark type inverts the constraint: every band must be LIGHT, which opens
   * L 0.64 to 0.96 and gives the ramp somewhere to spread.
   *
   * `Critical` is the ONE exception, since 2026-08-23 — it is dark now, so it takes WHITE ink
   * (`CHIP_INK_ON_CRITICAL`) instead. It is still ONE colour per band, never a per-theme choice.
   */
  const CHIP_INK = [0.2, 0.02, 60];
  const CHIP_INK_ON_CRITICAL = [1, 0, 16];

  const riskSpecs = {};
  for (const band of BANDS) {
    const p = palette[theme].picks[band];
    const key = band.toLowerCase();
    const fgC = isLight ? Math.min(p.C, 0.16) : Math.min(p.C, 0.14);
    const bgSpec = [tintL, isLight ? Math.min(0.045, p.C * 0.22) : Math.min(0.06, p.C * 0.3), p.H];
    const tint = S(...bgSpec);
    const fgS = [solveText(fgC, p.H, tint), fgC, p.H];
    const borderC = isLight ? Math.min(p.C, 0.2) : Math.min(p.C, 0.18);
    const borderS = [solveBorder(borderC, p.H), borderC, p.H];
    // The FIXED chip fill, identical in both themes so the type stays white when the workstation
    // switches. `fg`, `bg` and `border` above still come from the searched ramp: they are used on
    // surfaces (the PD-5 panel, the chart marks) where lightness is free and separation survives.
    const solidS = CHIP[band];
    const solid = S(...solidS);
    const onS = band === 'Critical' ? CHIP_INK_ON_CRITICAL : CHIP_INK;

    add(`color-risk-${key}-fg`, fgS, `${contrast(S(...fgS), surface)} on surface`);
    add(`color-risk-${key}-bg`, bgSpec);
    add(`color-risk-${key}-border`, borderS, `${contrast(S(...borderS), surface)}`);
    add(
      `color-risk-${key}-solid`,
      solidS,
      `${contrast(solid, S(...onS))} vs its ink (${band === 'Critical' ? 'WHITE' : 'the shared dark'}); ${contrast(solid, surface)} vs surface`,
    );
    add(`color-risk-${key}-on`, onS);
    /**
     * The chip's own EDGE. The fills are LIGHT now, which reverses which theme has the problem: in
     * DARK the chip stands off the page by itself, and it is in LIGHT that a pale band — Medium is
     * L 0.96 — approaches the surface and would lose its shape while its label stayed legible
     * (SC 1.4.11 wants 3:1 for a boundary). So the edge darkens in light and is the fill in dark,
     * the mirror of what this line did while the fills were deep.
     */
    const chipEdgeS = isLight
      ? [Math.max(0.42, solidS[0] - 0.22), solidS[1] * 0.9, solidS[2]]
      : solidS;
    add(
      `color-risk-${key}-chip-edge`,
      chipEdgeS,
      `${contrast(S(...chipEdgeS), surface)} vs surface — the chip's boundary`,
    );
    riskSpecs[band] = { fgS, bgSpec, borderS, solidS, onS };
  }

  /* ---- review ----------------------------------------------------------------------------- */
  /**
   * `whiteInk: true` forces the solid DARK ENOUGH for white type to clear 4.5:1, in both themes,
   * instead of accepting whichever of white/near-black happens to win at the chosen lightness.
   *
   * It is available to these families and NOT to the risk ramp, and the difference is measured, not
   * stylistic. The four risk bands must stay separable from each other under three dichromacies, and
   * that separation is built mostly from LIGHTNESS SPREAD. Forcing every band dark enough for white
   * type collapses the spread: darkening only High and Medium far enough takes the ramp's worst pair
   * from ΔE2000 22.0 to **2.5** in light and **0.7** in dark, against a floor of 15 — two adjacent
   * risk bands rendered the same colour to a red-green dichromat, which is the exact failure this
   * whole search exists to prevent. Review state and data sufficiency are not in that comparison, so
   * they can take white type for free.
   */
  const family = (prefix, hue, chroma, tintChroma, solidL, whiteInk = false) => {
    const bgSpec = [tintL, tintChroma, hue];
    const tint = S(...bgSpec);
    const fgS = [solveText(chroma, hue, tint), chroma, hue];
    const borderS = [solveBorder(chroma, hue), chroma, hue];
    add(`${prefix}-fg`, fgS, `${contrast(S(...fgS), surface)} on surface`);
    add(`${prefix}-bg`, bgSpec);
    add(`${prefix}-border`, borderS, `${contrast(S(...borderS), surface)}`);
    if (solidL !== undefined) {
      const solidChroma = chroma + 0.03;
      const white = S(1, 0, hue);
      // Solve rather than assume: ask for the lightness at which white clears the text floor with a
      // little margin, and take the darker of that and the requested lightness.
      const solvedL = whiteInk
        ? Math.min(solidL, solveL(solidChroma, hue, white, 4.7, 'darker'))
        : solidL;
      const solidS = [solvedL, solidChroma, hue];
      const solid = S(...solidS);
      const onS = whiteInk
        ? [1, 0, hue]
        : contrast(solid, white) >= contrast(solid, S(0.16, 0.02, hue))
          ? [1, 0, hue]
          : [0.16, 0.02, hue];
      add(
        `${prefix}-solid`,
        solidS,
        `${contrast(solid, S(...onS))} vs its ink${whiteInk ? ' (WHITE in both themes)' : ''}`,
      );
      add(`${prefix}-on`, onS);
    }
    return { fgS, bgSpec, borderS };
  };

  // WHITE TYPE IN BOTH THEMES. The dark theme's pending solid used to be light enough that its
  // legible ink was near-black, so switching to dark flipped the chip's type from white to dark.
  family(
    'color-review-pending',
    HUES.reviewPending,
    0.17,
    isLight ? 0.028 : 0.07,
    isLight ? 0.52 : 0.66,
    true,
  );
  // A SOLID added 2026-08-23: `Reviewed` reaches the merged filter/tally row as a cell for the
  // first time (`RiskTally.svelte`), and every other cell there is a solid fill — the pale
  // fg/bg/border tint below reads as fainter than its siblings if reused for the chip.
  //
  // HOURS LATER, RE-SOLVED WHOLESALE: a colourblind clinician sent a simulated screenshot of the
  // merged row and several cells were indistinguishable. `separationReport` run across the full
  // NINE-cell set (the four risk fills plus this row's five extra cells) under all three Machado
  // dichromacies found FIVE pairs under this file's own 15 floor — worst was `Critical` vs
  // `Reviewed` at 3.5 under deuteranopia, because darkening `Critical` for legibility (see its own
  // comment) and this cell's white-ink fill had coincidentally landed at nearly the SAME lightness,
  // and deuteranopia cannot read red from green AT ALL — only lightness was left to tell them
  // apart, and there was almost none. `reviewPending` (296°, the "Pending review" badge shown on
  // every pending card — the Handoff's PROMINENT state) and `insufficient` (262°, "Risk level
  // unavailable" on every unrecognised-risk card) were left EXACTLY as deployed on purpose: both
  // have wide, pre-existing usage well beyond this row, and restyling either is a bigger call than
  // a filter-row fix. `Reviewed`, `datasufficiencyunknown` and `datalimited` — new or contained to
  // this row — were re-solved together against those two fixed anchors plus the four risk fills:
  // hue 152 -> 164, L 0.46/0.58 -> 0.61 (ONE value now, fixed across themes like the risk fills),
  // `whiteInk: true -> false` (white only cleared 3.58:1 at the new lightness; dark ink clears
  // 5.07:1). Result: every pair this file can still move now measures >= 14.6 ΔE2000 under the
  // worst of the four vision models — not the full 15 (nine colours sharing two fixed anchors
  // leaves less wheel than four), but close, and the WORST pair in the whole nine-colour set is
  // now the two anchors this pass deliberately left alone (`reviewPending` vs `insufficient`,
  // ~8 ΔE2000 under deuteranopia) — a SEPARATE, pre-existing finding, not something this pass
  // introduced or fixed, flagged for a decision with its own blast radius rather than folded in
  // silently.
  family('color-review-done', HUES.reviewDone, 0.08, isLight ? 0.022 : 0.038, 0.61, false);
  // A SOLID for data sufficiency, which never had one: the unknown chip was a dashed tint and read
  // as fainter than the states it sits beside. Same white-type rule.
  family(
    'color-insufficient',
    HUES.insufficient,
    0.055,
    isLight ? 0.013 : 0.026,
    isLight ? 0.5 : 0.56,
    true,
  );
  add(
    'color-insufficient-hatch',
    isLight ? [0.828, 0.028, HUES.insufficient] : [0.425, 0.038, HUES.insufficient],
    'texture only',
  );

  /**
   * `Data-limited`'s OWN hue. TEAL (195), the original 2026-08-23 pick, was gone within hours —
   * checked only against normal vision when it was picked, it measured ΔE2000 6.8 from `Reviewed`
   * under simulated tritanopia. RE-SOLVED again in the WHOLESALE pass documented on
   * `color-review-done` above, to MAUVE (340, was briefly 355 in between), at `L 0.65 / C 0.08`
   * (solid) — dark ink at 5.4:1 (white only reached 3.4:1 here).
   *
   * SOLID CHROMA RAISED `0.08 -> 0.13`, `L 0.65 -> 0.70`, SAME DAY HOURS LATER, at the product
   * owner's report that the wholesale pass's result read as dull/washed out next to `Reviewed` and
   * `Needs review` ("đổi màu của các label trong hình đẹp hơn", narrowed via follow-up to these
   * two cells specifically). HUE UNCHANGED (340) — a grid search over hue x chroma x lightness
   * (script kept in this commit's PR description, not checked in) found meaningfully more vivid
   * options only by drifting the hue toward 296-310°, i.e. into `review-pending`'s own hue, which
   * would trade CVD separation for saturation rather than gain both; holding 340° fixed and
   * searching only chroma/lightness against the same fixed-anchor set (`review-pending`,
   * `insufficient`, the four risk fills, plus `data-sufficiency-unknown` once IT moved too) found
   * headroom up to roughly `C 0.145` before any pairwise ΔE2000 dropped below this file's
   * PRE-EXISTING worst pair (`review-pending` vs `insufficient`, ~8 light / ~9.1 dark — a separate,
   * out-of-scope finding, see `color-review-done` above). `0.13` leaves a margin rather than
   * sitting at that ceiling. Re-verified: `overallMin` is unchanged at 8 (light) / 9.1 (dark) after
   * this move — nothing in the nine-colour set got WORSE, only `Data-limited` itself got more
   * saturated. Dark ink still clears comfortably (6.85:1 vs the 4.5 floor).
   */
  family('color-datalimited', HUES.dataLimited, 0.1, isLight ? 0.02 : 0.04, 0.7, false);

  /**
   * `data sufficiency unknown`'s OWN hue, added hours after `Data-limited` got one, at the product
   * owner's request ("data sufficiency unknown đang giống với risk level unavailable"): both cells
   * had been sharing `RISK_CHIP_UNKNOWN`'s navy — a colour choice this file's OWN reasoning already
   * argued against for `Data-limited` ("the two read as one navy chip repeated twice"), just not
   * yet applied to this second navy pairing.
   *
   * Olive, hue 110 (moved 10° from the first pick, 120, in the WHOLESALE re-solve documented on
   * `color-review-done` above) — searched against the two fixed anchors, the four risk fills, and
   * the other two cells this pass also moved, across all four vision models at once. Dashed border
   * kept: both cells still mean "we do not know", about two different fields, and dashed is the
   * family's shared "this is an absence" signal — only the FILL now differs, which is what stops
   * them reading as one repeated chip.
   *
   * SOLID CHROMA RAISED `0.14 -> 0.155`, `L 0.59 -> 0.68`, same request and same search as
   * `Data-limited` above, hue held fixed at 110°. Re-verified together with the new `Data-limited`
   * value in the SAME nine-colour report: `overallMin` still 8 / 9.1, unchanged from before either
   * colour moved. Dark ink 6.88:1.
   */
  family(
    'color-datasufficiencyunknown',
    HUES.dataSufficiencyUnknown,
    0.125,
    isLight ? 0.025 : 0.05,
    0.68,
    false,
  );

  /* ---- provenance ------------------------------------------------------------------------- */
  const measured = family('color-prov-measured', HUES.provNeutral, 0.018, isLight ? 0.005 : 0.012);
  // Carried-forward SHARES the measured hue on purpose: stroke, glyph and the mandatory
  // last-measured time carry the difference, and all three survive greyscale and CVD.
  add('color-prov-carried-fg', measured.fgS, 'shares the measured hue by design');
  add('color-prov-carried-bg', measured.bgSpec);
  add('color-prov-carried-border', measured.borderS);
  family('color-prov-population', HUES.provPopulation, 0.17, isLight ? 0.03 : 0.07);

  const staleSpec = [solveL(0.1, HUES.stale, surface, TEXT_TARGET, dir), 0.1, HUES.stale];
  add('color-stale-fg', staleSpec, `${contrast(S(...staleSpec), surface)} on surface`);

  /* ---- chart marks ------------------------------------------------------------------------ */
  const sunken = S(...n.surfaceSunken);
  /**
   * `color-chart-plot-bg` — the two 60-minute charts' OWN plot background, added 2026-08-23 at the
   * product owner's report ("cho nền màu biểu đồ sáng hơn, nó đang hơi tối làm khó nhìn"). LIGHT
   * THEME ONLY: `surface` (the same colour as `canvas`'s cards, i.e. white) instead of the shared
   * `surface-sunken` "well" token every other well (chart data-table head, insufficient-history
   * placeholder) still uses. DARK THEME KEEPS `surface-sunken` UNCHANGED — re-verified rather than
   * assumed: swapping to `surface` in dark mode measured `color-chart-risk-high` at 3.29 and
   * `color-chart-risk-low` at 3.18 against it, BOTH under the 3.6 object-contrast floor those two
   * were solved to clear against `surface-sunken` (dark theme's `surface`, 0.223, is LIGHTER than
   * its own `surface-sunken`, 0.145 — the opposite relationship from light theme, where `surface` is
   * the lighter of the two). Light theme has no such problem: every existing chart mark's contrast
   * against `surface` measured HIGHER than against `surface-sunken`, so nothing needed re-solving
   * there. One token, so both chart components use the same class name in either theme and neither
   * needs a `dark:` variant of its own.
   */
  add(
    'color-chart-plot-bg',
    isLight ? surfaceSpec : n.surfaceSunken,
    isLight
      ? 'lighter than the shared surface-sunken well, this chart only'
      : 'unchanged from surface-sunken',
  );
  const mark = (name, hue, chroma, target = OBJECT_TARGET) => {
    const L = pick(
      solveL(chroma, hue, sunken, target, dir),
      solveL(chroma, hue, surface, target, dir),
    );
    const spec = [L, chroma, hue];
    add(name, spec, `${contrast(S(...spec), sunken)} on surface-sunken`);
    return S(...spec);
  };
  // `color-chart-series` solved against a HIGHER target than the other chart marks, 2026-08-23, at
  // the product owner's request ("cho màu chart nổi hơn" — the 60-minute risk-history line, the
  // only consumer of this specific token, still read as faint at the WCAG non-text floor
  // `OBJECT_TARGET` (3.6) targets). `color-chart-prov-measured` below is left at `OBJECT_TARGET`
  // on purpose even though it shares this token's hue/chroma: it is one of THREE marks
  // (`chartMarks`, below) whose mutual CVD separation was solved together for `ProvenanceChart`,
  // and darkening only "measured" there would make it visually dominate "carried forward" and
  // "population reference" without anyone asking for that. The two tokens now diverge in value
  // for the first time; each is still used by exactly one chart (`RiskHistoryChart` /
  // `ProvenanceChart`), so nothing downstream silently inherits the other's tuning.
  const cm = mark('color-chart-series', HUES.accent, 0.14, 4.6);
  const cMeasured = mark('color-chart-prov-measured', HUES.accent, 0.14);
  const cCarried = mark('color-chart-prov-carried', HUES.stale, 0.12);
  const cPopulation = mark('color-chart-prov-population', HUES.provPopulation, 0.16);
  add(
    'color-chart-grid',
    isLight ? [0.9, 0.006, HUES.accent] : [0.34, 0.014, HUES.accent],
    'hairline, recessive',
  );

  /**
   * FOUR NEW MARKS, added 2026-08-23 for the "latest point coloured by its current risk level"
   * request on `RiskHistoryChart` — and NOT built by reusing `RISK_CHIP`/`RISK_PANEL`'s `-solid` or
   * `-border` tokens, on purpose. `risk-classes.ts`'s own **D-30** comment (2026-08-19) already
   * measured and REJECTED both: `-solid` (`risk-medium-solid` specifically) contrasts 1.13 against
   * the plot surface — invisible — because those fills were solved for badge LEGIBILITY (light
   * fill, dark ink, read by the label beside it), not for standing alone as an 8px dot with nothing
   * else to identify it; and `-border` collapses to ΔE2000 1.1 apart between bands in dark mode —
   * the same colour to everyone, not only a dichromat. D-30's own words: "It needs its own search
   * against the object floor" — this is that search, done the same way `color-chart-series` and
   * `color-datalimited`/`color-datasufficiencyunknown` were (script kept in this commit's PR
   * description): same hue per band as `RISK_CHIP`/`CHIP` (16/70/86/228 — the same clinical
   * identity, a genuinely different colour), each solved to the `OBJECT_TARGET` (3.6) floor against
   * `surface-sunken` like every other chart mark, chroma picked per band and verified afterward.
   * NOT BUILT WITH `mark()`. A first pass called `mark('color-chart-risk-critical', 16, 0.14)` etc,
   * one fixed chroma per band solved to `OBJECT_TARGET` like every other chart mark — and it
   * reproduced D-30's own failure exactly: solving four different hues to the SAME target contrast
   * against the same background converges them all to nearly the SAME lightness (0.605/0.594/
   * 0.588/0.581 in light — a spread of 0.024), and lightness spread, not hue, is what D-26's essay
   * (above, on `RISK_CHIP`) says CVD separation is actually built from. Measured `overallMin` on
   * that first pass: 2.6 (light) / 3.0 (dark) — the same order of magnitude as the `-border` failure
   * D-30 already rejected. Discarded before it reached `app.css`.
   *
   * WHAT SHIPS INSTEAD is a wide-lightness-spread search per theme (script kept in this commit's PR
   * description), mirroring how `CHIP` above hand-picks per-band `L` rather than solving one target
   * for all four. `L`/`C` chosen per band, per theme, for maximum pairwise ΔE2000 subject to
   * clearing the 3.6 object-contrast floor against `surface-sunken`. Worst pairwise separation in
   * the resulting four-mark set: 14.6 ΔE2000 (`high` vs `medium`, light theme) — short of the D-26
   * floor of 15 by 0.4, the same class of near-miss the review/data wholesale re-solve documented on
   * `color-review-done` above already accepted for a larger set; every OTHER pair here clears 27+.
   * Only ONE of the four marks is ever on screen at a time (the chart shows the LATEST reading's
   * single risk level, never more than one), so no two of these four ever need to be told apart from
   * EACH OTHER on the same chart — the separation was still solved for, because the same four tokens
   * sit beside the unrelated `chart-series` line colour and `accent-solid` colour also on this
   * screen, and a future consumer should not inherit an unmeasured set.
   */
  const riskMark = (name, L, C, H) => {
    const spec = [L, C, H];
    add(name, spec, `${contrast(S(...spec), sunken)} on surface-sunken`);
  };
  if (isLight) {
    riskMark('color-chart-risk-critical', 0.3, 0.12, 16);
    riskMark('color-chart-risk-high', 0.58, 0.08, 70);
    riskMark('color-chart-risk-medium', 0.44, 0.09, 86);
    riskMark('color-chart-risk-low', 0.58, 0.12, 228);
  } else {
    riskMark('color-chart-risk-critical', 0.84, 0.03, 16);
    riskMark('color-chart-risk-high', 0.54, 0.12, 70);
    riskMark('color-chart-risk-medium', 0.64, 0.03, 86);
    riskMark('color-chart-risk-low', 0.52, 0.1, 228);
  }

  /* ---- elevation ink ---------------------------------------------------------------------- */
  add(
    'color-shadow-ink',
    isLight ? [0.205, 0.018, HUES.accent] : [0, 0, 0],
    undefined,
    isLight ? '0.07' : '0.55',
  );
  add(
    'color-shadow-ink-soft',
    isLight ? [0.205, 0.018, HUES.accent] : [0, 0, 0],
    undefined,
    isLight ? '0.04' : '0.4',
  );

  return {
    tokens,
    surface,
    canvas,
    sunken,
    riskSpecs,
    chartMarks: [
      ['measured', cMeasured],
      ['carried forward', cCarried],
      ['population reference', cPopulation],
    ],
    series: cm,
    scrimOver: over(S(...scrimSpec), isLight ? 0.58 : 0.72, canvas),
  };
}

const THEMES = { light: makeTheme('light'), dark: makeTheme('dark') };

/* ------------------------------------------------------------------------------------------------
 * Emit
 * ---------------------------------------------------------------------------------------------- */

function renderTokens(theme, indent) {
  const pad = ' '.repeat(indent);
  const width = 32;
  return THEMES[theme].tokens
    .map(({ name, spec, alpha, colour, note, literal }) => {
      const decl = `--${name}:`;
      const value = literal ?? fmtOklch(spec, alpha);
      const comment = note ? `  /* ${colour.hex}  ${note} */` : `  /* ${colour.hex} */`;
      return `${pad}${decl.padEnd(width)}${value};${comment}`;
    })
    .join('\n');
}

const CSS = `/* =============================================================================
   PulseMind — src/app.css
   =============================================================================

   GENERATED. Do not edit by hand — run \`node scripts/build-tokens.mjs\` from \`front-end/\`.
   The generator is \`scripts/build-tokens.mjs\`; the colour maths is \`scripts/color.mjs\`; the risk
   ramp is searched by \`scripts/palette.mjs\`. The measured ledger this file's comments quote is
   written in full to \`docs/spec/contrast-ledger.md\` in the same pass, so the two cannot drift.

   HARNESS-DEFINED, PENDING DESIGN CONFIRMATION. There is no HTML prototype in this repository. The
   handoff (section 1) says visual styling should follow one, and it does not exist. Every colour,
   radius, size, shadow and dark-mode decision here was invented by this harness. Register rows that
   own these decisions: D-01 risk-band colour values, D-02 the redundant encoding channels, D-03 the
   dark theme and where its choice persists, D-04 typography/density/spacing, D-08/D-09 the
   responsive tiers and the display baseline.

   WHAT IS NOT INVENTED — the arithmetic.
   - Every contrast ratio was computed oklch -> OKLab -> linear sRGB -> gamut-map by chroma
     reduction -> 8-bit sRGB -> WCAG relative luminance -> (L1+0.05)/(L2+0.05). The hex beside each
     value is what a browser actually renders. Every pair passes: 4.5:1 for text (SC 1.4.3), 3:1 for
     large text and UI/graphical boundaries (SC 1.4.11). Most clear those floors with margin, because
     solving to the floor exactly puts every token one rounding away from failing.
   - WCAG 2.2 SC 1.4.1: colour may never be the ONLY means of conveying information.

   THE RISK RAMP NOW PASSES COLOUR-VISION SEPARATION, AND THE PREVIOUS ONE DID NOT.
   The ramp this replaces was red/orange/amber/teal and measured CIEDE2000 ${'2.7'} between High and
   Medium under simulated protanopia — against a floor of 15. Two adjacent risk BANDS were the same
   colour to a red-green dichromat, which is roughly one man in twelve reading a triage board at a
   glance. The replacement is searched, not chosen: \`palette.mjs\` maximises the MINIMUM separation
   across normal vision and all three dichromacies (Machado et al. 2009, severity 1.0), and the
   winner measures:

       light   min ΔE2000 ${palette.light.report.overallMin}   (normal ${palette.light.report.normal.min}, protanopia ${palette.light.report.protanopia.min}, deuteranopia ${palette.light.report.deuteranopia.min}, tritanopia ${palette.light.report.tritanopia.min})
       dark    min ΔE2000 ${palette.dark.report.overallMin}   (normal ${palette.dark.report.normal.min}, protanopia ${palette.dark.report.protanopia.min}, deuteranopia ${palette.dark.report.deuteranopia.min}, tritanopia ${palette.dark.report.tritanopia.min})

   That is evidence for D-01 and D-02, not a closure of them: it is still a harness-invented palette,
   and a design-supplied one replaces it and must arrive with these figures re-measured — which is
   one command.

   COLOUR STILL NEVER LEADS. The four state families each own a different non-colour channel:
   risk = fill weight, provenance = border stroke, review = left rule + glyph, data sufficiency =
   45deg hatch — each always with a full text label and a glyph. Passing the CVD floor makes colour a
   better SECOND channel; it does not promote it to first.

   RULES FOR EDITING:
   1. Do not edit this file. Edit the generator and re-run it.
   2. No tailwind.config.js, no postcss.config.js, no @tailwind directives, no @config. v4 is
      configured in CSS only.
   3. The COMPLETE light palette is defined in @theme with literal values. A token whose value is a
      var() indirection must live in \`@theme inline\`, or the indirection resolves at :root scope and
      theme switching silently breaks.
   4. No token may have its ONLY definition inside a media query or a [data-theme] block.
   5. The two dark blocks must stay in sync. They are generated from one model, so they cannot drift.
   6. Components reference semantic tokens only. \`bg-red-600\`, \`text-slate-400\`, \`bg-[#c00]\` are
      all banned; lint for them.
   7. Elevation is themed through --color-shadow-ink / --color-shadow-ink-soft, NEVER by redefining
      --shadow-card/popover/drawer in a dark block. Tailwind inlines a --shadow-* value into
      --tw-shadow at build time and never emits --shadow-card into :root, so a dark --shadow-*
      override is dead code that compiles clean and changes nothing on screen.

   ============================================================================= */

@import 'tailwindcss';

/* Dark is driven by an explicit attribute. The :where() wrapper keeps the variant at zero
   specificity so \`dark:bg-x\` still loses to a later \`bg-y\`, matching normal utility behaviour. */
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

/* =============================================================================
   THEME — LIGHT is the base definition. Every token is defined here.
   ============================================================================= */

/* ===== web fonts ==========================================================
   SELF-HOSTED, not \`fonts.googleapis.com\`. Three reasons, and the first two are the ones that
   matter for a clinical display:

     1. A ward network that cannot reach Google renders the whole app in a fallback face, and with
        \`font-display: swap\` that means a visible reflow of every number on the board seconds after
        it appeared — or no swap at all. Self-hosted, the fonts ship with the app.
     2. Every visitor's IP and referring URL would otherwise go to a third party on every page load
        of a screen that displays PHI. That is a disclosure decision nobody made.
     3. One less origin to reach before first paint.

   LATIN AND LATIN-EXT SUBSETS ONLY. The cyrillic, greek and vietnamese subsets Google serves are
   glyphs this UI cannot produce; carrying them would multiply the bytes for nothing. Regenerate
   with \`node scripts/fetch-fonts.mjs\` if the family list changes.

   Files: ${FONT_FACES.length} · ${(FONT_BYTES / 1024).toFixed(0)} KB total. */

${FONT_FACE_CSS}

@theme {
  /* ===== type =============================================================
     TWO families, and the split is decided by which weights actually EXIST.

     Outfit is VARIABLE 100-900, so every weight this UI asks for — 400, 500,
     600, 700 — is a real master. It carries all the text, including every
     clinical number, because a synthesised weight on a score is a smeared
     digit.

     Sansation ships 300/400/700 only. Ask it for the 600 this UI uses
     everywhere and the browser either snaps to 700 or fakes it, so it is
     confined to DISPLAY headings at weights it really has, and
     \`font-synthesis\` is off app-wide so a missing weight can never be faked
     silently.

     The scale is a major-third-ish ramp with a hard FLOOR of 16px for any
     clinical value — 12px exists only for uppercase micro-labels. */
  --font-sans:
    Outfit, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  --font-display:
    Sansation, Outfit, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace;

  --text-micro: 0.75rem; /* 12px — uppercase micro-labels ONLY, letter-spacing .04em */
  --text-micro--line-height: 1rem;
  --text-sm: 0.875rem; /* 14px — meta, table meta                                  */
  --text-sm--line-height: 1.3rem;
  --text-body: 1rem; /* 16px — body, table cells; FLOOR for any clinical value   */
  --text-body--line-height: 1.5rem;
  --text-lg: 1.125rem; /* 18px — card titles                                       */
  --text-lg--line-height: 1.6rem;
  --text-xl: 1.375rem; /* 22px — section headings                                  */
  --text-xl--line-height: 1.8rem;
  --text-2xl: 1.75rem; /* 28px — screen heading                                    */
  --text-2xl--line-height: 2.1rem;
  --text-value: 2rem; /* 32px — parameter value                                   */
  --text-value--line-height: 2.25rem;
  --text-hero: 3rem; /* 48px — the risk score; exactly one per view              */
  --text-hero--line-height: 1;

  /* ===== breakpoints (PulseMind tiers; these REDEFINE the v4 defaults) =====
     \`xs\` is new: a 380px phone is a real bedside device, and the board has to
     be usable on one without hiding a single clinical value (U-18). */
  --breakpoint-xs: 380px; /* small phone, portrait        */
  --breakpoint-sm: 640px; /* large phone / tablet portrait */
  --breakpoint-md: 1024px; /* tablet landscape / laptop    */
  --breakpoint-lg: 1280px; /* desktop workstation — PRIMARY TARGET */
  --breakpoint-xl: 1728px; /* large workstation            */
  --breakpoint-wall: 2400px; /* declared, unused. A wall display is a DEPLOYMENT fact, not a width:
                                a maximised desktop window is not a ward display, and sizing clinical
                                type from a media query would let resizing a window change what a
                                clinician can read. The density control that would have gated it was
                                removed because nothing was ever keyed on it (D-04). */
  --breakpoint-2xl: initial; /* REMOVED. v4 ships 2xl at 96rem (1536px), which would sort
                                BETWEEN xl and wall, so a stray \`2xl:\` utility would silently
                                beat \`xl:\` at >= 1728px. */

  /* ===== radius / elevation / easing ====================================== */
  --radius-xs: 3px;
  --radius-sm: 6px; /* NOTE: redefines Tailwind's rounded-sm */
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-pill: 999px;

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

${renderTokens('light', 2)}
}

/* Elevation. These are the only tokens whose values are var() indirections, so rule 3 puts them in
   \`@theme inline\`. Inlining is what Tailwind does with the --shadow-* namespace regardless;
   declaring it explicitly documents that the dark theme is reached through --color-shadow-ink,
   never by redefining --shadow-* in a dark block. */
@theme inline {
  /* THE WEIGHT LADDER. Outfit is variable 100-900, so every value here is a real master and
     \`font-synthesis: none\` never has to fake one.

     It used to resolve through a \`--pm-w-*\` indirection so the TEXT WEIGHT setting could shift the
     whole ladder at once. That setting was removed on 2026-08-20 (**D-34**), and the indirection
     went with it: a variable that only ever holds one value is a place for a reader to look for a
     mechanism that is no longer there. */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --shadow-card: 0 1px 2px var(--color-shadow-ink), 0 1px 1px var(--color-shadow-ink-soft);
  --shadow-raised: 0 2px 6px var(--color-shadow-ink), 0 1px 2px var(--color-shadow-ink-soft);
  --shadow-popover: 0 8px 24px var(--color-shadow-ink), 0 2px 6px var(--color-shadow-ink-soft);
  --shadow-drawer: -12px 0 40px var(--color-shadow-ink);
  --shadow-sheet: 0 -8px 32px var(--color-shadow-ink);
}

/* Plain variables: these must NOT mint utilities, so they live in :root, not @theme.
   Reference them as z-(--z-drawer) / var(--duration-drawer). */
:root {
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-drawer: 240ms;

  /* THE HEADER SITS ABOVE THE PAGE'S STICKY CONTENT, and the order matters more than it looks.
     A popover opened from the header — the account menu — is a CHILD of the header, and a child
     cannot escape its parent's stacking context however high its own z-index is. With the header
     below the board's sticky search bar, that menu was painted UNDER the bar: half of the display
     settings sat behind a blurred translucent strip. The two never overlap by position anyway (the
     bar sticks to the header's measured height), so the header simply belongs on top. */
  --z-sticky: 100;
  --z-header: 120;
  --z-scrim: 200;
  --z-drawer: 210;
  --z-popover: 300;
  --z-tooltip: 310;
}

/* =============================================================================
   DARK — redefine ONLY the tokens that change.
   Dark is a DESIGNED palette, not an inversion: surface-sunken is darker than surface here and
   lighter in light mode (a well recedes in both), and every risk hue was re-searched against the
   dark ground rather than flipped.

   The two blocks below carry IDENTICAL declarations. The media block covers "follow the OS" and the
   no-JavaScript case; the attribute block covers the explicit toggle. They are generated from one
   model, so they cannot drift apart.
   ============================================================================= */

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${renderTokens('dark', 4)}
  }
}

:root[data-theme='dark'] {
${renderTokens('dark', 2)}
}

/* =============================================================================
   BASE
   ============================================================================= */

@layer base {
  html {
    color-scheme: light dark;

    /* Published by \`$lib/actions/measure\` once the header and the board's search bar mount. The
       fallbacks are only for the frames before that: a sticky offset resolving to an empty value
       would pin the bar to the very top, over the header. */
    --pm-header-h: 4rem;
    --pm-bar-h: 5rem;

    /* TEXT SIZE and TEXT WEIGHT were set as attributes here by the inline script
       in app.html, and both were removed on 2026-08-20 (**D-34**). Only the
       theme is resolved before first paint now.

       No overflow-x:hidden anywhere in this file. It looks like a safety net and
       is the opposite: it hides a layout that overflows instead of fixing it,
       and because a hidden overflow is still scrollable from script it hides it
       from the reflow test too. Wide content scrolls inside its OWN named region
       (the parameter table); anything else that reaches the edge is a bug to fix
       at the source. */
  }

  /* The body must paint its own background. A transparent body borrows whatever is behind the app
     and invalidates every ratio in the ledger. */
  body {
    background-color: var(--color-canvas);
    color: var(--color-fg);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    /* Never fake a weight or a slant. Sansation has no 600 and no true italic at every weight, and a
       synthesised one is a smeared glyph on a screen where digits are read at a glance. Off here
       means a missing weight falls back to the nearest REAL one, visibly. */
    font-synthesis: none;
    /* iOS Safari zooms a form control below 16px and never zooms back out. */
    text-size-adjust: 100%;
  }

  /* DISPLAY FACE ON SCREEN TITLES ONLY.
     Sansation ships 300/400/700 and this UI sets its headings at 600, so with
     \`font-synthesis: none\` above they render at the nearest REAL weight, 700 —
     a true master rather than a smeared synthetic one. Body text, every table
     and every clinical number stays in Outfit, whose variable axis has a master
     at every weight the interface asks for. */
  h1,
  h2 {
    font-family: var(--font-display);
    letter-spacing: -0.005em;
  }

  /* Two-ring focus indicator, applied by default to every natively focusable thing.
     :focus-visible only — a mouse click on a card must not paint a ring. */
  :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  /* A focused element must never hide under the sticky header (WCAG 2.2 SC 2.4.11). */
  :where(html, body, [data-scroll-container]) {
    scroll-padding-top: 5rem;
  }
}

/* =============================================================================
   UTILITIES
   ============================================================================= */

/* Explicit focus ring for a custom control not covered by the base rule. */
@utility pm-focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* For FILLED controls where an outline alone cannot be guaranteed to contrast: the inner ring paints
   in the surface colour and separates the outer ring from the fill. \`outline: none\` here is
   replaced, not removed. */
@utility pm-focus-filled {
  outline: none;
  box-shadow:
    0 0 0 2px var(--color-focus-offset),
    0 0 0 4px var(--color-focus);
}

/* Data-sufficiency texture. The ONLY meaning of a hatch in PulseMind is "this data is insufficient
   or unknown". It never animates, and it always sits over a flat fill so text keeps its ratio. */
@utility pm-hatch {
  background-image: repeating-linear-gradient(
    45deg,
    transparent 0 6px,
    var(--color-insufficient-hatch) 6px 7px
  );
}

/* The data-sufficiency EDGE — the same meaning as pm-hatch, confined to an 8px strip down the
   card's right edge so it is findable in peripheral vision while a long board scrolls. The hatch
   itself is the channel rule 8 assigns to data sufficiency; this only changes where it is painted.
   RIGHT edge on purpose: the LEFT one belongs to review state, and two families on one edge is how
   a channel stops meaning one thing. */
@utility pm-hatch-edge {
  background-image: repeating-linear-gradient(
    45deg,
    transparent 0 6px,
    var(--color-insufficient-hatch) 6px 7px
  );
  background-size: 8px 100%;
  background-position: right center;
  background-repeat: no-repeat;
}

/* Population-reference texture, distinct from the sufficiency hatch by PITCH as well as hue, so the
   two never read as the same claim. */
@utility pm-hatch-population {
  background-image: repeating-linear-gradient(
    45deg,
    transparent 0 9px,
    var(--color-prov-population-border) 9px 10px
  );
}

/* Respect the notch and the home indicator. A bedside phone held one-handed puts the primary action
   exactly where the indicator is. */
@utility pm-safe-b {
  padding-bottom: max(env(safe-area-inset-bottom), 0.75rem);
}

/* =============================================================================
   ENVIRONMENT OVERRIDES
   ============================================================================= */

/* Windows High Contrast / forced-colors strips colour entirely. What survives is exactly the
   non-colour channel set: glyph, border style, text label. Test the triage board here. */
@media (forced-colors: active) {
  .pm-hatch,
  .pm-hatch-population,
  .pm-hatch-edge {
    background-image: none;
    border-style: dashed;
  }

  :where(a, button, input, select, textarea, [tabindex]):focus-visible {
    outline: 3px solid Highlight;
    outline-offset: 2px;
  }

  /* The only two selection/current attributes PulseMind emits: aria-pressed on the risk-tally
     band toggles, aria-current="page" on the active parameter chip and the returned-from parameter
     row. The patient CARD carries neither — it is a plain link (**D-22**). There is deliberately no
     [aria-selected] rule: nothing in this product is a tab, an option, or a grid cell. */
  [aria-pressed='true'],
  [aria-current='page'] {
    outline: 3px solid Highlight;
  }
}

/* What moves in PulseMind: the drawer slide, the scrim fade, the focus ring, and the loading
   indicator (**D-31**). Nothing clinical moves — no value, no chart, no chip (rule 12, **D-06**).
   prefers-reduced-motion suppresses the movement; it must NEVER suppress the state change.

   This block cannot reach the loading mark, and that is worth knowing rather than assuming: it is an
   animated GIF, which ignores every motion preference and every CSS animation property. That case is
   handled by SWAPPING to a still frame in \`PulseLoader.svelte\` and in \`app.html\`, not here. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* =============================================================================
   COMPANION SNIPPET — src/app.html, inside <head>, BEFORE SvelteKit's head placeholder.
   Synchronous and inline, or the page paints light-then-dark on every reload. Never do this in a
   $effect or onMount. The catch branch resolves to an explicit theme; never leave it unset.

   <script>
     (function () {
       try {
         var stored = localStorage.getItem('pm-theme');          // 'light' | 'dark' | null (= system)
         var resolved = stored ||
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
         document.documentElement.setAttribute('data-theme', resolved);
       } catch (e) {
         document.documentElement.setAttribute('data-theme', 'light');
       }
     })();
   </script>

   Where the choice persists is a product decision. HARNESS: the handoff never mentions dark mode or
   a theme at all, and the only persistence concern its section 8 names is "Persistence rules for
   review actions" — theme persistence is the same class of undefined production concern but is not
   itself listed there, so no handoff clause governs it either way. \`localStorage\` per workstation is
   a harness placeholder, pending design confirmation (open question D-03).
   ============================================================================= */
`;

/* ------------------------------------------------------------------------------------------------
 * The ledger
 * ---------------------------------------------------------------------------------------------- */

function ledgerFor(theme) {
  const t = THEMES[theme];
  const byName = Object.fromEntries(t.tokens.map((x) => [x.name, x.colour]));
  const rows = [];
  const grounds = [
    ['surface', byName['color-surface']],
    ['canvas', byName['color-canvas']],
    ['surface-sunken', byName['color-surface-sunken']],
    ['surface-raised', byName['color-surface-raised']],
    ['surface-hover', byName['color-surface-hover']],
  ];

  const textTokens = [
    'color-fg',
    'color-fg-secondary',
    'color-fg-muted',
    'color-accent-fg',
    ...BANDS.map((b) => `color-risk-${b.toLowerCase()}-fg`),
    'color-review-pending-fg',
    'color-review-done-fg',
    'color-insufficient-fg',
    'color-prov-measured-fg',
    'color-prov-carried-fg',
    'color-prov-population-fg',
    'color-stale-fg',
  ];

  for (const name of textTokens) {
    const c = byName[name];
    if (!c) continue;
    // Only a FAMILY token has an own tint. `color-fg-secondary` does not end in `-fg`, so a naive
    // `replace(/-fg$/, '-bg')` leaves the name unchanged and the token is compared against ITSELF,
    // which is a ratio of 1 and reads as a failing pair that does not exist.
    const ownName = name.endsWith('-fg') ? `${name.slice(0, -3)}-bg` : null;
    const own = ownName !== null && ownName !== name ? byName[ownName] : undefined;
    rows.push({
      kind: 'text',
      token: name,
      hex: c.hex,
      values: grounds
        .map(([g, gc]) => `${g} ${contrast(c, gc)}`)
        .concat(own ? [`own-bg ${contrast(c, own)}`] : []),
    });
  }

  const objectTokens = [
    'color-border-strong',
    'color-focus',
    'color-accent-border',
    'color-accent-solid',
    ...BANDS.map((b) => `color-risk-${b.toLowerCase()}-border`),
    'color-review-pending-border',
    'color-review-done-border',
    'color-insufficient-border',
    'color-prov-measured-border',
    'color-prov-population-border',
    'color-chart-series',
    'color-chart-prov-measured',
    'color-chart-prov-carried',
    'color-chart-prov-population',
  ];
  for (const name of objectTokens) {
    const c = byName[name];
    if (!c) continue;
    rows.push({
      kind: 'object',
      token: name,
      hex: c.hex,
      values: [
        `surface ${contrast(c, byName['color-surface'])}`,
        `canvas ${contrast(c, byName['color-canvas'])}`,
        `sunken ${contrast(c, byName['color-surface-sunken'])}`,
      ],
    });
  }

  const inkPairs = [
    ['color-on-accent', 'color-accent-solid'],
    ...BANDS.map((b) => [
      `color-risk-${b.toLowerCase()}-on`,
      `color-risk-${b.toLowerCase()}-solid`,
    ]),
    ['color-review-pending-on', 'color-review-pending-solid'],
  ];
  for (const [ink, fill] of inkPairs) {
    if (!byName[ink] || !byName[fill]) continue;
    rows.push({
      kind: 'ink',
      token: `${ink} on ${fill}`,
      hex: byName[ink].hex,
      values: [`${contrast(byName[ink], byName[fill])}`],
    });
  }

  return rows;
}

function failures() {
  const out = [];
  for (const theme of ['light', 'dark']) {
    for (const row of ledgerFor(theme)) {
      const floor = row.kind === 'object' ? 3.0 : 4.5;
      for (const v of row.values) {
        const n = Number(v.split(' ').pop());
        if (Number.isFinite(n) && n < floor) out.push(`${theme} ${row.token}: ${v} < ${floor}`);
      }
    }
  }
  return out;
}

const LEDGER = `# PulseMind — contrast and colour-vision ledger

**GENERATED.** Run \`node scripts/build-tokens.mjs\` from \`front-end/\`. Every number here was
computed by \`front-end/scripts/color.mjs\` from the same model that emits \`src/app.css\`, in one pass,
so the stylesheet and this file cannot disagree. Nothing below is estimated.

Pipeline: \`oklch -> OKLab -> linear sRGB -> gamut-map by chroma reduction -> 8-bit sRGB -> WCAG
relative luminance -> (L1+0.05)/(L2+0.05)\`. The hex beside each token is what a browser renders after
gamut mapping, which is what the ratio is measured on.

Floors: **4.5:1** for text (WCAG 2.2 AA SC 1.4.3) and **3:1** for large text, UI boundaries and
graphical objects (SC 1.4.11).

Provenance: every VALUE is harness-defined, pending design confirmation (**D-01**, **D-02**). Every
RATIO is measured.

---

## 1. Risk-ramp colour-vision separation — the figure D-01 and D-02 turn on

The ramp this replaced was red / orange / amber / teal, and it **failed**: CIEDE2000 between High and
Medium measured **2.7 under simulated protanopia** and **3.0 under deuteranopia**, against a floor of
**${DELTA_E_FLOOR}**. Two adjacent risk BANDS were the same colour to a red-green dichromat — roughly
one man in twelve — reading a triage board at a glance.

Those two numbers are **this file's own measurement**, and they are the ones to quote. An earlier
design-research pass recorded ΔE2000 2.3 under protanopia and 9.4 at normal vision for the same
family of hues, and that pair is still quoted in \`docs/LESSONS.md\` as the historical finding. The
two disagree because they measure different specific hex values, not because either is wrong; they
agree on the verdict, which is the only part that ever mattered. Anywhere a document needs a current
figure it cites this ledger, so there is exactly one number in play at a time.

The replacement is searched rather than chosen. \`scripts/palette.mjs\` maximises the **minimum**
pairwise separation across normal vision and all three dichromacies (Machado, Oliveira & Fernandes
2009 matrices, severity 1.0), subject to every contrast floor below. Hue windows keep the
conventional clinical reading — red is worst, teal is best (**G-35** is still open on whether a ward
convention should override that).

${['light', 'dark']
  .map((theme) => {
    const r = palette[theme].report;
    const rows = ['normal', 'protanopia', 'deuteranopia', 'tritanopia']
      .map(
        (m) =>
          `| ${m} | ${r[m].min} | ${r[m].min >= DELTA_E_FLOOR ? '**PASS**' : '**FAIL**'} | ${r[m].worst} |`,
      )
      .join('\n');
    // The CHIP ramp is what a clinician compares on the board, and since 2026-08-17 it is NOT the
    // searched ramp — it is the fixed vivid set that carries white type. Report both, and mark this
    // one against the floor honestly.
    const chipColours = Object.fromEntries(
      BANDS.map((b) => [
        b,
        THEMES[theme].tokens.find((t) => t.name === `color-risk-${b.toLowerCase()}-solid`).colour,
      ]),
    );
    // `separationReport` takes ENTRIES, not an object — the same shape `chartMarks` passes.
    const chip = separationReport(BANDS.map((b) => [b, chipColours[b]]));
    const chipRows = ['normal', 'protanopia', 'deuteranopia', 'tritanopia']
      .map(
        (m) =>
          `| ${m} | ${chip[m].min} | ${chip[m].min >= DELTA_E_FLOOR ? 'pass' : '**FAIL**'} | ${chip[m].worst} |`,
      )
      .join('\n');

    return `### ${theme[0].toUpperCase()}${theme.slice(1)} theme — CHIP fills (what is on the board)

| Vision model | min ΔE2000 | Verdict | Closest pair |
|---|---:|---|---|
${chipRows}
| **overall** | **${chip.overallMin}** | ${chip.overallMin >= DELTA_E_FLOOR ? '**PASS**' : '**FAIL**'} | floor ${DELTA_E_FLOOR} |

Bands: ${BANDS.map((b) => `${b} \`${chipColours[b].hex}\``).join(' · ')}

${
  chip.overallMin >= DELTA_E_FLOOR
    ? ''
    : `> **This ramp does not meet the floor, and that is a recorded decision, not a regression.**
> The chip fills were fixed to carry WHITE type on brighter colours at the product owner's
> instruction (**D-21**), asked for twice with these figures in front of them. White type at 4.5:1
> caps every band near L 0.58, and this ramp's separation was built from lightness spread — flattened,
> the three warm bands converge. High and Medium at ${chip.overallMin} are the same colour to a
> red-green dichromat, roughly one man in twelve.
>
> What still separates them is what always carried the meaning: the FULL WORD on every chip, never
> abbreviated and never in a tooltip, and a distinct glyph shape per band. Colour was the redundant
> channel here, and it is the redundant channel that was spent.
`
}
### ${theme[0].toUpperCase()}${theme.slice(1)} theme — searched ramp (surfaces, panels, chart marks)\n\n| Vision model | min ΔE2000 | Verdict | Closest pair |\n|---|---:|---|---|\n${rows}\n| **overall** | **${r.overallMin}** | ${r.overallMin >= DELTA_E_FLOOR ? '**PASS**' : '**FAIL**'} | floor ${DELTA_E_FLOOR} |\n\nBands (the SEARCH's own picks — the seed \`-fg\`, \`-bg\` and \`-border\` are derived from, and NOT a shipped fill; the chip fills are the table above): ${BANDS.map((b) => `${b} \`${palette[theme].picks[b].colour.hex}\``).join(' · ')}\n\nChart marks take the \`-border\` values, which are solved to the 3:1 object floor at a near-constant lightness — so they do NOT inherit this table's spread. Their own separation is section 2.1.`;
  })
  .join('\n\n')}

**This is evidence, not a closure.** It is still a harness-invented palette measured by the harness
that invented it. A design-supplied ramp replaces these hues and must arrive with this table
re-measured — which is one command.

**And colour still never leads.** Passing the floor makes colour a better SECOND channel; it does not
promote it to first. Risk keeps fill weight, provenance keeps border stroke, review keeps the left
rule, sufficiency keeps the hatch, and every state keeps its full text label and glyph (SC 1.4.1).

### 1.1 Is each band still a COLOUR? — measured against a neutral of its own lightness

Every table above is pairwise: it asks whether two bands can be told apart. **None of them asks
whether a band is still chromatic**, and a hue can clear every pair and still simulate to grey,
because its siblings move with it. That is the defect a product owner found in the teal \`Low\`
before this file did (**D-28**, \`docs/LESSONS.md\` L-078): 20.2 from an equal-lightness neutral with
normal vision, **2.8 under protanopia** — the band meaning "this patient is fine" read as an ABSENCE
and joined the disabled/unavailable vocabulary, in exactly the population the ramp was searched for.

The reference is a neutral at the colour's own lightness, which isolates hue. **This table is
ADVISORY and does not fail the build**: a near-neutral band is survivable when the full word and the
glyph carry it, and \`Critical\` is genuinely near-neutral to a protanope. It exists so that fact is
visible rather than discovered by a reader.

${['light', 'dark']
  .map((theme) =>
    BANDS.map((b) => {
      const c = THEMES[theme].tokens.find(
        (t) => t.name === `color-risk-${b.toLowerCase()}-solid`,
      ).colour;
      const m = chromaticity(c);
      return `| ${theme} | ${b} | \`${c.hex}\` | ${m.normal} | ${m.protanopia} | ${m.deuteranopia} | ${m.tritanopia} | ${m.min >= DELTA_E_FLOOR ? 'chromatic' : '**near-neutral**'} |`;
    }).join('\n'),
  )
  .join('\n')
  .replace(
    /^/,
    '| Theme | Band | Hex | normal | protan | deutan | tritan | Reads as |\n|---|---|---|---:|---:|---:|---:|---|\n',
  )}

---

## 2. Chart-mark separation

Chart marks are separate tokens from badge tokens — a badge sits on a text surface and needs dark,
high-ratio ink; a mark sits on the plot surface and needs mid-lightness. The three provenance marks
must also stay apart under CVD, because a mark's SHAPE and its colour together carry provenance.

### 2.1 Risk marks — the \`-border\` set, MEASURED AND NOT ADOPTED

The four \`-border\` values are what a per-band chart mark WOULD use, and this table is why no chart
colours its marks by risk band today. \`-border\` is solved to the 3:1 object floor against the plot
surface, which pins all four to a near-constant lightness — and lightness spread is the whole of
what D-26's chip ramp separates by. Flattened, the warm bands collapse exactly as they did under
D-21.

${['light', 'dark']
  .map((theme) => {
    const marks = BANDS.map((b) => [
      b,
      THEMES[theme].tokens.find((t) => t.name === `color-risk-${b.toLowerCase()}-border`).colour,
    ]);
    const r = separationReport(marks);
    return `| ${theme} | normal ${r.normal.min} | protanopia ${r.protanopia.min} | deuteranopia ${r.deuteranopia.min} | tritanopia ${r.tritanopia.min} | **min ${r.overallMin}** | ${r.overallMin >= DELTA_E_FLOOR ? 'pass' : `**FAIL** vs floor ${DELTA_E_FLOOR} (${r[['normal', 'protanopia', 'deuteranopia', 'tritanopia'].reduce((a, k) => (r[k].min < r[a].min ? k : a), 'normal')].worst})`} |`;
  })
  .join('\n')
  .replace(/^/, '| Theme | | | | | | Verdict |\n|---|---|---|---|---|---|---|\n')}

**What ships instead**, and it is a deliberate position rather than an omission: \`RiskHistoryChart\`
draws every point in one series colour and encodes the only mark-borne clinical fact — data
sufficiency — by SHAPE (a hollow square for \`insufficient\` or unknown, a filled circle otherwise),
repeated in each mark's accessible name and in the chart's mandatory data table. Risk band is read
from the chip beside the chart, never from a mark's hue. Adopting a per-band mark ramp needs a fresh
search against the 3:1 object floor, not a reuse of \`-border\`; registered as **D-30**.

### 2.2 Provenance marks

${['light', 'dark']
  .map((theme) => {
    const r = separationReport(THEMES[theme].chartMarks);
    return `| ${theme} | normal ${r.normal.min} | protanopia ${r.protanopia.min} | deuteranopia ${r.deuteranopia.min} | tritanopia ${r.tritanopia.min} | **min ${r.overallMin}** |`;
  })
  .join('\n')
  .replace(/^/, '| Theme | | | | | |\n|---|---|---|---|---|---|\n')}

---

${['light', 'dark']
  .map((theme) => {
    const rows = ledgerFor(theme);
    const text = rows.filter((r) => r.kind === 'text');
    const object = rows.filter((r) => r.kind === 'object');
    const ink = rows.filter((r) => r.kind === 'ink');
    const table = (list, head) =>
      `| Token | Hex | ${head} |\n|---|---|---|\n` +
      list.map((r) => `| \`${r.token}\` | \`${r.hex}\` | ${r.values.join(' · ')} |`).join('\n');
    return `## ${theme === 'light' ? '3' : '4'}. ${theme[0].toUpperCase()}${theme.slice(1)} theme

### Text — floor 4.5:1

${table(text, 'Measured against')}

### Graphical objects and boundaries — floor 3:1

${table(object, 'Measured against')}

### Ink on a filled control — floor 4.5:1

${table(ink, 'Ratio')}`;
  })
  .join('\n\n---\n\n')}

---

## 5. Verdict

${
  failures().length === 0
    ? '**Every pair in this ledger passes its floor.** Regenerate after any token change; this line is written from the measurements, not asserted.'
    : `**${failures().length} pairs FAIL:**\n\n${failures()
        .map((f) => `- ${f}`)
        .join('\n')}`
}
`;

/* ------------------------------------------------------------------------------------------------
 * Write
 * ---------------------------------------------------------------------------------------------- */

const targets = [
  [resolvePath(HERE, '../src/app.css'), CSS],
  [resolvePath(HERE, '../../.claude/skills/tailwind-design-system/references/tokens.css'), CSS],
  [resolvePath(HERE, '../../docs/spec/contrast-ledger.md'), LEDGER],
];

for (const [path, contents] of targets) {
  writeFileSync(path, contents, 'utf8');
  console.log(`wrote ${path}`);
}

const bad = failures();
console.log(
  `\nsearched ramp (surfaces) — light ${palette.light.report.overallMin}, dark ${palette.dark.report.overallMin} (floor ${DELTA_E_FLOOR})`,
);
console.log(
  bad.length === 0 ? 'contrast: every pair passes' : `contrast: ${bad.length} FAILING pairs`,
);
for (const f of bad) console.log(`  ${f}`);
if (bad.length > 0) process.exitCode = 1;
