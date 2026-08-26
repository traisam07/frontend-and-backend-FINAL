<!-- src/lib/components/ProvenanceChart.svelte
     PM-5 — the charting-history / provenance chart, and its mandatory data table.

     THE CHART IS CHARTING PROVENANCE, not a PulseMind clinical trend classification (Handoff
     section 5). Nothing here carries a trend, a slope, a delta interpretation, or a prediction.

     SHAPE CARRIES IDENTITY, colour is secondary:
       measured              filled circle
       carried forward       open circle on a dashed segment
       population reference  filled diamond
       provenance unknown    open square, dotted — its own mark, never the `measured` one and never
                             an unmarked point (S-15)

     Readings that lack the active parameter produce GAPS, never `0` and never an interpolated point.

     STEP INTERPOLATION, NOT LINEAR, since 2026-08-23, at the product owner's request ("a diagonal
     implies the patient's value moved continuously between readings, which is a trend claim we are
     not allowed to make" — the exact reasoning F-11 already gave for never connecting across a gap,
     extended to every connector). Each segment now holds flat at the FROM point's value across the
     full time gap, then steps vertically at the TO point's instant — the honest reading of "this is
     what was charted, and it did not change until this next instant told us otherwise", never a
     claim about what happened in between. The connecting path still breaks at every gap: a step
     across a 40-minute hole would assert the SAME continuity a diagonal would.

     Y-AXIS RANGE, since the same day: fixed per parameter (`$lib/domain/units.ts`'s `CHART_RANGE`,
     **G-55**) when the table knows the quantity, the window's own min/max otherwise. G-55's own
     record explains why this is not the same category of assertion as a reference band: **G-28**
     (reference bands / normal ranges) is untouched and still OPEN, and this chart still draws no
     band, no shading, nothing labelled "normal".

     Like the risk-history chart, it ships BOTH a real data table containing every value AND
     keyboard-focusable points whose focus tooltip is identical to the hover tooltip. -->
<script lang="ts">
  import type { ProvenancePoint } from '$lib/domain/types';
  import { PROVENANCE_LABEL, PROVENANCE_LABEL_UNKNOWN } from '$lib/design/provenance-classes';
  import { formatClockTime } from '$lib/domain/format';

  let {
    points,
    parameterName,
    unitLabel,
    range,
    isLive,
  }: {
    points: readonly ProvenancePoint[];
    parameterName: string;
    unitLabel: string;
    /** The fixed y-axis domain this chart was rendered against — `null` when `CHART_RANGE` did not
     *  know the parameter and the producer fell back to the window's own min/max (G-55). Used here
     *  only to LABEL the axis; the actual point positions already reflect whichever domain the
     *  producer (`toProvenancePoints`) used, so the two can never disagree. */
    range: { min: number; max: number } | null;
    /** Fixture vs live — for the footer caption, same reasoning as `RiskHistoryChart`'s `isLive`. */
    isLive: boolean;
  } = $props();

  const uid = $props.id();
  let activeIndex = $state<number | null>(null);
  let tableOpen = $state(false);

  // The plot box in SVG user units. The svg is `w-full` with a viewBox, so this is an aspect
  // ratio rather than a pixel size — a narrower box makes the axis type and the marks proportionally
  // LARGER on a phone, which is the opposite of what shrinking the element would do.
  const PLOT_W = 640;
  const PLOT_H = 180;
  const PAD_L = 76;
  const PAD_T = 22;
  const PAD_B = 50;
  const PAD_R = 24;
  const VIEW_W = PLOT_W + PAD_L + PAD_R;
  const VIEW_H = PLOT_H + PAD_T + PAD_B;

  /** Only the readings that carry this parameter can be plotted or focused. */
  const plotted = $derived(points.filter((p) => p.present && p.y !== null));
  const active = $derived(activeIndex === null ? null : (plotted[activeIndex] ?? null));

  const sourceLabel = (source: ProvenancePoint['source']) =>
    source === null ? PROVENANCE_LABEL_UNKNOWN : PROVENANCE_LABEL[source];

  /**
   * FOUR TO FIVE Y-AXIS TICKS spanning `range`, evenly spaced — new 2026-08-23, alongside the fixed
   * domain itself: there was no y-axis at all before this (only the two x-axis time labels). Falls
   * back to the two values actually plotted (like the risk chart used to) when `range` is `null` —
   * a quantity `CHART_RANGE` does not know still gets SOME axis, just not a fixed one.
   */
  const yTicks = $derived.by(() => {
    if (range !== null) {
      const step = (range.max - range.min) / 4;
      return Array.from({ length: 5 }, (_, i) => {
        const value = range.min + step * i;
        return {
          y: PLOT_H - ((value - range.min) / (range.max - range.min)) * PLOT_H,
          label: String(Math.round(value * 100) / 100),
        };
      });
    }
    const values = plotted.map((p) => Number(p.valueText)).filter((v) => Number.isFinite(v));
    if (values.length === 0) return [];
    const low = Math.min(...values);
    const high = Math.max(...values);
    if (low === high) return [{ y: PLOT_H / 2, label: String(low) }];
    return [
      { y: 0, label: String(high) },
      { y: PLOT_H, label: String(low) },
    ];
  });

  /**
   * ~FIVE EVENLY SPACED X-AXIS TIME TICKS, replacing the old first/last-only pair — same technique
   * and same reasoning as `RiskHistoryChart`'s `xTicks`.
   */
  const xTicks = $derived.by(() => {
    const first = points.at(0);
    const last = points.at(-1);
    if (first === undefined || last === undefined) return [];
    const t0 = Date.parse(first.iso);
    const t1 = Date.parse(last.iso);
    return Array.from({ length: 5 }, (_, i) => {
      const frac = i / 4;
      return {
        x: first.x + (last.x - first.x) * frac,
        label: formatClockTime(new Date(t0 + (t1 - t0) * frac)),
      };
    });
  });

  /**
   * THE PROVENANCE SUMMARY LINE, new 2026-08-23: "Last real measurement <age> · <N> of the last <M>
   * readings measured · <C> carried forward · <P> from population references." Every number here is
   * COUNTED from `points`, never estimated — `relTime` on the most recent `measured` point is the
   * SAME pre-formatted age `toProvenancePoints` already computed (`formatAge`), not a second
   * computation that could drift from it.
   */
  const summary = $derived.by(() => {
    const lastMeasured = plotted.findLast((p) => p.source === 'measured');
    let measured = 0;
    let carriedForward = 0;
    let populationReference = 0;
    for (const p of plotted) {
      if (p.source === 'measured') measured += 1;
      else if (p.source === 'carried_forward') carriedForward += 1;
      else if (p.source === 'population_reference') populationReference += 1;
    }
    return {
      lastMeasuredAge: lastMeasured?.relTime ?? null,
      measured,
      total: plotted.length,
      carriedForward,
      populationReference,
    };
  });

  /**
   * THE CONNECTORS, ONE PER ADJACENT PAIR rather than one polyline per run.
   *
   * That is not (only) a drawing preference. The dash is provenance's non-colour channel, and it
   * means exactly one thing: *this value was not measured now*. A polyline can carry only one dash
   * style, so a run containing a single carried-forward point would render EVERY connector in that
   * run dashed — asserting that every value in it was reused. Per-pair connectors let the dash apply
   * to the one connector that leads into the carried-forward point, and nowhere else.
   *
   * STEP, NOT STRAIGHT: `path` is `M x1,y1 H x2 V y2` — hold flat at the FROM value across the full
   * time gap, then step vertically at the TO instant. See the file header for why.
   *
   * Built over the FULL `points` array — not over `plotted` — because that is what makes a gap a
   * gap: skipping the absent readings first would silently reconnect the line across them, which is
   * the interpolation F-11 forbids.
   */
  const connectors = $derived.by(() => {
    const out: Array<{
      key: string;
      path: string;
      dashed: boolean;
    }> = [];
    for (let i = 1; i < points.length; i += 1) {
      const from = points[i - 1];
      const to = points[i];
      if (from === undefined || to === undefined) continue;
      // A reading that does not carry this parameter breaks the line. No connector is drawn across
      // it, in either direction.
      if (!from.present || from.y === null || !to.present || to.y === null) continue;
      out.push({
        key: to.key,
        path: `M ${from.x},${from.y} H ${to.x} V ${to.y}`,
        // The connector is dashed when the value it ARRIVES AT was not measured at that moment.
        dashed: to.source === 'carried_forward' || to.source === null,
      });
    }
    return out;
  });

  const label = (p: ProvenancePoint) =>
    // Provenance FIRST, so the caveat is heard before the number.
    `${sourceLabel(p.source)}: ${p.valueText} ${unitLabel}, ${p.absTime}, ${p.relTime}` +
    (p.lastMeasuredText === '' ? '' : `, last measured ${p.lastMeasuredText}`);

  function onPointKey(event: KeyboardEvent, i: number) {
    const next =
      event.key === 'ArrowRight'
        ? i + 1
        : event.key === 'ArrowLeft'
          ? i - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? plotted.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    const clamped = Math.max(0, Math.min(plotted.length - 1, next));
    document.getElementById(`${uid}-pp-${clamped}`)?.focus();
  }
</script>

<div class="flex flex-col gap-3">
  <!-- `bg-chart-plot-bg`, not the shared `bg-surface-sunken` "well" token, 2026-08-23 ("cho nền
       màu biểu đồ sáng hơn, nó đang hơi tối làm khó nhìn") — same token `RiskHistoryChart` uses,
       see its own comment in `scripts/build-tokens.mjs` for why this needed a real re-verification,
       not a class swap. -->
  <div class="relative rounded-md border border-border bg-chart-plot-bg p-2">
    <svg
      role="img"
      viewBox="0 0 {VIEW_W} {VIEW_H}"
      class="h-auto w-full"
      aria-label="{parameterName} charting provenance over the 60-minute window, {plotted.length} charted values of {points.length} readings. Charting provenance only — not a trend."
    >
      <g aria-hidden="true">
        {#each yTicks as tick, t (t)}
          <line
            x1={PAD_L}
            x2={PAD_L + PLOT_W}
            y1={PAD_T + tick.y}
            y2={PAD_T + tick.y}
            class="stroke-chart-grid"
            stroke-width="1"
          />
          <text
            x={PAD_L - 10}
            y={PAD_T + tick.y + 6}
            text-anchor="end"
            class="fill-fg-muted text-[16px] tabular-nums"
          >
            {tick.label}
          </text>
        {/each}

        <line
          x1={PAD_L}
          x2={PAD_L}
          y1={PAD_T}
          y2={PAD_T + PLOT_H}
          class="stroke-border-strong"
          stroke-width="1"
        />
        <line
          x1={PAD_L}
          x2={PAD_L + PLOT_W}
          y1={PAD_T + PLOT_H}
          y2={PAD_T + PLOT_H}
          class="stroke-border-strong"
          stroke-width="1"
        />
        <!-- ~FIVE X-AXIS TICKS, replacing the old first/last-only pair. -->
        {#each xTicks as tick, t (t)}
          <text
            x={PAD_L + tick.x}
            y={VIEW_H - 12}
            text-anchor={t === 0 ? 'start' : t === xTicks.length - 1 ? 'end' : 'middle'}
            class="fill-fg-muted text-[16px] tabular-nums"
          >
            {tick.label}
          </text>
        {/each}

        <!-- The y axis is labelled ONCE with the unit marker, so no tick is a bare clinical number. -->
        <text
          transform="translate(15,{PAD_T + PLOT_H / 2}) rotate(-90)"
          text-anchor="middle"
          class="fill-fg-muted text-[15px]"
        >
          {parameterName} · {unitLabel}
        </text>
      </g>

      <g transform="translate({PAD_L},{PAD_T})">
        {#each connectors as connector (connector.key)}
          <path
            aria-hidden="true"
            d={connector.path}
            fill="none"
            class="stroke-chart-series"
            stroke-width="1.5"
            stroke-dasharray={connector.dashed ? '5 4' : undefined}
          />
        {/each}

        {#each plotted as p, i (p.key)}
          <!-- Hit target >= 24x24. -->
          <circle
            cx={p.x}
            cy={p.y}
            r="13"
            fill="transparent"
            aria-hidden="true"
            onmouseenter={() => (activeIndex = i)}
            onmouseleave={() => (activeIndex = null)}
          />
          <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
          <!-- Suppressed for the same reason as the risk-history chart: a focusable data point is a
               hard requirement, and turning each mark into a `<button>` would lose the `role="img"`
               reading of the chart. The keyboard contract is implemented in full. -->
          <g
            id="{uid}-pp-{i}"
            role="img"
            tabindex="0"
            aria-label={label(p)}
            class="outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus"
            onfocus={() => (activeIndex = i)}
            onblur={() => (activeIndex = null)}
            onmouseenter={() => (activeIndex = i)}
            onmouseleave={() => (activeIndex = null)}
            onkeydown={(event) => onPointKey(event, i)}
          >
            {#if p.source === 'measured'}
              <circle
                cx={p.x}
                cy={p.y}
                r={activeIndex === i ? 6 : 4.5}
                class="fill-chart-prov-measured"
              />
            {:else if p.source === 'carried_forward'}
              <circle
                cx={p.x}
                cy={p.y}
                r={activeIndex === i ? 6 : 4.5}
                class="fill-surface-sunken stroke-chart-prov-carried"
                stroke-width="2"
              />
            {:else if p.source === 'population_reference'}
              <rect
                x={p.x - 5}
                y={(p.y ?? 0) - 5}
                width="10"
                height="10"
                transform="rotate(45 {p.x} {p.y})"
                class="fill-chart-prov-population"
              />
            {:else}
              <!-- S-15: its own mark. Never the `measured` mark, never unmarked. -->
              <rect
                x={p.x - 5}
                y={(p.y ?? 0) - 5}
                width="10"
                height="10"
                class="fill-surface-sunken stroke-insufficient-border"
                stroke-width="2"
                stroke-dasharray="2 2"
              />
            {/if}
          </g>
        {/each}
      </g>
    </svg>

    {#if active !== null}
      <div
        class="pointer-events-none absolute top-2 right-2 max-w-80 rounded-md border border-border bg-surface-raised p-2 text-sm text-fg shadow-popover"
      >
        <p class="font-semibold">{sourceLabel(active.source)}</p>
        <p>
          <span class="whitespace-nowrap tabular-nums"
            >{active.valueText}&nbsp;<span class="text-fg-muted">{unitLabel}</span></span
          >
        </p>
        <p class="text-fg-secondary">
          <time datetime={active.iso}>{active.absTime}</time>
          <span class="text-fg-muted">({active.relTime})</span>
        </p>
        {#if active.lastMeasuredText !== ''}
          <p class="text-fg-secondary">last measured {active.lastMeasuredText}</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- THE PROVENANCE SUMMARY LINE, new 2026-08-23 ("Provenance summary line directly under the
       chart... computed from the actual data"). Monospace, `PROVENANCE` prefix, exactly the shape
       requested — a NEW rollup, distinct from PM-6's sidebar section in the route, which already
       shows the same counts as a `<dl>` rather than one sentence. -->
  <p class="font-mono text-sm text-fg-secondary">
    <span class="font-semibold text-fg-muted uppercase">Provenance</span>
    {#if summary.lastMeasuredAge !== null && summary.lastMeasuredAge !== ''}
      Last real measurement {summary.lastMeasuredAge} ·
    {:else}
      No measured reading in this window ·
    {/if}
    {summary.measured} of the last {summary.total} readings measured · {summary.carriedForward} carried
    forward · {summary.populationReference} from population references.
  </p>

  <!-- FOOTER CAPTION, same day: what the chart shows and does not, plus the data-source state. -->
  <p class="text-sm text-fg-muted">
    Shows when each value was measured, carried forward, or taken from a population reference — not
    a clinical trend. Values hold flat while carried forward. {isLive
      ? 'Live data source.'
      : 'Simulated data for wireframe review.'}
  </p>

  <div>
    <button
      type="button"
      aria-expanded={tableOpen}
      aria-controls="{uid}-ptable"
      onclick={() => (tableOpen = !tableOpen)}
      class="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-semibold text-fg hover:bg-surface-hover focus-visible:pm-focus"
    >
      {tableOpen ? 'Hide data table' : 'Show data table'}
    </button>

    <div id="{uid}-ptable" hidden={!tableOpen} class="mt-3 overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <caption class="pb-2 text-left text-sm text-fg-secondary">
          Every reading in the 60-minute window. A reading that did not carry {parameterName} is listed
          as a gap and is not plotted.
        </caption>
        <thead>
          <tr class="border-b border-border text-left">
            <th scope="col" class="py-1.5 pe-3 font-semibold">Charted</th>
            <th scope="col" class="py-1.5 pe-3 font-semibold">Value</th>
            <th scope="col" class="py-1.5 pe-3 font-semibold">Source</th>
            <th scope="col" class="py-1.5 font-semibold">Last measured</th>
          </tr>
        </thead>
        <tbody>
          {#each points as point (point.key)}
            <tr class="border-b border-border-subtle">
              <th scope="row" class="py-1.5 pe-3 font-normal whitespace-nowrap">
                <time datetime={point.iso} class="tabular-nums">{point.absTime}</time>
                {#if point.relTime !== ''}<span class="text-fg-muted">({point.relTime})</span>{/if}
              </th>
              <td class="py-1.5 pe-3 whitespace-nowrap tabular-nums">
                {#if point.present && point.valueText !== null}
                  {point.valueText}&nbsp;<span class="text-fg-muted">{unitLabel}</span>
                {:else}
                  <span class="text-insufficient-fg">not charted in this reading</span>
                {/if}
              </td>
              <td class="py-1.5 pe-3">
                {#if point.present}
                  {sourceLabel(point.source)}
                {:else}
                  <!-- Stated in words. A bare em dash standing in for a missing value is on the
                       governing banned list. -->
                  <span class="text-insufficient-fg">no entry for this parameter</span>
                {/if}
              </td>
              <td class="py-1.5">
                {#if point.lastMeasuredText !== ''}
                  {point.lastMeasuredText}
                {:else if point.source === 'population_reference'}
                  <!-- S-14: no age and no last-measured time, ever. -->
                  <span class="text-fg-muted">not applicable</span>
                {:else}
                  <span class="text-fg-muted">not supplied</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
