// src/lib/domain/format.ts
// THE ONE PAIR OF TIME FORMATTERS. Every absolute timestamp and every relative age in PulseMind goes
// through these two functions, so the rules in `.claude/skills/clinical-a11y/SKILL.md` section 8.4
// have exactly one implementation and cannot drift between a card, a table cell and a chart label.
//
// The rules, and why each one is a clinical-safety rule rather than a formatting preference:
//
//   24-hour `HH:mm`, no am/pm, anywhere.  `4:30` vs `16:30` is a real error class in a unit that
//                                        runs 24/7.
//   Date shown whenever the instant is    A bare `14:12` on a three-day-old reading reads as fresh.
//   not today, always on Parameter
//   Detail and in the drawer.
//   The zone is LABELLED.                 The schema's `Date` fields carry no zone contract
//                                        (**G-21**), so the app states which zone it is rendering
//                                        rather than silently localising and hoping.
//   Relative age is a SUPPLEMENT.         It is parenthesised and always second; it is never the
//                                        whole rendering and never the accessible name on its own.
//   `now` / `just now` / `recently` are   All five are on the governing banned-copy list
//   banned.                               (`docs/spec/ui-states.md` section 4). Under a minute
//                                        renders `< 1 min ago`, which is a measurement rather than
//                                        a reassurance.

/**
 * The zone every timestamp is rendered in, and the label printed beside it.
 *
 * `[HARNESS]` — harness-defined, pending design confirmation. The schema attaches no zone contract
 * to its `Date` fields and the handoff never names one, so which zone an ICU workstation should
 * display is **G-21**. The interim is the browser's own zone, LABELLED as such: a wrong-but-labelled
 * zone is recoverable, a silently-localised one is not.
 */
export const DISPLAY_ZONE_LABEL = 'local';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The absolute rendering, and the only one. `HH:mm` when the instant is today, `YYYY-MM-DD HH:mm`
 * otherwise, always followed by the zone label.
 *
 * `reference` is the app clock tick the layout owns — passed in, never read from `Date.now()` here,
 * so a projection stays a pure function of its inputs and a test can pin "today".
 *
 * **Omitting `reference` means "always print the date"**, which is what section 8.4 requires on
 * Parameter Detail and in the drawer. It does NOT mean "fall back to the wall clock": a wall-clock
 * fallback would make the same instant render differently at 23:59 and 00:01, and no clinical value
 * may depend on an implicit clock read.
 */
export function formatAbsolute(instant: Date, reference?: Date): string {
  const time = timeFormatter.format(instant);
  if (reference !== undefined && isSameDay(instant, reference)) {
    return `${time} ${DISPLAY_ZONE_LABEL}`;
  }
  return `${dateFormatter.format(instant)} ${time} ${DISPLAY_ZONE_LABEL}`;
}

/** The machine-readable half. Always paired with `formatAbsolute` inside a `<time datetime>`. */
export function toDateTimeAttribute(instant: Date): string {
  return instant.toISOString();
}

/**
 * `HH:mm` only, no date, no zone label — for the EVENLY-SPACED intermediate x-axis ticks a 60-minute
 * chart draws between its first and last plotted point ("about five evenly spaced time tick labels",
 * 2026-08-23). Those instants are computed by interpolation, not carried by any reading, so they get
 * `formatAbsolute`'s time-of-day half and none of its date/zone machinery: a date switch or a zone
 * label repeated five times across one 60-minute axis would be noise `formatAbsolute`'s own rules
 * exist to avoid at the two REAL endpoints, which still call `formatAbsolute` and still carry it.
 */
export function formatClockTime(instant: Date): string {
  return timeFormatter.format(instant);
}

/**
 * The relative age, as a parenthesised SUPPLEMENT to an absolute time — never on its own.
 *
 * `< 1 min ago`, then whole minutes, then `1 h 12 min ago`, then absolute-only beyond 24 h (this
 * function returns the empty string there, and the caller drops the supplement rather than printing
 * a number of days that invites a glance-read).
 *
 * A future instant — a clock skew between the workstation and the source — renders `in N min`
 * rather than a negative age or a clamped `0 min ago`, because a clamp would present a
 * clock problem as freshness.
 */
export function formatAge(instant: Date, now: Date): string {
  const deltaMs = now.getTime() - instant.getTime();

  if (!Number.isFinite(deltaMs)) return '';

  const future = deltaMs < 0;
  const abs = Math.abs(deltaMs);
  const minutes = Math.floor(abs / 60_000);

  if (minutes < 1) return future ? 'in < 1 min' : '< 1 min ago';

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours >= 24) return ''; // beyond a day the absolute stamp stands alone
  if (hours >= 1) {
    const text = remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
    return future ? `in ${text}` : `${text} ago`;
  }
  return future ? `in ${minutes} min` : `${minutes} min ago`;
}

/**
 * A duration between two instants, for the F-10 "charting history / age" column: `< 1 min`,
 * `N min`, `N h M min`. No `ago`, because this is an interval between two data points rather than
 * an age against the wall clock.
 */
export function formatInterval(fromInstant: Date, toInstant: Date): string {
  const ms = Math.abs(toInstant.getTime() - fromInstant.getTime());
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '< 1 min';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 1) return `${minutes} min`;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}
