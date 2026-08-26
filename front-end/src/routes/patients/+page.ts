// src/routes/patients/+page.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 7.

import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { resolvePatientSource } from '$lib/data/source';

export const load: PageLoad = async ({ fetch, depends }) => {
  depends('pulsemind:board');

  // NOTE: `?q=` / `?filter=` / `?selected=` are deliberately NOT read here. SvelteKit tracks search
  // params PER KEY, so reading them in a load would refetch the whole board on every keystroke in
  // the search box. They are read in the component instead.

  // The source owns the transport and its failures, and the SELECTION RULE owns which source this
  // is — the load does not choose. What reaches the line below is a validated, projected board or a
  // named violation, either way.
  const source = resolvePatientSource(fetch);

  // The load owns the cancellation signal it passes; the DEADLINE is the source's and is
  // unconditional. `abort()` on the way out releases anything still in flight once this load has its
  // answer — a no-op on the success path, where everything has already settled.
  const inFlight = new AbortController();
  const parsed = await source.listPatients(inFlight.signal).finally(() => inFlight.abort());

  if (!parsed.ok) {
    // U-21's mandated board lead-in, verbatim: `Board could not be validated: <problem>`, where
    // `<problem>` is the validator's own text naming the failing path.
    error(502, {
      message: `Board could not be validated: ${parsed.problem}`,
      code: 'CONTRACT_VIOLATION',
    });
  }

  return { patients: parsed.value };
};
