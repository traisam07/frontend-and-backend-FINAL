<!-- src/lib/components/EmptyState.svelte
     THE EMPTY STATE, AND ONLY THE EMPTY STATE.

     `docs/spec/ui-states.md` section 3 rule 2: S-19 (filter matched nothing), U-04 (backend error),
     U-05 (offline), U-06 (permission denied) and U-09 (unit genuinely has zero patients) must be
     FIVE visibly distinct treatments. An empty board that could mean any of them is a triage hazard.

     So this component is never rendered because a fetch failed — that is `ErrorState`, a different
     component with a different shape and `role="alert"`. This one is rendered only when the data
     arrived and genuinely contains nothing to show.

     Two mandated literals, one per reason, and the caller does not compose either:

       S-19  `No patients match "<query>" with the <filter label> filter.`  — both placeholders
             interpolated, both visible, trailing period included.
       U-09  `No patients in this unit`                                     — worded distinctly from
             S-19, U-04 and U-06.
-->
<script lang="ts">
  import type { RiskFilter, TriageFilter } from '$lib/domain/types';
  import Button from './Button.svelte';

  let {
    reason,
    query,
    filter,
    riskBand = null,
    onreset,
  }: {
    reason: 'filtered_out' | 'no_patients_loaded';
    query: string;
    filter: TriageFilter;
    /** The risk band narrowing the board, or `null`. Named separately — see below. */
    riskBand?: RiskFilter | null;
    /** The clear/reset action S-19 requires alongside the message. */
    onreset: () => void;
  } = $props();

  /** The filter LABELS — one spelling per filter, app-wide. `needs-review` briefly had no visible
      control (2026-08-23, dropped as redundant with the board's own grouping); reinstated the same
      day, paired with the new `reviewed`, once a filter turned out to be the only way to view one
      review-status group without scrolling past the other. */
  const FILTER_LABEL = {
    all: 'All',
    'needs-review': 'Needs review',
    reviewed: 'Reviewed',
    'data-limited': 'Data-limited',
    // Lowercase, matching `InsufficientChip`'s exact literal — S-19 interpolates this verbatim into
    // its message, and STRING OWNERSHIP means it must not acquire a second spelling here.
    'sufficiency-unknown': 'data sufficiency unknown',
  } as const satisfies Record<TriageFilter, string>;
</script>

<div
  class="mx-auto flex max-w-[44ch] flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-8 text-center"
>
  <svg
    aria-hidden="true"
    focusable="false"
    width="32"
    height="32"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    class="text-fg-muted"
  >
    <circle cx="7" cy="7" r="4.6" />
    <path d="M10.4 10.4 14 14" />
  </svg>

  {#if reason === 'filtered_out'}
    <!-- S-19. Both placeholders interpolated, both visible, trailing period included. -->
    <p class="text-body font-semibold text-fg">
      No patients match "{query}" with the {FILTER_LABEL[filter]} filter.
    </p>
    {#if riskBand !== null}
      <!-- The risk band gets its OWN sentence rather than being spliced into the S-19 literal above.
           That literal is mandated word for word, and a second filter dimension is not a licence to
           rewrite it — but an empty board with an unexplained cause is worse than either, so the
           extra fact is stated adjacent to it (**D-18**). -->
      <p class="text-sm text-fg-secondary">
        The risk level filter is also active: <span class="font-semibold text-fg"
          >{riskBand === 'unknown' ? 'Risk level unavailable' : riskBand}</span
        >.
      </p>
    {/if}

    <p class="text-sm text-fg-secondary">
      This is a filter result, not a data problem — the unit's other patients are still loaded.
    </p>
    <Button onclick={onreset}>Clear search and filter</Button>
  {:else}
    <!-- U-09. Distinct wording from S-19, and never rendered because a request failed. -->
    <p class="text-body font-semibold text-fg">No patients in this unit</p>
    <p class="text-sm text-fg-secondary">
      The assessment data loaded successfully and contained no patients. This is not an error state
      and does not mean the unit could not be reached.
    </p>
  {/if}
</div>
