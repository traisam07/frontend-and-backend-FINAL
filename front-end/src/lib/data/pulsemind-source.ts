// src/lib/data/pulsemind-source.ts
// CANONICAL DECLARATION — this file.
//
// THE THIRD `PatientDataSource`: the live PulseMind pipeline.
//
// `getPatientSource` in `./source.ts` speaks to the handoff backend, whose patient is split across
// three fragment routes. This one speaks to the deployed three-tier system instead:
//
//     browser -> Node/Express :3500 /api -> FastAPI :8000 -> the trained booster and a local 7B
//
// Everything above `PatientDataSource` is untouched. No route, component, domain function or view
// model learns which of the three sources produced what is on screen, which is the whole point of
// the seam (`docs/spec/data-contract.md` section 4.3).
//
// WHY THIS IS AN ADAPTER AND NOT A SECOND CONTRACT. The payloads below are mapped into the wire
// shape `src/lib/data/wire.ts` documents and then handed, still `unknown`, to the SAME
// `parsePatientSnapshot` / `parsePatientList` the other two implementations use. There is one
// validator and one parse path. Nothing here casts, nothing here defaults a clinical field, and a
// mapping that produces a shape the validator rejects surfaces as `CONTRACT_VIOLATION` (U-21)
// rather than as a plausible patient.
//
// ------------------------------------------------------------------------------------------------
// WHAT THIS SOURCE ANSWERS THAT THE REGISTER LISTS AS OPEN
//
//   G-01  every parameter carries a real `unit` from the service. The asserted table in
//         `$lib/domain/units` is not consulted on this path.
//   G-04  HALF answered. Contributors carry an explicit `parameter` join key, so `score_factor` is
//         PROVEN rather than guessed from a display label. `available` stays unproducible and state
//         S-28 stays unreachable: the service stores the TOP EIGHT contributors of 109 features, so
//         a parameter's absence from that list still proves nothing about whether it contributed.
//   G-11  `imputed_share` and `documentation_share` are fractions in [0, 1]: the share of absolute
//         attribution landing on defaulted value features, over all 109 features. The floor is 0.30
//         on each, and they are over DISJOINT feature sets, so they must never be summed.
//   G-12  `risk_score` is a Platt-calibrated probability in [0, 1]. See `RISK_SCORE_UNIT`.
//   G-13  readings are one hour apart. The band table's dwell clock is denominated on that grid.
//   G-15  `warning_status.status` is authoritative and is derived from the prompt, not the reading.
//   G-16  a null explanation means "not generated yet", and the PD-8 control generates one.
//   G-17  citations carry no URL, DOI or version. They are `{ name, claim }` and nothing else.
//   G-25  readings arrive oldest first and are truncated to `HISTORY_LIMIT`.
//   G-27  `top_contributors` arrive pre-ranked, and F-4 re-orders them deterministically anyway.
//   G-32  `readings_in_state` is supplied. See `heldAtLevel`.
//   G-41  the composition is three reads of one patient with no shared version stamp, exactly as
//         the fragment transport is, so the same integrity warning applies.
// ------------------------------------------------------------------------------------------------

import type { PatientSnapshot, PatientSummary } from '$lib/domain/types';
import type { Parsed } from '$lib/data/validate';
import { parsePatientList, parsePatientSnapshot } from '$lib/data/validate';
import { toPatientSummary } from '$lib/domain/derive';
import { API_BASE, isRecord, readJson, type PatientDataSource, type RequestScope } from './source';
import { begin } from './telemetry.svelte';

/**
 * How many readings the detail screen asks for. Twenty-four hourly readings is a day of ward time,
 * which is what the risk history chart windows to. The service caps the parameter at 200.
 */
const HISTORY_LIMIT = 24;

/** The disposition vocabulary the service accepts. Exported so the panel cannot invent a fifth. */
export const DISPOSITIONS = ['acknowledged', 'actioned', 'dismissed', 'escalated'] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

/**
 * Attached to every snapshot this source composes. Three reads are three points in time, and that
 * is true of this transport for the same reason it is true of the fragment one (**G-41**): the
 * claim a clinician acts on is that the demographics, the review status and the readings were read
 * at three different moments.
 */
const COMPOSED_READ_WARNING =
  'Demographics, review status and readings were read separately and carry no shared version ' +
  'stamp: they are not provably the same patient at the same moment';

/* ---- telemetry ---------------------------------------------------------------------------------
   Every request this source issues is recorded, and it is recorded HERE rather than at each call
   site: a log whose coverage depends on remembering to call it is a log that quietly stops being
   complete. Both helpers below take a ROUTE TEMPLATE and never the resolved path.               */

/**
 * One tracked read. The `finally` is what makes the log honest: `readJson` turns a bad status into a
 * thrown, named failure, so a settle call on the success path alone would show every request that
 * worked and none that did not.
 */
async function tracked(
  fetch: typeof globalThis.fetch,
  route: string,
  url: string,
  scope: RequestScope,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  const settle = begin('GET', route);
  const started = performance.now();
  let seen: Response | undefined;
  try {
    const body = await readJson(fetch, url, scope, signal, (res) => {
      seen = res;
    });
    settle({
      status: seen?.status,
      headers: seen?.headers,
      clientMs: performance.now() - started,
    });
    return body;
  } catch (cause: unknown) {
    settle({
      status: seen?.status,
      headers: seen?.headers,
      clientMs: performance.now() - started,
      failed: true,
    });
    throw cause;
  }
}

/** Named in U-04's wording, one scope per shape of request. */
function patientScope(what: string, patientId: string): RequestScope {
  return {
    noun: `${what} request for patient ${patientId}`,
    subject: `${what} request for patient ${patientId}`,
    forWhat: `${what} response for patient ${patientId}`,
    forbidden: 'You do not have access to this patient',
    notFound: `No patient matches id ${patientId}`,
  };
}

const WARD_SCOPE: RequestScope = {
  noun: 'ward board request',
  subject: 'ward board request',
  forWhat: 'ward board',
  forbidden: 'You do not have access to this unit',
  notFound:
    'The assessment service has no ward endpoint at this address. This is not the same as a unit ' +
    'with no patients, which the service reports as an empty list.',
};

/* ---- mapping -----------------------------------------------------------------------------------
   Every function below turns one service payload into the wire shape `wire.ts` documents. They
   return `unknown`-shaped plain objects on purpose: the validator gives them their type, and a
   `WirePatient` annotation here would be an assertion this file has no right to make.           */

/** The service's band names are upper case; the wire's are title case. Exact, never case-folded. */
const BAND_TO_WIRE: Readonly<Record<string, string>> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

/**
 * The prompt decides the review state, not the reading (**G-15**).
 *
 * An OPEN prompt is a reading awaiting review. A REVIEWED prompt is one a clinician has
 * dispositioned. NO prompt at all is the third state: this patient never crossed a promotion, so
 * there is nothing to review, and that is `null`, state S-09 `Review status unavailable`, rather
 * than a claim of either. An `expired` prompt is a superseded one and is deliberately not
 * `Reviewed`.
 */
function reviewStatusFromPrompt(prompt: unknown): string | null {
  if (!isRecord(prompt)) return null;
  if (prompt.status === 'open') return 'Pending Review';
  if (prompt.status === 'reviewed') return 'Reviewed';
  return null;
}

/**
 * `age_minutes` back to an instant. The service reports staleness as minutes at the reading's own
 * chart time, so the last-measured instant is that chart time less the age.
 *
 * NULL FOR A POPULATION REFERENCE, and that is the service's own decision travelling through rather
 * than this file's: a cohort default was never measured on this patient, so it has no age, and the
 * service sends `age_minutes: null`. The design says the same thing from the other side (state
 * S-14: no age, no last-measured time).
 */
function lastMeasuredFrom(chartedIso: unknown, ageMinutes: unknown): string | null {
  if (typeof chartedIso !== 'string') return null;
  if (typeof ageMinutes !== 'number' || !Number.isFinite(ageMinutes)) return null;
  const charted = Date.parse(chartedIso);
  if (Number.isNaN(charted)) return null;
  return new Date(charted - ageMinutes * 60_000).toISOString();
}

/**
 * One stored assessment becomes one `WireReading`.
 *
 * A REFUSAL IS NOT A LOW SCORE. The service models a reading below the data-sufficiency floor as a
 * separate shape carrying no `risk_score`, no `risk_level` and no contributors, so those map to
 * `null` and to empty lists, never to zero and never to `Low`. The nullability the validator
 * already models is what carries it: `sufficient_data: 'insufficient'` gates the screen (S-10) and
 * the two absent clinical fields render S-35 and S-05 beside it.
 */
/**
 * ⚠️ ONLY THE TWO STATUSES THE CONTRACT DECLARES MAP TO A SUFFICIENCY. Anything else passes through
 * for the validator to name.
 *
 * This used to be `scored ? 'sufficient' : 'insufficient'`, so `insufficient` was this file's ELSE
 * BRANCH rather than something the service said. A third status, a legacy row spelled `Assessed`,
 * or a field that failed to write would all have rendered `Insufficient data - risk score is not
 * reliable`: a clinical statement about that patient's data quality, produced by a pipeline problem.
 * Worse, `parseReading` derives its `refused` flag from this field and uses it to SUPPRESS the
 * missing-score warnings, so the invented refusal would have arrived with no diagnostic trace at all.
 */
function sufficiencyFor(status: unknown): unknown {
  if (status === 'assessed') return 'sufficient';
  if (status === 'insufficient_data') return 'insufficient';
  return status;
}

function toWireReading(assessment: Record<string, unknown>): unknown {
  const scored = assessment.assessment_status === 'assessed';
  const chartedIso = typeof assessment.assessed_at === 'string' ? assessment.assessed_at : null;

  const contributors = Array.isArray(assessment.contributors) ? assessment.contributors : [];
  const parameters = Array.isArray(assessment.parameters) ? assessment.parameters : [];

  const explanation = isRecord(assessment.explanation) ? assessment.explanation : null;
  // `status: 'unavailable'` is the service withholding prose by policy, and its `explanation_text`
  // is a fixed sentence about the withholding rather than a rationale. Mapping that sentence into
  // the explanation slot would render a system statement as a clinical one, so it becomes `null`
  // and the screen's own withheld treatment speaks instead.
  // An EMPTY string is not prose. `nullableString` passes `''` through unchanged and the panel's
  // `??` chain does not catch it, so a stored empty explanation rendered a populated card with
  // nothing in it, which the banned-copy list forbids outright. It is S-37 instead.
  const explanationText =
    explanation !== null &&
    explanation.status === 'generated' &&
    typeof explanation.explanation_text === 'string' &&
    explanation.explanation_text.trim() !== ''
      ? explanation.explanation_text
      : null;

  // The withheld bed returns NO `citations` key at all, so the absence is normalised here rather
  // than left for the validator to read as a contract violation. `null` and `[]` both mean "no
  // references"; neither is faked into the other.
  // Gated on `generated` for the same reason the prose is. A withheld explanation that happens to
  // carry an empty `citations` key would otherwise become `[]`, and `[]` says "the library was
  // consulted and had nothing", which is a claim about the evidence base rather than about a
  // generation that never ran.
  const citations =
    explanation !== null &&
    explanation.status === 'generated' &&
    Array.isArray(explanation.citations)
      ? explanation.citations.map((c: unknown) => {
          const row = isRecord(c) ? c : {};
          return { name: row.source, claim: row.claim };
        })
      : null;

  const review = isRecord(assessment.review) ? assessment.review : null;

  // THE JOIN KEY, and the reason G-04's first half is answered. `feature_name` is a display label,
  // so matching a parameter against it is a guess; `parameter` is the field the contract names as
  // "the only safe join key" and it holds the parameter's own identifier or null for a static or
  // intervention feature. A membership test on it PROVES `score_factor`.
  //
  // Absence still proves nothing, and no `available` is emitted: only the top eight contributors of
  // 109 features are stored, so a parameter below that cut is indistinguishable from one that did
  // not contribute at all.
  const scoreFactors = new Set(
    contributors
      .map((c: unknown) => (isRecord(c) && typeof c.parameter === 'string' ? c.parameter : null))
      .filter((name: string | null): name is string => name !== null),
  );

  return {
    charttime: chartedIso,
    imputed_share: assessment.imputed_share,
    documentation_share: assessment.documentation_share,
    sufficient_data: sufficiencyFor(assessment.assessment_status),
    risk_score: scored ? assessment.risk_score : null,
    risk_level:
      scored && typeof assessment.risk_level === 'string'
        ? (BAND_TO_WIRE[assessment.risk_level] ?? null)
        : null,
    review_at:
      review !== null && typeof review.reviewed_at === 'string' ? review.reviewed_at : null,
    readings_in_state:
      scored && typeof assessment.readings_in_state === 'number'
        ? assessment.readings_in_state
        : null,
    // ⚠️ PASSED THROUGH, NOT DEFAULTED, and the two halves failed differently before this.
    //
    // `contribution` fell back to `0`, which `requireFinite` ACCEPTS. A contributor whose share
    // failed to write became a ranked factor that contributed nothing: a claim the data never made,
    // manufactured before the validator could object, and one that also reorders `primaryDriver`
    // because F-4 sorts on it. `name` fell back to `''`, which `requireString` REJECTS, so one
    // malformed contributor took the whole board down with a message describing the empty string
    // this file had just invented rather than what actually arrived.
    //
    // Handing both over untouched is the same discipline `parameters` below already uses. The
    // validator names the real value, and nothing clinical is invented on the way there.
    top_contributors: contributors.map((c: unknown) => {
      const row = isRecord(c) ? c : {};
      return { name: row.feature_name, contribution: row.share_of_decision };
    }),
    parameters: parameters.map((p: unknown) => {
      const row = isRecord(p) ? p : {};
      return {
        name: row.parameter_name,
        value: row.value,
        source: row.source,
        last_measured: lastMeasuredFrom(chartedIso, row.age_minutes),
        // Only ever `score_factor`, and only when the join key says so. Never `available`.
        model_use:
          typeof row.parameter_name === 'string' && scoreFactors.has(row.parameter_name)
            ? 'score_factor'
            : undefined,
        // NOT a documented `WireParameterReading` member, and deliberately carried alongside: on
        // this path the unit is a real fact from the service rather than a label this interface
        // asserts (**G-01**). `parseParameter` reads it; every other source leaves it absent and
        // the asserted table answers instead.
        unit: row.unit,
      };
    }),
    explanation: explanationText,
    citations,
  };
}

/**
 * Demographics. The service pre-formats every one of these as a display string, including `weight`
 * and `height` with their units already attached, which is why the wire types them as strings and
 * the validator trims rather than parses (**G-19**).
 *
 * `age` is the exception: the wire requires a finite NUMBER and the service sends `"67"`. It is
 * parsed here, and a value that does not parse is passed through as delivered so the validator can
 * fail it by name. Coercing an unparseable age to a number would be inventing a clinical fact.
 */
function demographicsFrom(context: unknown): Record<string, unknown> {
  const c = isRecord(context) ? context : {};
  const rawAge = c.age;
  const age = typeof rawAge === 'string' && rawAge.trim() !== '' ? Number(rawAge) : rawAge;
  return {
    age: typeof age === 'number' && Number.isFinite(age) ? age : rawAge,
    gender: c.sex,
    race: c.ethnicity,
    weight: c.weight ?? null,
    height: c.height ?? null,
    // `{ label, icd_code }` becomes `{ name, catch }`. The wire's `catch` key has no counterpart
    // here and its meaning is unclear even in the schema that declares it (**G-10**), so it is
    // `false` rather than an invented reading of the ICD code.
    underlying_condition: Array.isArray(c.comorbidities)
      ? c.comorbidities.map((m: unknown) => ({
          name: isRecord(m) ? m.label : undefined,
          catch: false,
        }))
      : [],
  };
}

/** One board row: the latest assessment, its prompt, and the demographics riding along with it. */
function toWireBoardRow(assessment: unknown): unknown {
  if (!isRecord(assessment)) return assessment;
  const prompt = assessment.prompt;
  return {
    patient_id: assessment.patient_id,
    bed_code: assessment.bed_code ?? null,
    unit: assessment.unit ?? null,
    prompt_id: isRecord(prompt) && typeof prompt._id === 'string' ? prompt._id : null,
    ...demographicsFrom(assessment.context),
    warning_status: { status: reviewStatusFromPrompt(prompt), flags: [] },
    readings: [toWireReading(assessment)],
  };
}

/* ---- the implementation ----------------------------------------------------------------------- */

export function getPulsemindSource(fetch: typeof globalThis.fetch): PatientDataSource {
  return {
    /**
     * ONE REQUEST. `GET /api/ward` returns the latest assessment per bed with its prompt attached
     * and the recorded demographics joined on, so the board costs one round trip rather than one
     * per patient. It carries ONE reading each, which is why `readings_in_state` matters here: the
     * client-side run-length walk would answer "at least 1" for every bed on the unit.
     */
    async listPatients(signal): Promise<Parsed<readonly PatientSummary[]>> {
      const body = await tracked(fetch, '/ward', `${API_BASE}/ward`, WARD_SCOPE, signal);
      if (!Array.isArray(body)) {
        return { ok: false, problem: 'The ward response was not an array' };
      }
      const parsed = parsePatientList(body.map(toWireBoardRow));
      if (!parsed.ok) return parsed; // U-21
      return { ok: true, value: parsed.value.map(toPatientSummary) };
    },

    /**
     * ALL THREE OR NONE, exactly as the fragment transport composes. `Promise.all` puts them in
     * flight together and the first named failure is the whole call's result. A partial compose,
     * with a missing piece defaulted or filled from a previous response, is `risk_level ?? 'Low'`
     * wearing a network costume.
     *
     * IDENTITY COMES FROM THE ASSESSMENT, which is the only one of the three that carries
     * `patient_id`, `bed_code` and the prompt. History supplies the readings and context supplies
     * the demographics; neither can establish who this is.
     */
    async getPatient(patientId, signal): Promise<Parsed<PatientSnapshot>> {
      const id = encodeURIComponent(patientId);
      const [current, history, context] = await Promise.all([
        tracked(
          fetch,
          '/patient/:id',
          `${API_BASE}/patient/${id}`,
          patientScope('assessment', patientId),
          signal,
        ),
        tracked(
          fetch,
          '/patient/:id/history',
          `${API_BASE}/patient/${id}/history?limit=${HISTORY_LIMIT}`,
          patientScope('history', patientId),
          signal,
        ),
        tracked(
          fetch,
          '/patient/:id/context',
          `${API_BASE}/patient/${id}/context`,
          patientScope('context', patientId),
          signal,
        ),
      ]);

      if (!isRecord(current)) {
        return {
          ok: false,
          problem:
            'The assessment response was not an object, so the composed patient carries no ' +
            'verified patient_id',
        };
      }

      // History is the service's own rows for this patient, oldest first, and it INCLUDES the
      // current reading. Composing `[...history, current]` would put one clinical instant on the
      // screen twice: U-12 makes a colliding charttime a supported state and F-1 forbids deduping,
      // so the collision would be this file's invention rather than the data's. History alone is
      // the readings array, and the current row is used only for the prompt, which history does not
      // carry.
      const readings = Array.isArray(history) && history.length > 0 ? history : [current];

      const prompt = current.prompt;
      const composed: unknown = {
        patient_id: current.patient_id,
        bed_code: current.bed_code ?? null,
        unit: current.unit ?? null,
        prompt_id: isRecord(prompt) && typeof prompt._id === 'string' ? prompt._id : null,
        ...demographicsFrom(context),
        warning_status: { status: reviewStatusFromPrompt(prompt), flags: [] },
        readings: readings.map((r: unknown) => toWireReading(isRecord(r) ? r : {})),
      };

      const parsed = parsePatientSnapshot(composed);
      if (!parsed.ok) return parsed; // U-21

      return {
        ok: true,
        value: {
          ...parsed.value,
          integrityWarnings: [...parsed.value.integrityWarnings, COMPOSED_READ_WARNING],
        },
      };
    },
  };
}

/* ---- the writes --------------------------------------------------------------------------------
   Not members of `PatientDataSource`. That interface is read-only because every clinical screen is,
   and neither a disposition nor a generation request is an assessment. They live here because every
   request this application makes goes through `$lib/data`, and a `fetch` in a component would be a
   third exception to that rule.                                                                  */

export interface WriteResult<T> {
  ok: boolean;
  problem?: string;
  value?: T;
}

/** Reads the service's two error envelopes: RFC 9457 `detail`, and the plain `{ message }` some
 *  handlers still answer with. Reading only one of them reports a real error as an empty screen. */
function problemText(payload: unknown, status: number): string {
  if (isRecord(payload) && typeof payload.detail === 'string') return payload.detail;
  if (isRecord(payload) && typeof payload.message === 'string') return payload.message;
  return `The service answered ${status}`;
}

async function postJson(
  fetch: typeof globalThis.fetch,
  path: string,
  route: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<WriteResult<unknown>> {
  const settle = begin('POST', route);
  const started = performance.now();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause: unknown) {
    settle({ clientMs: performance.now() - started, failed: true });
    const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError';
    return {
      ok: false,
      problem: timedOut
        ? `The service at ${API_BASE} did not answer within ${timeoutMs} ms`
        : `The service at ${API_BASE} could not be reached`,
    };
  }
  settle({
    status: res.status,
    headers: res.headers,
    clientMs: performance.now() - started,
    failed: res.status !== 200,
  });
  const payload: unknown = await res.json().catch(() => null);
  if (res.status !== 200) return { ok: false, problem: problemText(payload, res.status) };
  return { ok: true, value: payload };
}

/**
 * Record a clinician's disposition against one open prompt.
 *
 * ATTRIBUTION IS THE SERVICE'S TO WITHHOLD, NOT THIS CALLER'S TO SUPPLY. The service stores
 * `clinician: null, attributed: false` and deliberately ignores any name in the request body,
 * because a disposition that names whoever asked for it is not an audit record. Nothing here sends
 * one, and the panel says so in words.
 */
export function postDisposition(
  fetch: typeof globalThis.fetch,
  promptId: string,
  disposition: Disposition,
  note: string | null,
): Promise<WriteResult<unknown>> {
  return postJson(
    fetch,
    `prompt/${encodeURIComponent(promptId)}/review`,
    '/prompt/:id/review',
    note === null ? { disposition } : { disposition, note },
    10_000,
  );
}

/**
 * Ask the service to write the plain-language explanation for ONE STORED READING.
 *
 * `assessed_at` is not optional in practice even though the route defaults it: generation takes
 * tens of seconds, and "latest" resolved at request time can be several readings stale by the time
 * the text is written back, so the prose would describe a row the board has already replaced.
 *
 * `use_llm: false` selects the deterministic template floor. It needs no GPU and it is the stricter
 * regression test, because it is deterministic.
 *
 * The timeout is the caller's, because the two paths are minutes apart: the template answers in
 * milliseconds and a cold 7B load plus generation has been measured at over a minute.
 */
export function postExplanation(
  fetch: typeof globalThis.fetch,
  patientId: string,
  assessedAt: string,
  useLlm: boolean,
  timeoutMs: number,
): Promise<WriteResult<unknown>> {
  return postJson(
    fetch,
    `patient/${encodeURIComponent(patientId)}/explain`,
    '/patient/:id/explain',
    { assessed_at: assessedAt, use_llm: useLlm },
    timeoutMs,
  );
}

/**
 * The demonstration strip's three actions. Not reachable from any clinical screen: seeding is
 * destructive, and advancing the ward is a simulation control that rule 12 keeps off a clinical
 * surface.
 */
export function postDemoAction(
  fetch: typeof globalThis.fetch,
  path: 'ward/seed' | 'ward/tick' | 'ward/warmup',
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<WriteResult<unknown>> {
  return postJson(fetch, path, `/${path}`, body, timeoutMs);
}
