<!-- src/lib/components/InputStatus.svelte
     OV-6 (Input status) and the drawer's connected-devices region (PD-11) — the SAME state, S-36, so
     the same component renders both.

     THERE IS NO DEVICE OR DATA-SOURCE ENTITY IN THE SCHEMA (**G-05**, OPEN-BLOCKING). The handoff
     lists this section among the Main sections of Patient Overview and among the drawer's contents,
     and the data contract supplies nothing to fill it.

     So the region is STILL RENDERED — hiding it would leave a clinician unaware that a section they
     expect exists and is unanswered — and it carries the one mandated literal,
     `Device and source status is not reported`, with `data-clarify="G-05"`.

     Never `0 sources connected`, never `0`, never a count of any kind: a count asserts a fact the
     schema cannot supply. Never an invented device row. `live` is on the banned-copy list unless the
     connection is actually verified, and no connection status exists. -->
<script lang="ts">
  import UnknownInline from './UnknownInline.svelte';

  let {
    headingLevel = 2,
    class: klass,
  }: {
    /** 2 on the board, 3 inside the drawer — so no screen ever skips a heading level. */
    headingLevel?: 2 | 3;
    class?: string;
  } = $props();
</script>

<section
  aria-label="Input status"
  class={['flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card', klass]}
>
  {#if headingLevel === 2}
    <h2 class="text-lg font-semibold">Input status</h2>
  {:else}
    <h3 class="text-body font-semibold">Connected devices and sources</h3>
  {/if}

  <p>
    <UnknownInline clarify="G-05" />
  </p>

  <!-- The three sentences that used to explain WHY — no device entity in the data contract, a count
       would assert an unsupported fact, the section stays rendered so the gap is visible — were
       removed 2026-08-17 at the product owner's instruction. Their subject was the schema, not the
       patient. The absence itself still renders above, and `G-05` still travels in `data-clarify`. -->
</section>
