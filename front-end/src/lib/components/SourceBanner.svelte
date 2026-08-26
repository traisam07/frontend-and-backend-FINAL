<!-- src/lib/components/SourceBanner.svelte
     "Which data is on this screen", stated visibly and on every screen.

     `docs/spec/data-contract.md` section 4.4 rule 4: while fixtures are in use the UI must say so.
     Fixture data presented as backend data is the exact failure mode this product exists to prevent,
     so the label is derived from the SAME single environment read the selector uses
     (`isLiveSource()`), never remembered separately — the flag selects a data source, it never
     selects whether the UI tells the truth about which one produced what is on screen.

     IT RENDERS NOTHING WHEN THE SOURCE IS LIVE, and that is the rule read precisely rather than
     loosely. Rule 4 above is one-directional: "Fixture values must never be presented in the UI as
     if they came from a backend. Label the data source visibly WHILE FIXTURES ARE IN USE." It says
     nothing about announcing the live case, because the live case is not the hazard. The product
     owner asked for the live pill and its `/api` base to go (2026-08-17): a clinician has no use for
     a transport path, and a badge that says "everything is normal" on every screen is chrome that
     trains people to stop reading badges — which is exactly the reading habit the fixture warning
     depends on.

     The removal makes the fixture warning STRONGER, not weaker. Before, both states rendered a
     banner and the clinician had to read WHICH; now the banner's mere presence means fixtures, and
     its absence means live. One channel less to misread.

     RESPONSIVE, WITHOUT HIDING THE FACT. The claim itself — "Fixture data" — is always visible at
     every width. What collapses on a narrow screen is only the EXPLANATION, into a `<details>` the
     clinician can open. U-18 forbids hiding anything clinically load-bearing; the sentence about how
     the timestamps were shifted is a caveat about the caveat, and it stays one tap away rather than
     consuming a third of a phone screen.

     Harness-defined, pending design confirmation. -->
<script lang="ts">
  import { isLiveSource } from '$lib/data/source';

  let { class: klass }: { class?: string } = $props();

  const live = isLiveSource();
</script>

<!-- The whole element is absent when the source is live: no empty bordered box, no zero-height
     wrapper holding a margin. An element that renders nothing must occupy nothing, or the layout
     keeps a gap that reads as a missing component. -->
{#if !live}
  <div
    class={[
      'rounded-md border border-dashed border-insufficient-border bg-insufficient-bg pm-hatch',
      'text-sm text-insufficient-fg',
      klass,
    ]}
  >
    <details class="group">
      <summary
        class="flex min-h-9 cursor-pointer list-none items-center gap-1.5 px-2.5 font-semibold focus-visible:pm-focus"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0"
        >
          <path d="M8 2.2 14.4 13.4H1.6z" />
          <path d="M8 6.3v3.1" />
          <circle cx="8" cy="11.4" r="0.8" fill="currentColor" stroke="none" />
        </svg>
        <!-- ONE wrapping text run, not two flex items. As siblings the label and the qualifier were
             laid out as separate boxes, so at 320px they broke into a ragged two-line shape with the
             qualifier hanging under the icon. Wrapped together they simply flow. -->
        <span class="min-w-0 flex-1">
          Fixture data <span class="font-normal">— not the assessment service</span>
        </span>
        <svg
          aria-hidden="true"
          focusable="false"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="ms-auto shrink-0 transition-transform group-open:rotate-180"
        >
          <path d="M3.5 6 8 10.5 12.5 6" />
        </svg>
      </summary>
      <p class="px-2.5 pt-0.5 pb-2">
        These patients were not served by the assessment service. Every instant in the set is
        shifted by one constant offset so the newest reading lands at page-load time; all relative
        spacing and every clinical value are unchanged. Harness-defined, pending design
        confirmation.
      </p>
    </details>
  </div>
{/if}
