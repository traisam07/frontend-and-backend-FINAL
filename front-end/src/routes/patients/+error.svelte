<!-- src/routes/patients/+error.svelte
     Two boundaries in one, and that is why this file exists.

     It catches the BOARD load's failures, and — because an error thrown in a `+layout.ts` load is
     caught by the boundary ABOVE that layout, never beside it — it also catches everything
     `[patientId]/+layout.ts` throws: `PATIENT_NOT_FOUND` (G-42), `FORBIDDEN` (U-06),
     `UPSTREAM_ERROR` (U-04) and `CONTRACT_VIOLATION` (U-21). `[patientId]/+error.svelte` catches
     only what the parameter route throws BELOW it.

     The scope sentence branches on the code, because "this unit" and "this patient" are different
     facts and rendering the unit sentence for a single-patient failure would overstate the outage. -->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import ErrorState from '$lib/components/ErrorState.svelte';

  const code = $derived(page.error?.code);

  /**
   * This boundary catches BOTH the board load and everything `[patientId]/+layout.ts` throws, and
   * since the list endpoint exists the board can raise `FORBIDDEN` and `PATIENT_NOT_FOUND` on its
   * own. The code alone therefore no longer tells you the scope — the URL does. A single-patient
   * failure has a patient id in the path; a board failure does not.
   *
   * Getting this wrong is not cosmetic: telling a clinician "the requested patient" when the whole
   * UNIT could not be loaded understates the outage, and the reverse overstates it.
   */
  const patientScoped = $derived(
    page.url.pathname !== '/patients' &&
      (code === 'PATIENT_NOT_FOUND' || code === 'FORBIDDEN' || code === 'NO_CURRENT_READING'),
  );

  const scope = $derived(
    patientScoped
      ? 'No PulseMind risk assessment is being displayed for the requested patient.'
      : 'The triage board is not being displayed, so this screen is not a picture of the unit — an empty board here would be indistinguishable from a unit with no patients at risk.',
  );

  const title = $derived(patientScoped ? 'Assessment unavailable' : 'Triage board unavailable');
</script>

<svelte:head>
  <title>{title} — PulseMind</title>
</svelte:head>

<ErrorState {title} {scope} backHref={resolve('/patients')} backLabel="Back to overview">
  {#if code === 'FORBIDDEN'}
    <!-- U-06. An access refusal must never reach the screen as an empty patient, which is
         indistinguishable from "this patient has no data". -->
    <p class="text-body text-fg">
      This is an access decision, not a data problem. The patient may exist and may have a current
      assessment.
    </p>
  {:else if code === 'PATIENT_NOT_FOUND'}
    <p class="text-body text-fg">
      The requested patient id was not found. It has not been redirected to another patient, and no
      substitute has been selected.
    </p>
  {:else if code === 'CONTRACT_VIOLATION'}
    <!-- U-21: the payload did not satisfy the strict types. The rest of the screen deliberately does
         NOT render placeholder values. -->
    <p class="text-body text-fg">
      The payload did not match the agreed data contract, so nothing from it has been rendered. The
      path named above is where validation stopped.
    </p>
  {/if}
</ErrorState>
