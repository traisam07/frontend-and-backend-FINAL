<!-- src/routes/+error.svelte
     The ROOT boundary. It catches whatever no nearer boundary did — including a bad `/` redirect and
     any unmatched route — and it is a named, visible error state, never an empty page. -->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Button from '$lib/components/Button.svelte';

  // `$derived`, never a plain `const`: this component is reused across navigations, and a captured
  // error would keep describing the previous failure after a new one arrives (CLAUDE.md rule 3).
  const code = $derived(page.error?.code ?? null);
  const notAuthenticated = $derived(code === 'NOT_AUTHENTICATED');
</script>

<svelte:head>
  <title>{notAuthenticated ? 'Sign in' : 'Unavailable'} — PulseMind</title>
</svelte:head>

{#if notAuthenticated}
  <!-- A SEPARATE treatment, not the clinical error state. "We do not know who you are" is not a
       failure of the assessment service, and dressing it as one would tell a clinician the unit is
       unreachable when the remedy is to sign in. It also must not claim anything about patients:
       nothing was fetched. -->
  <div
    class="mx-auto flex w-full max-w-[34rem] flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 shadow-card"
  >
    <h1 class="text-xl font-semibold tracking-tight text-fg" tabindex="-1">Sign in to continue</h1>
    <p class="text-body text-fg-secondary">
      {page.error?.message ?? 'This screen needs a signed-in account.'}
    </p>
    <p class="text-sm text-fg-secondary">
      No assessment was requested and none is being displayed. Nothing on this screen reflects a
      patient.
    </p>
    <div class="flex flex-wrap gap-2">
      <Button variant="primary" href={resolve('/login')}>Go to sign in</Button>
      <Button href={resolve('/patients')}>Back to overview</Button>
    </div>
  </div>
{:else}
  <ErrorState
    title="PulseMind is not showing an assessment"
    scope="No PulseMind risk assessment is being displayed."
    backHref={resolve('/patients')}
    backLabel="Back to overview"
  />
{/if}
