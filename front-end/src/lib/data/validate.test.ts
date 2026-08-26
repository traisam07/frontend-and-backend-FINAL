import { expect, test } from 'vitest';
import { parsePatientList, parsePatientSnapshot } from './validate';

/* ---- the wire fixture and its overriders --------------------------------------------------------
   One valid wire patient, plus the overriders every test below uses. WIRE SPELLING throughout
   (`docs/patientSchema.js`): `underlying_condition` SINGULAR, `catch`, `last_measured`, snake_case,
   instants as ISO-8601 strings.

   Plain object literals, never annotated `WirePatient` — `parsePatientSnapshot` takes `unknown`, and
   pre-typing the fixture would assert the very conformance the test is checking.                  */

const wireReading = {
  charttime: '2026-08-16T11:32:00.000Z',
  imputed_share: 0.12,
  documentation_share: 0.44,
  sufficient_data: 'sufficient',
  risk_score: 71,
  risk_level: 'High',
  review_at: null,
  top_contributors: [{ name: 'Respiratory rate', contribution: 0.7 }],
  parameters: [
    {
      name: 'Respiratory rate',
      value: 24,
      source: 'measured',
      last_measured: '2026-08-16T11:32:00.000Z',
    },
  ],
  explanation: 'Respiratory rate has risen across the last three readings.',
  citations: null,
};

const wirePatient = {
  patient_id: '12894',
  age: 67,
  gender: 'F',
  weight: ' 78 ',
  height: '170',
  race: 'Unknown',
  warning_status: { status: 'Pending Review', flags: [] },
  underlying_condition: [{ name: 'COPD', catch: true }],
  readings: [wireReading],
};

/** The same patient with one reading carrying the overrides — `Record<string, unknown>`, so a test
 *  can put a deliberately wrong TYPE in a field without a cast anywhere. */
function withReading(over: Record<string, unknown>) {
  return { ...wirePatient, readings: [{ ...wireReading, ...over }] };
}

function withStatus(status: unknown) {
  return { ...wirePatient, warning_status: { status, flags: [] } };
}

function withParameters(parameters: readonly Record<string, unknown>[]) {
  return { ...wirePatient, readings: [{ ...wireReading, parameters }] };
}

/* ---- wire spelling --------------------------------------------------------------------------- */

test('the comorbidity key is SINGULAR, and `catch` is stored rather than dropped', () => {
  const parsed = parsePatientSnapshot(wirePatient);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  // A one-character key drift here is invisible in review, always `undefined` at runtime, and turns
  // the validator into a machine that rejects every patient.
  expect(parsed.value.underlyingConditions).toEqual([{ name: 'COPD', catchFlag: true }]);
});

test('the PLURAL comorbidity key fails validation rather than silently yielding an empty list', () => {
  const { underlying_condition: _drop, ...rest } = wirePatient;
  const parsed = parsePatientSnapshot({
    ...rest,
    underlying_conditions: [{ name: 'COPD', catch: true }],
  });
  expect(parsed.ok).toBe(false);
  if (parsed.ok) return;
  expect(parsed.problem).toContain('underlying_condition');
});

/* ---- CLAUDE.md rule 14: never default a clinical field ---------------------------------------- */

test('a missing or non-numeric risk_score is a null plus a warning, NEVER a rejection and never 0', () => {
  for (const bad of ['high', null, Number.NaN]) {
    const parsed = parsePatientSnapshot(withReading({ risk_score: bad }));
    expect(parsed.ok).toBe(true); // the patient still reaches the board
    if (!parsed.ok) return;
    const [reading] = parsed.value.readings;
    expect(reading?.riskScore).toBeNull(); // S-35, never 0
    expect(parsed.value.integrityWarnings.some((w) => w.includes('risk_score'))).toBe(true);
  }
});

test('an unrecognised risk_level is null plus a warning — never coerced to Low', () => {
  for (const bad of ['critical', 'SEVERE', null, 7]) {
    const parsed = parsePatientSnapshot(withReading({ risk_level: bad }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.readings[0]?.riskLevel).toBeNull(); // S-05
  }
});

test('sufficient_data accepts ONLY the two literals; anything else is null and gates as insufficient', () => {
  for (const bad of ['Sufficient', 'ok', null, true]) {
    const parsed = parsePatientSnapshot(withReading({ sufficient_data: bad }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // S-10's null branch. `null` is NOT `sufficient` for any gating decision.
    expect(parsed.value.readings[0]?.sufficientData).toBeNull();
  }
});

test('an unrecognised parameter source is null — never defaulted to measured', () => {
  const parsed = parsePatientSnapshot(
    withParameters([{ name: 'PEEP', value: 5, source: 'device_estimate', last_measured: null }]),
  );
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.readings[0]?.parameters[0]?.source).toBeNull(); // S-15
  expect(parsed.value.integrityWarnings.some((w) => w.includes('source'))).toBe(true);
});

/* ---- review-status normalization (data contract 2.2) ------------------------------------------ */

test('review status normalizes on trim + spacing + case-fold, not on an exact string', () => {
  // The schema spells it "Pending Review"; the handoff prose spells it "Pending review". An exact
  // compare files the second under "unrecognised" and HIDES A PENDING PATIENT.
  for (const wire of ['Pending Review', 'pending review', '  PENDING   REVIEW  ']) {
    const parsed = parsePatientSnapshot(withStatus(wire));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.reviewStatus).toBe('pending_review');
    expect(parsed.value.integrityWarnings.some((w) => w.includes('warning_status.status'))).toBe(
      false,
    );
  }

  // Folding is not guessing: deleting the space is still unrecognised, and never 'reviewed'.
  const guessed = parsePatientSnapshot(withStatus('pendingreview'));
  expect(guessed.ok).toBe(true);
  if (!guessed.ok) return;
  expect(guessed.value.reviewStatus).toBe('unknown');
});

test('a null review status is a real third state, and is never coerced toward Reviewed', () => {
  const parsed = parsePatientSnapshot(withStatus(null));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.reviewStatus).toBe('unknown'); // S-09
  // Absence here is a STATE, not a contradiction, so it does not warn.
  expect(parsed.value.integrityWarnings.some((w) => w.includes('warning_status.status'))).toBe(
    false,
  );
});

/* ---- F-10: last_measured carries the reason its provenance dictates --------------------------- */

test('last_measured carries the reason its provenance dictates', () => {
  const parsed = parsePatientSnapshot(
    withParameters([
      {
        name: 'PEEP',
        value: 5,
        source: 'population_reference',
        last_measured: '2026-08-16T12:00:00Z',
      },
      { name: 'Tidal volume', value: 420, source: 'carried_forward', last_measured: null },
      { name: 'FiO2', value: 0.4, source: 'measured', last_measured: 'not-a-date' },
    ]),
  );
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const params = parsed.value.readings[0]?.parameters ?? [];

  // S-14: a population reference NEVER carries a last-measured time, even when one arrives — the
  // supplied instant is dropped and the contradiction warns.
  expect(params[0]?.lastMeasured).toEqual({ kind: 'unavailable', reason: 'not_applicable' });
  expect(parsed.value.integrityWarnings.some((w) => w.includes('population_reference row'))).toBe(
    true,
  );

  // G-18 / U-12: the handoff requires the retained time on a carried-forward row.
  expect(params[1]?.lastMeasured).toEqual({ kind: 'unavailable', reason: 'not_provided' });
  expect(parsed.value.integrityWarnings.some((w) => w.includes('carried_forward row'))).toBe(true);

  // Supplied but unparseable is `invalid`, never the epoch and never `new Date(undefined)`.
  expect(params[2]?.lastMeasured).toEqual({ kind: 'unavailable', reason: 'invalid' });
});

test('`withheld` is never produced by inference — only three reasons have a producer', () => {
  const parsed = parsePatientSnapshot(
    withParameters([
      { name: 'A', value: 1, source: 'measured', last_measured: null },
      { name: 'B', value: 2, source: 'carried_forward', last_measured: null },
      { name: 'C', value: 3, source: 'population_reference', last_measured: null },
      { name: 'D', value: 4, source: null, last_measured: null },
    ]),
  );
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  for (const parameter of parsed.value.readings[0]?.parameters ?? []) {
    if (parameter.lastMeasured.kind === 'unavailable') {
      expect(parameter.lastMeasured.reason).not.toBe('withheld');
    }
  }
});

/* ---- F-8: model use is proved, never inferred -------------------------------------------------- */

test('model use is `score_factor` on an exact case-folded match and `unknown` otherwise — never `available`', () => {
  const parsed = parsePatientSnapshot({
    ...wirePatient,
    readings: [
      {
        ...wireReading,
        top_contributors: [{ name: '  respiratory RATE ', contribution: 0.7 }],
        parameters: [
          { name: 'Respiratory rate', value: 24, source: 'measured', last_measured: null },
          {
            name: 'Respiratory rate variability',
            value: 3,
            source: 'measured',
            last_measured: null,
          },
          { name: 'PEEP', value: 5, source: 'measured', last_measured: null },
        ],
      },
    ],
  });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const params = parsed.value.readings[0]?.parameters ?? [];
  expect(params[0]?.modelUse).toBe('score_factor');
  // A SUBSTRING match must not count: "Respiratory rate variability" contains the contributor's
  // name and is a different parameter.
  expect(params[1]?.modelUse).toBe('unknown');
  // Absence proves nothing. `available` would state that the model IGNORED this parameter.
  expect(params[2]?.modelUse).toBe('unknown');
  expect(params.some((p) => p.modelUse === 'available')).toBe(false);
});

/* ---- integrity warnings ------------------------------------------------------------------------ */

test('an exact charttime collision raises a U-12 warning and never dedupes', () => {
  const parsed = parsePatientSnapshot({
    ...wirePatient,
    readings: [wireReading, { ...wireReading, risk_score: 75 }],
  });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.readings).toHaveLength(2); // never merged, never deduped
  expect(parsed.value.integrityWarnings.some((w) => w.startsWith('Colliding charttime'))).toBe(
    true,
  );
});

test('two parameters whose names slugify identically raise a G-03 collision warning', () => {
  const parsed = parsePatientSnapshot(
    withParameters([
      // Two distinct display names that slugify to the same `tidal-volume`.
      { name: 'Tidal volume', value: 420, source: 'measured', last_measured: null },
      { name: 'Tidal-Volume', value: 415, source: 'measured', last_measured: null },
    ]),
  );
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  // Never disambiguated by guessing: the URL could not address the two apart.
  expect(parsed.value.integrityWarnings.some((w) => w.includes('Colliding parameter slug'))).toBe(
    true,
  );
});

/* ---- weight / height / gender / race (G-19, G-20) ---------------------------------------------- */

test('weight and height are trimmed and otherwise verbatim; gender and race are untouched', () => {
  const parsed = parsePatientSnapshot({ ...wirePatient, gender: '  F ', race: ' Other ' });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.weight).toBe('78'); // trim ONLY — never parsed, never given a unit
  expect(parsed.value.height).toBe('170');
  expect(parsed.value.gender).toBe('  F '); // verbatim free text
  expect(parsed.value.race).toBe(' Other ');
});

/* ---- the list is not a lighter contract -------------------------------------------------------- */

test('a structurally invalid element is fatal for the whole list and is named BY INDEX', () => {
  const parsed = parsePatientList([wirePatient, { patient_id: '', age: 1 }]);
  expect(parsed.ok).toBe(false);
  if (parsed.ok) return;
  // Never `.filter(Boolean)`, never a skipped element: silently dropping one would hide a patient
  // from the board.
  expect(parsed.problem).toContain('patients[1]');
});

test('a single bad FIELD is non-fatal and the patient still reaches the board', () => {
  const parsed = parsePatientList([withReading({ risk_level: 'nonsense', risk_score: null })]);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value).toHaveLength(1);
});

test('a non-array payload is a named failure, not an empty board', () => {
  const parsed = parsePatientList({ patients: [] });
  expect(parsed.ok).toBe(false);
  if (parsed.ok) return;
  expect(parsed.problem).toContain('not an array');
});
