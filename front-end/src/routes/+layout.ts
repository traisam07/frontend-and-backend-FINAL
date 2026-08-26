// src/routes/+layout.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 7.

import { redirect } from '@sveltejs/kit';
import { authRequired, fetchSession } from '$lib/auth/client';
import type { LayoutLoad } from './$types';

/**
 * SPA. Every screen renders per-patient PHI, and the app has no server-side session to render it
 * against: the data source is reached from the browser with the user's own credentials.
 */
export const ssr = false;

/**
 * NEVER `true` on any route that renders patient data. Prerendered HTML is served identically to
 * every user; for per-patient PHI that is a breach, not a performance tweak. It also has no dynamic
 * environment to read, which is where `PUBLIC_PULSEMIND_DATA_SOURCE` and `PUBLIC_PULSEMIND_API_BASE`
 * come from.
 */
export const prerender = false;

/**
 * Routes reachable without a session. Everything else is behind the gate when the gate is on.
 *
 * `/guide` is public because it describes the INTERFACE and contains no patient data — a clinician
 * who cannot get past the sign-in screen can still be pointed at it.
 */
const PUBLIC_ROUTES = ['/login', '/guide'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * THE SESSION LOAD, AND THE GATE.
 *
 * When `PUBLIC_PULSEMIND_REQUIRE_AUTH` is not `'true'` this does no work at all — no request, no
 * redirect, no session — and the board behaves exactly as it did before authentication existed.
 * That default is the reviewable position described in `$lib/auth/client.ts` (**D-16**): the sign-in
 * surface is complete and tested, and whether it GATES the clinical screens is an operator's
 * decision, not one this harness makes on the handoff's behalf while **G-46** is open.
 *
 * When the gate IS on, this deliberately re-runs on every navigation, because it reads `url`. That
 * costs one local round trip per screen change and buys something worth more on a clinical display:
 * a session that expires mid-shift is noticed at the next navigation instead of leaving a ward's
 * PHI on screen behind a cookie the service has already forgotten.
 */
export const load: LayoutLoad = async (event) => {
  // Lets a completed sign-in refresh this without a full page load: `invalidate('pulsemind:session')`.
  event.depends('pulsemind:session');

  /**
   * The session is fetched WHETHER OR NOT the gate is on, and that is not wasted work: with the gate
   * off a clinician can still sign in, and a header that kept rendering the G-23 unknown treatment
   * beside a completed sign-in would be stating something false about who is at the terminal. An
   * unreachable service reports signed-out rather than throwing, so a fixtures-only build with no
   * backend behaves exactly as it did before authentication existed.
   */
  const session = await fetchSession(event.fetch);
  const required = authRequired();

  if (!required) {
    // `event.url` is deliberately NOT read on this path. SvelteKit tracks load dependencies through
    // property access, so touching it here would make this load re-run — and re-fetch — on every
    // navigation, for a guard that is switched off. Ungated, it runs once and then only on
    // `invalidate('pulsemind:session')`.
    return { session, authRequired: false };
  }

  const target = `${event.url.pathname}${event.url.search}`;

  if (!session.authenticated && !isPublic(event.url.pathname)) {
    // `next` carries the whole target — path AND query — so a deep link into a filtered board
    // survives the sign-in instead of dropping the clinician on a default view.
    redirect(307, `/login?next=${encodeURIComponent(target)}`);
  }

  /**
   * FIRST SIGN-IN: the usage guide, once.
   *
   * The flag is on the ACCOUNT, not in `localStorage`. A ward workstation is shared, so a
   * per-browser mark would hide the guide from the next clinician to sit down and re-show it to this
   * one on the next terminal — neither is what "first sign-in" means.
   *
   * It carries `next`, so a clinician who followed a deep link into a filtered board lands there
   * after acknowledging rather than on a default view. `/guide` is public, so it is already
   * excluded by `isPublic` and this cannot loop.
   */
  if (
    session.authenticated &&
    session.user !== null &&
    session.user.guideAcknowledgedAt === null &&
    !isPublic(event.url.pathname)
  ) {
    redirect(307, `/guide?first=1&next=${encodeURIComponent(target)}`);
  }

  return { session, authRequired: true };
};
