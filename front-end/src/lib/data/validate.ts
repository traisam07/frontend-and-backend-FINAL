// src/lib/data/validate.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 1.
//
// The wire is untrusted. `response as PatientSnapshot` is forbidden; so is `??` defaulting of a
// clinical field. Validation failure is a VISIBLE UI STATE (U-21), never a default value.
//
// Two rules make this the reference implementation, and both are structural rather than stylistic:
//
//   - No `as` anywhere over the payload. Narrowing is done with a type predicate, so a field that
//     was never checked cannot be read at all.
//   - The result is a complete object literal ANNOTATED `: PatientSnapshot`, with no assertion.
//     Forget a member and it is a compile error; add a member to `PatientSnapshot` and every parser
//     that does not yet produce it goes red. `as PatientSnapshot` would silently ship `undefined`
//     where a risk score belongs.

import type {
  ParameterReading,
  PatientSnapshot,
  Provenance,
  Reading,
  ReviewStatus,
  RiskLevel,
  Sufficiency,
  UnderlyingCondition,
} from '$lib/domain/types';
import { slugCollisions, slugify } from '$lib/domain/slug';

export type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/* ---- primitives --------------------------------------------------------------------------------
   A type predicate, never `raw as Record<string, unknown>`: the cast would let an unchecked field be
   read as `undefined` and put on screen.                                                         */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function requireString(raw: unknown, field: string): Parsed<string> {
  return typeof raw === 'string' && raw.length > 0
    ? { ok: true, value: raw }
    : { ok: false, problem: `${field} is missing or not a non-empty string` };
}

function requireFinite(raw: unknown, field: string): Parsed<number> {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? { ok: true, value: raw }
    : { ok: false, problem: `${field} is missing or not a finite number` };
}

/**
 * Absent stays absent — never "0", never "". Verbatim: this is the parser prose goes through
 * (`explanation`), so not a character is touched.
 */
function nullableString(raw: unknown, field: string): Parsed<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  return typeof raw === 'string'
    ? { ok: true, value: raw }
    : { ok: false, problem: `${field} was present but not a string` };
}

/**
 * `weight` / `height` are verbatim Strings in the schema (**G-19**). Section 2.3 of the data
 * contract permits exactly ONE normalization on them — trim — and nothing else: never parse to a
 * number, never append `kg`/`cm`. `gender` and `race` do not come through here at all: 2.3 says
 * verbatim free text for those, so they keep even their leading spaces.
 */
function trimmedNullableString(raw: unknown, field: string): Parsed<string | null> {
  const parsed = nullableString(raw, field);
  if (!parsed.ok || parsed.value === null) return parsed;
  return { ok: true, value: parsed.value.trim() };
}

function parseList<T>(
  raw: unknown,
  field: string,
  item: (entry: unknown, at: string) => Parsed<T>,
): Parsed<readonly T[]> {
  if (!Array.isArray(raw)) return { ok: false, problem: `${field} is missing or not an array` };
  const entries: readonly unknown[] = raw; // keeps `any` from leaking out of Array.isArray
  const out: T[] = [];
  for (const [i, entry] of entries.entries()) {
    const parsed = item(entry, `${field}[${i}]`);
    if (!parsed.ok) return parsed;
    out.push(parsed.value);
  }
  return { ok: true, value: out };
}

/* ---- the fields whose absence is a UI state, not a fallback ------------------------------------

   `docs/spec/data-contract.md` section 2.3 files ABSENT under "anything else" for all five of
   these, so absence warns too — with different text from an unrecognised value, because U-12 has to
   be able to tell "the backend sent something we do not recognise" from "the backend sent nothing".
   Every one of them is NON-FATAL: `null` plus a warning, never a rejected patient (section 2.4),
   because that is the only way the S-05 / S-10 / S-15 / S-35 / U-11 states stay reachable.       */

function isAbsent(raw: unknown): boolean {
  return raw === null || raw === undefined;
}

/**
 * `null` on absence AND on an unparseable value — never `new Date(undefined)`, never the epoch.
 *
 * `whenAbsent` is the difference between the two nullable instants: F-1 step 2 makes a missing
 * `charttime` an integrity warning because it silently drops the reading out of latest-selection,
 * while a reading that was never reviewed legitimately carries no `review_at`.
 */
function parseInstant(
  raw: unknown,
  field: string,
  warnings: string[],
  whenAbsent: 'warn' | 'expected',
): Date | null {
  if (isAbsent(raw)) {
    if (whenAbsent === 'warn') warnings.push(`Missing ${field}`);
    return null; // charttime: excluded from F-1, state U-11
  }
  if (typeof raw !== 'string') {
    warnings.push(`Unparseable ${field}: ${JSON.stringify(raw)}`);
    return null;
  }
  const instant = new Date(raw);
  if (!Number.isFinite(instant.getTime())) {
    warnings.push(`Unparseable ${field}: ${JSON.stringify(raw)}`);
    return null;
  }
  return instant;
}

function parseRiskLevel(
  raw: unknown,
  at: string,
  refused: boolean,
  warnings: string[],
): RiskLevel | null {
  if (raw === 'Critical' || raw === 'High' || raw === 'Medium' || raw === 'Low') return raw;
  // No case-folding here, deliberately: section 2.3 accepts ONLY the four literals, so "critical"
  // is an unrecognised value and not a spelling variant. Case-folding is prescribed for exactly two
  // joins — `warning_status.status` and the model-use name match — and nowhere else.
  //
  // AN ABSENT LEVEL ON A REFUSED READING IS NOT AN INTEGRITY PROBLEM. See `parseScore`.
  if (!(refused && isAbsent(raw))) {
    warnings.push(
      isAbsent(raw)
        ? `Missing ${at}.risk_level`
        : `Unrecognised ${at}.risk_level: ${JSON.stringify(raw)}`,
    );
  }
  return null; // S-05. Never 'Low'.
}

/** Wire spelling is fixed in `docs/spec/data-contract.md` section 2.3; anything else is S-10. */
function parseSufficiency(raw: unknown, at: string, warnings: string[]): Sufficiency | null {
  if (raw === 'sufficient' || raw === 'insufficient') return raw;
  warnings.push(
    isAbsent(raw)
      ? `Missing ${at}.sufficient_data`
      : `Unrecognised ${at}.sufficient_data: ${JSON.stringify(raw)}`,
  );
  return null; // S-10. Never gates as 'sufficient'.
}

/**
 * NON-FATAL, exactly like `parseRiskLevel`. An absent or non-finite score yields `null` plus an
 * integrity warning; it never rejects the patient, because dropping a patient over one bad field is
 * forbidden and because the "score unavailable" state (S-35) has to be reachable. Never `?? 0`.
 */
/**
 * ⚠️ THE WARNING NAMES ITS READING, and that is not cosmetic.
 *
 * `IntegrityWarnings` keys its `{#each}` by the warning TEXT, on the stated assumption that these
 * are "distinct strings naming distinct paths". `Missing risk_score` named no path, so a patient
 * whose readings all lack a score produced the same string once per reading, and Svelte threw
 * `each_key_duplicate`. No `+error.svelte` catches a RENDER failure, so Patient Detail went blank
 * with no named state, which is the incident CLAUDE.md rule 4 exists to prevent. Seen live on the
 * bed that refuses on every reading: 24 readings, 24 identical keys, a white screen.
 *
 * ⚠️ AND AN ABSENT SCORE ON A REFUSED READING IS NOT AN INTEGRITY PROBLEM AT ALL. When
 * `sufficient_data` is `insufficient` the contract REQUIRES no score: the reading fell below the
 * data-sufficiency floor and the model declined to publish one. Warning about it reports the
 * system working correctly as a fault, and a banner that cries wolf twenty-four times is a banner
 * nobody reads the twenty-fifth time. The state is already stated, prominently, by S-10.
 *
 * An UNRECOGNISED score still warns on a refused reading: a value that is present and unusable is
 * a real contradiction whatever the sufficiency says.
 */
function parseScore(raw: unknown, at: string, refused: boolean, warnings: string[]): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (!(refused && isAbsent(raw))) {
    warnings.push(
      isAbsent(raw)
        ? `Missing ${at}.risk_score`
        : `Unrecognised ${at}.risk_score: ${JSON.stringify(raw)}`,
    );
  }
  return null; // S-35. Never 0.
}

function parseProvenance(raw: unknown, field: string, warnings: string[]): Provenance | null {
  if (raw === 'measured' || raw === 'carried_forward' || raw === 'population_reference') return raw;
  warnings.push(
    isAbsent(raw) ? `Missing ${field}` : `Unrecognised ${field}: ${JSON.stringify(raw)}`,
  );
  return null; // S-15. Never 'measured'.
}

/**
 * `docs/spec/data-contract.md` section 2.2 normalizes on trim + collapsed inner spacing + case-fold,
 * then matches the folded literal exactly. The schema writes `"Pending Review"` (title case, one
 * space) while the handoff prose writes "Pending review"; both are real, they live in different
 * layers, and an exact-string compare would file the prose spelling under "unrecognised" and hide a
 * pending patient behind `Review status unavailable`.
 *
 * Folding is not guessing: `"pendingreview"` still fails, because collapsing runs of whitespace is
 * not the same as deleting it.
 */
function toReviewStatus(raw: unknown, warnings: string[]): ReviewStatus {
  if (isAbsent(raw)) return 'unknown'; // S-09, a real third state — not a warning
  if (typeof raw !== 'string') {
    warnings.push(`Unrecognised warning_status.status: ${JSON.stringify(raw)}`);
    return 'unknown';
  }
  const folded = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (folded === 'reviewed') return 'reviewed';
  if (folded === 'pending review') return 'pending_review';
  warnings.push(`Unrecognised warning_status.status: ${JSON.stringify(raw)}`);
  return 'unknown'; // never coerce toward 'reviewed'
}

/**
 * The ONLY other place the contract prescribes trim + case-fold: the F-8 model-use join of
 * `parameter.name` against `top_contributors[].name`. Exact after folding, and nothing looser — no
 * substring match, no slug match, no fuzzy compare. A looser join would claim a parameter is a
 * current score factor on the strength of a shared word.
 */
function foldName(name: string): string {
  return name.trim().toLowerCase();
}

/* ---- composites ------------------------------------------------------------------------------ */

/**
 * `underlying_condition[]` — note the SINGULAR wire key, and note that `catch` is carried through
 * rather than dropped. Reading it is what lets **G-10** ever be answered against stored data; a
 * non-boolean is a warning, not a rejection, because no display decision may depend on it.
 */
function parseCondition(
  entry: unknown,
  at: string,
  warnings: string[],
): Parsed<UnderlyingCondition> {
  if (!isRecord(entry)) return { ok: false, problem: `${at} is not an object` };
  const name = requireString(entry.name, `${at}.name`);
  if (!name.ok) return name;
  if (typeof entry.catch !== 'boolean' && entry.catch !== null && entry.catch !== undefined) {
    warnings.push(`Unrecognised ${at}.catch: ${JSON.stringify(entry.catch)}`);
  }
  // Stored, never used for filtering, sorting or styling until G-10 lands.
  return {
    ok: true,
    value: { name: name.value, catchFlag: entry.catch === true },
  };
}

function parseContributor(
  entry: unknown,
  at: string,
): Parsed<{ name: string; contribution: number }> {
  if (!isRecord(entry)) return { ok: false, problem: `${at} is not an object` };
  const name = requireString(entry.name, `${at}.name`);
  if (!name.ok) return name;
  const contribution = requireFinite(entry.contribution, `${at}.contribution`);
  if (!contribution.ok) return contribution;
  return {
    ok: true,
    value: { name: name.value, contribution: contribution.value },
  };
}

function parseCitation(entry: unknown, at: string): Parsed<{ name: string; claim: string }> {
  if (!isRecord(entry)) return { ok: false, problem: `${at} is not an object` };
  const name = requireString(entry.name, `${at}.name`);
  if (!name.ok) return name;
  const claim = requireString(entry.claim, `${at}.claim`);
  if (!claim.ok) return claim;
  return { ok: true, value: { name: name.value, claim: claim.value } };
}

/**
 * F-10 gives `last_measured` THREE reasons, keyed off `source`, and the reason is what the row
 * renders — so the branch is written here once and no component re-derives it:
 *
 *   `population_reference`    -> `not_applicable`, ALWAYS, and the supplied instant is DROPPED.
 *                                S-14 forbids a last-measured time on a population reference
 *                                outright; a value that arrived anyway is a contradiction, so it
 *                                warns rather than being carried.
 *   supplied but unparseable  -> `invalid` + warning.
 *   absent                    -> `not_provided`, + a warning ONLY on `carried_forward`, where the
 *                                handoff (section 5) requires the retained time and its absence is
 *                                **G-18** / U-12.
 *
 * The fourth `Known<T>` reason, `withheld`, has NO producer here and must not acquire one by
 * inference: it means "the backend held this back", which only an explicit redaction signal can say
 * (**G-06**, **G-23**, both OPEN). Emitting it from a missing field would be the same class of
 * claim as emitting `available` from a `top_contributors` miss.
 */
function parseLastMeasured(
  raw: unknown,
  at: string,
  source: Provenance | null,
  warnings: string[],
): ParameterReading['lastMeasured'] {
  if (source === 'population_reference') {
    if (!isAbsent(raw)) {
      warnings.push(
        `${at}.last_measured supplied on a population_reference row: ${JSON.stringify(raw)}`,
      );
    }
    return { kind: 'unavailable', reason: 'not_applicable' }; // S-14: no time, no age, ever
  }
  if (isAbsent(raw)) {
    if (source === 'carried_forward') {
      warnings.push(`${at}.last_measured is missing on a carried_forward row`); // G-18, U-12
    }
    return { kind: 'unavailable', reason: 'not_provided' };
  }
  const measured = parseInstant(raw, `${at}.last_measured`, warnings, 'expected');
  return measured !== null
    ? { kind: 'value', value: measured }
    : { kind: 'unavailable', reason: 'invalid' };
}

function parseParameter(
  entry: unknown,
  at: string,
  scoreFactors: ReadonlySet<string>,
  warnings: string[],
): Parsed<ParameterReading> {
  if (!isRecord(entry)) return { ok: false, problem: `${at} is not an object` };
  const name = requireString(entry.name, `${at}.name`);
  if (!name.ok) return name;
  const value = requireFinite(entry.value, `${at}.value`);
  if (!value.ok) return value;
  // Read BEFORE `lastMeasured`: the provenance decides which of the three F-10 reasons applies.
  const source = parseProvenance(entry.source, `${at}.source`, warnings);

  const parameter: ParameterReading = {
    name: name.value,
    slug: slugify(name.value),
    value: value.value,
    source,
    // The one field whose absence carries its reason (F-10). `kind: 'unavailable'`, never 'unknown'.
    lastMeasured: parseLastMeasured(entry.last_measured, at, source, warnings),
    // **G-01.** A unit the service supplies, trimmed, or null. A non-string is not coerced: an
    // unlabelled number is recoverable, a wrongly labelled one is not.
    unit: typeof entry.unit === 'string' && entry.unit.trim() !== '' ? entry.unit.trim() : null,
    // Presence in top_contributors is the ONLY evidence of model use, and the join is exact after
    // trim + case-fold (F-8). Absence proves nothing, so it is `unknown` and never `available`.
    //
    // A SOURCE MAY PROVE `score_factor` ON BETTER EVIDENCE THAN A NAME. `feature_name` is a display
    // label, so the fold-and-compare below is a guess dressed as a join. A source that carries a
    // real join key can settle it and say so with `model_use: 'score_factor'`; that is read here and
    // nothing else is. `available` is still never accepted from a source, because proving a
    // parameter is NOT a factor needs the whole attribution vector and every source so far stores a
    // truncated top-N (**G-04**).
    modelUse:
      entry.model_use === 'score_factor' || scoreFactors.has(foldName(name.value))
        ? 'score_factor'
        : 'unknown',
  };
  return { ok: true, value: parameter };
}

/**
 * **G-32**. A count the publisher supplies. Absent is silent: most sources do not have one, and the
 * client-side walk in `heldAtLevel` is the documented fallback. Present-but-unusable warns, because
 * a source that sends the field and gets it wrong is a different fact from one that does not send it.
 */
function parseReadingsInState(raw: unknown, at: string, warnings: string[]): number | null {
  if (isAbsent(raw)) return null;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    warnings.push(`Unrecognised ${at}.readings_in_state: ${JSON.stringify(raw)}`);
    return null;
  }
  return raw;
}

function parseReading(entry: unknown, at: string, warnings: string[]): Parsed<Reading> {
  if (!isRecord(entry)) return { ok: false, problem: `${at} is not an object` };

  const imputedShare = requireFinite(entry.imputed_share, `${at}.imputed_share`);
  if (!imputedShare.ok) return imputedShare;
  const documentationShare = requireFinite(entry.documentation_share, `${at}.documentation_share`);
  if (!documentationShare.ok) return documentationShare;
  const contributors = parseList(
    entry.top_contributors,
    `${at}.top_contributors`,
    parseContributor,
  );
  if (!contributors.ok) return contributors;
  // Folded once, here, so the F-8 join is trim + case-fold on BOTH sides of the comparison.
  const scoreFactors = new Set(contributors.value.map((c) => foldName(c.name)));
  const parameters = parseList(entry.parameters, `${at}.parameters`, (e, p) =>
    parseParameter(e, p, scoreFactors, warnings),
  );
  if (!parameters.ok) return parameters;

  // G-03: two parameters in ONE reading whose names slugify identically. The URL could then not
  // address them apart. Surfaced as an integrity warning (U-12) and never disambiguated by guessing.
  for (const slug of slugCollisions(parameters.value.map((p) => p.name))) {
    warnings.push(`Colliding parameter slug in ${at}.parameters: "${slug}"`);
  }

  const explanation = nullableString(entry.explanation, `${at}.explanation`);
  if (!explanation.ok) return explanation;

  let citations: ReadonlyArray<{ name: string; claim: string }> | null = null;
  if (entry.citations !== null && entry.citations !== undefined) {
    const parsed = parseList(entry.citations, `${at}.citations`, parseCitation);
    if (!parsed.ok) return parsed;
    citations = parsed.value;
  }

  // Read BEFORE the score and the level, because it decides whether their ABSENCE is a defect or
  // the contract being honoured. Parsed once and reused, never parsed twice.
  const sufficiency = parseSufficiency(entry.sufficient_data, at, warnings);
  const refused = sufficiency === 'insufficient';

  const reading: Reading = {
    // 'warn': F-1 step 2 — a reading with no usable charttime drops out of latest-selection
    // entirely, so its absence has to be visible rather than inferred from a short chart.
    charttime: parseInstant(entry.charttime, `${at}.charttime`, warnings, 'warn'),
    riskScore: parseScore(entry.risk_score, at, refused, warnings),
    riskLevel: parseRiskLevel(entry.risk_level, at, refused, warnings),
    sufficientData: sufficiency,
    imputedShare: imputedShare.value,
    documentationShare: documentationShare.value,
    topContributors: contributors.value,
    parameters: parameters.value,
    explanation: explanation.value,
    citations,
    // 'expected': a reading that has never been reviewed legitimately has no review time, so
    // absence is not a contradiction. An unparseable one still warns.
    reviewAt: parseInstant(entry.review_at, `${at}.review_at`, warnings, 'expected'),
    // Absent is the normal case for every source that does not publish it, so absence is silent.
    // A present but non-finite value is a real contradiction and warns.
    readingsInState: parseReadingsInState(entry.readings_in_state, at, warnings),
  };
  return { ok: true, value: reading };
}

/* ---- the snapshot ---------------------------------------------------------------------------- */

export function parsePatientSnapshot(raw: unknown): Parsed<PatientSnapshot> {
  if (!isRecord(raw)) return { ok: false, problem: 'Response was not an object' };
  const warnings: string[] = [];

  const patientId = requireString(raw.patient_id, 'patient_id');
  if (!patientId.ok) return patientId;
  // Bed identity and the prompt address. Trim-only, exactly as `weight`/`height` are, and NULLABLE:
  // a source that does not carry them is not a malformed source, and dropping a patient off the
  // board for want of a bed number would be a far worse failure than showing one without it.
  const bedCode = trimmedNullableString(raw.bed_code, 'bed_code');
  if (!bedCode.ok) return bedCode;
  const careUnit = trimmedNullableString(raw.unit, 'unit');
  if (!careUnit.ok) return careUnit;
  const promptId = trimmedNullableString(raw.prompt_id, 'prompt_id');
  if (!promptId.ok) return promptId;
  const age = requireFinite(raw.age, 'age');
  if (!age.ok) return age;
  const gender = requireString(raw.gender, 'gender');
  if (!gender.ok) return gender;
  const race = requireString(raw.race, 'race');
  if (!race.ok) return race;
  // Trim is the ONLY normalization section 2.3 allows on these two (G-19). `gender` and `race`
  // above go through `requireString`, which trims nothing: 2.3 says verbatim free text.
  const weight = trimmedNullableString(raw.weight, 'weight');
  if (!weight.ok) return weight;
  const height = trimmedNullableString(raw.height, 'height');
  if (!height.ok) return height;
  // SINGULAR: `docs/patientSchema.js` declares `underlying_condition: [{ name, catch }]`. The plural
  // spelling matches nothing, so every patient would fail validation and land on U-21.
  const conditions = parseList(raw.underlying_condition, 'underlying_condition', (e, at) =>
    parseCondition(e, at, warnings),
  );
  if (!conditions.ok) return conditions;
  const readings = parseList(raw.readings, 'readings', (e, at) => parseReading(e, at, warnings));
  if (!readings.ok) return readings;

  // F-1 step 4. THIS is where the U-12 collision warning is raised: the only place that sees the
  // whole readings array and owns `integrityWarnings`. The ordering helper decides WHICH of the two
  // colliding readings wins — later in the source array — and never dedupes.
  const seenInstants = new Set<number>();
  for (const reading of readings.value) {
    if (reading.charttime === null) continue;
    const instant = reading.charttime.getTime();
    if (seenInstants.has(instant)) {
      warnings.push(`Colliding charttime: ${reading.charttime.toISOString()}`); // U-12
    }
    seenInstants.add(instant);
  }

  const warningStatus = raw.warning_status;
  if (!isAbsent(warningStatus) && !isRecord(warningStatus)) {
    warnings.push('warning_status was present but not an object');
  }

  // Assembled member by member, annotated, and NOT asserted. Every member of PatientSnapshot
  // appears here or this line does not compile.
  const value: PatientSnapshot = {
    patientId: patientId.value,
    bedCode: bedCode.value,
    careUnit: careUnit.value,
    promptId: promptId.value,
    age: age.value,
    gender: gender.value,
    weight: weight.value,
    height: height.value,
    race: race.value,
    reviewStatus: toReviewStatus(isRecord(warningStatus) ? warningStatus.status : null, warnings),
    underlyingConditions: conditions.value,
    readings: readings.value,
    integrityWarnings: warnings,
  };
  return { ok: true, value };
}

/**
 * The board payload. Every element goes through the SAME validator — a list is not a lighter
 * contract than a detail response. A structurally invalid element is fatal for the whole payload
 * (state U-21) and is named by index, because silently skipping it would hide a patient from the
 * board: `.filter(Boolean)`, `try/catch` per element, and "drop the bad ones" are all forbidden. A
 * single bad FIELD is a different thing entirely — non-fatal, an integrity warning, and the patient
 * still reaches the board.
 */
export function parsePatientList(raw: unknown): Parsed<readonly PatientSnapshot[]> {
  if (!Array.isArray(raw)) return { ok: false, problem: 'Patient list was not an array' };
  const entries: readonly unknown[] = raw;
  const out: PatientSnapshot[] = [];
  for (const [i, entry] of entries.entries()) {
    const parsed = parsePatientSnapshot(entry);
    if (!parsed.ok) return { ok: false, problem: `patients[${i}]: ${parsed.problem}` };
    out.push(parsed.value);
  }
  return { ok: true, value: out };
}
