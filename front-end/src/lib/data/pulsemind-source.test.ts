// src/lib/data/pulsemind-source.test.ts
//
// THE MAPPING, AGAINST PAYLOADS THE SERVICE CAN PRODUCE BUT DID NOT PRODUCE TODAY.
//
// `pulsemind-source.live.test.ts` drives the real service and proves the happy path. It cannot prove
// what happens to a partial write, an unrecognised status or an empty string, because the running
// ward never emits one. Every case below is a defect that was in this file and shipped: each test is
// the input that found it.
//
// The fetch is stubbed, so these run with nothing installed and nothing serving.

import { describe, expect, test } from 'vitest';
import { getPulsemindSource } from './pulsemind-source';

const CHARTED = '2026-08-29T10:00:00.000Z';

/** One assessed reading, well formed. Tests override the one field under examination. */
function assessment(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    patient_id: 'PM-204',
    bed_code: 'ICU 04',
    unit: 'MICU',
    assessed_at: CHARTED,
    assessment_status: 'assessed',
    risk_score: 0.72,
    risk_level: 'CRITICAL',
    readings_in_state: 14,
    imputed_share: 0.1,
    documentation_share: 0.06,
    contributors: [{ feature_name: 'SpO2', parameter: 'spo2', share_of_decision: 0.32 }],
    parameters: [
      { parameter_name: 'spo2', value: 88, unit: '%', source: 'measured', age_minutes: 0 },
    ],
    ...over,
  };
}

const CONTEXT = { age: '67', sex: 'Male', ethnicity: 'White, recorded', comorbidities: [] };

/** Answers the three reads `getPatient` composes, and `/ward` for the board. */
function stub(rows: unknown, context: unknown = CONTEXT): typeof globalThis.fetch {
  return (async (url: string) => {
    const body = url.endsWith('/context')
      ? context
      : url.includes('/history')
        ? [rows]
        : Array.isArray(rows)
          ? rows
          : rows;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof globalThis.fetch;
}

describe('the mapping never manufactures a clinical value', () => {
  test('a contributor with no share fails by NAME, and never becomes a 0% factor', async () => {
    // Mongo stores `null` for an unset Number, so this is the shape of an ordinary partial write.
    // It used to become `contribution: 0`, which `requireFinite` ACCEPTS: the reading rendered a
    // ranked factor that contributed nothing, and because F-4 sorts on contribution it also pushed
    // that feature to the bottom and promoted a different one into the primary-driver slot.
    const rows = assessment({
      contributors: [{ feature_name: 'PEEP', parameter: 'peep', share_of_decision: null }],
    });
    const result = await getPulsemindSource(stub(rows)).getPatient('PM-204');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem).toContain('contribution');
  });

  test('a contributor with no name fails naming the value that arrived, not an invented blank', async () => {
    const rows = assessment({
      contributors: [{ feature_name: null, parameter: 'peep', share_of_decision: 0.2 }],
    });
    const result = await getPulsemindSource(stub(rows)).getPatient('PM-204');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem).toContain('name');
  });

  test('an unrecognised assessment_status is NOT reported as insufficient data', async () => {
    // `insufficient` used to be this file's else-branch rather than something the service said, so a
    // third status, a legacy `Assessed`, or a field that failed to write all rendered
    // "Insufficient data - risk score is not reliable": a clinical claim about the patient's data,
    // produced by a pipeline problem. `refused` is derived from this field and suppresses the
    // missing-score warnings, so the invented refusal arrived with no diagnostic trace at all.
    const rows = assessment({ assessment_status: 'model_unavailable' });
    const result = await getPulsemindSource(stub(rows)).getPatient('PM-204');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reading = result.value.readings[0];
    expect(reading?.sufficientData).toBeNull();
    expect(result.value.integrityWarnings.join(' ')).toContain('sufficient_data');
  });

  test('the two statuses the contract declares still map', async () => {
    const scored = await getPulsemindSource(stub(assessment())).getPatient('PM-204');
    expect(scored.ok && scored.value.readings[0]?.sufficientData).toBe('sufficient');

    const refused = await getPulsemindSource(
      stub(
        assessment({
          assessment_status: 'insufficient_data',
          risk_score: undefined,
          risk_level: undefined,
          contributors: [],
        }),
      ),
    ).getPatient('PM-204');
    expect(refused.ok && refused.value.readings[0]?.sufficientData).toBe('insufficient');
    // The refusal carries no score and no band, and neither is defaulted.
    expect(refused.ok && refused.value.readings[0]?.riskScore).toBeNull();
    expect(refused.ok && refused.value.readings[0]?.riskLevel).toBeNull();
    // And it raises no missing-score warning, because that absence is the contract being honoured.
    expect(refused.ok && refused.value.integrityWarnings.join(' ')).not.toContain('risk_score');
  });
});

describe('an absence is never rendered as a present-but-empty value', () => {
  test('an empty explanation string becomes null, so the screen shows S-37 and not a blank card', async () => {
    const rows = assessment({
      explanation: { status: 'generated', explanation_text: '   ', citations: [] },
    });
    const result = await getPulsemindSource(stub(rows)).getPatient('PM-204');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.readings[0]?.explanation).toBeNull();
  });

  test('a withheld explanation contributes no citations list at all', async () => {
    // `[]` says "the library was consulted and had nothing", which is a claim about the evidence
    // base. A generation that never ran has no such claim to make.
    const rows = assessment({
      explanation: { status: 'unavailable', explanation_text: 'not available', citations: [] },
    });
    const result = await getPulsemindSource(stub(rows)).getPatient('PM-204');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.readings[0]?.explanation).toBeNull();
    expect(result.value.readings[0]?.citations).toBeNull();
  });

  test('a generated explanation with real citations survives intact', async () => {
    const rows = assessment({
      explanation: {
        status: 'generated',
        explanation_text: 'CRITICAL. SpO2 is the largest single contributor.',
        citations: [{ source: 'ATS/ESICM 2017', claim: 'Consider lung-protective settings.' }],
      },
    });
    const result = await getPulsemindSource(stub(rows)).getPatient('PM-204');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.readings[0]?.explanation).toContain('CRITICAL');
    expect(result.value.readings[0]?.citations).toHaveLength(1);
  });
});
