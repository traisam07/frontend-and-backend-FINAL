// src/routes/account/security/+page.ts

import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * This page manages a person's own sign-in factors, so it needs a session — and the root layout has
 * already fetched one, whether or not the gate is on. Reading it through `parent()` rather than
 * fetching again means the header and this page can never disagree about who is signed in, and
 * costs no second request.
 *
 * A signed-out visitor gets the app's own named error state — `NOT_AUTHENTICATED` — not a redirect.
 * A redirect here would be a guess about where they were trying to go; this page IS the destination,
 * and saying so plainly lets them sign in and come back to it.
 *
 * Note that with the gate OFF this is the only screen in the app that refuses anyone. That is not an
 * inconsistency: the clinical screens are ungated because gating them is an authorisation decision
 * this harness must not make (**D-16**, **G-46**), while "manage MY factors" has no meaning without
 * a "my".
 */
export const load: PageLoad = async ({ parent }) => {
  const { session } = await parent();

  if (!session.authenticated || !session.user) {
    error(401, {
      code: 'NOT_AUTHENTICATED',
      message: 'Sign in to manage the sign-in methods on your account.',
    });
  }

  return { user: session.user, amr: session.amr };
};
