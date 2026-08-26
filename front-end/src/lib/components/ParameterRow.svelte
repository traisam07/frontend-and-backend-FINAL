<!-- src/lib/components/ParameterRow.svelte
     CANONICAL DECLARATION — `.claude/skills/clinical-a11y/SKILL.md` section 5.

     STRING OWNERSHIP for the three delegated components: each owns its literals outright, this row
     passes DATA and never a label, and it never re-spells one of these strings.
       ProvenanceBadge  — S-12 `Measured`; S-13 `Carried forward` plus the mandatory
                          `last measured <absolute> (<relative>)` detail; S-14
                          `Not measured on this patient`; S-15 `Provenance unknown` with
                          `data-clarify="G-18"`.
       AbsoluteTime     — `<time datetime>` per section 8.4. No copy of its own.
       UnknownInline    — the one unknown treatment; `clarify="G-04"` is S-29 (`Model use unknown`).

     It takes `ParameterRowVm`, the PRE-FORMATTED projection, so a cell can never re-round a value or
     re-derive a label at render time.

     The row is a real `<tr>` with the parameter name in a `<th scope="row">` holding an `<a>`. Never
     `<tr role="button">` — that breaks table semantics and loses right-click and open-in-new-tab —
     and never a div grid with `role="table"`, which loses native table navigation. -->
<script lang="ts">
  import AbsoluteTime from './AbsoluteTime.svelte';
  import ProvenanceBadge from './ProvenanceBadge.svelte';
  import UnknownInline from './UnknownInline.svelte';
  import type { ParameterRowVm } from '$lib/domain/types';

  let {
    row,
    href,
    current = false,
  }: { row: ParameterRowVm; href: string; current?: boolean } = $props();

  let link: HTMLAnchorElement | undefined = $state();

  /**
   * Row-wide click affordance that forwards to the real link WITHOUT breaking text selection,
   * modified clicks (new tab / new window), or nested controls. Every one of those guards is a case
   * a `<tr onclick={goto}>` gets wrong.
   */
  function forwardToLink(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('a, button, input, [tabindex]'))
      return;
    if ((window.getSelection()?.toString() ?? '') !== '') return;
    link?.click();
  }
</script>

<!-- The row has no keyboard handler ON PURPOSE: the `<a>` inside the row header is the keyboard
     path, and it is already a tab stop. A duplicate handler on the `<tr>` would make the row a
     second, invisible tab stop with no accessible name. -->
<tr
  class={[
    'h-12 border-b border-border-subtle bg-surface hover:bg-surface-hover',
    current && 'border-l-[3px] border-l-accent-solid bg-accent-bg',
  ]}
  onclick={forwardToLink}
>
  <!-- Sticky, matching the header cell: the row header must stay readable while the row scrolls.
       The background is opaque and matches the row's own state, or the scrolled cells show through. -->
  <th
    scope="row"
    class={[
      'sticky left-0 z-10 px-3 py-2 text-left font-medium',
      current ? 'bg-accent-bg' : 'bg-surface',
    ]}
  >
    <!-- `href` arrives ALREADY RESOLVED from `PatientDetailBody`, which builds it with `resolve()`
         against the typed route id. -->
    <!-- `text-lg`, 2026-08-23, at the product owner's request ("cho size chữ nội dung Respiratory
         parameters to lên") — same bump as the value cell below. `ProvenanceBadge` in the Source
         column is left untouched: it is a shared, canonically-declared component reused on other
         screens (S-12…S-15's own owner), so resizing it here would resize it everywhere. -->
    <a
      bind:this={link}
      {href}
      aria-current={current ? 'page' : undefined}
      class="rounded-sm text-lg text-accent-fg underline-offset-2 hover:underline focus-visible:pm-focus"
    >
      {row.name}
    </a>
    <!-- No description line: `description` is not in the schema (**G-02**). Do not invent copy. -->
  </th>

  <td class="px-3 py-2">
    {#if row.value.kind === 'value'}
      <!-- The unit lives IN THE CELL, inside the SAME non-wrapping element as the value — never in
           the column header only. Rows get screen-read, copied and screenshotted in isolation.

           `data-clarify="G-01"` sits on the unit when the INTERFACE supplied it rather than the
           data (**D-23**). The dotted underline is the visible half of the same statement: it is a
           second channel, not decoration, and it is on the unit alone so the VALUE never looks
           provisional — the number is the data's and is not in question. P-09 enumerates reachable
           clarifications from the DOM, so an assumed unit that carried no marker would be an
           assertion the running app could not report. -->
      <span class="text-lg font-semibold whitespace-nowrap tabular-nums"
        >{row.value.text}&nbsp;{#if row.unitAssumed}<span
            class="text-sm font-normal text-fg-muted underline decoration-dotted underline-offset-2"
            data-clarify="G-01">{row.unitLabel}</span
          >{:else}<span class="text-sm font-normal text-fg-muted">{row.unitLabel}</span>{/if}</span
      >
    {:else}
      <!-- `clarify` carries the open-questions REGISTER ID, never a slug. -->
      <UnknownInline clarify="G-31" />
    {/if}
  </td>

  <td class="px-3 py-2">
    <ProvenanceBadge source={row.source} lastMeasured={row.lastMeasured} />
  </td>

  <td class="px-3 py-2 text-body">
    <AbsoluteTime iso={row.chartedIso} />
  </td>

  <td class="px-3 py-2 text-body">
    {#if row.modelUse === 'score_factor'}
      <!-- The one literal for this state is `Current score factor` (S-27). Handoff section 4 names
           the label ("a current score factor"); the sentence-case rendering is HARNESS. `Score
           factor` is not a synonym. -->
      Current score factor
    {:else if row.modelUse === 'available'}
      <!-- Reachable ONLY from an explicit backend flag (F-8), never inferred from a
           `top_contributors` miss. `ModelUse` is a three-member union, so this branch compiles. -->
      Available
    {:else}
      <!-- STATE S-29. `UnknownInline` renders the mandated literal `Model use unknown`. It never
           defaults to "Available": that would assert the model ignored this parameter. -->
      <UnknownInline clarify="G-04" />
    {/if}
  </td>
</tr>
