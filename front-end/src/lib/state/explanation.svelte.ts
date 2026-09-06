// src/lib/state/explanation.svelte.ts
// CANONICAL DECLARATION — this file.
//
// ONE GENERATION, TWO PANELS, ONE FRAME.
//
// PD-8 (the explanation) and PD-9 (the guideline references) are SIBLINGS on screen and are now in
// different places on it, but they are one fact: the references are the approved passages the
// generator was SHOWN, so they travel with the text they grounded and cannot disagree with it.
// Attaching them at scoring time was tried and it read as a separate lookup, filling the references
// panel before anything had been generated.
//
// So the request state lives HERE, one level above both, and each panel renders from it. Owned
// inside either panel, the result is unreachable from the other.
//
// WHY THERE IS A CONTROL AT ALL. The delivered design renders `explanation` as pure DATA across four
// treatments, with no way to ask for one. That is right for a backend that writes the prose before
// the reading arrives. The live service does not: a local 7B writes it on demand in tens of seconds
// on the one GPU that also does the scoring, so an unrequested reading legitimately has no
// explanation and S-37 is its honest state. Without a control S-37 is the ONLY state any reading can
// ever reach, and the model never appears. The control is the fifth treatment, added 2026-08-28.
//
// ⚠️ RE-PROMPTING RETURNS BYTE-IDENTICAL PROSE, and the panel has to say so. Decoding is greedy:
// verified with two live calls on one reading, same sha256, same 609 characters, same citation. Left
// unsaid, the honest outcome (the model reproducing itself exactly) is indistinguishable from a
// button that did nothing.

import { postExplanation } from '$lib/data/pulsemind-source';
import { isRecord } from '$lib/data/source';

/** What one completed generation produced. Never partially applied: both fields or neither. */
export interface GeneratedExplanation {
  readonly text: string;
  readonly citations: ReadonlyArray<{ name: string; claim: string }>;
}

/**
 * How long to wait. The two paths are minutes apart and a single number would be wrong for both:
 * the deterministic template answers in under a millisecond, while a cold 7B load has been measured
 * at 43 s before it writes a word and generation itself swings from 15 s to 35 s with what is left
 * on the card. The ceiling is above the service's own 240 s explain timeout, so the service gives up
 * first and the browser reports what the service said rather than a guess about why it went quiet.
 */
const TEMPLATE_TIMEOUT_MS = 20_000;
const LLM_TIMEOUT_MS = 300_000;

export class ExplanationRequest {
  /** In flight. Drives the fifth treatment and disables the control. */
  generating = $state(false);

  /**
   * A named, visible failure. Never swallowed, never resolved to an empty panel.
   *
   * PRIVATE AND TAGGED, like `#result`. It used to be public and untagged, cleared only at the top
   * of the next `generate()`, so a failure raised against the 14:00 reading stayed on screen after
   * the ward advanced and rendered underneath the 15:00 one. Every other member of this class is
   * reading-scoped; this was the one that was not.
   */
  #failure = $state<string | null>(null);
  #failedFor = $state<string | null>(null);

  /** The failure for THIS reading, or null. Never another reading's. */
  failureFor(chartedIso: string): string | null {
    return this.#failedFor === chartedIso ? this.#failure : null;
  }

  #result = $state<GeneratedExplanation | null>(null);

  /**
   * WHICH READING THE RESULT DESCRIBES, as an ISO instant.
   *
   * Generation takes tens of seconds and the ward can advance underneath it, so a result that is
   * not tagged with its reading will eventually be rendered beside a different one. This is the tag
   * that prevents it: `resultFor` compares before returning anything.
   */
  #generatedFor = $state<string | null>(null);

  /** The generated result for THIS reading, or null. Never another reading's prose. */
  resultFor(chartedIso: string): GeneratedExplanation | null {
    return this.#generatedFor === chartedIso ? this.#result : null;
  }

  /** True while a generation for THIS reading is running. A different reading's is not this one's. */
  generatingFor(chartedIso: string): boolean {
    return this.generating && this.#requestedFor === chartedIso;
  }

  #requestedFor = $state<string | null>(null);

  /**
   * Ask the service to write the explanation for ONE STORED READING.
   *
   * `assessedAt` is passed explicitly rather than letting the service resolve "latest" at request
   * time: by the time the text is written back, several readings may have arrived and the prose
   * would describe a row the board has already replaced.
   *
   * `useLlm: false` selects the deterministic template floor. No GPU, correct prose, and the only
   * way to exercise this path on a busy card.
   */
  async generate(patientId: string, chartedIso: string, useLlm = true): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    this.#failure = null;
    this.#failedFor = chartedIso;
    this.#requestedFor = chartedIso;

    const result = await postExplanation(
      fetch,
      patientId,
      chartedIso,
      useLlm,
      useLlm ? LLM_TIMEOUT_MS : TEMPLATE_TIMEOUT_MS,
    );
    this.generating = false;

    if (!result.ok) {
      // The previous result is deliberately left in place. A failed regeneration must not destroy
      // prose that was already grounded and shown.
      this.#failure = result.problem ?? 'The explanation could not be generated.';
      return;
    }

    // `isRecord` rather than a cast. Rule 18 bans `as`-casting the wire, and this IS the wire: the
    // explain response is an untrusted payload like any other.
    const body = result.value;
    if (!isRecord(body)) {
      this.#failure = 'The explanation service returned something that was not an object.';
      return;
    }

    // ⚠️ NOT GENERATED ARRIVES AS `200`, NOT AS AN ERROR STATUS, and the reason travels in the body.
    // The service answers `status: 'unavailable'` with a fixed sentence about the withholding rather
    // than a rationale, so nothing is adopted as prose. But it also says WHY, and the why is
    // actionable: the first live run returned
    //
    //   generator_error: "InsufficientVRAM: 6219 MiB free of 8151 MiB (source: nvidia-smi); the 7B
    //                     needs at least 6700 MiB. Close what is holding the card, or explain with
    //                     use_llm=false for the deterministic template."
    //
    // and this branch replaced all of that with "no explanation was produced". A named failure
    // reduced to an unnamed one is the defect this whole app is built against, and it was mine.
    //
    // `generator_error` is the model failing. `withheld_because` is policy: the reading fell below
    // the data-sufficiency floor, and the screen's own S-10 treatment already says so, so that one
    // is stated plainly rather than dressed as a fault.
    const prose = typeof body.explanation_text === 'string' ? body.explanation_text : null;
    // Empty prose is not a generation. Accepting it renders a populated panel with nothing
    // in it, and an empty region is on the banned-copy list.
    if (body.status !== 'generated' || prose === null || prose.trim() === '') {
      const withheld = typeof body.withheld_because === 'string' ? body.withheld_because : null;
      const generatorError = typeof body.generator_error === 'string' ? body.generator_error : null;
      this.#failure =
        withheld !== null
          ? `No explanation was generated: ${withheld}`
          : generatorError !== null
            ? generatorError
            : 'No explanation was produced for this reading. The service reported that none was ' +
              'generated, and gave no reason.';
      return;
    }

    this.#result = {
      text: prose,
      citations: Array.isArray(body.citations)
        ? body.citations.flatMap((c: unknown) => {
            if (!isRecord(c)) return [];
            const name = typeof c.source === 'string' ? c.source : null;
            const claim = typeof c.claim === 'string' ? c.claim : null;
            // A citation missing either half is dropped rather than rendered with a blank. An empty
            // list is a real answer here: the template never consults the library at all, and 9 of
            // the corpus's 57 keys have no admissible passage.
            return name === null || claim === null ? [] : [{ name, claim }];
          })
        : [],
    };
    this.#generatedFor = chartedIso;
  }
}
