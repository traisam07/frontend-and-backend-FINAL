// src/lib/state/context.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 4.
//
// A module-level `Symbol()` key with `setContext`/`getContext`. PHI never lives in module scope:
// server-side module scope is shared across requests, so a module-level board instance would leak
// one clinician's patient list into another's response. Context is per component tree, which is per
// request.

import { getContext, setContext } from 'svelte';
import type { TriageBoard } from './triage.svelte';
import type { ReviewLog } from './review-log.svelte';

const KEY = Symbol('pulsemind:triage-board');

export const setTriageBoard = (board: TriageBoard): TriageBoard => setContext(KEY, board);

/**
 * The local review marks, owned by `patients/+layout.svelte` so they survive board → detail → board.
 * In context rather than module scope: it maps patient ids to times, which is identity data.
 */
const REVIEW_LOG = Symbol('pm-review-log');
export const setReviewLog = (log: ReviewLog): ReviewLog => setContext(REVIEW_LOG, log);
export const getReviewLog = (): ReviewLog => getContext(REVIEW_LOG);
export const getTriageBoard = (): TriageBoard => getContext<TriageBoard>(KEY);

/** The one app clock tick, shared through context so no component reaches for `Date.now()`. */
const CLOCK_KEY = Symbol('pulsemind:clock');

export interface AppClock {
  readonly now: Date;
}

export const setAppClock = (clock: AppClock): AppClock => setContext(CLOCK_KEY, clock);
export const getAppClock = (): AppClock => getContext<AppClock>(CLOCK_KEY);
