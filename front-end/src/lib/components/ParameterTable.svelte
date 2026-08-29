<!-- src/lib/components/ParameterTable.svelte
     CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 6.

     A REAL `<table>`. Never a grid of `<div>`s with `role="table"` — the native element gives
     navigation, header association, and forced-colors rendering that a re-implementation loses.

     `<caption>` names the patient AND the chart time, so a table read in isolation is never
     ambiguous about whose values these are and when they were charted.

     The five header strings are a HARNESS shortening of the column set the handoff names
     (`Parameter name + description`, `Latest value + unit`, `Source`, `Charting history / age`,
     `Model use` — Handoff section 4). Which columns exist is the handoff's; the header wording is
     ours and is pending copy approval (**D-10**).

     Horizontal overflow scrolls inside its OWN container with `tabindex="0"` and an accessible name.
     The page body never scrolls sideways. On the narrowest tier the table does NOT become cards: the
     column relationships (value ↔ source ↔ age) are the clinical content. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ParameterRowVm } from '$lib/domain/types';
  import AbsoluteTime from './AbsoluteTime.svelte';
  import { UNIT_ASSUMED_NOTE } from '$lib/domain/units';

  let {
    patientId,
    chartTime,
    rows,
    row,
    empty,
  }: {
    patientId: string;
    chartTime: Date;
    /** `ParameterRowVm`, never a raw `ParameterReading`. Built once with `toParameterRows(latest)`. */
    rows: readonly ParameterRowVm[];
    /** Rendered per row so the caller owns the cell layout. */
    row: Snippet<[ParameterRowVm, number]>;
    /** Rendered instead of `<tbody>` content when the reading has no parameters. */
    empty?: Snippet;
  } = $props();
</script>

<p class="flex items-center gap-1.5 pb-2 text-sm text-fg-muted md:hidden">
  <svg
    aria-hidden="true"
    focusable="false"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M6 3.5 2.5 8 6 12.5M10 3.5 13.5 8 10 12.5" />
  </svg>
  Scroll the table sideways for source, charted time and model use.
</p>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- `tabindex="0"` on a scrollable region is REQUIRED, not a lint slip: a container that scrolls
     must be reachable by keyboard or its overflowing content is unreachable without a mouse
     (WCAG 2.1.1). `role="region"` + `aria-label` is what gives that tab stop an accessible name, so
     a screen-reader user is told what they have landed in rather than hearing a bare group. -->
<div
  class="overflow-x-auto rounded-lg border border-border bg-surface"
  tabindex="0"
  role="region"
  aria-label="Respiratory parameters, scrollable"
>
  <table class="w-full border-collapse">
    <caption class="px-3 py-2 text-left text-sm text-fg-secondary">
      Respiratory parameters — patient {patientId}, charted
      <AbsoluteTime iso={chartTime.toISOString()} />. Point-in-time snapshot of the latest reading;
      values are not merged across readings.
      <!-- Said ONCE, in the caption, so a table read in isolation still carries it — and said in
           visible text rather than only as a `data-clarify` attribute, because the clinician reading
           the number is the person who needs to know the label is provisional (**D-23**, G-01). The
           dotted-underlined units in the cells are the per-value half of the same statement.

           ⚠️ ONLY WHEN A UNIT ON THIS TABLE IS ACTUALLY ASSERTED BY THE INTERFACE, since 2026-08-28.
           The sentence was unconditional, which was true while no source supplied a unit. The live
           pipeline supplies a real one for nine of its eleven parameters, and printing "units are
           supplied by this interface, not by the assessment data" over a table of measured units is
           a false statement about the provenance of every value in it. That is the same class of
           error as an invented unit, pointing the other way. -->
      {#if rows.some((r) => r.unitAssumed)}
        {UNIT_ASSUMED_NOTE}
      {/if}
    </caption>
    <!-- `text-sm` -> `text-body`, 2026-08-23, at the product owner's request ("cho size chữ nội
         dung Respiratory parameters to lên") — headers grew alongside the body cells in
         `ParameterRow.svelte` so they stay the larger of the two, not smaller. -->
    <thead class="bg-surface-sunken">
      <tr class="border-b border-border text-left text-body">
        <th scope="col" class="sticky left-0 z-10 bg-surface-sunken px-3 py-2 font-semibold">
          Parameter
        </th>
        <th scope="col" class="px-3 py-2 font-semibold">Latest value</th>
        <th scope="col" class="px-3 py-2 font-semibold">Source</th>
        <th scope="col" class="px-3 py-2 font-semibold">Charted</th>
        <th scope="col" class="px-3 py-2 font-semibold">Model use</th>
      </tr>
    </thead>
    <tbody>
      <!-- Keyed by the parameter NAME — a stable domain id — never by index. -->
      {#each rows as vm, i (vm.name)}
        {@render row(vm, i)}
      {:else}
        {#if empty}{@render empty()}{/if}
      {/each}
    </tbody>
  </table>
</div>
