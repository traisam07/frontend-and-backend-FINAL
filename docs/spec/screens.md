# PulseMind — Screen Spec

Implementation-ready specification of the three PulseMind screens: purpose, route, layout regions,
named sections, and every interaction with its exact expected behavior.

**Sources.** `docs/Handoff.pdf` (8 pages) and `docs/patientSchema.js`. Citations of the form
(Handoff section N) are traceable to the PDF.

**Companion files.** Read together with:

- `docs/spec/ui-states.md` — every UI state, what must and must not be shown.
- `docs/spec/data-contract.md` — types, adapter rules, derived-value rules.
- `docs/spec/open-questions.md` — everything the handoff leaves undefined.

## Labelling convention — preserve it in code, comments, and tests

| Tag | Meaning |
|---|---|
| `[HANDOFF]` | Stated or directly implied by the handoff PDF or the schema. Not negotiable, not re-designable. |
| `[HARNESS]` | Invented by this harness because no prototype exists. Reasonable default, **harness-defined, pending design confirmation**. Must be visibly labelled wherever it lands. |
| `[UNDEFINED]` | Handoff section 8 explicitly leaves this open. Must be raised as a question in `docs/spec/open-questions.md`, never silently decided. |

**Prime directive.** PulseMind is a clinical decision-support UI for ICU respiratory risk. Silently
inventing a state, silently degrading to a "looks fine" empty state, or silently carrying a stale
value forward is a **patient-safety-class bug**, not a cosmetic one. (Handoff section 8: "Where a
required production state is missing from the prototype, mark it for design/product clarification
rather than silently choosing a behavior.")

---

## 1. Screen map (Handoff section 2)

| Screen | Purpose | How it is reached |
|---|---|---|
| Patient Overview | Unit-level triage: the ranked board, plus what has already been reviewed. | Default / starting screen. |
| Patient Detail | Detailed review of one patient's current respiratory-risk assessment. | Click that patient's card on Patient Overview (**D-22**), or deep-link to the route. |
| Parameter Detail | Inspect one respiratory parameter and its charting provenance/history. | Select a parameter from Patient Detail. |

Navigation flow as drawn in the PDF: **two arrows, three labels** — `select patient`, `open detail`,
`select parameter` — across `PATIENT OVERVIEW → PATIENT DETAIL → PARAMETER DETAIL`.

```
PATIENT OVERVIEW  --(select patient)(open detail)-->  PATIENT DETAIL  --(select parameter)-->  PARAMETER DETAIL
```

Which arrow carries `open detail` is **not stated by the diagram** — three labels sit on two arrows —
so grouping it with `select patient` on the Overview-to-Detail edge is `[HARNESS]`, this harness's
reading. It is the reading Handoff sections 3 and 7 support: both list `Click patient card → select
only` and `Click Open patient detail → open Patient Detail` as Overview actions, and neither names an
"open detail" action on Parameter Detail. That selecting and opening are two distinct user steps is
**not** an inference — the handoff states it outright — and it is exactly what the product owner
overrode on 2026-08-17: the two steps are now one, the card opens the patient, and **D-22** carries
the decision. See section 8, RULE ONE, which quotes the superseded rule rather than deleting it.

## 2. Route table `[HARNESS]`

Routes are harness-defined, pending design confirmation. They are designed so **patient context and
parameter context live in the URL**, never only in memory: refresh, deep-link, browser back/forward,
and middle-click-to-new-tab must all reconstruct the exact view.

| Route | Screen | Params / query |
|---|---|---|
| `/` | — | Redirect to `/patients`. |
| `/guide` | How to use PulseMind | `?first=1`, `?next=<path>` |
| `/patients` | Patient Overview | `?q=<search>`, `?filter=all\|needs-review\|data-limited`, `?risk=Critical\|High\|Medium\|Low\|unknown` — `?selected=` is RETIRED (**D-22**) |
| `/patients/[patientId]` | Patient Detail | path: `patientId`; `?drawer=context` opens the patient-context drawer (URL contract in section 4.6, confirmation tracked as **D-13**); carries `q`/`filter` through for the back link |
| `/patients/[patientId]/parameters/[parameterSlug]` | Parameter Detail | path: `patientId`, `parameterSlug`; carries `q`/`filter` through |

### 2.1 URL rules `[HARNESS]` — each one exists to prevent a silent wrong-view render

| Situation | Required behavior | Forbidden behavior |
|---|---|---|
| Card activated | Push a history entry for the patient — the card is a link, and Back returns to the board it was pressed on (**D-22**). | Replacing the entry, which would make Back skip the board entirely. |
| `filter` value unrecognised | Render as `all` **and** show the mandated literal `Unrecognised filter — showing all patients` (state `U-20`). | Silently treating it as `all`; silently narrowing the set. |
| `?selected=` present in an old link | Ignored. The parameter is **retired** (**D-22**) and names nothing; the board renders normally. | Reviving selection for it; an error state for a parameter that used to be valid. |
| `patientId` not found | Explicit not-found state naming the requested id + link back. | Falling back to the first patient; redirecting. |
| `parameterSlug` not in the latest reading | The mandated literal `This parameter is not present in the current reading: "<parameterSlug>"`, with the requested slug interpolated (state `U-13`, error code `PARAMETER_NOT_IN_READING`). | Falling back to the first parameter chip; a message that omits the slug. |

`parameterSlug` derivation `[HARNESS]`: the schema has no parameter id (open question **G-03**).
Interim slug = lowercase, trim, non-alphanumeric runs to `-`, collapse repeats. The adapter builds a
`slug -> parameter` lookup from the latest reading and resolves through it. A slug collision inside
one reading is a data-integrity error to surface (state `U-12`), never to disambiguate by guessing.

`patientId` appears in browser history, referrers, and logs. That is a PHI question (**G-29**), not a
decision this spec makes.

### 2.2 Layout shell

A root layout owns the header (read-only status, live clock/date, session information) and the
decision-support disclaimer. The disclaimer is listed in the "Main sections" of **all three** screens
(Handoff sections 3, 4, 5) — it is global, not per-screen decoration.

---

## 3. Patient Overview — `/patients`

**Purpose (Handoff section 3).** Provide a ranked unit-level view of adult ventilated ICU patients,
highlight patients that need review, and let the user select one patient before opening the detailed
assessment.

### 3.1 Layout regions `[HARNESS]`

```
+--------------------------------------------------------------------------+
| OV-1  Header: read-only status | live clock/date | session info           |
+--------------------------------------------------------------------------+
| OV-2  Overview summary: pending-review count | connected-source count     |
+--------------------------------------------------------------------------+
| OV-3  Search Patient ID | [All] [Needs review] [Data-limited]             |
+-----------------------------------------+--------------------------------+
| OV-4  Triage board (ranked cards)        | OV-5 Review history            |
|       one card per patient, each card    |      marked by you this session |
|       a LINK to Patient Detail (D-22)    |      (local, unsaved, timed)   |
|       risk level, score, data quality,   |      ------------------------- |
|       review status, primary driver      |      already reviewed in the   |
|                                          |      data                      |
|                                          +--------------------------------+
|                                          | OV-6 Input status              |
+-----------------------------------------+--------------------------------+
| OV-7  Decision-support disclaimer                                         |
+--------------------------------------------------------------------------+
```

The two-column split is harness-defined, pending design confirmation. **OV-5 was the
selected-patient panel until 2026-08-17**; it existed because a card click selected instead of
navigating, and when the product owner reversed that (**D-22**) the panel had nothing left to
describe. What replaced it is a review history, and what is **not** negotiable about it is that its
two groups never merge: a mark made on this screen is local and unsaved, and a `Reviewed` status off
the wire is not, so presenting them as one list would let a clinician read their own click as a
recorded review.

### 3.2 Named sections (Handoff section 3)

| # | Section | Contents | Notes |
|---|---|---|---|
| OV-1 | Header | PulseMind identity, live clock/date, and — **only when someone is signed in** — the read-only posture pill and the session marker (name + role). | Clock timezone is **G-21**. The session marker now shows a REAL identity (**G-45** is half-answered: a working `/auth` exists); before a sign-in it renders nothing at all, because there is no answer to state, and the previous `data-clarify="G-23"` unknown treatment went with it. Nothing clinical is lost — the read-only posture is stated in full by the S-32 disclaimer on every clinical screen, which is the item U-18's no-hiding list actually names. The toolbar carries NO preference control at all: appearance, text size and text weight live together in the account menu's Display section, because they are one subject. `/login` is the exception — it has no header and renders the theme switch itself, which is how a signed-out clinician sets it (**D-03**, **D-04**). **Identity and its two actions live behind ONE avatar control** (`AccountMenu`), not a second header row: a session marker, a name, a role badge, `Account & security` and `Sign out` are one subject, and on a phone they were five things fighting over 320px. The trigger is an avatar rather than a hamburger, because a hamburger says "more of this page" and this is about the person at the terminal. The avatar is the WHOLE control — there is no inline `Session — name — role` beside it, because it repeated what the panel already says. Nothing is lost to assistive technology: the button's accessible name is `Account menu — <name>, <role>`. **A `read_only` clinician therefore learns their role by opening the menu**, which is acceptable only while nothing is denied on the strength of a role (**G-46** is open, and `Mark as reviewed` is not gated); when a role starts refusing an action, the refusal must say so at the point of the action rather than rely on a badge elsewhere. It is a disclosure with `aria-expanded`, never `role="menu"`: that role promises an arrow-key contract this does not implement. **The header is not rendered on `/login` at all**: every part of it — the unit clock, the read-only posture, the session marker, the onward links — is about a clinical session, and before a sign-in there is none to frame. The sign-in screen renders the theme switch itself, from the same `ThemeSwitch` component the header uses. |
| OV-2 | Overview summary | Pending-review count, data-limited count and connected-source count. **The risk-level tally moved to OV-3 on 2026-08-18** — see that row; its rules below are unchanged and still govern it. **Removed from the screen entirely on 2026-08-23**, at the product owner's request, to reclaim the vertical space this band cost before the board began. This is a deliberate deviation, stated rather than silent: none of the three OV-2 facts render anywhere on Patient Overview any more, which is a direct conflict with U-18's no-hiding rule below. Nothing in the codebase computing these facts was removed (`board.pendingReviewCount`, `board.counts['data-limited']`, `UnknownInline clarify="G-05"` all still exist and are exercised elsewhere), only the OV-2 display of them — reinstating it is a markup-only change if this decision is reversed. | Pending-review count = patients whose normalized review state is `pending_review`; counting across the **full loaded set** rather than the filtered view, and labelling the count so the scope is unambiguous, are `[HARNESS]` — the handoff names the count, not its scope. Connected-source count has **no schema support** (**G-05**) — render the mandated literal `Device and source status is not reported` (state `S-36`), never `0` and never a count. The **risk tally** is `[HARNESS]` (**D-17**): five cells — the four bands plus `Risk level unavailable` — each a verbatim COUNT of `risk_level` across the full loaded set, never a proportion, a bar, or a gauge (rule 16), and the unknown cell is always present so a zero there means something. The tally must always sum to the loaded set: a patient absent from it is a patient the unit cannot see. **Each cell is also a FILTER** (`?risk=`), and it is a SEPARATE dimension from `?filter=` — those three values are the handoff's and mean review state and data quality, while a band is a different question, so the two compose (`needs-review` + `Critical` is a view a clinician can ask for). Selecting the active band clears it. The counts stay across the whole loaded set while a band is selected: a tally that narrowed to its own selection would show zero in every other band and leave no way back to them. An unrecognised `?risk=` renders every band PLUS its own notice, the same shape U-20 gives an unrecognised `?filter=`, and it is a separate sentence because two wrong parameters are two facts. |
| OV-3 | Search + the merged filter/tally row | Search Patient ID; `Data-limited`; and the five risk-band cells, all in one row. | Search filters by patient ID only. **The tally moved here from OV-2 on 2026-08-18** at the product owner's request, to cut the distance a clinician scrolls before the board begins: it cost a 68px band of its own plus a gap, and merging it into the control row moves the first patient up ~80px on a workstation. It also belongs here now — every cell is a FILTER (`?risk=`), so it is a control, not a summary. **`Needs review` dropped on 2026-08-23** — redundant with the board's own review-status grouping (OV-4), see `TriageFilters.svelte`'s deletion note preserved in `RiskTally.svelte`. **`Needs review` REINSTATED hours later, paired with a new `Reviewed`, same day**: the grouping labels which block a clinician is looking at, but the page is still one continuous scroll through all three blocks — only a FILTER removes the other groups from the DOM, which is what actually lets `Reviewed` be viewed without scrolling past every `Pending review` card first. `reviewed` is a new, non-Handoff `TriageFilter` member (see its doc comment in `domain/types.ts`), and both cells reuse `ReviewChip`'s own colours — `review-pending-solid`, and a NEW `review-done-solid` `scripts/build-tokens.mjs` grew the same day (white text, computed AA 2.2) since `Reviewed` had never needed a solid fill before. **`Data-limited` and the risk tally merged into ONE row on 2026-08-23**, at the product owner's request: `RiskTally` now renders `Data-limited` as a leading cell beside the five bands, so what was two stacked controls (a fieldset above a tally) reads as one. The two stay separate filter dimensions underneath — `?filter=data-limited` and `?risk=` still compose exactly as before; only the visual grouping changed. **`Data-limited` got its OWN colour the same day** — so it stops sharing the `insufficient-*` navy with the `Risk level unavailable` cell three cells over; the two were reading as one repeated chip. **`data sufficiency unknown` added as a SECOND leading cell, also 2026-08-23**: the F-6 `sufficientData === null` state had no filter before this, only a per-card badge (`InsufficientChip`) — `sufficiency-unknown` is a new, non-Handoff `TriageFilter` member (see its doc comment in `domain/types.ts`). It ORIGINALLY kept the `insufficient-*` navy-dashed styling `Data-limited` had just given up, reasoning the two "we do not know" cells could share a colour — reported instead as looking like the same cell twice, so it got its own colour too, dashed border kept.

**EVERY NON-RISK CELL'S COLOUR WAS RE-SOLVED WHOLESALE, HOURS LATER, on the same 2026-08-23**: a colourblind clinician sent a simulated screenshot of the merged row and several cells were indistinguishable. Each colour above had been checked only against whatever existed at the moment it was added, never against the full nine-cell set (four risk fills plus five) the row ended up with — `separationReport` run across all nine under the three Machado dichromacies found FIVE pairs under this app's own 15-ΔE2000 floor, worst `Critical` vs `Reviewed` at 3.5 under deuteranopia. `review-pending-solid` (`Needs review`, and the "Pending review" badge on every pending card) and `insufficient-solid` (`Risk level unavailable`, on every unrecognised-risk card) were left EXACTLY as deployed — both have use well beyond this row, and restyling either is a bigger call than a filter-row fix carries. `Reviewed`, `data sufficiency unknown` and `Data-limited` were re-solved together against those two fixed anchors plus the four risk fills, across all four vision models at once: every pair that could still move now measures **>= 14.6** ΔE2000 under the worst model — short of the full 15, but close, given two anchors ate into the open wheel. **What this did NOT fix**: `Needs review` vs `Risk level unavailable` still measures only 8.0 ΔE2000 under deuteranopia — a PRE-EXISTING gap, not introduced by this pass, left as a flagged, separate decision rather than folded in silently. Full reasoning and the exact oklch values are in `RiskTally.svelte`'s file header and `scripts/build-tokens.mjs`, never restated as numbers here to avoid a copy that drifts. **`uppercase` added to every label in the `Risk` and `Data` rows, same pass**: a second, independent reinforcement of the point above — colour is never the only channel (rule 8), and capitals scan faster as a block shape when two fills sit close. CSS `text-transform` only; every mandated literal still renders its exact spelling to assistive tech. **The heading text shortened to just `Filter`, same day**, at the product owner's request; the fuller sentence ("Filter and risk levels across all N loaded patients — select any to narrow the board") did not disappear, it moved to the cell list's own `aria-label` so a screen-reader user still gets it. The bar sticks from `lg` rather than `md`: with three controls it is 94px at 1440px but 210px at 1024px, and a 210px pinned bar is 23% of a tablet permanently under chrome (`docs/LESSONS.md` L-074). Below `lg` it scrolls away instead. |
| OV-4 | Triage board | Ranked patient cards showing: risk level, score, data quality, review status, primary driver. | **Column tracks changed from fixed lengths to `minmax(<measured floor>,1fr)` on 2026-08-23**, at the product owner's request: with two columns gone (see the deviation note above the `Assessed` row), the row's whole surplus width piled into `driver` alone, reading as content bunched at the left with a dead band on the right. Every track now carries an equal `1fr` share of the leftover width on top of its already-measured floor — no mandated literal's column got NARROWER, only wider, and content stays left-aligned within the roomier track rather than centred. `BOARD_COLS` in `+page.svelte` is the single declaration. **The `lg` table gained a card wrapper and zebra striping, also 2026-08-23** ("trống", "chưa friendly" — a flattened table sitting bare on the canvas background read as undesigned): a rounded, bordered, shadowed container now wraps the column header and the row list per review block, and even rows tint `surface-sunken`. Below `lg` nothing changes — `PatientCard` already carries its own card chrome. **The risk chip FILLS were softened the same day** — chroma only, lightness untouched, on the CVD-separation floor's own advice (see the essay in `scripts/build-tokens.mjs` above the `CHIP` object): Critical/High/Low read noticeably less saturated, Medium barely moved since it was already pale. Re-measured at ΔE2000 16.2 against the same floor of 15 that governed the original ramp (**D-26**) — margin is smaller than before but the ramp still passes; `docs/spec/contrast-ledger.md` is regenerated from the same run, never hand-edited. **Grouped into the three review blocks**, `[HARNESS]` (**D-17**), and the grouping changes NO order: review state is the primary sort key, so the blocks concatenated reproduce the ranked list exactly — the headings sit on boundaries the comparator already had. Each heading carries the mandated review label (`reviewLabel` owns all three strings) and a count, and the rank number is assigned after partitioning so it runs 1…N down the screen. The partition uses the EFFECTIVE review status, so a patient just marked reviewed locally leaves the needs-attention block instead of sitting in it wearing a `Reviewed` chip; nothing clinical moves with them (RULE TWO). Ranking rule in section 6. Primary driver derivation in `docs/spec/data-contract.md` section F-4. When the patient has no reading with a usable `charttime` the card's **time slot** is state `U-22` and renders its own literal `No reading with a usable timestamp. The assessment time is unavailable.`, while the risk and score slots render `S-05` and `S-35` (`U-11`'s half of the same card) — the two literals are never interchanged. |
| OV-5 | Review history | What has been reviewed, in **two groups that are never merged**: `Marked by you — this session` (states `S-39`) and `Already reviewed in the data` (state `S-40`). | `[HARNESS]` (**D-22**), replacing the selected-patient panel. The first group is local, unsaved, and stamped with the time of the mark; its caveat sits **above** the list so a reader who stops after the first row has still met it. The second group is `warning_status.status === "Reviewed"` off the wire and states its scope (`<n> of <total> loaded patients`) rather than implying it. A patient in the first group is excluded from the second, so nothing is counted twice. Rows carry the risk chip, so a `null` level renders `Risk level unavailable` (state `S-05`) and a `null` score `score unavailable` (state `S-35`) — never `Low`, never `0`. The 60-minute history and the score moved to Patient Detail with the click that opens it. |
| OV-6 | Input status | Connected data-source / device status. | **No schema support at all** (**G-05**). The section is still rendered, carrying the mandated literal `Device and source status is not reported` and `data-clarify="G-05"` (state `S-36`); never a count, never invented device rows. |
| OV-7 | Decision-support disclaimer | Global. | Exact copy is **G-34**. |

### 3.3 Patient card contents (Handoff section 3)

The card shows: risk level, score, data quality, review status, primary driver. It also carries the
patient identity, which is `patient_id` and nothing else — there is no name, bed, or unit field
(**G-06**). Never synthesize one.

| Card element | Source | Rule |
|---|---|---|
| Identity | `patient_id` | Verbatim. No initials, no bed number, no unit label. |
| Risk level | `latestReading.risk_level` (`RiskLevel \| null`) | Text label always present; colour is never the only channel `[HARNESS]`, WCAG 2.2 AA. Never abbreviate to C/H/M/L. `null` renders "Risk level unavailable" (state `S-05`) — never `Low`. |
| Risk score | `latestReading.risk_score` (`number \| null`) | Rendered verbatim — not one digit moves. The unit `%` is appended from `RISK_SCORE_UNIT` (**D-27**, declared by the product owner on 2026-08-18); still no `/100`, no gauge and no reference band, because the SCALE is undeclared (**G-12**). `null` renders the explicit "score unavailable" treatment (state `S-35`) — never `0`, never a blank, never a bare em dash, and never omission of the patient from the board. |
| Data quality | `latestReading.sufficient_data` (domain `Sufficiency \| null`) | `insufficient` shows the data-limited badge and the statement that the risk score is not reliable. `null` is **not** `sufficient`: it gates exactly as `insufficient` does but is labelled with the single literal `data sufficiency unknown` (state `S-10`, data contract F-6) — never the clean rendering, and never a second wording such as "data sufficiency unavailable". |
| Review status | normalized `warning_status.status` | `Pending review` / `Reviewed` / `Review status unavailable` (three states — see `S-06`, `S-07`, `S-09`). |
| Primary driver | `latestReading.top_contributors[0]` after the deterministic ordering in the data contract | Never fabricated; "No ranked factors available" when the list is empty. |

### 3.4 Interactions (Handoff sections 3 and 7)

| Element / state | Trigger | Expected behavior | Class |
|---|---|---|---|
| Patient card | Click, `Enter`, middle-click, or open in a new tab. | **Navigate to Patient Detail for that patient**, carrying `q` / `filter` / `risk` so `Back to overview` restores the board that was left. The card IS the link, so it contains no nested interactive element. | `[HARNESS]` (**D-22**) — this **reverses** Handoff sections 3 and 7 ("Select that patient … Do not navigate yet", "Click patient card → Select patients only") at the product owner's instruction, on the record, after the conflict was put in writing. See section 8, RULE ONE. |
| Open patient detail | — | **Retired with selection.** The card is the affordance; a second one on the card would be a link inside a link. | `[HARNESS]` (**D-22**) |
| Search | Type in `Search Patient ID`. | Filter the triage board by patient ID. | `[HANDOFF]` |
| All filter | Select `All`. | Show all patients. | `[HANDOFF]` |
| Needs review filter | Select `Needs review`. | Show only patients with **Pending review** status. Unknown-status patients are excluded (see section 6.3). | `[HANDOFF]`; excluding unknown-status patients is `[HARNESS]` (**G-09**, state `S-21`, see section 6.3) |
| Data-limited filter | Select `Data-limited`. | Show only patients whose data is insufficient. | `[HANDOFF]` |
| Empty result | Search/filter returns no patients. | Show an explicit empty-state message rather than a blank board, carrying the mandated literal `No patients match "<query>" with the <filter label> filter.` and a clear/reset action. | `[HANDOFF]` for the explicit empty state; the literal, naming the active query/filter, and the clear/reset action are `[HARNESS]` (state `S-19`) |
| Pending review | Patient warning status is Pending review. | Show pending-review styling/label and prioritize the patient in ranking. | `[HANDOFF]` |
| Reviewed | The patient is not pending review. | Show `Reviewed` with the review time when available. The handoff's prose is "Reviewed / Reviewed at time"; the **rendered** literals are data contract F-5's `Reviewed · <absolute time> (<relative>)` (state `S-07`) and, when `review_at` is absent, `Reviewed · review time not recorded` (state `S-08`) — that exact wording, never the shortened `Reviewed · time not recorded`, never a fabricated time. | `[HANDOFF]` for `Reviewed` and the time "when available"; both rendered literals are `[HARNESS]` (states `S-07`, `S-08`) |
| Insufficient data | Patient sufficient-data state is insufficient. | Display the warning that the risk score is not reliable. | `[HANDOFF]` |
| Mark as reviewed | Press `Mark as reviewed` on Patient Detail. | The patient joins OV-5's **first** group with the time of the mark and the unsaved caveat, and leaves the board's needs-attention block. Nothing clinical changes (RULE TWO). The mark is held by `patients/+layout.svelte`, so it survives board → detail → board; a reload clears it. | `[HANDOFF section 4]` for the local-state-only rule; the timestamp, the history and the surviving-navigation scope are `[HARNESS]` (**D-22**, state `S-39`) |
| Data refresh arrives | New application data/state received. | Values change **only** because of the new data. Focus and scroll position are preserved. | `[HANDOFF section 1]` for the data-driven-only rule; preserving focus and scroll is `[HARNESS]` (states `S-33`, `U-16`) |

### 3.5 Keyboard and focus contract `[HARNESS]`

- The card is `<a href>` to `/patients/[patientId]` (**D-22**). It carries no `aria-pressed`, no
  `aria-current` and no `role` — it is a link, and it says so by being one.
- `Enter` opens the patient. `Space` scrolls, because that is what `Space` does on a link, and
  overriding it to "activate" would break the one key every reader uses to page a long board.
- One tab stop per card, and **nothing focusable inside** it: a link inside a link is invalid HTML
  and destroys keyboard order. Do not build a roving-tabindex board.
- A re-rank must not move focus or scroll. Focus follows the **patient**, not the rank position.

---

## 4. Patient Detail — `/patients/[patientId]`

**Purpose (Handoff section 4).** Give the clinician a detailed view of one patient's current
PulseMind assessment, supporting factors, parameter values, explanation, and context.

### 4.1 Layout regions `[HARNESS]`

```
+--------------------------------------------------------------------------+
| PD-1 [Back to overview]                                                   |
| PD-2 Patient <patient_id> | reading as of <charttime> (<age>)             |
+--------------------------------------------------------------------------+
| PD-3 Warning / review-status panel        [Mark as reviewed]              |
+-----------------------------------------+--------------------------------+
| PD-4 60-minute respiratory-risk history  | PD-5 Current score + risk band |
|                                          | PD-6 Reading state             |
+-----------------------------------------+--------------------------------+
| PD-7 Ranked factors contributing to the current score                     |
+--------------------------------------------------------------------------+
| PD-8 Plain-language explanation          | PD-9 Guideline references      |
+--------------------------------------------------------------------------+
| PD-10 Respiratory parameter table                    [View patient context]|
+--------------------------------------------------------------------------+
| PD-12 Decision-support disclaimer                                          |
+--------------------------------------------------------------------------+
| PD-11 Patient context drawer — overlay, right side, background scrim       |
+--------------------------------------------------------------------------+
```

### 4.2 Named sections (Handoff section 4)

| # | Section | Notes |
|---|---|---|
| PD-1 | Back to overview navigation. | Returns to Patient Overview, carrying `q`/`filter` so the board is not silently reset `[HARNESS]`. |
| PD-2 | Selected-patient identity and assessment-refresh information. | Identity is `patient_id` (**G-06**). No dedicated refresh field exists — render the latest reading's `charttime` + relative age, labelled as the **reading time**, not as a refresh time, until **G-22** is answered. When no reading has a usable `charttime`, there is no latest reading: render state `U-11` with its PD-2 literal `No assessment available for this patient` (no trailing period), never the wall clock. The OV-4 card's time slot is a **different** state for the same cause, `U-22`, with its own literal — never this one (`docs/spec/ui-states.md` section 3 rule 14). |
| PD-3 | Warning / review-status panel. | Three states: `S-06` Pending review, `S-07`/`S-08` Reviewed, `S-09` Review status unavailable. |
| PD-4 | 60-minute respiratory-risk history. | Window anchored on the latest reading's `charttime`, not the wall clock `[HARNESS]` — the handoff names the section, not the anchor. Ascending by `charttime`; see data contract F-2. A point whose `risk_score` is `null` is omitted from the plotted line and listed in the accompanying data table as "score unavailable" (state `S-35`) — never plotted as `0`, never interpolated across. |
| PD-5 | Current respiratory-risk score and risk band. | `risk_score` verbatim, `risk_level` verbatim. Never derive one from the other. Both are nullable after validation (data contract 1.4): absent score -> `S-35` "score unavailable", absent level -> `S-05` "Risk level unavailable". |
| PD-6 | Reading state: risk level, readings held at that level, imputed share, documentation share. | "Readings held at this level" is derived (F-3) and its slot is state `S-38`, which carries all three of its mandated literals — `≥ N readings at this level` when the run reaches the oldest reading supplied, `N readings at this level` when it does not, and `Readings held at this level: unavailable. The latest reading has no risk level.` when the latest reading's `risk_level` is `null` (**G-32**). The two shares render raw with "scale unconfirmed" until **G-11**. |
| PD-7 | Ranked factors contributing to the current score. | Source is `latestReading.top_contributors`, **not** `warning_status.flags[].top_contributors` (**G-14**). |
| PD-8 | Plain-language explanation. | Suppressed with an explicit unavailable treatment when data is insufficient (`S-10`); when data is sufficient and the field is `null`, the distinct `S-37` treatment (**G-16**). |
| PD-9 | Guideline references. | Same suppression rule, and the same `S-10` / `S-37` split. `{name, claim}` as plain text; no links exist (**G-17**). |
| PD-10 | Respiratory parameter table. | Built from `latestReading.parameters[]` only. |
| PD-11 | Patient context drawer. | Overlay `[HANDOFF]`; that the open state is URL-addressable at `?drawer=context` is `[HARNESS]`, pending design confirmation (**D-13**) — full contract in section 4.6. |
| PD-12 | Decision-support disclaimer. | Global. |

### 4.3 Review-status states (Handoff section 4)

| State | What is shown | Interaction |
|---|---|---|
| Pending review | A **prominent** warning panel stating that the reading has not been reviewed, plus patient/risk summary chips. | Show `Mark as reviewed`. |
| Reviewed | Reviewed status and, when available, the review time. | The mark-reviewed action is no longer required. |
| Mark as reviewed | The user activates the button. | Update the **local UI review state** to Reviewed **without changing the risk score or ventilator settings**. |

Third state, not in the handoff: `warning_status.status === null` is reachable per the schema.
Render "Review status unavailable" (state `S-09`). Never coerce it to Reviewed. Open question
**G-09**.

### 4.4 Data-limited state (Handoff section 4)

When the patient has insufficient data, the screen explicitly states that the risk score is not
reliable, and the plain-language explanation and guideline references for that reading are withheld.

> **Frontend rule (Handoff section 4).** Do not leave the explanation/reference area looking like a
> normal successful state when data is insufficient. The unavailable state should be visually
> explicit.

Concretely `[HARNESS]` — the "visually explicit" requirement above is the handoff's; the way this
harness makes it measurable is not: PD-8 and PD-9 render an explicit withheld treatment that occupies
at least the same height as the content it replaces. A blank card, a skeleton, a bare em dash, or
"No issues found" all violate this rule (state `S-10`).

The wording is fixed by `docs/spec/ui-states.md` S-10 and is not re-invented here: the withheld
region is headed `Explanation withheld` when `sufficient_data === 'insufficient'`, and
`Explanation withheld — data sufficiency unknown` when `sufficient_data` is `null` — never
`data sufficiency unavailable`, never `unknown data`. The banner above it reads
`Insufficient data — risk score is not reliable` and `Data sufficiency unknown — risk score is not
reliable` respectively.

**A fourth case shares the slot and must not share the treatment.** When `sufficient_data` is
`'sufficient'` and `explanation` / `citations` is nevertheless `null`, nothing was withheld — nothing
was supplied. That is state `S-37`: the heading is `Explanation not supplied` and the body is
`No explanation accompanied this reading. This is not a statement that no risk factors are present.`,
carrying `data-clarify="G-16"`. Rendering S-10's withheld copy there states a clinical reason the
data does not support, and rendering S-37's copy for an insufficient reading hides one
(`ui-states.md` section 3 rule 12).

### 4.5 Respiratory parameter table (Handoff section 4)

Each row represents a respiratory parameter and is selectable.

> Layout note: the PDF renders this table with three column headers where the third is a verbatim
> duplicate of the first. That is a document artifact. The table is semantically **two** columns
> (displayed information, behavior). Do not build a third column from it.

| Displayed information | Behavior | Schema support |
|---|---|---|
| Parameter name + description | Identifies the parameter. | `name` exists; **`description` does not** (**G-02**). Show the name only; omit the description line rather than inventing text. |
| Latest value + unit | Shows the current point-in-time value. | `value` exists; **`unit` does not** (**G-01**, BLOCKING). Render the value with the explicit marker `unit not supplied` — that wording, carrying `data-clarify="G-01"`. Never guess a unit. |
| Source | Shows measured, carried forward, or population reference provenance. | `source` exists but is domain `Provenance \| null` after validation: the three badge literals are `Measured`, `Carried forward` and `Not measured on this patient`, and an absent or unrecognised value renders `Provenance unknown` (state `S-15`), never `measured`. Provenance must stay visibly distinct (Handoff section 9). |
| Charting history / age | Indicates the recency/provenance of the value. | Derived from `last_measured` vs the anchor charttime (F-10). Population-reference rows get **no age**. |
| Model use | Shows whether the parameter is a current score factor or simply available. | **Not in the schema** (**G-04**, BLOCKING). A name match against `top_contributors` proves `score_factor`; absence yields `unknown`, never `available`. `available` is reachable only from an explicit backend flag (data contract F-8, state `S-28`). |
| Row selection | Open Parameter Detail for the selected patient and parameter. | The navigation itself is `[HANDOFF]`; implementing it as a real `<a href>` in the row-header cell is `[HARNESS]`. |

Table construction rules:

- Rows come from `latestReading.parameters[]` **only**. It is a point-in-time snapshot.
- **Never merge parameters across readings to fill holes.** Carry-forward is a backend concept
  already modelled by `source`; frontend backfill is a second, invisible carry-forward.
- A parameter present in an older reading but absent from the latest is simply not in the table.
- Values render at the precision delivered. No rounding.

### 4.6 Patient context drawer (Handoff section 4)

The `View patient context` action opens a right-side drawer over the Patient Detail screen. It
contains demographics, recorded medical history/comorbidities, and connected devices/sources. A close
action returns to the underlying Patient Detail view.

| Drawer state | URL | Required behavior |
|---|---|---|
| Closed (`S-24`) | `/patients/[patientId]` — no `drawer` parameter | Off-screen (not in the DOM, or `display: none` — never off-screen-but-tabbable). Patient Detail remains the active page and is fully interactive. No scrim. |
| Open (`S-25`) | `/patients/[patientId]?drawer=context` | Right-side panel visible with a background scrim. The **same** patient stays on screen underneath; nothing in the detail state mutates. |
| Close | Remove `drawer` from the URL | Hide the drawer and return to the same patient/detail state, with focus restored to the trigger. |
| No comorbidities recorded | unchanged | Show the explicit "No recorded comorbidities" state. |

**URL contract `[HARNESS]`, harness-defined and pending design confirmation (`D-13`).** The drawer's
open state lives in the URL as the query parameter **`?drawer=context`** on
`/patients/[patientId]`, not in component memory. `drawer=context` present means open; the
parameter absent means closed; any other `drawer` value renders closed **and** is surfaced as an
unrecognised query parameter, following the same discipline as the unrecognised `filter` value in
section 2.1 (`U-20`) — never silently ignored.

Because the state is addressable, the drawer **survives refresh, deep-link, and browser
back/forward**: reloading `/patients/PT-014?drawer=context` reopens the drawer on the same patient,
the URL can be shared or bookmarked in that state, and `Back` closes an open drawer rather than
leaving the page. Opening therefore pushes a history entry (unlike card selection, which uses a
`replaceState`-style update — section 2.1); closing removes the parameter. Navigate with
`goto(url, { keepFocus: true, noScroll: true })` so the drawer keeps its own focus management and
the page underneath never scroll-jumps. `q` and `filter` are carried through unchanged, so the
`Back to overview` link still restores the board (`PD-1`).

Holding the open state in a component variable is the defect this rule exists to prevent: the
drawer then closes silently on refresh, cannot be deep-linked into, and `Back` walks off the
patient screen while a modal overlay is on top of it. The parameter name itself is
harness-invented and is registered for confirmation as **D-13**.

Drawer content rules:

- Demographics: `age`, `gender`, `race` verbatim. `weight` and `height` are **strings** in the schema
  with unknown units — render verbatim, append nothing, parse nothing (**G-19**).
- Comorbidities: display **every** element of `underlying_condition[]` (the wire key is **singular**).
  `underlying_condition[].catch` — carried into the domain as `catchFlag`, because `catch` is a JS
  reserved word — is an unexplained field; it is stored but must not filter, sort, or restyle
  anything until **G-10** is answered.
- Connected devices/sources: **no schema entity exists** (**G-05**). The region is still rendered,
  carrying the same mandated literal as OV-6 — `Device and source status is not reported` (state `S-36`) — never a count and never an invented device row.

Drawer accessibility contract `[HARNESS]`, pending design confirmation: `role="dialog"`,
`aria-modal="true"`, focus moved to the drawer heading on open, focus trapped while open, `Escape`
closes, focus restored to the exact trigger node on close, background marked `inert`.

### 4.7 Interactions (Handoff sections 4 and 7)

| Trigger | Expected behavior | Class |
|---|---|---|
| Click `Back to overview` | Return to Patient Overview. | `[HANDOFF]` |
| Click `View patient context` | Open the patient-context drawer (right side, over the page, background scrim) and add `?drawer=context` to the URL (section 4.6). | `[HANDOFF]`; the URL parameter is `[HARNESS]` (**D-13**) |
| Click Close / dismiss drawer, press `Escape`, or press `Back` | Close the drawer by removing `?drawer=context`; remain on Patient Detail with the same patient and the same detail state; restore focus to the trigger. | `[HANDOFF]`; `Escape`, `Back`, and the focus restore are `[HARNESS]` |
| Click `Mark as reviewed` | Change the **local UI review state** to Reviewed, without changing the risk score or ventilator settings. | `[HANDOFF]` |
| Click a parameter row | Open Parameter Detail for that patient **and** parameter. | `[HANDOFF]` |
| Data refresh arrives while the drawer is open | Drawer stays open, focus stays where it is, selection is unchanged. | `[HARNESS]`, state `U-16` |

---

## 5. Parameter Detail — `/patients/[patientId]/parameters/[parameterSlug]`

**Purpose (Handoff section 5).** Inspect one respiratory parameter in more detail, especially where
its displayed value came from and how it has been charted over time.

### 5.1 Layout regions `[HARNESS]`

```
+--------------------------------------------------------------------------+
| PM-1 [Back to patient]                                                    |
| PM-2 <Parameter name> | Patient <patient_id> | chart time <charttime>     |
+--------------------------------------------------------------------------+
| PM-3 [chip][chip][chip]  <- parameter navigation, active chip highlighted |
+-----------------------------------------+--------------------------------+
| PM-5 Charting history / provenance chart | PM-4 Current value + unit      |
|      + required data table               |      current source            |
|                                          |      last measured time        |
|                                          |      model-use state           |
|                                          +--------------------------------+
|                                          | PM-6 Provenance summary        |
+-----------------------------------------+--------------------------------+
| PM-7 Population-reference warning (conditional)                           |
+--------------------------------------------------------------------------+
| PM-8 Parameter metadata                                                   |
+--------------------------------------------------------------------------+
| PM-9 Decision-support disclaimer                                          |
+--------------------------------------------------------------------------+
```

### 5.2 Named sections (Handoff section 5)

| # | Section | Notes |
|---|---|---|
| PM-1 | Back to patient navigation. | Returns to Patient Detail **for the same patient**. |
| PM-2 | Parameter title and current patient / chart time. | Chart time is the anchor `charttime`, rendered absolute. |
| PM-3 | Parameter navigation chips for switching between parameters. | Built from the same `latestReading.parameters[]` set as PD-10. |
| PM-4 | Current value, unit, current source, last measured time, and model-use state. | Unit is **G-01**; model use is **G-04**. Population-reference values have **no** last-measured time — `[HARNESS]`, this harness's reading of "not measured on this patient" (state `S-14`, section 5.4). |
| PM-5 | Charting history / provenance chart. | Charting provenance over the recent window — **not** a PulseMind trend classification. |
| PM-6 | Provenance summary. | Counts of points by source within the window `[HARNESS]`. Never a reliability score or percentage. |
| PM-7 | Conditional population-reference warning. | Shown when and only when the current source is `population_reference`. Copy is **G-33**. |
| PM-8 | Parameter metadata. | The schema supplies almost nothing here; render only what exists and mark the rest unavailable. |
| PM-9 | Decision-support disclaimer. | Global. |

### 5.3 Parameter switching (Handoff section 5)

The parameter chips at the top of the page switch the content in-place to the selected parameter
while keeping the same patient. The active parameter is visually highlighted.

Implementation `[HARNESS]`: a chip is an `<a href>` to the sibling route, so the URL always names the
visible parameter. "In place" describes what the clinician sees (the patient does not change, the
page does not reset), not an in-memory state swap that leaves the URL stale.

Exactly one chip is active at a time (state `S-18`). The chip contract, in full:

| Required | Forbidden |
|---|---|
| `<a href="/patients/[patientId]/parameters/[parameterSlug]">` — a real link, so right-click, middle-click, `Copy link`, and open-in-new-tab all work. | `<button>`, or an `<a>` with `preventDefault()` and an in-memory swap. |
| The chips sit in a `<nav aria-label="Parameters">`. | `role="tablist"` / `role="tab"` / `role="tabpanel"`. The chip navigates to another page; there is no panel to control, and the tab role overrides the link role. |
| `aria-current="page"` on **exactly** the active chip, and on no other. | `aria-selected` (invalid on a link, and ignored by screen readers there); `aria-current` on more than one chip. |
| Natural tab order — every chip is a tab stop, like any list of links. | A roving `tabindex`, or arrow-key-only navigation that fights browser history. |
| The active chip is highlighted with a non-colour channel as well as colour, and the URL slug always matches the highlighted chip. | Highlight driven by component state that can disagree with the URL; colour as the only active indicator. |

If a chip is ever highlighted while the URL names a different parameter, that is the bug this
contract exists to prevent: the address bar, the back button, and a shared link would all disagree
with the value the clinician is reading.

### 5.4 Source states (Handoff section 5)

| Source state | Meaning shown by the prototype | UI behavior |
|---|---|---|
| Measured | Read from the device at the reading's chart time. | Display measured provenance. |
| Carried forward | The last measured value is being reused rather than re-measured. | Display carried-forward provenance **and retain the last measured time**. |
| Population reference | A population value, not measured on this patient. | Use distinct provenance styling and show the population-reference explanatory panel. |

Additional rules:

- A carried-forward value with a `null` `last_measured` contradicts the handoff requirement. Render
  "last measured time unknown" **and** raise a visible integrity warning (`U-12`, **G-18**).
- A population-reference value gets **no computed age and no last-measured time**. An age implies a
  measurement that never happened. Render the literal `Not measured on this patient` — that exact
  casing everywhere it is rendered as a label. `[HARNESS]`: the handoff
  states only that the value was not measured on this patient; the explicit ban on an age and a
  last-measured time is this harness's reading of it (state `S-14`).
- Carried-forward and population-reference values render at **full contrast** with a provenance badge
  and an absolute last-measured time where applicable. Never dim, grey, or italicise them — greying
  reads as "disabled" or "unimportant". `[HARNESS]`: the handoff requires only that provenance stay
  visibly distinct (Handoff section 9 — not this file's section 9, which is the anti-requirements
  list); the full-contrast rule and the absolute-time format are this harness's answer (states
  `S-13`, `S-14`).
- An unrecognised `source` value renders the mandated badge literal `Provenance unknown` (`S-15`),
  never a default of `measured`.

### 5.5 Chart interaction (Handoff section 5)

The chart displays parameter charting provenance over the recent time window. Hovering a chart point
shows a tooltip containing the value/time/source and additional provenance detail where relevant. The
chart is about charting **provenance**, not a PulseMind-generated clinical trend classification.

Hard rules — the first is `[HANDOFF]` (the handoff states the chart is charting provenance, not a
trend classification); the gap, interpolation, insufficient-history and reference-band rules that
follow are `[HARNESS]` consequences of it, and the accessibility rule is tagged inline:

- The tooltip must not carry a trend, a slope, a delta interpretation, or a prediction.
- Readings lacking the active parameter produce **gaps**, never `0` and never an interpolated point.
- Never interpolate, smooth, extrapolate, or forecast. A straight line across a 40-minute hole
  asserts continuity the data does not support.
- Fewer than two points in the window renders an explicit "insufficient history" state — the copy is
  the one data contract F-2 prescribes, "insufficient history for a 60-minute view", not a second
  wording invented here. A single point is never drawn as a flat line.
- No reference bands or normal ranges on the axis — none exist in the data (**G-28**).
- Hover alone is not an accessible interaction. The chart ships **both** a real data table containing
  every plotted value **and** keyboard-focusable points whose focus tooltip is identical to the hover
  tooltip `[HARNESS]`, pending design confirmation. Touch hardware has no hover at all — open
  question **D-05**.

---

## 6. Ranking rule (Handoff section 3, callout)

> **Ranking rule shown in the prototype.** The triage board is sorted first by review state (Pending
> review first), then by risk level, then by risk score.

Keys 1 to 3 are `[HANDOFF]`. Keys 4 and 5 are `[HARNESS]` and exist to make the order **total**, so
that no two distinct patients ever compare equal and the board cannot jitter between refreshes.

Ranking uses the patient's **latest reading** (data contract F-1) and the **normalized review state**
(data contract F-5).

### 6.1 Comparator pseudocode

Pseudocode, deliberately not TypeScript: the canonical `comparePatients` / `rankPatients` module is
declared in `.claude/skills/svelte5-runes/references/patterns.md` section 2 and nowhere else. This
block specifies the five keys; it is not a second implementation of them.

```
compare(a, b):

  K1  reviewRank(a) - reviewRank(b)                 ascending    [HANDOFF for 0 and 2; 1 is HARNESS]
      reviewRank: pending_review = 0
                  unknown        = 1                <- HARNESS, see 6.2
                  reviewed       = 2

  K2  riskRank(a) - riskRank(b)                     ascending    [HANDOFF]
      riskRank:   Critical = 0, High = 1, Medium = 2, Low = 3,
                  missing or unrecognised = 4       <- HARNESS

  K3  riskScore(b) - riskScore(a)                   descending   [HANDOFF] that the score is
                                                                 the third key; [HARNESS] that the
                                                                 direction is descending  <- see below
      missing or NaN score sorts after all present scores; never coerced to 0   <- HARNESS
      the patient still appears on the board and renders state S-35             <- HARNESS

  K4  latestCharttime(b) - latestCharttime(a)       descending   [HARNESS] fresher reading first
      missing or invalid charttime sorts last

  K3'S DIRECTION WAS MIS-TAGGED `[HANDOFF]` UNTIL 2026-08-17, and the correction matters because a
  handoff tag grants immunity from design review. The handoff's only ranking sentence is
  "The triage board is sorted first by review state (Pending review first), then by risk level, then
  by risk score" (Handoff section 3) — it names the KEY and states no direction, for the score or for
  the level. That higher is worse is this harness's assumption, and PD-5 now says in words that
  PulseMind has not been told which direction means greater risk (**D-24**), so the tag and the
  screen would otherwise contradict each other. The assumption is bounded rather than dangerous: K3
  orders peers WITHIN one review state and one risk band, after K1 and K2, so it never moves a
  patient across a band. **K2's direction carries the same exposure** — "then by risk level" states
  no direction either, and Critical-first is only unambiguous because the band names are ordered in
  ordinary clinical use. K2 is left tagged as it is and raised in **D-24** rather than changed here,
  because retagging it is a judgement for the handoff team rather than a correction of the record.

  K5  collator.compare(a.patient_id, b.patient_id)  ascending    [HARNESS] final total-order key
      collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
```

### 6.2 Why `unknown` ranks between pending and reviewed `[HARNESS]`

The schema permits `warning_status.status === null`; the handoff describes only two review states, so
no ordering is defined for the third. The two possible errors are asymmetric: showing a genuinely
unreviewed patient low on the board is a triage miss, while showing a reviewed patient slightly too
high is noise. The safety-conservative choice ranks unknown **above** Reviewed, while rendering an
explicit "Review status unavailable" chip so it is never mistaken for either. Interim decision,
tracked as **G-09**.

### 6.3 Filter and sort deliberately differ for `unknown`

`Needs review` is a verbatim handoff rule — "Show only patients with **Pending review** status" — so
unknown-status patients are **excluded** from that filter. They remain visible under `All` with their
explicit unknown chip. Do not "improve" either half without a product decision.

### 6.4 Ordering of operations

Compute the canonical ranked list **once** from the full patient set, then apply search and filter to
that list. Filtering preserves relative order, so every filter view is a subsequence of the same
canonical ranking, and the board never reorders when a filter changes.

```
ranked   = rank(allPatients)               // pure function of a data snapshot
searched = ranked.filter(matchesQuery)     // preserves order
visible  = searched.filter(matchesFilter)  // preserves order
```

### 6.5 Stability requirements `[HARNESS]`, all mandatory

1. Because K5 is a strict total order on `patient_id`, the comparator never returns `0` for distinct
   patients. The result is therefore independent of input order **and** of `Array.prototype.sort`
   stability. Two refreshes carrying identical data produce a byte-identical order.
2. Sorting is a **pure function of a data snapshot**:
   `rankPatients(patients: readonly PatientSummary[]) -> readonly PatientSummary[]`, declared in
   `.claude/skills/svelte5-runes/references/patterns.md` section 2 —
   `.claude/skills/pulsemind-spec/SKILL.md` section 3 owns the ranking **rule** and may show the
   comparator only as a marked excerpt (`CLAUDE.md` section 5 rule 19). Never sort in
   place. Never sort a reactive `$state` array in place — use `toSorted` or `[...arr].sort`.
3. Re-rank **only** when the ranking projection changes. Memoize on a key derived from
   `(patient_id, reviewRank, riskRank, riskScore, latestCharttime)` for every patient; if that key set
   is unchanged, reuse the previous array identity so the DOM does not churn.
4. Never re-rank in response to a UI event — hover, focus, search typing, filter change, drawer
   open/close. Only new data, or a `Mark as reviewed` (which legitimately changes K1), re-ranks.
5. Key the board `{#each ranked as p (p.patient_id)}` — a stable domain id, never the index.
6. A re-rank must not move focus or scroll-jump: focus follows the **patient**, never the rank
   position.
7. Data quality (`sufficient` / `insufficient`) is deliberately **not** a sort key. Whether
   data-limited patients should be de-prioritised or promoted is a clinical question (**G-26**).

### 6.6 Tests that must exist

- Identical input in two different array orders produces the identical ranked output.
- A patient moving from `Reviewed` to `Pending review` moves up; no other patient's relative order
  changes.
- Filtering any subset yields a subsequence of the full ranking.
- Hover, focus, typing in search, and opening the drawer produce zero re-ranks.

---

## 7. Navigation and interaction quick reference (Handoff section 7)

Reproduced faithfully in intent from the handoff table. This is the authoritative interaction
contract; where a screen section above appears to disagree, this table wins — **with one recorded
exception, marked in the rows below**: the first two rows are what the handoff says and what this
harness built until 2026-08-17, and the product owner has since overridden them (**D-22**, section 8
RULE ONE). They are left in place, struck through in the Result column, because a quotation that
gets quietly edited is how an override becomes a drift.

| From | User action | Result |
|---|---|---|
| Patient Overview | Click patient card | ~~Select patients only.~~ **OVERRIDDEN (D-22): opens Patient Detail.** |
| Patient Overview | Click Open patient detail | ~~Open Patient Detail for selected patients.~~ **RETIRED with selection (D-22); the card is the affordance.** |
| Patient Detail | Click Back to overview | Return to Patient Overview. |
| Patient Detail | Click View patient context | Open patient-context drawer. |
| Patient Detail | Click Close / dismiss drawer | Close drawer; remain on Patient Detail. |
| Patient Detail | Click Mark as reviewed | Change review state to Reviewed. |
| Patient Detail | Click parameter row | Open Parameter Detail for that patient + parameter. |
| Parameter Detail | Click parameter chip | Switch displayed parameter; keep same patient. |
| Parameter Detail | Hover chart point | Show chart tooltip. |
| Parameter Detail | Click Back to patient | Return to Patient Detail for same patient. |

---

## 8. The two rules that are most often broken

### RULE ONE — clicking a patient card OPENS Patient Detail — **REVERSED 2026-08-17, see D-22**

**This rule used to say the opposite, and the reversal is the point of keeping it here.** Handoff
section 3 says "Select that patient and update the right-side/selected-patient panel. **Do not
navigate yet.**" and Handoff section 7 says "Click patient card -> Select patients only." Both were
implemented, asserted in E2E, and enforced by this rule. On 2026-08-17 the product owner asked for
the card to open the patient, was shown that quotation, and confirmed it. **D-22** carries the
decision so the handoff team meets it as a decision rather than discovering a drift.

This is the first place a handoff **requirement** has been overridden rather than a harness invention
replaced. That is why the old rule is quoted above instead of deleted: whoever wrote "do not navigate
yet" must be able to see exactly what changed and say whether the intent was a staged rollout
(in which case this closes it) or a hard rule that a glance must never move the clinician off the
ranked board (in which case the card goes back to selecting, and the review history stays either
way).

| WRONG | RIGHT |
|---|---|
| A `<button>` card plus a separate `Open patient detail` action. | The card **is** the link: `<a href="/patients/{id}?…">`. One affordance, in the place the clinician already points at. |
| A link, plus a nested `Open detail` link or button inside it. | Nothing focusable inside the card. A link inside a link is invalid HTML and destroys keyboard order. |
| `onclick={() => goto(href)}` on a `<div>` or `<button>`. | A real `href`. That is what makes middle-click, `⌘`-click, open-in-new-tab, "copy link address" and the hover status bar work — and a clinician comparing two patients opens the second in a tab. |
| Dropping `q` / `filter` / `risk` from the link. | The card carries the board's query, so `Back to overview` restores the view that was left rather than a default one. |
| Leaving `aria-pressed`, `aria-current`, or a `role` on the card. | None of the three. It is a link; the accessible name (`Patient PT-1001, …`) is what identifies it. |
| Keeping `?selected=`, the selected-patient panel, or the mobile selection bar "just in case". | All three are retired with selection. States `S-16`, `S-17` and the `?selected=` half of `U-20` are retired with them. |

The rationale that used to sit here — in triage, a click that jumps screens moves the clinician away
from the ranked board and can land them on a patient they were only glancing at — is a real cost and
the reversal accepts it. What pays for it is that the destination is now cheap to leave: `Back to
overview` reconstructs the exact board, including the search and both filters.

**Tests that must exist:** clicking a card asserts `page.url.pathname` **is** the patient's; the card
exposes an `href`; `Enter` on a focused card opens it; the card contains zero `a`/`button`
descendants; and `q` + `filter` survive the round trip.

### RULE TWO — `Mark as reviewed` changes ONLY the local review state

Handoff section 4: "Update the local UI review state to Reviewed **without changing the risk score or
ventilator settings**."

- The action's only effects are `reviewState: pending_review -> reviewed` for the displayed patient,
  plus a locally-generated review timestamp rendered as such `[HARNESS]`.
- It must not touch `risk_score`, `risk_level`, `sufficient_data`, `imputed_share`,
  `documentation_share`, `top_contributors`, `parameters[]`, `explanation`, or `citations`.
- It must not trigger a refetch that replaces the reading as a side effect.
- It **will** change the patient's K1 ranking key, which is correct. What is forbidden is any change
  to underlying clinical values.
- Persistence is `[UNDEFINED]` (**G-08**). Until a write contract exists, the UI must not claim the
  change was saved. No "Saved" toast, no server-write checkmark.

**One literal for the local review mark — declared here, and nowhere else.** The mark renders the
exact string `Marked locally in this session — not saved to the record` `[HARNESS]`, the wording the
**G-08** register row sends to **D-10** for copy approval. It is rendered as its own phrase, so its
casing never has to change at a call site, and it sits between the review state and the
locally-generated timestamp:

```
Reviewed · Marked locally in this session — not saved to the record · <absolute time> (<relative>)
```

When the local timestamp is unavailable, the trailing element is `review time not recorded` —
verbatim the S-08 wording for an absent `review_at`, not a second spelling of it — and never a
fabricated time. Three earlier spellings
are retired and must not reappear: `Recorded in this session`, `locally marked, not persisted`, and
`Reviewed · recorded in this session at <time>`. A state with two spellings is a state a test cannot
assert.

**Test that must exist:** snapshot the full derived clinical view-model before and after the click;
assert deep equality on every field except the review state and the local review timestamp, and
assert the literal above by its visible text.

---

## 9. Anti-requirements for these screens

`.claude/skills/pulsemind-spec/SKILL.md` section 7 carries this same list plus five further items
(its 4, 11, 12, 13 and 16) and an engineering block; the fifteen items below appear there with the
same wording and the same provenance carve-outs (its items 1–3, 5–10 and 14, 15, 17–20).
**They move together.** Changing an
item or a carve-out here without changing it there is the drift this section exists to prevent — a
skill loaded before writing a screen must not present a harness invention as a handoff mandate.

Prototype-fidelity (Handoff sections 1 and 9 — the handoff bans fake timers and scripted score
changes; item 3, which says which clocks *may* tick, is `[HARNESS]`):

1. No fake timers. No `setInterval` that mutates a clinical value. Values change only when new
   application data/state is received.
2. No scripted risk escalation, no demo sequence walking a patient Low to Critical, no animated
   count-up on the risk score.
3. The only clock allowed to tick on its own is the header clock (which displays nothing clinical)
   and the relative-age rendering of a fixed timestamp.

Interaction (Handoff sections 3, 4 and 7 for item 5 only; item 4 is `[HARNESS]` and **reverses** what
the handoff says, on the record — **D-22**, section 8 RULE ONE; items 6, 7, 8 and 9 are `[HARNESS]` —
ranking stability is section 6.5, refresh preservation is state `U-16`, and the deep-link states are
`U-13` / `U-20`):

4. Clicking a patient card navigates to that patient — **overriding Handoff sections 3 and 7**, which
   said it must only select. The override is the product owner's, recorded in **D-22**; do not
   re-implement selection to "restore" it without answering that row.
5. `Mark as reviewed` must not mutate any clinical field.
6. Do not auto-navigate to a patient on load, and do not put a patient's risk band, score, driver or
   history on screen before the clinician asks for it. The board opens on the ranked list and nothing
   else. (This is what survives of **G-38**, which asked about auto-**selection**; selection itself is
   retired by **D-22**.)
7. Do not re-rank in response to UI events.
8. Do not close the drawer, move focus, or reset scroll because a refresh arrived.
9. Do not silently fall back on a deep-link miss. Unknown patient, unknown parameter, and
   unrecognised filter each get an explicit state.

Clinical invention (Handoff section 8 — "final clinical thresholds or model logic" are explicitly
undefined and must not be invented; the specific bans below, notably the no-computed-age rule in
item 13 and the banned-render list in item 15, are `[HARNESS]` elaborations of that instruction):

10. Never compute or adjust `risk_score` or `risk_level` client-side, and never derive the level from
    the score.
11. Never invent clinical thresholds: no reference ranges, no normal bands, no high/low value
    colouring on parameters, no staleness alarm cut-off.
12. Never fabricate an explanation or a citation.
13. Never present a population-reference value as measured, and never compute an age for one.
14. Never carry a value forward in the frontend.
15. Never render a missing value as a normal-looking value. No `0`, no `""`, no bare em dash, no
    default `Low` / `sufficient` / `measured` / `Reviewed`.
