// src/lib/data/source.ts
// CANONICAL DECLARATION of both implementations and the selector —
// `.claude/skills/svelte5-runes/references/patterns.md` section 7. The `PatientDataSource`
// interface is canonically declared in `.claude/skills/bootstrap/SKILL.md` section 6 and reproduced
// below byte-identically.
//
// THE FRAGMENT BOUNDARY. The backend serves a patient in THREE pieces
// (`docs/spec/data-contract.md` section 4.1) and none of them is a patient. This module issues all
// three, composes them into one wire-shaped candidate, and hands that to the one validator. The
// fragment shape is absorbed here BY DESIGN: no component, no `load`, no domain function and no view
// model ever learns that three requests happened, which is what keeps `getPatient` one call
// returning one `PatientSnapshot`. Change the transport here and nothing above this module moves.
//
// Every failure leaves here NAMED, as one of the six `App.Error` codes: no `catch { return [] }`,
// no `as`, no defaulted patient — and no half-built one.
//
// -------------------------------------------------------------------------------------------------
// CHANGE OF RECORD — the list endpoint now exists.
//
// `docs/spec/data-contract.md` section 4.2 and `patterns.md` section 7 both state that there is NO
// list endpoint and that the HTTP `listPatients` must terminate in a named `UPSTREAM_ERROR` citing
// **G-40** rather than invent a route. That was true of the backend as committed: `getAllPatient`
// was defined and exported in `back-end/controllers/patientController.js`, routed nowhere, and its
// body called an undeclared `Patientatient`.
//
// **G-40 has since been answered in the backend, not worked around in the frontend.** The controller
// was fixed and the route mounted — `GET /patient/all` — so `listPatients` below calls a real
// endpoint. It is NOT an invented route, an N+1 loop over ids the frontend does not have, or a
// fabricated unit membership: all three of those stay forbidden. The register row records the
// resolution and the date; if that row is ever reopened, this method goes back to failing by name.
// -------------------------------------------------------------------------------------------------

import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { PatientSnapshot, PatientSummary } from '$lib/domain/types';
import type { Parsed } from '$lib/data/validate';
import { parsePatientList, parsePatientSnapshot } from '$lib/data/validate';
import { toPatientSummary } from '$lib/domain/derive';

export interface PatientDataSource {
  listPatients(signal?: AbortSignal): Promise<Parsed<readonly PatientSummary[]>>;
  getPatient(patientId: string, signal?: AbortSignal): Promise<Parsed<PatientSnapshot>>;
}

/**
 * The API base. The backend is a DIFFERENT ORIGIN — `http://localhost:3500` by default, while the
 * Vite dev server is `http://localhost:5173` — so every request below is cross-origin. The backend's
 * allow-list omitted the dev origin (**G-49**); that has been fixed in
 * `back-end/config/allowedOrigins.js`, which now lists both `5173` spellings.
 *
 * `??` here is not `??` on a clinical field: defaulting a clinical value is banned, and defaulting
 * non-clinical plumbing — which a base URL is — is not. The trailing slash is stripped so the
 * template below cannot produce `//patient/...`.
 *
 * `$env/dynamic/public` — not `static` — so the base changes per environment without a rebuild. It
 * is readable because `export const prerender = true` is banned on every route: a prerendered page
 * has no dynamic environment to read.
 */
const API_BASE = (env.PUBLIC_PULSEMIND_API_BASE ?? 'http://localhost:3500').replace(/\/+$/, '');

/** The three fragments section 4.1 records. */
type Fragment = 'info' | 'warning' | 'reading';

/**
 * A type predicate, never `raw as Record<string, unknown>`. Private here exactly as it is private in
 * `validate.ts`: the composition has to spread the info fragment, and exporting four tokens from the
 * validator would put a second boundary primitive in the symbol table for no gain.
 */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Attached to EVERY composed snapshot until **G-41** is answered. Three reads are three points in
 * time, and no amount of client-side care changes that — so the snapshot says so about itself rather
 * than presenting a possibly-mixed patient as coherent.
 */
const FRAGMENT_VERSION_WARNING =
  // REWORDED 2026-08-17: the endpoint paths and the register id came off the visible string at the
  // product owner's instruction. What a clinician acts on is the CLAIM — that the demographics, the
  // review status and the readings on this screen were read at three different moments and are not
  // provably one coherent picture — and that claim is unchanged and still a U-12 integrity warning.
  // The route names and **G-41** are engineering detail, and they stay in the register.
  'Demographics, review status and readings were read separately and carry no shared version ' +
  'stamp: they are not provably the same patient at the same moment';

/**
 * The transport deadline, in milliseconds. Harness-defined placeholder: the mechanism is decided
 * here, the number and the copy that surfaces it are a design decision (**G-30**, **D-11**).
 *
 * Without it there is no failure at all in the most likely live case. `fetch` waits as long as the
 * platform allows, `PatientDataSource` offers a `signal` that nothing upstream ever aborts, and a
 * connection that hangs leaves the screen in U-01 forever — a loading state that is not a named
 * error is the anonymous failure this app exists to prevent, and it is worse than an error because
 * it looks like progress.
 */
const FRAGMENT_TIMEOUT_MS = 10_000;

/**
 * What one request IS, in the words `docs/spec/ui-states.md` U-04 mandates.
 *
 * U-04's lead-ins are not a template to paraphrase — they are the strings the row lists, and a row
 * that lists a lead-in the transport does not emit cannot be asserted by any test. Two shapes of
 * request now go through this transport (a fragment read, and the board's list read), and the
 * fragment wording says "for patient <id>", which is false for the list. So each caller supplies
 * its own phrasing and the branches interpolate it rather than inventing one.
 *
 * The list phrasings are `[HARNESS]`, pending copy approval (**D-10**): U-04's seventh lead-in was
 * "the triage board has no endpoint to call", and that became obsolete the moment **G-40** was
 * answered in the backend. They deliberately mirror the mandated fragment shapes word for word so
 * the two read as one family.
 */
interface RequestScope {
  /** Used mid-sentence after a verb: "did not answer the …", "rejected the …". */
  readonly noun: string;
  /** Used as the subject: "The … was not valid JSON", "The … was cancelled …". */
  readonly subject: string;
  /** Used after "answered <status> for the …". */
  readonly forWhat: string;
  /** U-06's wording for THIS scope. A board refusal is not a patient refusal. */
  readonly forbidden: string;
  /** The not-found message for THIS scope, including any registered ambiguity note. */
  readonly notFound: string;
}

/** Every abort reason, named, in U-04's mandated wording. A raw `TypeError` never reaches a clinician. */
function namedTransportFailure(cause: unknown, scope: RequestScope): never {
  const reason = cause instanceof DOMException ? cause.name : '';
  if (reason === 'TimeoutError') {
    error(504, {
      message: `The assessment service at ${API_BASE} did not answer the ${scope.noun} within ${FRAGMENT_TIMEOUT_MS} ms`,
      code: 'UPSTREAM_ERROR',
    });
  }
  if (reason === 'AbortError') {
    error(502, {
      message: `The ${scope.subject} was cancelled before it completed`,
      code: 'UPSTREAM_ERROR',
    });
  }
  // DNS, a refused connection, or a CORS preflight failure.
  error(503, {
    message: `The assessment service at ${API_BASE} could not be reached`,
    code: 'UPSTREAM_ERROR',
  });
}

/**
 * One request, under a deadline, STATUS-BRANCHED BEFORE ITS BODY IS TOUCHED.
 *
 * `204` satisfies `res.ok`, and `res.json()` on an empty body throws a `SyntaxError`. Reading first
 * would turn a registered ambiguity (**G-42**) into an unnamed exception on a triage screen — the
 * one failure mode this app exists to prevent. So every branch below is on `res.status`, and the
 * body is read on the last line or not at all.
 */
async function readJson(
  fetch: typeof globalThis.fetch,
  url: string,
  scope: RequestScope,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  // THE DEADLINE, composed here rather than demanded of every caller. `AbortSignal.timeout` aborts
  // with a `TimeoutError`; a caller's own signal aborts with an `AbortError`; `AbortSignal.any`
  // yields one signal carrying whichever reason arrived first, so the `.catch` can tell them apart
  // and neither leaves as an anonymous rejection. The caller's signal stays OPTIONAL — the deadline
  // is unconditional, which is the point.
  const deadline = AbortSignal.timeout(FRAGMENT_TIMEOUT_MS);
  const until = signal === undefined ? deadline : AbortSignal.any([signal, deadline]);

  const res = await fetch(url, {
    // A definite `AbortSignal`, so `exactOptionalPropertyTypes` has nothing to object to.
    signal: until,
    headers: { accept: 'application/json' },
  }).catch((cause: unknown): never => namedTransportFailure(cause, scope));

  /* ---- STATUS FIRST. Nothing below this line has read a body. ---------------------------------- */

  if (res.status === 404 || res.status === 204) {
    // The backend's not-found path is a `404` with a readable body now. `204` is kept as a branch
    // because a deployment of the service as originally committed still answers that way, and its
    // body is discarded in transit — **G-42**. Both are NAMED here rather than guessed at silently
    // downstream, and the `scope` decides what "not found" MEANS: a missing patient is U-13, an
    // empty unit is U-09, and they are different states with different copy.
    error(404, { message: scope.notFound, code: 'PATIENT_NOT_FOUND' });
  }

  if (res.status === 400) {
    // The handlers read `req.params.patient_id` now and query the business `patient_id`
    // (**G-43**, fixed), so this branch is no longer every request's fate. It stays because a
    // genuinely malformed id must still terminate in a named state rather than an empty screen, and
    // it keeps the register pointer U-04 mandates in the lead-in.
    error(502, {
      message: `The assessment service rejected the ${scope.noun} as a bad request (G-43)`,
      code: 'UPSTREAM_ERROR',
    });
  }

  if (res.status === 403) {
    // U-06's wording — and U-06 mandates ONE LITERAL PER SCOPE: `You do not have access to this
    // patient` on PD/PM, `You do not have access to this unit` on the board. Hard-coding the patient
    // wording here would have told a clinician the wrong thing about a refused BOARD.
    error(403, { message: scope.forbidden, code: 'FORBIDDEN' });
  }

  // One branch for everything else: every other non-2xx — including the `503` the fixed backend
  // answers while its database is not connected — and every bodyless 2xx (`205`, a conditional
  // `304`). The only status this transport reads a body from is `200`.
  if (res.status !== 200) {
    error(502, {
      message: `The assessment service answered ${res.status} for the ${scope.forWhat}`,
      code: 'UPSTREAM_ERROR',
    });
  }

  // `unknown` on purpose: the validator is the only thing allowed to give this a shape, and
  // `await res.json() as WirePatient` is forbidden. Malformed JSON is named too.
  const body: unknown = await res
    .json()
    .catch((): never =>
      error(502, { message: `The ${scope.forWhat} was not valid JSON`, code: 'UPSTREAM_ERROR' }),
    );
  return body;
}

/** The fragment scope, in U-04's mandated wording, character for character. */
function fragmentScope(fragment: Fragment, patientId: string): RequestScope {
  return {
    noun: `${fragment} request for patient ${patientId}`,
    subject: `${fragment} request for patient ${patientId}`,
    forWhat: `${fragment} fragment of patient ${patientId}`,
    forbidden: 'You do not have access to this patient',
    // U-13 mandates BOTH the sentence and the **G-42** ambiguity note, because a `204` carries no
    // body to distinguish "no such patient" from "an empty response".
    notFound:
      `No patient matches id ${patientId}. The service may signal this with 204 No Content, whose ` +
      `body is discarded, so not-found cannot be told apart from an empty response (G-42).`,
  };
}

/** The board scope. `[HARNESS]`, pending **D-10** — see `RequestScope`. */
const LIST_SCOPE: RequestScope = {
  noun: 'patient list request',
  subject: 'patient list request',
  forWhat: 'patient list',
  // U-06's OTHER mandated literal. The board is a unit, not a patient.
  forbidden: 'You do not have access to this unit',
  // U-09's mandated literal. A genuinely empty unit is `200 []` and never reaches this branch; a
  // `404` on the list route means the ROUTE is missing, which is a different fact and says so.
  notFound:
    'The assessment service has no patient list endpoint at this address. This is not the same as ' +
    'a unit with no patients, which the service reports as an empty list.',
};

function readFragment(
  fetch: typeof globalThis.fetch,
  fragment: Fragment,
  patientId: string,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  return readJson(
    fetch,
    `${API_BASE}/patient/${fragment}/${encodeURIComponent(patientId)}`,
    fragmentScope(fragment, patientId),
    signal,
  );
}

/**
 * THE HTTP IMPLEMENTATION.
 *
 * `fetch` is the load's injected fetch — it inherits the request's credentials handling and is
 * tracked by SvelteKit's dependency graph, which `globalThis.fetch` is not. The URLs are absolute
 * because the API is a different origin; nothing here is relative.
 */
export function getPatientSource(fetch: typeof globalThis.fetch): PatientDataSource {
  return {
    async listPatients(signal) {
      // `GET /patient/all` — the endpoint that did not exist when this module was specified, and
      // that the backend now mounts (see the CHANGE OF RECORD at the top of this file). It returns
      // WHOLE patients, so the list goes through `parsePatientList`, which is `parsePatientSnapshot`
      // per element: one validator, one parse path, and no lighter contract for the list.
      const body = await readJson(fetch, `${API_BASE}/patient/all`, LIST_SCOPE, signal);

      const parsed = parsePatientList(body);
      if (!parsed.ok) return parsed; // named CONTRACT_VIOLATION at the load — U-21

      // The board projection runs where the list is actually produced. One F-1 latest-reading
      // projection per snapshot, and never a second latest-reading walk in a component.
      return { ok: true, value: parsed.value.map(toPatientSummary) };
    },

    async getPatient(patientId, signal) {
      // ALL THREE OR NONE. `Promise.all` subscribes to all three at once, so they are in flight
      // together and the FIRST named failure is the whole call's result. A fragment that failed is
      // never defaulted, never omitted, and never filled in from a previous response: a partial
      // compose is `risk_level ?? 'Low'` wearing a network costume.
      const [info, warning, readings] = await Promise.all([
        readFragment(fetch, 'info', patientId, signal),
        readFragment(fetch, 'warning', patientId, signal),
        readFragment(fetch, 'reading', patientId, signal),
      ]);

      // Identity comes from the info fragment ALONE, because it is the only one of the three that
      // carries `patient_id` — `/patient/warning` returns a bare `warning_status` object and
      // `/patient/reading` a bare array (**G-41**). No verified identity, no snapshot, whatever the
      // other two returned. This is a `Parsed` failure, not a transport one: the shape is wrong,
      // which is exactly what U-21 names.
      if (!isRecord(info)) {
        return {
          ok: false,
          problem:
            'The /patient/info fragment was not an object, so the composed patient carries no verified patient_id',
        };
      }

      // THE COMPOSITION, and the only place in the app it happens. Still `unknown`, still untrusted,
      // handed to the ONE validator — the fragments are never separately typed, never cast, and
      // never `as`-asserted into shape.
      const composed: unknown = { ...info, warning_status: warning, readings };
      const parsed = parsePatientSnapshot(composed);
      if (!parsed.ok) return parsed; // named CONTRACT_VIOLATION at the load — U-21

      return {
        ok: true,
        value: {
          ...parsed.value,
          integrityWarnings: [...parsed.value.integrityWarnings, FRAGMENT_VERSION_WARNING],
        },
      };
    },
  };
}

/**
 * Attached to every fixture-served snapshot. The screen-level `[HARNESS]` label is required
 * separately (`docs/spec/data-contract.md` section 4.4 rule 3); this is the same fact travelling
 * WITH the patient, so a snapshot read in isolation — in a test, in a log, in an integrity-warning
 * list — still says where it came from.
 */
const FIXTURE_SOURCE_WARNING =
  'Fixture data [HARNESS]: this patient was not served by the assessment service ' +
  '(docs/spec/data-contract.md section 4.4). Every instant in the set is shifted by one constant ' +
  'offset so the newest reading lands at page-load time; all relative spacing is unchanged, and no ' +
  'clinical value is recomputed.';

/**
 * Shift every ISO instant in the fixture set by ONE CONSTANT OFFSET so the newest `charttime` lands
 * at page-load time.
 *
 * WHY THIS IS NOT A FABRICATED TIME. `back-end/seed/patients.json` is a synthetic set with fixed
 * instants, and a fixed instant is wrong in both directions: on the day it was generated it reads
 * as the future in any timezone ahead of UTC, and a week later every card reads "as of last
 * Tuesday". Neither is a picture of a unit. The shift is the same transform the backend seed applies
 * with `--rebase`, so the fixture board and a freshly seeded live board show the same ages.
 *
 * WHAT IT DOES NOT DO, and this is the part that matters:
 *   - it recomputes no clinical value — not a score, not a level, not a sufficiency flag;
 *   - it adds, removes and reorders nothing;
 *   - it preserves ALL relative spacing exactly, because the offset is a single constant: the
 *     60-minute window, the deliberate 26-minute gap, the carried-forward ages and the
 *     exact-charttime collision all survive unchanged;
 *   - it runs ONCE, at module evaluation, driven by no timer — nothing on screen advances on a
 *     clock afterwards (anti-requirement 1).
 *
 * And it is declared where a clinician can see it: `SourceBanner` says the board is fixture data,
 * and `FIXTURE_SOURCE_WARNING` above travels with every snapshot so a patient read in isolation —
 * in a test, in a log, in an integrity-warning list — still says its times were shifted.
 *
 * The HTTP source does none of this. Real data is rendered exactly as delivered.
 */
const INSTANT_KEYS = new Set(['charttime', 'last_measured', 'review_at', 'flag_when']);

function rebaseFixtures(set: readonly unknown[]): readonly unknown[] {
  let newest = Number.NEGATIVE_INFINITY;
  const scan = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const entry of node) scan(entry);
      return;
    }
    if (!isRecord(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'charttime' && typeof value === 'string') {
        const t = Date.parse(value);
        if (Number.isFinite(t) && t > newest) newest = t;
      } else {
        scan(value);
      }
    }
  };
  scan(set);
  if (!Number.isFinite(newest)) return set;

  const offset = Date.now() - newest;
  const shift = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    const t = Date.parse(value);
    return Number.isFinite(t) ? new Date(t + offset).toISOString() : value;
  };
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!isRecord(node)) return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = INSTANT_KEYS.has(key) ? shift(value) : walk(value);
    }
    return out;
  };

  return set.map(walk);
}

/**
 * LOADED ON DEMAND, and that is a deployment property rather than a micro-optimisation.
 *
 * The fixtures were a STATIC import at the top of this module until 2026-08-20. This module is what
 * both loads call, so the bundler made the fixture data a dependency of the board, the patient
 * detail and the parameter detail routes: a production build put a 162 KB chunk of synthetic
 * patient-shaped records on the critical path of the first clinical screen, on every deployment,
 * INCLUDING one configured to read from the live service and which would never look at them.
 *
 * Nothing was ever displayed from them there. The cost was payload and, less measurably, the fact
 * that a live install shipped a body of patient-shaped data it had no use for.
 *
 * `import()` inside the accessor moves them into their own chunk that only the fixture path fetches.
 * Both `PatientDataSource` methods were already async, so the interface does not change.
 *
 * Cached after the first call, and the rebase still happens exactly once. Never on a timer (P-10).
 */
let rebasedFixtures: readonly unknown[] | null = null;

async function loadFixtures(): Promise<readonly unknown[]> {
  if (rebasedFixtures === null) {
    const module = await import('$lib/data/fixtures/patients');
    rebasedFixtures = rebaseFixtures(module.WIRE_PATIENT_FIXTURES);
  }
  return rebasedFixtures;
}

/**
 * THE FIXTURE IMPLEMENTATION — and the DEFAULT, so the app renders with no backend running at all.
 *
 * It is deliberately NOT a lighter path than the HTTP one:
 *
 *   - the fixtures arrive as `readonly unknown[]` and are validated, never trusted: `listPatients`
 *     through `parsePatientList`, `getPatient` through `parsePatientSnapshot` — the SAME functions
 *     the HTTP implementation hands its payloads to. A fixture that skipped validation would prove
 *     nothing and would hide precisely the bugs the validator exists to catch;
 *   - the board rows come from `toPatientSummary`, the ONE producer of `PatientSummary`, so the F-1
 *     projection is identical in both implementations;
 *   - a fixture whose SHAPE is invalid is a `Parsed` failure — named by index on the board, by field
 *     path on one patient — exactly as a bad payload is, and never `.filter(Boolean)`, never a
 *     skipped element. A fixture with a bad FIELD still reaches the board carrying its integrity
 *     warning, which is how the S-05 / S-10 / S-15 / S-35 / U-11 / U-12 branches get rendered at all.
 */
export function getFixturePatientSource(): PatientDataSource {
  return {
    async listPatients() {
      const parsed = parsePatientList(await loadFixtures());
      if (!parsed.ok) return parsed; // U-21, named by index. Never a partial board.
      return { ok: true, value: parsed.value.map(toPatientSummary) };
    },

    async getPatient(patientId) {
      // Identity is matched on the RAW wire key, before validation and with the same `isRecord`
      // predicate the composition uses — never `as`, and never a pre-typed fixture array. One
      // fixture is then validated exactly as one composed payload is.
      const match = (await loadFixtures()).find(
        (entry) => isRecord(entry) && entry.patient_id === patientId,
      );
      if (match === undefined) {
        // The same named failure the HTTP source raises for a 404, so a deep link to an unknown id
        // renders identically whichever source is selected.
        error(404, { message: `No patient matches id ${patientId}`, code: 'PATIENT_NOT_FOUND' });
      }
      const parsed = parsePatientSnapshot(match);
      if (!parsed.ok) return parsed; // U-21, exactly as a bad payload would be
      return {
        ok: true,
        value: {
          ...parsed.value,
          integrityWarnings: [...parsed.value.integrityWarnings, FIXTURE_SOURCE_WARNING],
        },
      };
    },
  };
}

/* ---- THE SELECTION RULE --------------------------------------------------------------------------
   One environment variable, one selector, no per-load decision. A load calls
   `resolvePatientSource(fetch)` and asks nothing else; "which source am I on" is not a question a
   route may answer for itself, or two screens end up on different ones.                          */

/**
 * True when the live HTTP backend is selected. `SourceBanner` reads it, and reads ONLY it: the
 * banner renders the fixture warning and nothing at all when live (data-contract §4.4 rule 3 is
 * one-directional — it requires labelling *while fixtures are in use*).
 *
 * `apiBase()` used to sit beside this and render the transport path in that banner. It was removed
 * on 2026-08-17 with the live pill: an export with no importer is dead, and a base URL is not
 * something a clinician can act on. The base still appears where it is diagnostic rather than
 * decorative — inside U-04's mandated failure messages above, which name the service that could not
 * be reached.
 */
export function isLiveSource(): boolean {
  return env.PUBLIC_PULSEMIND_DATA_SOURCE === 'http';
}

/**
 * THE SELECTOR, and the one place a `load` gets a source.
 *
 * `PUBLIC_PULSEMIND_DATA_SOURCE === 'http'` selects the HTTP implementation. Anything else — any
 * other value, and unset — selects fixtures, and that default is the safe direction: a deployment
 * that mis-spells the variable gets the implementation that renders rather than a screen of named
 * errors. The comparison is against the exact string `'http'` and not a truthiness test for the same
 * reason: `PUBLIC_PULSEMIND_DATA_SOURCE=1` must not silently mean "go live".
 *
 * Both loads call this and neither names an implementation, so swapping a deployment over is one
 * environment variable rather than a code change. Whichever is live, the board must keep saying
 * visibly which one it is: the flag selects a data source, never whether the UI tells the truth
 * about which one produced what is on screen.
 */
export function resolvePatientSource(fetch: typeof globalThis.fetch): PatientDataSource {
  return isLiveSource() ? getPatientSource(fetch) : getFixturePatientSource();
}
