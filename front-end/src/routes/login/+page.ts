// src/routes/login/+page.ts

import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageLoad } from './$types';

/**
 * `next` is where the user was going before the gate stopped them, and it is the one piece of this
 * page that a stranger controls. It is validated to a SAME-ORIGIN, ABSOLUTE PATH before it is ever
 * used as a redirect target: a `next` of `https://elsewhere.example/harvest` on a link mailed to a
 * clinician would otherwise turn this hospital's sign-in page into an open redirect that lands them
 * on someone else's login form with the URL bar still reading as trusted.
 *
 * `//evil.example` is rejected too — a protocol-relative URL starts with a slash and is not a path.
 */
/*
 * NOT exported. SvelteKit validates the exports of a `+page.ts` and rejects anything outside
 * `load`, `prerender`, `csr`, `ssr`, `trailingSlash`, `config`, `entries` — or a name starting with
 * `_`. An `export function safeNext` throws `Invalid export 'safeNext'` and the whole route 500s.
 *
 * That check runs in the DEV server and not in the production build, so the e2e suite — which runs
 * against `vite preview` — was green while `pnpm dev` was serving a 500. See `docs/LESSONS.md`
 * L-068.
 */
function safeNext(raw: string | null): string {
  if (!raw) return resolve('/patients');
  if (!raw.startsWith('/') || raw.startsWith('//')) return resolve('/patients');
  return raw;
}

export const load: PageLoad = async ({ url, parent }) => {
  const { session, authRequired } = await parent();
  const next = safeNext(url.searchParams.get('next'));

  // Already signed in: this page has nothing to offer. Sending them on is kinder than a sign-in form
  // that reports success without doing anything.
  if (authRequired && session.authenticated) redirect(307, next);

  return { next, authRequired };
};
