// src/lib/data/wire.ts
// CANONICAL DECLARATION — `docs/spec/data-contract.md` sections 1.2–1.5.
//
// The VALIDATED WIRE layer: snake_case members spelled exactly as `docs/patientSchema.js` spells
// them, ISO-8601 strings rather than `Date`s, and every entity prefixed `Wire` so it cannot collide
// with its domain counterpart in `src/lib/domain/types.ts`.
//
// Nothing in the app casts an API response to these types. `parsePatientSnapshot` takes `unknown`
// and narrows with type predicates; these interfaces document the shape the validator reads, and
// they are what a fixture or a backend change is diffed against. `res.json() as WirePatient` is
// forbidden — that is the cast the validator exists to replace.

import type { Provenance, RiskLevel, Sufficiency } from '$lib/domain/types';

/** ISO-8601 instant exactly as delivered on the wire. Converted to `Date` only inside the adapter. */
export type IsoDateTime = string;

/**
 * Wire spelling of the review status. NOTE the title case and the space: "Pending Review". The
 * domain union is `ReviewStatus` (`'reviewed' | 'pending_review' | 'unknown'`); the mapping,
 * including the `null` third state, is `docs/spec/data-contract.md` section 2.2.
 */
export type WireReviewStatus = 'Reviewed' | 'Pending Review';

export interface WireContributor {
  name: string;
  /**
   * Unit, scale, and sign semantics are UNSPECIFIED (**G-24**).
   * Do NOT `Math.abs()` it. Do NOT re-normalise contributions to sum to 100 %.
   * A negative contribution may be protective; rendering it as a large positive bar inverts its
   * clinical meaning.
   */
  contribution: number;
}

/** `warning_status.flags[]` — present in the schema, referenced nowhere in the handoff (**G-14**). */
export interface WireFlag {
  top_contributors: WireContributor[];
  flag_when: IsoDateTime;
}

export interface WireWarningStatus {
  /** `null` is a real, reachable third state the handoff never describes (**G-09**, state S-09). */
  status: WireReviewStatus | null;
  flags: WireFlag[];
}

/**
 * Wire shape is `underlying_condition: [{ name, catch }]` — note the SINGULAR wire key. There is no
 * `underlying_conditions`; reading the plural spelling makes every patient fail validation (U-21).
 */
export interface WireUnderlyingCondition {
  name: string;
  /**
   * The wire key is `catch` — legal as a property name, illegal as an identifier, so the domain
   * member is `catchFlag` (**G-10**). The field's meaning is unclear. Read it, store it, use it for
   * NOTHING: it must not drive filtering, sorting, or styling, and every comorbidity is displayed
   * regardless of its value (F-13).
   */
  catch: boolean;
}

export interface WireParameterReading {
  name: string;
  value: number;
  /**
   * `null` when the wire omitted `source` or delivered a value outside the three literals. `null`
   * routes to state S-15, badge literal `Provenance unknown`. NEVER defaulted to `measured`:
   * asserting that an unknown-provenance value was measured on this patient is the exact claim the
   * data cannot support.
   */
  source: Provenance | null;
  /**
   * Meaningless for `population_reference`. Expected present for `carried_forward` — the handoff
   * (section 5) requires the last-measured time to be retained. Modelled nullable because the wire
   * may omit it (**G-18**); `null` on a carried_forward row is an integrity warning, not a blank
   * cell. This is the one field whose absence is rendered WITH ITS REASON, so the domain member is
   * `lastMeasured: Known<Date>` rather than a bare null.
   */
  last_measured: IsoDateTime | null;
}

export interface WireCitation {
  name: string;
  claim: string;
  // No url / doi / version / publication date on the wire (**G-17**). Render as plain text, unlinked.
}

export interface WireReading {
  /**
   * `null` when the wire omitted `charttime` or delivered a value that does not parse. A null
   * charttime EXCLUDES the reading from latest-selection (F-1) and raises an integrity warning;
   * zero usable readings is state U-11, a collision is U-12. Never a fallback, never `new Date()`,
   * never the epoch.
   */
  charttime: IsoDateTime | null;
  /** Scale UNCONFIRMED: fraction 0–1 vs percent 0–100 (**G-11**). Do not format as % (F-7). */
  imputed_share: number;
  /** Scale UNCONFIRMED. Same treatment as `imputed_share`. */
  documentation_share: number;
  /**
   * `null` when the wire omitted the field or delivered a value outside the two literals. `null` is
   * NOT `sufficient` for any gating decision (F-6) and renders the unknown data-sufficiency
   * treatment (state S-10). NEVER defaulted to `sufficient`.
   */
  sufficient_data: Sufficiency | null;
  /**
   * Range and scale UNCONFIRMED (**G-12**). Never map score -> level client-side. `null` routes to
   * state S-35 "score unavailable", keeps the patient on the board, and sorts after every present
   * score. Absence is NEVER fatal. NEVER `risk_score ?? 0` — `0` is a legible clinical claim.
   */
  risk_score: number | null;
  /**
   * `null` when the wire omitted `risk_level` or delivered a value outside the four literals.
   * `null` routes to state S-05 "Risk level unavailable" and to riskRank 4. NEVER defaulted to
   * `Low`.
   */
  risk_level: RiskLevel | null;
  /** Nullable: a reading that has not been reviewed has no review time. */
  review_at: IsoDateTime | null;
  /**
   * HOW MANY CONSECUTIVE READINGS THE PATIENT HAS BEEN AT `risk_level`, counted by the service that
   * published the band. **G-32** asked whether the backend should supply this instead of the
   * frontend walking `readings[]`, and a backend that runs a hysteresis machine is the only party
   * that can answer it correctly: the frontend's walk can only count the readings it was SENT, so
   * on the board, which carries one reading per patient, it always answers "at least 1".
   *
   * Nullable, and the walk in `heldAtLevel` remains the fallback, so a source that does not supply
   * it behaves exactly as before.
   */
  readings_in_state: number | null;
  /** Ranked factors for THIS reading. Distinct from `WireWarningStatus.flags[].top_contributors`. */
  top_contributors: WireContributor[];
  parameters: WireParameterReading[];
  /**
   * `null` when withheld (e.g. insufficient data) AND `null` when simply not generated. The two are
   * different states with different copy: `sufficient_data === 'insufficient'` or `null` is state
   * S-10, while `sufficient` plus a null explanation is state S-37. Which one the backend means is
   * **G-16**. Never render a placeholder narrative.
   */
  explanation: string | null;
  /** `null` when withheld. `[]` and `null` are both "no references"; neither may be faked. */
  citations: WireCitation[] | null;
}

export interface WirePatient {
  patient_id: string; // schema: required
  /**
   * BED IDENTITY. Not in `docs/patientSchema.js` and not carried by the fixture set, so it is
   * nullable and its absence is never fatal: a source that does not know the bed says so, and the
   * board renders the patient without one rather than dropping the patient.
   *
   * A bed number and a care unit are not patient identifiers. They name a place, and an ICU triage
   * board that cannot say which bed is being talked about is a list, not a board (**G-06**).
   */
  bed_code: string | null;
  /** The care unit the bed sits in: `MICU`, `SICU`, `CCU`. Nullable for the same reason. */
  unit: string | null;
  /**
   * The id of the open review prompt, when one exists. It is the address a disposition is posted
   * to, and it is NOT a clinical value: nothing renders it, nothing sorts on it. Nullable because
   * most readings raise no prompt.
   */
  prompt_id: string | null;
  age: number; // schema: required
  gender: string; // schema: required, free text — display verbatim (G-20)
  /** schema: NOT required, and typed String, not Number. Units unknown — do not parse (**G-19**). */
  weight: string | null;
  /** schema: NOT required, and typed String, not Number. Units unknown — do not parse (**G-19**). */
  height: string | null;
  race: string; // schema: required, free text — display verbatim (G-20)
  warning_status: WireWarningStatus;
  underlying_condition: WireUnderlyingCondition[];
  readings: WireReading[];
}

/**
 * A non-fatal contradiction that must still reach the screen as state U-12. What crosses the module
 * boundary is the rendered text — `PatientSnapshot.integrityWarnings: readonly string[]` — so these
 * two records are the shapes the validator builds internally.
 */
export interface IntegrityWarning {
  path: string;
  code: string;
  detail: string;
}

/** Fatal for that entity, and routes to U-21 / U-04. */
export interface IntegrityError {
  path: string;
  code: string;
  detail: string;
}
