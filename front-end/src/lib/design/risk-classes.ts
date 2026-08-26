// src/lib/design/risk-classes.ts
// CANONICAL DECLARATION — this file. No skill document holds a competing copy (CLAUDE.md rule 19);
// `.claude/skills/tailwind-design-system/SKILL.md` section 3 points here and shows excerpts only.
//
// It used to be declared THERE, and on 2026-08-19 that copy was found four exports short and
// still carrying the pre-D-21 fill-weight ladder — including `Low: bg-transparent`, an outline
// chip whose only signal is its text colour. A builder regenerating the module from it would have
// shipped that. Moved here for the reason `control-classes.ts` and `review-classes.ts` already
// live here: a module whose whole purpose is that exactly one copy of these strings exists must
// not have a second full copy in a document nothing type-checks (`docs/LESSONS.md` L-075).
//
// NEVER build a class name by concatenation or interpolation. `bg-risk-${level}` is never generated
// by Tailwind, so a Critical patient would render with NO background and be visually
// indistinguishable from a Low one on the triage board. Every value below is a complete, greppable
// class string, and `as const satisfies Record<Union, string>` is the exhaustiveness check: add a
// band to the domain union and this file goes red instead of the lookup quietly yielding
// `undefined`.
//
// Risk's non-colour channels are the FULL WORD, never abbreviated and never in a tooltip
// (S-01…S-04), `RiskGlyph`'s distinct SHAPE per band, and what is left of a weight ladder: a 2px
// border on the two severe bands and 1px on the two lower ones. It is NOT the old
// solid -> tint -> tint -> outline ladder; all four chips have been solid fills since 2026-08-18
// (**D-26**), which is what the product owner asked for and what cost the ladder.
//
// Colour is secondary, and it stays secondary now that the ramp PASSES. Never restate a figure here
// — `docs/spec/contrast-ledger.md` is generated from the same model as the stylesheet and is the one
// place a ratio or a ΔE is authoritative (`CLAUDE.md` section 7). A passing ΔE is not a licence to
// lead with hue: greyscale print, dimmed bedside displays and forced-colors mode have no hue to
// separate. The hues are harness-invented, evidence for **D-01** and **D-02**, not handoff facts.
// What survives any hue change is the rule: colour never leads.

import type { RiskLevel } from '$lib/domain/types';

/**
 * `flex-wrap`, NOT `whitespace-nowrap`, and that is a clinical-safety choice rather than a layout
 * taste. The chip carries two mandated literals side by side, and in the S-05 + S-35 pair they read
 * `Risk level unavailable · score unavailable` — 317px of text with no legal abbreviation (rule 8
 * bans C/H/M/L, S-05 and S-35 fix the wording). Held on one line it pushed the whole 320px board
 * sideways; shortened or truncated it would be a different, weaker claim than the one the state
 * matrix mandates. So the CHIP wraps between its parts and each part stays intact on its own line —
 * `RiskChip.svelte` puts `whitespace-nowrap` on the literals themselves.
 */
/**
 * `text-body`, not `text-sm`. The band word and the score are clinical values, and `app.css` calls
 * 16px "FLOOR for any clinical value" — this chip printed them at 14px. Raising it is also the
 * cheaper half of the type inversion (2026-08-18): the largest thing on a card used to be the
 * patient IDENTIFIER, so the board's own type scale said the MRN mattered more than the risk.
 */
export const RISK_CHIP_BASE =
  'inline-flex min-h-7 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-sm border px-2 py-0.5 ' +
  'text-body font-semibold tabular-nums';

/**
 * Every value is a complete, greppable class string. Tailwind sees all four.
 *
 * ALL FOUR ARE SOLID FILLS. They used to run solid → 2px-bordered tint → 1px-bordered tint →
 * outline, and that ladder was risk's non-colour channel. Filling every band makes the weaker levels
 * as substantial as Critical, which is what was asked for, and it costs that ladder — so the two
 * channels that remain carry the load: the FULL WORD, always written out and never abbreviated
 * (S-01…S-04), and `RiskGlyph`'s distinct SHAPE per band. Both survive greyscale, a dimmed bedside
 * display, and print. The border ladder below is what is left of the third channel: 2px on the two
 * severe bands, 1px on the two lower ones.
 *
 * THE INK IS ONE SHARED NEAR-BLACK ON ALL FOUR, in both themes, on LIGHT fills — and the reversal is
 * the point. From 2026-08-17 these were vivid DARK fills carrying WHITE type, asked for twice by the
 * product owner (**D-21**), and the ledger marked the ramp FAIL: white type at 4.5:1 caps every band
 * near L 0.575, which left the four inside a lightness range of 0.095 with nothing to differ by but
 * hue — and hue is what a red-green dichromat cannot see. The owner then reported that Critical and
 * High looked alike, which is that measurement arriving in a person's eyes, and chose the ramp here
 * (**D-26**). Dark ink inverts the binding constraint: every band must now be LIGHT, which opens
 * L 0.64–0.96 and is where the separation came back from. `Low` moved on from teal to azure two days
 * later, because teal simulated to a near-neutral under protanopia and the band meaning "this
 * patient is fine" read as an absence (**D-28**, `docs/LESSONS.md` L-078).
 *
 * TWO STANDING CONSTRAINTS, neither stylistic. No band may be dark again while the ink is dark. And
 * the chip fills are NOT the searched ramp and must not be reused as chart marks — a chip is read by
 * its label, a mark has nothing but itself, and `risk-medium-solid` measures 1.13 against the plot
 * surface. `-border` is not the alternative either; see **D-30** and the deleted mark map below.
 *
 * Every figure above that is a MEASUREMENT lives in `docs/spec/contrast-ledger.md`, which is
 * generated from the same model as `app.css`. Cite it; never restate one here, or the two drift.
 */
export const RISK_CHIP = {
  Critical: 'border-2 border-risk-critical-chip-edge bg-risk-critical-solid text-risk-critical-on',
  High: 'border-2 border-risk-high-chip-edge bg-risk-high-solid text-risk-high-on',
  Medium: 'border border-risk-medium-chip-edge bg-risk-medium-solid text-risk-medium-on',
  Low: 'border border-risk-low-chip-edge bg-risk-low-solid text-risk-low-on',
} as const satisfies Record<RiskLevel, string>;

/**
 * Explicit, visible, and NOT a copy of the Low styling. `?? RISK_CHIP.Low` is a safety bug.
 *
 * A SOLID fill in both themes, so it reads as substantially as the bands it sits beside — a state
 * that is genuinely unknown should not look fainter than one that is known. It keeps its DASHED
 * border, which is what still says "not a band" at a glance and in greyscale.
 *
 * It deliberately does NOT follow the four bands onto the light fills they took on 2026-08-18. The
 * bands are light now because dark type is what let them spread apart; this chip is not competing
 * for separation with anything, and keeping it in the insufficient family — its own hue, its own
 * ink — is what stops "unknown" being mistaken for a fifth severity between Low and Medium.
 */
export const RISK_CHIP_UNKNOWN =
  'border-dashed border-insufficient-on bg-insufficient-solid text-insufficient-on';

/** The same ordinal weighting for a larger surface — the PD-5 hero band and the OV-5 panel. */
export const RISK_PANEL = {
  Critical: 'border-risk-critical-solid bg-risk-critical-bg text-risk-critical-fg border-l-4',
  High: 'border-risk-high-border bg-risk-high-bg text-risk-high-fg border-l-4',
  Medium: 'border-risk-medium-border bg-risk-medium-bg text-risk-medium-fg border-l-4',
  Low: 'border-risk-low-border bg-risk-low-bg text-risk-low-fg border-l-4',
} as const satisfies Record<RiskLevel, string>;

export const RISK_PANEL_UNKNOWN =
  'border-dashed border-insufficient-border bg-insufficient-bg text-insufficient-fg border-l-4';

/*
 * THERE IS DELIBERATELY NO PER-BAND CHART-MARK MAP HERE. Removed 2026-08-19; registered as **D-30**.
 *
 * A `RISK_MARK` map did live here, mapping each band to `fill-risk-<band>-border`. It was exported,
 * imported by nothing, and would have been wrong the moment anything imported it. Chart marks are
 * separate tokens from badge tokens for a real reason — a badge is read by its label, a mark has
 * nothing but itself, and `risk-medium-solid` measures 1.13 against the light plot surface — but
 * `-border` was the wrong destination. Those four values are each solved to the 3:1 object floor
 * against the same surface, which pins them to a near-constant lightness, and lightness spread is
 * the whole of what D-26's ramp separates by. Measured: the four `-border` values sit at ΔE2000
 * **3.6 apart under protanopia in the light theme and 1.1 in the dark**, against this project's
 * floor of 15 (`docs/spec/contrast-ledger.md` section 2.1). In dark mode they are the same colour.
 *
 * What ships instead is in `RiskHistoryChart.svelte`: one series colour for every point, with the
 * only mark-borne clinical fact — data sufficiency — carried by SHAPE, by each mark's accessible
 * name, and by the chart's mandatory data table. Risk band is read from the chip beside the chart.
 *
 * Do not reintroduce a per-band mark map by reusing `-border`. It needs its own search against the
 * object floor, which is D-30's question.
 */
