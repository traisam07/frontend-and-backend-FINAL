// src/lib/domain/window.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 2.

import type { Reading, TimedReading } from './types';

/** A reading only takes part in ordering if its charttime parsed. This is the F-1 filter. */
function hasInstant(reading: Reading): reading is TimedReading {
  return reading.charttime !== null && Number.isFinite(reading.charttime.getTime());
}

/**
 * ASCENDING by charttime — the direction F-1 step 3 and F-2 both specify, so the latest reading is
 * `.at(-1)` and the 60-minute series comes out in the order the chart plots it. The schema
 * guarantees no ordering, so never take `readings[0]` or `readings.at(-1)` of the raw array.
 *
 * The tie-break is written out on the SOURCE INDEX, not left to sort stability. F-1 step 4 keeps the
 * reading appearing LATER in the source array on an exact charttime collision, and a stable sort
 * with a comparator returning 0 keeps the EARLIER one — the opposite reading, silently. The
 * collision itself is reported once, as the U-12 integrity warning raised in
 * `parsePatientSnapshot`; this helper's job is only to be deterministic.
 */
export function orderByChartTimeAsc(readings: readonly Reading[]): readonly TimedReading[] {
  return readings
    .map((reading, sourceIndex) => ({ reading, sourceIndex }))
    .filter((r): r is { reading: TimedReading; sourceIndex: number } => hasInstant(r.reading))
    .toSorted(
      (a, b) =>
        a.reading.charttime.getTime() - b.reading.charttime.getTime() ||
        a.sourceIndex - b.sourceIndex, // F-1.4: later in source wins
    )
    .map((r) => r.reading);
}

/**
 * HOW WIDE THE RISK HISTORY WINDOW IS.
 *
 * ⚠️ F-2 SAID SIXTY MINUTES, AND SIXTY MINUTES IS THE WRONG WIDTH FOR THIS BACKEND. Changed to a day
 * on 2026-08-28 by the product owner, with the reason recorded rather than the number alone.
 *
 * The live service advances the ward ONE HOUR per reading, and that interval is not adjustable: the
 * band table's dwell clock is denominated on the same grid, its demote dwell is 120 minutes, and the
 * published band trajectory was verified against it. So a 60-minute window admits the latest reading
 * and, at the boundary, the one before it. A named main section on two screens plots one line
 * segment and otherwise renders the insufficient-history literal, for ever, on every patient.
 *
 * A day is the width the data actually supports: the service backfills 24 hourly readings and serves
 * up to 200. Twenty-four readings span 23 hours, comfortably inside this window, so the newest and
 * oldest marks can never land on the same `HH:mm` axis label.
 *
 * The number lives here, once, and every caller and every rendered string reads it rather than
 * spelling out a duration of its own.
 */
export const RISK_WINDOW_MINUTES = 24 * 60;

/** The same width in words, for the surfaces that name it. One spelling, one owner. */
export const RISK_WINDOW_LABEL = 'last 24 hours';

/**
 * The window is anchored on the LATEST READING'S charttime, not on `Date.now()`. Anchoring on the
 * wall clock lets stale data render as a reassuring empty chart.
 *
 * Returns ASCENDING, per F-2 — `ChartPoint[]` is built from it positionally, and a consumer that
 * reversed it would label the oldest point as "ending".
 */
export function windowOf(
  readings: readonly Reading[],
  minutes = RISK_WINDOW_MINUTES,
): readonly TimedReading[] {
  const ordered = orderByChartTimeAsc(readings);
  // Take the element, do not index. `if (ordered.length === 0)` does NOT narrow `ordered[0]` under
  // noUncheckedIndexedAccess — it stays `TimedReading | undefined`.
  const latest = ordered.at(-1);
  if (latest === undefined) return []; // no usable charttime at all: U-11
  const anchor = latest.charttime.getTime();
  return ordered.filter((r) => anchor - r.charttime.getTime() <= minutes * 60_000);
}

/**
 * The F-2 gap threshold: an interval larger than `GAP_FACTOR` times the MEDIAN inter-reading
 * interval of the window renders as a visible break rather than a connecting segment.
 *
 * `[HARNESS]`, pending design confirmation. The rule "a gap larger than 2x the median inter-reading
 * interval renders as a visible break" is `docs/spec/data-contract.md` F-2; the median (rather than
 * the mean) is this module's choice, because one long hole would drag a mean up far enough to hide
 * itself. With fewer than three points there is no median to speak of and nothing is broken.
 */
const GAP_FACTOR = 2;

/**
 * For a window returned by `windowOf`, whether each element should be drawn disconnected from the
 * one before it. Index 0 is always `false` — there is no segment before the first mark.
 *
 * Computed here, once, over the window — never at render time inside a chart component, and never
 * from the projected `ChartPoint` positions, which have already lost the readings whose `riskScore`
 * was null.
 */
export function gapFlags(window60: readonly TimedReading[]): readonly boolean[] {
  if (window60.length < 2) return window60.map(() => false);

  const intervals: number[] = [];
  for (let i = 1; i < window60.length; i += 1) {
    const previous = window60[i - 1];
    const current = window60[i];
    if (previous === undefined || current === undefined) continue;
    intervals.push(current.charttime.getTime() - previous.charttime.getTime());
  }

  const sorted = intervals.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  const median =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 1
        ? (upper ?? 0)
        : ((lower ?? 0) + (upper ?? 0)) / 2;

  return window60.map((reading, i) => {
    if (i === 0 || median <= 0) return false;
    const previous = window60[i - 1];
    if (previous === undefined) return false;
    return reading.charttime.getTime() - previous.charttime.getTime() > median * GAP_FACTOR;
  });
}
