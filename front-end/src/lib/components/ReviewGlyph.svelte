<!-- src/lib/components/ReviewGlyph.svelte
     The review family's non-colour channel is the LEFT RULE plus this glyph: a flag for pending, a
     check for reviewed, a question mark for the third state the schema permits and the handoff never
     describes (S-09).

     Renders no text, owns no literal, and sets `aria-hidden` / `focusable` on its own `<svg>`. -->
<script lang="ts">
  import type { ReviewStatus } from '$lib/domain/types';

  let { status }: { status: ReviewStatus } = $props();
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
  {#if status === 'pending_review'}
    <!-- Flag. -->
    <path d="M3.7 14.4V2.1" />
    <path d="M3.7 2.6h8.1l-1.9 3.2 1.9 3.2H3.7z" fill="currentColor" fill-opacity="0.22" />
  {:else if status === 'reviewed'}
    <!-- Check inside a ring. -->
    <circle cx="8" cy="8" r="6.1" />
    <path d="M5.2 8.2 7.2 10.2l3.6-4" />
  {:else}
    <!-- S-09. Dashed ring + question mark: never the reviewed check, and never a bare em dash. -->
    <circle cx="8" cy="8" r="6.1" stroke-dasharray="2.6 2.2" />
    <path d="M6.3 6.2a1.75 1.75 0 1 1 2.2 2.3c-.4.2-.6.5-.6.9v.3" />
    <circle cx="8" cy="11.6" r="0.8" fill="currentColor" stroke="none" />
  {/if}
</svg>
