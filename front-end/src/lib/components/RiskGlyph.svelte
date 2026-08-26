<!-- src/lib/components/RiskGlyph.svelte
     Risk's non-colour channel is fill WEIGHT; this glyph is the second non-colour cue, so the four
     bands stay distinguishable in greyscale, under protanopia, and in Windows High Contrast.

     It renders NO text and owns NO literal — the label beside it is `RiskChip`'s. It sets
     `aria-hidden="true" focusable="false"` on its OWN `<svg>`, so a caller that passes either one is
     handing the component undeclared props and `svelte-check` fails.

     Inline `<svg>` in `currentColor`, never an icon font: locked-down clinical browser profiles
     substitute fallback glyphs and an icon font becomes random letters on a triage board. -->
<script lang="ts">
  import type { RiskLevel } from '$lib/domain/types';

  let { level }: { level: RiskLevel | null } = $props();
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
  {#if level === 'Critical'}
    <!-- Filled octagon + exclamation: the densest shape in the set. -->
    <path
      d="M5.4 1.6h5.2L14.4 5.4v5.2L10.6 14.4H5.4L1.6 10.6V5.4z"
      fill="currentColor"
      stroke="none"
    />
    <path d="M8 4.6v4.2" stroke="var(--color-risk-critical-solid)" />
    <circle cx="8" cy="11.2" r="0.9" fill="var(--color-risk-critical-solid)" stroke="none" />
  {:else if level === 'High'}
    <!-- Triangle, filled outline: one step lighter than Critical. -->
    <path d="M8 1.9 14.6 13.6H1.4z" fill="currentColor" fill-opacity="0.18" />
    <path d="M8 6v3.4" />
    <circle cx="8" cy="11.6" r="0.85" fill="currentColor" stroke="none" />
  {:else if level === 'Medium'}
    <!-- Diamond, hollow. -->
    <path d="M8 1.8 14.2 8 8 14.2 1.8 8z" />
    <path d="M8 5.6v3" />
    <circle cx="8" cy="10.8" r="0.8" fill="currentColor" stroke="none" />
  {:else if level === 'Low'}
    <!-- Circle, hollow, thinnest reading. Never a tick or a checkmark: a tick reads as
         "all clear", which is reassuring copy the handoff never authorised. -->
    <circle cx="8" cy="8" r="6.1" />
    <path d="M5.4 8h5.2" />
  {:else}
    <!-- Absent or unrecognised level (S-05). A dashed ring plus a question mark — visibly NOT one
         of the four bands, and in particular not a copy of the Low glyph. -->
    <circle cx="8" cy="8" r="6.1" stroke-dasharray="2.6 2.2" />
    <path d="M6.3 6.2a1.75 1.75 0 1 1 2.2 2.3c-.4.2-.6.5-.6.9v.3" />
    <circle cx="8" cy="11.6" r="0.8" fill="currentColor" stroke="none" />
  {/if}
</svg>
