<!-- src/lib/components/RiskTally.svelte
     CANONICAL DECLARATION — this file.

     The unit's shape in one line: how many patients sit in each risk band right now.

     It answers the question a clinician arriving at a board actually has — "how bad is it in here" —
     which thirty cards can only answer by being counted. Harness-defined, pending design
     confirmation (**D-01**); the handoff describes no summary of this kind.

     WHAT IT IS NOT. It is not a gauge, a bar, a proportion, or a trend. `risk_score` is unscaled and
     its range is undefined (CLAUDE.md rule 16), and drawing bands as relative widths would invent
     exactly the scale that rule forbids. Every cell is a COUNT of a schema field and prints verbatim.

     Colour never leads here either: each cell carries the band's full text label, its severity glyph,
     and the same fill-weight ladder the chips use (`RISK_CHIP`). Read in greyscale the five cells stay
     distinguishable by weight and by their words.

     EACH CELL IS ALSO A FILTER (**D-18**), and the counts stay across the whole loaded set while one
     is active — a tally that narrowed to its own selection would show zero in every other band and
     leave no way back. Selecting the active band clears it.

     `unknown` is a CELL, not an omission. A missing or unrecognised `risk_level` is state S-05, and a
     patient who is absent from the tally is a patient the unit cannot see — the count must always sum
     to the loaded set.

     `dataLimited` MERGED IN on 2026-08-23, at the product owner's request: `?filter=data-limited`
     used to be its own fieldset (`TriageFilters`, now deleted) sitting beside this tally; it renders
     here now as the row's leading cell so the two controls read as one. It stays a SEPARATE filter
     dimension underneath — its own `onselect`, its own colour — the merge is visual only. Solid
     border (not dashed): a known state, not an absent one.

     `sufficiencyUnknown` ADDED THE SAME DAY: the F-6 `sufficientData === null` state — "data
     sufficiency unknown" on `InsufficientChip` — had no filter before this, only a per-card badge.
     A separate `?filter=` value from `dataLimited` (`insufficient` vs `null` are different facts
     about the same field). Dashed border: still an absence, unlike `Data-limited`.

     `needsReview` / `reviewed` — added hours after being REMOVED as "redundant" with the board's
     own review-status grouping (OV-4). The grouping labels a block; it does not shrink the page.
     Only a filter drops the OTHER groups from the DOM, which is the only thing that actually saves
     a clinician who wants just `Reviewed` from scrolling past every `Pending review` card first.

     COLOUR, ALL FIVE NON-RISK CELLS: re-solved WHOLESALE on 2026-08-23, after a colourblind
     clinician sent a simulated screenshot of this row and several cells were indistinguishable.
     Each colour above had been picked or re-picked SEPARATELY as it was added — checked against
     whatever existed at that moment, never against the full nine-cell set this row ended up with
     (the four risk fills plus these five). `separationReport` run across all nine, under all three
     Machado dichromacies, found FIVE pairs under this file's own 15-ΔE2000 floor (**D-26**) — worst
     was `Critical` vs `Reviewed` at 3.5 under deuteranopia: darkening `Critical` for legible white
     text (its own comment) and `Reviewed`'s already-white-ink fill had landed at nearly the SAME
     lightness, and deuteranopia cannot read red from green at all — lightness was the only channel
     left to tell them apart, and there was almost none.

     `review-pending-solid` (the `needsReview` cell, and the "Pending review" badge on every pending
     card — the Handoff's PROMINENT state) and `insufficient-solid` (`Risk level unavailable`, on
     every unrecognised-risk card) were left EXACTLY as deployed, on purpose: both have wide use well
     beyond this row, and restyling either is a bigger call than a filter-row fix carries. `Reviewed`,
     `data sufficiency unknown` and `Data-limited` — new or contained to this row — were re-solved
     together against those two fixed anchors plus the four risk fills, across all four vision
     models at once: `Reviewed` moved hue 152 -> 164 and to a NEW fixed-lightness solid (`whiteInk:
     true -> false`, since white only cleared 3.6:1 at the lightness separation needed); `data
     sufficiency unknown` moved hue 120 -> 110; `Data-limited` moved hue 195 -> 340 (having briefly
     been 355 in an earlier, less rigorous pass — see `scripts/build-tokens.mjs` for that history).
     Every pair this file could still move now measures >= 14.6 ΔE2000 under the worst of the four
     models — short of the full 15 (nine colours sharing two fixed anchors leaves less open wheel
     than four), but close.

     WHAT THIS DID NOT FIX, stated rather than buried: `review-pending-solid` vs `insufficient-solid`
     — `Needs review` vs `Risk level unavailable` — still measures only 8.0 ΔE2000 under
     deuteranopia and 8.8 under protanopia. This is a PRE-EXISTING gap this pass did not introduce
     and could not close without restyling one of two widely-used badges, which is why it was left
     alone rather than folded into this fix silently. It is the worst pair in the app's whole
     nine-colour clinical palette and the next thing to decide on.

     `uppercase` ADDED TO EVERY LABEL IN THE `Risk` AND `Data` ROWS, same pass, at the product
     owner's request — a SECOND, independent reinforcement of the point above: colour is never the
     only channel here (rule 8), but a re-solve can only push separation so far on a nine-colour
     wheel, and the WORDS were the one channel with room left to strengthen. Capitals scan faster as
     a block shape, which matters most exactly when two fills are close. CSS `text-transform` only —
     the DOM text is untouched, so every mandated literal (`Risk level unavailable`,
     `data sufficiency unknown`, …) still renders its exact spelling to assistive tech; this is
     the same technique the `Review` / `Data` / `Risk` row captions already used. -->
<script lang="ts">
  import { RISK_CHIP, RISK_CHIP_UNKNOWN } from '$lib/design/risk-classes';
  import type { RiskFilter, RiskLevel } from '$lib/domain/types';
  import RiskGlyph from './RiskGlyph.svelte';
  import ReviewGlyph from './ReviewGlyph.svelte';
  import SufficiencyGlyph from './SufficiencyGlyph.svelte';

  let {
    counts,
    total,
    selected = null,
    onselect,
    needsReview,
    reviewed,
    dataLimited,
    sufficiencyUnknown,
  }: {
    counts: Readonly<Record<RiskFilter, number>>;
    /** The loaded set this was counted across, so the scope is stated rather than assumed. */
    total: number;
    /** The band currently filtering the board, or `null` for every band. */
    selected?: RiskFilter | null;
    /** Toggling: selecting the active band clears it. Omit to render a read-only tally. */
    onselect?: (band: RiskFilter | null) => void;
    /**
     * REINSTATED 2026-08-23, at the product owner's request: `?filter=needs-review`. Only a filter
     * removes the OTHER review-status groups from the DOM — the board's own grouping labels a
     * block but does not shrink the page. Omit to render neither review-status cell.
     */
    needsReview?: {
      count: number;
      selected: boolean;
      onselect: () => void;
    };
    /** `needsReview`'s mirror — `?filter=reviewed`. See that prop's comment. */
    reviewed?: {
      count: number;
      selected: boolean;
      onselect: () => void;
    };
    /**
     * MERGED IN ON 2026-08-23, at the product owner's request: `?filter=data-limited` — a
     * different dimension from the five bands above, previously its own fieldset beside this
     * tally — now renders as the row's leading cell instead, so the two controls read as one.
     * Omit to render the tally alone.
     */
    dataLimited?: {
      count: number;
      selected: boolean;
      onselect: () => void;
    };
    /**
     * ADDED 2026-08-23, at the product owner's request: `?filter=sufficiency-unknown` — the F-6
     * `sufficientData === null` state, previously visible only as a per-card badge with no way to
     * isolate the group. A separate `?filter=` value from `dataLimited` above (`insufficient` vs
     * `null` are different facts about the same field). Omit to render neither cell.
     */
    sufficiencyUnknown?: {
      count: number;
      selected: boolean;
      onselect: () => void;
    };
  } = $props();

  /**
   * `aria-pressed` on a toggle button — always
   * present as `true`/`false`, never omitted when off, so a screen-reader user is told the state of
   * every band rather than having to visit each one to find the active one.
   *
   * `focus-visible:pm-focus-filled`, NOT the plain `pm-focus` this cell shipped with until
   * 2026-08-23 — `control-classes.ts` documents exactly why that was wrong: "`pm-focus` rings
   * against the page, and `pm-focus-filled` inverts so the ring stays visible on a SOLID fill,
   * where an outer ring the same colour as the button is no ring at all." Every cell here IS a
   * solid fill, and measured, several of them left the plain outline under 3:1 against their own
   * fill (`Risk level unavailable`'s navy measured 1.0; `Reviewed`'s green 1.12) — a keyboard user
   * tabbing through this row could not always see where focus was. `rounded-sm`, down from
   * `rounded-md`: the product owner asked the row read as less "bubble-shaped".
   */
  const CELL =
    'inline-flex min-h-11 min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-sm border ' +
    'px-2.5 py-1 text-sm font-semibold focus-visible:pm-focus-filled';

  /**
   * The SELECTED band is marked by a second, thicker ring drawn outside its own border, never by a
   * colour change: each cell already wears its band's fill weight, and recolouring the active one
   * would overwrite the very channel that says which band it is (CLAUDE.md rule 8).
   *
   * WIDENED 2026-08-23: `ring-offset-canvas` already paints the gap between the cell's own border
   * and the ring in `--color-canvas`, so the ring's OWN contrast pair is against canvas (5.55:1
   * light, 5.38:1 dark — both clear SC 1.4.11), never against the cell's fill directly. At 2px
   * that gap read as too thin to register as a deliberate ring on the darker fills (`Reviewed`,
   * `data sufficiency unknown`) rather than a colour glitch; 3px is the fix, same technique.
   */
  const SELECTED_RING = 'ring-2 ring-accent-solid ring-offset-[3px] ring-offset-canvas';

  /** `Data-limited`'s OWN colour — see the file header for the AA figures. */
  const DATA_LIMITED_CELL = 'border-datalimited-solid bg-datalimited-solid text-datalimited-on';

  /**
   * `data sufficiency unknown`'s OWN colour, no longer `RISK_CHIP_UNKNOWN`'s navy — see the file
   * header. Dashed border kept: still means "we do not know", like `Risk level unavailable` two
   * cells over, just about a different field, and only the FILL needed to stop being identical.
   */
  const SUFFICIENCY_UNKNOWN_CELL =
    'border-dashed border-datasufficiencyunknown-on bg-datasufficiencyunknown-solid text-datasufficiencyunknown-on';

  /** The SAME colours `ReviewChip` wears for these two statuses — see the file header. */
  const NEEDS_REVIEW_CELL =
    'border-review-pending-solid bg-review-pending-solid text-review-pending-on';
  const REVIEWED_CELL = 'border-review-done-solid bg-review-done-solid text-review-done-on';

  /**
   * Worst first. This is the reading order of a triage board, and it matches the ranking comparator's
   * own risk ordering — a tally that started at `Low` would put the least urgent number where the eye
   * lands first.
   */
  const BANDS = ['Critical', 'High', 'Medium', 'Low'] as const satisfies readonly RiskLevel[];
</script>

<!-- THREE ROWS, NOT ONE — restructured 2026-08-23, at the product owner's request ("hàng filter
     đang không được bố trí tốt"). Nine chips in a single wrapping row is exactly the
     undifferentiated-list anti-pattern faceted-filter UX guidance warns against: "cluster related
     filters under labelled, scannable groups rather than one long undifferentiated list"
     (uxpin.com/studio/blog/filter-ui-and-ux, pencilandpaper.io's enterprise-filtering pattern
     analysis). Each row below is its OWN filter dimension with its OWN short caption — Review,
     Data, Risk — so the eye parses which chips answer which question instead of scanning nine
     equal-weight buttons for the one it wants. The risk row stays undifferentiated internally
     (still one list of five bands): it is the tally's original purpose (**D-01**, "how bad is it
     in here") and grouping bands by anything but severity would invent a distinction the schema
     does not make. -->
<!-- `pm-tally-heading` DROPPED TO `sr-only` 2026-08-23, at the product owner's request ("cột
     filter chia vậy tốt nhưng hiện tại nó đang chiếm nhiều space quá"): the word "Filter" printed
     on its own line above three rows already captioned `Review` / `Data` / `Risk` was one line of
     vertical space repeating what the rows already say. The heading still NAMES the section for
     assistive tech via `aria-labelledby` — nothing here lost its accessible name, only its own
     visible line. -->
<section aria-labelledby="pm-tally-heading" class="flex min-w-0 flex-col gap-1.5">
  <h3 id="pm-tally-heading" class="sr-only">Filter</h3>

  {#if needsReview || reviewed}
    <div class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      <span class="w-14 shrink-0 text-micro font-semibold text-fg-muted uppercase">Review</span>
      <ul class="flex min-w-0 flex-wrap gap-1.5" aria-label="Review status, filters the board">
        {#if needsReview}
          <li class="flex min-w-0">
            <button
              type="button"
              aria-pressed={needsReview.selected}
              onclick={needsReview.onselect}
              class={[CELL, NEEDS_REVIEW_CELL, needsReview.selected ? SELECTED_RING : undefined]}
            >
              <ReviewGlyph status="pending_review" />
              <!-- `Needs review` -> `Pending review`, 2026-08-23, at the product owner's request
                   ("cái filter 'needing review' đổi thành 'pending review'"): this filter chip had
                   drifted to its own spelling of the exact status `reviewLabel('pending_review')`
                   already owns everywhere else on screen (PD-3's panel, the board row's chip) —
                   now one spelling, not two, for the same `ReviewStatus` value.

                   `uppercase` ADDED THE SAME DAY ("filter của review có size chữ bé hơn filter của
                   data và risk"): both chips already shared `CELL`'s `text-sm` — the SAME declared
                   size as every Data/Risk chip — but mixed-case glyphs read smaller than upper-case
                   ones at an identical font-size, which is what the report actually measured. Data
                   and Risk's labels have carried `uppercase` since 2026-08-23 (`docs/spec/screens.md`
                   OV-3); Review's two never had it. CSS `text-transform` only, per that same
                   precedent — the DOM text, and every other spelling of these two statuses in the
                   app, stays mixed-case. -->
              <span class="whitespace-nowrap uppercase">Pending review</span>
              <span class="tabular-nums">{needsReview.count}</span>
            </button>
          </li>
        {/if}

        {#if reviewed}
          <li class="flex min-w-0">
            <button
              type="button"
              aria-pressed={reviewed.selected}
              onclick={reviewed.onselect}
              class={[CELL, REVIEWED_CELL, reviewed.selected ? SELECTED_RING : undefined]}
            >
              <ReviewGlyph status="reviewed" />
              <!-- `uppercase`, same request and same reasoning as `Pending review` above. -->
              <span class="whitespace-nowrap uppercase">Reviewed</span>
              <span class="tabular-nums">{reviewed.count}</span>
            </button>
          </li>
        {/if}
      </ul>
    </div>
  {/if}

  {#if dataLimited || sufficiencyUnknown}
    <div class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      <span class="w-14 shrink-0 text-micro font-semibold text-fg-muted uppercase">Data</span>
      <ul class="flex min-w-0 flex-wrap gap-1.5" aria-label="Data quality, filters the board">
        {#if dataLimited}
          <li class="flex min-w-0">
            <button
              type="button"
              aria-pressed={dataLimited.selected}
              onclick={dataLimited.onselect}
              class={[CELL, DATA_LIMITED_CELL, dataLimited.selected ? SELECTED_RING : undefined]}
            >
              <SufficiencyGlyph />
              <span class="whitespace-nowrap uppercase">Data-limited</span>
              <span class="tabular-nums">{dataLimited.count}</span>
            </button>
          </li>
        {/if}

        {#if sufficiencyUnknown}
          <li class="flex min-w-0">
            <button
              type="button"
              aria-pressed={sufficiencyUnknown.selected}
              onclick={sufficiencyUnknown.onselect}
              class={[
                CELL,
                SUFFICIENCY_UNKNOWN_CELL,
                sufficiencyUnknown.selected ? SELECTED_RING : undefined,
              ]}
            >
              <SufficiencyGlyph />
              <span class="whitespace-nowrap uppercase" data-clarify="G-31"
                >data sufficiency unknown</span
              >
              <span class="tabular-nums">{sufficiencyUnknown.count}</span>
            </button>
          </li>
        {/if}
      </ul>
    </div>
  {/if}

  <div class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
    <span class="w-14 shrink-0 text-micro font-semibold text-fg-muted uppercase">Risk</span>
    <!-- A list, not a row of divs: it IS a list of five counts, and a screen reader announcing
         "list, 5 items" before them is the structure a sighted user gets from the layout. -->
    <ul
      aria-label="Risk levels across all {total} loaded patients — select a band to filter the board"
      class="flex min-w-0 flex-wrap gap-1.5"
    >
      {#each BANDS as band (band)}
        <li class="flex min-w-0">
          <button
            type="button"
            aria-pressed={selected === band}
            onclick={() => onselect?.(selected === band ? null : band)}
            disabled={!onselect}
            class={[CELL, RISK_CHIP[band], selected === band ? SELECTED_RING : undefined]}
          >
            <RiskGlyph level={band} />
            <span class="whitespace-nowrap uppercase">{band}</span>
            <span class="tabular-nums">{counts[band]}</span>
          </button>
        </li>
      {/each}

      <!-- S-05's own treatment, never a copy of `Low` and never dropped when the count is zero: a
           permanently-visible zero is what makes its appearance meaningful. -->
      <li class="flex min-w-0">
        <button
          type="button"
          aria-pressed={selected === 'unknown'}
          onclick={() => onselect?.(selected === 'unknown' ? null : 'unknown')}
          disabled={!onselect}
          class={[CELL, RISK_CHIP_UNKNOWN, selected === 'unknown' ? SELECTED_RING : undefined]}
        >
          <RiskGlyph level={null} />
          <span class="whitespace-nowrap uppercase" data-clarify="G-31">Risk level unavailable</span
          >
          <span class="tabular-nums">{counts.unknown}</span>
        </button>
      </li>
    </ul>
  </div>
</section>
