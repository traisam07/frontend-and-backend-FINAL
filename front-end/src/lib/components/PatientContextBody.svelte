<!-- src/lib/components/PatientContextBody.svelte
     FIRST DECLARATION — implementer-authored, listed in the declaring-file register
     (`.claude/skills/bootstrap/SKILL.md` section 4, fourth table).

     PD-11's contents: demographics, recorded medical history / comorbidities, and connected
     devices/sources.

     IT OWNS TWO MANDATED LITERALS, and neither is composed at the call site:
       S-26  `No recorded comorbidities`  — the handoff's OWN WORDS, with NO TRAILING PERIOD.
       S-36  `Device and source status is not reported`, with
             `data-clarify="G-05"` — rendered through `InputStatus`, which owns that string for both
             the OV-6 region and this one.

     NEITHER REGION IS HIDDEN WHEN EMPTY. A section that vanishes reads as a section with nothing to
     say; a section that says it is unanswered reads as a section that is unanswered.

     `weight` and `height` are verbatim STRINGS in the schema with unknown units (**G-19**): rendered
     as delivered, nothing appended, nothing parsed. `gender` and `race` are free text (**G-20**):
     verbatim, no mapping table, no title-casing.

     `catchFlag` (wire key `catch`) is carried but must NOT filter, sort, or restyle anything until
     **G-10** is answered. Hiding a recorded comorbidity on the strength of an unexplained boolean is
     exactly the class of silent behaviour the handoff forbids — so EVERY element renders. -->
<script lang="ts">
  import type { PatientSnapshot } from '$lib/domain/types';
  import { assumedUnitFor, UNIT_ASSUMED_NOTE } from '$lib/domain/units';
  import InputStatus from './InputStatus.svelte';
  import UnknownInline from './UnknownInline.svelte';

  // Read from the table rather than typed here, so `kg` and `cm` have ONE owner and a correction in
  // D-23 reaches the drawer without anyone remembering this file exists. `?? ''` never fires — both
  // rows are in the table — but a `!` on a lookup would be an assertion about a table that a
  // clinician is expected to edit.
  const WEIGHT_UNIT = assumedUnitFor('weight')?.label ?? '';
  const HEIGHT_UNIT = assumedUnitFor('height')?.label ?? '';

  let { snapshot }: { snapshot: PatientSnapshot } = $props();

  const DT = 'text-micro font-semibold uppercase tracking-[0.04em] text-fg-muted';
  // `text-body` -> `text-lg font-semibold`, 2026-08-23, at the product owner's request ("cho nội
  // dung của Demographics có chữ to hơn, đậm hơn"). `DT` (the labels above each value) is
  // unchanged — only "nội dung" (the values) was asked for.
  const DD = 'text-lg font-semibold text-fg';
</script>

<div class="flex flex-col gap-6">
  <section aria-labelledby="pm-ctx-demographics">
    <h3 id="pm-ctx-demographics" class="text-body font-semibold">Demographics</h3>
    <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <dt class={DT}>Patient ID</dt>
        <!-- F-14: no name, bed or unit field exists (**G-06**). `patient_id` IS the identifier, and
             a name, initials, bed number or unit label is never synthesized. -->
        <dd class={[DD, 'font-mono']}>{snapshot.patientId}</dd>
      </div>
      <div>
        <dt class={DT}>Age</dt>
        <dd class={[DD, 'tabular-nums']}>{snapshot.age}</dd>
      </div>
      <div>
        <dt class={DT}>Gender</dt>
        <dd class={DD}>{snapshot.gender}</dd>
      </div>
      <div>
        <dt class={DT}>Race</dt>
        <dd class={DD}>{snapshot.race}</dd>
      </div>
      <div>
        <dt class={DT}>Weight</dt>
        <dd class={DD}>
          {#if snapshot.weight !== null}
            <!-- The VALUE is still verbatim — the schema types this as String (**G-19**) and
                 parsing it to a number would discard whatever the source actually recorded. What
                 changed on 2026-08-17 is the LABEL: the product owner asked the interface to supply
                 units (**D-23**), so `kg` comes from the `$lib/domain/units` table and carries the
                 marker that says the interface asserted it. -->
            <span class="whitespace-nowrap"
              >{snapshot.weight}&nbsp;<span
                class="text-sm text-fg-muted underline decoration-dotted underline-offset-2"
                data-clarify="G-01">{WEIGHT_UNIT}</span
              ></span
            >
          {:else}
            <UnknownInline clarify="G-19" />
          {/if}
        </dd>
      </div>
      <div>
        <dt class={DT}>Height</dt>
        <dd class={DD}>
          {#if snapshot.height !== null}
            <span class="whitespace-nowrap"
              >{snapshot.height}&nbsp;<span
                class="text-sm text-fg-muted underline decoration-dotted underline-offset-2"
                data-clarify="G-01">{HEIGHT_UNIT}</span
              ></span
            >
          {:else}
            <UnknownInline clarify="G-19" />
          {/if}
        </dd>
      </div>
    </dl>

    <!-- Said once for the pair, in visible text, in the section that shows them (**D-23**). OUTSIDE
         the `<dl>`: that element permits only `dt`, `dd` and `div`, and a stray `<p>` inside it puts
         a definition list into an error-recovery parse that assistive technology reads differently
         from the DOM you wrote. -->
    <p class="mt-2 text-sm text-fg-secondary">{UNIT_ASSUMED_NOTE}</p>
  </section>

  <!-- BACKGROUND ADDED TO THE WHOLE SECTION, 2026-08-23, at the product owner's request ("cho div
       phần Recorded medical history có background color nổi hơn"): before this the section had no
       fill of its own — only each individual condition `<li>` carried `bg-surface`, indistinguishable
       from the drawer's own background around it. `bg-surface-sunken` is the same "recessed panel"
       token the chart plot area and the S-26 empty-state placeholder below already use, so the whole
       block now reads as one grouped region rather than a bare heading floating over loose rows. -->
  <section aria-labelledby="pm-ctx-history" class="rounded-lg bg-surface-sunken p-3">
    <h3 id="pm-ctx-history" class="text-body font-semibold">Recorded medical history</h3>

    {#if snapshot.underlyingConditions.length > 0}
      <ul class="mt-2 flex flex-col gap-1.5">
        <!-- EVERY element renders, regardless of `catchFlag`. -->
        {#each snapshot.underlyingConditions as condition (condition.name)}
          <li class="rounded-sm border border-border-subtle bg-surface px-3 py-1.5 text-body">
            {condition.name}
          </li>
        {/each}
      </ul>
    {:else}
      <!-- STATE S-26 — the handoff's own words, and NO TRAILING PERIOD. Not "None recorded", not an
           empty list area, not a bare em dash, and the section is never hidden. -->
      <p class="mt-2 rounded-md border border-dashed border-border bg-surface px-3 py-2 text-body">
        No recorded comorbidities
      </p>
    {/if}
  </section>

  <!-- STATE S-36. Same literal, same register id, same component as OV-6. -->
  <InputStatus headingLevel={3} />
</div>
