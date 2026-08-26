// src/routes/+page.ts
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * `/` is not a screen. The handoff's starting screen is Patient Overview, and the route table
 * (`docs/spec/screens.md` section 2) makes `/patients` its address, so `/` redirects rather than
 * rendering a second, unspecified landing page.
 *
 * 307, not 301: the mapping is this app's routing decision and must not be cached in a browser
 * forever if the route table changes.
 */
export const load: PageLoad = () => {
  redirect(307, '/patients');
};
