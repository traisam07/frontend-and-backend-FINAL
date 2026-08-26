// src/lib/domain/units.ts
// CANONICAL DECLARATION — this file.
//
// THE UNIT THIS INTERFACE SUPPLIES, because the assessment data supplies none.
//
// `docs/patientSchema.js`, `back-end/model/Patient.js` and every payload the live service returns
// carry a parameter as `{ name, value, source, last_measured }` and nothing else. There is no `unit`
// field anywhere on the wire — that is **G-01**, and it is still open. Until 2026-08-17 this app
// rendered the marker `unit not supplied` beside every value rather than choose one.
//
// THE PRODUCT OWNER ASKED FOR THE UNITS TO BE SUPPLIED ANYWAY, with the words "sẽ sửa sau nếu cần" —
// fix them later if needed. That is a decision to ship a provisional clinical label, so this module
// exists to make it a **reviewable** one rather than a scattered one: every unit the interface
// asserts is in the table below, each with the evidence behind it, in one file a clinician can read
// end to end in a minute and correct in one place. The register row is **D-23**.
//
// FOUR RULES THIS MODULE OBEYS, AND WHY EACH ONE IS LOAD-BEARING.
//
//   1. EXACT-NAME LOOKUP. Matching is on the whole normalised name, never a substring, prefix or
//      fuzzy score. `Tidal volume` is millilitres; `Tidal volume (mL/kg PBW)` is a DIFFERENT
//      quantity whose values run 4–8 rather than 400–500, and a substring match would print `mL`
//      on it. A name this table does not know returns `null` and the value keeps the
//      `unit not supplied` marker — an unlabelled number is recoverable, a wrongly labelled one is
//      not.
//
//   2. NO CONVERSION, EVER. The value printed is the value delivered (`docs/spec/data-contract.md`
//      F-9, CLAUDE.md rule 16). This module chooses a LABEL for a number; it never scales one.
//
//   3. FiO2 IS DIMENSIONLESS AND IS THE REASON RULE 2 IS ABSOLUTE. It arrives as 0.35–0.55 — a
//      fraction, not a percentage. Appending `%` would render `0.42 %`, which reads as a fifth of
//      room air (0.21 as a fraction, 21%) and would describe a patient on moderate support as
//      breathing something unsurvivable. Multiplying by 100 to "fix" the label is the same defect
//      wearing a nicer coat: it invents a scale the data never declared. So the label states the
//      scale in words and the number is left alone.
//
//   4. EVERY ASSERTED UNIT IS MARKED IN THE UI. The rendering carries `data-clarify="G-01"` and the
//      surfaces that show units say, in words, that the units come from the interface and not from
//      the assessment data. A provisional label that looks measured is worse than no label.
//
// WHAT THE EVIDENCE IS, AND WHAT IT IS NOT. Each `basis` below is (a) the conventional unit for that
// named quantity in adult mechanical ventilation and (b) the observed range across the delivered
// set, which is consistent with it and — for FiO2, tidal volume and minute ventilation — rules the
// plausible alternatives out by orders of magnitude. It is NOT a derived cross-check: the sample
// unit is synthetic and each parameter is generated independently, so `Driving pressure` equals
// `Plateau pressure − PEEP` in only 12 of 96 readings and `Minute ventilation` is a median 8.2% off
// `Tidal volume × Respiratory rate` (measured, not assumed — `back-end/seed/generate.js`). Those
// identities therefore prove nothing here, and are named so nobody cites them later as if they did.
// Range-consistency plus convention is the whole of the evidence, which is exactly why D-23 asks
// for a clinician's signature rather than treating this file as settled.

/** One provisional unit, with the evidence a reviewer needs in order to correct it. */
export interface AssumedUnit {
  /** Rendered adjacent to the value, inside the same nowrap element (CLAUDE.md rule 15). */
  readonly label: string;
  /** Why this unit and not another. Shown in the D-23 review table, never in a tooltip only. */
  readonly basis: string;
}

/**
 * Spelling normalisation ONLY — case and surrounding whitespace. Nothing here changes meaning, so
 * nothing here can match one quantity to another's unit. Internal spacing is deliberately left
 * alone: `FiO 2` is not a spelling of `FiO2` this table is willing to guess at.
 */
const normalise = (name: string): string => name.trim().toLowerCase();

/**
 * THE TABLE. Ten quantities: the eight respiratory parameters the service sends today, plus the two
 * demographic measurements that render in the patient-context drawer.
 *
 * Adding a row is a clinical assertion, not a formatting change. It needs the same three things
 * every row here has — the conventional unit, the observed range, and the alternative it rules
 * out — and it needs its line in the D-23 table so the row is signed off with the others.
 */
const ASSUMED: Readonly<Record<string, AssumedUnit>> = {
  'respiratory rate': {
    label: 'breaths/min',
    basis:
      'Observed 19–25. The conventional unit for an adult ventilated rate; no competing unit is in ' +
      'clinical use for this quantity.',
  },
  'tidal volume': {
    label: 'mL',
    basis:
      'Observed 395–464. Millilitres, not mL/kg predicted body weight: a lung-protective mL/kg PBW ' +
      'target runs 4–8, three orders of magnitude away, so the range separates the two outright.',
  },
  peep: {
    label: 'cmH₂O',
    basis:
      'Observed 7–9. The ventilator convention for airway pressure. mbar is numerically within 2% ' +
      'of cmH₂O and would not be a clinical error, but it is not what a bedside ventilator displays.',
  },
  fio2: {
    label: 'fraction (0–1)',
    basis:
      'Observed 0.35–0.55, which is decisive: this is the FRACTION of inspired oxygen, not a ' +
      'percentage. It is never labelled "%" and never multiplied by 100 (CLAUDE.md rule 16) — ' +
      '"0.42 %" would read as a fifth of room air.',
  },
  spo2: {
    label: '%',
    basis:
      'Observed 92–96. Peripheral oxygen saturation is reported as a percentage, and the range ' +
      'places it there rather than on FiO2’s 0–1 fractional scale.',
  },
  'plateau pressure': {
    label: 'cmH₂O',
    basis: 'Observed 21–27. Airway pressure, same convention as PEEP.',
  },
  'driving pressure': {
    label: 'cmH₂O',
    basis:
      'Observed 11–15. A pressure DIFFERENCE, so it carries the same unit as the two pressures it ' +
      'is conventionally derived from. It is not derived here, and in this synthetic sample it does ' +
      'not equal plateau − PEEP.',
  },
  'minute ventilation': {
    label: 'L/min',
    basis:
      'Observed 8.1–10.7. Litres per minute; the mL/min alternative would put the same quantity ' +
      'near 9000 and is ruled out by the range.',
  },
  weight: {
    label: 'kg',
    basis:
      'Observed 65–99 across the delivered set. Kilograms; pounds would place the same adults at ' +
      '30–45 kg, which the range excludes.',
  },
  height: {
    label: 'cm',
    basis:
      'Observed 153–187. Centimetres; inches would place the same adults near 4 m and metres near ' +
      '1.7, both excluded by the range.',
  },
};

/**
 * The unit this interface will print beside a value of `name`, or `null` when the table does not
 * know the quantity — in which case the caller keeps `UNIT_NOT_SUPPLIED`. A `null` here is the safe
 * outcome, not a degraded one: it is the app declining to assert something it cannot support.
 */
export function assumedUnitFor(name: string): AssumedUnit | null {
  return ASSUMED[normalise(name)] ?? null;
}

/** Convenience for the call sites that only need the string. Same `null` contract. */
export function assumedUnitLabel(name: string): string | null {
  return assumedUnitFor(name)?.label ?? null;
}

/**
 * The whole table, for the D-23 review page and for the test that asserts this module and the
 * register row cannot drift apart. Sorted by name so a diff of the review table is readable.
 */
export const ASSUMED_UNITS: readonly (AssumedUnit & { readonly name: string })[] = Object.entries(
  ASSUMED,
)
  .map(([name, unit]) => ({ name, ...unit }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * ONE CHART-AXIS RANGE PER QUANTITY, added 2026-08-23 for `ProvenanceChart`'s fixed y-domain, at the
 * product owner's explicit request (**G-55**, `docs/spec/open-questions.md`) — a SEPARATE and
 * WEAKER-sourced assertion than the units table above, and it is kept in its own block for that
 * reason rather than folded into `AssumedUnit`.
 *
 * `docs/spec/open-questions.md`'s own governing rule 7 bans this register from PROPOSING a numeric
 * clinical value, "a normal range" among the named examples — which is exactly what this table looks
 * like at a glance. It is NOT one: nothing here is shaded, labelled "normal" or "abnormal", or used
 * anywhere but as the chart's PLOT WINDOW extent — G-28 (reference bands / normal ranges on this
 * same chart) is untouched and still OPEN, and `ProvenanceChart` draws no band. A window a patient's
 * real values can run outside of is still a legibility choice, not a clinical claim, the same way a
 * ruler's length is not a claim about how long anything measured with it will be.
 *
 * EVIDENCE, same standard as `ASSUMED` above: a conventional bedside-monitor charting range for the
 * quantity, wide enough to hold every value `back-end/seed/generate.js` has ever produced (cross-
 * checked against each `basis` string's own observed range) with real margin on both sides, so a
 * plausible real reading does not run off the axis. **G-55**, not signed off by clinical the way
 * D-23 is — correct here, in this one table, if it needs correcting.
 */
export interface ChartRange {
  readonly min: number;
  readonly max: number;
}

const CHART_RANGE: Readonly<Record<string, ChartRange>> = {
  'respiratory rate': { min: 0, max: 40 }, // observed 19-25; adult monitor charting range
  'tidal volume': { min: 0, max: 600 }, // observed 395-464
  peep: { min: 0, max: 20 }, // observed 7-9
  fio2: { min: 0.21, max: 1 }, // observed 0.35-0.55; 0.21 is room air, the fraction's own floor
  spo2: { min: 82, max: 100 }, // observed 92-96; 100 is the scale's own ceiling
  'plateau pressure': { min: 0, max: 40 }, // observed 21-27
  'driving pressure': { min: 0, max: 30 }, // observed 11-15
  'minute ventilation': { min: 0, max: 20 }, // observed 8.1-10.7
};

/**
 * The chart-axis range for `name`, or `null` when the table does not know the quantity — in which
 * case the caller falls back to the window's own min/max rather than asserting a domain it cannot
 * support (same fallback discipline `RISK_SCORE_DOMAIN`'s own G-12 override does NOT get, because
 * that one is a confirmed-by-the-owner fixed domain; this is a per-parameter display convenience and
 * stays optional).
 */
export function chartRangeFor(name: string): ChartRange | null {
  return CHART_RANGE[normalise(name)] ?? null;
}

/**
 * The sentence every surface that prints an assumed unit must carry, once, in visible text. One
 * owner for the string, so the drawer and the parameter table cannot say it two different ways
 * (`docs/spec/ui-states.md` section 3 rule 13).
 *
 * IT WAS SHORTENED, NOT REMOVED, on 2026-08-17. The product owner asked for the not-yet-defined
 * decisions to come off the screen, and the tail `— provisional, pending clinical confirmation`
 * was exactly that: its subject was the sign-off workflow. What stays is the half a clinician acts
 * on — that the unit beside the number was chosen by this interface from the parameter's NAME and
 * did not arrive with the value. Deleting the whole sentence would leave an invented label looking
 * measured, which is a clinical risk rather than a process concern; the register row is **D-23**.
 */
export const UNIT_ASSUMED_NOTE =
  'Units are supplied by this interface, not by the assessment data — chosen from the parameter name.';
