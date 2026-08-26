// src/lib/a11y/announcer.svelte.ts
// CANONICAL DECLARATION — `.claude/skills/clinical-a11y/SKILL.md` section 6.
//
// Per-session, created in the root layout, held in context. NOT a module singleton: announcement
// text can contain a patient id, which is PHI (**G-29**), and server-side module scope is shared
// across requests.
//
// There is exactly ONE correct politeness mapping, and it is not "wrap the board in aria-live":
//
//   routine score/timestamp update      polite     continuous; interrupting for "68 -> 69" is the
//                                                  screen-reader equivalent of alarm fatigue
//   board re-sorted / filtered          polite     announce the RESULT ("7 patients match"), never
//                                                  each row
//   Mark as reviewed succeeded          polite     user-initiated, expected
//   a patient NEWLY enters Critical     assertive  the exact case ARIA reserves assertive for:
//                                                  time-sensitive, not user-initiated
//   backend error / connection lost     assertive  the user must know the board is not live

import { getContext, setContext } from 'svelte';

const KEY = Symbol('pm-announcer');

/** Coalescing window for the polite region, in ms. Harness-defined. */
const POLITE_DEBOUNCE_MS = 2000;
/** Per-patient rate limit for the assertive region, in ms. Harness-defined. */
const ALERT_COOLDOWN_MS = 60_000;

export class Announcer {
  polite = $state('');
  assertive = $state('');
  #queue: string[] = [];
  #timer: ReturnType<typeof setTimeout> | undefined;
  #lastAlert = new Map<string, number>();

  /** Routine, expected, or user-initiated changes. Debounced and coalesced. */
  say(message: string): void {
    this.#queue.push(message);
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.polite = this.#queue.join(' ');
      this.#queue = [];
    }, POLITE_DEBOUNCE_MS);
  }

  /**
   * THE ONLY assertive call-site in the codebase, so this policy cannot erode. Rate-limited per
   * patient: the same patient escalating announces once, not on every poll.
   */
  alertCritical(patientId: string, detail: string): void {
    const now = Date.now();
    if (now - (this.#lastAlert.get(patientId) ?? 0) < ALERT_COOLDOWN_MS) return;
    this.#lastAlert.set(patientId, now);
    // Short, and leading with the fact.
    this.assertive = `Critical: patient ${patientId}. ${detail}`;
  }

  clear(): void {
    clearTimeout(this.#timer);
    this.#queue = [];
    this.polite = '';
    this.assertive = '';
  }
}

export const setAnnouncer = (): Announcer => setContext(KEY, new Announcer());
export const getAnnouncer = (): Announcer => getContext<Announcer>(KEY);
