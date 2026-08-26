<!-- src/lib/components/ProvenanceGlyph.svelte
     Provenance's non-colour channel is BORDER STROKE (solid / dashed / dotted) on the badge; this
     glyph is the second cue, and it is what survives when a screenshot is printed in greyscale.

     Four states, not three: `Provenance | null` after validation, so the miss is reachable and gets
     its own mark (S-15) rather than falling through to `measured`.

     Renders no text, owns no literal, and sets `aria-hidden` / `focusable` on its own `<svg>`. -->
<script lang="ts">
  import type { Provenance } from '$lib/domain/types';

  let { source }: { source: Provenance | null } = $props();
</script>

<svg
  aria-hidden="true"
  focusable="false"
  width="16"
  height="16"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="shrink-0"
>
  {#if source === 'measured'}
    <!-- A device trace: read from the monitor at this reading's chart time. -->
    <path d="M1.6 8h2.8l1.6-4.2 2.6 8.4 1.7-4.2h3.7" />
  {:else if source === 'carried_forward'}
    <!-- An arrow returning to the right: the LAST measured value being reused. -->
    <path d="M2 5.4h8.2" stroke-dasharray="2.6 2" />
    <path d="M7.8 2.8 10.6 5.4 7.8 8" />
    <path d="M14 10.6H5.8" stroke-dasharray="2.6 2" />
    <path d="M8.2 8 5.4 10.6 8.2 13.2" />
  {:else if source === 'population_reference'}
    <!-- Three figures: a population, not this patient. -->
    <circle cx="4" cy="5.2" r="1.7" />
    <circle cx="12" cy="5.2" r="1.7" />
    <circle cx="8" cy="4.4" r="2" />
    <path d="M1.5 12.6c0-1.7 1.1-2.8 2.5-2.8s2.5 1.1 2.5 2.8" />
    <path d="M9.5 12.6c0-1.7 1.1-2.8 2.5-2.8s2.5 1.1 2.5 2.8" />
  {:else}
    <!-- S-15. A dotted ring with a question mark: visibly not a device trace, and never the
         `measured` glyph. -->
    <circle cx="8" cy="8" r="6.1" stroke-dasharray="0.2 2.6" />
    <path d="M6.3 6.2a1.75 1.75 0 1 1 2.2 2.3c-.4.2-.6.5-.6.9v.3" />
    <circle cx="8" cy="11.6" r="0.8" fill="currentColor" stroke="none" />
  {/if}
</svg>
