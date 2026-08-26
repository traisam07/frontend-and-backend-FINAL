// src/lib/state/triage.svelte.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 3.
//
// PHI. This is a CLASS held in Svelte context, created per session in the root layout — NEVER a
// module singleton. Server-side module scope is shared across requests, so a module-level instance
// would leak one clinician's patient list into another's response.

import type { PatientSummary, ReviewStatus, RiskFilter, TriageFilter } from '$lib/domain/types';
import { rankPatients } from '$lib/domain/rank';
import type { ReviewLog } from './review-log.svelte';

export type EmptyReason = 'no_patients_loaded' | 'filtered_out' | null;

export class TriageBoard {
  /** Clinical data is never owned here — it is read through a getter from `load` data. */
  readonly #source: () => readonly PatientSummary[];

  query = $state('');
  filter = $state<TriageFilter>('all');

  /**
   * The risk band selected in the tally, or `null` for "every band". A SEPARATE dimension from
   * `filter` (**D-18**): they compose, so `needs-review` + `Critical` is a view a clinician can ask
   * for.
   */
  riskBand = $state<RiskFilter | null>(null);
  /** Local-only, per Handoff section 4. No write contract exists (**G-08**). */
  /**
   * The local review marks. NOT owned here: each screen builds its own board, so a mark stored on
   * this object would die the moment the clinician navigated. `patients/+layout.svelte` owns the
   * log and both screens read the same one.
   */
  readonly #log: ReviewLog;

  get locallyReviewed(): ReadonlyMap<string, Date> {
    return this.#log.marks;
  }

  constructor(source: () => readonly PatientSummary[], log: ReviewLog) {
    this.#log = log;
    this.#source = source;
  }

  /**
   * A plain getter, not a `$derived` field: class field initialisers run in declaration order before
   * the constructor body, so a `$derived` field referencing `this.#source` would be declared before
   * `#source` is assigned. `$derived` is lazy so it happens to work, but a plain getter has no
   * ordering hazard and is still reactive because `data.patients` is reactive.
   */
  get patients(): readonly PatientSummary[] {
    return this.#source();
  }

  /** Rank ONCE over the full set. Every filtered view is a subsequence of this order. */
  readonly ranked = $derived(rankPatients(this.patients));

  /**
   * The band a patient belongs to for filtering purposes. A missing OR unrecognised `risk_level` is
   * `unknown` — the same predicate `RiskChip` uses for S-05 — so a patient is in exactly one band
   * and none can fall out of the tally.
   */
  #bandOf = (patient: PatientSummary): RiskFilter =>
    patient.riskLevel === 'Critical' ||
    patient.riskLevel === 'High' ||
    patient.riskLevel === 'Medium' ||
    patient.riskLevel === 'Low'
      ? patient.riskLevel
      : 'unknown';

  readonly visible = $derived.by(() => {
    const q = this.query.trim().toLowerCase();
    return this.ranked.filter((p) => {
      // Handoff section 3: search filters by PATIENT ID only. Nothing else is searchable.
      if (q !== '' && !p.patientId.toLowerCase().includes(q)) return false;
      // The risk band composes with the review/quality filter rather than replacing it.
      if (this.riskBand !== null && this.#bandOf(p) !== this.riskBand) return false;
      // 'Needs review' is Pending review ONLY. 'unknown' ranks above Reviewed (K1 = 1) but is
      // EXCLUDED here. That asymmetry is deliberate — do not "fix" either half (**G-09**).
      if (this.filter === 'needs-review') return p.reviewStatus === 'pending_review';
      // `reviewed` added 2026-08-23 — `needs-review`'s mirror, so either review-status group can be
      // viewed without scrolling past the other. Raw `reviewStatus`, matching `needs-review`'s own
      // choice: a patient marked reviewed only LOCALLY (not yet reflected on the wire) still shows
      // under `needs-review` here, exactly as it always has — this filter does not change that.
      if (this.filter === 'reviewed') return p.reviewStatus === 'reviewed';
      // Patient-level data quality is governed by the LATEST reading (F-6, **G-26**). `null` is not
      // `insufficient`: it is its own state and is not in this filter.
      if (this.filter === 'data-limited') return p.sufficientData === 'insufficient';
      // `sufficiency-unknown` added 2026-08-23 — the F-6 `null` state, previously visible only as a
      // per-card badge with no way to isolate the group. See `TriageFilter`'s doc comment.
      if (this.filter === 'sufficiency-unknown') return p.sufficientData === null;
      return true;
    });
  });

  /**
   * F-12: counted across the FULL loaded set, never the filtered view, and labelled so the scope is
   * unambiguous. A count that moved with the filter would answer a different question each time.
   */
  readonly pendingReviewCount = $derived(
    this.patients.filter((p) => p.reviewStatus === 'pending_review').length,
  );

  /** The filter chips carry counts computed from the SAME source, so they cannot disagree. */
  readonly counts = $derived.by(() => {
    const q = this.query.trim().toLowerCase();
    // The chip counts narrow with the SEARCH and with the RISK BAND, because they promise what
    // clicking that chip would yield. They do not narrow with the chips themselves, which is what
    // makes them comparable to each other.
    const searched = this.ranked.filter(
      (p) =>
        (q === '' || p.patientId.toLowerCase().includes(q)) &&
        (this.riskBand === null || this.#bandOf(p) === this.riskBand),
    );
    return {
      all: searched.length,
      'needs-review': searched.filter((p) => p.reviewStatus === 'pending_review').length,
      reviewed: searched.filter((p) => p.reviewStatus === 'reviewed').length,
      'data-limited': searched.filter((p) => p.sufficientData === 'insufficient').length,
      'sufficiency-unknown': searched.filter((p) => p.sufficientData === null).length,
    } as const satisfies Record<TriageFilter, number>;
  });

  /**
   * How many patients sit in each risk band, across the FULL loaded set — the same scope discipline
   * as `pendingReviewCount` (F-12), and labelled as such where it is rendered. A distribution that
   * moved with the filter would answer a different question on every click.
   *
   * It counts the FULL loaded set even while a band is selected, and that is what makes it usable
   * as a control: a tally that narrowed to its own selection would leave every other band showing
   * zero, and there would be no way back except the browser's Back button.
   *
   * This is a COUNT of a schema field, not a derived severity: nothing here computes a risk level,
   * applies a threshold, or scales a score (CLAUDE.md rule 16). A level this build does not
   * recognise, and a missing one, both land in `unknown` rather than being dropped — a patient
   * absent from the tally is a patient the unit cannot see.
   */
  readonly riskCounts = $derived.by(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, unknown: 0 };
    for (const patient of this.patients) {
      const level = patient.riskLevel;
      if (level === 'Critical' || level === 'High' || level === 'Medium' || level === 'Low') {
        counts[level] += 1;
      } else {
        counts.unknown += 1;
      }
    }
    return counts;
  });

  /**
   * The visible board, partitioned into the three review blocks IN RANK ORDER.
   *
   * This changes nothing about the ordering: review state is the PRIMARY sort key
   * (`rank.ts`: pending 0, unknown 1, reviewed 2), so concatenating the three blocks reproduces
   * `visible` exactly. What it adds is a heading and a count at each boundary, which is the
   * difference between scrolling thirty cards and reading a unit.
   *
   * It partitions on the EFFECTIVE status — the one that folds in a local `Mark as reviewed` — so a
   * patient the clinician has just reviewed moves out of the needs-attention block instead of
   * sitting inside it wearing a `Reviewed` chip. Nothing clinical changes with it: the score, the
   * band and every other field are untouched, which is exactly what RULE TWO requires.
   *
   * The rank number is assigned AFTER partitioning, so it is the position on screen and always runs
   * 1…N down the page.
   */
  readonly groups = $derived.by(() => {
    const buckets: Record<ReviewStatus, PatientSummary[]> = {
      pending_review: [],
      unknown: [],
      reviewed: [],
    };
    for (const patient of this.visible) {
      buckets[this.effectiveReviewStatus(patient)].push(patient);
    }

    const order = ['pending_review', 'unknown', 'reviewed'] as const;
    let position = 0;
    return order
      .map((status) => ({
        status,
        patients: buckets[status].map((patient) => {
          position += 1;
          return { patient, rank: position };
        }),
      }))
      .filter((group) => group.patients.length > 0);
  });

  readonly emptyReason: EmptyReason = $derived(
    this.patients.length === 0
      ? 'no_patients_loaded'
      : this.visible.length === 0
        ? 'filtered_out'
        : null,
  );

  /**
   * Mutates review state and NOTHING else (Handoff section 4, `screens.md` section 8 RULE TWO).
   * It does not touch the risk score, the risk band, the shares, the contributors, the parameters,
   * the explanation, or the citations — and it triggers no refetch.
   */
  markReviewed = (patientId: string, at: Date) => this.#log.mark(patientId, at);

  /**
   * THE REVIEW HISTORY, in two groups that are never merged.
   *
   * What YOU marked on this screen is a different fact from what the assessment data already
   * reports, and they have different standing: the first is local, unsaved, and invisible to
   * everyone else; the second came off the wire. Presenting them as one list would let a clinician
   * read their own unsaved click as a recorded review — exactly the confusion RULE TWO exists to
   * prevent.
   */
  readonly reviewHistory = $derived.by(() => {
    const byId = new Map(this.patients.map((p) => [p.patientId, p]));
    const thisSession = [...this.locallyReviewed.entries()]
      .flatMap(([patientId, at]) => {
        const patient = byId.get(patientId);
        return patient ? [{ patient, at }] : [];
      })
      // Newest first: the last thing you did is the thing you are most likely checking.
      .sort((a, b) => b.at.getTime() - a.at.getTime());

    const inTheData = this.patients.filter(
      (p) => p.reviewStatus === 'reviewed' && !this.locallyReviewed.has(p.patientId),
    );

    return { thisSession, inTheData };
  });

  /** The effective review state, folding in a local mark. Used by the chip and by the ranking. */
  effectiveReviewStatus = (patient: PatientSummary) =>
    this.locallyReviewed.has(patient.patientId) ? ('reviewed' as const) : patient.reviewStatus;
}
