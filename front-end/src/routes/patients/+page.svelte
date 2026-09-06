<!-- src/routes/patients/+page.svelte
     Patient Overview — OV-1 … OV-7 (`docs/spec/screens.md` section 3).

     URL CONTRACT. `?q=`, `?filter=` and `?risk=` are read HERE, from `page.url.searchParams`, and
     never in `load` — SvelteKit tracks search params per key, so reading `q` in a load would
     refetch the whole board on every keystroke. Writing them back uses
     `goto(url, { replaceState: true })`, so `Back` leaves the board rather than walking through
     every search keystroke and filter press (`docs/spec/screens.md` section 2.1). Following a CARD
     is the opposite case and pushes an entry, because Back from a patient must return to the board.
     See `writeUrl` for why it is `goto` and not the `replaceState` primitive, which would leave the
     screen disagreeing with the address bar.

     THE CARD IS A LINK, which overrides Handoff section 3's "Select that patient … Do not navigate
     yet". The product owner asked for it with the conflict stated and confirmed it — **D-22**. With
     selection gone there is no `?selected=`, no selected-patient panel and no mobile selection bar;
     the right column carries the REVIEW HISTORY instead, which is the question a clinician comes
     back to the board with. -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';
  import type { RiskFilter, TriageFilter } from '$lib/domain/types';
  import { reviewLabel } from '$lib/domain/derive';
  import { TriageBoard } from '$lib/state/triage.svelte';
  import { setTriageBoard, getReviewLog } from '$lib/state/context';
  import { observeWardInstants } from '$lib/state/ward-clock.svelte';
  import { getAnnouncer } from '$lib/a11y/announcer.svelte';
  import PatientCard from '$lib/components/PatientCard.svelte';
  import InsufficientChip from '$lib/components/InsufficientChip.svelte';
  import RiskTally from '$lib/components/RiskTally.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ReviewHistoryPanel from '$lib/components/ReviewHistoryPanel.svelte';
  import InputStatus from '$lib/components/InputStatus.svelte';
  import Disclaimer from '$lib/components/Disclaimer.svelte';
  import SourceBanner from '$lib/components/SourceBanner.svelte';
  import { publishHeight } from '$lib/actions/measure';
  import { isLiveSource } from '$lib/data/source';

  /**
   * THE BOARD'S COLUMN TEMPLATE, in one place. The header strip and the `<ul>` must use the same
   * string or the names stop sitting over their columns; `PatientCard` then inherits it through
   * `grid-cols-subgrid` rather than repeating it, which is what keeps every card's slots on the same
   * x down the whole block.
   *
   * EVERY TRACK IS A FIXED LENGTH OR AN `fr`, AND NOT ONE IS `auto`. That is the whole fix for the
   * board looking ragged: the three review blocks are three separate `<ul>` elements, so each one
   * resolves its own columns — and an `auto` track sizes to the content of THAT list. Measured, the
   * risk column landed at x=363 in the pending block, x=428 in the unknown block and x=326 in the
   * reviewed block. Cells lined up within a block and nowhere else, which is exactly the ragged
   * reading the alignment was supposed to remove.
   *
   * A track that is a length or an `fr` depends only on the container width, and all three lists are
   * the same width, so all three now resolve identically. The alternative — one grid spanning all
   * three blocks with a five-level subgrid chain — aligns just as well and costs the per-block list
   * semantics ("Pending review, 15 patients") that a screen-reader user navigates by.
   *
   * The fixed widths come from measuring the widest rendered content per column across all 30
   * patients: patient 144px, review 206px, risk 359px. The first two are covered outright; the risk
   * column is set at the 90th percentile (264px) because its widest case is the S-05 + S-35 pair
   * (`Risk level unavailable` + `score unavailable`), which is unabbreviable by rule and is allowed
   * to wrap inside its own cell rather than widen the column for the other 29 rows.
   *
   * THE DATA COLUMN IS 9rem, RAISED FROM 5rem ON 2026-08-19. It had been sized for `Data-limited`
   * alone, but S-10's other mandated literal is `data sufficiency unknown` — 199px of unabbreviable
   * text in an 80px track, held on one line by a `whitespace-nowrap` the chip no longer carries. It
   * overflowed 119px and painted over `readings at this level` in the next column, which is one
   * mandated clinical literal obscuring another. The chip now wraps (L-062) and the track is wide
   * enough that it wraps to two lines rather than four.
   *
   * TWO COLUMNS ARE GONE — `At this level` (S-38's readings-held-at-level count) and `Assessed`
   * (U-14's absolute-timestamp stamp) — removed outright on 2026-08-23 at the product owner's
   * request, to shorten the row. This is a real loss stated plainly rather than buried: a clinician
   * reading this board can no longer see, without opening Patient Detail, how many readings a
   * patient has held at their current level or when the latest one landed — both are `[HARNESS]`
   * literals the Handoff-adjacent register still expects on OV-4. `docs/spec/screens.md` OV-4 and
   * `docs/spec/data-contract.md` carry the deviation note; nothing computing either value was
   * removed from the domain layer, only their board-row rendering, so reinstating them is a
   * markup-only change.
   *
   * EVERY TRACK IS `minmax(<measured floor>,1fr)` NOW, NOT A BARE LENGTH — changed 2026-08-23 at
   * the product owner's request, after dropping two columns left the row's whole surplus width
   * piling up in `driver` alone: on a wide workstation the first four cells sat pinned to their
   * measured minimum while a single mostly-empty track absorbed everything past them, reading as
   * content "dồn về bên trái" (bunched at the left) with a dead band on the right. An EQUAL `1fr`
   * on every track means the leftover width splits evenly across all five instead of piling onto
   * the last one; the floor each track already carried (the measurement above) is untouched, so no
   * mandated literal gains a NARROWER column than it had — every cell can only get WIDER, and cell
   * content stays left-aligned within its now-roomier track rather than being stretched or
   * centred, which would misalign it against the header label above it. */
  const BOARD_COLS =
    'lg:grid-cols-[minmax(9rem,1fr)_minmax(13rem,1fr)_minmax(17rem,1fr)_minmax(9rem,1fr)_minmax(0,1fr)]';

  let { data }: PageProps = $props();

  const announcer = getAnnouncer();

  // `$derived`, never a plain const: SvelteKit reuses page components across navigation, so a const
  // would keep rendering the previous board.
  const patients = $derived(data.patients);

  // PUBLISH THE WARD'S NEWEST INSTANT so the app clock can follow it. A `$effect` rather than a
  // `$derived` because the READER is the root layout and this is a route component far below it:
  // Svelte context reads downward only, so no derivation can see both ends. It writes one number,
  // no clinical value is computed from it, and it is idempotent.
  $effect(() => {
    observeWardInstants(patients.map((p) => p.latestChartTime));
  });

  // The board owns query, filter, selection and the local review set. It reads clinical data through
  // a GETTER, so it never owns a copy that can go stale.
  const board = new TriageBoard(() => patients, getReviewLog());
  setTriageBoard(board);

  const FILTERS: readonly TriageFilter[] = [
    'all',
    'needs-review',
    'reviewed',
    'data-limited',
    'sufficiency-unknown',
  ];
  const RISK_BANDS: readonly RiskFilter[] = ['Critical', 'High', 'Medium', 'Low', 'unknown'];

  /**
   * The URL is the source of truth for query, filter and selection, and this is the one place it is
   * read. An unrecognised `filter` value renders `All` PLUS a visible notice — never silently
   * treated as `all`, which would hide the fact that the link the clinician followed was wrong
   * (state U-20).
   */
  const rawFilter = $derived(page.url.searchParams.get('filter'));
  const filterRecognised = $derived(
    rawFilter === null || FILTERS.includes(rawFilter as TriageFilter),
  );
  const filter = $derived(
    filterRecognised && rawFilter !== null ? (rawFilter as TriageFilter) : 'all',
  );
  /**
   * `?risk=` — a SEPARATE dimension from `?filter=`, validated against its own grammar (**D-18**).
   * An unrecognised value is handled exactly as U-20 handles an unrecognised `filter`: show every
   * band AND say so, never silently treat it as "no filter", which would hide that the link the
   * clinician followed was wrong.
   */
  const rawRisk = $derived(page.url.searchParams.get('risk'));
  const riskRecognised = $derived(rawRisk === null || RISK_BANDS.includes(rawRisk as RiskFilter));
  const riskBand = $derived(riskRecognised && rawRisk !== null ? (rawRisk as RiskFilter) : null);

  const query = $derived(page.url.searchParams.get('q') ?? '');

  // The board's own fields mirror the URL. `$effect` is the right tool here and not a
  // "derive-don't-sync" violation: the target is state owned by another object, and the source is
  // the address bar rather than a value that could have been computed.
  $effect(() => {
    board.query = query;
    board.filter = filter;
    board.riskBand = riskBand;
  });

  function writeUrl(mutate: (params: URLSearchParams) => void) {
    const url = new URL(page.url);
    mutate(url.searchParams);

    // `goto`, NOT `replaceState`. They look interchangeable and are not: `replaceState` is
    // SvelteKit's SHALLOW-ROUTING primitive — it rewrites `history` and sets `page.state`, and it
    // deliberately leaves `page.url` untouched. Every `$derived(page.url.searchParams…)` on this
    // screen would therefore keep the value it had at first paint (`docs/LESSONS.md` L-055).
    //
    // `replaceState: true` keeps the history behaviour that was wanted in the first place —
    // selection and typing must not each push an entry. `keepFocus` so typing is not interrupted;
    // `noScroll` so the board never jumps under the clinician.
    //
    // `url` is a clone of `page.url`, so it ALREADY carries any configured base path; `resolve()`
    // here would prepend it a second time.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function onFilter(next: TriageFilter) {
    writeUrl((params) => {
      if (next === 'all') params.delete('filter');
      else params.set('filter', next);
    });
  }

  function onRisk(next: RiskFilter | null) {
    writeUrl((params) => {
      if (next === null) params.delete('risk');
      else params.set('risk', next);
    });
  }

  function onQuery(next: string) {
    writeUrl((params) => {
      if (next === '') params.delete('q');
      else params.set('q', next);
    });
  }

  function reset() {
    writeUrl((params) => {
      params.delete('q');
      params.delete('filter');
      // The risk band is a filter too, and the S-19 action says "Clear search and filter".
      params.delete('risk');
    });
  }

  /**
   * Every card's link carries `q`, `filter` and `risk` through, so `Back to overview` restores the
   * exact board the clinician left — not a default view. Built here rather than in the card, because
   * the card must not know what the board's URL contract is.
   */
  const detailHref = $derived((patientId: string) => {
    const params = new URLSearchParams();
    if (query !== '') params.set('q', query);
    if (filter !== 'all') params.set('filter', filter);
    if (riskBand !== null) params.set('risk', riskBand);
    const search = params.toString();
    return resolve('/patients/[patientId]', { patientId }) + (search === '' ? '' : `?${search}`);
  });

  // Announce the RESULT of a filter or search, politely and once — never each row.
  let lastAnnounced = '';
  $effect(() => {
    const message = `${board.visible.length} patients match.`;
    if (message !== lastAnnounced) {
      lastAnnounced = message;
      announcer.say(message);
    }
  });
</script>

<svelte:head>
  <title>Patient overview — PulseMind</title>
</svelte:head>

<!-- ONE vertical rhythm, and it halves at each level: 24px between sections, 12px between the
     blocks inside a section, 8px from a label to the thing it labels. Two different outer gaps
     (16 on a phone, 24 above it) made the step between levels almost invisible exactly where
     the screen is most crowded. -->
<div class="mx-auto flex w-full max-w-[120rem] min-w-0 flex-col gap-6">
  <!-- OV-2 + OV-3, WRAPPED TOGETHER since 2026-08-23, at the product owner's request ("gộp div
       Patient overview và div chứa filter... để đỡ chiếm space"): the title used to be a separate
       top-level item, paying the outer column's full 24px rhythm gap both above and below it. A
       nested `gap-2` wrapper holds the two as one unit — the OUTER 24px gap still separates this
       whole unit from the board below, but the title now sits 8px above the search bar instead of
       24. `OV-3` KEEPS ITS OWN `<section>`, deliberately not merged into one landmark with OV-2:
       the search/filter section is `lg:sticky`, and folding the title inside it would pin the
       title to the top of the viewport on scroll too, making the STUCK bar taller — the opposite
       of what `docs/LESSONS.md` L-074 (quoted below) exists to prevent. -->
  <!-- GAP MADE CONDITIONAL, 2026-08-23, at the product owner's report ("có khoảng trống giữa
       header và filter div"): when the source is live, `SourceBanner` renders nothing and the
       `sr-only` `h1` below has zero height, so OV-2's `<section>` is empty — but `gap-2` on THIS
       wrapper still reserved 8px between that empty section and the search bar, the same
       "renders nothing must occupy nothing" defect the `[patientId]` route's own `SourceBanner`
       wrapper was fixed for earlier (see that route's file header). Gated on the same read. -->
  <div class={['flex flex-col', !isLiveSource() && 'gap-2']}>
    <!-- OV-2 — source banner only now. The OV-2 overview summary (pending-review count,
         data-limited count, connected-source status) was removed outright on 2026-08-23 at the
         product owner's request, to reclaim the vertical space it cost before the board begins —
         this INTENTIONALLY drops the Handoff's OV-2 literals and its U-18 no-hiding rule for this
         screen; see `docs/spec/screens.md` OV-2 for the note.

         THE VISIBLE TITLE DROPPED TOO, hours later, at the product owner's request ("phần patient
         overview đang hơi thừa"): a clinician landing here already knows which screen this is —
         the browser tab (`<svelte:head><title>` below) says so, and so does the nav logo's own
         accessible name ("PulseMind — go to Patient Overview" in `AppHeader`). A bare heading
         repeating that added a line of vertical space and nothing a clinician did not already
         know. `h1` stays, `sr-only`: the page still needs exactly one top-level heading for the
         document outline (WCAG 2.4.6 / 1.3.1) and for `aria-labelledby` below to name something
         real — only the VISIBLE line is gone. -->
    <section aria-labelledby="pm-summary-heading" class="flex flex-col gap-3">
      <h1 id="pm-summary-heading" class="sr-only">Patient overview</h1>
      <SourceBanner class="w-full md:w-auto md:max-w-xl" />
    </section>

    <!-- OV-3 — Search + filters. Sticky FROM `md` only, and that breakpoint is the fix for a real
       measurement rather than a preference. On a phone the two controls stack, so the bar is 180px
       tall — 224px at the largest text setting — and with the header that put 42% of an 844px
       viewport permanently under chrome before a single patient appeared. A filter you have to
       scroll up to reach costs one gesture; a board you can only see half of costs every glance.
       From `md` the two controls share a row, the bar is ~64px, and it sticks below the header.

       THE RISK TALLY LIVES HERE TOO, since 2026-08-18. It used to sit in the OV-2 summary block
       above, which cost a whole 68px band of its own plus a gap before the board began — and it is
       not really a summary any more: every cell is a FILTER (`?risk=`), so it belongs beside the
       other two controls rather than above them. Merging the two bands moves the first patient up
       by roughly 90px on a workstation, which is 90px of board a clinician sees without scrolling.
       `screens.md` OV-2/OV-3 record the move.

       IT STICKS FROM `lg`, NOT `md`, and that is the merge paying for itself honestly. With three
       controls in the row the bar is 94px wide-screen, 144px at 1280 and 210px at 1024, because the
       tally wraps below the other two once the width runs out. A 210px bar that is STUCK to the top
       is 23% of a 900px tablet permanently under chrome — the failure `docs/LESSONS.md` L-074
       measured. Below `lg` it scrolls away instead: the height is paid once on the way down rather
       than on every glance. -->
    <section
      aria-label="Search and filter"
      use:publishHeight={'--pm-bar-h'}
      class="z-(--z-sticky) -mx-4 flex min-w-0 flex-col gap-3 border-y border-border bg-canvas/95 px-4 py-3 backdrop-blur-md md:flex-row md:flex-wrap md:items-end md:gap-x-5 md:gap-y-3 lg:sticky lg:top-(--pm-header-h) lg:-mx-8 lg:px-8"
    >
      <label class="flex min-w-0 flex-1 flex-col gap-2 md:max-w-xs">
        <span class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase">
          Search Patient ID
        </span>
        <input
          type="search"
          value={query}
          oninput={(event) => onQuery(event.currentTarget.value)}
          placeholder="e.g. PT-1001"
          class="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-body text-fg placeholder:text-fg-muted focus-visible:pm-focus"
        />
      </label>

      <!-- MERGED ON 2026-08-23, at the product owner's request: `?filter=` and `?risk=` are now ONE
         row of toggle cells instead of two separate controls (a fieldset above a tally). They stay
         independent filter dimensions underneath — every `?filter=` value still composes with a
         `?risk=` band — only the visual grouping changed. `All` is dropped as its own cell:
         toggling the active cell off (`onFilter('all')`) already means "no filter", the same way
         selecting the active band again already clears `?risk=`, so a separate `All` cell said the
         same thing a second time.

         `needsReview` / `reviewed` REINSTATED THE SAME DAY, having been dropped hours earlier as
         "redundant with the board's own grouping" (OV-4 groups by review status already). The
         grouping turned out to solve a different problem: it labels which block you are looking
         at, but the page is still one continuous scroll through all three blocks. Only a FILTER
         removes the other groups from the DOM, which is what actually cuts the scroll a clinician
         who wants just `Reviewed` has to do. -->
      <div class="min-w-0 flex-1">
        <RiskTally
          counts={board.riskCounts}
          total={patients.length}
          selected={riskBand}
          onselect={onRisk}
          needsReview={{
            count: board.counts['needs-review'],
            selected: filter === 'needs-review',
            onselect: () => onFilter(filter === 'needs-review' ? 'all' : 'needs-review'),
          }}
          reviewed={{
            count: board.counts['reviewed'],
            selected: filter === 'reviewed',
            onselect: () => onFilter(filter === 'reviewed' ? 'all' : 'reviewed'),
          }}
          dataLimited={{
            count: board.counts['data-limited'],
            selected: filter === 'data-limited',
            onselect: () => onFilter(filter === 'data-limited' ? 'all' : 'data-limited'),
          }}
          sufficiencyUnknown={{
            count: board.counts['sufficiency-unknown'],
            selected: filter === 'sufficiency-unknown',
            onselect: () =>
              onFilter(filter === 'sufficiency-unknown' ? 'all' : 'sufficiency-unknown'),
          }}
        />
      </div>
    </section>
  </div>

  {#if !filterRecognised}
    <!-- STATE U-20. Never silently treated as `all`. -->
    <p
      role="status"
      class="rounded-md border border-insufficient-border bg-insufficient-bg px-3 py-2 text-sm text-insufficient-fg"
    >
      Unrecognised filter — showing all patients
    </p>
  {/if}

  {#if !riskRecognised}
    <!-- U-20's shape for the second parameter. Its OWN sentence, not a shared one: two wrong
         parameters are two facts, and a single merged message would leave the clinician unsure
         which half of their link was bad. -->
    <p
      role="status"
      class="rounded-md border border-insufficient-border bg-insufficient-bg px-3 py-2 text-sm text-insufficient-fg"
    >
      Unrecognised risk level — showing all risk levels
    </p>
  {/if}

  <!-- THE RAIL MOVED UNDER THE BOARD, and it was a measurement that moved it rather than a taste.
       A patient row needs about 1375px to hold every mandated literal on one line — measured, cell
       by cell, at the shipped type size. With a 24rem rail beside it the board was granted 1000px,
       so six of the seven columns wrapped and each row grew back to ~115px, which is the height the
       row layout exists to remove.

       The alternative was to stop printing the repeated labels — `Primary driver:`, `Assessed as
       of`, and the `readings at this level` half of S-38's mandated literal — and that is a change
       to mandated copy, not a layout decision. Reflowing the rail costs nothing anyone reads: the
       review history is a summary of what has already been dealt with, and it is still on the same
       screen, one scroll below the thing a clinician came here for. -->
  <div class="grid min-w-0 gap-4 lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <!-- OV-4 — Triage board -->
    <section aria-labelledby="pm-board-heading" class="flex min-w-0 flex-col gap-2.5">
      <h2 id="pm-board-heading" class="sr-only">Triage board</h2>

      {#if board.emptyReason !== null}
        <EmptyState reason={board.emptyReason} {query} {filter} {riskBand} onreset={reset} />
      {:else}
        <!-- GROUPED BY REVIEW BLOCK, and the order is unchanged by it. Review state is the primary
             sort key (`rank.ts`), so the three blocks concatenated ARE `board.visible` — the
             headings sit on boundaries the ranking already had, they do not create new ones. What
             they add is the count and the label at each boundary, which is the difference between
             scrolling thirty cards and reading a unit at a glance.

             Harness-defined, pending design confirmation (**D-17**). -->
        {#each board.groups as group (group.status)}
          <section aria-labelledby="pm-group-{group.status}" class="flex min-w-0 flex-col gap-2.5">
            <h3
              id="pm-group-{group.status}"
              class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border pb-1.5 text-sm font-semibold text-fg"
            >
              <!-- `reviewLabel` is the single owner of these three strings (S-07, S-08, S-09). The
                   heading must never spell one itself. -->
              {reviewLabel(group.status)}
              <span
                class="rounded-pill border border-border-strong px-2 py-0.5 text-micro tabular-nums"
              >
                {group.patients.length}
              </span>
              {#if group.status === 'pending_review'}
                <span class="font-normal text-fg-secondary">ranked first</span>
              {:else if group.status === 'unknown'}
                <!-- The S-09 asymmetry, stated where it is visible rather than only in the register:
                     this block ranks ABOVE Reviewed and is EXCLUDED from the Needs review filter. -->
                <span class="font-normal text-fg-secondary" data-clarify="G-09">
                  not counted as needing review
                </span>
              {/if}
            </h3>

            <!-- THE CARD WRAPPER, `lg`-ONLY — added 2026-08-23 at the product owner's request
                 ("trống", "chưa friendly"): a flattened table sitting directly on the canvas
                 background, with nothing but a hairline under each row, read as bare rather than
                 designed. Below `lg` nothing changes — each `PatientCard` already carries its own
                 rounded border and shadow, so wrapping the STACK in a second card would double the
                 boundary for no reason. `overflow-hidden` is what lets the column header's bottom
                 border and the zebra striping below sit flush inside one rounded edge instead of
                 poking past it. `rounded-md`, DOWN FROM `rounded-lg` HOURS LATER, at the product
                 owner's request ("nó đang cong quá") — a clinical row list read as too playful at
                 the larger radius. The filter chips dropped a size too, from `rounded-md` to
                 `rounded-sm` (`RiskTally.svelte`), so every corner in this region got smaller. -->
            <div
              class="lg:overflow-hidden lg:rounded-md lg:border lg:border-border lg:bg-surface lg:shadow-card"
            >
              <!-- COLUMN HEADER — printed once per block instead of once per card. It is
                   `aria-hidden`, and that is safe ONLY because every cell keeps its own label as an
                   `sr-only` copy, so each card's composed accessible name is byte-identical to what it
                   was before the columns existed. It renders from `md` up, where the rows align; below
                   that the stacked card carries its labels visibly, exactly as today. -->
              <!-- BACKGROUND STRENGTHENED 2026-08-23, at the product owner's request ("nên có
                   background color đậm màu hơn để dễ nhìn thấy"): `surface-sunken` alone was
                   close enough to `surface` that the header band barely read as a band. `bg-fg/10`
                   is a flat 10% wash of the theme's own text colour over whatever sits under it —
                   darkening in light mode, lightening in dark mode — so one class works in both
                   themes without a second value to keep in sync, the same technique the sticky
                   search bar already uses (`bg-canvas/95` below). `text-fg-secondary`, up from
                   `text-fg-muted`, for the same reason: a stronger band asked for a stronger label. -->
              <div
                aria-hidden="true"
                class="hidden text-micro tracking-[0.04em] text-fg-secondary uppercase lg:grid {BOARD_COLS} lg:gap-x-4 lg:border-b lg:border-border lg:bg-fg/10 lg:px-4 lg:py-2"
              >
                <span>Patient</span>
                <span>Review</span>
                <span>Risk · score</span>
                <span>Data</span>
                <span>Primary driver</span>
              </div>

              <!--
                THE LIST OWNS THE COLUMNS from `md` up, and each card's own `<a>` opts into them with
                `grid-cols-subgrid`. That is the whole mechanism, and the alternatives were both worse:

                a real `<table>` aligns just as well but cannot become a card on a phone — reflowing it
                with `display:block` strips the implicit row/cell roles in most screen readers, and
                rendering a table AND a list means every clinical literal exists twice and can drift.

                `display: contents` on the `<a>` would align the cells too, and would destroy the focus
                ring, the hover fill and the 44x44 target, because the link stops generating a box.

                Below `md` this is the flex column it has always been, so the mobile board is untouched.
              -->
              <ul
                aria-label="{reviewLabel(group.status)}, {group.patients.length} patients"
                class="flex flex-col gap-2.5 lg:grid lg:gap-y-0 {BOARD_COLS}"
              >
                <!-- Keyed by patient id, NEVER by index: the board re-sorts, and an index key would
                   pair patient A's identity with patient B's risk band. -->
                {#each group.patients as row (row.patient.patientId)}
                  <PatientCard
                    patient={row.patient}
                    rank={row.rank}
                    href={detailHref(row.patient.patientId)}
                    reviewStatus={board.effectiveReviewStatus(row.patient)}
                  >
                    {#snippet badges()}
                      <!-- S-10 has TWO branches in the badge slot and they gate identically, so the
                         chip takes the STATE and owns both labels. `'sufficient'` badges nothing,
                         which is what this `{#if}` says. -->
                      {#if row.patient.sufficientData !== 'sufficient'}
                        <span class="flex">
                          <InsufficientChip sufficiency={row.patient.sufficientData} />
                        </span>
                      {/if}
                    {/snippet}
                  </PatientCard>
                {/each}
              </ul>
            </div>
          </section>
        {/each}
      {/if}
    </section>

    <!-- Below both sticky bars, measured: the header and the search bar each publish their height,
         so this offset cannot drift when either one changes shape. -->
    <div
      class="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[calc(var(--pm-header-h)+var(--pm-bar-h)+1.5rem)]"
    >
      <!-- OV-5 — Review history, in place of the selected-patient panel.
           Cards open the patient now (**D-22**), so there is no selection to show. What a clinician
           returns to the board wanting to know is what they have already dealt with. -->
      <ReviewHistoryPanel
        thisSession={board.reviewHistory.thisSession}
        inTheData={board.reviewHistory.inTheData}
        total={patients.length}
      />

      <!-- OV-6 — Input status -->
      <InputStatus />
    </div>
  </div>

  <!-- OV-7 — Decision-support disclaimer. Last element in <main>, on all three screens. -->

  <Disclaimer />
</div>
