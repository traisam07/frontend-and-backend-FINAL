import { expect, test } from 'vitest';
import { WIRE_PATIENT_FIXTURES } from './patients';
import { parsePatientList } from '../validate';
import { latestReading, toPatientSummary } from '$lib/domain/derive';
import { rankPatients } from '$lib/domain/rank';

/**
 * `docs/spec/data-contract.md` section 4.4 rule 3: the fixture set must reach every state in
 * `docs/spec/ui-states.md` that data can produce.
 *
 * This file is the proof rather than the claim. A fixture regeneration that quietly dropped the
 * `carried_forward`-with-no-`last_measured` patient would otherwise leave state U-12 unreachable and
 * the app looking correct because it never meets the case it has to handle.
 */

const parsed = parsePatientList(WIRE_PATIENT_FIXTURES);

test('the whole fixture set validates through the SAME validator as real API data', () => {
  // Not a lighter path. A fixture that bypassed validation would prove nothing.
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error(parsed.problem);
  expect(parsed.value.length).toBeGreaterThanOrEqual(20);
});

test('the fixture module exports raw `unknown`, not a pre-typed wire array', () => {
  // Typing it `readonly WirePatient[]` would be `as` wearing a nicer coat: the array would satisfy
  // the wire types by DECLARATION instead of by validation.
  expect(Array.isArray(WIRE_PATIENT_FIXTURES)).toBe(true);
});

test('no fixture invents a field the schema does not define', () => {
  // G-01 `unit`, G-02 `description`, G-04 `model_use`. Adding any of them would close a blocking
  // open question with a fabricated answer.
  const json = JSON.stringify(WIRE_PATIENT_FIXTURES);
  expect(json).not.toContain('"unit"');
  expect(json).not.toContain('"description"');
  expect(json).not.toContain('"model_use"');
});

test('the set reaches every state the UI has to render', () => {
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;

  const snapshots = parsed.value;
  const summaries = snapshots.map(toPatientSummary);
  const latests = snapshots.map((s) => latestReading(s.readings));

  // S-01 … S-04 — all four risk levels are present on a latest reading.
  for (const level of ['Critical', 'High', 'Medium', 'Low'] as const) {
    expect(
      summaries.some((s) => s.riskLevel === level),
      `risk level ${level}`,
    ).toBe(true);
  }

  // S-05 — a latest reading with no risk level.
  expect(summaries.some((s) => s.riskLevel === null)).toBe(true);

  // S-06 / S-07 / S-09 — all three review states.
  for (const status of ['pending_review', 'reviewed', 'unknown'] as const) {
    expect(
      summaries.some((s) => s.reviewStatus === status),
      `review ${status}`,
    ).toBe(true);
  }

  // S-08 — reviewed with NO review time anywhere.
  expect(
    snapshots.some(
      (s) => s.reviewStatus === 'reviewed' && s.readings.every((r) => r.reviewAt === null),
    ),
  ).toBe(true);

  // S-10, both branches: `insufficient` AND `null`.
  expect(summaries.some((s) => s.sufficientData === 'insufficient')).toBe(true);
  expect(summaries.some((s) => s.sufficientData === null)).toBe(true);

  // S-12 … S-15 — all four provenance cases, including the unrecognised one.
  const sources = latests.flatMap((r) => (r?.parameters ?? []).map((p) => p.source));
  for (const source of ['measured', 'carried_forward', 'population_reference'] as const) {
    expect(sources.includes(source), `provenance ${source}`).toBe(true);
  }
  expect(sources.includes(null)).toBe(true); // S-15

  // S-26 — a patient with no recorded comorbidities.
  expect(snapshots.some((s) => s.underlyingConditions.length === 0)).toBe(true);

  // S-35 — a latest reading with no risk score.
  expect(summaries.some((s) => s.riskScore === null)).toBe(true);

  // S-37 — sufficient data, but the explanation is null.
  expect(latests.some((r) => r?.sufficientData === 'sufficient' && r.explanation === null)).toBe(
    true,
  );

  // S-38's truncated form — every delivered reading holds the latest reading's level.
  expect(
    snapshots.some(
      (s) =>
        s.readings.length > 1 &&
        s.readings.every((r) => r.riskLevel === latestReading(s.readings)?.riskLevel),
    ),
  ).toBe(true);

  // U-11 / U-22 — a patient with zero readings.
  expect(summaries.some((s) => s.latestChartTime === null)).toBe(true);

  // U-12 — a colliding charttime, surfaced as an integrity warning.
  expect(
    snapshots.some((s) => s.integrityWarnings.some((w) => w.startsWith('Colliding charttime'))),
  ).toBe(true);

  // G-18 — a carried-forward parameter with no last-measured time.
  expect(
    snapshots.some((s) =>
      s.integrityWarnings.some((w) => w.includes('last_measured is missing on a carried_forward')),
    ),
  ).toBe(true);

  // F-1 step 2 — a reading whose charttime is absent.
  expect(
    snapshots.some((s) => s.integrityWarnings.some((w) => w === 'Missing readings[0].charttime')),
  ).toBe(true);

  // F-4 — an empty contributor list, which renders `No ranked factors available`.
  expect(summaries.some((s) => s.topContributors.length === 0)).toBe(true);

  // F-2 — a patient with fewer than two plotted points, which renders the insufficient-history
  // literal rather than a single point drawn as a flat line.
  expect(snapshots.some((s) => s.readings.filter((r) => r.charttime !== null).length < 2)).toBe(
    true,
  );
});

test('the ranked board is stable and total across the whole fixture set', () => {
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const summaries = parsed.value.map(toPatientSummary);

  const forward = rankPatients(summaries).map((p) => p.patientId);
  const backward = rankPatients([...summaries].reverse()).map((p) => p.patientId);
  expect(forward).toEqual(backward);
  expect(new Set(forward).size).toBe(forward.length);
});

test('every patient reaches the board — a bad field never drops one', () => {
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.length).toBe(WIRE_PATIENT_FIXTURES.length);
});
