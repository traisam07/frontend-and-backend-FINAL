// src/lib/design/review-classes.ts
// CANONICAL DECLARATION — this file. The declaring-file register already credits it to "the file
// itself" (`.claude/skills/bootstrap/SKILL.md` section 4), but the header did not SAY so until
// 2026-08-19, so a grep written to enumerate declarations by their header form would have missed it
// and reported a passing result over a short register (`docs/LESSONS.md` L-050, and rule 19's list
// of five header forms). The design-system skill owns the VISUAL contract in section 5.3 and shows
// no competing copy of the maps.
//
// The review family's non-colour channel is the LEFT RULE + a glyph, which is why every base string
// below carries `border-l-4`.
//
// The three LABELS are not here. `reviewLabel` in `$lib/domain/derive` is the single owner of
// `Reviewed`, `Pending review` and `Review status unavailable` (S-09), and the chips call it. One
// label map, one class map, and no caller recomputing either.

import type { ReviewStatus } from '$lib/domain/types';

/**
 * `text-body`, not `text-sm`. `app.css` calls 16px the FLOOR for any clinical value, and review
 * state is a clinical state (S-06…S-09) rather than table meta. It also puts this chip level with
 * `RiskChip` and `InsufficientChip`: until 2026-08-19 the risk chip alone had been lifted to 16px
 * and these two were left at 14px, so a board row carried three chips at two sizes and the risk
 * score read as shouted. Reported by the product owner, measured, and levelled rather than lowered —
 * lowering the risk chip would have put a clinical VALUE below the floor.
 */
// `uppercase` ADDED 2026-08-23, at the product owner's report that `RiskTally`'s Review-row filter
// chips read smaller than its Data/Risk rows ("filter của review có size chữ bé hơn filter của
// data và risk") — all three rows already shared the SAME declared font size, but the Data/Risk
// rows' labels had carried `uppercase` since the filter's own uppercase pass and Review's never
// did, which is what actually read as smaller. Bringing `RiskTally`'s Review chips up to match
// left THIS board chip as the only "Reviewed"/"Pending review" still sentence-case anywhere in the
// app — the same drift already caught and fixed once for `RiskChip`/`InsufficientChip` — so it
// gets the same treatment here, on the one shared base every review chip renders through. CSS
// `text-transform` only: `reviewLabel()` still returns mixed-case text, and every other reader of
// it (the announcer, `<title>`, etc.) is unaffected.
export const REVIEW_CHIP_BASE =
  'inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border border-l-4 px-2 ' +
  'py-0.5 text-body font-semibold uppercase';

export const REVIEW_CHIP = {
  /**
   * A SOLID fill with white type in both themes. Handoff section 4 makes pending review the
   * prominent state, and as a pale tint it was the least prominent thing on the card. The 4px LEFT
   * RULE stays — it is review's non-colour channel — now drawn in the ink colour so it still reads
   * against the fill.
   */
  pending_review:
    'border-review-pending-solid border-l-review-pending-on bg-review-pending-solid text-review-pending-on',
  reviewed:
    'border-review-done-border border-l-review-done-border bg-review-done-bg text-review-done-fg',
  unknown:
    'border-dashed border-insufficient-border border-l-insufficient-border bg-insufficient-bg text-insufficient-fg',
} as const satisfies Record<ReviewStatus, string>;

/**
 * The PD-3 panel. Pending is the PROMINENT state (Handoff section 4): a 4px left rule, a glyph, a
 * heading, the flag time, and the `Mark as reviewed` action.
 *
 * The panel is NOT `role="alert"` — it is present on load, and alerts are for changes.
 */
export const REVIEW_PANEL = {
  pending_review:
    'rounded-md border border-review-pending-border border-l-4 border-l-review-pending-solid bg-review-pending-bg p-4 text-fg',
  reviewed: 'rounded-md border border-review-done-border bg-review-done-bg p-4 text-review-done-fg',
  unknown:
    'rounded-md border border-insufficient-border bg-insufficient-bg p-4 text-insufficient-fg pm-hatch',
} as const satisfies Record<ReviewStatus, string>;
