<!-- src/lib/components/PatientDetailBody.svelte
     FIRST DECLARATION — implementer-authored, listed in the declaring-file register
     (`.claude/skills/bootstrap/SKILL.md` section 4, fourth table).

     PD-2 … PD-10. It is the CALLER of the components that own the mandated literals rather than the
     owner of their strings: S-05/S-35 belong to `RiskChip`, S-06…S-09 to `ReviewPanel`, S-10/S-37
     to `ExplanationSection` (PD-8, nested inside PD-5 as of 2026-08-23) and `GuidelineReferencesSection`
     (PD-9, below PD-10 as of the same date — see both files' own headers for why splitting the
     render LOCATION does not split ownership of the merged withheld region), S-12…S-15
     to `ProvenanceBadge`, S-27…S-29 to `ParameterRow`. The three literals it does own are its own
     slots: U-11 on the PD-2 assessment line, S-38's three renderings in the PD-6 run-length slot,
     and the F-4 empty-list string.

     THE SINGLE MOST IMPORTANT SCREEN-READER RULE IN THE PRODUCT is implemented here: the score
     element carries `aria-describedby` pointing at the insufficient-data banner body, so a user who
     lands directly on the score CANNOT HEAR THE NUMBER WITHOUT HEARING THE CAVEAT. -->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import type { PatientSnapshot } from '$lib/domain/types';
  import {
    RISK_SCORE_UNIT,
    heldAtLevel,
    latestReading,
    orderContributors,
    toChartPoints,
    toChartTableRows,
    toParameterRows,
  } from '$lib/domain/derive';
  import { windowOf } from '$lib/domain/window';
  import { RISK_PANEL, RISK_PANEL_UNKNOWN } from '$lib/design/risk-classes';
  import { getAppClock } from '$lib/state/context';
  import { isLiveSource } from '$lib/data/source';
  import AbsoluteTime from './AbsoluteTime.svelte';
  import { getTriageBoard } from '$lib/state/context';
  import ExplanationSection from './ExplanationSection.svelte';
  import GuidelineReferencesSection from './GuidelineReferencesSection.svelte';
  import InsufficientChip from './InsufficientChip.svelte';
  import IntegrityWarnings from './IntegrityWarnings.svelte';
  import ParameterRow from './ParameterRow.svelte';
  import ParameterTable from './ParameterTable.svelte';
  import ReviewPanel from './ReviewPanel.svelte';
  import RiskGlyph from './RiskGlyph.svelte';
  import RiskHistoryChart from './RiskHistoryChart.svelte';
  import SufficiencyGlyph from './SufficiencyGlyph.svelte';

  let {
    snapshot,
    backHref,
    onopencontext,
  }: {
    snapshot: PatientSnapshot;
    /** Carries `q` / `filter` back to the board, so PD-1 does not silently reset it. */
    backHref: string;
    /** A callback prop, never an event: the route owns the URL, so the route owns drawer state. */
    onopencontext: () => void;
  } = $props();

  const clock = getAppClock();
  const uid = $props.id();
  const PLOT = { width: 640, height: 180 };

  // `$derived`, never a plain const: this component is reused across patients.
  const board = getTriageBoard();

  const latest = $derived(latestReading(snapshot.readings));

  /**
   * When this patient was marked reviewed ON THIS SCREEN, or `undefined`. Read from the board rather
   * than kept here: `ReviewPanel` writes it, this reads it, and one owner means the history line and
   * the panel can never disagree about whether a mark happened.
   */
  const markedHere = $derived(board.locallyReviewed.get(snapshot.patientId));
  const window60 = $derived(windowOf(snapshot.readings));
  const points = $derived(toChartPoints(window60, PLOT, clock.now));
  /** For `RiskHistoryChart`'s footer caption. Read once here, not inside the chart itself, so the
   *  chart stays a pure function of its props (same reasoning as passing `clock.now` in rather than
   *  letting a leaf component read a global). */
  const liveSource = isLiveSource();
  const tableRows = $derived(toChartTableRows(window60, clock.now));
  const parameterRows = $derived(latest === null ? [] : toParameterRows(latest));
  const held = $derived(heldAtLevel(snapshot.readings));
  const contributors = $derived(latest === null ? [] : orderContributors(latest.topContributors));

  /**
   * ×100, ADDED 2026-08-23 at the product owner's explicit confirmation that imputed share,
   * documentation share and factor contribution ARE 0–1 fractions ("Xác nhận: đúng là %") — a
   * STATED ASSUMPTION, not a schema guarantee. **G-11** and **G-24** are still OPEN; see
   * `docs/spec/open-questions.md` for the full override record, including why the interim
   * behaviour those rows used to mandate (raw, unscaled, no `%`) no longer applies here.
   *
   * `.toPrecision(15)` is NOT rounding the delivered value (rule 17) — it removes the binary
   * floating-point noise the `* 100` step itself introduces (`0.538 * 100 === 53.800000000000004`
   * in IEEE 754 double), at 15 significant digits, one below double precision's own ~17-digit
   * ceiling, so no digit the backend actually sent is ever dropped.
   */
  function toPercent(value: number): number {
    return parseFloat((value * 100).toPrecision(15));
  }

  /**
   * The parameter the clinician just came BACK from, so its row can carry `aria-current="page"`
   * (clinical-a11y section 2.2). It is read from the URL rather than remembered, so a refresh or a
   * shared link marks the same row — and `?from=` is set by Parameter Detail's back link.
   * Harness-defined, pending design confirmation.
   */
  const returnedFromSlug = $derived(page.url.searchParams.get('from'));

  const CARD =
    'flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-card md:p-4';
  const LABEL = 'text-micro font-semibold uppercase tracking-[0.04em] text-fg-muted';
</script>

<div class="mx-auto flex w-full max-w-[120rem] min-w-0 flex-col gap-4 md:gap-5">
  <!-- PD-1 -->
  <nav aria-label="Back">
    <!-- `backHref` arrives ALREADY RESOLVED from `[patientId]/+page.svelte`. -->
    <a
      href={backHref}
      class="inline-flex min-h-11 items-center gap-2 rounded-md px-1 font-semibold text-accent-fg no-underline hover:underline focus-visible:pm-focus"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12.5 8h-9M7.2 4.2 3.4 8l3.8 3.8" />
      </svg>
      Back to overview
    </a>
  </nav>

  <!-- PD-2 — identity and assessment-refresh information -->
  <header class="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
    <div class="min-w-0">
      <h1 class="text-xl font-semibold tracking-tight md:text-2xl" tabindex="-1">
        Patient {snapshot.patientId}
      </h1>
      <p class="mt-1 text-sm text-fg-secondary">
        {#if latest !== null}
          <!-- The U-14 stamp behind PD-2's own label. There is no dedicated refresh field, so this
               is the READING time and is labelled as such, not as a refresh time (**G-22**). Never
               the wall clock. -->
          reading as of <AbsoluteTime iso={latest.charttime.toISOString()} />
        {:else}
          <!-- STATE U-11 — that exact wording, with NO trailing period. The OV-4 card's time slot is
               a DIFFERENT state (U-22) with its own literal; neither stands in for the other. -->
          <span class="text-insufficient-fg">No assessment available for this patient</span>
        {/if}
      </p>
    </div>

    <button
      type="button"
      onclick={onopencontext}
      class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 font-semibold text-fg hover:bg-surface-hover focus-visible:pm-focus sm:w-auto"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="8" cy="8" r="6.2" />
        <path d="M8 7.4v3.6" />
        <circle cx="8" cy="5.2" r="0.85" fill="currentColor" stroke="none" />
      </svg>
      View patient context
    </button>
  </header>

  {#if latest === null}
    <!-- U-11 across every reading-derived section. The panels are NOT rendered empty: an empty
         parameter table reads as "no parameters", and a blank chart reads as flat and normal. -->
    <section
      class="flex min-h-60 flex-col items-center justify-center gap-2 rounded-lg border border-insufficient-border bg-insufficient-bg p-8 text-center text-insufficient-fg"
    >
      <p class="text-lg font-semibold">No assessment available for this patient</p>
      <p class="max-w-[52ch] text-body">
        This patient has no reading with a usable timestamp, so there is no current score, no risk
        band, no 60-minute history, no ranked factors and no parameter table to show. This is not a
        score of zero and not a low-risk finding.
      </p>
    </section>
  {:else}
    <!-- S-10's BANNER slot, above the score. Its body is what `aria-describedby` points at, so the
         caveat cannot be missed by a user who lands directly on the number. -->
    {#if latest.sufficientData !== 'sufficient'}
      <section
        aria-labelledby="{uid}-suff-heading"
        class="flex flex-col gap-2 rounded-md border border-insufficient-border bg-insufficient-bg pm-hatch p-4 text-insufficient-fg"
      >
        <h2 id="{uid}-suff-heading" class="flex items-center gap-2 text-lg font-semibold">
          <SufficiencyGlyph />
          {#if latest.sufficientData === 'insufficient'}
            Insufficient data — risk score is not reliable
          {:else}
            Data sufficiency unknown — risk score is not reliable
          {/if}
        </h2>
        <p id="{uid}-suff-body" class="text-body">
          {#if latest.sufficientData === 'insufficient'}
            This reading reports insufficient data. The risk score below is not reliable, and the
            plain-language explanation and guideline references for this reading are withheld.
          {:else}
            This reading does not state whether its data were sufficient. It is treated exactly as
            insufficient: the risk score below is not reliable, and the explanation and references
            are withheld. Unknown sufficiency is not the same as sufficient.
          {/if}
        </p>
      </section>
    {/if}

    <!-- READING ORDER CHANGES WITH THE WIDTH, and no content moves in or out.
         On a phone the SCORE and the reading state are what a clinician opens this screen for, so
         they lead in the DOM. From `lg` there is room for two columns and the 60-minute history
         takes the wide one, so `order` sends the score column to the right. Screen readers and
         keyboard users follow the DOM, which is the mobile order — the one that puts the number
         and its caveat first.

         `xl -> lg`, 2026-08-23, at the product owner's request ("gộp reading state và
         respiratory-risk history vào cùng một hàng"). PulseMind's OWN breakpoint scale
         (`app.css`, "these REDEFINE the v4 defaults") makes `lg` 1280px, not Tailwind's stock
         1024 — the SAME width `app.css` calls the "desktop workstation — PRIMARY TARGET". Merging
         here instead of at `xl` (1728px) means a clinician on the app's own primary target width
         sees the merged row, not just on a wide monitor. `Reading state`'s narrow `<dl>` and the
         chart card both still fit their own content without wrapping at 1280px — the chart's own
         `PLOT.width` (640px) is what actually gates how narrow its column can go, not this
         breakpoint. -->
    <!-- THE STATUS ROW. The score, the review state and any integrity warning are three answers to
         "what is true about this patient right now", and each of them used to be a full-width block
         with its content in the left third and dead space in the rest — about 310px of vertical
         space, before "Reading state" had even started, on a 1280px laptop. Side by side they cost
         one row. Nothing was dropped or shortened to do it: the same sections, the same literals,
         laid out in two columns from `md` and stacked below it.

         SCORE COLUMN WIDENED FROM A FIXED `18rem` TO `1.5fr`, 2026-08-23, at the product owner's
         request ("cho chiều ngang risk score rộng ra"): the fixed 288px width predates PD-8 living
         inside this panel — once `ExplanationSection`'s prose moved in, 288px wrapped it to a narrow
         ladder of 2-3 words per line. `1.5fr` against the review/integrity column's `1fr` scales
         with the viewport rather than pinning a pixel value, and still leaves the review column
         (which only ever holds a warning banner and short status text) comfortably wide. -->
    <div class="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-5">
      <!-- PD-5 — current respiratory-risk score and risk band -->
      <section
        data-clarify="G-12"
        aria-labelledby="{uid}-score"
        class={[
          'flex flex-col gap-2 rounded-lg border p-4 shadow-card',
          latest.riskLevel === null ? RISK_PANEL_UNKNOWN : RISK_PANEL[latest.riskLevel],
        ]}
      >
        <!-- HEADING SHORTENED `Current respiratory-risk score` -> `Respiratory-risk score`,
             2026-08-23, at the product owner's request. The dropped word is `screens.md` PD-5's OWN
             section name, not harness copy — a stated deviation, same kind already made to PD-8's
             heading (see `ExplanationSection.svelte`'s file header) — never mandated by any
             `ui-states.md` row, so nothing here contradicts a fixed literal. -->
        <h2 id="{uid}-score" class={LABEL}>Respiratory-risk score</h2>

        <!-- SCORE+BAND AND EXPLANATION SHARE ONE ROW FROM `sm` (640px), 2026-08-23, at the product
             owner's request ("cho explanation nằm cùng hàng với 87.7% để màn hình đỡ trống"): stacked
             vertically, the panel's height was set by its TALLEST sibling (`Reading state` /
             `Ranked factors` used to be much taller once those grew), leaving a band of empty
             coloured space below `Critical` whenever the explanation was short. Score+band now sit
             in a narrow, non-shrinking left column and the explanation fills the rest of the width
             to its right, so the panel's own content — not empty space — is what makes it tall. Below
             `sm` (the score panel's own narrowest width, on a phone) it still stacks: there is no
             room for a second column once the panel itself is under ~400px. -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div class="flex shrink-0 flex-col gap-2 sm:w-32">
            <p
              class="flex items-baseline gap-3 text-value font-semibold tabular-nums md:text-hero"
              aria-describedby={latest.sufficientData !== 'sufficient'
                ? `${uid}-suff-body`
                : undefined}
            >
              {#if latest.riskScore !== null}
                <!-- Verbatim. No `%`, no `/100`, no gauge, no proportional bar — the range is
                     unconfirmed (**G-12**) and a gauge would assert one.

                     THE MARKER WAS MISSING HERE and rule 15 requires it at EVERY display point: the
                     chart axis, its tooltip and its data table all carried `unit not supplied` while
                     the one number a clinician actually reads carried nothing. Inside the same
                     nowrap element as the value, so the number cannot be screenshotted, read aloud
                     or pasted into a note without it. Same shared constant as the chart — one owner,
                     one spelling. -->
                <span class="whitespace-nowrap"
                  >{latest.riskScore}<span class="text-sm font-normal text-fg-muted"
                    >{RISK_SCORE_UNIT}</span
                  ></span
                >
              {:else}
                <!-- STATE S-35. Never `0`, never blank, never a bare em dash. -->
                <span class="text-xl" data-clarify="G-31">score unavailable</span>
              {/if}
            </p>

            <p class="flex items-center gap-2 text-lg font-semibold">
              <RiskGlyph level={latest.riskLevel} />
              {#if latest.riskLevel !== null}
                {latest.riskLevel}
              {:else}
                <!-- STATE S-05. Never `Low`. The level is never derived from the score. -->
                <span data-clarify="G-31">Risk level unavailable</span>
              {/if}
            </p>

            <!-- THE SCORE-SCALE NOTE WAS REMOVED 2026-08-17, at the product owner's instruction, the
                 same day it was written (**D-24**). It read `Score scale and unit: not supplied.`
                 plus a four-sentence body about what PulseMind had and had not been told, and before
                 that `Score scale and unit: Unspecified — see open question G-12`.

                 Both were addressed to the handoff team, not to the clinician. `G-12` is still OPEN
                 and is still recorded in `docs/spec/open-questions.md`, which is where a design gap
                 belongs; what a clinician can act on is the number and the band, and neither
                 changed. The register id survives on screen only as `data-clarify`, invisible, so
                 the P-09 gate still enumerates the gap from the DOM.

                 What this costs, stated rather than glossed: the third sentence used to say that no
                 mapping between score and band is defined, which is what stopped an `S-05` patient —
                 band slot empty — being triaged off the number instead. That protection now rests
                 entirely on `RiskChip` rendering `Risk level unavailable` in the band slot and on
                 the app never deriving a band anywhere in `src/`. Both still hold and both are
                 asserted, but the words are gone from the screen. Recorded in **D-24**. -->
          </div>

          <!-- PD-8, NESTED HERE since 2026-08-23, at the product owner's request ("nội dung explain
               của nó nên nằm trong div risk score luôn, cho dễ đọc"): `ExplanationSection` supplies
               its own heading and, for the withheld/S-37 branches, its own `bg-insufficient-bg`
               hatch treatment, so it reads correctly nested inside this panel's risk-band colour
               without a second bordered card. See `ExplanationSection.svelte`'s own file header for
               why it still owns the ONE merged withheld region for PD-9 too, even though PD-9 itself
               now renders below PD-10 (`GuidelineReferencesSection`). `min-w-0` so its prose wraps
               instead of forcing the row wider than the panel. -->
          <div class="min-w-0 flex-1 sm:border-l sm:border-border-subtle sm:pl-4">
            <ExplanationSection reading={latest} />
          </div>
        </div>
      </section>

      <div class="flex min-w-0 flex-col gap-3">
        <IntegrityWarnings warnings={snapshot.integrityWarnings} />

        <!-- PD-3 -->
        <ReviewPanel {snapshot} reviewAt={latest?.reviewAt ?? null} />
      </div>
    </div>

    <!-- THREE COLUMNS NOW, NOT TWO — `Ranked factors` moved in from its own full-width section
         below on 2026-08-23, at the product owner's request ("gộp Ranked factors contributing to
         the current score vào cùng với hàng reading state và respiratory-risk history"). Column
         weights are NOT even: `Reading state` (source order 2nd, `lg:order-2`) is the narrowest,
         `Ranked factors` (`lg:order-3`) the widest of the two flanking it, and the chart
         (`lg:order-1`) widest overall — the factor list holds parameter names (`Respiratory rate`,
         `Minute ventilation`, …) beside a number, and those names are what wrap first if the column
         is squeezed.

         THE TRACK ORDER IN THIS CLASS IS NOT LEFT-TO-RIGHT VISUAL ORDER — it is order-MODIFIED
         placement order, and getting the two confused is exactly how the chart ended up in the
         narrowest track instead of the widest one the first time this row was weighted. CSS grid
         auto-placement assigns un-positioned items to tracks in ascending `order` value, so the
         item carrying `lg:order-1` (the chart) claims TRACK 1 of this template regardless of where
         `order` visually renders it, `lg:order-2` (Reading state) claims track 2, and `lg:order-3`
         (Ranked factors) claims track 3 — so track 1 below carries the CHART's fr value, not
         `Reading state`'s, even though `Reading state` reads first in this file's source order.
         Confirmed empirically after the fact via each section's `getBoundingClientRect()` at
         1320px, because the mismatch is invisible from the class string alone.

         `Reading state` SHRUNK to `0.55fr` (was `0.85fr`) and the chart GREW to `1.35fr` (was
         `1fr`), 2026-08-23, at the product owner's request ("chart đang bị quá nhỏ, không thấy
         được, nên giảm space của reading state"): the chart's own `PLOT.width` (640px) had been the
         widest fixed content in the row, but at `1fr` its column still rendered narrower than
         `Ranked factors`'s `1.3fr`, so the SVG scaled down hard enough to read as illegible on a
         1280px screen. `Reading state`'s four `<dl>` rows are short label/value pairs that do not
         wrap until well below `0.55fr`'s share of the row, so it is the column with the most slack
         to give up. The chart itself still has no fixed pixel floor to defend: it is an SVG with
         its own `viewBox` and `w-full`, so it scales fluidly rather than overflowing at any width
         this grid can produce. -->
    <div
      class="grid min-w-0 gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.55fr)_minmax(0,1.25fr)]"
    >
      <!-- PD-6 — reading state. A DIRECT grid child, same as the `History` and `Ranked factors`
           sections beside it — it used to be wrapped in its own `flex flex-col` div, which is why
           it rendered SHORTER than its siblings when `Data sufficiency` was `Sufficient` (its
           shortest possible content): the grid's `align-items: stretch` default stretches a DIRECT
           grid child to the row's full height, but that stretch is a cross-axis effect, and a
           `flex-col` wrapper's cross axis is WIDTH, not height — so the wrapper div stretched while
           the `<section>` inside it kept only its own content height, leaving invisible slack below
           it. Dropping the wrapper and putting `lg:order-2` on the section itself fixes it the same
           way `History` and `Ranked factors` already work. Found 2026-08-23, at the product owner's
           report ("nếu data sufficient thì chiều dọc của nó bị ngắn hơn so với 2 khung khác"). -->
      <section aria-labelledby="{uid}-reading-state" class="{CARD} min-w-0 lg:order-2">
        <h2 id="{uid}-reading-state" class="text-lg font-semibold">Reading state</h2>

        <!-- THE NUMBER IN EACH ROW IS NOW `text-xl font-bold`, 2026-08-23, at the product
               owner's request ("những con số quan trọng nên cho size chữ to ra, đậm hơn"): these
               four rows are the clinical facts a clinician re-checks most often on this card, and
               at plain `text-body` weight the number read no louder than the label above it or
               the word "readings" beside it. Only the NUMBER moved — the surrounding words
               ("readings at this level") stay `text-body`, so the emphasis lands on the value a
               clinician is actually scanning for, not the sentence around it.

               `text-accent-fg`, ADDED HOURS LATER ("đổi màu sắc cho nổi bật hơn") — bold black on
               white read as heavier but not as a DIFFERENT colour, and the product owner asked for
               colour specifically. `accent` is a reuse rather than a new hue: nothing here is
               risk-severity-coded (that vocabulary belongs to `RISK_PANEL`, on the score above, and
               reusing it for a neutral count would claim a severity these four facts do not carry),
               so the alternative was inventing a SIXTH clinical hue for "emphasised but not
               severity-coded", which rule 8's one-hue-per-meaning discipline argues against more
               than it argues for reusing accent here. These four values are not links and do not
               act like ones (no underline, no hover state, no `onclick`), so the risk is confined
               to a sighted user's first glance reading them as clickable — worth watching, not
               worth a new token for four rows on one card. -->
        <dl class="flex flex-col gap-3">
          <div>
            <dt class={LABEL}>Readings held at this level</dt>
            <dd class="text-body">
              <!-- STATE S-38, in its three renderings and no fourth. -->
              {#if held.kind === 'unavailable'}
                <!-- Both sentence-final periods are part of the literal. Never a count beside an
                       S-05 chip: a run of unknown levels is never counted. -->
                <span class="text-insufficient-fg">
                  Readings held at this level: unavailable. The latest reading has no risk level.
                </span>
              {:else if held.truncated}
                <!-- The `≥` glyph is U+2265. The ASCII `>= N` form is a retired spelling. -->
                <span class="text-xl font-bold text-accent-fg tabular-nums">≥ {held.count}</span> readings
                at this level
              {:else}
                <span class="text-xl font-bold text-accent-fg tabular-nums">{held.count}</span> readings
                at this level
              {/if}
            </dd>
          </div>

          <div>
            <dt class={LABEL}>Data sufficiency</dt>
            <dd class="text-body">
              {#if latest.sufficientData === 'sufficient'}
                <span class="text-xl font-bold text-accent-fg">Sufficient</span>
              {:else}
                <InsufficientChip sufficiency={latest.sufficientData} />
              {/if}
            </dd>
          </div>

          <div>
            <!-- F-7: **G-11** is still OPEN, but the product owner has confirmed as a STATED
                   ASSUMPTION that both shares are 0–1 fractions ("Xác nhận: đúng là %", 2026-08-23)
                   — see `toPercent()` above and `docs/spec/open-questions.md` G-11 for the full
                   override record. Still no proportional bar: a bar would additionally assert that
                   this 0–100 range is meant to be read as a fill level, which was never asked for. -->
            <dt class={LABEL}>imputed share</dt>
            <dd class="text-xl font-bold text-accent-fg tabular-nums">
              {toPercent(latest.imputedShare)}%
            </dd>
          </div>

          <div>
            <dt class={LABEL}>documentation share</dt>
            <dd class="text-xl font-bold text-accent-fg tabular-nums">
              {toPercent(latest.documentationShare)}%
            </dd>
          </div>
        </dl>
      </section>

      <!-- PD-4 — 60-minute respiratory-risk history. Second on a phone (see the wrapper comment),
           first in the left column from `xl`. -->
      <!-- The 60-minute history says WHEN this reading was reviewed, because "has this been looked
           at" is the question a clinician brings to a trend. The two sources are labelled apart: a
           mark made on this screen is local and unsaved, and saying so beside the time is the only
           thing stopping it reading as a recorded review (RULE TWO). -->
      <section aria-labelledby="{uid}-history" class="{CARD} min-w-0 lg:order-1">
        <!-- HEADER RESTRUCTURED 2026-08-23, at the product owner's request, against a reference
             mockup: an eyebrow row (`RISK HISTORY`) above the existing title row, rather than the
             old single `<h2>` + review-status row. `Risk-score history` was already a stated
             deviation from `screens.md` PD-4's own section name ("60-minute respiratory-risk
             history") — see the removed comment this replaces — and the eyebrow brings that fact
             back onto the screen in its own slot instead of folding it into the title, which is
             what the mockup does.

             THE MOCKUP'S "LATEST" READOUT WAS REMOVED AGAIN HOURS LATER ("đang bị lặp risk score.
             xoá risk score trong table"): it repeated the exact same number the PD-5 hero panel
             already prints two inches above it, at full `text-hero` size — a genuine duplicate, not
             a second fact. `RiskHistoryChart`'s own per-point labels stay removed; the chart's
             clean line was never the complaint. -->
        <p class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase">
          Risk history
        </p>

        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="{uid}-history" class="text-lg font-semibold">
            Respiratory-risk score · last 60 minutes
          </h2>

          {#if markedHere !== undefined}
            <!-- Marked on THIS screen. The caveat travels with the time, every time: without it a
                 timestamp beside a chart reads as a recorded review, which is the one misreading
                 RULE TWO exists to prevent. -->
            <p class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-secondary">
              <span class="font-semibold text-fg">
                Marked reviewed <AbsoluteTime iso={markedHere.toISOString()} />
              </span>
              <span>on this screen — not saved to the patient record</span>
            </p>
          {:else if latest.reviewAt !== null}
            <!-- Reported by the assessment data, which is a different fact and says so. -->
            <p class="text-sm text-fg-secondary">
              <span class="font-semibold text-fg">
                Reviewed <AbsoluteTime iso={latest.reviewAt.toISOString()} />
              </span>
              — reported by the assessment data.
            </p>
          {:else}
            <p class="text-sm text-fg-secondary">Not reviewed yet.</p>
          {/if}
        </div>

        {#if points.length >= 2}
          <RiskHistoryChart
            {points}
            rows={tableRows}
            unitLabel={RISK_SCORE_UNIT}
            riskLevel={latest.riskLevel}
            isLive={liveSource}
          />
        {:else}
          <!-- F-2: below two plotted points there is no 60-minute view, and a single point is never
               drawn as a flat line. The literal is F-2's own. `bg-chart-plot-bg`, not
               `bg-surface-sunken`, 2026-08-23: this box stands in for the chart itself, so it takes
               the same lightened background the chart now uses, for the same reason. -->
          <p
            class="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border bg-chart-plot-bg p-4 text-center text-body text-fg-secondary"
          >
            insufficient history for a 60-minute view
          </p>
        {/if}
      </section>

      <!-- PD-7 — ranked factors contributing to the current score -->
      <section aria-labelledby="{uid}-factors" class="{CARD} min-w-0 lg:order-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="{uid}-factors" class="text-lg font-semibold">
            Ranked factors contributing to the current score
          </h2>
          <p class="text-sm text-fg-muted">
            Source is this reading's contributors, not the flag-time list.
          </p>
        </div>

        {#if contributors.length > 0}
          <ol class="flex flex-col gap-2">
            <!-- Ordered by F-4 (contribution descending, then name via Intl.Collator) — so index 0
               is, by construction, THE reading's largest contribution. SIGN is still printed
               verbatim — `contribution` is never `Math.abs`'d, **G-24** never settled that
               question. The SCALE half of G-24 has: the product owner confirmed, same as
               `imputedShare`/`documentationShare` (G-11), that this is a 0–1 fraction, so it is
               now `toPercent()`'d rather than re-normalised — that confirmation is what retired the
               "not supplied" note that used to sit below this list; see
               `docs/spec/open-questions.md` G-24 for the full override record.

               SIZE, 2026-08-23 ("tăng size chữ và số cho factors contribution (cho màu)", then
               again hours later "cho chữ phần factor contributing to hơn"): the factor name moved
               `text-body` -> `text-lg`, the number `text-lg` -> `text-xl` for every row.

               THE TOP ROW GETS ITS OWN TREATMENT, at the product owner's follow-up request ("cái
               nào có contribution lớn nhất thì cho màu khác nổi hơn, bold hơn"): a filled pill at
               `text-2xl font-extrabold`. FIRST built with `bg-accent-solid`/`text-on-accent` (the
               same pairing `control-classes.ts` uses for a primary button), then changed to
               `bg-risk-critical-solid`/`text-risk-critical-on` — RED — hours later, at an explicit
               follow-up ("factor contribution nằm thứ nhất cho màu đỏ để nổi bật hơn").

               THIS IS A DELIBERATE HUE REUSE, not an oversight of rule 8: `risk-critical` is the
               SAME red `RISK_PANEL`/`RiskChip` use for the `Critical` risk band, spent here on a
               fact that is not risk-band severity — a reading's single largest contributing factor
               can be the top driver at ANY risk level, `Low` included. Colour is still not the sole
               channel carrying that fact: rank ("1."), position (first in an ordered list) and size
               (`text-2xl` vs `text-xl`) all say the same thing independently, so a reader who cannot
               distinguish the red loses emphasis, not information — the same guarantee rule 8
               itself asks for. Recorded here rather than silently reused, so a future audit finds
               the reasoning next to the class name instead of re-deriving it. Rows 2+ stay
               `text-accent-fg` on the plain background, unchanged. -->
            {#each contributors as contributor, i (contributor.name)}
              <li
                class="flex items-center justify-between gap-4 border-b border-border-subtle pb-2"
              >
                <span class="text-lg">
                  <span class="text-sm text-fg-muted tabular-nums">{i + 1}.</span>
                  {contributor.name}
                </span>
                {#if i === 0}
                  <span
                    class="rounded-md bg-risk-critical-solid px-2 py-0.5 text-2xl font-extrabold text-risk-critical-on tabular-nums"
                    >{toPercent(contributor.contribution)}%</span
                  >
                {:else}
                  <span class="text-xl font-bold text-accent-fg tabular-nums"
                    >{toPercent(contributor.contribution)}%</span
                  >
                {/if}
              </li>
            {/each}
          </ol>
        {:else}
          <!-- F-4: never a fabricated driver, never the highest-valued parameter as a stand-in. -->
          <p class="text-body">No ranked factors available</p>
        {/if}
      </section>
    </div>

    <!-- PD-10 — respiratory parameter table -->
    <section aria-labelledby="{uid}-parameters" class="flex min-w-0 flex-col gap-3">
      <h2 id="{uid}-parameters" class="text-lg font-semibold">Respiratory parameters</h2>

      {#if parameterRows.length > 0}
        <ParameterTable
          patientId={snapshot.patientId}
          chartTime={latest.charttime}
          rows={parameterRows}
        >
          {#snippet row(vm)}
            <ParameterRow
              row={vm}
              href={resolve('/patients/[patientId]/parameters/[parameterSlug]', {
                patientId: snapshot.patientId,
                parameterSlug: vm.slug,
              })}
              current={vm.slug === returnedFromSlug}
            />
          {/snippet}
        </ParameterTable>
      {:else}
        <!-- The empty case is rendered BESIDE the table rather than as a spanning row inside it: the
             table contract bans `colspan` outright, because a spanning cell breaks the header
             association that makes the table readable to a screen reader in the first place. An
             empty table would also read as "no parameters" without saying why. -->
        <p
          class="rounded-lg border border-insufficient-border bg-insufficient-bg p-4 text-body text-insufficient-fg"
        >
          This reading carried no parameters. Nothing has been merged from an older reading to fill
          the table — frontend backfill would be a second, invisible carry-forward on top of the one
          the backend already models through <code>source</code>.
        </p>
      {/if}
    </section>

    <!-- PD-9 — moved BELOW PD-10 on 2026-08-23, at the product owner's request ("cho Respiratory
         parameters nằm trên guideline references"); previously sat at the end of the merged
         Reading-state/History/Ranked-factors row above. No longer inside that grid, so the
         `lg:order-4`/`lg:col-span-3` placement trick that row needed no longer applies — this is
         now a plain full-width section like PD-10 itself.

         STILL CONDITIONAL ON THE SAME GATE `GuidelineReferencesSection` checks internally — same
         phantom-gap defect this app already fixed once for `SourceBanner`
         (`routes/patients/[patientId]/+page.svelte`): an element that renders nothing must occupy
         nothing, or `gap-4`/`gap-5` on this column still reserves a row for it. -->
    {#if latest.sufficientData === 'sufficient'}
      <GuidelineReferencesSection reading={latest} />
    {/if}
  {/if}
</div>
