// src/lib/domain/units.test.ts
//
// These assertions guard a CLINICAL LABEL that this interface invents. `docs/spec/open-questions.md`
// D-23 records the product owner's decision to ship provisional units while G-01 is open; this file
// is the half of that decision that cannot be undone by a careless edit.

import { describe, expect, it } from 'vitest';
import { ASSUMED_UNITS, assumedUnitFor, assumedUnitLabel, UNIT_ASSUMED_NOTE } from './units';
import { toParameterRows } from './derive';
import type { ParameterReading, TimedReading } from './types';

/** The eight names the service actually sends, verified against `back-end/seed/patients.json`. */
const WIRE_NAMES = [
  'Respiratory rate',
  'Tidal volume',
  'PEEP',
  'FiO2',
  'SpO2',
  'Plateau pressure',
  'Driving pressure',
  'Minute ventilation',
] as const;

describe('the unit this interface supplies (G-01 / D-23)', () => {
  it('knows every parameter name the backend sends', () => {
    // If the service adds a parameter, this fails and the D-23 table gains a row — rather than the
    // new quantity quietly rendering `unit not supplied` and nobody noticing which one it was.
    const unknown = WIRE_NAMES.filter((name) => assumedUnitFor(name) === null);
    expect(unknown, `no assumed unit for: ${unknown.join(', ')}`).toEqual([]);
  });

  it('FiO2 is a FRACTION and is never labelled as a percentage', () => {
    // The single most dangerous line in this module. FiO2 arrives as 0.35–0.55; labelling it "%"
    // would render `0.42 %`, a fifth of room air, on a patient receiving moderate oxygen support.
    // Rule 16 also forbids the "fix" of multiplying by 100 — that invents a scale.
    const fio2 = assumedUnitFor('FiO2');
    expect(fio2).not.toBeNull();
    expect(fio2?.label).not.toContain('%');
    expect(fio2?.label).toBe('fraction (0–1)');

    // SpO2 is the neighbouring quantity that IS a percentage, and the two must not converge.
    expect(assumedUnitLabel('SpO2')).toBe('%');
    expect(assumedUnitLabel('SpO2')).not.toBe(assumedUnitLabel('FiO2'));
  });

  it('matches on the whole name, never on a substring', () => {
    // `Tidal volume` is millilitres; `Tidal volume (mL/kg PBW)` is a different quantity running
    // 4–8 rather than 400–500. A prefix or `includes` match would print `mL` on it.
    expect(assumedUnitLabel('Tidal volume')).toBe('mL');
    expect(assumedUnitFor('Tidal volume (mL/kg PBW)')).toBeNull();
    expect(assumedUnitFor('Tidal volume index')).toBeNull();
    expect(assumedUnitFor('Mean airway pressure')).toBeNull();
    expect(assumedUnitFor('')).toBeNull();
  });

  it('normalises spelling only — case and surrounding space, never internal spacing', () => {
    expect(assumedUnitLabel('  peep  ')).toBe('cmH₂O');
    expect(assumedUnitLabel('FIO2')).toBe('fraction (0–1)');
    // Not a spelling this table is willing to guess at: a space inside the name may be a different
    // quantity, and guessing is what the exact-match rule exists to prevent.
    expect(assumedUnitFor('FiO 2')).toBeNull();
  });

  it('gives every row a basis a clinician can check', () => {
    // A unit with no stated evidence cannot be corrected, only argued about. D-23 asks for
    // row-by-row sign-off, and this is the column that makes that possible.
    for (const unit of ASSUMED_UNITS) {
      expect(unit.basis.length, `${unit.name} has no basis`).toBeGreaterThan(40);
      expect(unit.basis, `${unit.name}'s basis states no observed range`).toMatch(/\d/);
    }
    expect(ASSUMED_UNITS).toHaveLength(10);
  });

  it('states, in the note, that the units are not the data’s', () => {
    // The note was SHORTENED on 2026-08-17 — the tail `provisional, pending clinical confirmation`
    // came off with the rest of the process text — but the half that does the safety work must
    // survive every future trim: without it an invented label reads as a measured one.
    expect(UNIT_ASSUMED_NOTE).toContain('not by the assessment data');
    expect(UNIT_ASSUMED_NOTE).toContain('this interface');
    expect(UNIT_ASSUMED_NOTE).not.toContain('pending');
  });
});

describe('toParameterRows carries the unit and says where it came from', () => {
  const reading = (name: string): TimedReading => {
    const parameter: ParameterReading = {
      name,
      slug: 'x',
      value: 22,
      source: 'measured',
      lastMeasured: { kind: 'unavailable', reason: 'not_applicable' },
      modelUse: 'unknown',
    };
    return {
      charttime: new Date('2026-08-17T09:00:00.000Z'),
      riskLevel: 'High',
      riskScore: 1,
      sufficientData: 'sufficient',
      imputedShare: 0,
      documentationShare: 0,
      explanation: null,
      citations: [],
      topContributors: [],
      parameters: [parameter],
      reviewAt: null,
    };
  };

  it('labels a known quantity and flags the label as the interface’s', () => {
    const [row] = toParameterRows(reading('Respiratory rate'));
    expect(row?.unitLabel).toBe('breaths/min');
    expect(row?.unitAssumed).toBe(true);
  });

  it('leaves an unknown quantity with the marker, and does not flag it', () => {
    // The fallback is the safety property, not a gap: an unlabelled number is recoverable, a
    // wrongly labelled one is not.
    const [row] = toParameterRows(reading('Oesophageal pressure'));
    expect(row?.unitLabel).toBe('unit not supplied');
    expect(row?.unitAssumed).toBe(false);
  });

  it('never alters the value while labelling it', () => {
    // Rule 16: this module chooses a label, never a scale. The value is printed exactly as
    // delivered — the FiO2 case is where a "helpful" ×100 would land.
    const [row] = toParameterRows(reading('FiO2'));
    expect(row?.value).toEqual({ kind: 'value', text: '22' });
  });
});
