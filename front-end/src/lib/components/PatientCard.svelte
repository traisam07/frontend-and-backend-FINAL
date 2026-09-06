<!-- src/lib/components/PatientCard.svelte
     CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` sections 1 and 5.

     THE CARD IS A LINK, AND THAT OVERRIDES THE HANDOFF. Handoff section 3 says "Select that
     patient … Do not navigate yet" and section 7 says "Click patient card → Select patients only";
     this card navigates to Patient Detail instead. The product owner asked for it directly, with the
     conflict stated, and confirmed it — recorded as **D-22** so the handoff team can see a decision
     rather than a drift. Selection is gone with it: there is nothing to select for, so the board has
     no `?selected=`, no selected-patient panel and no mobile selection bar, and the right column
     carries the review history instead.

     An `<a href>` and not a `<button>` + `goto`, because it IS navigation: middle-click, right-click
     → open in new tab, and "copy link address" all work, the browser shows the target on hover, and
     the keyboard contract is the one every user already knows. Nothing focusable goes inside it — a
     link inside a link is invalid and destroys keyboard order.

     STRING OWNERSHIP: this card hand-writes no clinical literal. `ReviewChip` renders
     `reviewLabel(status)`; `RiskChip` owns `Risk level unavailable` (S-05) and `score unavailable`
     (S-35); `InsufficientChip` owns both S-10 badge labels. The card owns only U-22's time-slot
     literal and the F-4 empty-list literal, both of which are its own slots. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PatientSummary, ReviewStatus } from '$lib/domain/types';
  import { primaryDriver } from '$lib/domain/derive';
  import RiskChip from './RiskChip.svelte';
  import ReviewChip from './ReviewChip.svelte';

  interface Props {
    patient: PatientSummary;
    rank: number;
    /** Already resolved by the board, which builds it with `resolve()`. */
    href: string;
    /**
     * The review state to DISPLAY, which folds in a local `Mark as reviewed`. Optional so a test or
     * a read-only view can render the card without a board.
     */
    reviewStatus?: ReviewStatus;
    /** Optional trailing content, e.g. a data-limited chip. */
    badges?: Snippet;
  }

  let { patient, rank, href, reviewStatus, badges }: Props = $props();

  const uid = $props.id();

  // Fixed reading order: identity, review, risk+score, driver. Review comes BEFORE risk because it
  // drives the ranking (Handoff section 3). `held` (readings-at-level) and `time` (assessed-as-of)
  // dropped from the card on 2026-08-23 along with their columns — see `BOARD_COLS` in
  // `+page.svelte` for the deviation note.
  const nameIds = `${uid}-id ${uid}-review ${uid}-risk ${uid}-driver`;

  const status = $derived(reviewStatus ?? patient.reviewStatus);

  // F-4 via the helper. `topContributors[0]` would take element [0] of an array the schema never
  // promised was ranked, so the card could name the wrong driver (G-27). `$derived`, not a plain
  // const: the board reuses this component as it re-sorts.
  const driver = $derived(primaryDriver(patient.topContributors));
</script>

<!-- The `<li>` chains the subgrid through. `grid-cols-subgrid` on the `<a>` alone does nothing:
     subgrid inherits from the element's OWN grid parent, and that is this `<li>`, not the `<ul>`.
     Making the `<li>` `display: contents` would also work and would cost the list its item
     semantics — a "Triage board, 30 patients" list that no longer counts to 30. Two links in the
     chain is the version that keeps both.

     ZEBRA STRIPING, `lg`-ONLY — added 2026-08-23 ("trống", the row list read as bare). It targets
     the `<a>` from HERE, on the `<li>`'s own `nth-child`, because the `<a>` is the sole child of
     each `<li>` and would always match `nth-child(odd)` if asked about itself. Below `lg` nothing
     changes: each card already carries its own bordered, shadowed box, and alternating THAT would
     compete with the shadow rather than read as a table row. -->
<li
  class="lg:col-span-full lg:grid lg:grid-cols-subgrid lg:[&:nth-child(even)_a]:bg-surface-sunken"
>
  <a
    {href}
    class={[
      'flex min-h-24 w-full min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-surface p-3 text-left no-underline shadow-card md:p-4',
      // ONE ROW ON THE BOARD'S OWN COLUMNS from `md`. The card no longer defines a private grid: it
      // takes the columns the `<ul>` declares, via `grid-cols-subgrid`, so every card's slots land on
      // the same x down the whole block and the eye runs down a column instead of reading thirty
      // cards one at a time.
      //
      // `col-span-full` first, then `grid-cols-subgrid`: the link must occupy every column of the
      // parent track before it can subdivide by it. The two inner wrappers become
      // `display: contents` at the same breakpoint so their boxes get out of the way and their
      // children land directly on the columns — the small-screen stacking they provide is untouched.
      //
      // BELOW `md` NONE OF THIS APPLIES and the card is the stacked card it has always been. That is
      // the requirement, not a side effect: a phone gets a card, a workstation gets a row, and there
      // is only ever ONE DOM tree, so no clinical literal exists twice.
      // THE MIDDLE SHAPE. A tablet in landscape is 1024px and cannot hold a row — a row needs about
      // 1375px for its mandated literals — so this band keeps the two-column card it has always had.
      // Dropping it was a regression: the card fell back to fully stacked and grew from 115px to
      // 166px, which is the opposite of the point.
      'md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-baseline md:gap-x-4 md:gap-y-1.5',
      'lg:col-span-full lg:grid lg:grid-cols-subgrid lg:items-baseline lg:gap-x-4 lg:gap-y-0',
      // `min-h-24` above is the CARD's floor, and it must not survive into the row: 96px per patient
      // is what a stacked card needs and it is 30 x 96px of dead space on a board of rows.
      // `md:min-h-11` replaces it — the 44px target floor, because a row may never be shorter than
      // the thing a clinician has to hit.
      'lg:min-h-11 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b lg:py-1.5 lg:shadow-none',
      'transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-standard)',
      // THE DATA-SUFFICIENCY EDGE. An 8px hatched strip down the card's RIGHT edge whenever the
      // latest reading is not `sufficient`. It exists to be seen in PERIPHERAL vision while
      // scrolling: today that cue lives in the card's third row and is invisible until you stop and
      // read that specific card.
      //
      // RIGHT edge, not left — rule 8 assigns the left rule to REVIEW state and the hatch to data
      // sufficiency, and putting two families on one edge is how a channel stops meaning one thing.
      // It is never the only cue: `InsufficientChip` and both S-10 labels are untouched, so this is
      // redundancy, which is what rule 8 asks for rather than what it bans.
      patient.sufficientData !== 'sufficient' && 'pm-hatch-edge',
      'hover:border-border-strong hover:bg-surface-hover',
      'active:bg-surface-hover active:shadow-none',
      'focus-visible:pm-focus',
    ]}
    aria-labelledby={nameIds}
  >
    <!-- Identity above the chips on a narrow screen, side by side from `sm`. The chips carry
         `whitespace-nowrap` — a risk label is never truncated or abbreviated (S-01…S-04) — so at
         320px the two of them cannot share a line with the patient id, and `min-width: auto` on a
         flex item means they would push the card sideways rather than wrap. Stacking is the fix that
         keeps every label intact. -->
    <span
      class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 md:contents"
    >
      <span
        id="{uid}-id"
        class="flex min-w-0 items-baseline gap-2 text-body font-semibold md:col-start-1 md:row-start-1 lg:col-start-1 lg:row-start-1"
      >
        <!-- The rank number is decoration on the accessible name: the ORDER is conveyed by the list
             itself, and reading "1." before every patient adds noise to every card. -->
        <span class="text-micro font-normal text-fg-muted tabular-nums" aria-hidden="true"
          >{rank}</span
        >
        <!-- `PT-1001`, not `Patient PT-1001`. The column header already says PATIENT, so the word
             was repeated on all thirty rows and cost ~62px of a 144px column — which is why the id
             itself was being TRUNCATED to `Patient PT-1...`. A truncated identifier is a safety
             defect, not a layout compromise: PT-1001 and PT-1004 render identically, and the id is
             the one thing on the row that says WHICH patient this is.

             The word survives for assistive technology, where there is no column header in the
             reading order to supply it, and `break-words` replaces `truncate` so an id longer than
             the column wraps and stays readable instead of being cut or overflowing into the next
             column (L-083). -->
        <span class="sr-only">Patient</span>
        <span class="break-words">{patient.patientId}</span>
        <!-- BED AND CARE UNIT, under the identifier and in the muted secondary weight.
             A triage board for an ICU whose rows cannot say which bed is being talked about is a
             list, not a board: the identifier tells a clinician WHICH patient, and the bed tells
             them WHERE to walk. It sits under rather than beside the id because the id is what the
             eye scans down and a second string on that baseline competes with it.

             Rendered only when the source supplies it. The fixture set and the handoff backend
             carry no bed, so the slot is simply absent there rather than showing a dash, an empty
             box or an invented number (rule 14, and `screens.md` section 9's ban on rendering a
             missing value as a normal-looking one). -->
        {#if patient.bedCode !== null || patient.careUnit !== null}
          <span class="block text-micro font-normal text-fg-muted">
            <span class="sr-only">Bed</span>
            {[patient.bedCode, patient.careUnit].filter((part) => part !== null).join(' · ')}
          </span>
        {/if}
      </span>
      <span
        class="flex min-w-0 flex-wrap items-center gap-2 md:col-start-2 md:row-start-1 lg:contents"
      >
        <!-- `lg:justify-self-start`: a grid item stretches to fill its column by default, and the
             review column is sized for its widest literal (`Review status unavailable`), so
             without this every shorter chip's colour fill — `Pending review`, `Reviewed` — was
             stretched to that same width, well past its own text. The column itself is untouched;
             only the chip's own box now hugs its content, exactly the shrink a fixed-width track
             asks for on every row shorter than the worst case. -->
        <ReviewChip
          id="{uid}-review"
          {status}
          class="lg:col-start-2 lg:row-start-1 lg:justify-self-start"
        />
        <RiskChip
          id="{uid}-risk"
          level={patient.riskLevel}
          score={patient.riskScore}
          class="lg:col-start-3 lg:row-start-1"
        />
      </span>
    </span>

    <!-- On a phone these STACK, exactly as they always have. From `md` they take their own columns
         on the board's shared template, so thirty drivers and thirty timestamps each form a single
         readable column instead of sitting at thirty different y positions inside thirty boxes.
         Harness-defined, pending design confirmation. -->
    <!-- ONE SIZE PER LINE. `text-sm` for all three supporting columns, values included.

         This went through two wrong shapes first, and both are worth knowing about. Everything was
         `text-body` (16px), which the product owner read as overwhelming: seven elements at one size
         with nothing leading. So the prose dropped to 14px while the count, the contribution and the
         timestamp were held at 16px to respect the clinical floor. That produced a size change in
         the MIDDLE of a sentence: `3` at 16px then `readings at this level` at 14px, `20:48 local`
         at 16px then `(13 h ago)` at 14px. Reported, correctly, as uneven.

         A line that changes size mid-sentence is worse than either uniform choice, so hierarchy is
         carried by WEIGHT and COLOUR here instead: the value is `font-semibold` on `text-fg`, the
         prose is normal on `text-fg-secondary`, and both are 14px.

         WHAT THIS COSTS, stated rather than buried: the contribution, the readings count and the
         absolute timestamp now render below the 16px the type scale calls the floor for a clinical
         value. The primary values a triage decision turns on are not affected, because the risk
         band and the score live in the chip and the chip is still 16px. Registered as **D-33**. -->
    <!-- `At this level` (S-38, readings held at the current risk level) and `Assessed` (U-14, the
         absolute charttime stamp) were removed from the card on 2026-08-23, along with their board
         columns — see `BOARD_COLS` in `+page.svelte` for the full deviation note. `driver` is the
         one survivor of what was a three-slot row, so it is no longer a `flex-col` stack on a
         phone; it is just one line, at every width. -->
    <span
      id="{uid}-driver"
      class="min-w-0 text-sm text-fg-secondary md:col-start-1 md:row-start-2 lg:col-start-5 lg:row-start-1"
    >
      {#if driver !== null}
        <span class="font-medium text-fg">Primary driver:</span>
        {driver.name}{driver.tied ? ' (tied)' : ''}
        <!-- The contribution is printed beside the name: `contribution` is unscaled and its sign
             semantics are unspecified (G-24), so it is never normalised, never `Math.abs`'d, and
             never drawn as a bar without its number. -->
        <span class="text-fg-muted tabular-nums">({driver.contribution})</span>
      {:else}
        <!-- F-4: never a fabricated driver, never a blank. The one canonical string. -->
        No ranked factors available
      {/if}
    </span>

    <!-- Optional trailing content. `{@render badges?.()}` renders nothing when unset — never an
         empty wrapper element, which would leave a stray gap in the card's reading order.
         `badges` is OUTSIDE the composed accessible name, so anything rendered through it must
         carry its own visible text and must never be the only place a clinical state appears. -->
    <!-- A real grid item at `md`, so a data-limited chip spans the card instead of landing in one
         column. `display: contents` would NOT work here: a transparent box is not a grid item, so
         `col-span` on it does nothing. -->
    <!-- The data-limited badge takes its OWN column on the row rather than a second grid row: a
         `row-start-2` cell exists for every card whether or not the snippet renders anything, and
         that alone made every row on the board twice as tall as it needed to be. -->
    <span
      class="md:col-start-2 md:row-start-3 md:justify-self-end lg:col-start-4 lg:row-start-1 lg:justify-self-start"
      >{@render badges?.()}</span
    >
  </a>
</li>
