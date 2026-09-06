// src/lib/state/ward-clock.svelte.ts
// CANONICAL DECLARATION — this file.
//
// THE WARD'S CLOCK CAN RUN AHEAD OF THE WALL CLOCK, AND EVERY TIMESTAMP ON SCREEN DEPENDS ON IT.
//
// The live service advances the ward one HOUR of ward time per reading, and it derives each
// reading's instant from that stay's own origin rather than stamping `now()`. It has to: the band
// table's dwell clock is `observed_at - origin` in minutes, its demote dwell is 120 minutes, and
// stamping the wall clock made every parameter age in seconds so nothing could ever step back down.
//
// The consequence reaches the screen. Stream four readings and the newest one is four hours in the
// future by the browser's reckoning. `formatAge` is correct about a future instant and renders
// `in 3 h 42 min`; a whole board of that reads as a broken clock, and the header would be claiming a
// time hours behind every row beneath it.
//
// SO THE CLOCK FOLLOWS THE DATA WHEN THE DATA LEADS. `now` is the wall clock until the newest
// reading on screen is more than `LEAD_THRESHOLD_MS` ahead of it, and the ward's own newest instant
// after that. The header says which of the two it is showing, because a clock that silently
// disagrees with the wall is worse than one that leads and admits it.
//
// WHY MODULE SCOPE IS ALLOWED HERE, and it is the only reason: this holds ONE NUMBER, the newest
// chart instant anywhere on the unit. It is not patient-linked and it is not PHI, which is the same
// test `prefs.svelte.ts` passes. Nothing else may join it here.
//
// WHY A `$effect` WRITES IT, when rule 2 says derive rather than sync: the reader is the ROOT
// LAYOUT and the writers are two route components far below it. Svelte context reads downward only,
// so there is no `$derived` that can see both. The effect writes one number that no clinical value
// is computed from, and it is idempotent.

/**
 * How far ahead the data must be before the clock follows it. One minute: below that the difference
 * is clock skew and network latency rather than a simulated ward, and switching on skew would make
 * the header's label flicker between two readings of the same instant.
 */
const LEAD_THRESHOLD_MS = 60_000;

let newestInstantMs = $state<number | null>(null);

/**
 * Publish the newest chart instant currently on screen. Safe to call with anything: nulls and
 * unparseable dates are ignored rather than treated as the epoch, because a reading with no usable
 * charttime must not be able to drag the unit's clock back to 1970.
 *
 * MONOTONIC WITHIN A SESSION. It only ever moves forward, so navigating from the board to a patient
 * whose own newest reading is older does not walk the header's clock backwards mid-shift.
 */
export function observeWardInstants(instants: readonly (Date | null | undefined)[]): void {
  let newest = newestInstantMs;
  for (const instant of instants) {
    if (!(instant instanceof Date)) continue;
    const ms = instant.getTime();
    if (Number.isNaN(ms)) continue;
    if (newest === null || ms > newest) newest = ms;
  }
  if (newest !== newestInstantMs) newestInstantMs = newest;
}

/**
 * The clock the app should show, given the wall clock.
 *
 * `simulated` is what the header renders a label from. It is not a styling flag: it is the
 * difference between "this is the time" and "this is the time the ward's data is at", and a
 * clinician reading a timestamp needs to know which.
 */
export function wardClockFor(wall: Date): { now: Date; simulated: boolean } {
  const newest = newestInstantMs;
  if (newest === null || newest - wall.getTime() <= LEAD_THRESHOLD_MS) {
    return { now: wall, simulated: false };
  }
  return { now: new Date(newest), simulated: true };
}

/** Test seam and session reset. Never called from a component. */
export function resetWardClock(): void {
  newestInstantMs = null;
}
