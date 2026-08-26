<!-- src/lib/components/ExplanationSection.svelte
     PD-8 ONLY as of 2026-08-23 — PD-9 (guideline references) split out into
     `GuidelineReferencesSection.svelte`, at the product owner's request: this half now renders
     INSIDE the PD-5 risk-score panel ("nội dung explain của nó nên nằm trong div risk score luôn,
     cho dễ đọc"), and the references half moved to the end of the merged row. Splitting the render
     LOCATION does not reopen the question the single-region design below answers — read that
     reasoning before touching either half.

     THE SUFFICIENCY GATE COMES FIRST. `docs/spec/ui-states.md` section 3 rule 1: check
     `sufficient_data` BEFORE any null check on `explanation` / `citations`. Rendering prose merely
     because it happens to be non-null is the defect this ordering exists to prevent.

     THIS COMPONENT STILL OWNS THE ONE MERGED WITHHELD REGION for BOTH PD-8 and PD-9, even though
     the two now render in different places on screen. `docs/spec/screens.md` section 4.4 is
     explicit that the unavailable treatment *replaces* "the explanation and guideline references",
     and S-10 mandates ONE heading for the pair. `GuidelineReferencesSection` renders NOTHING when
     this gate is closed — not a second withheld card, not an empty placeholder — because the ONE
     message here already states plainly that neither exists for this reading. Two withheld cards
     would need a second heading for the references half, and the matrix mandates none: an earlier
     draft of this file invented `Guideline references withheld`, `Guideline references withheld —
     data sufficiency unknown` and `Guideline references not supplied`, which is exactly the silent
     copy decision CLAUDE.md rule 13 forbids and how one state acquires a second spelling
     (`docs/LESSONS.md` L-044, L-046, L-047). One region, one mandated heading, no invented clinical
     copy — now living at the explanation's location specifically because that is the ONE of the two
     locations still guaranteed to render every time (the references slot is the one the product
     owner asked to become conditional).

     FOUR TREATMENTS THAT NEVER SHARE A HEADING (section 3 rule 12):
       S-11  present                      normal prose + reference list
       S-10  `insufficient`               `Explanation withheld`
       S-10  `null` sufficiency           `Explanation withheld — data sufficiency unknown`
       S-37  sufficient, explanation null `Explanation not supplied` + its mandated body,
                                          `data-clarify="G-16"`
     The first three are CLINICAL statements about the reading. The fourth is a SYSTEM statement
     about the payload, which is why it never borrows S-10's withheld copy: doing so would assert a
     clinical reason the data does not support.

     HEADING RENAMED `Plain-language explanation` -> `Explanation`, 2026-08-23, at the product
     owner's request. The dropped words were the handoff's OWN section name (`screens.md` PD-8), not
     harness copy — a stated deviation, not an oversight — and the shorter form now matches the
     other three headings above, which already all start with the word `Explanation`.

     NO CARD CHROME OF ITS OWN ANY MORE for the S-11/present case: it now renders inside the PD-5
     risk-score panel, which already supplies the border, the shadow and the themed background —
     a second nested card would be a box inside a box. The WITHHELD and S-37 states KEEP their own
     `bg-insufficient-bg` / hatch treatment even nested inside a coloured risk panel, because that
     colour is what says "this specific thing did not arrive" regardless of which risk band's
     colour surrounds it. -->
<script lang="ts">
  import type { Reading } from '$lib/domain/types';

  let { reading }: { reading: Reading } = $props();

  const uid = $props.id();

  /** The gate. ONLY `=== 'sufficient'` unlocks the normal rendering — never `!== 'insufficient'`. */
  const gateOpen = $derived(reading.sufficientData === 'sufficient');

  const WITHHELD =
    'flex flex-col gap-2 rounded-md border border-insufficient-border bg-insufficient-bg p-3 ' +
    'text-insufficient-fg pm-hatch';
</script>

{#if !gateOpen}
  <!-- ONE region, occupying the slot of both PD-8 and PD-9 — see the file header. -->
  <div aria-labelledby="{uid}-withheld" class={WITHHELD}>
    {#if reading.sufficientData === null}
      <!-- S-10's `null` branch. `sufficientData` is nullable precisely so this cannot be forgotten.
           The heading carries the ONE literal for the unknown-sufficiency state — calling it
           `insufficient` would claim the data is KNOWN to be inadequate, which is itself a claim,
           and `data sufficiency unavailable` / `unknown data` are both banned second spellings. -->
      <h2 id="{uid}-withheld" class="text-lg font-semibold">
        Explanation withheld — data sufficiency unknown
      </h2>
      <p class="text-body">
        This reading does not state whether its data were sufficient, so PulseMind does not show an
        explanation or guideline references for it. Unknown sufficiency is not the same as
        sufficient.
      </p>
    {:else}
      <h2 id="{uid}-withheld" class="text-lg font-semibold">Explanation withheld</h2>
      <p class="text-body">
        PulseMind does not provide an explanation or guideline references for a reading with
        insufficient data.
      </p>
    {/if}
  </div>
{:else if reading.explanation === null}
  <!-- STATE S-37 — a SYSTEM statement, with its own heading and its own mandated body. -->
  <div class={WITHHELD}>
    <h2 id="{uid}-explanation" class="text-lg font-semibold">Explanation not supplied</h2>
    <p class="text-body" data-clarify="G-16">
      No explanation accompanied this reading. This is not a statement that no risk factors are
      present.
    </p>
  </div>
{:else}
  <div>
    <h2 id="{uid}-explanation" class="text-lg font-semibold">Explanation</h2>
    <!-- Plain interpolation; never `{@html}`. -->
    <p class="text-body leading-relaxed">{reading.explanation}</p>
  </div>
{/if}
