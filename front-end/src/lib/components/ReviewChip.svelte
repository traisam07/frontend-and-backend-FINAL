<!-- src/lib/components/ReviewChip.svelte
     CANONICAL DECLARATION — `.claude/skills/tailwind-design-system/SKILL.md` section 5.3.

     STRING OWNERSHIP: the chip renders `reviewLabel(status)` and never a label prop. `reviewLabel`
     owns `Reviewed`, `Pending review`, and `Review status unavailable` (S-09), so those three
     strings exist exactly once in the app.

     CLARIFY MARKER: on `status === 'unknown'` the chip renders that label inside an element carrying
     `data-clarify="G-09"` — S-09 mandates the marker ON the literal, and an enumeration of reachable
     clarifications reads the rendered DOM, so an id that lives only in the matrix row is one the
     running app cannot report. `reviewLabel` returns a string and cannot carry an attribute, so the
     element is the chip's to add; the other two states carry no marker. -->
<script lang="ts">
  import ReviewGlyph from './ReviewGlyph.svelte';
  import { REVIEW_CHIP, REVIEW_CHIP_BASE } from '$lib/design/review-classes';
  import { reviewLabel } from '$lib/domain/derive';
  import type { ReviewStatus } from '$lib/domain/types';

  let {
    status,
    id,
    class: klass,
  }: {
    /** 'reviewed' | 'pending_review' | 'unknown' — never null, and never a label. */
    status: ReviewStatus;
    id?: string;
    /** Layout only; never a review class. */
    class?: string;
  } = $props();

  const label = $derived(reviewLabel(status));
</script>

<span {id} class={[REVIEW_CHIP_BASE, REVIEW_CHIP[status], klass]}>
  <ReviewGlyph {status} />
  {#if status === 'unknown'}
    <span data-clarify="G-09">{label}</span>
  {:else}
    {label}
  {/if}
</span>
