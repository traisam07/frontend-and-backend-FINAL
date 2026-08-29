# PulseMind — Data Contract

Strict TypeScript types for the patient payload, the normalization/adapter rules that turn wire data
into a view model, and the derived-value computations the screens depend on.

**Companions.** `docs/spec/screens.md` (what renders where), `docs/spec/ui-states.md` (state matrix),
`docs/spec/open-questions.md` (every `G-*` id referenced below).

---

## 0. Status of `docs/patientSchema.js`

`docs/patientSchema.js` is a **pseudo-schema sketch, not runnable code and not the source of truth for
casing or requiredness**. It is Mongoose-flavoured and contains syntax errors:

| Defect in the file | What it should be |
|---|---|
| `;` used as the field separator inside object literals | `,` |
| `require: true` | `required: true` |
| TS-style union literals written with `\|\|` (`"Reviewed" \|\| "Pending Review" \|\| null`) | a discriminated union of string literals |
| missing `,` after the `underlying_condition` field | `,` |
| `catch` used as a field name | `catch` is a JS reserved word; almost certainly a placeholder (**G-10**). The wire key stays `catch` (section 1.3); the domain member is `catchFlag` (`.claude/skills/svelte5-runes/references/patterns.md` section 1) |

Consequences that must be respected:

1. **Casing on the wire is the schema's casing, not the handoff's prose.** The schema writes
   `"Pending Review"` (title case, with a space). The handoff prose writes "Pending review". Both are
   real; they live in different layers. Normalize in the adapter (section 2.2). (**G-09**)
2. **Requiredness is largely unknown.** Only `patient_id`, `age`, `gender`, `race` carry
   `require: true`; `weight` and `height` carry `require: false`; **every other field carries no
   requiredness flag at all** (**G-31**). Treat every unmarked field as possibly absent and validate
   it.
3. **Types are not to be "improved".** `weight` and `height` are declared `String`, not `Number`
   (**G-19**). Render them verbatim.
4. **Wire key spelling is exact, and one array key is singular.** The comorbidity array is
   `underlying_condition`, **not** `underlying_conditions`, even though it holds a list. Copy every
   key from `docs/patientSchema.js`, never from memory or from prose: a one-character key drift is
   invisible in review, always `undefined` at runtime, and turns a validator into a machine that
   rejects every patient (`U-21`).

5. **A live Mongoose model now also exists and differs from this sketch.** `back-end/model/Patient.js`
   is what the three endpoints in section 4.1 actually read through, and `back-end/model/patientSchema.js`
   is a **character-for-character copy of the sketch that differs only in line endings** — the `docs/`
   original is CRLF, the `back-end/` copy is LF, so the two files are not byte-identical and their
   checksums differ. Which one governs the wire contract is **G-48**; the
   enumerated differences, and what each one does to the types above, are **section 4.5**. Nothing in
   sections 1–3 is relaxed on the strength of the live model while that row is open, and nothing under
   `back-end/` is edited to close the gap.

---

## 1. Strict TypeScript types

**Which file each block below defines.** Sections 1.2–1.5 are the **validated wire layer**, and they
live in `src/lib/data/wire.ts`: snake_case members spelled exactly as `docs/patientSchema.js` spells
them, ISO-8601 strings rather than `Date`s, and every entity name prefixed `Wire` so it cannot
collide with its domain counterpart. The **domain layer** — camelCase, real `Date` objects,
`PatientSnapshot` / `PatientSummary` / `Reading` / `ParameterReading` / `UnderlyingCondition` — is
`src/lib/domain/types.ts`, and it is declared **only** in
`.claude/skills/svelte5-runes/references/patterns.md` section 1. This file never redeclares it.
Section 1.6 is the short list of domain/view-model types this document owns (`ModelUse`, `Known<T>`,
`RankKey`); patterns.md mirrors them with a pointer back here. The parse result is `Parsed<T>`,
declared once in `src/lib/data/validate.ts` (patterns.md section 1) — there is no `ParseResult`.

### 1.1 Boundary rule (mandatory)

The API response is **untrusted**. It must pass through runtime validation before becoming a
`PatientSnapshot`. The validator reads the wire keys of sections 1.2–1.5 and returns a domain
snapshot; nothing between the two layers is a cast.

| WRONG | RIGHT |
|---|---|
| `const p = (await res.json()) as PatientSnapshot;` | `const parsed = parsePatientSnapshot(await res.json()); if (!parsed.ok) { /* U-21 state */ }` |
| `risk_level ?? 'Low'` | absence is state `S-05`, with its own visible treatment |
| `risk_score ?? 0` | absence is state `S-35`, with its own explicit "score unavailable" render |
| `sorted.at(-1)!` | `sorted.at(-1) ?? null`, then branch: `null` is state `U-11` |
| `reading.charttime!` / `p.readings[0]!` | a guard that narrows, so the compiler keeps the absent case reachable |
| `catch (e) { patients = []; }` | every failure resolves to a named visible state (`U-04`) |

A cast turns a missing `risk_level` into a silently-undefined chip. Validation failure is a **UI
state** (`U-21`, `U-04`, `U-10`, `U-12`), never a default value.

`as` and `!` are the same defect wearing two hats: both tell the compiler to stop checking exactly
where the data stopped promising. Neither appears anywhere in this file's RIGHT column, and neither
may appear over wire data, over a validated `PatientSnapshot`, or over an array index / `.at()` /
`.find()` result. The tsconfig runs `"strict": true` with `"noUncheckedIndexedAccess": true`, and no snippet
may relax either flag to compile.

### 1.2 Primitives and literal unions

```ts
// src/lib/data/wire.ts
// `RiskLevel`, `Sufficiency` and `Provenance` are the SAME closed literal sets on both sides of the
// boundary, so they are declared once — in the domain module, patterns.md section 1 — and imported
// here rather than re-spelled under a second name. There is no `SufficientData` and no
// `ParameterSource`.
import type { Provenance, RiskLevel, Sufficiency } from '$lib/domain/types';

/** ISO-8601 instant exactly as delivered on the wire. Converted to Date only inside the adapter. */
export type IsoDateTime = string;

/**
 * Wire spelling of the review status. NOTE the title case and the space: "Pending Review".
 * The domain union is `ReviewStatus` (`'reviewed' | 'pending_review' | 'unknown'`); the mapping,
 * including the `null` third state, is section 2.2.
 */
export type WireReviewStatus = 'Reviewed' | 'Pending Review';
```

### 1.3 Leaf entities

```ts
export interface WireContributor {
  name: string;
  /**
   * Unit, scale, and sign semantics are UNSPECIFIED (G-24).
   * Do NOT Math.abs() it. Do NOT re-normalise contributions to sum to 100 %.
   * A negative contribution may be protective; rendering it as a large positive bar
   * inverts its clinical meaning.
   */
  contribution: number;
}

/** warning_status.flags[] — present in the schema, referenced nowhere in the handoff (G-14). */
export interface WireFlag {
  top_contributors: WireContributor[];
  flag_when: IsoDateTime;
}

export interface WireWarningStatus {
  /** null is a real, reachable third state the handoff never describes (G-09, state S-09). */
  status: WireReviewStatus | null;
  flags: WireFlag[];
}

/**
 * Wire shape is `underlying_condition: [{ name, catch }]` — note the **singular** wire key
 * `underlying_condition` (docs/patientSchema.js line 37). There is no `underlying_conditions`;
 * reading the plural spelling makes every patient fail validation (state `U-21`).
 */
export interface WireUnderlyingCondition {
  name: string;
  /**
   * The wire key is `catch` — legal as a property name, illegal as an identifier, so the domain
   * member is `catchFlag` (`patterns.md` section 1, G-10). The field's meaning is unclear — likely
   * `active` or `flagged`. Read it, store it, use it for NOTHING: it MUST NOT drive filtering,
   * sorting, or styling, and every comorbidity is displayed regardless of its value (F-13).
   */
  catch: boolean;
}

export interface WireParameterReading {
  name: string;
  value: number;
  /**
   * null when the wire omitted `source` or delivered a value outside the three literals.
   * null routes to state `S-15`, badge literal `Provenance unknown` (section 2.3). NEVER defaulted
   * to `measured`: asserting that an unknown-provenance value was measured on this patient is the
   * exact claim the data cannot support.
   */
  source: Provenance | null;
  /**
   * Meaningless for `population_reference`.
   * Expected present for `carried_forward` — the handoff requires the last-measured time to be
   * retained (Handoff section 5). Modelled nullable because the wire may omit it (G-18);
   * null on a carried_forward row is an integrity warning, not a blank cell.
   * This is the one field whose absence is rendered WITH ITS REASON, so the domain member is
   * `lastMeasured: Known<Date>` (section 1.6, `patterns.md` section 1) rather than a bare null.
   */
  last_measured: IsoDateTime | null;
}

export interface WireCitation {
  name: string;
  claim: string;
  // No url / doi / version / publication date on the wire (G-17). Render as plain text, unlinked.
}
```

### 1.4 `WireReading` and `WirePatient`

```ts
export interface WireReading {
  /**
   * null when the wire omitted `charttime` or delivered a value that does not parse.
   * A null charttime EXCLUDES the reading from latest-selection (F-1) and raises an
   * `IntegrityWarning`; zero usable readings is state `U-11`, a collision is `U-12`.
   * It is never a fallback, never `new Date()`, never the epoch.
   */
  charttime: IsoDateTime | null;
  /** Scale UNCONFIRMED: fraction 0–1 vs percent 0–100 (G-11). Do not format as % (see F-7). */
  imputed_share: number;
  /** Scale UNCONFIRMED. Same treatment as imputed_share. */
  documentation_share: number;
  /**
   * null when the wire omitted the field or delivered a value outside the two literals.
   * null is NOT `sufficient` for any gating decision (section 2.3, F-6) and renders the unknown
   * data-sufficiency treatment (state `S-10`). NEVER defaulted to `sufficient`.
   */
  sufficient_data: Sufficiency | null;
  /**
   * Range and scale UNCONFIRMED (G-12). Never map score -> level client-side.
   * null when the wire omitted the field or delivered a non-finite number: absence routes to state
   * `S-35` "score unavailable" (section 2.3), keeps the patient on the board, and sorts after every
   * present score (screens.md K3). Absence is NEVER fatal — a patient is not dropped over one bad
   * field (section 2.4). NEVER `risk_score ?? 0` — `0` is a legible clinical claim.
   */
  risk_score: number | null;
  /**
   * null when the wire omitted `risk_level` or delivered a value outside the four literals.
   * null routes to state `S-05` "Risk level unavailable" (section 2.3) and to riskRank 4
   * (screens.md K2). NEVER defaulted to `Low` — see the rationale below this block.
   */
  risk_level: RiskLevel | null;
  /** Nullable: a reading that has not been reviewed has no review time. */
  review_at: IsoDateTime | null;
  /** Ranked factors for THIS reading. Distinct from WireWarningStatus.flags[].top_contributors. */
  top_contributors: WireContributor[];
  parameters: WireParameterReading[];
  /**
   * null when withheld (e.g. insufficient data) AND null when simply not generated. The two are
   * different states with different copy: `sufficient_data === 'insufficient'` or `null` is state
   * `S-10` (`Explanation withheld` / `Explanation withheld — data sufficiency unknown`), while
   * `sufficient` plus a null explanation is state `S-37` (`Explanation not supplied`). Which one
   * the backend means is **G-16**. Never render a placeholder narrative.
   */
  explanation: string | null;
  /** null when withheld. `[]` and `null` are both "no references"; neither may be faked. */
  citations: WireCitation[] | null;
}

export interface WirePatient {
  patient_id: string;            // schema: required
  age: number;                   // schema: required
  gender: string;                // schema: required, free text — display verbatim (G-20)
  /** schema: NOT required, and typed String, not Number. Units unknown — do not parse (G-19). */
  weight: string | null;
  /** schema: NOT required, and typed String, not Number. Units unknown — do not parse (G-19). */
  height: string | null;
  race: string;                  // schema: required, free text — display verbatim (G-20)
  warning_status: WireWarningStatus;
  underlying_condition: WireUnderlyingCondition[];
  readings: WireReading[];
}
```

**Why these five fields are nullable *after* validation (`charttime`, `sufficient_data`,
`risk_score`, `risk_level`, `WireParameterReading.source`).** Section 2.4 forbids dropping a patient
because one field failed validation, and section 2.3 says an unrecognised `risk_level` becomes
`null` plus an integrity warning and renders state `S-05`. A non-nullable `risk_level: RiskLevel`
makes that combination impossible to express: `parsePatientSnapshot` could only return a snapshot
whose latest reading carries one of the four literals, so it would have to either reject the whole
patient — which the file's own rule forbids — or manufacture a value, which is the
`risk_level ?? 'Low'` this harness bans in nine other places. Modelling the absence in the type is
what makes the compiler, not a reviewer's memory, the thing that forces the
`S-05` / `S-10` / `S-15` / `S-35` / `U-11` branch — five nullable fields, five named states, one
branch each. The type is the enforcement mechanism; every one of these nulls is a **named UI
state**, never a hole to be plugged with a default. The same five stay nullable on the domain side
(`patterns.md` section 1), because a bare `| null` under `strict` already forces the renderer to
branch; `Known<T>` (section 1.6) is reserved for the fields whose *reason* for being absent is
itself rendered.

### 1.5 Integrity records

The validator's input is `unknown` and it narrows with a type predicate, so there is no
pre-validation interface to declare here: a `Record<string, unknown>` shape would only invite the
`as` that section 1.1 bans. What the wire module does own is the record shape of an integrity
finding.

```ts
// src/lib/data/wire.ts (continued)
export interface IntegrityWarning { path: string; code: string; detail: string; }
export interface IntegrityError   { path: string; code: string; detail: string; }
```

`IntegrityWarning`s are non-fatal contradictions that must still reach the screen as state `U-12`.
`IntegrityError`s are fatal for that entity and route to `U-21` / `U-04`.

The parse **result** is not declared here. `Parsed<T>` is declared once, in `src/lib/data/validate.ts`
(`patterns.md` section 1):

```ts
// EXCERPT of src/lib/data/validate.ts — canonical declaration:
// .claude/skills/svelte5-runes/references/patterns.md section 1.
// Shown here so the wire layer's failure shape is legible in one place; it is a pointer, not a
// second declaration, and `Parsed<T>` stays on the `$lib/data/validate` row of the declaring-file
// register (`.claude/skills/bootstrap/SKILL.md` section 4).
export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; problem: string };
```

The two shapes above are the records the validator builds internally; what crosses the module
boundary is their rendered text — `problem` on a fatal failure, and
`PatientSnapshot.integrityWarnings: readonly string[]` for everything non-fatal. One parse-result
type, one place it is declared, and no `ParseResult` anywhere.

### 1.6 Normalized domain / view-model types (adapter output)

These live in `src/lib/domain/types.ts` with the rest of the domain layer, and they are the three
members of that module this document declares; every other domain type —
`ReviewStatus` (**not** `ReviewState`), `Provenance`, `Sufficiency`, `Reading`, `ParameterReading`,
`PatientSnapshot`, `PatientSummary`, `ParameterRowVm`, `ChartPoint` — is declared in
`.claude/skills/svelte5-runes/references/patterns.md` section 1, which mirrors `ModelUse` and
`Known<T>` with a pointer back here (`RankKey` is written out only here — no snippet in that file
uses it). They carry the derived values from section 3 and make an absence an **explicit,
first-class value** rather than a hole.

```ts
// src/lib/domain/types.ts — declared here, imported from `$lib/domain/types` like the rest
/**
 * CANONICAL three-member union — every other file widens to match this one.
 * The parser only ever emits `score_factor` or `unknown`; `available` is reachable solely from an
 * explicit backend flag and is NEVER inferred from a `top_contributors` miss (F-8, states S-27,
 * S-28, S-29). Dropping `available` from the type would delete the S-28 branch, so it stays.
 */
export type ModelUse = 'score_factor' | 'available' | 'unknown';

/**
 * The ONE absence wrapper in the harness, for a value whose REASON for being absent is rendered.
 * `kind: 'unavailable'` is the discriminant everywhere a discriminated absence appears — never
 * `'unknown'`, which is a `ReviewStatus` member (a state, not an absence) and nothing else.
 * There is no `Maybe<T>`.
 */
export type Known<T> =
  | { kind: 'value'; value: T }
  | { kind: 'unavailable'; reason: 'not_provided' | 'not_applicable' | 'invalid' | 'withheld' };

export interface RankKey {
  patientId: string;
  reviewRank: 0 | 1 | 2;
  riskRank: 0 | 1 | 2 | 3 | 4;
  riskScore: number | null;
  latestCharttimeMs: number | null;
}
```

Rule: **no clinical field in the view model is a bare optional** — never `field?: T`, never
`T | undefined`. Absence is written one of exactly two ways, and both force the renderer to branch:

| Write | When | Example |
|---|---|---|
| `T \| null` | the default for a domain or view-model field. Under `strict` a nullable already makes the branch unavoidable, and the state it maps to is named in `docs/spec/ui-states.md`. | `riskLevel: RiskLevel \| null` (`S-05`), `riskScore: number \| null` (`S-35`), `sufficientData: Sufficiency \| null` (`S-10`), `latestChartTime: Date \| null` (`U-11`) |
| `Known<T>` | **only** where the UI renders the *reason* for the absence, not merely the fact of it. | `lastMeasured: Known<Date>` — F-10 renders "last measured time unknown" for an invalid instant, nothing at all for `not_applicable` on a population reference, and an integrity warning for a `carried_forward` row that lost its time |

So `PatientSummary` and `ParameterRowVm` (`patterns.md` section 1) are bare-nullable by design and
must not be widened to `Known<T>`; `lastMeasured` is the one field that carries its reason.

### 1.7 Exhaustiveness

Every union above is closed. Switch over them with a `never`-typed default so a fourth case cannot
appear silently:

```ts
// EXCERPT of src/lib/domain/derive.ts — canonical declaration:
// .claude/skills/svelte5-runes/references/patterns.md sections 1 and 2.
// Reproduced here only to show the never-typed default; it is not a second declaration.
function reviewLabel(state: ReviewStatus): string {
  switch (state) {
    case 'pending_review': return 'Pending review';
    case 'reviewed':       return 'Reviewed';
    case 'unknown':        return 'Review status unavailable';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
```

---

## 2. Adapter and normalization rules

The adapter is the only place that touches wire shapes. Components never see a `Wire*` type.

### 2.1 Order of operations

```
raw JSON (untrusted `unknown`)
  -> validate + normalize (runtime, strict) -> Parsed<PatientSnapshot>
     reading the wire keys of sections         (src/lib/data/validate.ts; casing and nullability
     1.2-1.5, src/lib/data/wire.ts             land in the same pass, warnings ride along on
                                               PatientSnapshot.integrityWarnings)
  -> derive (section 3)                     -> PatientSummary / ParameterRowVm / ChartPoint
  -> rank / filter (screens.md section 6)   -> board
```

The board projection is `toPatientSummary(snapshot)` (`patterns.md` section 2), built on the F-1
latest reading. There is no `PatientViewModel`.

Derivation never happens inside a component. Ranking, filtering, windowing, held-at-level counting,
and provenance classification live in effect-free modules and are unit-tested there.

### 2.2 Review state normalization

| Wire value | Normalized `ReviewStatus` | Display label `[HARNESS]` |
|---|---|---|
| `"Pending Review"` (any casing/spacing after trim + case-fold) | `pending_review` | `Pending review` |
| `"Reviewed"` (any casing after trim + case-fold) | `reviewed` | `Reviewed` |
| `null` or absent | `unknown` | `Review status unavailable` |
| any other string | `unknown` **plus an `IntegrityWarning`** | `Review status unavailable` |

| WRONG | RIGHT |
|---|---|
| `status === 'Reviewed' ? 'reviewed' : 'pending_review'` | three-way normalization; `null` is a real state |
| coercing an unrecognised string to `reviewed` | `unknown` + integrity warning — coercing toward Reviewed can hide an unreviewed patient |
| coercing an unrecognised string to `pending_review` | same; do not guess in either direction |

### 2.3 Other normalizations

| Field | Rule |
|---|---|
| `weight`, `height` | Keep as delivered strings. Trim only. Never parse to a number, never append `kg` / `cm` (**G-19**). |
| `gender`, `race` | Verbatim, free text (**G-20**). No mapping table, no title-casing. |
| `charttime`, `review_at`, `flag_when` | Parse to a `Date` **inside the adapter only**. Absent or unparseable -> `null` on the domain field (`Reading.charttime` is `Date \| null`; the wire member is `IsoDateTime \| null`) + integrity warning. Never `new Date(undefined)`. A `null` `charttime` excludes the reading from latest-selection (F-1). |
| `last_measured` | Same parse, but the domain member is `lastMeasured: Known<Date>` (section 1.6) because F-10 renders the *reason*: absent -> `{ kind: 'unavailable', reason: 'not_provided' }`, present but unparseable -> `reason: 'invalid'` + integrity warning, `population_reference` -> `reason: 'not_applicable'`. |
| `risk_level` | Accept only the four literals. Anything else (absent, wrong case, unknown string) -> `null` on `WireReading.risk_level` / `Reading.riskLevel` + integrity warning, state `S-05`. Never default to `Low`. |
| `sufficient_data` | Accept only the two literals. Anything else -> `null` on `WireReading.sufficient_data` / `Reading.sufficientData` + integrity warning; treat as **not** `sufficient` for gating purposes and render the unknown treatment (state `S-10`). Never default to `sufficient`. |
| `risk_score` | Accept only a finite number. Absent, non-numeric, `NaN` or `Infinity` -> `null` + integrity warning, **non-fatal**: the patient is still returned and still appears on the board (section 2.4). Rendered as state `S-35` "score unavailable" and sorted after every present score. Never `?? 0`. |
| `source` | Accept only the three literals. Anything else -> `null` on `WireParameterReading.source` / `ParameterReading.source` + integrity warning, state `S-15`, whose badge literal is `Provenance unknown`. Never default to `measured`. |
| `underlying_condition[]` | The wire key is **singular** (`underlying_condition`, schema line 37). Never read `underlying_conditions` — the plural does not exist on the wire, so the array check fails and every patient lands on `U-21`. |
| `underlying_condition[].catch` | Carry it through to the domain member `catchFlag` (`catch` is a JS reserved word). Read it, store it, **use it for nothing** (**G-10**). Never drop it on the floor: G-10 cannot be answered against data the adapter discarded. |
| `imputed_share`, `documentation_share` | Pass through raw plus `scaleUnknown: true` (see F-7). Never multiply, never clamp. |

### 2.4 Never do this in the adapter

- Do not fill a missing parameter from an older reading (that is a second, invisible carry-forward).
- Do not dedupe colliding `charttime`s silently.
- Do not clamp an out-of-range share into range.
- Do not pick a winner between `warning_status.status` and `readings[].review_at`.
- Do not drop a patient from the list because one of its fields failed validation — surface it.

---

## 3. Derived-data rules

Each rule is written so two independent implementations produce identical output.

### F-1. Latest reading selection (prerequisite for almost everything)

1. `readings` array order is **not** guaranteed by the schema (**G-25**).
2. Parse each `charttime`. A reading whose `charttime` is missing or unparseable — after validation
   that is `charttime === null` (section 1.4) — is **excluded from latest-selection** and raises an
   `IntegrityWarning`. It is never used as a fallback.
3. Sort the remaining readings **ascending** by `charttime`. The latest reading is the last element.
4. Exact `charttime` collision: keep the one appearing **later in the source array** and raise an
   `IntegrityWarning` (state `U-12`). Never merge two readings. Break the tie **on the source
   index**, explicitly — `toSorted` is stable, so a comparator that returns `0` for equal instants
   keeps the *earlier* one, which is the opposite of this rule. The warning is raised in
   `parsePatientSnapshot` (`patterns.md` section 1), the one place that sees the whole `readings`
   array and owns `integrityWarnings`; the ordering helper only has to be deterministic.
5. Zero usable readings -> state `U-11`, whose literal is `No assessment available for this patient`
   (no trailing period) on PD-2 and the `NO_CURRENT_READING` path. The OV-4 card's **time slot** is a
   separate state for the same cause, `U-22`, with its own literal
   `No reading with a usable timestamp. The assessment time is unavailable.` — the two are never
   interchanged (`ui-states.md` section 3 rule 14). Never `readings[0]`, never `readings.at(-1)` on
   an unsorted array, never a synthesized zero-score reading.

The canonical implementation is `orderByChartTimeAsc` / `latestReading` in
`.claude/skills/svelte5-runes/references/patterns.md` section 2, over the domain `Reading` type.
The shape of it, and the four ways to get it wrong:

```ts
// WRONG — unsorted index access
const latest = patient.readings[0];
// WRONG — unsorted array
const latest = patient.readings.at(-1);
// WRONG — `!` asserts a value the data does not promise; the harness bans non-null assertions
const latest = [...usable].sort((a, b) => ms(a.charttime) - ms(b.charttime)).at(-1)!;
// WRONG — relies on sort stability for the F-1.4 tie-break, and stability keeps the EARLIER
// reading. On colliding charttimes this renders a different reading than the one specified.
const latest = usable.toSorted((a, b) => a.charttime.getTime() - b.charttime.getTime()).at(-1);

// RIGHT
// EXCERPT of src/lib/domain/window.ts / src/lib/domain/derive.ts — canonical declaration:
// .claude/skills/svelte5-runes/references/patterns.md section 2 (`orderByChartTimeAsc`,
// `latestReading`). The lines below are the rule made concrete, not a second implementation.
/** A reading we are allowed to sort: charttime present AND parseable (`TimedReading`). */
type TimedReading = Reading & { charttime: Date };

const sorted = patient.readings
  .map((reading, sourceIndex) => ({ reading, sourceIndex }))
  .filter((r): r is { reading: TimedReading; sourceIndex: number } => r.reading.charttime !== null)
  // Ascending by instant, then by SOURCE INDEX, so an exact collision puts the later-in-source
  // reading last and `.at(-1)` returns it — F-1 step 4, not a property of the sort algorithm.
  .toSorted(
    (a, b) =>
      a.reading.charttime.getTime() - b.reading.charttime.getTime() || a.sourceIndex - b.sourceIndex
  )
  .map((r) => r.reading);

// `.at(-1)` returns `TimedReading | undefined` by definition, and `sorted[sorted.length - 1]` is
// likewise `| undefined` under noUncheckedIndexedAccess. Coalesce to null and branch on it.
// null here is state U-11 — an explicit, rendered state, never a default value and never a
// synthesized reading. Downstream code must branch on it, not `?? something`.
const latest: TimedReading | null = sorted.at(-1) ?? null; // null -> U-11
```

Note the narrowing predicate. `charttime` is nullable (section 1.4 on the wire, `Date | null` on the
domain type), so a plain `filter(...)` leaves the element type nullable and the comparator will not
compile; the type predicate is what proves to the compiler that every sorted element has a real
instant. Do not reach for `!` or `as` to make the sort compile — under
`"strict": true` + `"noUncheckedIndexedAccess": true` those two operators are exactly how the
`U-11` branch gets deleted by accident.

### F-2. Risk history window, 24 hours (PD-4, OV-5)

⚠️ **The width was 60 minutes until 2026-08-28.** It is one constant, `RISK_WINDOW_MINUTES` in
`$lib/domain/window`, and every rendered string reads it rather than spelling a duration of its own.

The live PulseMind pipeline advances the ward one HOUR per reading, and that interval is not
adjustable: the band table's dwell clock is denominated on the same grid, its demote dwell is 120
minutes, and the published band trajectory was verified against it. A 60-minute window therefore
admitted the latest reading and, at the boundary, one more. A section the handoff names on two
screens plotted a single line segment and otherwise rendered its insufficient-history literal, on
every patient, permanently.

The fixture set is unaffected in behaviour: its patients carry 2 to 5 readings with every gap under
an hour, so the same points plot at either width. Only the rendered literal changed there.

- **Anchor** = the latest reading's `charttime`, **not** the browser wall clock. Anchoring on the
  wall clock would silently empty the chart when data is stale, which reads as "nothing happening".
  `[HARNESS]` The anchor comes from the F-1 `latest`; when `latest` is `null` there is no anchor and
  no chart — render `U-11`, never fall back to `Date.now()`.
- **Window** = `[anchor − 3_600_000 ms, anchor]`, inclusive at both ends.
- **Series** = readings in the window, ascending by `charttime`, each contributing
  `{ t: charttime, score: risk_score, level: risk_level, sufficient: sufficient_data }`. Only
  readings that survive the F-1 `TimedReading` filter can be in the window — a `null` `charttime`
  has no position on the axis. The canonical `windowOf` helper (`patterns.md` section 2) returns
  this series **already ascending**; nothing downstream reverses it. `score`, `level` and `sufficient` are each nullable (section 1.4):
  a point with `score === null` is **omitted from the plotted line and listed in the data table as
  "score unavailable"** (state `S-35`), and a point with `level === null` carries the `S-05` treatment in the
  tooltip and table. Never plot a null as `0`, and never interpolate across it.
- Always render **"as of `<absolute charttime>` (`<age> relative to the wall clock`)"** beside the
  chart, so staleness is legible without inventing a staleness threshold (`U-14`, **G-13**).
- **Never interpolate, extrapolate, smooth, or forecast.** No trend line, no moving average, no
  projection past the last point.
- Gaps `[HARNESS]`: a gap larger than 2x the median inter-reading interval renders as a **visible
  break**, not as a straight connecting segment.
- Fewer than two points in the window -> explicit "insufficient history for a 24-hour view". Never
  draw a single point as a flat line.
- Points whose reading is `insufficient` are marked distinctly in the series `[HARNESS]`.
- ~~The y-axis domain is **not** fixed to 0–100.~~ **OVERRIDDEN 2026-08-23** on the product owner's
  explicit, twice-given word: the domain IS fixed to 0–100 (`RISK_SCORE_DOMAIN`), and MED/HIGH/CRIT
  reference lines are drawn from `RISK_THRESHOLDS`, both in `front-end/src/lib/domain/derive.ts`.
  **G-12 is still OPEN and this does not answer it** — see that row in
  `docs/spec/open-questions.md` for the full record, including that the three threshold values were
  read off a wireframe's pixel positions rather than supplied as figures. The ban this line used to
  state still holds everywhere else: `risk_level` is **never** derived from `risk_score`, on this
  chart or any other surface.
- Timezone for all rendering is a single explicit, labelled zone — which one is **G-21**.

### F-3. "Readings held at this level" (PD-6)

Not in the schema. Derived from consecutive `readings[].risk_level`. The slot is state `S-38` in
`docs/spec/ui-states.md`, which carries all three of its mandated literals; this section is the
derivation, that row is the copy.

1. Take the **full** readings array ascending by `charttime` (F-1), not the risk-history window.
2. Let `L = latest.risk_level`. **`L` is `RiskLevel | null`, so test it first: if `L === null` the
   result is `unavailable` and the walk never starts** (step 4). Otherwise walk **backwards** from
   the latest reading, counting while `risk_level === L`. Stop at the first different or missing
   level. The result is always >= 1.
3. **Truncation honesty `[HARNESS]`:** if the run reaches the **first** returned reading, the true
   run may be longer than what was delivered. Display `≥ N readings at this level` in that case, and
   `N readings at this level` otherwise. The glyph is `≥` (U+2265); the ASCII form `>= N` is a
   **retired spelling** (`ui-states.md` section 4) and must not reappear in a document, a component,
   or a test. Never present a truncated count as complete (**G-32**).
4. If `risk_level` is missing on the latest reading, the count is `unavailable` and the slot renders
   the mandated literal `Readings held at this level: unavailable. The latest reading has no risk
   level.` (`S-38`, both periods included). Do not count runs of "unknown". The return type must be
   able to say so — `{ kind: 'value'; count: number; truncated: boolean } | { kind: 'unavailable' }`,
   not a bare `number` — otherwise "3 readings at this level" renders beside a chip that says
   `Risk level unavailable`, which asserts stability at a level nobody knows.
5. The elapsed duration of the run may be shown as supporting text `[HARNESS]`; it is not the
   handoff's metric and must not replace the count.

### F-4. Primary driver (OV-4 card, OV-5 panel) and ranked factors (PD-7)

- Source is `latestReading.top_contributors` — **not** `warning_status.flags[].top_contributors`,
  which is a different entity captured at flag time (**G-14**). Never conflate the two.
- Deterministic order `[HARNESS]`: `contribution` **descending**, then `name` ascending via
  `Intl.Collator('en', { sensitivity: 'base' })`. The schema does not mark a primary.
- **Primary driver** = element `[0]` of that ordering.
- Exact tie for first place: still deterministic, but the card must indicate the tie (e.g.
  `<name> (tied)`) rather than presenting one of several equals as *the* driver `[HARNESS]`.
- `top_contributors` empty or absent -> "No ranked factors available". **Never fabricate a driver**,
  never fall back to the highest-valued parameter, never infer a driver from the risk level.
- Do **not** `Math.abs()` the contribution and do **not** re-normalise to 100 % (**G-24**).
- PD-7 renders the full ordered list with raw `contribution` values, labelled with their unconfirmed
  unit.

### F-5. Review state and review-time display

- Normalization: section 2.2.
- Review time source: `latestReading.review_at`. Note the split — `review_at` is per **reading** while
  `status` is per **patient** (**G-15**).
- Rendering:

| Case | Render |
|---|---|
| `reviewed` + valid `review_at` | `Reviewed · <absolute time> (<relative>)` `[HARNESS]` format |
| `reviewed` + missing/invalid `review_at` | `Reviewed · review time not recorded` — that exact wording (state `S-08`), never the shortened `Reviewed · time not recorded`. Never substitute `charttime`, never "just now", never blank |
| `pending_review` + non-null `review_at` | **Conflict.** `status` governs the state (Pending review); the conflict surfaces as an integrity warning (`U-12`). Do not silently prefer either field |
| `unknown` | `Review status unavailable` (state `S-09`) |

- A local `Mark as reviewed` produces a client-side timestamp that carries the one literal
  `docs/spec/screens.md` section 8 RULE TWO declares —
  **`Marked locally in this session — not saved to the record`** `[HARNESS]`, pending copy approval
  (**G-08** → **D-10**) — rendered as its own phrase between the review state and the timestamp.
  `locally marked, not persisted`, `Recorded in this session` and
  `Reviewed · recorded in this session at <time>` are retired spellings, and "saved" / "persisted"
  stay banned while **G-08** is open. When the local timestamp is unavailable the trailing element is
  `review time not recorded`, verbatim the `S-08` wording above.

### F-6. Data-quality badge (OV-4 card, PD-3, PD-5)

- Derived **only** from `latestReading.sufficient_data`. `insufficient` -> data-limited badge, the
  banner literal `Insufficient data — risk score is not reliable`, and the explicit unavailable
  treatment headed `Explanation withheld` where explanation and references would be (state `S-10`).
  A `sufficient` reading whose `explanation` / `citations` is nevertheless `null` is a **different**
  state, `S-37` (`Explanation not supplied`), never the withheld treatment (**G-16**).
- The field is `Sufficiency | null` (section 1.4), so the branch is **three-way**, not a boolean.
  `null` (absent or unrecognised) is **not** `sufficient`: it takes the same gating treatment as
  `insufficient` — never the clean success rendering — and is labelled "data sufficiency unknown"
  rather than "insufficient", because claiming the data is known to be inadequate is also a claim.
  `sufficient_data === 'sufficient'` is the only expression allowed to unlock the normal rendering;
  `!== 'insufficient'` and `?? 'sufficient'` are both forbidden.
- **Do not compute a quality verdict from `imputed_share` / `documentation_share` thresholds.**
  Choosing a cut-off is inventing a clinical threshold.
- Patient-level vs reading-level: the Overview's `Data-limited` filter is patient-level, the schema's
  flag is per reading. Rule `[HARNESS]`: **the latest reading governs** the patient's data-quality
  state everywhere (**G-26**).

### F-7. `imputed_share` / `documentation_share` formatting (PD-6)

The schema says `Number` with no unit. `0.85` could be 85 % or 0.85 %. Guessing is a
patient-safety-class error, and the common heuristic "if <= 1 treat as a fraction" breaks exactly at
`1` (100 % vs 1 %).

- **Interim rule `[HARNESS]`, blocking on G-11:** render the raw numeric value with the label
  `imputed share (scale unconfirmed)` / `documentation share (scale unconfirmed)`. The adapter
  exposes `scaleUnknown: true`. **Do not append `%`. Do not multiply by 100. Do not draw a
  proportional bar or gauge** — a bar asserts a 0–1 domain nobody confirmed.
- **Once G-11 is answered:** format with `Intl.NumberFormat('en', { style: 'percent',
  maximumFractionDigits: 0 })` for fractions (or divide by 100 first for percents), and treat any
  value outside the confirmed range as an integrity error (`U-12`) — surfaced, never clamped.

### F-8. Model use — "current score factor" vs "available" (PD-10, PM-4)

Not in the schema (**G-04**, BLOCKING). The only available join is `parameter.name` against
`latestReading.top_contributors[].name`.

| Join outcome | `ModelUse` | Why |
|---|---|---|
| Exact match after trim + case-fold | `score_factor` | The match **proves** the parameter is a current score factor. |
| No match | `unknown` — **never `available`** | `top_contributors` is plausibly a top-N list, so a parameter absent from it may still be a score factor with a small contribution. Emitting "available" from absence would state, on a clinical screen, that the model ignored a parameter — a claim the data cannot support. |
| Backend supplies an explicit flag | whatever the flag says | The only legitimate source of `available`. |

Name-based joining is fragile (display strings, not codes). Record every match and miss so the
fragility is measurable, and retire the whole mechanism the moment **G-04** lands.

### F-9. Parameter table rows (PD-10) and chip list (PM-3)

- Rows come from **`latestReading.parameters[]` only** — a point-in-time snapshot.
- **Never merge parameters across readings to fill holes.** Carry-forward is a backend concept
  already modelled by `source`; frontend backfill is a second, invisible carry-forward.
- A parameter present in an older reading but absent from the latest is simply not in the table.
- Chip list on Parameter Detail = the same latest-reading parameter set, in the order delivered
  `[HARNESS]`. If the delivered order proves unstable, sort by name and raise **G-37**.
- Deep-link to a slug not in that set -> state `U-13`, never a silent fallback chip.
- `value` renders at the precision delivered. No rounding, no `toFixed`, no default
  `Intl.NumberFormat` fraction-digit truncation, no compact notation, no locale grouping on clinical
  magnitudes. Use tabular figures in columns.
- The unit sits adjacent to the value inside the same non-wrapping element at **every** point of
  display — cell, chip, tooltip, axis label, accessible name. Unit-in-column-header-only is
  forbidden. The unit itself does not exist yet (**G-01**), so the interim is the explicit marker
  `unit not supplied`, carrying `data-clarify="G-01"` — that wording, never "unit unknown" and never
  a guessed unit.

### F-10. "Charting history / age" and last-measured display

- Age = `anchor (latest charttime) − last_measured`, rendered as a relative duration `[HARNESS]`
  format: `<1 min`, `N min`, `N h M min`. Both operands are nullable, so the subtraction happens
  only after both have been narrowed to a real instant; otherwise there is no age to render.
- `measured` with a **non-null** `last_measured` equal to the anchor `charttime` -> "measured at
  chart time". Two `null`s are **not** a match: guard both sides before comparing, or a reading with
  no times at all silently claims it was measured at chart time.
- `carried_forward` -> carried-forward provenance **and** the retained last-measured time (Handoff
  section 5); rendering that time as an **absolute** timestamp is `[HARNESS]` (state `S-13`). A
  `null` here contradicts the handoff: render "last measured time unknown" **and** raise an
  integrity warning (**G-18**, `U-12`).
- `population_reference` -> **no age, no last-measured time.** Render `Not measured on this patient`
  — that casing, everywhere the string is rendered as a label. Computing an age would imply a
  measurement that never happened.
- `source === null` (absent or unrecognised, section 1.4) -> state `S-15`, badge literal
  `Provenance unknown`, plus an integrity warning. Render `last_measured` when it is present, as an absolute time labelled
  "last measured time", and **compute no age** — an age is a claim about a measurement whose
  provenance is unknown. Never fall through to the `measured` rendering.
- Every branch above is keyed off an explicit comparison against a literal. A `switch` on `source`
  carries a `null` case and a `never`-typed default (section 1.7); `if (source === 'measured')
  … else …` is forbidden, because it silently files both `population_reference` and `null` under
  "not measured, therefore carried forward".
- Absolute time is always present (24-hour `HH:mm`, date when not today, labelled zone, inside a
  `<time datetime>`). Relative time is a parenthesised supplement only, and it must actually tick.
- The age computation also requires an anchor: if the F-1 `latest` is `null`, or the anchor
  `charttime` is `null`, there is no age at all. Render the value with its provenance and omit the
  age; never substitute the wall clock for the missing anchor.

### F-11. Parameter provenance chart (PM-5) and provenance summary (PM-6)

- Series = for each reading in the window, the entry in `parameters[]` whose name matches the active
  parameter -> `{ t: charttime, value, source, last_measured }`. Readings lacking that parameter
  produce **gaps**, never `0` and never an interpolated point.
- Window `[HARNESS]`: reuse the same anchored 24-hour window as F-2 for consistency; the handoff
  says only "the recent time window" for this chart.
- Points are visually distinguished by `source`, with a non-colour channel as well `[HARNESS]`
  (Handoff section 9: keep provenance visibly distinct). `source` is `Provenance | null`, so
  the encoding has **four** cases: the three literals plus the explicit `Provenance unknown` mark
  (`S-15`) — never the `measured` mark and never an unmarked point.
- Provenance summary `[HARNESS]`: counts of points by source within the window, stated as **counts**,
  never as a quality score or a percentage-of-reliability figure. The summary lists the
  provenance-unknown count as its own line; folding unknowns into `measured`, or omitting them so
  the counts silently fail to add up to the number of points, both misstate the data.
- **No reference bands or normal ranges on the axis** (**G-28**) — still true, and untouched by the
  fixed y-axis EXTENT added 2026-08-23 (`CHART_RANGE` in `front-end/src/lib/domain/units.ts`,
  **G-55**): that is the plot window a value is drawn against, not a band, and nothing on this chart
  is shaded or labelled "normal"/"abnormal". Falls back to the window's own min/max for any
  parameter the table does not know.
- Connectors **step**, never slope, since 2026-08-23: hold flat at the from-value across the gap,
  then step at the to-instant. A diagonal would assert the value moved continuously between two
  readings, which is the trend claim this chart exists not to make. Gaps still break the path
  entirely — a step across a 40-minute hole asserts the same continuity a diagonal would.
- The tooltip carries value + unit / absolute time / source / provenance detail. It must not carry a
  trend, a delta interpretation, or a classification (Handoff section 5).

### F-12. Overview summary counters (OV-2)

- **Pending-review count** = number of patients whose normalized review state is `pending_review`
  across the **full loaded patient set**, not the filtered view `[HARNESS]`. Label the scope
  unambiguously ("Pending review — unit total"). If the list is paginated (**G-07**) this count is
  unreliable and must be sourced from the backend instead.
- **Connected-source count** and the whole Input status section (OV-6): **no schema support**
  (**G-05**, BLOCKING). Render the mandated literal `Device and source status is not reported`
  (state `S-36`), carrying `data-clarify="G-05"`. Never `0 sources connected` (which
  asserts a fact), never a count of any kind, and never invented device rows. The drawer's connected
  devices region (F-13) uses the same literal and the same state.

### F-13. Patient context drawer content (PD-11)

- Demographics: `age`, `gender`, `race` verbatim. `weight` / `height` **verbatim strings with no unit
  appended and no numeric parsing** (**G-19**).
- Comorbidities: **every** element of `underlying_condition[]` — the singular wire key (section 1.3).
  Empty or absent -> the explicit "No recorded comorbidities" state (Handoff section 4, state `S-26`).
- **`catchFlag` (wire key `catch`) must not filter, sort, or restyle anything** until **G-10** is
  answered. Hiding a recorded comorbidity on the basis of an unexplained boolean is exactly the class
  of silent behavior the handoff forbids.
- Connected devices/sources: **G-05**, same treatment as OV-6 — the `S-36` literal
  `Device and source status is not reported`, never a count and never an
  invented device row.

### F-14. Patient identity (PD-2, cards, header)

- No name, bed, or unit field exists (**G-06**). Display `patient_id` as the identifier. **Never
  synthesize a name, initials, bed number, or unit label.**
- "Assessment-refresh information" (PD-2) has no dedicated field. Render the latest reading's
  `charttime` plus relative age, labelled as the **reading time**, not as a refresh time, until
  **G-22** clarifies what the prototype was displaying. When F-1 yields no latest reading, PD-2
  renders the identity plus the `U-11` `No assessment available for this patient` treatment — never
  a blank time slot and never the current time. The same absence on an **OV-4 card** is state
  `U-22`, not `U-11`: the card's time slot renders
  `No reading with a usable timestamp. The assessment time is unavailable.` while its risk and score
  slots render `S-05` and `S-35`. One cause, two surfaces, two literals, and neither is a retired
  spelling of the other.

---

## 4. Transport — the endpoints that exist, and the fixture rules

A backend exists. It is `back-end/` in this repository: an Express 4 app on port **3500** (`PORT`
overridable), Mongoose 6 against MongoDB, a CORS allow-list, and a JWT middleware that is **commented
out**. It does not yet serve this UI, and the gap between what it serves and what the three screens
need is the `G-40` … `G-49` block of `docs/spec/open-questions.md`.

> **STATUS, 2026-08-16 — THIS SECTION IS NOW PART HISTORY. READ THIS BOX FIRST.**
>
> Everything below describes the service **as originally committed**, and it is kept because it is
> the reason the frontend's transport is built the way it is. On 2026-08-16 the user instructed
> "sửa backend" — fix the backend — which overrode the read-only rule this section previously
> carried, and **seven defects were repaired in `back-end/` rather than worked around here**:
>
> | Row | Then | Now |
> |---|---|---|
> | **G-44** | `module.exports` named an undefined `createNewPatient`; `axios` undeclared. The process did not boot. | a real handler; `axios` declared and required lazily |
> | **G-44** (boot) | `app.listen` reachable only from inside `mongoose.connection.once('open')` | binds unconditionally; `GET /health`; `/patient/**` answers a named `503` while the database is down |
> | **G-43** | handlers read `req.params.id` while routes declared `:patient_id`; lookup on Mongo `_id` | `req.params.patient_id` through one helper; lookup on the business `patient_id` |
> | **G-42** | not-found was `204` with a discarded body | `404` with a readable JSON body |
> | **G-40** | `getAllPatient` routed nowhere and called an undeclared `Patientatient` | mounted at **`GET /patient/all`**, returning whole wire-shaped patients |
> | **G-49** | allow-list omitted the Vite dev origin | `localhost`/`127.0.0.1` on `5173` and `4173`, plus `CORS_ORIGINS` |
> | — | `errorHandler` sent `err.message` as plain text | JSON, no stack to the client |
>
> Each register row now reads `ANSWERED 2026-08-16` with the detail. **Still open and untouched:**
> G-45 (auth commented out), G-46, G-47, G-48, and the envelope rows G-30 / G-39.
>
> **Section 4.1's "order of failure" therefore no longer describes today's behaviour**, and it stays
> anyway: it is why the transport branches on `res.status` before reading any body and names every
> failure. The frontend does not assume a healthy backend, and must not start.
>
> **The one consequence for this document's rules:** §4.2's "never invent a list endpoint" stands
> unchanged for the FRONTEND — the endpoint was added in the backend, not fabricated in `source.ts` —
> and the HTTP `listPatients` now calls the real route under a CHANGE OF RECORD comment naming G-40.
> `getFixturePatientSource` remains the DEFAULT, because §4.3's selector defaults to fixtures.

**`back-end/` was read-only to every frontend workflow until the user lifted that rule.** It is not
lifted generally: the model, the auth posture, and the envelope shape are still not this workflow's
to change, and every remaining defect is a registered row rather than a patch. Each defect below was
verified against the files.

### 4.1 The three endpoints that exist

All three are `GET`, all are mounted under `app.use('/patient', …)`, all take a `:patient_id` path
parameter, and each returns **a fragment of one patient** — never a whole patient.

| Endpoint | Handler | Response body on success | Corresponds to |
|---|---|---|---|
| `GET /patient/info/:patient_id` | `getPatientInfo` | a hand-built object: `patient_id`, `age`, `gender`, `weight`, `height`, `race`, `underlying_condition` | the demographic half of `WirePatient` (§1.4) |
| `GET /patient/warning/:patient_id` | `getWarning` | `patient.warning_status` **alone** — a bare object, no `patient_id` | `WireWarningStatus` (§1.3) |
| `GET /patient/reading/:patient_id` | `getPatientReading` | `patient.readings` **alone** — a bare array, no `patient_id` | `WireReading[]` (§1.4) |

There is also `POST /patient/reading/:patient_id`, routed to `patientController.createNewPatient`,
which **is not defined anywhere in that file** (the function that exists is `create100NewPatient`).
Referencing the undeclared identifier in the module's `module.exports` object literal throws a
`ReferenceError` at module load, so `require`ing the controller fails and the server does not start
as committed (**G-44**). Nothing the frontend does can work around that; it is a backend fix.

#### The order of failure — stated once, here

Two defects are often described as if both were happening at the same time. They are not: they are
**sequential**, and this section is the authority for the sequence. `CLAUDE.md` section 3, section
4.3's status table, and the `400` branch comment in
`.claude/skills/svelte5-runes/references/patterns.md` section 7 cite this section rather than
restating both at once; `.claude/skills/bootstrap/SKILL.md` section 6 carries the same order as a
working copy for the scaffolding step, and if the two ever disagree this section wins.

There are **three** steps, not two, and the third is a precondition the first two hide. Verified by
reading `back-end/server.js`: the only `app.listen` call in the file is inside
`mongoose.connection.once('open', …)` at the bottom, so nothing binds the port until Mongoose reports
an open connection.

1. **Today, the process does not boot at all (G-44).** `require`ing the controller throws a
   `ReferenceError`, so `server.js` never reaches its `listen`. A request from the frontend is a
   **refused connection**, not an HTTP status: `fetch` rejects, and the transport maps that rejection
   to the named `UPSTREAM_ERROR` (`The assessment service at <base> could not be reached`), which the
   UI renders as `U-04` — or `U-05` when the browser is offline. There is no `400` to observe,
   because there is no server.
2. **Fixing G-44 is necessary but not sufficient: the port opens only if MongoDB is reachable.**
   `server.js` calls `app.listen(PORT, …)` **only** inside the `mongoose.connection.once('open', …)`
   handler. `back-end/config/dbConn.js` `await`s `mongoose.connect(process.env.MONGODB_URI)` inside a
   `try`/`catch` that only `console.error`s the failure, so with no reachable MongoDB the process
   starts, logs, **never listens, and never exits** — the client still meets a refused connection and
   still renders `U-04`, for a different reason and with no diagnostic difference at the browser. Any
   statement of the form "once G-44 is fixed the process boots and answers 400" is true only with
   *and a reachable MongoDB* attached to it.
3. **With G-44 fixed and Mongo connected, the process listens and answers `400` to everything
   (G-43).** The handlers read `req.params.id` while the routes declare `:patient_id`, so the guard
   fires on every request and all three fragment endpoints return
   `400 {"message":"Patient ID required."}`. That is the branch section 4.3's status table names, and
   it is what the live server will do the day it actually starts serving.

So the `400` branch is not dead code and is not today's behaviour either: it is the next *observable*
failure, two preconditions away. Both rows stay `OPEN-BLOCKING`/`OPEN` on their own terms, and
neither is worked around here — `back-end/` is read-only to this workflow. Nothing in the frontend
distinguishes step 1 from step 2, and it must not try: both are a rejected `fetch`, both are `U-04`,
and inventing a "server is up but the database is down" state would be a claim about infrastructure
this client cannot observe.

**Confirmed defects in these three endpoints.** Every one was reproduced against the source, and
every one is registered rather than worked around:

| # | Defect | Consequence for this UI | Row |
|---|---|---|---|
| 1 | Handlers guard on `req?.params?.id` and query `findOne({ _id: req.params.id })`, but the routes declare `:patient_id`. Express keys `req.params` by the name in the path, so `req.params.id` is always `undefined`. | **Once the process boots (defect 8, G-44) *and* MongoDB is reachable so `app.listen` actually runs**, every request returns `400 {"message":"Patient ID required."}` — see "The order of failure" above for the full three-step sequence. No patient screen can render against the real backend. | **G-43** |
| 2 | Even once the name is fixed, the lookup is by Mongo `_id`, not by the business `patient_id` that the URL, the card, the ranking key and every deep link use. | The frontend holds `patient_id` and has no `_id`, so it cannot address a patient at all. | **G-43** |
| 3 | The not-found path is `res.status(204).json({ message: … })`. HTTP 204 means *No Content*; the body is discarded in transit. | The client receives an empty `204` and cannot tell "no such patient" from any other empty response — the exact ambiguity `U-04` / `U-06` / `U-09` exist to prevent. | **G-42** |
| 4 | The response is a bare fragment with no envelope, no status discriminant, no `request_id`, and no `meta`. | `G-30`'s error envelope and `G-39`'s success envelope are both unimplemented; there is nothing to switch on. | **G-30**, **G-39**, **G-42** |
| 5 | Two of the three fragments (`warning`, `reading`) carry **no identifier of any kind**. | A composed snapshot cannot prove its three parts describe the same patient at the same version. Mixed identity is undetectable, not merely unlikely. | **G-41** |
| 6 | `config/allowedOrigins.js` lists `https://www.yoursite.com`, `http://127.0.0.1:5500`, `http://localhost:3500`, `http://localhost:3000` — and **not** the Vite dev origin `http://localhost:5173`, nor any real deployment origin. | `pnpm dev` against the real backend fails CORS on the first request. | **G-49** |
| 7 | `app.use(verifyJWT)` and every auth route (`root`, `register`, `auth`, `refresh`, `logout`) are commented out in `server.js`. The only live mount is `/patient`. | Every patient endpoint is served unauthenticated; `U-06` / `U-07` are unreachable and the header's session UI has nothing behind it. | **G-45** |
| 8 | `module.exports` names `createNewPatient`, which is defined nowhere in the controller (`create100NewPatient` is). The undeclared identifier throws a `ReferenceError` at module load. | **The process does not boot**, so today's failure is a refused connection, not a status — the first entry in "The order of failure" above, and the reason defect 1's `400` is the *next* failure rather than the current one. | **G-44** |
| 9 | `server.js` calls `app.listen(PORT, …)` **only** inside `mongoose.connection.once('open', …)`. No other `listen` exists in the file. | Fixing defect 8 does not by itself produce a listening server: with no reachable MongoDB the process starts and never binds the port, so the client still meets a refused connection and still renders `U-04`. This is step 2 of "The order of failure" and the reason "once G-44 is fixed it answers 400" is incomplete on its own. It belongs to **G-44**, whose question is "what is the deployable state of this service?" — a service that cannot answer without a database it does not carry is part of that answer. | **G-44** |

### 4.2 There is no list endpoint

**The Patient Overview board has no endpoint to call.** `getAllPatient` is defined and exported in
`controllers/patientController.js`, but it is routed nowhere, and its body calls
`Patientatient.find()` — an undeclared identifier — so it would throw a `ReferenceError` on the first
request even if it were mounted.

That is **G-40**, `OPEN-BLOCKING`. Until it is answered:

- `listPatients()` is served by the **fixture implementation**, `getFixturePatientSource()`, which
  stands in as the board's data source and stays reachable. This is not a temporary shim to be
  deleted at the first opportunity — it is the only implementation there can be, and it is
  **constructible today**: §4.3's selection rule is what hands it to a load, and the symbol is on the
  `$lib/data/source` row of the declaring-file register
  (`.claude/skills/bootstrap/SKILL.md` section 4).
- The **HTTP implementation's `listPatients()` has no endpoint to call and must not invent one.** It
  returns a named, registered failure — `UPSTREAM_ERROR` carrying **G-40** — and its body says so in
  a comment naming that row, so the ban is legible where the call would otherwise be written rather
  than only in this document.
- **Never invent a list endpoint.** Not `GET /patient/all`, not `GET /patients`, not an N+1 loop that
  calls `/patient/info/:patient_id` once per known id — the frontend has no way to enumerate ids
  either, and inventing one would fabricate the unit's membership, which is a clinical claim.
- The board must keep saying, visibly, that it is rendering fixture data (`[HARNESS]`, rule 3 below).

### 4.3 `PatientDataSource` — the adapter is the seam

The application reaches the network **only** through this interface, so that fixtures, the fragment
transport, and whatever replaces it are interchangeable. No `load` function and no component calls
`fetch` directly.

```ts
// EXCERPT of src/lib/data/source.ts — canonical declaration of the interface:
// .claude/skills/bootstrap/SKILL.md section 6; canonical declaration of both implementations:
// .claude/skills/svelte5-runes/references/patterns.md section 7. The interface text below is
// byte-identical with bootstrap section 6 (this header is a comment about the excerpt, not part
// of it); this file declares no module.
import type { PatientSnapshot, PatientSummary } from '$lib/domain/types';
import type { Parsed } from '$lib/data/validate';

export interface PatientDataSource {
  listPatients(signal?: AbortSignal): Promise<Parsed<readonly PatientSummary[]>>;
  getPatient(patientId: string, signal?: AbortSignal): Promise<Parsed<PatientSnapshot>>;
}
```

**There are two implementations of that interface, and both are real.**
`.claude/skills/svelte5-runes/references/patterns.md` section 7 declares them:

| Export | What it is | `getPatient` | `listPatients` |
|---|---|---|---|
| `getPatientSource(fetch)` | the **HTTP** implementation | composes the three fragments below and validates once | **no endpoint exists** — returns the named `UPSTREAM_ERROR` citing **G-40** and issues no request (§4.2) |
| `getFixturePatientSource()` | the **fixture** implementation | resolves one fixture by `patient_id` through the same `parsePatientSnapshot`, or `PATIENT_NOT_FOUND` | **implemented for real**: parses `WIRE_PATIENT_FIXTURES` through `parsePatientList`, projects each validated snapshot with `toPatientSummary`, and returns the board |
| `resolvePatientSource(fetch)` | **the selector** — the only thing a `load` calls | — | — |

The HTTP implementation maps the transport failures — `PATIENT_NOT_FOUND`, `FORBIDDEN`,
`UPSTREAM_ERROR` — so the only thing a load is left to branch on is a `Parsed` failure
(`CONTRACT_VIOLATION`, state `U-21`).

`listPatients` returns the board projection because that is what the board renders. **The projection
runs where the list is actually produced, which is the fixture implementation** — `toPatientSummary`
is applied there, once per validated snapshot. It does **not** run inside the HTTP implementation:
that implementation's `listPatients` never returns a list at all, and its `getPatient` returns one
`PatientSnapshot`, which the board's projection never touches.

**The selection rule `[HARNESS]` — which source a load receives, and how a deployment chooses.** It
is stated in code, not only here, and it is deliberately the dumbest rule that can work: one
exported selector, one environment variable, fixtures by default while **G-40** is `OPEN-BLOCKING`.

```ts
// EXCERPT of src/lib/data/source.ts — canonical declaration:
// .claude/skills/svelte5-runes/references/patterns.md section 7 (also carried in
// .claude/skills/bootstrap/SKILL.md section 6.1, which the scaffold wires the loads to).
// Every load calls THIS function and never an implementation directly, so the choice is made in
// exactly one place and a deployment changes it without touching a route.
export function resolvePatientSource(fetch: typeof globalThis.fetch): PatientDataSource {
  return env.PUBLIC_PULSEMIND_DATA_SOURCE === 'http'
    ? getPatientSource(fetch)             // the HTTP implementation
    : getFixturePatientSource();          // the default while G-40 is OPEN-BLOCKING
}
```

- **Unset (the default) means fixtures**, because the board's own endpoint does not exist and the
  three patient endpoints answer as "The order of failure" in §4.1 describes. A default that reached
  for the network would put the primary screen in an unnamed failure on first paint.
- **`PUBLIC_PULSEMIND_DATA_SOURCE=http` selects the HTTP implementation**, whose base URL is
  `PUBLIC_PULSEMIND_API_BASE` (default `http://localhost:3500`). Both are read through
  `$env/dynamic/public`, so a deployment changes source and base without a rebuild. The comparison
  is against the exact string `'http'`, never a truthiness test: `PUBLIC_PULSEMIND_DATA_SOURCE=1`
  must not silently mean "go live". There is no third knob, and a load that names
  `getPatientSource` or `getFixturePatientSource` directly has hard-coded the deployment.
- Whenever the fixture source is in use the board must keep saying so visibly (§4.4 rule 3), and the
  label is derived from the same one environment read rather than remembered separately. The flag
  selects a data source; it never selects whether the UI tells the truth about which one is live.

**The interface does not change shape because the transport is fragment-shaped.** `getPatient` is one
call returning one `PatientSnapshot`. Composing the three fragments is the HTTP implementation's job
and happens entirely inside `src/lib/data/source.ts`:

1. Issue the three requests for the same `patientId`, **in parallel**, against the configurable API
   base — `{base}/patient/info/{patientId}`, `{base}/patient/warning/{patientId}`,
   `{base}/patient/reading/{patientId}`.
2. Assemble one candidate object shaped like `WirePatient` (§1.4): the info fragment's fields, plus
   `warning_status` from the warning fragment, plus `readings` from the reading fragment.
3. Hand that object — still `unknown`, still untrusted — to the **single existing validator**,
   `parsePatientSnapshot`. There is exactly one validator and one parse path; the fragments are never
   separately typed, never cast, and never `as`-asserted into shape (§1.1, §1.5).

The three requests go out **in parallel**, against a configurable API base whose default is
`http://localhost:3500` — a **different origin** from the Vite dev server on `http://localhost:5173`,
which is why the missing allow-list entry in **G-49** is a real, first-request failure and not a
deployment detail.

**Every response is branched on `response.status` BEFORE any body is read.** `res.ok` is `true` for
`204` — it means "the request succeeded", not "a body exists" — so an `if (!res.ok)` guard falls through to
`res.json()` on a body that was discarded in transit and throws `SyntaxError: Unexpected end of JSON
input` — the registered ambiguity of **G-42** arriving on a triage screen as an unnamed exception:

| Status | Named result | Note |
|---|---|---|
| `204` | `PATIENT_NOT_FOUND` | No body exists to read. Never an empty patient, never an exception. **There is no snapshot on this path, so there is nothing to hang an `integrityWarnings` entry on**: the **G-42** ambiguity is carried in the failure's own message text — "the service signalled this with 204 No Content, whose body is discarded, so not-found cannot be told apart from an empty response (G-42)" — which is what `U-13` renders |
| `400` | `UPSTREAM_ERROR` | The branch the live server takes **once it boots and MongoDB is reachable**. It answers `400 "Patient ID required."` to every request because the handlers read `req.params.id` while the routes declare `:patient_id` (**G-43**); until **G-44** is fixed the process does not start, and even then `app.listen` runs only inside the Mongoose `open` handler — so the rejected `fetch` below is what happens instead. §4.1 "The order of failure" states the three-step sequence once; the code comment on this branch cites both rows and does not restate it |
| `403` | `FORBIDDEN` | State `U-06`. Never an empty board |
| any other non-2xx, and every bodyless 2xx (`205`, a conditional `304`) | `UPSTREAM_ERROR` | State `U-04`, naming the status: `The assessment service answered <status> for the <fragment> fragment of patient <patientId>`. The only status this transport reads a body from is `200` |
| `200` | read the body, compose, validate | A parse failure is `CONTRACT_VIOLATION` (`U-21`), never a partial patient. Malformed JSON is `UPSTREAM_ERROR`: `The <fragment> fragment for patient <patientId> was not valid JSON` |
| *(no response — rejected `fetch`)* | `UPSTREAM_ERROR` | A refused connection, a DNS failure, or the **G-49** CORS preflight: `The assessment service at <base> could not be reached`. `U-04`, or `U-05` when the browser reports itself offline. A raw `TypeError` must never be what reaches a clinician |
| *(no response — the deadline fired, `TimeoutError`)* | `UPSTREAM_ERROR` | **Its own named result, not a variant of the row above**: `The assessment service at <base> did not answer the <fragment> request for patient <patientId> within <FRAGMENT_TIMEOUT_MS> ms`. `U-04`. Folding it into "could not be reached" would report a hung service as a refused connection, which is a different fact about the deployment |
| *(no response — the caller aborted, `AbortError`)* | `UPSTREAM_ERROR` | `The <fragment> request for patient <patientId> was cancelled before it completed`. Normally unrendered — it is the load releasing the two sibling fragments once a third has failed by name — and named anyway, because "normally never rendered" is not "never rendered" |

**Every fragment read carries a deadline `[HARNESS]`, and it is the source's, not the caller's.** The
fragment read composes `AbortSignal.timeout(FRAGMENT_TIMEOUT_MS)` inside itself — never asked of the
caller, so it cannot be forgotten — and combines it with the caller's optional `signal` through
`AbortSignal.any`. Both loads do pass a signal (each owns an `AbortController` and aborts it on the
way out, releasing fragments still in flight once the call has its answer), but the deadline holds
whether they do or not. The timeout value is `[HARNESS]`, pending confirmation with the refresh
strategy in **G-22**, and is never a clinical value. Without the deadline the most likely live
behaviour — a server that never answers because it never booted, or a preflight that hangs —
resolves to an **indefinite `U-01` loading state with no named failure**, which is precisely the
"looks like nothing is wrong" outcome this matrix exists to prevent. The two abort reasons
(`TimeoutError` from the deadline, `AbortError` from the caller) are distinguished and each has its
**own row and its own lead-in** in the table above — a hung service and a refused connection are
different facts about the deployment, so folding the deadline into "could not be reached" would
report one as the other. Both are `U-04`, whose row in `docs/spec/ui-states.md` lists all six
transport lead-ins; neither is silently swallowed, and nothing is retried automatically (`U-08`).

Rules the composition must obey, because they are the difference between a seam and a hazard:

- **All three or none.** A `PatientSnapshot` is produced only when all three fragments resolve
  successfully for the same `patientId`. A partial result is never composed with the missing part
  defaulted, omitted, or filled from a previous response — that is `risk_level ?? 'Low'` wearing a
  network costume. Any fragment failing resolves the whole call to one named transport failure.
- **Identity is asserted by the info fragment only**, because it is the only one that carries
  `patient_id`. If the info fragment fails, there is no verified identity and no snapshot, whatever
  the other two returned (**G-41**).
- **The `204` case is `PATIENT_NOT_FOUND`.** A `204` from any fragment carries no body to read, so
  it cannot be distinguished from a successful empty response; treat it as not-found, never as an
  empty patient (**G-42**). **The ambiguity is named in the failure's message, not in
  `integrityWarnings`** — `integrityWarnings` is a member of `PatientSnapshot`, and this path
  produces no snapshot to carry one. Warnings ride on a patient; failures carry their own text.
- **The three responses are three separate reads with no shared version stamp**, so the composed
  snapshot carries an integrity warning to that effect until **G-41** is answered.
- **Nothing above this module ever learns that three requests happened.** No component, no `load`, no
  domain function, no view model mentions `/patient/info`, `/patient/warning` or `/patient/reading`.
  The fragment shape is absorbed here and nowhere else; that is the entire point of the seam.

Wire types are unaffected. Sections 1.2–1.5 describe the **composed** patient, which is what the
validator sees and what the rest of the app is built on. §4.1 records which endpoint supplies which
slice of it.

### 4.4 Fixture rules

Fixtures remain the standing-in data source: for `listPatients` because no endpoint exists
(**G-40**), and for `getPatient` until the defects in §4.1 are fixed by their owner. They reach the
app through `getFixturePatientSource()` (§4.3), never through an import in a route or a component.

The fixture set itself lives in `src/lib/data/fixtures/patients.ts` and has exactly **one** export,
**`WIRE_PATIENT_FIXTURES`, typed `readonly unknown[]`** — `unknown` on purpose, because typing it
`readonly WirePatient[]` would be an `as` cast in a different hat: the array would satisfy the wire
types by declaration instead of by validation, and rule 1 below would stop being enforceable (§1.1).
That symbol is on the `$lib/data/fixtures/patients` row of the declaring-file register
(`.claude/skills/bootstrap/SKILL.md` section 4), and `getFixturePatientSource()` is its only
importer.

Fixture requirements:

1. Fixtures are **wire-shaped** (`WirePatient`, section 1.4), and they go through the same
   validators as the real API — `parsePatientList` for the board, `parsePatientSnapshot` for one
   patient, the same function the HTTP source hands its composed candidate to. A fixture that
   bypasses validation proves nothing.
2. The fixture set must cover, at minimum: every `RiskLevel`; a missing/unrecognised level (`S-05`);
   all three `ReviewStatus` values including `null`; `sufficient` and `insufficient`; an absent or
   unrecognised `sufficient_data` (`S-10` unknown); a missing / non-numeric `risk_score`
   (`S-35` "score unavailable"); all three `Provenance` values; an absent or unrecognised `source`
   (`S-15`); a `carried_forward` row with `last_measured: null` (`U-12`); a patient
   with zero readings (`U-11`); a patient with one reading only (F-2 insufficient history); colliding
   `charttime`s (`U-12`); an absent `charttime`; an unparseable `charttime`; a patient whose readings
   are all charttime-less, so F-1 yields `null` (`U-11`); empty `top_contributors`; a first-place tie
   in `top_contributors`; `explanation: null` with `sufficient_data: 'sufficient'` (**G-16**);
   `citations: []` and `citations: null`; empty `underlying_condition`; absent `weight` / `height`.
   Every nullable field in section 1.4 needs at least one fixture that exercises its `null`, or the
   branch the type forces is never actually rendered.
3. Fixture values must never be presented in the UI as if they came from a backend. Label the data
   source visibly while fixtures are in use `[HARNESS]`. **This rule is one-directional, and as of
   2026-08-17 the UI reads it that way.** `SourceBanner` renders the fixture warning and, when the
   live service is selected, renders **nothing at all** — not an empty box, not a pill, and not the
   API base path it used to print. The product owner asked for the live pill to go, and the reading
   holds: the hazard this rule names is fixtures mistaken for real data, never the reverse, and a
   badge that says "normal" on every screen trains people to stop reading badges — which is the exact
   habit the fixture warning depends on. The banner's PRESENCE now means fixtures and its absence
   means live, which is one channel fewer to misread. The base URL still appears where it is
   diagnostic rather than decorative: inside `U-04`'s mandated failure messages, which name the
   service that could not be reached.
4. Do not add fields to fixtures that the schema does not define. A fixture with a `unit` field would
   quietly close **G-01** with an invented answer.
5. Fixtures model the **composed** patient (`WirePatient`), not the three fragments. The composition
   in §4.3 is exercised by tests against the HTTP implementation, not by splitting the fixture set in
   three — one fixture shape, one validator, one snapshot.

### 4.5 Two schemas now exist, and they differ (**G-48**)

`docs/patientSchema.js` is the pseudo-schema sketch section 0 describes, and `CLAUDE.md` section 7
names it part of the spec of record. Since then two more artefacts have appeared:

- `back-end/model/patientSchema.js` — a copy of `docs/patientSchema.js` whose **only difference is
  the line endings** (CRLF in `docs/`, LF under `back-end/`), so the contents match character for
  character while the bytes, the sizes and the checksums do not. It adds nothing and settles nothing.
- `back-end/model/Patient.js` — the **live** Mongoose model the three endpoints actually read
  through. It is close to the sketch, but not the same document.

Which one governs the wire contract is **G-48**. Until it is answered the validator stays defensive
against every difference below, and none of section 1's nullability is relaxed on the strength of the
live model. The differences that reach this contract, all verified against the file:

| Field | `docs/patientSchema.js` | `back-end/model/Patient.js` | Effect here |
|---|---|---|---|
| `warning_status.status` | union `"Reviewed" \|\| "Pending Review" \|\| null` | `{ type: String, value: "Reviewed" \|\| "Pending Review" \|\| null, default: null }` | `value:` is **not** a Mongoose schema option — `enum:` is. No validation runs, so **any string whatsoever is accepted and stored** (**G-46**). §2.2's "any other string -> `unknown` + `IntegrityWarning`" row is therefore a live path, not a defensive nicety. (The `\|\|` expression also collapses to the single string `"Reviewed"` before Mongoose ever sees it.) |
| `readings[].sufficient_data`, `risk_level`, `parameters[].source` | union literals | real `enum:` constraints, matching §1.2 exactly | No divergence. These three are genuinely validated server-side. |
| `readings[].citations` | `[{ name, claim }] \|\| null` — nullable | `[{ name, claim }]` — a Mongoose DocumentArray | A Mongoose array defaults to `[]` and **cannot be `null`**, so `citations: null` is unreachable from this model. §1.4 keeps `WireCitation[] \| null` and fixture rule 2 keeps requiring the `null` case: the branch must exist whichever schema wins. |
| `readings[].explanation` | `String \|\| null` | `{ type: String, default: null }` | Consistent. |
| `readings`, `underlying_condition`, `warning_status.flags` | plain arrays | Mongoose arrays | Default to `[]`; absence of the key is unreachable, `[]` is reachable. `U-11` (zero usable readings) stays reachable via `[]`. |
| `_id`, `__v` | absent | added by Mongoose to the root document **and to every subdocument** | `/patient/warning/…` and `/patient/reading/…` return raw subdocuments, so **the wire carries keys section 1 does not declare**. The validator reads the keys it needs and **must not reject an object for carrying extra keys**; no `unit`, `model_use`, or other undeclared key is ever *read* (rule 4 above), and `_id` is never rendered, never used as an identifier, and never substituted for `patient_id`. |

`GET /patient/info/:patient_id` is the one exception to the last row: its handler builds a fresh
object literal, so it carries no `_id` and no `__v`.

---

## 5. Checklist before merging any code that touches data

- [ ] No `as PatientSnapshot` (or any cast) over an API or fixture response.
- [ ] No `!` non-null assertion on a clinical field, an array element, or a `.at()` / `.find()`
      result. `.at(-1) ?? null` plus an explicit branch, never `.at(-1)!`.
- [ ] No `??` or `||` defaulting of a clinical field to a **value**. `?? null` to normalise an
      `undefined` into the absent case is fine; `?? 'Low'`, `?? 0`, `?? 'measured'`,
      `?? 'sufficient'` are not.
- [ ] Every nullable field in section 1.4 maps to a state ID and has a visible branch:
      `charttime` -> `U-11`, `sufficient_data` -> `S-10`, `risk_score` -> `S-35`,
      `risk_level` -> `S-05`, `ParameterReading.source` -> `S-15`. No `if (level)` truthiness
      tests — compare against `null` explicitly.
- [ ] A single failed field never drops a patient. `risk_score`, `risk_level`, `sufficient_data`,
      `charttime` and `source` parse failures are **non-fatal**: they yield `null` plus an
      `IntegrityWarning`, never a rejected patient (section 2.4).
- [ ] Every union switch has a `never`-typed default.
- [ ] `readings` is never indexed without the F-1 sort.
- [ ] `pnpm check` passes with `strict` and `noUncheckedIndexedAccess` on. Neither flag is relaxed
      to make a snippet compile.
- [ ] The risk-history window is anchored on `charttime`, not `Date.now()`.
- [ ] No `Math.abs()` or re-normalisation of `contribution`.
- [ ] No `%`, no `x100`, no bar for `imputed_share` / `documentation_share`.
- [ ] `available` is never emitted from a `top_contributors` miss.
- [ ] No parameter is backfilled from an older reading.
- [ ] `population_reference` rows have no age and no last-measured time.
- [ ] The wire key read for comorbidities is the singular `underlying_condition`, never
      `underlying_conditions`.
- [ ] `underlying_condition[].catch` is parsed through to `catchFlag`, and `catchFlag` drives
      nothing — no filter, no sort, no styling.
- [ ] Every failure path lands on a named state from `docs/spec/ui-states.md`.
- [ ] Every derived rule above has a unit test in an effect-free module.
