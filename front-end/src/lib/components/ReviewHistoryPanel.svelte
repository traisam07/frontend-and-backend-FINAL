<!-- src/lib/components/ReviewHistoryPanel.svelte
     CANONICAL DECLARATION — this file.

     WHAT HAS BEEN REVIEWED, in two groups that are never merged.

     It replaces the selected-patient panel, which existed because clicking a card selected instead
     of navigating. Cards open the patient now (**D-22**), so there is no selection to show — and the
     space is better spent on the question a clinician actually returns to the board with: what have
     I already dealt with.

     THE TWO GROUPS ARE DIFFERENT FACTS AND ARE KEPT APART.

       `Marked by you — this session` is a LOCAL mark. It is not written to the patient record, no
       one else can see it, and it does not survive a reload. Handoff section 4 and `screens.md`
       RULE TWO are explicit that the mark changes the review state and nothing else, so this group
       repeats that in words rather than relying on the reader to remember it.

       `Already reviewed in the data` came off the wire — `warning_status.status === "Reviewed"`.

     Merging them would let a clinician read their own unsaved click as a recorded review, which is
     the one misreading RULE TWO exists to prevent. So they are two headed lists, and the local group
     carries its caveat every time it is non-empty.

     Harness-defined, pending design confirmation (**D-22**). -->
<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PatientSummary } from '$lib/domain/types';
  import AbsoluteTime from './AbsoluteTime.svelte';
  import RiskChip from './RiskChip.svelte';

  let {
    thisSession,
    inTheData,
    total,
  }: {
    /** Marked on this screen, newest first, each with the time it happened. */
    thisSession: readonly { patient: PatientSummary; at: Date }[];
    /** Reported as reviewed by the assessment data, excluding anything in `thisSession`. */
    inTheData: readonly PatientSummary[];
    /** The loaded set, so the second group can state its scope rather than imply it. */
    total: number;
  } = $props();

  const LINK =
    'flex min-h-11 min-w-0 items-center gap-2 rounded-md px-2 font-semibold text-accent-fg ' +
    'no-underline hover:bg-surface-hover focus-visible:pm-focus';
</script>

<section
  aria-labelledby="pm-review-history-heading"
  class="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card"
>
  <h2 id="pm-review-history-heading" class="text-lg font-semibold text-fg">Review history</h2>

  <!-- ---- marked here, this session ------------------------------------------------------- -->
  <div class="flex min-w-0 flex-col gap-2">
    <h3 class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase">
      Marked by you — this session
    </h3>

    {#if thisSession.length === 0}
      <p class="text-sm text-fg-secondary">
        Nothing marked on this screen yet. Marking a patient reviewed changes the review state only
        — it is not saved to the patient record.
      </p>
    {:else}
      <!-- The caveat sits ABOVE the list, not under it: it qualifies every row, and a reader who
           stops after the first row must still have met it. -->
      <p class="text-sm text-fg-secondary">
        Local to this screen. Not saved to the patient record, and not visible to anyone else.
      </p>
      <ul class="flex min-w-0 flex-col gap-1">
        <!-- Keyed by patient id — a stable domain id, never the index: this list re-sorts as marks
             are added. -->
        {#each thisSession as entry (entry.patient.patientId)}
          <li class="flex min-w-0">
            <a
              href={resolve('/patients/[patientId]', { patientId: entry.patient.patientId })}
              class={LINK}
            >
              <span class="truncate">{entry.patient.patientId}</span>
              <!-- The risk band travels with the row: a review history without it invites the reader
                   to assume everything reviewed was low risk. -->
              <RiskChip
                level={entry.patient.riskLevel}
                score={entry.patient.riskScore}
                class="shrink-0"
              />
              <span class="ms-auto shrink-0 text-sm font-normal text-fg-secondary">
                <AbsoluteTime iso={entry.at.toISOString()} />
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- ---- already reviewed upstream ------------------------------------------------------- -->
  <div class="flex min-w-0 flex-col gap-2 border-t border-border pt-3">
    <h3 class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase">
      Already reviewed in the data
    </h3>

    {#if inTheData.length === 0}
      <p class="text-sm text-fg-secondary">
        No patient in the loaded set of {total} reports a completed review.
      </p>
    {:else}
      <p class="text-sm text-fg-secondary">
        {inTheData.length} of {total} loaded patients. Reported by the assessment data, not by this screen.
      </p>
      <ul class="flex min-w-0 flex-wrap gap-1">
        {#each inTheData as patient (patient.patientId)}
          <li class="flex min-w-0">
            <a
              href={resolve('/patients/[patientId]', { patientId: patient.patientId })}
              class="{LINK} text-sm"
            >
              {patient.patientId}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
