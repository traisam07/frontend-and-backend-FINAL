<!-- src/lib/components/TelemetryDock.svelte
     CANONICAL DECLARATION — this file.

     THE PIPELINE, AS IT RUNS. Every API call the dashboard makes, with the time each tier of the
     stack measured for its own work: feature assembly, scoring, the band decision, generation, the
     database write. The clinical screens show a conclusion; this shows the work behind it.

     NOT A CLINICAL SURFACE. It renders no patient, no score and no band, and it lives behind the
     demonstration flag with the ward controls rather than in the app chrome. That boundary is the
     same one the sign-in screens have and it is load-bearing for the same reason: an operator panel
     that sits inside the clinical frame starts being read as part of the assessment.

     ⚠️ EVERY FIGURE IS MEASURED BY THE TIER THAT DID THE WORK and arrives on a W3C `Server-Timing`
     header. Nothing here is computed from anything else, and nothing here is a constant.

     ⚠️ A STAGE THAT DID NOT RUN IS ABSENT, NEVER `0 ms`. The two are indistinguishable on screen, so
     a failed measurement would read as a successful one. `duration` renders anything under a tenth
     of a millisecond as `<0.1ms` rather than rounding it to the value the panel uses to mean "did
     not run" — the deterministic template really does take about 0.05 ms, and it really did print
     `0.0ms` before this existed.

     ⚠️ THE SPANS NEST, AND THEIR DURATIONS ARE NOT MEANT TO BE ADDED UP. The model service's stages
     sit inside the Node hop, which sits inside the browser round trip. The indentation is the
     containment relation, which is also the invariant worth checking: `mongo` inside `total`,
     stages inside `upstream`. -->
<script lang="ts">
  import { clearTelemetry, telemetry, type Call, type Span } from '$lib/data/telemetry.svelte';
  import Button from './Button.svelte';

  let { onclose }: { onclose: () => void } = $props();

  /**
   * The containment tree, and the vocabulary. The five stage labels match the technical document's
   * five stages, so the running system and the document a reader may also have open use the same
   * words. Transport and storage are labelled as what they are: they are NOT pipeline stages and
   * must not be drawn as though they were.
   */
  const TREE: readonly { name: string; label: string; indent: number; kind: 'infra' | 'stage' }[] =
    [
      { name: 'total', label: 'API · Node/Express', indent: 0, kind: 'infra' },
      { name: 'upstream', label: 'model service · FastAPI', indent: 1, kind: 'infra' },
      { name: 'queue', label: 'waiting for the model thread', indent: 2, kind: 'infra' },
      { name: 'collect', label: '1 · Collect', indent: 2, kind: 'stage' },
      { name: 'order', label: '2 · Order in time', indent: 2, kind: 'stage' },
      { name: 'assess', label: '3 · Assess, booster and calibration', indent: 2, kind: 'stage' },
      { name: 'decide', label: '4 · Decide the level, hysteresis', indent: 2, kind: 'stage' },
      { name: 'rank', label: '5 · Explain, rank the reasons', indent: 2, kind: 'stage' },
      { name: 'floor', label: '5 · Explain, sufficiency floor', indent: 2, kind: 'stage' },
      { name: 'baseline', label: '5 · Explain, deterministic template', indent: 2, kind: 'stage' },
      { name: 'load', label: '5 · Explain, load the weights', indent: 2, kind: 'stage' },
      { name: 'explain', label: '5 · Explain, write the rationale', indent: 2, kind: 'stage' },
      { name: 'ground', label: '5 · Explain, check every sentence', indent: 2, kind: 'stage' },
      { name: 'mongo', label: 'MongoDB Atlas', indent: 1, kind: 'infra' },
    ];

  /** Marks: entries that carry a `desc` and no duration, because they are observations. */
  const NOTES: Readonly<Record<string, string>> = {
    depth: 'model queue on arrival',
    refused: 'refused',
  };

  const calls = $derived(telemetry());

  function duration(ms: number): string {
    if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)}s`;
    if (ms >= 10) return `${Math.round(ms)}ms`;
    if (ms >= 0.1) return `${ms.toFixed(1)}ms`;
    return '<0.1ms';
  }

  /** Spans in containment order, then anything the tree does not know, so a new span from the
   *  service appears rather than being silently dropped by a panel that has not heard of it. */
  function ordered(spans: readonly Span[]): { span: Span; indent: number; label: string }[] {
    const known = new Set(TREE.map((t) => t.name));
    const rows: { span: Span; indent: number; label: string }[] = [];
    for (const node of TREE) {
      const span = spans.find((s) => s.name === node.name);
      if (span !== undefined) rows.push({ span, indent: node.indent, label: node.label });
    }
    for (const span of spans) {
      if (!known.has(span.name) && NOTES[span.name] === undefined) {
        rows.push({ span, indent: 2, label: span.name });
      }
    }
    return rows;
  }

  function marks(spans: readonly Span[]): Span[] {
    return spans.filter((s) => NOTES[s.name] !== undefined);
  }

  const clockTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  function statusOf(call: Call): string {
    if (call.status === undefined) return call.failed === true ? 'failed' : 'in flight';
    return String(call.status);
  }
</script>

<section
  aria-label="Pipeline telemetry"
  class="border-border bg-surface-sunken flex h-64 flex-col border-t"
>
  <div
    class="border-border-subtle flex shrink-0 items-center justify-between gap-3 border-b px-3 py-1.5"
  >
    <p class="text-micro text-fg-muted font-semibold tracking-[0.04em] uppercase">
      Pipeline · {calls.length} call{calls.length === 1 ? '' : 's'}
    </p>
    <div class="flex items-center gap-2">
      <Button variant="quiet" onclick={clearTelemetry}>Clear</Button>
      <Button variant="quiet" onclick={onclose}>Close</Button>
    </div>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto">
    {#if calls.length === 0}
      <p class="text-fg-secondary p-3 text-sm">
        No calls yet. Every request the dashboard makes will appear here with the time each tier
        measured for its own work.
      </p>
    {:else}
      <ul>
        {#each calls as call (call.id)}
          <li class="border-border-subtle border-b px-3 py-2 last:border-b-0">
            <div class="text-micro flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono">
              <span class="text-fg-muted tabular-nums">{clockTime.format(call.at)}</span>
              <span class="font-semibold">{call.method}</span>
              <!-- The route TEMPLATE. A resolved path here would put a patient id on a screen
                   somebody may be recording. -->
              <span class="text-fg">{call.route}</span>
              <span class={call.failed === true ? 'text-insufficient-fg' : 'text-fg-muted'}>
                {statusOf(call)}
              </span>
              {#if call.clientMs !== undefined}
                <span class="text-fg-muted tabular-nums">
                  browser {duration(call.clientMs)}
                </span>
              {/if}
              {#if call.requestId !== undefined}
                <span class="text-fg-muted">{call.requestId}</span>
              {/if}
            </div>

            {#each ordered(call.spans) as row (row.span.name)}
              <div
                class="text-micro flex items-baseline gap-2 font-mono"
                style="padding-left: {row.indent * 0.9}rem"
              >
                <span class={row.span.name === 'total' ? 'font-semibold' : 'text-fg-secondary'}>
                  {row.label}
                </span>
                <span class="border-border-subtle flex-1 border-b border-dashed"></span>
                <!-- A span with no `dur` is an observation, not a zero. -->
                <span class="tabular-nums">
                  {row.span.ms === undefined ? '' : duration(row.span.ms)}
                </span>
                {#if row.span.desc !== undefined}
                  <span class="text-fg-muted">{row.span.desc}</span>
                {/if}
              </div>
            {/each}

            {#each marks(call.spans) as mark (mark.name)}
              <p class="text-micro text-fg-muted pl-[1.8rem] font-mono">
                {NOTES[mark.name]}{mark.desc === undefined ? '' : ` ${mark.desc}`}
              </p>
            {/each}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
