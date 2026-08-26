// src/routes/patients/[patientId]/parameters/[parameterSlug]/+page.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 7.
//
// KEEP THIS FILE. Its only job is the slug gate. It calls `await parent()` — which genuinely
// resolves `{ snapshot }`, because the single-patient load is a LAYOUT load — and NEVER refetches
// the patient, so switching chips fires no network request and cannot briefly pair one parameter's
// name with another's value.

import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { latestReading } from '$lib/domain/derive';

export const load: PageLoad = async ({ params, parent }) => {
  // `[patientId]/+layout.ts` already loaded and validated this patient. No second fetch.
  const { snapshot } = await parent();

  // F-1, via the helper. `snapshot.latestReading` does not exist, and `snapshot.readings[0]` is both
  // unordered and `Reading | undefined` under `noUncheckedIndexedAccess`.
  const latest = latestReading(snapshot.readings);
  if (latest === null) {
    error(404, {
      // The U-11 literal for the `NO_CURRENT_READING` path, spelled exactly as the matrix gives it —
      // NO trailing period — and identical to PD-2's, which is the other surface that state covers.
      // The OV-4 card's time slot is a DIFFERENT state, U-22, with its own literal.
      message: 'No assessment available for this patient',
      code: 'NO_CURRENT_READING',
    });
  }

  const parameter = latest.parameters.find((p) => p.slug === params.parameterSlug);
  if (!parameter) {
    // Explicit and named. NEVER fall back to the first chip (U-13) — a silent fallback would show
    // one parameter's value under another's name. The requested slug is interpolated, because U-13
    // requires both the sentence and the slug, and two spellings of one state is a state a test
    // cannot assert.
    error(404, {
      message: `This parameter is not present in the current reading: "${params.parameterSlug}"`,
      code: 'PARAMETER_NOT_IN_READING',
    });
  }

  return { parameter, chartTime: latest.charttime };
};
