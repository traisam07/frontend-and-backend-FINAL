<!-- src/lib/components/Disclaimer.svelte
     The decision-support disclaimer (state S-32). Handoff sections 3, 4 and 5 list it among EVERY
     screen's Main sections, so it is global rather than per-screen decoration, and it is the last
     element in `<main>` on all three screens (OV-7, PD-12, PM-9).

     HARNESS rules, pending design confirmation: never collapsed behind a "learn more", never
     truncated, never below 14px, never inside a tooltip, never hidden at any breakpoint or density.

     **The exact wording is regulatory copy and is not a design decision** (**G-34**). Until it is
     supplied, the substantive sentence renders as the explicit unknown treatment carrying that row
     id — inventing plausible regulatory text would be the most quietly dangerous invention in the
     product, because it reads as approved. What IS rendered without a marker are the three facts the
     handoff itself states: the tool is decision support, the screens are read-only, and the values
     come from the application rather than from this UI. -->
<script lang="ts">
  let { class: klass }: { class?: string } = $props();
</script>

<aside
  data-clarify="G-34"
  aria-labelledby="pm-disclaimer-heading"
  class={[
    'rounded-md border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-fg-secondary',
    klass,
  ]}
>
  <h2 id="pm-disclaimer-heading" class="text-micro font-semibold tracking-[0.04em] uppercase">
    Decision-support disclaimer
  </h2>
  <p class="mt-1.5">
    PulseMind supports clinical review. It does not diagnose, does not prescribe, and does not
    replace clinical judgement. Every screen is read-only: no value here can be edited, and values
    change only when new application data arrives.
  </p>
  <!-- "Approved regulatory wording: Unspecified — see open question G-34" stood here until
       2026-08-17. Its subject was the copy-approval workflow, and it rendered on EVERY screen. The
       paragraph above is a true, plain statement of what this product is and is not, and it is what
       Handoff sections 3, 4 and 5 require a disclaimer to do. **G-34 is still OPEN** — the approved
       regulatory sentence is product and legal's to supply — and the register id now travels in
       `data-clarify` on the element rather than in text aimed at a clinician. -->
</aside>
