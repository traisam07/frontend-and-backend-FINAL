import { expect, test } from 'vitest';
import type { Reading, TimedReading } from './types';
import {
  heldAtLevel,
  latestReading,
  orderContributors,
  primaryDriver,
  provenanceCounts,
  toChartPoints,
  toChartTableRows,
  toProvenancePoints,
  toParameterRows,
  toPatientSummary,
  reviewLabel,
  RISK_SCORE_DOMAIN,
  RISK_THRESHOLDS,
} from './derive';
import { orderByChartTimeAsc, RISK_WINDOW_MINUTES, windowOf } from './window';

const NOW = new Date('2026-08-16T12:00:00.000Z');

function reading(over: Partial<Reading> = {}): Reading {
  return {
    charttime: new Date('2026-08-16T11:00:00.000Z'),
    riskScore: 50,
    riskLevel: 'Medium',
    sufficientData: 'sufficient',
    imputedShare: 0.1,
    documentationShare: 0.9,
    // Absent by default, so the run-length tests below exercise the client-side WALK. A source that
    // supplies its own count short-circuits it, and that path is asserted separately.
    readingsInState: null,
    topContributors: [],
    parameters: [],
    explanation: null,
    citations: null,
    reviewAt: null,
    ...over,
  };
}

const at = (iso: string) => new Date(iso);

/* ---- F-1: latest reading ----------------------------------------------------------------------- */

test('the latest reading is the greatest usable charttime, never readings[0]', () => {
  const readings = [
    reading({ charttime: at('2026-08-16T11:10:00Z'), riskScore: 1 }),
    reading({ charttime: at('2026-08-16T11:30:00Z'), riskScore: 3 }),
    reading({ charttime: at('2026-08-16T11:20:00Z'), riskScore: 2 }),
  ];
  expect(latestReading(readings)?.riskScore).toBe(3);
});

test('a reading with no usable charttime is EXCLUDED from latest-selection and never a fallback', () => {
  const readings = [
    reading({ charttime: null, riskScore: 99 }),
    reading({ charttime: at('2026-08-16T11:10:00Z'), riskScore: 1 }),
  ];
  expect(latestReading(readings)?.riskScore).toBe(1);
  expect(orderByChartTimeAsc(readings)).toHaveLength(1);
});

test('zero usable readings is null — an explicit state, never a synthesized zero-score reading', () => {
  expect(latestReading([])).toBeNull();
  expect(latestReading([reading({ charttime: null })])).toBeNull();
});

test('F-1.4 — on an exact charttime collision the LATER-IN-SOURCE reading wins', () => {
  // A stable sort with a comparator returning 0 keeps the EARLIER one, which is the opposite
  // reading. The tie-break must be written out on the source index.
  const collision = at('2026-08-16T11:30:00Z');
  const readings = [
    reading({ charttime: collision, riskScore: 10 }),
    reading({ charttime: collision, riskScore: 20 }),
  ];
  expect(latestReading(readings)?.riskScore).toBe(20);
});

/* ---- toPatientSummary: nulls carry through ------------------------------------------------------ */

test('a patient with no usable reading projects EVERY clinical member as explicitly absent', () => {
  const summary = toPatientSummary({
    patientId: 'PT-1',
    bedCode: null,
    careUnit: null,
    promptId: null,
    age: 60,
    gender: 'F',
    weight: null,
    height: null,
    race: 'Unknown',
    reviewStatus: 'pending_review',
    underlyingConditions: [],
    readings: [],
    integrityWarnings: [],
  });
  expect(summary.riskLevel).toBeNull(); // never 'Low'
  expect(summary.riskScore).toBeNull(); // never 0
  expect(summary.sufficientData).toBeNull(); // never 'sufficient'
  expect(summary.latestChartTime).toBeNull(); // never the wall clock
  expect(summary.reviewStatus).toBe('pending_review'); // patient-level, still known
});

/* ---- F-2: the window and the chart -------------------------------------------------------------- */

test('the window is anchored on the LATEST CHARTTIME, not on the wall clock', () => {
  // Every reading here is hours old. Anchoring on `Date.now()` would silently empty the chart, which
  // reads as "nothing happening".
  const readings = [
    reading({ charttime: at('2026-08-16T02:00:00Z') }),
    reading({ charttime: at('2026-08-16T02:30:00Z') }),
    reading({ charttime: at('2026-08-16T03:00:00Z') }),
  ];
  expect(windowOf(readings)).toHaveLength(3);
});

test('the window excludes readings older than RISK_WINDOW_MINUTES before the anchor, inclusive at the edge', () => {
  // The width moved from 60 minutes to a day on 2026-08-28 (see `RISK_WINDOW_MINUTES`), so the
  // boundary is derived from the constant rather than typed again here: a test that hard-codes the
  // width stops testing the window and starts testing the number it was written against.
  const anchor = at('2026-08-16T12:00:00Z').getTime();
  const minute = 60_000;
  const readings = [
    reading({
      charttime: new Date(anchor - (RISK_WINDOW_MINUTES + 1) * minute),
    }), // one past — out
    reading({ charttime: new Date(anchor - RISK_WINDOW_MINUTES * minute) }), // exactly at it — in
    reading({ charttime: new Date(anchor) }), // the anchor
  ];
  expect(windowOf(readings)).toHaveLength(2);
});

test('the window is wide enough to hold a full day of HOURLY readings', () => {
  // The reason the width changed. The live service advances the ward one hour per reading and the
  // band table's dwell clock is denominated on that grid, so a 60-minute window admitted two points
  // and the chart rendered its insufficient-history literal on every patient, for ever.
  const anchor = at('2026-08-16T12:00:00Z').getTime();
  const hourly = Array.from({ length: 24 }, (_, i) =>
    reading({ charttime: new Date(anchor - i * 60 * 60_000) }),
  );
  expect(windowOf(hourly)).toHaveLength(24);
});

test('a reading with a null risk score produces NO chart point but IS a data-table row', () => {
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: 40 }),
    reading({ charttime: at('2026-08-16T11:20:00Z'), riskScore: null }),
    reading({ charttime: at('2026-08-16T11:40:00Z'), riskScore: 60 }),
  ] as TimedReading[];

  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  expect(points).toHaveLength(2); // the null-score reading is not plotted
  expect(points.map((p) => p.valueText)).toEqual(['40', '60']);

  const rows = toChartTableRows(window60, NOW);
  expect(rows).toHaveLength(3); // and it is NOT lost
  expect(rows[1]?.valueText).toBeNull(); // renders `score unavailable`, never 0
});

test('chart marks are positioned by TIME, never by index', () => {
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: 10 }),
    reading({ charttime: at('2026-08-16T11:05:00Z'), riskScore: 20 }),
    reading({ charttime: at('2026-08-16T12:00:00Z'), riskScore: 30 }),
  ] as TimedReading[];
  const points = toChartPoints(window60, { width: 60, height: 100 }, NOW);
  // Even spacing would put the middle mark at x=30. By time it sits at 5/60 of the span.
  expect(points[1]?.x).toBeCloseTo(5, 5);
  expect(points[2]?.x).toBeCloseTo(60, 5);
});

test('a gap larger than twice the median interval starts a NEW segment', () => {
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: 10 }),
    reading({ charttime: at('2026-08-16T11:05:00Z'), riskScore: 20 }),
    reading({ charttime: at('2026-08-16T11:10:00Z'), riskScore: 30 }),
    reading({ charttime: at('2026-08-16T11:50:00Z'), riskScore: 40 }), // 40 min hole
  ] as TimedReading[];
  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  expect(points.map((p) => p.breakBefore)).toEqual([false, false, false, true]);
});

test('the y domain is the FIXED RISK_SCORE_DOMAIN, not the window`s own scores — G-12, answered 2026-08-28', () => {
  // The DOMAIN moved from 0-100 to 0-1 when the live pipeline answered G-12: the score is a
  // calibrated probability, not a percentage. The PROPERTY under test is unchanged and is the one
  // that matters: the axis is fixed, so two readings do not stretch to fill the plot and a flat
  // stretch looks flat.
  // Derived from the domain, not typed as literals: the scale is a property of the selected data
  // source now, so a test that hard-codes 0.7 stops testing the axis and starts testing which
  // backend the suite happened to run against.
  const span = RISK_SCORE_DOMAIN.max - RISK_SCORE_DOMAIN.min;
  const at70 = RISK_SCORE_DOMAIN.min + span * 0.7;
  const at90 = RISK_SCORE_DOMAIN.min + span * 0.9;
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: at70 }),
    reading({ charttime: at('2026-08-16T11:30:00Z'), riskScore: at90 }),
  ] as TimedReading[];
  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  // A self-scaling axis would put the lower value on the floor and the higher on the ceiling.
  // Against the fixed domain neither is near either edge.
  expect(points[0]?.y).toBeCloseTo(30, 5);
  expect(points[1]?.y).toBeCloseTo(10, 5);
});

test('a score at the domain floor/ceiling lands exactly on the plot edge, and the domain does not move with the data', () => {
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: RISK_SCORE_DOMAIN.min }),
    reading({ charttime: at('2026-08-16T11:30:00Z'), riskScore: RISK_SCORE_DOMAIN.max }),
  ] as TimedReading[];
  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  expect(points[0]?.y).toBeCloseTo(100, 5); // the floor
  expect(points[1]?.y).toBeCloseTo(0, 5); // the ceiling
});

test('whatever scale the source declares, the thresholds are real values on it', () => {
  // The three numbers this replaced were read off a mockup's pixel positions and were 40 / 65 / 85
  // on a 0-100 axis. Nothing about them was wrong as design intent; they simply described a
  // different backend. This asserts the invariant that made them wrong HERE: every threshold has to
  // be a value a real score can take, or the chart draws lines no patient on the unit can reach.
  expect(RISK_THRESHOLDS.medium).toBeGreaterThan(RISK_SCORE_DOMAIN.min);
  expect(RISK_THRESHOLDS.critical).toBeLessThan(RISK_SCORE_DOMAIN.max);
  expect(RISK_THRESHOLDS.medium).toBeLessThan(RISK_THRESHOLDS.high);
  expect(RISK_THRESHOLDS.high).toBeLessThan(RISK_THRESHOLDS.critical);
});

test('U-12 — colliding charttimes produce UNIQUE {#each} keys in all three projections', () => {
  // This is the test for the defect that turned PT-2008 — the one patient the fixture set exists to
  // prove U-12 on — into a blank Patient Detail screen. Svelte throws `each_key_duplicate` on a
  // repeated key in production as well as in dev, and no route error boundary catches a RENDER
  // failure, so the screen went white with no named state at all (`docs/LESSONS.md` L-057).
  const collision = at('2026-08-16T11:30:00Z');
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: 40 }),
    reading({ charttime: collision, riskScore: 50 }),
    reading({ charttime: collision, riskScore: 60 }),
  ] as TimedReading[];

  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  const rows = toChartTableRows(window60, NOW);
  const provenance = toProvenancePoints(window60, 'PEEP', { width: 100, height: 100 }, NOW);

  // Nothing was deduped — F-1 step 4 forbids it, and both colliding readings stay on screen.
  expect(points).toHaveLength(3);
  expect(rows).toHaveLength(3);
  expect(provenance).toHaveLength(3);

  for (const [name, keys] of [
    ['ChartPoint', points.map((p) => p.key)],
    ['ChartTableRow', rows.map((r) => r.key)],
    ['ProvenancePoint', provenance.map((p) => p.key)],
  ] as const) {
    expect(new Set(keys).size, `${name} keys must be unique`).toBe(keys.length);
  }

  // The ISO instant is still there for `<time datetime>` — it is just not the key.
  expect(points[1]?.iso).toBe(points[2]?.iso);
});

test('F-2 — a reading whose sufficiency is not confirmed is marked DISTINCTLY', () => {
  const window60: readonly TimedReading[] = [
    reading({
      charttime: at('2026-08-16T11:00:00Z'),
      riskScore: 40,
      sufficientData: 'sufficient',
    }),
    reading({
      charttime: at('2026-08-16T11:10:00Z'),
      riskScore: 50,
      sufficientData: 'insufficient',
    }),
    reading({
      charttime: at('2026-08-16T11:20:00Z'),
      riskScore: 60,
      sufficientData: null,
    }),
  ] as TimedReading[];
  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  // Both non-sufficient branches are flagged: `null` is not `sufficient`.
  expect(points.map((p) => p.dataLimited)).toEqual([false, true, true]);
});

/* ---- F-3: readings held at this level ----------------------------------------------------------- */

test('the run is counted BACKWARDS from the latest reading and stops at the first different level', () => {
  const readings = [
    reading({ charttime: at('2026-08-16T10:00:00Z'), riskLevel: 'Low' }),
    reading({ charttime: at('2026-08-16T10:20:00Z'), riskLevel: 'High' }),
    reading({ charttime: at('2026-08-16T10:40:00Z'), riskLevel: 'High' }),
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskLevel: 'High' }),
  ];
  expect(heldAtLevel(readings)).toEqual({
    kind: 'value',
    count: 3,
    truncated: false,
  });
});

test('a run that reaches the oldest supplied reading is TRUNCATED', () => {
  const readings = [
    reading({ charttime: at('2026-08-16T10:40:00Z'), riskLevel: 'Critical' }),
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskLevel: 'Critical' }),
  ];
  // The caller renders `≥ 2 readings at this level` with the ≥ glyph, never an exact count.
  expect(heldAtLevel(readings)).toEqual({
    kind: 'value',
    count: 2,
    truncated: true,
  });
});

test('a null risk level on the LATEST reading makes the count unavailable — the walk never starts', () => {
  const readings = [
    reading({ charttime: at('2026-08-16T10:40:00Z'), riskLevel: 'High' }),
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskLevel: null }),
  ];
  // Never "2 readings at this level" beside a chip reading `Risk level unavailable`.
  expect(heldAtLevel(readings)).toEqual({ kind: 'unavailable' });
});

/* ---- F-4: the primary driver -------------------------------------------------------------------- */

test('the primary driver is element [0] of a DETERMINISTIC ordering, not of the array as delivered', () => {
  const driver = primaryDriver([
    { name: 'PEEP', contribution: 0.2 },
    { name: 'Respiratory rate', contribution: 0.8 },
  ]);
  expect(driver?.name).toBe('Respiratory rate');
  expect(driver?.tied).toBe(false);
});

test('a first-place tie is reported as a tie rather than presented as THE driver', () => {
  const driver = primaryDriver([
    { name: 'Zeta', contribution: 0.5 },
    { name: 'Alpha', contribution: 0.5 },
  ]);
  // Deterministic: contribution descending, then name ascending via Intl.Collator.
  expect(driver?.name).toBe('Alpha');
  expect(driver?.tied).toBe(true);
});

test('an empty contributor list is null — never a fabricated driver', () => {
  expect(primaryDriver([])).toBeNull();
});

test('a NEGATIVE contribution keeps its sign and is never Math.abs`d or re-normalised', () => {
  const ordered = orderContributors([
    { name: 'Protective factor', contribution: -0.6 },
    { name: 'Driver', contribution: 0.3 },
  ]);
  expect(ordered[0]?.contribution).toBe(0.3);
  expect(ordered[1]?.contribution).toBe(-0.6);
  const total = ordered.reduce((n, c) => n + c.contribution, 0);
  expect(total).not.toBe(1); // nothing was re-normalised to sum to 100 %
});

/* ---- F-9: parameter rows ------------------------------------------------------------------------ */

test('parameter values render at the precision delivered, with the unit marker beside them', () => {
  const latest = reading({
    charttime: at('2026-08-16T11:00:00Z'),
    parameters: [
      {
        name: 'FiO2',
        slug: 'fio2',
        unit: null,
        value: 0.4,
        source: 'measured',
        lastMeasured: { kind: 'value', value: at('2026-08-16T11:00:00Z') },
        modelUse: 'unknown',
      },
      {
        name: 'Tidal volume',
        slug: 'tidal-volume',
        unit: null,
        value: 420,
        source: 'carried_forward',
        lastMeasured: { kind: 'unavailable', reason: 'not_provided' },
        modelUse: 'score_factor',
      },
    ],
  }) as TimedReading;

  const rows = toParameterRows(latest);
  expect(rows[0]?.value).toEqual({ kind: 'value', text: '0.4' }); // no toFixed, no rounding
  expect(rows[1]?.value).toEqual({ kind: 'value', text: '420' });
  // THIS ASSERTION USED TO SAY THE OPPOSITE, and the reversal is recorded rather than quietly
  // flipped. It read "G-01: never a hard-coded parameter-name -> unit map" and required
  // `unit not supplied` on every row, because the wire carries no `unit`. On 2026-08-17 the product
  // owner asked the interface to supply units anyway — **D-23** — so the label now comes from the
  // exact-name table in `$lib/domain/units` and `unitAssumed` marks it as the interface's assertion.
  // G-01 itself is still OPEN: the backend contract question is untouched by this.
  expect(rows[0]?.unitLabel).toBe('fraction (0–1)'); // FiO2 — a fraction, never a percentage
  expect(rows[0]?.unitAssumed).toBe(true);
  expect(rows[1]?.unitLabel).toBe('mL'); // Tidal volume — mL, not mL/kg PBW
  expect(rows[1]?.unitAssumed).toBe(true);
  // The value is untouched by the labelling: 0.4 stays 0.4, never 40 (rule 16).
  expect(rows[0]?.value).toEqual({ kind: 'value', text: '0.4' });
  // Order delivered, never re-sorted, never backfilled from an older reading.
  expect(rows.map((r) => r.name)).toEqual(['FiO2', 'Tidal volume']);
});

/* ---- F-11: provenance counts -------------------------------------------------------------------- */

test('provenance counts list unknown on its own line and add up to the number of readings', () => {
  const window60: readonly TimedReading[] = [
    reading({
      charttime: at('2026-08-16T11:00:00Z'),
      parameters: [
        {
          name: 'PEEP',
          slug: 'peep',
          unit: null,
          value: 5,
          source: 'measured',
          lastMeasured: { kind: 'unavailable', reason: 'not_provided' },
          modelUse: 'unknown',
        },
      ],
    }),
    reading({
      charttime: at('2026-08-16T11:20:00Z'),
      parameters: [
        {
          name: 'PEEP',
          slug: 'peep',
          unit: null,
          value: 6,
          source: null,
          lastMeasured: { kind: 'unavailable', reason: 'not_provided' },
          modelUse: 'unknown',
        },
      ],
    }),
    reading({ charttime: at('2026-08-16T11:40:00Z'), parameters: [] }),
  ] as TimedReading[];

  const counts = provenanceCounts(window60, 'PEEP');
  expect(counts).toEqual({
    measured: 1,
    carriedForward: 0,
    populationReference: 0,
    unknown: 1, // its own line — never folded into `measured`
    absent: 1, // the F-11 gap, counted rather than silently ignored
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  expect(total).toBe(window60.length);
});

/* ---- the three review literals have exactly one owner -------------------------------------------- */

test('reviewLabel owns the three review literals', () => {
  expect(reviewLabel('reviewed')).toBe('Reviewed');
  expect(reviewLabel('pending_review')).toBe('Pending review');
  expect(reviewLabel('unknown')).toBe('Review status unavailable');
});
