<!-- src/routes/patients/[patientId]/+error.svelte
     CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 9.

     This boundary catches what the PARAMETER route throws BELOW it: `PARAMETER_NOT_IN_READING`
     (U-13) and `NO_CURRENT_READING` (U-11). It does NOT catch `[patientId]/+layout.ts` failures —
     an error thrown in a layout load is caught by the boundary ABOVE that layout, which is
     `patients/+error.svelte`. -->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import ErrorState from '$lib/components/ErrorState.svelte';

  const patientId = $derived(page.params.patientId ?? '');
  const code = $derived(page.error?.code);

  const title = $derived(
    code === 'PARAMETER_NOT_IN_READING'
      ? 'Parameter not in this reading'
      : 'Assessment unavailable',
  );
</script>

<svelte:head>
  <title>{title} — PulseMind</title>
</svelte:head>

<ErrorState
  {title}
  scope="No PulseMind parameter detail is being displayed for this patient."
  backHref={resolve('/patients/[patientId]', { patientId })}
  backLabel="Back to patient"
>
  {#if code === 'PARAMETER_NOT_IN_READING'}
    <!-- U-13. The requested slug is named in the message above, and the route did NOT fall back to
         the first chip — a silent fallback would show one parameter's value under another's name. -->
    <p class="text-body text-fg">
      The latest reading for patient {patientId} does not contain this parameter. Nothing has been substituted
      for it: no other parameter has been selected, and the link was not redirected.
    </p>
  {:else if code === 'NO_CURRENT_READING'}
    <!-- U-11, reached through the slug gate. -->
    <p class="text-body text-fg">
      This patient has no reading with a usable timestamp, so there is no current parameter set to
      inspect. This is not a reading with zero values.
    </p>
  {/if}
</ErrorState>
