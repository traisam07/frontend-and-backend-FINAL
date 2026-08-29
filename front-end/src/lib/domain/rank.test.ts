import { expect, test } from 'vitest';
import type { PatientSummary } from './types';
import { comparePatients, rankPatients } from './rank';

function patient(over: Partial<PatientSummary> & { patientId: string }): PatientSummary {
  return {
    // Identity, never a ranking key: the comparator's last tiebreak is `patientId` and nothing
    // sorts on a bed. Absent by default so a test cannot accidentally assert on a fabricated one.
    bedCode: null,
    careUnit: null,
    promptId: null,
    reviewStatus: 'reviewed',
    riskLevel: 'Low',
    riskScore: 10,
    sufficientData: 'sufficient',
    latestChartTime: new Date('2026-08-16T11:00:00Z'),
    topContributors: [],
    // Not a ranking key — the run length never sorts anything (screens.md section 6.5). It is here
    // because `PatientSummary` requires it, and the default is the ABSENT branch rather than a
    // count, so a test that forgets to set it cannot accidentally assert on a fabricated run.
    heldAtLevel: { kind: 'unavailable' },
    ...over,
  };
}

const ids = (list: readonly PatientSummary[]) => list.map((p) => p.patientId);

/* ---- K1: review state first (Handoff section 3) -------------------------------------------------- */

test('K1 — pending review sorts first, then unknown, then reviewed', () => {
  const set = [
    patient({
      patientId: 'C',
      reviewStatus: 'reviewed',
      riskLevel: 'Critical',
    }),
    patient({
      patientId: 'A',
      reviewStatus: 'pending_review',
      riskLevel: 'Low',
    }),
    patient({ patientId: 'B', reviewStatus: 'unknown', riskLevel: 'Low' }),
  ];
  // A Critical REVIEWED patient sits below a Low PENDING one: review state is the first key, and
  // that is the handoff's rule, not an accident of the data.
  expect(ids(rankPatients(set))).toEqual(['A', 'B', 'C']);
});

test('unknown review state ranks ABOVE reviewed — the safety-conservative direction', () => {
  const a = patient({ patientId: 'A', reviewStatus: 'unknown' });
  const b = patient({ patientId: 'B', reviewStatus: 'reviewed' });
  expect(comparePatients(a, b)).toBeLessThan(0);
});

/* ---- K2: risk level, with absence last ------------------------------------------------------------ */

test('K2 — Critical, High, Medium, Low, then missing; absence is NEVER coerced to Low', () => {
  const set = [
    patient({ patientId: 'missing', riskLevel: null }),
    patient({ patientId: 'low', riskLevel: 'Low' }),
    patient({ patientId: 'critical', riskLevel: 'Critical' }),
    patient({ patientId: 'medium', riskLevel: 'Medium' }),
    patient({ patientId: 'high', riskLevel: 'High' }),
  ];
  expect(ids(rankPatients(set))).toEqual(['critical', 'high', 'medium', 'low', 'missing']);
});

/* ---- K3: risk score descending, absence last ------------------------------------------------------ */

test('K3 — a missing score sorts AFTER every present score and is never treated as 0', () => {
  const set = [
    patient({ patientId: 'none', riskScore: null }),
    patient({ patientId: 'zero', riskScore: 0 }),
    patient({ patientId: 'ten', riskScore: 10 }),
  ];
  // `0` is a legible clinical claim and outranks absence. `?? 0` would have made them equal.
  expect(ids(rankPatients(set))).toEqual(['ten', 'zero', 'none']);
});

test('two absent scores compare equal on K3 rather than producing NaN', () => {
  const a = patient({ patientId: 'A', riskScore: null });
  const b = patient({ patientId: 'B', riskScore: null });
  // `-Infinity - -Infinity` is NaN, which makes the whole comparator non-total.
  expect(Number.isNaN(comparePatients(a, b))).toBe(false);
});

/* ---- the order is TOTAL --------------------------------------------------------------------------- */

test('the comparator never returns 0 for distinct patients', () => {
  const a = patient({ patientId: 'A' });
  const b = patient({ patientId: 'B' });
  expect(comparePatients(a, b)).not.toBe(0);
});

test('identical input in two different array orders produces the identical ranked output', () => {
  const set = [
    patient({
      patientId: 'PT-3',
      reviewStatus: 'pending_review',
      riskLevel: 'High',
      riskScore: 71,
    }),
    patient({
      patientId: 'PT-1',
      reviewStatus: 'pending_review',
      riskLevel: 'High',
      riskScore: 71,
    }),
    patient({
      patientId: 'PT-2',
      reviewStatus: 'reviewed',
      riskLevel: 'Critical',
      riskScore: 90,
    }),
  ];
  const forward = ids(rankPatients(set));
  const backward = ids(rankPatients([...set].reverse()));
  expect(forward).toEqual(backward);
  // K5 breaks the remaining tie on patient id with a numeric collator.
  expect(forward).toEqual(['PT-1', 'PT-3', 'PT-2']);
});

test('rankPatients is pure — it never sorts the input in place', () => {
  const set = [
    patient({ patientId: 'B', riskLevel: 'Critical' }),
    patient({ patientId: 'A', riskLevel: 'Low' }),
  ];
  const before = ids(set);
  rankPatients(set);
  expect(ids(set)).toEqual(before);
});

/* ---- section 6.4: filtering preserves the canonical order ------------------------------------------ */

test('any filtered subset is a SUBSEQUENCE of the full ranking', () => {
  const set = [
    patient({
      patientId: 'A',
      reviewStatus: 'pending_review',
      riskLevel: 'Critical',
    }),
    patient({
      patientId: 'B',
      reviewStatus: 'pending_review',
      riskLevel: 'Low',
    }),
    patient({
      patientId: 'C',
      reviewStatus: 'reviewed',
      riskLevel: 'Critical',
    }),
    patient({ patientId: 'D', reviewStatus: 'unknown', riskLevel: 'High' }),
  ];
  const full = ids(rankPatients(set));
  const needsReview = ids(rankPatients(set).filter((p) => p.reviewStatus === 'pending_review'));

  let cursor = 0;
  for (const id of needsReview) {
    cursor = full.indexOf(id, cursor) + 1;
    expect(cursor).toBeGreaterThan(0);
  }
});

test('a patient moving from Reviewed to Pending review moves UP', () => {
  const before = [
    patient({
      patientId: 'A',
      reviewStatus: 'pending_review',
      riskLevel: 'Low',
    }),
    patient({
      patientId: 'B',
      reviewStatus: 'reviewed',
      riskLevel: 'Critical',
    }),
  ];
  expect(ids(rankPatients(before))).toEqual(['A', 'B']);

  const after = [
    before[0] as PatientSummary,
    patient({
      patientId: 'B',
      reviewStatus: 'pending_review',
      riskLevel: 'Critical',
    }),
  ];
  expect(ids(rankPatients(after))).toEqual(['B', 'A']);
});
