// src/routes/guide/+page.ts

import type { PageLoad } from './$types';

/**
 * The guide is READABLE BY ANYONE. It contains no patient data — it describes the interface — so it
 * is not gated, and a clinician who cannot get past the sign-in screen can still be pointed at it.
 *
 * `?first=1` is the first-run presentation: it hides the back link (there is nothing behind it yet)
 * and swaps the footer for an acknowledgement. It is set by the gate in `+layout.ts`, never by the
 * clinician, and it is only honoured for someone who is actually signed in and has not acknowledged
 * — otherwise a shared link with `?first=1` would show a signed-out reader a button that cannot
 * work.
 */
export const load: PageLoad = async ({ url, parent }) => {
  const { session } = await parent();

  const unacknowledged =
    session.authenticated && session.user !== null && session.user.guideAcknowledgedAt === null;

  return {
    firstRun: url.searchParams.get('first') === '1' && unacknowledged,
    /** Where the acknowledgement lands. Validated the same way `/login` validates its own `next`. */
    next: safeNext(url.searchParams.get('next')),
  };
};

/**
 * NOT exported — SvelteKit rejects any export from a `+page.ts` outside its fixed list, and that
 * check runs in the dev server only, so an exported helper builds perfectly and 500s the route in
 * `pnpm dev` (`docs/LESSONS.md` L-068).
 *
 * Same-origin absolute paths only. An unchecked `next` on a page that anyone can link to is an open
 * redirect.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/patients';
  return raw;
}
