<!-- src/lib/components/ErrorState.svelte
     The one named, visible failure treatment. Every `+error.svelte` renders through it, so the six
     `App.Error` codes cannot acquire six different layouts.

     THE RULES IT ENCODES:

     - It is NOT the empty state. `docs/spec/ui-states.md` section 3 rule 2 requires S-19, U-04, U-05,
       U-06 and U-09 to be five visibly distinct treatments; an empty board that could mean any of
       them is a triage hazard. This component is never rendered because a filter matched nothing.
     - The transport's message is rendered VERBATIM. `U-04` mandates seven lead-ins — one per cause —
       and they are the strings `src/lib/data/source.ts` actually emits. Re-wording one here would
       make the matrix row unassertable, and folding the deadline into "could not be reached" would
       report a hung service as a refused connection.
     - It states, in words, that no assessment is being shown. An error page that only says
       "something went wrong" leaves a clinician to guess whether the last value they saw still
       stands.
     - Retry is MANUAL and bounded (`U-08`): `invalidateAll()` re-runs the load once and the outcome
       is whatever renders next. No silent auto-retry loop, which hides a persistent outage.
     - `role="alert"`, because this appears in response to a change. -->
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';

  let {
    title,
    scope,
    backHref,
    backLabel,
    children,
  }: {
    /** The heading. Names WHAT is unavailable, never the technology that failed. */
    title: string;
    /** The sentence that says what is not on screen. Scope-specific: a unit, or one patient. */
    scope: string;
    backHref: string;
    backLabel: string;
    /** Optional extra guidance for a specific code. */
    children?: Snippet;
  } = $props();

  // `$derived`, not a plain const: an error boundary is reused across navigations, so a plain const
  // would render the previous failure's code beside the new failure's message.
  const code = $derived(page.error?.code ?? 'UNKNOWN');
  const message = $derived(page.error?.message ?? 'No further detail was supplied.');
  const status = $derived(page.status);

  let retrying = $state(false);

  async function retry() {
    retrying = true;
    try {
      await invalidateAll();
    } finally {
      retrying = false;
    }
  }
</script>

<section
  role="alert"
  class="mx-auto flex max-w-[68ch] flex-col gap-4 rounded-lg border border-insufficient-border bg-insufficient-bg p-6 text-insufficient-fg shadow-card"
>
  <div class="flex items-start gap-3">
    <svg
      aria-hidden="true"
      focusable="false"
      width="28"
      height="28"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="mt-0.5 shrink-0"
    >
      <path d="M8 2.2 14.4 13.4H1.6z" />
      <path d="M8 6.3v3.1" />
      <circle cx="8" cy="11.4" r="0.8" fill="currentColor" stroke="none" />
    </svg>
    <h1 class="text-xl font-semibold text-fg">{title}</h1>
  </div>

  <!-- The transport's own words, verbatim. This is the U-04 / U-13 / U-21 mandated lead-in. -->
  <p class="rounded-sm border border-insufficient-border bg-surface px-3 py-2 font-mono text-sm">
    {status}: {message}
  </p>

  <!-- The sentence that matters clinically. Never "something went wrong". -->
  <p class="text-body text-fg">
    {scope} Do not infer a value from this screen, and do not treat the last value you saw as current.
  </p>

  {#if children}{@render children()}{/if}

  <div class="flex flex-wrap items-center gap-3">
    <Button variant="primary" onclick={retry} disabled={retrying} busy={retrying}>
      {retrying ? 'Retrying…' : 'Try again'}
    </Button>
    <!-- `backHref` arrives ALREADY RESOLVED — every caller builds it with `resolve()`. The rule
         cannot see through a prop, and re-resolving would double any configured base path. -->
    <Button href={backHref}>{backLabel}</Button>
    <p class="text-sm text-fg-secondary">
      Reference: <span class="font-mono">{code}</span>
    </p>
  </div>
</section>
