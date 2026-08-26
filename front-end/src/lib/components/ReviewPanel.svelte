<!-- src/lib/components/ReviewPanel.svelte
     PD-3 — the warning / review-status panel, and the `Mark as reviewed` action.

     RULE TWO (`docs/spec/screens.md` section 8). `Mark as reviewed` changes ONLY the local review
     state, plus a locally-generated, locally-labelled timestamp. It must not touch `risk_score`,
     `risk_level`, `sufficient_data`, `imputed_share`, `documentation_share`, `top_contributors`,
     `parameters[]`, `explanation`, or `citations`, and it must not trigger a refetch. It WILL change
     the patient's K1 ranking key, which is correct.

     THE ONE LITERAL for the local mark is `Marked locally in this session — not saved to the record`,
     rendered as its own phrase between the review state and the locally-generated timestamp.
     `Recorded in this session`, `locally marked, not persisted` and
     `Reviewed · recorded in this session at <time>` are retired spellings. There is no "Saved"
     toast and no server-write checkmark: the persistence contract is open (**G-08**), so "saved" and
     "persisted" stay banned.

     The panel is NOT `role="alert"` — it is present on load, and alerts are for changes. It is a
     plain `<h2>` so it appears in the heading list. -->
<script lang="ts">
  import type { PatientSnapshot, ReviewStatus } from '$lib/domain/types';
  import { reviewLabel } from '$lib/domain/derive';
  import { REVIEW_PANEL } from '$lib/design/review-classes';
  import { getAppClock } from '$lib/state/context';
  import { getTriageBoard } from '$lib/state/context';
  import { getAnnouncer } from '$lib/a11y/announcer.svelte';
  import { formatAbsolute, formatAge, toDateTimeAttribute } from '$lib/domain/format';
  import AbsoluteTime from './AbsoluteTime.svelte';
  import ReviewGlyph from './ReviewGlyph.svelte';
  import Button from './Button.svelte';

  let {
    snapshot,
    /** F-5: the review time source is the LATEST READING's `review_at`. `status` is per patient,
     *  `review_at` is per reading — the split is **G-15**, and neither field silently wins. */
    reviewAt,
  }: { snapshot: PatientSnapshot; reviewAt: Date | null } = $props();

  const clock = getAppClock();
  const board = getTriageBoard();
  // "Mark as reviewed succeeded" is a POLITE announcement: user-initiated and expected, so it must
  // never interrupt. Without it the action has no non-visual confirmation at all.
  const announcer = getAnnouncer();

  const markedLocally = $derived(board.locallyReviewed.has(snapshot.patientId));

  /** What the panel DISPLAYS: the backend state, unless this session marked it locally. */
  const status = $derived<ReviewStatus>(markedLocally ? 'reviewed' : snapshot.reviewStatus);

  /** Locally generated, and labelled as such on the very next line. Never a fabricated backend time. */
  let markedAt = $state<Date | null>(null);

  function markReviewed() {
    // The clock the rest of the app reads, never `new Date()` inside a component (rule 12).
    board.markReviewed(snapshot.patientId, clock.now);
    markedAt = new Date();
    // The announcement repeats the mandated local-mark literal rather than paraphrasing it, so a
    // screen-reader user hears the same caveat a sighted one reads.
    announcer.say(
      `Patient ${snapshot.patientId} marked as reviewed. Marked locally in this session — not saved to the record.`,
    );
  }

  /**
   * F-5 conflict case: `status` says pending while a `review_at` exists. `status` GOVERNS the state;
   * the contradiction surfaces as a visible integrity note rather than one field silently winning.
   */
  const conflict = $derived(snapshot.reviewStatus === 'pending_review' && reviewAt !== null);
</script>

<section aria-labelledby="pm-review-heading" class={REVIEW_PANEL[status]}>
  <div class="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
    <div class="flex min-w-0 flex-1 items-start gap-3">
      <span class="mt-0.5 shrink-0"><ReviewGlyph {status} /></span>
      <div class="min-w-0">
        <h2 id="pm-review-heading" class="text-lg font-semibold">
          {#if status === 'unknown'}
            <!-- STATE S-09. The literal carries the marker, because an enumeration of reachable
                 clarifications reads the rendered DOM. Never coerced to Reviewed. -->
            <span data-clarify="G-09">{reviewLabel(status)}</span>
          {:else}
            {reviewLabel(status)}
          {/if}
        </h2>

        {#if status === 'pending_review'}
          <!-- SHORTENED 2026-08-23, at the product owner's request (first "rút ngắn nội dung cho
               pending review", then a same-day follow-up to cut it to this exact phrase, confirmed
               via AskUserQuestion after "Marking the review" alone was ambiguous). Not a mandated
               literal — S-06 (`docs/spec/ui-states.md`) requires a prominent panel stating the
               reading is unreviewed, not this exact wording, unlike the "reviewed" branch below
               which DOES carry RULE TWO's one mandated phrase. The `Pending review` heading above
               this line still states the unreviewed fact; this line no longer repeats it. -->
          <p class="mt-1 text-body">Marking the review</p>
        {:else if status === 'reviewed'}
          <p class="mt-1 text-body">
            {#if markedLocally}
              <!-- RULE TWO's one literal, as its own phrase between the state and the timestamp. -->
              Reviewed · Marked locally in this session — not saved to the record ·
              {#if markedAt !== null}
                <!-- The {#if} is what narrows `Date | null`. `markedAt?.toISOString()` would compile
                     to `datetime={undefined}` and silently drop the machine-readable time. -->
                <time datetime={toDateTimeAttribute(markedAt)} class="tabular-nums"
                  >{formatAbsolute(markedAt, clock.now)}</time
                >
                <span class="text-fg-muted">({formatAge(markedAt, clock.now)})</span>
              {:else}
                <!-- Verbatim the S-08 wording, not a second spelling of it, and never a fabricated
                     time. -->
                review time not recorded
              {/if}
            {:else if reviewAt !== null}
              <!-- STATE S-07: `Reviewed · <absolute time> (<relative>)`. -->
              Reviewed · <AbsoluteTime iso={reviewAt.toISOString()} />
            {:else}
              <!-- STATE S-08 — that exact wording, never the shortened `Reviewed · time not
                   recorded`, never `charttime` substituted for `review_at`, never a blank. -->
              Reviewed · review time not recorded
            {/if}
          </p>
        {:else}
          <p class="mt-1 text-body">
            The data contract permits a review status that is absent. This patient's is. It is not
            Reviewed and it is not Pending review, and it is excluded from the “Needs review”
            filter.
          </p>
        {/if}

        {#if conflict}
          <!-- STATE U-12. Surfaced, not silently resolved. -->
          <p class="mt-2 rounded-sm border border-insufficient-border bg-surface px-2 py-1 text-sm">
            Integrity warning: the patient is Pending review while the latest reading carries a
            review time. The patient-level status governs what is shown here.
          </p>
        {/if}
      </div>
    </div>

    {#if status === 'pending_review'}
      <!-- 44x44 floor: this is a primary clinical action. -->
      <Button variant="review" full class="sm:w-auto" onclick={markReviewed}
        >Mark as reviewed</Button
      >
    {/if}
  </div>

  {#if status === 'reviewed' && markedLocally}
    <p class="mt-3 text-sm">
      No write endpoint exists for this action. The mark lives in this browser session only and is
      lost on reload — the persistence contract is an open question (G-08).
    </p>
  {/if}
</section>
