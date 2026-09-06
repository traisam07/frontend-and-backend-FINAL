// src/lib/domain/types.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 1, with
// exactly three carve-outs: `ModelUse`, `Known<T>` and `RankKey` are canonical in
// `docs/spec/data-contract.md` section 1.6 and are mirrored here with a pointer back.
//
// This is the DOMAIN layer: camelCase members, real `Date` objects. The validated WIRE layer it is
// parsed from — snake_case members, ISO-8601 strings, every entity prefixed `Wire` — is
// `src/lib/data/wire.ts`. Neither module redeclares the other's types.

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type ReviewStatus = 'reviewed' | 'pending_review' | 'unknown';
export type Provenance = 'measured' | 'carried_forward' | 'population_reference';
export type Sufficiency = 'sufficient' | 'insufficient';
/**
 * `'sufficiency-unknown'` added 2026-08-23, at the product owner's request — the fourth member the
 * comment below used to say never existed. It is NOT the handoff's: the handoff names only `all`,
 * `needs-review` and `data-limited` (Handoff section 3). `sufficientData === null` (F-6's "data
 * sufficiency unknown", already rendered by `InsufficientChip`) had no way to filter the board to
 * before this — a clinician could see the badge on a card but not isolate the group. This is a
 * stated deviation, not a silent one; see `docs/spec/screens.md` OV-3 for the note.
 *
 * `'reviewed'` added THE SAME DAY, also HARNESS: the board already GROUPS by review status (OV-4),
 * but a grouped page is still one long scroll — reaching `Reviewed` means scrolling past every
 * `Pending review` card first. `needs-review` narrows to the first group; `reviewed` is its
 * mirror, narrowing to the second, so either can be viewed without the other on screen at all.
 */
export type TriageFilter =
  'all' | 'needs-review' | 'reviewed' | 'data-limited' | 'sufficiency-unknown';

/**
 * The risk-band filter, and it is deliberately NOT a member of `TriageFilter`.
 *
 * `TriageFilter`'s own values mean review state and data quality (three of its four are the
 * handoff's own, section 3 — see that type's doc comment for the fourth).
 * A risk band is a different question about the same patient, so the two compose — `needs-review`
 * AND `Critical` is a sensible view, and it could not be expressed by a union that holds one value.
 * Keeping them apart also keeps the U-20 unrecognised-filter handling honest: each parameter
 * validates against its own grammar.
 *
 * `unknown` is a REAL band here, not an absence: it selects the patients whose `risk_level` is
 * missing or unrecognised (S-05), which is a group a clinician has an obvious reason to want to see.
 * "No filter" is `null`, which is a different thing again.
 *
 * Harness-defined, pending design confirmation (**D-18**) — the handoff names no risk filter.
 */
export type RiskFilter = RiskLevel | 'unknown';

/**
 * Canonical in `docs/spec/data-contract.md` section 1.6. `available` exists in the union because an
 * explicit backend flag is the ONLY thing that may ever produce it (F-8). `parseParameter` emits
 * `score_factor` or `unknown` and nothing else — absence from `top_contributors` is not evidence
 * that the model ignored a parameter (G-04).
 */
export type ModelUse = 'score_factor' | 'available' | 'unknown';

/**
 * Canonical in `docs/spec/data-contract.md` section 1.6. The ONE absence wrapper in the app, used
 * only where the UI renders the REASON for the absence rather than just the fact of it (today:
 * `lastMeasured`). Everywhere else a clinical field is a bare `| null`, because under `strict` a
 * nullable already forces the branch. `kind: 'unavailable'` is the discriminant of every
 * discriminated absence here — `'unknown'` is a `ReviewStatus` member, a state, never an absence.
 *
 * Three of the four reasons have a producer (`parseLastMeasured`); `withheld` has none and must not
 * acquire one by inference — it asserts that the backend held a value back, which only an explicit
 * redaction signal can say (**G-06**, **G-23**, both OPEN).
 */
export type Known<T> =
  | { kind: 'value'; value: T }
  | {
      kind: 'unavailable';
      reason: 'not_provided' | 'not_applicable' | 'invalid' | 'withheld';
    };

/**
 * Canonical in `docs/spec/data-contract.md` section 1.6. The memoization key for the board ranking
 * (`docs/spec/screens.md` section 6.5 rule 3): if this key set is unchanged across a data arrival,
 * the previous array identity is reused so the DOM does not churn.
 */
export interface RankKey {
  patientId: string;
  reviewRank: 0 | 1 | 2;
  riskRank: 0 | 1 | 2 | 3 | 4;
  riskScore: number | null;
  latestCharttimeMs: number | null;
}

export interface ParameterReading {
  name: string;
  slug: string;
  value: number;
  /** null => S-15, "Provenance unknown". Never widened to 'measured'. */
  source: Provenance | null;
  /**
   * F-10 renders WHY this is absent, so it carries the reason: 'not_provided' when the wire omitted
   * it, 'invalid' when it did not parse, 'not_applicable' on a population reference.
   */
  lastMeasured: Known<Date>;
  /**
   * THE UNIT THE SERVICE SUPPLIED, or null when it supplied none (**G-01**).
   *
   * When it is present it is a measured fact about the quantity and the asserted table in
   * `$lib/domain/units` is not consulted. When it is null the app falls back to that table, and to
   * the `unit not supplied` marker for a quantity the table does not know. The two cases are
   * distinguished on screen: a supplied unit carries no `data-clarify` marker, because there is
   * nothing left to clarify.
   */
  unit: string | null;
  /** Never inferred as 'available'. Absence from top_contributors proves nothing (F-8). */
  modelUse: ModelUse;
}

/**
 * `underlying_condition[]` — SINGULAR on the wire. `catch` is a JS reserved word, so the domain
 * member is `catchFlag`. Store it, display every comorbidity, and use the flag for NOTHING until
 * **G-10** is answered: it must not filter, sort, or restyle a row.
 */
export interface UnderlyingCondition {
  name: string;
  catchFlag: boolean;
}

/**
 * Absence is representable on every clinical field. Under `strict` + `noUncheckedIndexedAccess`
 * that is what forces the S-05 / S-10 / S-15 / U-11 / U-22 / S-35 branches to be written, instead
 * of a `??` quietly inventing a value. Five fields are nullable after validation: `charttime`,
 * `sufficientData`, `riskScore`, `riskLevel` and `ParameterReading.source`.
 */
export interface Reading {
  /**
   * null => the timestamp was absent or unparseable: excluded from F-1 selection. With no usable
   * charttime anywhere in `readings[]` the patient is in state U-11 on every Patient Detail
   * surface, and in state U-22 in the OV-4 card's time slot — two states, two literals.
   */
  charttime: Date | null;
  /**
   * null => S-35, the explicit "score unavailable" render. Never `riskScore ?? 0` — `0` is a
   * legible clinical claim, and a patient is never dropped over one bad field.
   */
  riskScore: number | null;
  /** null => S-05, "Risk level unavailable". Never 'Low'. */
  riskLevel: RiskLevel | null;
  /** null => S-10: sufficiency unknown, which gates exactly as 'insufficient' does. */
  sufficientData: Sufficiency | null;
  /** scale unconfirmed (G-11) — never formatted as a percentage */
  imputedShare: number;
  /** scale unconfirmed (G-11) */
  documentationShare: number;
  topContributors: ReadonlyArray<{ name: string; contribution: number }>;
  parameters: readonly ParameterReading[];
  explanation: string | null;
  citations: ReadonlyArray<{ name: string; claim: string }> | null;
  reviewAt: Date | null;
  /**
   * The publisher's own run length at `riskLevel`, or null when the source does not supply one
   * (**G-32**). Preferred over the client-side walk because only the publisher can see the readings
   * that were not sent.
   */
  readingsInState: number | null;
}

/**
 * A reading whose `charttime` parsed. Only these take part in latest-reading selection (F-1), the
 * risk-history window and the held-at-level run, so the ordering helpers hand back this type and
 * downstream code never has to re-check `charttime`.
 */
export type TimedReading = Reading & { charttime: Date };

/**
 * The triage-board projection: one row per patient, every field taken from that patient's latest
 * reading (F-1) and nothing invented. The nullable members are the board's absence states — S-05,
 * S-10, S-35 and, for the time slot, U-22. They are bare `| null` BY DESIGN
 * (`docs/spec/data-contract.md` section 1.6): the card states that the value is absent, not why, so
 * `Known<T>` would buy a reason nothing renders. This is the prop type of `PatientCard.svelte`, and
 * its producer is `toPatientSummary` — nothing else builds one.
 */
/**
 * The PD-6 run-length result, and — since 2026-08-18 — the board's too. Named rather than inlined
 * because two surfaces now render it and a structurally identical anonymous type in two files is
 * how the `unavailable` branch quietly becomes `count: 0` in one of them.
 *
 * `truncated` means the backwards walk reached the OLDEST reading delivered, so the true run may be
 * longer and the literal takes the `≥` prefix. `unavailable` is the F-3.4 case — the latest
 * reading's `risk_level` is null, so the walk never starts and NO count exists. It is never 0.
 */
export type HeldAtLevel =
  { kind: 'value'; count: number; truncated: boolean } | { kind: 'unavailable' };

export interface PatientSummary {
  patientId: string;
  /** Bed and care unit, null when the source does not know them. Never invented, never defaulted. */
  bedCode: string | null;
  careUnit: string | null;
  /**
   * The open review prompt's id, or null. Not a clinical value and never rendered.
   *
   * It is here so a mark made in this session can be described truthfully. A patient with a prompt
   * gets a RECORDED review; one without gets a local, unsaved mark. Both set the same flag in
   * `ReviewLog`, so without this the two are indistinguishable and the review history asserts
   * "not saved to the patient record" over a review that was saved.
   */
  promptId: string | null;
  reviewStatus: ReviewStatus;
  riskLevel: RiskLevel | null; // S-05
  /**
   * null => the latest reading carried no usable score ("score unavailable", S-35), or there is no
   * usable reading at all (U-11). Both render explicitly; neither renders 0.
   */
  riskScore: number | null;
  sufficientData: Sufficiency | null; // S-10
  /**
   * null => no reading carries a usable `charttime`. In the OV-4 card's time slot that is state
   * U-22 and its own literal; the same patient on Patient Detail is U-11. Never a wall clock.
   */
  latestChartTime: Date | null;
  topContributors: ReadonlyArray<{ name: string; contribution: number }>;
  /**
   * How many consecutive readings the patient has been at the CURRENT level (F-3), pre-derived here
   * because the board discards `readings[]` and the card cannot recompute it.
   *
   * "Critical for 2 readings" and "Critical for 6" are different clinical situations that looked
   * identical on the board until this field existed. `unavailable` renders S-38's third literal, and
   * never a count beside a `Risk level unavailable` chip.
   */
  heldAtLevel: HeldAtLevel;
}

export interface PatientSnapshot {
  patientId: string;
  /** See `WirePatient.bed_code`. Nullable: absence is a state, not a failure. */
  bedCode: string | null;
  careUnit: string | null;
  /** Address for a review disposition, or null when no prompt is open. Not a clinical value. */
  promptId: string | null;
  age: number;
  gender: string;
  /** verbatim String in the schema; no unit is appended, no parsing (G-19) */
  weight: string | null;
  height: string | null;
  race: string;
  /** null in the wire maps to 'unknown', never to 'reviewed' */
  reviewStatus: ReviewStatus;
  underlyingConditions: readonly UnderlyingCondition[];
  readings: readonly Reading[];
  integrityWarnings: readonly string[];
}

/* ---- presentation projections ------------------------------------------------------------------
   Pre-formatted view models, not new sources of truth. They exist so a table row or a chart mark
   never re-derives, re-rounds, or re-orders a clinical value at render time; every member is
   produced once, by the domain helpers, from the types above.                                    */

/**
 * One row of the PD-10 parameter table, projected from a `ParameterReading` by `toParameterRows` —
 * its only producer. This is the prop type of `ParameterTable` and of `ParameterRow`; the chain is
 * this type end to end, so no component is ever handed a raw `ParameterReading` and left to format
 * it.
 */
export interface ParameterRowVm {
  name: string;
  slug: string;
  /**
   * Pre-formatted at the precision the value arrived with — no `toFixed`, no rounding here or at
   * render time. The union exists because per-field requiredness is unconfirmed (**G-31**): the
   * validator rejects a non-finite `value` today, and if that ever softens the row must already
   * have somewhere to put the absence. `kind: 'unavailable'` renders the explicit unknown
   * treatment: never `0`, never a bare em dash, never an empty cell.
   */
  value: { kind: 'value'; text: string } | { kind: 'unavailable' };
  /**
   * The label printed beside the value. The schema still has no `unit` field (**G-01** is open), so
   * this is either a unit this INTERFACE supplies from `$lib/domain/units` — the product owner's
   * decision, **D-23** — or the `unit not supplied` marker when that table does not know the
   * quantity. `unitAssumed` says which, and it is a separate field precisely so no surface has to
   * infer provenance by comparing the label against a magic string.
   */
  unitLabel: string;
  /**
   * `true` when `unitLabel` is this interface's assertion rather than the data's. The surfaces that
   * render it must mark it — `data-clarify="G-01"` on the element, and the `UNIT_ASSUMED_NOTE`
   * sentence once per surface. A provisional unit that looks measured is worse than no unit.
   */
  unitAssumed: boolean;
  source: Provenance | null; // S-15 when null
  lastMeasured: Known<Date>; // the absence carries its reason (F-10)
  /** `charttime` of the reading this row came from, already narrowed to a real instant. */
  chartedIso: string;
  modelUse: ModelUse;
}

/**
 * One plotted mark of the risk-history series (F-2), projected from a `TimedReading` by
 * `toChartPoints` — its only producer. A reading whose `riskScore` is `null` produces NO
 * `ChartPoint` at all: F-2 omits it from the plotted line, and `y` being a plain `number` means
 * there is nowhere for a `0` to be substituted even by accident. That reading is still the S-35
 * "score unavailable" row of the chart's data table, which is built from the same window.
 */
export interface ChartPoint {
  /**
   * The `{#each}` key, and it is NOT the ISO instant.
   *
   * `charttime` is not unique: U-12 (colliding charttime) is a supported state, `orderByChartTimeAsc`
   * deliberately never dedupes, and Svelte THROWS `each_key_duplicate` on a repeated key — in
   * production as well as in dev. Keying on the instant therefore turned the one patient the fixture
   * set exists to prove U-12 on into a blank screen, caught by no route error boundary because those
   * catch load failures and not render failures (`docs/LESSONS.md` L-057).
   *
   * So the producer mints `\`${iso}#${ordinal}\`` — stable across refreshes for the same window, and
   * unique even when two readings share an instant.
   */
  key: string;
  /** `charttime.toISOString()`, for the `<time datetime>` attribute. Never the key. */
  iso: string;
  /**
   * SVG user units within the plot box the producer was given. Positioned by TIME, never by index:
   * even spacing would draw a 40-minute hole as an ordinary step (F-2).
   */
  x: number;
  y: number;
  /** The score exactly as delivered — no rounding, no `%`, no `/100` (G-12). */
  valueText: string;
  /**
   * Read FIRST in the accessible name, so the caveat is heard before the number: the reading's
   * risk-level label (`Risk level unavailable` when absent, S-05) plus its data-sufficiency caveat.
   */
  sourceLabel: string;
  absTime: string;
  relTime: string;
  /**
   * True when the interval between this mark and the previous one exceeds the F-2 gap threshold, so
   * the chart draws a VISIBLE BREAK rather than a connecting segment. A straight line across a
   * 40-minute hole asserts a continuity the data does not support.
   */
  breakBefore: boolean;
  /**
   * True when this reading's `sufficientData` is NOT `'sufficient'` — either `insufficient` or
   * `null`. F-2: "Points whose reading is `insufficient` are marked distinctly."
   *
   * The mark's SHAPE changes, not just its colour: a hollow square rather than a filled circle, so
   * the caveat survives greyscale, CVD and forced-colors. Without it a data-limited reading plots
   * identically to a reliable one, and the caveat exists only in the tooltip.
   */
  dataLimited: boolean;
  /**
   * `reading.reviewAt !== null` — the BACKEND's own per-reading review report, added 2026-08-23 at
   * the product owner's request to mark reviewed readings on the history line ("thêm màu/dấu hiệu
   * riêng cho các điểm đã được review"). This is NOT the same fact as `markedHere` in
   * `PatientDetailBody.svelte` (a LOCAL, session-only, patient-level mark from `Mark as reviewed`):
   * that action never writes to a specific historical reading, only to the current session's view
   * of the LATEST one, so it has nothing to say about an older point on this line. A reading with no
   * usable `charttime` never reaches this producer at all, so there is no third state to represent
   * here — `reviewAt` is `Date | null` on every `TimedReading`, and `null` means "not reviewed"
   * exactly as it does everywhere else `reviewAt` is read.
   */
  reviewed: boolean;
}

/**
 * One mark of the PM-5 charting-provenance chart (F-11), projected by `toProvenancePoints` — its
 * only producer.
 *
 * The chart is charting PROVENANCE, not a PulseMind trend classification, so `source` is the
 * encoded dimension and it has FOUR cases: the three literals plus the explicit unknown mark
 * (S-15). A reading that does not carry this parameter produces a GAP — `present: false` — never a
 * `0` and never an interpolated point.
 */
export interface ProvenancePoint {
  /** The `{#each}` key. Unique even under a colliding charttime — see `ChartPoint.key`. */
  key: string;
  iso: string;
  x: number;
  /** `null` when this reading does not carry the parameter — the F-11 gap. Nothing is plotted. */
  y: number | null;
  /** `false` => the reading exists but carries no entry for this parameter. */
  present: boolean;
  valueText: string | null;
  source: Provenance | null;
  /** Pre-formatted; empty when there is no last-measured time to show (S-14, or absent). */
  lastMeasuredText: string;
  absTime: string;
  relTime: string;
}

/**
 * One row of the chart's MANDATORY data table, projected from a `TimedReading` by
 * `toChartTableRows` — its only producer.
 *
 * It exists because the table and the plotted series are NOT the same set. A reading whose
 * `riskScore` is `null` produces no `ChartPoint` at all (F-2 omits it from the line), and it must
 * still appear here as the S-35 `score unavailable` row — "never reconstruct the table from
 * `points`, or those readings disappear from the screen entirely"
 * (`.claude/skills/clinical-a11y/SKILL.md` section 7).
 *
 * `[HARNESS]` extension: `.claude/skills/clinical-a11y/SKILL.md` section 7 declares
 * `RiskHistoryChart` with the props `{ points, unitLabel }` and, in the same breath, requires the
 * component to carry a real table of EVERY plotted value. Those two cannot both hold, because
 * `points` has already dropped the null-score readings. The chart therefore takes a third prop,
 * `rows: readonly ChartTableRow[]`, and this type is what fills it. Registered as a declared
 * extension rather than resolved by dropping a reading from the screen.
 */
export interface ChartTableRow {
  /** The `{#each}` key. Unique even under a colliding charttime — see `ChartPoint.key`. */
  key: string;
  /** `charttime.toISOString()`, for the `<time datetime>` attribute. Never the key. */
  iso: string;
  absTime: string;
  relTime: string;
  /** `null` => this reading carried no usable score. The row renders `score unavailable` (S-35). */
  valueText: string | null;
  /** `Critical` … `Low`, or the S-05 literal when the level is absent. */
  levelLabel: string;
  /** `''` when the reading is `sufficient`; otherwise the S-10 label for its branch. */
  sufficiencyLabel: string;
}
