<!-- src/lib/components/RiskHistoryChart.svelte
     CANONICAL DECLARATION — `.claude/skills/clinical-a11y/SKILL.md` section 7.

     THE HARD REQUIREMENT: a hover tooltip is not an accessible equivalent. Both of the following
     ship, or the chart does not ship —
       1. a REAL data table containing every windowed reading, always in the DOM, toggled by a
          visible button with `aria-expanded` + `aria-controls`, `hidden` when closed;
       2. FOCUSABLE data points whose focus tooltip is identical to the hover tooltip. THIS STILL
          HOLDS for every point, not only the one now drawn with a visible dot (see below) — an
          earlier reading loses its visible mark, never its keyboard stop or its tooltip.

     `rows` is a `[HARNESS]` extension to the declared prop contract, and it is not optional: section
     7 declares `{ points, unitLabel }` and, in the same breath, requires the table to carry EVERY
     plotted value. Those cannot both hold, because `points` has already dropped the readings whose
     `riskScore` was `null` (F-2). Reconstructing the table from `points` would delete those readings
     from the screen; `rows` is the same window projected separately, so they survive as S-35 rows.

     REDESIGNED 2026-08-23, at the product owner's request, against a reference mockup, under an
     EXPLICIT, TWICE-CONFIRMED override of **G-12** — see `docs/spec/open-questions.md` G-12 and
     `RISK_SCORE_DOMAIN`/`RISK_THRESHOLDS` in `$lib/domain/derive.ts` for the full record of what was
     said and how the three threshold numbers below were actually sourced (a mockup's pixel
     positions, not typed digits — the weakest-sourced values in this app).

     WHAT THIS CHART MUST STILL NEVER DO, override or not:
       - interpolate, smooth, extrapolate or forecast; no trend line, no moving average
       - draw a single point as a flat line (the caller gates on `points.length >= 2`)
       - connect across a gap — `breakBefore` starts a new polyline instead
       - derive `risk_level` FROM `risk_score` anywhere. `riskLevel` below is a PROP — the backend's
         own field, passed down unchanged — never computed by comparing the score to `thresholds`.
         The threshold lines are decorative context on the axis, not a second source of truth.
       - call itself a trend
       - hold the previous render at reduced opacity while refetching

     WHAT CHANGED, and why each one is safe under the override above:
       - the y domain is FIXED (`RISK_SCORE_DOMAIN`, imported by the caller and no longer computed
         here at all) instead of scaled to the window's own min/max
       - MED/HIGH/CRIT reference lines and alternating band tints, from `thresholds` — a PROP, not a
         constant inside this file, so a real backend-delivered value could replace the caller's
         import without touching this component
       - ~5 evenly spaced x-axis time ticks, interpolated between the first and last plotted instant,
         rather than only the two endpoints
       - per-point value labels REMOVED — the line reads clean now; the latest value moved to its own
         "LATEST" readout in the caller's header (`PatientDetailBody.svelte`)
       - only the LATEST point draws a visible, filled dot, coloured by `riskLevel` — every earlier
         point keeps its full keyboard stop, hover hit-target and tooltip, just no longer a visible
         mark, per the "clean line" request
       - a footer caption stating the data-source state and that x-axis labels follow the viewer's
         own device clock

     THE FOUR `color-chart-risk-*` TOKENS the latest dot uses are NOT `RISK_CHIP`'s `-solid` or
     `-border` — `$lib/design/risk-classes.ts`'s own **D-30** comment measured and rejected reusing
     either (1.13 contrast against a plot surface; ΔE2000 1.1 apart in dark mode). These four were
     solved fresh, the same way `color-chart-series` and `color-datalimited` were earlier the same
     day — see `scripts/build-tokens.mjs`'s own comment on `color-chart-risk-critical` for the
     numbers. One known, accepted gap: `color-chart-risk-low` (azure, hue 228, the established
     "Low" identity — **D-28** — which this component does not get to invent a new hue around) sits
     only 8.1 ΔE2000 from `color-chart-series` (accent blue, hue 258) under simulated deuteranopia.
     The dot's own `stroke-surface` outline and its fixed position at the end of the line are the
     channels that still separate it from the line in that case — shape and position, not hue alone,
     same discipline as every other mark in this file. -->
<script lang="ts">
  import type { ChartPoint, ChartTableRow, RiskLevel } from '$lib/domain/types';
  import { RISK_SCORE_DOMAIN, RISK_THRESHOLDS } from '$lib/domain/derive';
  import { formatClockTime } from '$lib/domain/format';

  let {
    points,
    rows,
    unitLabel,
    riskLevel,
    thresholds = RISK_THRESHOLDS,
    isLive,
  }: {
    /** F-2's plotted marks. The caller renders this component only when there are at least two. */
    points: readonly ChartPoint[];
    /** Every reading in the same window, including those with no score. */
    rows: readonly ChartTableRow[];
    /**
     * `%` since 2026-08-18 (**D-27**) — the product owner declared the score's unit.
     */
    unitLabel: string;
    /**
     * The LATEST reading's own `risk_level`, verbatim from the backend — never computed from
     * `points`. `null` renders the latest dot in the same "unknown" treatment `RiskChip` uses
     * elsewhere (S-05), never a default band.
     */
    riskLevel: RiskLevel | null;
    /**
     * MED/HIGH/CRIT cut-offs on `RISK_SCORE_DOMAIN`'s 0–100 scale. A PROP, not a constant read from
     * inside this file (the product owner's own requirement: "must come from config/props, not
     * hardcoded in the chart") — defaults to `RISK_THRESHOLDS`, the one place they are defined, so a
     * caller never has to repeat the numbers to get the default behaviour.
     */
    thresholds?: { medium: number; high: number; critical: number };
    /** Fixture vs live — for the footer caption. The caller already knows this; the chart does not
     *  reach into `$lib/data/source` itself, so it stays a pure function of its props. */
    isLive: boolean;
  } = $props();

  const uid = $props.id();

  let activeIndex = $state<number | null>(null);
  let tableOpen = $state(false);

  /* ---- geometry ------------------------------------------------------------------------------
     The producer positions marks inside a box of PLOT_W x PLOT_H against the FIXED
     `RISK_SCORE_DOMAIN` (G-12 override); this component owns the viewBox and the axis gutters, and
     translates the plot group into place. Nothing here recomputes a clinical value.              */
  // `PLOT_W`/`PLOT_H` MUST MATCH the `PLOT` object `PatientDetailBody.svelte` passes into
  // `toChartPoints()` — every point's `x`/`y` is already computed into that box before it reaches
  // this component, so changing either value here without changing it there would silently
  // mis-position every mark. The PADDING constants below carry no such constraint.
  const PLOT_W = 640;
  const PLOT_H = 180;
  const PAD_L = 76;
  const PAD_T = 22;
  const PAD_B = 50;
  const PAD_R = 24;
  const VIEW_W = PLOT_W + PAD_L + PAD_R;
  const VIEW_H = PLOT_H + PAD_T + PAD_B;

  const active = $derived(activeIndex === null ? null : (points[activeIndex] ?? null));

  /** Maps a score on `RISK_SCORE_DOMAIN`'s scale to a y position in the PLOT_H-tall box — the same
   *  map `toChartPoints` uses to place the marks, so an axis tick and a point at the same score
   *  always land on the same line. */
  const domainY = (value: number) =>
    PLOT_H -
    ((value - RISK_SCORE_DOMAIN.min) / (RISK_SCORE_DOMAIN.max - RISK_SCORE_DOMAIN.min)) * PLOT_H;

  /**
   * FIVE FIXED TICKS spanning `RISK_SCORE_DOMAIN`, evenly spaced — 2026-08-23, replacing the
   * window's-own-extremes ticks under the same G-12 override as the domain itself. `Number` here is
   * a plain arithmetic step across a KNOWN, FIXED range (0/25/50/75/100), not a statistic computed
   * from delivered scores — the distinction rule 17 draws, and the reason this is still not the
   * "fabricated midpoint" this file's history already removed once.
   */
  const yTicks = $derived.by(() => {
    const { min, max } = RISK_SCORE_DOMAIN;
    const step = (max - min) / 4;
    return Array.from({ length: 5 }, (_, i) => {
      const value = min + step * i;
      return { y: domainY(value), label: String(value) };
    });
  });

  /**
   * MED/HIGH/CRIT reference lines and the four alternating bands between them — 2026-08-23, the
   * same override. `thresholds` is the PROP, never re-read from a constant here. Bands run, in
   * domain order, low -> high: `[min, medium)`, `[medium, high)`, `[high, critical)`,
   * `[critical, max]` — alternating tint is cosmetic banding for scanability, not a clinical
   * classification: nothing here is labelled "normal" or "abnormal", only the three named
   * thresholds themselves are (G-28 is untouched — this is not a per-parameter reference range).
   */
  // `class` per line, 2026-08-23, at the product owner's report ("cho chữ crit, high, med màu
  // khác nổi bật hơn" — the three labels read as flat grey, no different from the y-axis numbers
  // beside them). Each reuses that band's OWN `risk-*-fg` text token — the exact colour `RiskChip`
  // and PD-5's panel already use for the same clinical band, already solved for text contrast
  // against `surface` (== `color-chart-plot-bg` in light theme, see that token's own comment) —
  // not a new colour, and not `RiskChip`'s badge `-solid`/`-border` this file's `D-30` discussion
  // already rejected for a mark: these three are TEXT, the case `-fg` was solved for.
  const thresholdLines = $derived.by(() => [
    { y: domainY(thresholds.medium), label: 'MED', class: 'fill-risk-medium-fg' },
    { y: domainY(thresholds.high), label: 'HIGH', class: 'fill-risk-high-fg' },
    { y: domainY(thresholds.critical), label: 'CRIT', class: 'fill-risk-critical-fg' },
  ]);
  const bands = $derived.by(() => {
    const edges = [
      RISK_SCORE_DOMAIN.min,
      thresholds.medium,
      thresholds.high,
      thresholds.critical,
      RISK_SCORE_DOMAIN.max,
    ];
    const out: Array<{ y1: number; y2: number; tinted: boolean }> = [];
    for (let i = 0; i < edges.length - 1; i += 1) {
      const lo = edges[i];
      const hi = edges[i + 1];
      if (lo === undefined || hi === undefined) continue;
      out.push({ y1: domainY(hi), y2: domainY(lo), tinted: i % 2 === 1 });
    }
    return out;
  });

  /**
   * ~FIVE EVENLY SPACED X-AXIS TIME TICKS, 2026-08-23, replacing the old first/last-only pair. The
   * five INSTANTS are a plain linear interpolation between the first and last PLOTTED point's own
   * real timestamp — never a fabricated reading, only axis chrome, the same category as the y-tick
   * numbers above. `formatClockTime` prints `HH:mm` only: no date, no zone label, because a 24-hour
   * window never crosses either.
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
   * Polyline segments. A new segment starts at every `breakBefore`, so a gap is a VISIBLE BREAK
   * rather than a straight connecting line across a hole in the charting.
   */
  const segments = $derived.by(() => {
    const out: ChartPoint[][] = [];
    let current: ChartPoint[] = [];
    for (const point of points) {
      if (point.breakBefore && current.length > 0) {
        out.push(current);
        current = [];
      }
      current.push(point);
    }
    if (current.length > 0) out.push(current);
    return out;
  });

  const label = (p: ChartPoint) =>
    // Provenance/caveat FIRST, so it is heard before the number. `reviewed` LAST, same order the
    // small marker and the tooltip both use — the fact a sighted user sees from the dot's colour
    // is the same fact a screen-reader user hears here, never a fact ONLY the mark's colour carries.
    `${p.sourceLabel}: ${p.valueText} ${unitLabel}, ${p.absTime}, ${p.relTime}` +
    (p.reviewed ? ', reviewed' : '');

  /** The dot fill for the ONE visible mark (the latest point) — see the file header for why this is
   *  a fresh `color-chart-risk-*` set rather than `RISK_CHIP`'s badge tokens. `null` (S-05) gets the
   *  same "unknown" treatment `RiskChip` uses: the insufficient family, dashed. */
  const LATEST_DOT_FILL: Record<RiskLevel, string> = {
    Critical: 'fill-chart-risk-critical',
    High: 'fill-chart-risk-high',
    Medium: 'fill-chart-risk-medium',
    Low: 'fill-chart-risk-low',
  };

  function onPointKey(event: KeyboardEvent, i: number) {
    const next =
      event.key === 'ArrowRight'
        ? i + 1
        : event.key === 'ArrowLeft'
          ? i - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? points.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    const clamped = Math.max(0, Math.min(points.length - 1, next));
    document.getElementById(`${uid}-pt-${clamped}`)?.focus();
  }
</script>

<div class="flex flex-col gap-3">
  <!-- `bg-chart-plot-bg`, not the shared `bg-surface-sunken` "well" token, 2026-08-23 ("cho nền
       màu biểu đồ sáng hơn, nó đang hơi tối làm khó nhìn") — see that token's own comment in
       `scripts/build-tokens.mjs` for why this needed a real re-verification, not a class swap. -->
  <div class="relative rounded-md border border-border bg-chart-plot-bg p-2">
    <svg
      role="img"
      viewBox="0 0 {VIEW_W} {VIEW_H}"
      class="h-auto w-full"
      aria-label="Respiratory risk score, last 24 hours, {points.length} plotted readings, ending {points.at(
        -1,
      )
        ?.absTime}. Fixed 0-{RISK_SCORE_DOMAIN.max} axis, with reference lines at medium {thresholds.medium},
      high {thresholds.high} and critical {thresholds.critical}. Charting only — no trend
      classification."
    >
      <!-- Axes, bands, gridlines and tick labels are decorative chrome: the same facts are in the
           data table and in every mark's accessible name. -->
      <g aria-hidden="true">
        <!-- THE ALTERNATING BANDS, behind everything else, so the line and the dot always sit on
             top of them. `fill-chart-grid` at reduced opacity for the tinted bands, nothing for the
             others — the sunken plot background already shows through. -->
        {#each bands as band, b (b)}
          {#if band.tinted}
            <rect
              x={PAD_L}
              y={PAD_T + band.y1}
              width={PLOT_W}
              height={band.y2 - band.y1}
              class="fill-chart-grid"
              opacity="0.6"
            />
          {/if}
        {/each}

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
            class="fill-fg-muted text-[20px] tabular-nums"
          >
            {tick.label}
          </text>
        {/each}

        <!-- THE THRESHOLD REFERENCE LINES — dashed, labelled at the right edge. `data-clarify="G-12"`
             on each: the whole group is the stated override this file's header explains. -->
        {#each thresholdLines as line, l (l)}
          <line
            x1={PAD_L}
            x2={PAD_L + PLOT_W}
            y1={PAD_T + line.y}
            y2={PAD_T + line.y}
            class="stroke-fg-muted"
            stroke-width="1.5"
            stroke-dasharray="6 4"
            data-clarify="G-12"
          />
          <text
            x={PAD_L + PLOT_W - 6}
            y={PAD_T + line.y - 6}
            text-anchor="end"
            class={[line.class, 'text-[15px] font-semibold tracking-[0.04em]']}
            data-clarify="G-12"
          >
            {line.label}
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
      </g>

      <g transform="translate({PAD_L},{PAD_T})">
        <!-- One polyline PER SEGMENT. A gap is drawn as an absence of line, never as a straight
             connector — a line across a 40-minute hole asserts continuity the data does not have. -->
        {#each segments as segment, s (segment[0]?.key ?? s)}
          {#if segment.length > 1}
            <polyline
              aria-hidden="true"
              points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              class="stroke-chart-series"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {/if}
        {/each}

        {#each points as p, i (p.key)}
          <!-- Per-mark hit target >= 24x24, on EVERY point, latest or not — the keyboard/tooltip
               contract does not shrink just because the visible dot did. -->
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
          <!-- The two warnings are suppressed deliberately, and only here. A FOCUSABLE data point is
               a hard requirement (`.claude/skills/clinical-a11y/SKILL.md` section 7): a hover
               tooltip is not an accessible equivalent, so every mark is its own tab stop with the
               same tooltip on focus as on hover, and arrow keys move between marks.

               EVERY POINT DRAWS A VISIBLE DOT AGAIN, 2026-08-23 ("thêm lại những cái chấm như hình
               cũ, còn lại không thêm gì hơn" — bring the dots back like the earlier screenshot,
               nothing else) — reverting the "clean line, latest mark only" pass from earlier the
               same day. Three tiers, highest priority first, nothing else changed: the LATEST point
               keeps its own risk-level colour (unchanged from before this edit); an EARLIER
               `reviewed` point gets `fill-review-done-fg`, the same colour `Reviewed` wears
               everywhere else in the app; every other point gets `fill-accent-solid`, the plain
               colour every dot used before either of the two special cases existed. SHAPE still
               carries the data-sufficiency caveat throughout: a hollow square (dashed) for
               `dataLimited`, filled circle otherwise (F-2). -->
          <rect
            id="{uid}-pt-{i}"
            x={p.x - (activeIndex === i ? 8 : 6)}
            y={p.y - (activeIndex === i ? 8 : 6)}
            width={(activeIndex === i ? 8 : 6) * 2}
            height={(activeIndex === i ? 8 : 6) * 2}
            rx={p.dataLimited ? 0 : 99}
            role="img"
            tabindex="0"
            aria-label={label(p)}
            class={[
              'stroke-surface outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus',
              p.dataLimited
                ? 'fill-surface-sunken stroke-insufficient-border'
                : i === points.length - 1
                  ? riskLevel !== null
                    ? LATEST_DOT_FILL[riskLevel]
                    : 'fill-insufficient-solid'
                  : p.reviewed
                    ? 'fill-review-done-fg'
                    : 'fill-accent-solid',
            ]}
            stroke-width="2"
            onfocus={() => (activeIndex = i)}
            onblur={() => (activeIndex = null)}
            onmouseenter={() => (activeIndex = i)}
            onmouseleave={() => (activeIndex = null)}
            onkeydown={(event) => onPointKey(event, i)}
          />
        {/each}
      </g>

      <!-- The y axis is labelled ONCE with the unit marker, so no tick is a bare clinical number. -->
      <text
        aria-hidden="true"
        transform="translate(15,{PAD_T + PLOT_H / 2}) rotate(-90)"
        text-anchor="middle"
        class="fill-fg-muted text-[18px]"
      >
        Risk score · {unitLabel}
      </text>
    </svg>

    {#if active !== null}
      <!-- Identical content on pointer, keyboard focus and touch tap. Rendered with text
           interpolation, never `{@html}`. It is never the only place a value exists — every value
           here is also in the data table below. -->
      <div
        class="pointer-events-none absolute top-2 right-2 max-w-80 rounded-md border border-border bg-surface-raised p-2 text-sm text-fg shadow-popover"
      >
        <p class="font-semibold">{active.sourceLabel}</p>
        <p class="tabular-nums">
          <span class="whitespace-nowrap"
            >{active.valueText}&nbsp;<span class="text-fg-muted">{unitLabel}</span></span
          >
        </p>
        <p class="text-fg-secondary">
          <time datetime={active.iso}>{active.absTime}</time>
          <span class="text-fg-muted">({active.relTime})</span>
        </p>
      </div>
    {/if}
  </div>

  <!-- FOOTER CAPTION, 2026-08-23 ("Footer caption below the chart noting the data source state and
       that time labels follow the viewer's device clock"). `isLive` is a prop, not a re-read of
       `$lib/data/source` from inside this leaf component. -->
  <p class="text-sm text-fg-muted">
    {isLive ? 'Live data source.' : 'Simulated data for wireframe review.'} Time labels follow the viewer's
    device clock.
  </p>

  <div>
    <button
      type="button"
      aria-expanded={tableOpen}
      aria-controls="{uid}-table"
      onclick={() => (tableOpen = !tableOpen)}
      class="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-semibold text-fg hover:bg-surface-hover focus-visible:pm-focus"
    >
      {tableOpen ? 'Hide data table' : 'Show data table'}
    </button>

    <!-- `hidden`, not merely offscreen. It carries EVERY reading in the window with absolute
         timestamps — including the ones with no score, which are not on the line. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- A scrollable container must be a tab stop, or its overflowing content is unreachable without
         a mouse (WCAG 2.1.1); `role="region"` + `aria-label` is what gives that stop a name. -->
    <div
      id="{uid}-table"
      hidden={!tableOpen}
      tabindex={tableOpen ? 0 : -1}
      role="region"
      aria-label="Risk history readings, scrollable"
      class="mt-3 overflow-x-auto"
    >
      <table class="w-full border-collapse text-sm">
        <caption class="pb-2 text-left text-sm text-fg-secondary">
          Every reading in the 24-hour window. Readings with no risk score are listed and are not
          plotted.
        </caption>
        <thead>
          <tr class="border-b border-border text-left">
            <th scope="col" class="py-1.5 pe-3 font-semibold">Charted</th>
            <th scope="col" class="py-1.5 pe-3 font-semibold">Risk score</th>
            <th scope="col" class="py-1.5 pe-3 font-semibold">Risk level</th>
            <th scope="col" class="py-1.5 font-semibold">Data sufficiency</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.key)}
            <tr class="border-b border-border-subtle">
              <th scope="row" class="py-1.5 pe-3 font-normal whitespace-nowrap">
                <time datetime={row.iso} class="tabular-nums">{row.absTime}</time>
                {#if row.relTime !== ''}<span class="text-fg-muted">({row.relTime})</span>{/if}
              </th>
              <td class="py-1.5 pe-3 whitespace-nowrap tabular-nums">
                {#if row.valueText !== null}
                  {row.valueText}&nbsp;<span class="text-fg-muted">{unitLabel}</span>
                {:else}
                  <!-- S-35, in the data table too. Never a `0`, never a blank, never an em dash. -->
                  <span class="text-insufficient-fg">score unavailable</span>
                {/if}
              </td>
              <td class="py-1.5 pe-3">{row.levelLabel}</td>
              <td class="py-1.5">
                {#if row.sufficiencyLabel === ''}
                  Sufficient
                {:else}
                  <span class="text-insufficient-fg">{row.sufficiencyLabel}</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
