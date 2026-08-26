<!-- src/lib/components/GuidelineReferencesSection.svelte
     PD-9 ONLY — split out of `ExplanationSection.svelte` on 2026-08-23, at the product owner's
     request ("đẩy guideline references xuống cuối hàng"): PD-8 stayed inside the PD-5 risk-score
     panel, this half moved out to its own full-width section. Placed at the end of the merged
     Reading-state/History/Ranked-factors row at first, then moved again the same day, BELOW PD-10
     (the respiratory parameter table), at the product owner's follow-up request ("cho Respiratory
     parameters nằm trên guideline references") — `PatientDetailBody.svelte` renders it as a plain
     conditional section after PD-10's `<section>` closes, not inside any grid. `ExplanationSection
     .svelte`'s own file header has the full reasoning for why splitting the RENDER LOCATION does
     not reopen the "one merged withheld region" design; read that before touching either half.

     THE SUFFICIENCY GATE COMES FIRST, same as PD-8 (`docs/spec/ui-states.md` section 3 rule 1).

     WHEN THE GATE IS CLOSED THIS COMPONENT RENDERS NOTHING AT ALL — not a second withheld card,
     not an empty placeholder. `ExplanationSection` already renders the ONE merged S-10 region for
     both PD-8 and PD-9 (`docs/spec/screens.md` section 4.4: the unavailable treatment "replaces the
     explanation and guideline references" as a single thing), and it is now the only one of the two
     locations still guaranteed to render every time — the product owner asked for the references
     slot specifically to become conditional. A second withheld card here would need its own
     heading, and S-10 mandates none for a references-only region (`docs/LESSONS.md`
     L-044/L-046/L-047: inventing one is exactly the silent copy decision those lessons forbid).

     THE ABSENT-REFERENCES CASE (`sufficient_data === 'sufficient'` but `citations` is `null` or
     `[]`) IS `docs/spec/open-questions.md` **G-50**, still OPEN. S-37 mandates copy for an absent
     EXPLANATION only ("No explanation accompanied this reading…") — reusing that sentence here
     would assert something about an explanation that is, in this branch, present. G-50's `[HARNESS]`
     interim behaviour is followed here: the heading stays `Guideline references` — the handoff's own
     section name, unchanged across every branch, never `Guideline references not supplied` or any
     other invented spelling — and the body carries `data-clarify="G-50"` and states plainly that
     this is not the withheld state and not a claim that no guidelines apply. `null` and `[]` are
     treated identically, per the data contract's own statement that both mean "no references". -->
<script lang="ts">
  import type { Reading } from '$lib/domain/types';

  let { reading }: { reading: Reading } = $props();

  const uid = $props.id();

  /** The gate. ONLY `=== 'sufficient'` unlocks any rendering here — never `!== 'insufficient'`. */
  const gateOpen = $derived(reading.sufficientData === 'sufficient');
  const citations = $derived(reading.citations);
  const hasCitations = $derived(citations !== null && citations.length > 0);

  const UNKNOWN =
    'flex flex-col gap-2 rounded-md border border-insufficient-border bg-insufficient-bg p-3 ' +
    'text-insufficient-fg pm-hatch';
</script>

{#if gateOpen}
  {#if hasCitations}
    <div>
      <h2 id="{uid}-references" class="text-lg font-semibold">Guideline references</h2>
      <!-- `{name, claim}` as plain text; no links exist (G-17). -->
      <ul class="mt-1 flex flex-col gap-2">
        {#each citations as citation, i (i)}
          <li class="text-body">
            <span class="font-semibold">{citation.name}</span> — {citation.claim}
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <!-- G-50, still OPEN — see the file header. -->
    <div aria-labelledby="{uid}-references" class={UNKNOWN}>
      <h2 id="{uid}-references" class="text-lg font-semibold">Guideline references</h2>
      <p class="text-body" data-clarify="G-50">
        No guideline references accompanied this reading. This is not the withheld state, and it is
        not a statement that no guidelines apply.
      </p>
    </div>
  {/if}
{/if}
