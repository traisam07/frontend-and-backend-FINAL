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

     A FIFTH TREATMENT, ADDED 2026-08-28: `generating`. The four below are all statements about a
     reading that has already been decided; this one is the only state in which the panel is doing
     something. It sits INSIDE the same region and takes the S-37 slot while it runs, so the rule
     that the four never share a heading is extended rather than broken.

     ⚠️ `generating` IS CHECKED BEFORE `explanation === null`, AND THE ORDER IS THE WHOLE FIX. Put
     the generating state inside the not-supplied branch and it shows on the FIRST generation and
     never again: asking for a second explanation leaves the previous prose sitting there while the
     references panel beside it visibly clears and refills. Reported, in those words, on the React
     build this replaces.

     ⚠️ DIMMING THE OLD PROSE INSTEAD WAS TRIED AND REJECTED. Greyed-out text still reads as the
     answer while the panel claims to be writing a new one. It is removed outright, and nothing is
     lost: the previous explanation is still on the assessment and reappears if the generation fails.

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
  import type { ExplanationRequest } from '$lib/state/explanation.svelte';
  import Button from './Button.svelte';

  let {
    reading,
    /**
     * The shared request, owned one level up so this panel and the references panel fill from the
     * SAME call. Optional: a source with no generate endpoint passes none and the panel is exactly
     * the read-only four-state component it was.
     */
    request = undefined,
    /** The patient to generate for. Required only when `request` is supplied. */
    patientId = undefined,
  }: {
    reading: Reading;
    request?: ExplanationRequest | undefined;
    patientId?: string | undefined;
  } = $props();

  const uid = $props.id();

  /** The reading's own instant, and the tag every generated result is matched against. */
  const chartedIso = $derived(reading.charttime?.toISOString() ?? null);

  /** A control is offered only when there is somewhere to send the request and a reading to name. */
  const canGenerate = $derived(
    request !== undefined && patientId !== undefined && chartedIso !== null,
  );

  const generating = $derived(chartedIso !== null && (request?.generatingFor(chartedIso) ?? false));

  /** Generated prose for THIS reading, else whatever the assessment already carried. */
  const generated = $derived(chartedIso === null ? null : (request?.resultFor(chartedIso) ?? null));
  /** Scoped to THIS reading, so a failure cannot outlive the reading it was raised against. */
  const failure = $derived(chartedIso === null ? null : (request?.failureFor(chartedIso) ?? null));
  const text = $derived(generated?.text ?? reading.explanation);

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
{:else if generating}
  <!-- THE FIFTH TREATMENT, and it is checked BEFORE the null branch below. Two different headings,
       because writing a first explanation and re-writing one are different things to be told. -->
  <div>
    <h2 id="{uid}-explanation" class="text-lg font-semibold">
      {text === null ? 'Writing the explanation…' : 'Re-running the model…'}
    </h2>
    <p class="mt-1 max-w-[62ch] text-body leading-relaxed text-fg-secondary" role="status">
      A 7B model is running locally on one graphics card. This takes tens of seconds. The score,
      band, inputs and ranked factors are already final and do not wait for it.
    </p>
    {#if text !== null}
      <!-- Say it before they wait half a minute for it. Decoding is greedy, so re-running the model
           on the same reading returns byte-identical prose. Unannounced, the honest outcome is
           indistinguishable from a button that did nothing. -->
      <p class="mt-1 max-w-[62ch] text-body leading-relaxed text-fg-secondary">
        Decoding is greedy, so the same reading returns the same wording. The guideline passages are
        being selected again in the same call.
      </p>
    {/if}
  </div>
{:else if text === null}
  <!-- STATE S-37 — a SYSTEM statement, with its own heading and its own mandated body. -->
  <div class={WITHHELD}>
    <h2 id="{uid}-explanation" class="text-lg font-semibold">Explanation not supplied</h2>
    <p class="text-body" data-clarify="G-16">
      No explanation accompanied this reading. This is not a statement that no risk factors are
      present.
    </p>
    {#if failure !== null}
      <p class="text-body text-insufficient-fg" role="status">{failure}</p>
    {/if}
    {#if canGenerate && chartedIso !== null && patientId !== undefined}
      <Button variant="secondary" onclick={() => request?.generate(patientId, chartedIso)}>
        Generate explanation
      </Button>
    {/if}
  </div>
{:else}
  <div>
    <h2 id="{uid}-explanation" class="text-lg font-semibold">Explanation</h2>
    <!-- Plain interpolation; never `{@html}`. -->
    <p class="text-body leading-relaxed">{text}</p>
    {#if failure !== null}
      <!-- A failed REGENERATION. The prose above is the previous result, still valid and still
           grounded, so it stays; this says the new attempt did not land. -->
      <p class="mt-2 max-w-[62ch] text-body text-insufficient-fg" role="status">
        {failure}
      </p>
    {/if}
    {#if canGenerate && chartedIso !== null && patientId !== undefined}
      <!-- The control stays available after a first explanation exists. It used to be offered only
           while there was nothing to show, so once a bed had any explanation the affordance
           disappeared and the text stayed pinned to an older reading. -->
      <Button
        variant="secondary"
        class="mt-3"
        onclick={() => request?.generate(patientId, chartedIso)}
      >
        Explain this reading again
      </Button>
    {/if}
  </div>
{/if}
