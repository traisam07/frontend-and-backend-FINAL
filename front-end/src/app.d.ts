// src/app.d.ts
// CANONICAL DECLARATION — `.claude/skills/bootstrap/SKILL.md` section 4.1.
//
// Written before the first route on purpose. SvelteKit's default shape is
// `interface Error { message: string }`, and under it every `error()` call in this app fails the
// excess-property check and every `page.error?.code` read is "Property 'code' does not exist" —
// `pnpm check` would be red on the first load function and the first `+error.svelte`.
declare global {
  namespace App {
    interface Error {
      message: string;
      /**
       * The named failure the UI branches on. CLOSED union — add a member here, never inline.
       *
       * `code` is REQUIRED, not optional: a failure with no name is the anonymous error state this
       * harness exists to prevent. Each member has exactly one origin:
       *
       *   PATIENT_NOT_FOUND        the fragment transport, on a 404/204 from any fragment (G-42)
       *   FORBIDDEN                the fragment transport, on a 403 — state U-06
       *   UPSTREAM_ERROR           the fragment transport (unreachable service, deadline, caller
       *                            abort, 400, any other non-200, non-JSON body) — state U-04
       *   CONTRACT_VIOLATION       both loads, on a `Parsed` failure from the source — state U-21
       *   NO_CURRENT_READING       the parameter slug gate, when `latestReading()` is null — U-11
       *   PARAMETER_NOT_IN_READING the parameter slug gate, on a slug miss — state U-13
       *   NOT_AUTHENTICATED        `account/security/+page.ts`, when nobody is signed in
       *
       * FORBIDDEN is not the board load's code by accident: it reaches the screen only from a 403
       * on one of the three fragment reads, which is why `patients/+error.svelte` — the boundary
       * ABOVE `[patientId]/+layout.ts` — has to render it.
       *
       * NOT_AUTHENTICATED is the only member that comes from the AUTH surface rather than the
       * clinical one, and it is distinct from FORBIDDEN on purpose: "we do not know who you are"
       * and "we know, and no" are different facts with different remedies, and collapsing them
       * sends a signed-out clinician looking for a permission they do not lack.
       */
      code:
        | 'PATIENT_NOT_FOUND'
        | 'PARAMETER_NOT_IN_READING'
        | 'NO_CURRENT_READING'
        | 'UPSTREAM_ERROR'
        | 'CONTRACT_VIOLATION'
        | 'FORBIDDEN'
        | 'NOT_AUTHENTICATED';
    }
  }
}

export {};
