// src/lib/domain/rank.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 2.
// `.claude/skills/pulsemind-spec/SKILL.md` section 3 owns the ranking RULE (K1..K5) and carries a
// labelled excerpt; it declares nothing and exports nothing.

import type { PatientSummary, RankKey, ReviewStatus, RiskLevel } from './types';

// `satisfies` is the exhaustiveness check: add a member to `ReviewStatus` or `RiskLevel` and these
// two lines go red, instead of the lookup quietly yielding `undefined` and the comparator quietly
// returning `NaN` — which would make the order non-total and let the board jitter between refreshes.
// `satisfies` binds with NO line break before it — `as const \n satisfies …` is a syntax error
// (TS1434), not a formatting preference, so the object literal is what wraps.
const REVIEW_RANK = {
  pending_review: 0,
  unknown: 1,
  reviewed: 2,
} as const satisfies Record<ReviewStatus, number>;

const RISK_RANK = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
} as const satisfies Record<RiskLevel, number>;

/** K2 absence: an absent or unrecognised level sorts after every real level. Never coerced to `Low`. */
const RISK_RANK_UNKNOWN = 4;

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/**
 * Descending, with absence sorted LAST on this key. Written out rather than `(x ?? 0)` because a
 * default would rank a patient with no score above a real one, and rather than `-Infinity` because
 * `-Infinity - -Infinity` is `NaN`, which makes the whole comparator non-total.
 */
function compareDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function compareInstantDesc(a: Date | null, b: Date | null): number {
  return compareDesc(a === null ? null : a.getTime(), b === null ? null : b.getTime());
}

/**
 * Handoff section 3: pending review first, then risk level, then risk score.
 * Two extra keys make the order TOTAL, so the result cannot depend on input order or on sort
 * stability and the board cannot jitter between refreshes.
 */
export function comparePatients(a: PatientSummary, b: PatientSummary): number {
  return (
    REVIEW_RANK[a.reviewStatus] - REVIEW_RANK[b.reviewStatus] ||
    (a.riskLevel === null ? RISK_RANK_UNKNOWN : RISK_RANK[a.riskLevel]) -
      (b.riskLevel === null ? RISK_RANK_UNKNOWN : RISK_RANK[b.riskLevel]) ||
    compareDesc(a.riskScore, b.riskScore) ||
    compareInstantDesc(a.latestChartTime, b.latestChartTime) ||
    collator.compare(a.patientId, b.patientId)
  );
}

/** Pure: returns a NEW array. Never sorts the input. */
export function rankPatients(patients: readonly PatientSummary[]): readonly PatientSummary[] {
  return patients.toSorted(comparePatients);
}

/**
 * The memoization key for `docs/spec/screens.md` section 6.5 rule 3: re-rank ONLY when the ranking
 * projection changes. If this key set is unchanged across a data arrival, the caller reuses the
 * previous array identity so the DOM does not churn and a focused card is never recreated.
 *
 * It carries exactly the five comparator inputs and nothing else — adding a field here that the
 * comparator does not read would re-rank on a change that cannot move a row.
 */
export function rankKeyOf(patient: PatientSummary): RankKey {
  return {
    patientId: patient.patientId,
    reviewRank: REVIEW_RANK[patient.reviewStatus],
    riskRank: patient.riskLevel === null ? RISK_RANK_UNKNOWN : RISK_RANK[patient.riskLevel],
    riskScore: patient.riskScore,
    latestCharttimeMs: patient.latestChartTime === null ? null : patient.latestChartTime.getTime(),
  };
}
