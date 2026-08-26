// src/lib/state/review-log.svelte.ts
// CANONICAL DECLARATION — this file.
//
// THE LOCAL REVIEW MARKS, and WHEN each was made.
//
// It exists because the marks have to outlive a single page. Each screen builds its own
// `TriageBoard` — the board page from the loaded list, the detail page from an empty one — so a mark
// made on Patient Detail was destroyed the moment the clinician went back, and the board's review
// history was permanently empty. That was invisible while the mark only tinted a chip on the screen
// you were already looking at; it stopped being invisible the moment a history existed to read.
//
// HELD IN CONTEXT, NEVER IN MODULE SCOPE. It maps patient ids to times, which is identity data, and
// CLAUDE.md's rule for that is unambiguous: module scope is shared and would leak across requests.
// `patients/+layout.svelte` creates one and puts it in context, exactly as `+layout.svelte` does with
// the announcer, so it lives for the `/patients` subtree and dies with it.
//
// STILL LOCAL, STILL UNSAVED. Nothing here is written to the patient record, there is no persistence
// endpoint, and a reload clears it (Handoff section 4, `screens.md` RULE TWO). Every surface that
// renders one of these marks says so.

export class ReviewLog {
  /**
   * Patient id → the moment it was marked. A `Map`, not a `Set`, because a review history that
   * cannot say WHEN is not a history — and re-marking keeps the FIRST time, since a clinician who
   * clicks twice has not reviewed twice.
   */
  marks = $state<ReadonlyMap<string, Date>>(new Map());

  mark = (patientId: string, at: Date): void => {
    if (this.marks.has(patientId)) return;
    const next = new Map(this.marks);
    next.set(patientId, at);
    this.marks = next;
  };

  has = (patientId: string): boolean => this.marks.has(patientId);

  at = (patientId: string): Date | undefined => this.marks.get(patientId);
}
