// src/routes/patients/[patientId]/+layout.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 7.
//
// THE SINGLE-PATIENT LOAD, and it is a LayoutLoad rather than a PageLoad on purpose. `await parent()`
// inside a `+page.ts` resolves the merged data of the parent LAYOUT loads only — a sibling `+page.ts`
// is a leaf and contributes nothing — so with this load on a page, the Parameter Detail child below
// would receive `{}`: `snapshot` would be a type error against `./$types` and `undefined` at
// runtime, and the U-13 slug gate could not run at all.
//
// A layout LOAD needs no layout COMPONENT. Layout data merges into the child page's `data`, so
// `[patientId]/+page.svelte` reads `data.snapshot` with no wrapper. There is deliberately no
// `+layout.svelte` here — an empty one that renders only `{@render children()}` buys nothing and adds
// a component that can hold state across patients.

import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { resolvePatientSource } from '$lib/data/source';

export const load: LayoutLoad = async ({ fetch, params, depends }) => {
  depends('pulsemind:patient'); // custom key must match /^[a-z]+:/

  // The source owns the fetch, the deadline, the three-fragment composition, and every transport
  // failure, branched on the status BEFORE any body is read: 404/204 -> PATIENT_NOT_FOUND (G-42),
  // 400 -> UPSTREAM_ERROR, 403 -> FORBIDDEN (U-06), every other non-200 -> UPSTREAM_ERROR. Which
  // source this is, is the selection rule's decision and not this load's. What reaches the line
  // below is one validated snapshot or a named violation — never a patient built from two of three
  // fragments.
  const source = resolvePatientSource(fetch);

  // One controller for the whole call. `getPatient` issues the three fragments together, so when one
  // fails by name and resolves the call, this releases the two still in flight instead of leaving
  // them running against a service that has already failed.
  const inFlight = new AbortController();
  const parsed = await source
    .getPatient(params.patientId, inFlight.signal)
    .finally(() => inFlight.abort());

  if (!parsed.ok) {
    // U-21's mandated single-patient lead-in, verbatim.
    error(502, {
      message: `Assessment could not be validated: ${parsed.problem}`,
      code: 'CONTRACT_VIOLATION',
    });
  }

  // This one key is what `await parent()` hands to every route below.
  return { snapshot: parsed.value };
};
