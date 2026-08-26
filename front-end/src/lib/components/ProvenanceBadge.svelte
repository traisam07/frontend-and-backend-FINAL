<!-- src/lib/components/ProvenanceBadge.svelte
     FIRST DECLARATION — implementer-authored, listed in the declaring-file register
     (`.claude/skills/bootstrap/SKILL.md` section 4, fourth table).

     It owns ALL FOUR provenance literals, and none of them is composed at a call site:

       S-12  `Measured`
       S-13  `Carried forward`  PLUS the mandatory `last measured <absolute> (<relative>)` detail in
             the SAME visual group as the value. A carried-forward badge with no last-measured time
             is a rendering error (U-12, G-18), not a degraded badge.
       S-14  `Not measured on this patient` — that casing — with NO computed age and NO last-measured
             time. An age would imply a measurement that never happened.
       S-15  `Provenance unknown`, in its own element carrying `data-clarify="G-18"`. Never a default
             of `measured`.

     Visual contract: `.claude/skills/tailwind-design-system/SKILL.md` section 5.2. Never dim, grey,
     italicise, or reduce the opacity of a carried-forward or population value: greying reads as
     "disabled" or "unimportant", and a carried-forward value is fully important — it is the value
     the model used. Annotate, never de-emphasise. -->
<script lang="ts">
  import AbsoluteTime from './AbsoluteTime.svelte';
  import ProvenanceGlyph from './ProvenanceGlyph.svelte';
  import {
    PROVENANCE_BADGE,
    PROVENANCE_BADGE_BASE,
    PROVENANCE_BADGE_UNKNOWN,
    PROVENANCE_LABEL,
    PROVENANCE_LABEL_UNKNOWN,
  } from '$lib/design/provenance-classes';
  import type { Known, Provenance } from '$lib/domain/types';

  let {
    source,
    lastMeasured,
    class: klass,
  }: {
    source: Provenance | null;
    lastMeasured: Known<Date>;
    class?: string;
  } = $props();

  const classes = $derived(source === null ? PROVENANCE_BADGE_UNKNOWN : PROVENANCE_BADGE[source]);
  const label = $derived(source === null ? PROVENANCE_LABEL_UNKNOWN : PROVENANCE_LABEL[source]);
</script>

<span class={['inline-flex flex-col items-start gap-1', klass]}>
  <span class={[PROVENANCE_BADGE_BASE, classes]}>
    <ProvenanceGlyph {source} />
    {#if source === null}
      <span data-clarify="G-18">{label}</span>
    {:else}
      {label}
    {/if}
  </span>

  {#if source === 'carried_forward'}
    <!-- Handoff section 5 requires the last measured time to be RETAINED, so it renders in the same
         visual group as the badge — same cell, same stack, never a separate column the eye skips. -->
    {#if lastMeasured.kind === 'value'}
      <span class="text-sm text-fg-secondary">
        last measured <AbsoluteTime iso={lastMeasured.value.toISOString()} />
      </span>
    {:else}
      <!-- U-12 / G-18: the handoff requires the time and the payload did not carry it. This is a
           rendering CONTRADICTION, surfaced as such — not a fifth badge and not a blank. -->
      <span class="text-sm text-insufficient-fg" data-clarify="G-18">
        last measured time unknown
      </span>
    {/if}
  {:else if source === null && lastMeasured.kind === 'value'}
    <!-- F-10: with unknown provenance the supplied instant is still shown, labelled, but NO age is
         computed from it — an age is a claim about a measurement whose provenance is unknown. -->
    <span class="text-sm text-fg-secondary">
      last measured time <AbsoluteTime
        iso={lastMeasured.value.toISOString()}
        showRelative={false}
      />
    </span>
  {/if}
  <!-- `population_reference` deliberately renders nothing further: no age, no last-measured time.
       `measured` renders nothing further either — the charted time is its own column. -->
</span>
