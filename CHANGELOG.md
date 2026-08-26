# Changelog

## 2026-08-23 — UI redesign pass

All changes below were made against the running app and verified with the full suite
(`svelte-check`, `eslint`, `prettier --check`, `vitest`, `vite build`, plus the backend's own
`smoke` / `smoke:auth`). Nothing here was verified by inspection alone.

Two of these changes **override a documented open question**. They are listed first, on purpose, and
each carries a pointer to its register row. If you read nothing else here, read this section.

---

### Data-contract overrides — read these before trusting a number on screen

Both were made on the product owner's explicit instruction, after the conflict was raised and
confirmed. Neither answers the question it overrides; both are recorded in
`docs/spec/open-questions.md` with what was actually said and how the values were sourced.

**G-12 — the risk-score chart's fixed axis and its MED/HIGH/CRIT lines.**
`docs/spec/open-questions.md` G-12 states that `risk_score`'s range and scale are unconfirmed, and
the wire type's own comment says "Never map score -> level client-side". The 60-minute chart now
nonetheless draws a fixed `0–100` domain (`RISK_SCORE_DOMAIN`) and three threshold reference lines
(`RISK_THRESHOLDS`, both in `front-end/src/lib/domain/derive.ts`).

The three threshold values — medium 40, high 65, critical 85 — were **read off a reference mockup's
pixel positions**, not supplied as figures. They are the weakest-sourced numbers in this codebase.
`RISK_THRESHOLDS` is the single place they are defined; correct them there.

What did **not** change: `risk_level` is still never derived from `risk_score`, anywhere. `RiskChip`,
PD-5's band slot and every other surface still print only the backend's own field, and still render
`Risk level unavailable` rather than inferring a band. The threshold lines are axis context, not a
second source of truth.

**G-55 (new) — the provenance chart's per-parameter y-axis extent.**
`CHART_RANGE` in `front-end/src/lib/domain/units.ts` gives each of the eight respiratory parameters a
fixed plot window (e.g. SpO2 82–100), replacing auto-scaling to the visible data. Picked by this
interface from bedside-monitor charting convention and checked only against the fixture generator's
observed spread — **not reviewed by a clinician**, unlike the units table (D-23) it sits beside.

**G-28 is untouched by both.** No reference band, no shading, nothing labelled normal or abnormal is
drawn on either chart. A plot window is the extent a value is drawn against; a band is a claim about
the value. These are the former.

---

### Chart 1 — risk-score history (`RiskHistoryChart.svelte`)

- Fixed `0–100` y-axis with five evenly spaced ticks, replacing auto-scale to the window's own
  min/max. Two windows for the same patient now place the same score at the same height.
- MED / HIGH / CRIT dashed reference lines with alternating band tints behind the series. Thresholds
  arrive as a **prop**, not a constant read inside the component.
- About five evenly spaced `HH:mm` x-axis ticks, replacing the first/last-only pair.
- Per-point value labels removed; the line reads clean.
- Every point draws a visible dot again, in three tiers: the latest point in its own risk-level
  colour, an earlier reviewed reading in the `Reviewed` green, everything else in the plain accent.
- Header restructured: `RISK HISTORY` eyebrow above the title. A large "LATEST" readout was added and
  then removed — it duplicated the PD-5 hero score two inches above it.
- Footer caption naming the data-source state and that time labels follow the viewer's device clock.

**Four new chart-mark colours** (`color-chart-risk-*`) were solved for the latest-point dot rather
than reusing `RISK_CHIP`'s badge tokens. `risk-classes.ts`'s own **D-30** note had already measured
and rejected that reuse (1.13:1 against a plot surface; ΔE2000 1.1 apart in dark mode — the same
colour to everyone, not only a dichromat). A first attempt solving all four to one contrast target
reproduced exactly that failure (overallMin 2.6 light / 3.0 dark) and was discarded before it reached
`app.css`; what ships is a per-theme lightness-spread search, worst pair 14.6 ΔE2000.

### Chart 2 — parameter charting provenance (`ProvenanceChart.svelte`)

- **Step interpolation, not linear.** Connectors hold flat at the from-value across the gap, then
  step at the to-instant. A diagonal asserts the value moved continuously between two readings, which
  is the trend claim this chart exists not to make. Gaps still break the path entirely.
- A y-axis, which this chart previously had none of at all: four to five ticks over the fixed
  per-parameter range, with the unit.
- About five evenly spaced `HH:mm` x-axis ticks.
- A `PROVENANCE` summary line, computed from the data: how long ago the last real measurement was,
  and how many of the window's readings were measured / carried forward / from population references.
- A footer caption stating what the chart shows and that values hold flat while carried forward.
- A `MEASURED` / `CARRIED_FORWARD` / `POPULATION_REFERENCE` legend in the card header, its swatches
  reusing the same `PROVENANCE_MARK` classes the marks themselves use.

The three distinct provenance markers and the never-interpolate-across-a-gap behaviour were already
implemented before this pass and are unchanged.

### Patient Overview

- Filter chips regrouped into three labelled rows (Review / Data / Risk), and the page title merged
  into the filter block to reclaim vertical space.
- `Needs review` renamed `Pending review`, matching the spelling `reviewLabel()` already owns
  everywhere else — the filter had drifted to its own wording for the same status.
- Casing made consistent: the Review row's chips now uppercase like Data and Risk. All three rows had
  always shared one font size; upper-case glyphs simply read larger at an identical size, which is
  what the size complaint had actually measured.
- Board-row chips (`RiskChip`, `InsufficientChip`, `ReviewChip`) uppercased to match their filter
  counterparts.
- A phantom 8px gap between the header and the filter row, left behind when `SourceBanner` renders
  nothing on a live source — the same "renders nothing must occupy nothing" defect already fixed once
  on the patient route.

### Patient Detail

- Explanation (PD-8) moved inside the PD-5 risk-score panel and renamed from
  `Plain-language explanation`. Guideline references (PD-9) split into
  `GuidelineReferencesSection.svelte` and moved below the parameter table.
  Both halves still share **one** merged withheld region when the sufficiency gate is closed —
  `ExplanationSection.svelte`'s file header has the full reasoning, and it is the constraint most
  likely to be broken by a future edit to either file.
- Reading state / history / ranked factors merged into one row, with column weights rebalanced.
  Fixing this surfaced a real bug: `lg:order-*` assigns grid *tracks*, not visual position, so the
  chart had been landing in the narrowest track.
- Reading state's card no longer renders shorter than its siblings — it was wrapped in a `flex-col`
  div, whose cross axis is width, so the wrapper stretched and the card inside it did not.
- Imputed share, documentation share and factor contributions now render as percentages
  (G-11 / G-24 override, same class as the two above, recorded in the register).
- The top-ranked contributing factor gets a filled red pill. This reuses the `Critical` risk hue for
  a fact that is not risk severity — a deliberate rule-8 exception, documented at the call site;
  rank, position and size all carry the same fact independently, so colour is not the sole channel.
- `Current respiratory-risk score` → `Respiratory-risk score`; score and explanation share one row.
- Pending-review body text shortened to `Marking the review`.

### Colour system

All colour changes go through `front-end/scripts/build-tokens.mjs` and are regenerated into
`src/app.css` and `docs/spec/contrast-ledger.md`. **Never hand-edit `app.css`.**

- A colour-vision-deficiency failure found via a tritanopia-simulated screenshot: the nine-cell
  filter set had five pairs under the ΔE2000 floor, worst `Critical` vs `Reviewed` at 3.5 under
  deuteranopia. Three movable colours were re-solved together against the fixed anchors; all movable
  pairs now clear 14.6. The one remaining gap (`review-pending` vs `insufficient`, ~8.0) is
  pre-existing, out of scope, and flagged rather than silently left.
- `Data-limited` and `data sufficiency unknown` given more saturated fills, at the ceiling that keeps
  CVD separation intact — verified not to make any other pair worse.
- `color-chart-series` re-solved to a higher contrast target; chart dots darkened to `accent-solid`.
- `color-chart-plot-bg` added: a lighter plot background in **light theme only**. Applying it to dark
  theme too was measured and rejected — two risk marks dropped below the 3.6 object floor, because
  dark theme's `surface` is lighter than its own `surface-sunken`, the opposite of light theme.

### Seed data

`back-end/seed/generate.js` — PT-1001 now carries 30 readings at 2-minute intervals (~58 minutes)
instead of 5, so both charts' behaviour is visible without switching patients, and three of its
historical readings carry their own `review_at` so the reviewed-point marker has data to show.
30 patients / 121 readings total, still deterministic and byte-identical across runs.

---

### Known gaps

- The three risk thresholds are mockup-derived. See the G-12 section above.
- `CHART_RANGE`'s eight windows are interface-asserted and clinically unreviewed (G-55).
- `review-pending-solid` vs `insufficient-solid` sit ~8.0 ΔE2000 apart under deuteranopia. Both are
  used well beyond the filter row, so re-solving either is a larger change than this pass took on.
