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
} from './derive';
import { orderByChartTimeAsc, windowOf } from './window';

const NOW = new Date('2026-08-16T12:00:00.000Z');

function reading(over: Partial<Reading> = {}): Reading {
  return {
    charttime: new Date('2026-08-16T11:00:00.000Z'),
    riskScore: 50,
    riskLevel: 'Medium',
    sufficientData: 'sufficient',
    imputedShare: 0.1,
    documentationShare: 0.9,
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

test('the 60-minute window is anchored on the LATEST CHARTTIME, not on the wall clock', () => {
  // Every reading here is hours old. Anchoring on `Date.now()` would silently empty the chart, which
  // reads as "nothing happening".
  const readings = [
    reading({ charttime: at('2026-08-16T02:00:00Z') }),
    reading({ charttime: at('2026-08-16T02:30:00Z') }),
    reading({ charttime: at('2026-08-16T03:00:00Z') }),
  ];
  expect(windowOf(readings)).toHaveLength(3);
});

test('the window excludes readings older than 60 minutes before the anchor, inclusive at the edge', () => {
  const readings = [
    reading({ charttime: at('2026-08-16T10:59:00Z') }), // 61 min before anchor — out
    reading({ charttime: at('2026-08-16T11:00:00Z') }), // exactly 60 min — in
    reading({ charttime: at('2026-08-16T12:00:00Z') }), // the anchor
  ];
  expect(windowOf(readings)).toHaveLength(2);
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

test('the y domain is the FIXED RISK_SCORE_DOMAIN (0-100), not the window`s own scores — G-12 override, 2026-08-23', () => {
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: 70 }),
    reading({ charttime: at('2026-08-16T11:30:00Z'), riskScore: 90 }),
  ] as TimedReading[];
  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  // Against a window whose own min/max were 70/90, the old behaviour put 70 on the floor and 90 on
  // the ceiling. Against the fixed 0-100 domain neither score is anywhere near either edge: 70 sits
  // 70% of the way up, 90 sits 90% of the way up.
  expect(points[0]?.y).toBeCloseTo(30, 5);
  expect(points[1]?.y).toBeCloseTo(10, 5);
});

test('a score at the domain floor/ceiling lands exactly on the plot edge, and the domain does not move with the data', () => {
  const window60: readonly TimedReading[] = [
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: 0 }),
    reading({ charttime: at('2026-08-16T11:30:00Z'), riskScore: 100 }),
  ] as TimedReading[];
  const points = toChartPoints(window60, { width: 100, height: 100 }, NOW);
  expect(points[0]?.y).toBeCloseTo(100, 5); // 0 -> the floor
  expect(points[1]?.y).toBeCloseTo(0, 5); // 100 -> the ceiling
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
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskScore: 40, sufficientData: 'sufficient' }),
    reading({
      charttime: at('2026-08-16T11:10:00Z'),
      riskScore: 50,
      sufficientData: 'insufficient',
    }),
    reading({ charttime: at('2026-08-16T11:20:00Z'), riskScore: 60, sufficientData: null }),
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
  expect(heldAtLevel(readings)).toEqual({ kind: 'value', count: 3, truncated: false });
});

test('a run that reaches the oldest supplied reading is TRUNCATED', () => {
  const readings = [
    reading({ charttime: at('2026-08-16T10:40:00Z'), riskLevel: 'Critical' }),
    reading({ charttime: at('2026-08-16T11:00:00Z'), riskLevel: 'Critical' }),
  ];
  // The caller renders `≥ 2 readings at this level` with the ≥ glyph, never an exact count.
  expect(heldAtLevel(readings)).toEqual({ kind: 'value', count: 2, truncated: true });
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
        value: 0.4,
        source: 'measured',
        lastMeasured: { kind: 'value', value: at('2026-08-16T11:00:00Z') },
        modelUse: 'unknown',
      },
      {
        name: 'Tidal volume',
        slug: 'tidal-volume',
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
