// src/lib/data/telemetry.svelte.ts
// CANONICAL DECLARATION — this file.
//
// WHAT THE SYSTEM ACTUALLY DID, AS IT DID IT.
//
// Every API call this application makes is recorded here with the durations each tier measured for
// ITSELF, so the pipeline behind a risk band can be watched rather than described. The board shows a
// conclusion; this shows the work. Ported from the React build, whose comments are kept where they
// record a decision rather than a mechanism.
//
// ⚠️ NOTHING FROM A RESPONSE BODY IS STORED HERE. Method, route template, status, request id and
// timings, and that is the whole shape. The explanation is prose about one patient's physiology and
// is the single most tempting thing to keep while debugging a grounding failure (PM-LOG-003), so the
// buffer is built so that it CANNOT hold it rather than trusted not to.
//
// ⚠️ THE ROUTE TEMPLATE, NEVER THE RESOLVED PATH. Our URLs carry patient identifiers and this one
// renders on a screen someone may be recording (PM-LOG-001, and G-29 for the same reason).
//
// ⚠️ A STAGE THAT DID NOT RUN HAS NO SPAN, AND MUST NEVER RENDER AS `0 ms`. Absent and zero are
// indistinguishable on screen, so a failed measurement would read as a successful one. `NaN`
// durations are dropped here rather than stored, and the formatter in the dock renders anything
// under a tenth of a millisecond as `<0.1ms` for the same reason: `0.0ms` is the value the panel
// uses to mean "did not run".
//
// MODULE SCOPE IS ALLOWED because of the paragraph above: this holds no clinical value, no patient
// identifier and no prose. It is the same test `prefs.svelte.ts` passes.

/**
 * One span as some tier measured it. `ms` is absent when the entry is an observation rather than a
 * duration (a queue depth, a model id). It is never `0` standing in for "not measured".
 */
export interface Span {
  name: string;
  ms?: number;
  desc?: string;
}

export interface Call {
  /** Monotonic within a session. The stable `{#each}` key, which the clock cannot supply. */
  id: number;
  /** Wall clock at which the request was issued. The WALL clock, deliberately: this is engineering
   *  telemetry about when the browser acted, not a clinical instant on the ward's timeline. */
  at: Date;
  method: 'GET' | 'POST';
  /** The route TEMPLATE. See the header. */
  route: string;
  /**
   * The four fields below are `?: T | undefined` rather than plain `?: T`, and that is deliberate
   * under `exactOptionalPropertyTypes`. Everywhere else in this app the distinction is load-bearing:
   * an absent key and a present `undefined` are different facts about a clinical field. Here they
   * are the same fact, "not measured", the renderer branches on `=== undefined` for both, and
   * forcing the difference would mean building these objects key by key to preserve a distinction
   * nothing reads.
   */
  /** Absent while the call is still in flight, and on a request that never got a response. */
  status?: number | undefined;
  /** Round trip as the browser saw it: always at least the server's own `total`. */
  clientMs?: number | undefined;
  /** From `X-Request-Id`: the same id Node logs and the model service echoes. */
  requestId?: string | undefined;
  /** Parsed from `Server-Timing`, in the order the tiers emitted them. */
  spans: Span[];
  /** Set when the request threw or answered non-2xx. Never the response body. */
  failed?: boolean | undefined;
}

/**
 * Bounded. A demo left streaming at a two-second cadence issues a call every couple of seconds for
 * as long as it runs, and an unbounded log is a leak with a nice interface.
 */
const LIMIT = 200;

let calls = $state<Call[]>([]);
let nextId = 1;

/** The log, newest first. */
export function telemetry(): readonly Call[] {
  return calls;
}

export function clearTelemetry(): void {
  calls = [];
}

/**
 * Parse a `Server-Timing` header into spans.
 *
 * Hand-written rather than through `PerformanceResourceTiming.serverTiming`: that reads from a
 * resource entry which has to be located by URL after the fact, and the URLs here carry patient ids.
 * Reading the header off the response the call already holds is simpler AND keeps the identifier out
 * of the lookup.
 *
 * Only same-origin makes this readable at all, which is why `PUBLIC_PULSEMIND_API_BASE=/api` through
 * the Vite proxy is the wiring that makes the dock work.
 */
export function parseServerTiming(header: string | null): Span[] {
  if (!header) return [];
  const spans: Span[] = [];
  // Split on commas that are NOT inside a quoted desc.
  for (const raw of header.match(/(?:[^,"]|"(?:\\.|[^"\\])*")+/g) ?? []) {
    const parts = raw.trim().split(';');
    const name = parts.shift()?.trim();
    if (!name) continue;
    const span: Span = { name };
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const key = part.slice(0, eq).trim().toLowerCase();
      let value = part.slice(eq + 1).trim();
      if (value.startsWith('"')) value = value.slice(1, -1).replace(/\\(.)/g, '$1');
      if (key === 'dur') {
        const ms = Number(value);
        // `NaN` would render as a plausible-looking blank. An unparseable duration is a MISSING
        // measurement, and missing is a state the panel draws differently from zero.
        if (Number.isFinite(ms)) span.ms = ms;
      } else if (key === 'desc') {
        span.desc = value;
      }
    }
    spans.push(span);
  }
  return spans;
}

export interface Settled {
  status?: number | undefined;
  headers?: Headers | undefined;
  clientMs: number;
  failed?: boolean | undefined;
}

/** Record a call as it is issued. Returns the settle callback. */
export function begin(method: 'GET' | 'POST', route: string): (result: Settled) => void {
  const id = nextId++;
  const call: Call = { id, at: new Date(), method, route, spans: [] };
  calls = [call, ...calls].slice(0, LIMIT);

  return (result: Settled) => {
    const settled: Call = {
      ...call,
      status: result.status,
      clientMs: result.clientMs,
      failed: result.failed,
      requestId: result.headers?.get('X-Request-Id') ?? undefined,
      spans: parseServerTiming(result.headers?.get('Server-Timing') ?? null),
    };
    // Replaced, not mutated in place: `$state` tracks the array, and swapping the element is what
    // makes the row re-render.
    calls = calls.map((c) => (c.id === id ? settled : c));
  };
}
