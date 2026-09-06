<!-- src/lib/components/ReviewPanel.svelte
     PD-3 — the warning / review-status panel, and the `Mark as reviewed` action.

     RULE TWO (`docs/spec/screens.md` section 8). `Mark as reviewed` changes ONLY the local review
     state, plus a locally-generated, locally-labelled timestamp. It must not touch `risk_score`,
     `risk_level`, `sufficient_data`, `imputed_share`, `documentation_share`, `top_contributors`,
     `parameters[]`, `explanation`, or `citations`, and it must not trigger a refetch. It WILL change
     the patient's K1 ranking key, which is correct.

     TWO PATHS, AND THE PANEL SAYS WHICH ONE IT TOOK. **G-08 was answered on 2026-08-28**: the live
     service persists a disposition against an open prompt. A source that supplies a `promptId` gets
     the write; a source that does not (the fixtures, the handoff backend) keeps the original
     local-only behaviour unchanged. The two are never worded alike.

     THE ONE LITERAL for the local mark is `Marked locally in this session — not saved to the record`,
     rendered as its own phrase between the review state and the locally-generated timestamp.
     `Recorded in this session`, `locally marked, not persisted` and
     `Reviewed · recorded in this session at <time>` are retired spellings. On that path there is
     still no "Saved" toast and no server-write checkmark.

     ON THE WRITTEN PATH THE COPY STATES WHAT IS ACTUALLY TRUE, AND NO MORE. The service stores the
     disposition, the note, the wall-clock instant and the ward's own clock at that instant. It
     stores NO CLINICIAN: `clinician` is null and `attributed` is false, because nothing
     authenticates the caller and the handler deliberately ignores any name in the request body. A
     disposition that named whoever asked for it would not be an audit record. So the panel says
     `recorded, not attributed to a named clinician` and never `saved by you`. The wording is
     `[PROPOSED]` under **D-10** until the owner confirms it.

     RULE TWO IS UNCHANGED BY EITHER PATH. The write posts a disposition and nothing else; it cannot
     alter a score, a band or any other clinical field, and it triggers no refetch.

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
  import { postDisposition, type Disposition } from '$lib/data/pulsemind-source';

  let {
    snapshot,
    /** F-5: the review time source is the LATEST READING's `review_at`. `status` is per patient,
     *  `review_at` is per reading — the split is **G-15**, and neither field silently wins. */
    reviewAt,
  }: { snapshot: PatientSnapshot; reviewAt: Date | null } = $props();

  /**
   * WHETHER THIS PATIENT HAS SOMEWHERE TO WRITE TO. A disposition is recorded against an OPEN
   * PROMPT, so a patient with no prompt has no address and the panel keeps the local-only path. It
   * is not a source selector: a live board whose prompt is already reviewed is in exactly the same
   * position as a fixture, and both say local.
   */
  const promptId = $derived(snapshot.promptId);

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

  /** True once the write has come back accepted. Distinct from `markedAt`, which is local. */
  let recorded = $state(false);
  /** STATE U-15, and the mark is NOT applied while it is set. */
  let writeFailure = $state<string | null>(null);
  let writing = $state(false);
  let lastDisposition = $state<Disposition | null>(null);

  /**
   * The three dispositions offered beside `Mark as reviewed`.
   *
   * `acknowledged` is what `Mark as reviewed` has always meant: a clinician has SEEN the reading.
   * The other three say what they DID about it, and they are secondary because the handoff mandates
   * one action on this panel and these are an addition to it, not a replacement.
   */
  const SECONDARY: readonly Disposition[] = ['actioned', 'escalated', 'dismissed'];

  /**
   * ONE MAP, one spelling per disposition, for both the spoken announcement and the rendered label.
   * There were two: this map and `SECONDARY`'s `label`, plus a third form generated at render time
   * by upper-casing the first character. Three sources for one set of strings, in a panel whose
   * whole discipline is one literal per state.
   */
  const SPOKEN: Readonly<Record<Disposition, { spoken: string; label: string }>> = {
    acknowledged: { spoken: 'acknowledged', label: 'Reviewed' },
    actioned: { spoken: 'actioned', label: 'Actioned' },
    escalated: { spoken: 'escalated', label: 'Escalated' },
    dismissed: { spoken: 'dismissed', label: 'Dismissed' },
  };

  async function markReviewed(disposition: Disposition = 'acknowledged') {
    if (writing) return;
    writeFailure = null;

    // NO PROMPT, NO ADDRESS. The original local-only behaviour, unchanged, and the copy says so.
    if (promptId === null) {
      // ONE CLOCK FOR ONE EVENT. Both lines describe the same click, and they used to read two
      // different clocks: `clock.now` is the app clock, which follows the WARD and can be hours
      // ahead while it streams, and `new Date()` is the wall clock. The two then rendered in
      // different places and disagreed by hours. The mark is a ward-time fact, because that is the
      // timeline every other value on the screen is on.
      board.markReviewed(snapshot.patientId, clock.now);
      markedAt = clock.now;
      // The announcement repeats the mandated local-mark literal rather than paraphrasing it, so a
      // screen-reader user hears the same caveat a sighted one reads.
      announcer.say(
        `Patient ${snapshot.patientId} marked as reviewed. Marked locally in this session — not saved to the record.`,
      );
      return;
    }

    writing = true;
    const result = await postDisposition(fetch, promptId, disposition, null);
    writing = false;

    if (!result.ok) {
      // U-15, and the mark is deliberately NOT applied: showing a reviewed patient whose review
      // exists nowhere is the failure this branch is for. The row stays pending and says why.
      writeFailure =
        result.problem ?? 'The review could not be recorded. The reading is still awaiting review.';
      announcer.say(
        `The review for patient ${snapshot.patientId} could not be recorded. It is still awaiting review.`,
      );
      return;
    }

    board.markReviewed(snapshot.patientId, clock.now);
    markedAt = clock.now;
    recorded = true;
    lastDisposition = disposition;
    announcer.say(
      `Patient ${snapshot.patientId} recorded as ${SPOKEN[disposition].spoken}. Recorded in the patient record, not attributed to a named clinician.`,
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
            {#if recorded}
              <!-- WRITTEN. The disposition is in the patient record, and the sentence stops exactly
                   where the evidence does: the service stores no clinician, so nothing here claims
                   one. `recorded` is set only after the write came back accepted, so this wording
                   can never appear for a mark that failed or was never sent. -->
              {lastDisposition === null ? 'Reviewed' : SPOKEN[lastDisposition].label}
              · Recorded in the patient record, not attributed to a named clinician ·
              <!-- ⚠️ THE TIME WAS COMPUTED AND THROWN AWAY. This branch set `markedAt` and then
                   ended on a separator with nothing after it, so the new happy path rendered
                   `Escalated · Recorded in the patient record, not attributed to a named clinician ·`
                   and stopped. Rule 15 requires an absolute time at every display point, and the two
                   sibling branches below both carry one. -->
              {#if markedAt !== null}
                <time datetime={toDateTimeAttribute(markedAt)} class="tabular-nums"
                  >{formatAbsolute(markedAt, clock.now)}</time
                >
              {:else}
                review time not recorded
              {/if}
            {:else if markedLocally}
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
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        <!-- 44x44 floor: this is a primary clinical action. -->
        <Button
          variant="review"
          full
          class="sm:w-auto"
          disabled={writing}
          onclick={() => markReviewed('acknowledged')}
        >
          {writing ? 'Recording…' : 'Mark as reviewed'}
        </Button>

        {#if promptId !== null}
          <!-- THE OTHER THREE DISPOSITIONS, offered only where there is somewhere to record them.
               On a source with no write endpoint these would be four buttons that all did the same
               local thing under four different names, which is worse than one honest button.

               Secondary weight on purpose: the handoff mandates ONE action here, and these are an
               addition to it. `disabled` here means "a write is already in flight", which is rule
               8's permitted meaning; it never stands in for missing data. -->
          <div class="flex flex-wrap gap-2 sm:justify-end">
            {#each SECONDARY as option (option)}
              <Button variant="secondary" disabled={writing} onclick={() => markReviewed(option)}>
                {SPOKEN[option].label}
              </Button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if writeFailure !== null}
    <!-- STATE U-15. A named, visible failure with the reading's real state restated, because the
         one thing a clinician must not take away from a failed write is that the patient was
         reviewed. The row above still reads Pending review, and this says why. -->
    <p
      class="mt-3 rounded-sm border border-insufficient-border bg-surface px-2 py-1 text-sm"
      role="status"
    >
      The review was not recorded: {writeFailure}. This reading is still awaiting review, and
      nothing about it has changed.
    </p>
  {/if}

  {#if status === 'reviewed' && recorded}
    <p class="mt-3 text-sm">
      Recorded against this reading's review prompt. The service stores the disposition and the
      time; it records no clinician, because nothing signs this action (G-46).
    </p>
  {:else if status === 'reviewed' && markedLocally}
    <p class="mt-3 text-sm">
      No write endpoint exists for this patient. The mark lives in this browser session only and is
      lost on reload.
    </p>
  {/if}
</section>
