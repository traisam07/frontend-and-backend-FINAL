// src/lib/domain/derive.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` sections 1 and 2.
//
// Effect-free. No runes here at all: pure functions, unit-tested directly, imported by the state
// module and by the loads. Derivation NEVER happens inside a component.

import { assumedUnitLabel } from './units';
import type {
  ChartPoint,
  ChartTableRow,
  ParameterRowVm,
  PatientSnapshot,
  PatientSummary,
  ProvenancePoint,
  Reading,
  ReviewStatus,
  TimedReading,
} from './types';
import { formatAbsolute, formatAge } from './format';
import { gapFlags, orderByChartTimeAsc } from './window';

function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

/**
 * THE single owner of the three review literals. The chips render `reviewLabel(status)` and never a
 * label prop, so `Reviewed`, `Pending review` and `Review status unavailable` (S-09) exist exactly
 * once across the whole app.
 *
 * An exhaustive `switch` with a `never`-typed default is how a fourth case is prevented from
 * appearing silently.
 */
export function reviewLabel(status: ReviewStatus): string {
  switch (status) {
    case 'reviewed':
      return 'Reviewed';
    case 'pending_review':
      return 'Pending review';
    case 'unknown':
      return 'Review status unavailable'; // the canonical string — S-09
    default:
      return assertNever(status);
  }
}

/**
 * F-1, the latest reading: the one with the greatest usable charttime, never `readings[0]`.
 * The ordering is ascending, so the latest is the LAST element — and on a charttime collision that
 * is the later-in-source reading, as F-1 step 4 requires.
 *
 * `null` means no reading carries a usable timestamp — state U-11, an explicit screen, not an empty
 * panel. Every consumer takes this helper; nothing reads a `latestReading` field, because
 * `PatientSnapshot` does not have one.
 */
export function latestReading(readings: readonly Reading[]): TimedReading | null {
  const latest = orderByChartTimeAsc(readings).at(-1);
  return latest === undefined ? null : latest; // an explicit state, never a defaulted value
}

/**
 * The board projection, and the ONLY producer of `PatientSummary`: one row per patient, every
 * clinical member copied from that patient's F-1 latest reading and nothing invented. It is a
 * projection, not a second source of truth — no formatting, no ranking, no re-derivation.
 *
 * With no usable reading every clinical member is explicitly absent (U-11); the card renders that,
 * rather than a zero score or a defaulted level.
 */
export function toPatientSummary(snapshot: PatientSnapshot): PatientSummary {
  const latest = latestReading(snapshot.readings);
  if (latest === null) {
    return {
      patientId: snapshot.patientId,
      reviewStatus: snapshot.reviewStatus,
      riskLevel: null, // U-11, and the card says so in words
      riskScore: null,
      sufficientData: null,
      latestChartTime: null,
      topContributors: [],
      heldAtLevel: { kind: 'unavailable' }, // U-11 — no reading to count from
    };
  }
  return {
    patientId: snapshot.patientId,
    reviewStatus: snapshot.reviewStatus, // patient-level (warning_status.status), never per reading
    riskLevel: latest.riskLevel, // null carried through => S-05. Never 'Low'.
    riskScore: latest.riskScore, // null carried through => S-35. Never 0.
    sufficientData: latest.sufficientData, // null carried through => S-10. Never 'sufficient'.
    latestChartTime: latest.charttime,
    topContributors: latest.topContributors,
    // The SAME function PD-6 calls, over the SAME full readings array — F-3 counts over everything
    // delivered, never over the 60-minute window. Deriving it here is the only way the board can
    // show it at all: `toPatientSummary` is where `readings[]` stops travelling.
    heldAtLevel: heldAtLevel(snapshot.readings),
  };
}

/* ---- the two presentation projections ----------------------------------------------------------
   `ParameterRowVm` and `ChartPoint` are PRE-FORMATTED, and these are their only producers.
   Formatting once, here, is what stops a table cell re-rounding a value or a chart mark re-deriving
   a label at render time — and it is why neither shape is ever built inline in a component.      */

/**
 * **G-01**: the schema has no `unit` field, so this is the marker every value carries beside it.
 * Never a hard-coded parameter-name -> unit map INVENTED HERE — that is a clinical fact.
 * `$lib/domain/units` supplies the labels the product owner asked for (**D-23**); this is the
 * fallback for any quantity that table does not know, and the fallback is the point.
 *
 * IT IS NO LONGER THE RISK-HISTORY CHART'S `unitLabel`. It was, while the score had no unit; since
 * 2026-08-18 the chart is handed `RISK_SCORE_UNIT` (**D-27**). EXPORTED so that one mandated
 * literal keeps exactly one owner and one spelling across every unit slot that still needs it.
 */
export const UNIT_NOT_SUPPLIED = 'unit not supplied';

/**
 * THE RISK SCORE'S UNIT, declared by the product owner on 2026-08-18 (**D-27**).
 *
 * Until then this app printed `unit not supplied` beside the score, because no `unit` field exists
 * on the wire (**G-01**) and the scale was undeclared (**G-12**). The owner has now stated that the
 * score is a percentage.
 *
 * WHAT THIS IS, AND WHAT IT IS EMPHATICALLY NOT. It is a LABEL, supplied by the person entitled to
 * supply it. It is not the frontend inferring a scale, which CLAUDE.md rule 16 bans and which
 * Handoff section 8 puts out of scope — the distinction is the same one D-23 drew for the parameter
 * units, and it is the whole reason this constant exists rather than a `'%'` typed at eleven call
 * sites.
 *
 * NOT ONE DIGIT MOVES. There is no `toFixed`, no `Math.round`, no `* 100`, no `/ 100` and no
 * `Intl.NumberFormat` anywhere in the score's path, here or at any render site, and none is being
 * added. The delivered set already reads as a percentage without arithmetic: 95 finite scores
 * spanning 25.2-91.3, at most one decimal, none negative, none above 100, none inside (0, 1].
 * A value that arrived as 87.7 is printed as 87.7 and now carries a `%`.
 *
 * AND IT LICENSES NOTHING ELSE. Knowing the unit is not knowing that the axis should be pinned to
 * 0-100, and rule 16's ban on a proportional gauge or a reference band is untouched: the 60-minute
 * chart still scales to the window's own extremes, because "percent of what, bounded how" is still
 * **G-12** and still open.
 */
export const RISK_SCORE_UNIT = '%';

/**
 * THE 60-MINUTE HISTORY CHART'S FIXED Y-DOMAIN, and `RISK_THRESHOLDS` below it — both added
 * 2026-08-23 on the product owner's EXPLICIT, TWICE-GIVEN word, overriding **G-12** on this one
 * chart only. See `docs/spec/open-questions.md` G-12 for the full record of what was said and in
 * what order; the short version is that the owner confirmed these are real backend-confirmed
 * numbers, then, asked for the exact cut-offs, pointed at a wireframe reference image rather than
 * typing digits — so the three numbers below are READ OFF A MOCKUP'S PIXEL POSITIONS, the
 * weakest-sourced values in this file, and the ONE place to correct them if they are wrong.
 *
 * WHAT THIS OVERRIDE DOES NOT DO: it does not answer G-12 (still OPEN everywhere else), and it does
 * not license deriving `risk_level` from `risk_score` — `RiskChip`, PD-5's band slot and every
 * other screen still print only the backend's own `risk_level`, never computed from the number.
 * These two constants feed exactly one thing: the reference lines and shaded bands drawn on
 * `RiskHistoryChart`, which are decorative context, not a second source of truth for the level.
 */
export const RISK_SCORE_DOMAIN = { min: 0, max: 100 } as const;

/** Same override, same register row (**G-12**). `medium`/`high`/`critical` name the THRESHOLD a
 *  band starts at, on `RISK_SCORE_DOMAIN`'s own 0–100 scale — never re-derived, never hard-coded a
 *  second time anywhere else. Passed into `RiskHistoryChart` as a prop, not read by it as a
 *  constant, so a real backend-delivered value (were G-12 ever answered) could replace this import
 *  at the one call site rather than inside the chart. */
export const RISK_THRESHOLDS = { medium: 40, high: 65, critical: 85 } as const;

/**
 * F-9 / PD-10, and the ONLY producer of `ParameterRowVm`. One row per entry of the F-1 latest
 * reading's `parameters[]`, IN THE ORDER DELIVERED. Never merges or backfills a parameter from an
 * older reading: that would be a second, invisible carry-forward on top of the one the backend
 * already models via `source`.
 */
export function toParameterRows(latest: TimedReading): readonly ParameterRowVm[] {
  const chartedIso = latest.charttime.toISOString();
  return latest.parameters.map((parameter): ParameterRowVm => ({
    name: parameter.name,
    slug: parameter.slug,
    // `String(value)` and nothing else: the precision delivered is the precision rendered (F-9).
    // No `toFixed`, no `Intl.NumberFormat`, no locale grouping. The `unavailable` branch is not
    // reachable while the validator rejects a non-finite `value`, and it is written anyway so
    // that if per-field requiredness ever softens (G-31) the row already has somewhere to put the
    // absence — instead of a `0` arriving in a clinical cell.
    value: Number.isFinite(parameter.value)
      ? { kind: 'value', text: String(parameter.value) }
      : { kind: 'unavailable' },
    // G-01 is still open — the wire carries no `unit`. What changed on 2026-08-17 is that the
    // product owner asked the interface to supply one anyway (**D-23**), so the label comes from
    // the exact-name table in `$lib/domain/units` and falls back to the marker for any quantity
    // that table does not know. The fallback is the point: an unknown name gets no guess.
    unitLabel: assumedUnitLabel(parameter.name) ?? UNIT_NOT_SUPPLIED,
    unitAssumed: assumedUnitLabel(parameter.name) !== null,
    source: parameter.source, // null => S-15; the badge renders it, and never as 'measured'
    lastMeasured: parameter.lastMeasured, // carries its own reason (F-10), already decided
    chartedIso,
    modelUse: parameter.modelUse, // 'score_factor' | 'unknown' from the validator; never inferred
  }));
}

/**
 * A windowed reading that actually carries a score. `riskScore` is nullable (S-35), so the
 * predicate — not a `filter` on a boolean — is what proves to the compiler that `y` has a number to
 * be computed from.
 */
type ScoredReading = TimedReading & { riskScore: number };

function hasScore(reading: TimedReading): reading is ScoredReading {
  return reading.riskScore !== null;
}

/**
 * What `ChartPoint.sourceLabel` carries. Every literal here already exists elsewhere in the app —
 * `Risk level unavailable` is the S-05 mandated literal `RiskChip` renders, `Data-limited` is the
 * handoff's own filter label that S-10 also uses for the badge, and `data sufficiency unknown` is
 * S-10's mandated literal for the third, non-boolean case (F-6) — so no new clinical copy is minted.
 * It is read FIRST in the mark's accessible name, so the caveat is heard before the number.
 */
function markCaveat(reading: TimedReading): string {
  const level = reading.riskLevel === null ? 'Risk level unavailable' : reading.riskLevel;
  if (reading.sufficientData === 'insufficient') return `${level}, Data-limited`;
  if (reading.sufficientData === null) return `${level}, data sufficiency unknown`;
  return level;
}

/**
 * F-2, and the ONLY producer of `ChartPoint`. Takes the window `windowOf` returns — ascending, and
 * anchored on the latest charttime rather than `Date.now()` — and projects one mark per reading that
 * has a score.
 *
 * Readings with `riskScore === null` are dropped from the SERIES, per F-2, and are NOT lost: they
 * are the S-35 "score unavailable" rows of the chart's mandatory data table, which the caller builds
 * from the same window. Never reconstruct the table from `points`, or those readings disappear from
 * the screen entirely.
 *
 * `box` is the plot rectangle in SVG user units; the caller owns the viewBox, the axes and the gap
 * rendering. The y domain is `RISK_SCORE_DOMAIN` (0–100), NOT the window's own min/max — this
 * changed 2026-08-23 under the G-12 override documented on `RISK_SCORE_DOMAIN`'s own comment above.
 * A score outside the domain still POSITIONS correctly (the map below is not clamped), so an
 * out-of-range value runs off the plot rather than being silently relabelled onto the edge.
 */
export function toChartPoints(
  window60: readonly TimedReading[],
  box: { width: number; height: number },
  now: Date,
): readonly ChartPoint[] {
  // Gaps are decided over the FULL window, before the null-score readings are dropped: a hole is a
  // hole in the charting, not in the scoring, and computing it after the filter would report a
  // missing score as a missing reading.
  const flags = gapFlags(window60);
  const scored: Array<{ reading: ScoredReading; breakBefore: boolean }> = [];
  for (const [i, reading] of window60.entries()) {
    if (!hasScore(reading)) continue;
    // A dropped null-score reading hands its break flag forward, so the visible discontinuity lands
    // on the next mark actually drawn rather than vanishing with the reading that carried it.
    const carried = flags[i] === true;
    const previous = scored.at(-1);
    scored.push({
      reading,
      breakBefore: previous === undefined ? false : carried || hasHoleSince(window60, flags, i),
    });
  }

  const first = scored.at(0);
  const last = scored.at(-1);
  // Take the elements, do not index: a `.length` check does not narrow under
  // noUncheckedIndexedAccess. Nothing plottable => no marks, and the caller renders U-11 or the
  // "insufficient history for a 60-minute view" literal instead of an empty axis.
  if (first === undefined || last === undefined) return [];

  const t0 = first.reading.charttime.getTime();
  const span = last.reading.charttime.getTime() - t0;
  const { min: domainLow, max: domainHigh } = RISK_SCORE_DOMAIN;
  const domainRange = domainHigh - domainLow;

  return scored.map(({ reading, breakBefore }, index): ChartPoint => {
    const at = reading.charttime;
    return {
      // The ordinal is what makes this unique when two readings share an instant (U-12).
      key: `${at.toISOString()}#${index}`,
      iso: at.toISOString(),
      // Positioned by TIME, never by index. Even spacing would draw a 40-minute hole as an ordinary
      // step, which asserts a continuity F-2 forbids.
      x: span === 0 ? box.width / 2 : ((at.getTime() - t0) / span) * box.width,
      // SVG y grows downward, so a higher score sits nearer the top, against the FIXED
      // `RISK_SCORE_DOMAIN` (G-12 override, see that constant's comment) — not the window's own
      // min/max, so two different windows for the same patient place the same score at the same
      // height.
      y: box.height - ((reading.riskScore - domainLow) / domainRange) * box.height,
      valueText: String(reading.riskScore), // verbatim precision, no `%`, no `/100`
      sourceLabel: markCaveat(reading),
      // F-2: a reading whose data sufficiency is not confirmed is marked DISTINCTLY, by shape.
      dataLimited: reading.sufficientData !== 'sufficient',
      // The one pair of time formatters, so absolute-first, 24-hour and zone-labelled have a single
      // implementation. `now` is the layout-owned tick, never `Date.now()` inside a projection.
      absTime: formatAbsolute(at, now),
      relTime: formatAge(at, now),
      breakBefore,
      // The backend's own per-reading review report — see `ChartPoint.reviewed`'s own doc comment
      // for why this is NOT `markedHere`/the local session mark.
      reviewed: reading.reviewAt !== null,
    };
  });
}

/**
 * The chart's MANDATORY data table, and the ONLY producer of `ChartTableRow`.
 *
 * Built from the SAME window as `toChartPoints` and NOT from its output: a reading whose `riskScore`
 * is `null` contributes no plotted mark, and reconstructing the table from `points` would delete it
 * from the screen entirely. Here it is a row with `valueText: null`, which the table renders as the
 * S-35 literal.
 *
 * Every string is formatted once, here, so a table cell can never re-round a value or re-derive a
 * label at render time.
 */
export function toChartTableRows(
  window60: readonly TimedReading[],
  now: Date,
): readonly ChartTableRow[] {
  return window60.map((reading, index): ChartTableRow => {
    const sufficiencyLabel =
      reading.sufficientData === 'insufficient'
        ? 'Data-limited'
        : reading.sufficientData === null
          ? 'data sufficiency unknown'
          : '';

    return {
      key: `${reading.charttime.toISOString()}#${index}`,
      iso: reading.charttime.toISOString(),
      absTime: formatAbsolute(reading.charttime, now),
      relTime: formatAge(reading.charttime, now),
      // Verbatim precision. `null` stays null — never `0`, never a bare em dash.
      valueText: reading.riskScore === null ? null : String(reading.riskScore),
      levelLabel: reading.riskLevel === null ? 'Risk level unavailable' : reading.riskLevel,
      sufficiencyLabel,
    };
  });
}

/**
 * Whether any reading between the previous PLOTTED mark and `index` carried a gap flag. Without
 * this, dropping a null-score reading that happened to sit on the far side of a hole would silently
 * reconnect the line across it.
 */
function hasHoleSince(
  window60: readonly TimedReading[],
  flags: readonly boolean[],
  index: number,
): boolean {
  for (let i = index; i > 0; i -= 1) {
    if (flags[i] === true) return true;
    const previous = window60[i - 1];
    if (previous !== undefined && previous.riskScore !== null) return false;
  }
  return false;
}

const nameCollator = new Intl.Collator('en', { sensitivity: 'base' });

/**
 * F-4, the primary driver: element [0] of a DETERMINISTIC ordering — contribution descending, then
 * name ascending — never element [0] of the array as delivered, because the schema does not promise
 * `top_contributors` is pre-ranked (**G-27**). `null` is an empty list, which the card states in
 * words rather than leaving blank.
 *
 * Sign and scale are unspecified (**G-24**): no `Math.abs`, no re-normalisation to 100 %.
 */
export function primaryDriver(
  contributors: ReadonlyArray<{ name: string; contribution: number }>,
): { name: string; contribution: number; tied: boolean } | null {
  const ordered = orderContributors(contributors);
  const [first, second] = ordered;
  if (first === undefined) return null;
  return { ...first, tied: second !== undefined && second.contribution === first.contribution };
}

/**
 * The same F-4 ordering, for PD-7's full ranked list. One implementation, so the list and the
 * primary driver can never disagree about which factor is first.
 */
export function orderContributors(
  contributors: ReadonlyArray<{ name: string; contribution: number }>,
): ReadonlyArray<{ name: string; contribution: number }> {
  return contributors.toSorted(
    (a, b) => b.contribution - a.contribution || nameCollator.compare(a.name, b.name),
  );
}

/**
 * "Readings held at this level" (Handoff section 4) is not in the schema.
 *
 * The return type is a discriminated union because the count is genuinely unavailable when the
 * latest reading has no risk level (F-3 step 4): a run of unknowns is never counted, or PD-6 would
 * print "3 readings at this level" beside a chip reading "Risk level unavailable".
 *
 * A run that reaches the oldest supplied reading sets `truncated`, and the caller renders the one
 * mandated literal for that case — `≥ N readings at this level`, with the `≥` glyph — never an exact
 * count and never the retired ASCII `>= N` spelling (**G-32**; S-38). The three renderings this
 * return type makes reachable ARE S-38's three literals.
 */
export function heldAtLevel(
  readings: readonly Reading[],
): { kind: 'value'; count: number; truncated: boolean } | { kind: 'unavailable' } {
  const ordered = orderByChartTimeAsc(readings);
  const latest = ordered.at(-1);
  if (latest === undefined) return { kind: 'unavailable' }; // nothing to count from — U-11
  const level = latest.riskLevel;
  if (level === null) return { kind: 'unavailable' }; // F-3.4 — never count a run of unknowns

  let n = 0;
  // F-3.2 walks BACKWARDS from the latest reading, and `ordered` is ascending, so reverse it.
  for (const reading of ordered.toReversed()) {
    if (reading.riskLevel !== level) break;
    n += 1;
  }
  return { kind: 'value', count: n, truncated: n === ordered.length };
}

/**
 * F-11 / PM-5, and the ONLY producer of `ProvenancePoint`. One entry per reading in the window, in
 * ascending order.
 *
 * A reading that does NOT carry the active parameter produces a GAP — `present: false`, `y: null` —
 * never a `0` and never an interpolated point. The row still exists so the data table can say the
 * reading happened and the parameter was not in it, which is a different fact from "no reading".
 *
 * The y domain is `fixedRange` when the caller supplies one (**G-55** — `units.ts`'s `CHART_RANGE`
 * table, an interface-asserted plot window, NOT a reference band: G-28 is untouched, nothing here
 * shades or labels a "normal" region) and falls back to the window's own min/max otherwise, for a
 * quantity `CHART_RANGE` does not know. There are NO reference bands and no normal ranges either
 * way: none exist in the data (**G-28**).
 */
export function toProvenancePoints(
  window60: readonly TimedReading[],
  parameterName: string,
  box: { width: number; height: number },
  now: Date,
  fixedRange?: { min: number; max: number },
): readonly ProvenancePoint[] {
  const first = window60.at(0);
  const last = window60.at(-1);
  if (first === undefined || last === undefined) return [];

  const t0 = first.charttime.getTime();
  const span = last.charttime.getTime() - t0;

  let low: number;
  let high: number;
  if (fixedRange !== undefined) {
    ({ min: low, max: high } = fixedRange);
  } else {
    const values = window60
      .map((reading) => reading.parameters.find((p) => p.name === parameterName)?.value)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    low = values.length === 0 ? 0 : Math.min(...values);
    high = values.length === 0 ? 0 : Math.max(...values);
  }
  const range = high - low;

  return window60.map((reading, index): ProvenancePoint => {
    const at = reading.charttime;
    const key = `${at.toISOString()}#${index}`;
    const parameter = reading.parameters.find((p) => p.name === parameterName);
    const x = span === 0 ? box.width / 2 : ((at.getTime() - t0) / span) * box.width;

    if (parameter === undefined) {
      return {
        key,
        iso: at.toISOString(),
        x,
        y: null,
        present: false,
        valueText: null,
        source: null,
        lastMeasuredText: '',
        absTime: formatAbsolute(at, now),
        relTime: formatAge(at, now),
      };
    }

    return {
      key,
      iso: at.toISOString(),
      x,
      y: range === 0 ? box.height / 2 : box.height - ((parameter.value - low) / range) * box.height,
      present: true,
      // Verbatim precision — no rounding, no locale grouping.
      valueText: String(parameter.value),
      source: parameter.source,
      // S-14: a population reference gets no last-measured time and no computed age, so the slot is
      // deliberately empty rather than filled with the anchor time.
      lastMeasuredText:
        parameter.lastMeasured.kind === 'value'
          ? formatAbsolute(parameter.lastMeasured.value, now)
          : '',
      absTime: formatAbsolute(at, now),
      relTime: formatAge(at, now),
    };
  });
}

/**
 * F-11 / PM-6: counts of points by source within the window, stated as COUNTS and never as a
 * quality score or a percentage-of-reliability figure.
 *
 * `unknown` is its own line rather than folded into `measured`: folding it would misstate the data,
 * and omitting it would leave the counts silently failing to add up to the number of points.
 */
export function provenanceCounts(
  window60: readonly TimedReading[],
  parameterName: string,
): {
  measured: number;
  carriedForward: number;
  populationReference: number;
  unknown: number;
  absent: number;
} {
  const counts = {
    measured: 0,
    carriedForward: 0,
    populationReference: 0,
    unknown: 0,
    absent: 0,
  };

  for (const reading of window60) {
    const parameter = reading.parameters.find((p) => p.name === parameterName);
    if (parameter === undefined) {
      // The reading exists but does not carry this parameter — an F-11 GAP, counted as its own
      // thing rather than silently ignored.
      counts.absent += 1;
      continue;
    }
    switch (parameter.source) {
      case 'measured':
        counts.measured += 1;
        break;
      case 'carried_forward':
        counts.carriedForward += 1;
        break;
      case 'population_reference':
        counts.populationReference += 1;
        break;
      case null:
        counts.unknown += 1;
        break;
      default:
        assertNever(parameter.source);
    }
  }

  return counts;
}
