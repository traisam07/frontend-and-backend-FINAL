<!-- src/routes/patients/[patientId]/parameters/[parameterSlug]/+page.svelte
     Parameter Detail — PM-1 … PM-9 (`docs/spec/screens.md` section 5).

     `data.parameter` and `data.chartTime` come from the slug gate; `data.snapshot` is merged in from
     `[patientId]/+layout.ts`, so no second fetch happens when a chip is clicked. -->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';
  import {
    UNIT_NOT_SUPPLIED,
    latestReading,
    provenanceCounts,
    toProvenancePoints,
  } from '$lib/domain/derive';
  import { windowOf } from '$lib/domain/window';
  import { assumedUnitFor, chartRangeFor, UNIT_ASSUMED_NOTE } from '$lib/domain/units';
  import { getAppClock } from '$lib/state/context';
  import { isLiveSource } from '$lib/data/source';
  import { PROVENANCE_MARK } from '$lib/design/provenance-classes';
  import AbsoluteTime from '$lib/components/AbsoluteTime.svelte';
  import Disclaimer from '$lib/components/Disclaimer.svelte';
  import ParameterChips from '$lib/components/ParameterChips.svelte';
  import ProvenanceBadge from '$lib/components/ProvenanceBadge.svelte';
  import ProvenanceChart from '$lib/components/ProvenanceChart.svelte';
  import SourceBanner from '$lib/components/SourceBanner.svelte';
  import UnknownInline from '$lib/components/UnknownInline.svelte';

  let { data }: PageProps = $props();

  const clock = getAppClock();
  const uid = $props.id();
  const PLOT = { width: 640, height: 180 };

  // `$derived` throughout: this page component is reused as the clinician switches chips, so a plain
  // const would keep rendering the previous parameter's value under the new parameter's name.
  const snapshot = $derived(data.snapshot);
  const parameter = $derived(data.parameter);
  // `$derived`, never a plain const: this component is REUSED when the clinician switches chips, so
  // a const would leave the previous parameter's unit beside the new parameter's value — the exact
  // identity/value mismatch CLAUDE.md rule 3 exists to prevent, and it would be a WRONG UNIT.
  const assumedUnit = $derived(assumedUnitFor(parameter.name));
  const chartTime = $derived(data.chartTime);

  /**
   * The chip list is the SAME latest-reading parameter set as PD-10, in the order delivered (F-9).
   * `latestReading` cannot be `null` here — the slug gate in `+page.ts` already errored with
   * `NO_CURRENT_READING` if it were — but the `?? []` keeps the branch expressible rather than
   * asserting it away with a `!`, which the harness bans on a clinical path.
   */
  const parameters = $derived(latestReading(snapshot.readings)?.parameters ?? []);

  const window60 = $derived(windowOf(snapshot.readings));
  /** `null` when `CHART_RANGE` (**G-55**) does not know this quantity — `toProvenancePoints` then
   *  falls back to the window's own min/max, same as before the override. */
  const chartRange = $derived(chartRangeFor(parameter.name));
  const points = $derived(
    toProvenancePoints(window60, parameter.name, PLOT, clock.now, chartRange ?? undefined),
  );
  const counts = $derived(provenanceCounts(window60, parameter.name));
  const liveSource = isLiveSource();

  /** The marks that can actually be plotted. A reading without this parameter is an F-11 gap. */
  const charted = $derived(points.filter((p) => p.present && p.y !== null));

  /** `q` / `filter` are carried through so the chain back to the board still restores it. */
  const backHref = $derived.by(() => {
    const params = new URLSearchParams();
    const q = page.url.searchParams.get('q');
    const filter = page.url.searchParams.get('filter');
    if (q !== null && q !== '') params.set('q', q);
    if (filter !== null && filter !== '') params.set('filter', filter);
    // Name the parameter being returned FROM, so Patient Detail can mark that row
    // `aria-current="page"` (clinical-a11y section 2.2).
    params.set('from', parameter.slug);
    const search = params.toString();
    return (
      resolve('/patients/[patientId]', { patientId: snapshot.patientId }) +
      (search === '' ? '' : `?${search}`)
    );
  });

  const CARD =
    'flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-card md:p-4';
  const LABEL = 'text-micro font-semibold uppercase tracking-[0.04em] text-fg-muted';
</script>

<svelte:head>
  <title>{parameter.name} — Patient {snapshot.patientId} — PulseMind</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-[120rem] min-w-0 flex-col gap-4 md:gap-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- PM-1 -->
    <nav aria-label="Back">
      <!-- `backHref` is built above with `resolve()` and then has its query appended. -->
      <a
        href={backHref}
        class="inline-flex min-h-11 items-center gap-2 rounded-md px-1 font-semibold text-accent-fg no-underline hover:underline focus-visible:pm-focus"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12.5 8h-9M7.2 4.2 3.4 8l3.8 3.8" />
        </svg>
        Back to patient
      </a>
    </nav>
    <SourceBanner />
  </div>

  <!-- PM-2 -->
  <header>
    <h1 class="text-xl font-semibold tracking-tight" tabindex="-1">{parameter.name}</h1>
    <p class="mt-1 text-sm text-fg-secondary">
      Patient <span class="font-mono">{snapshot.patientId}</span> · chart time
      <!-- `alwaysDate`: section 8.4 requires the date ALWAYS on Parameter Detail and in the drawer,
           not only when the instant is not today. A bare `14:12` on this screen is the misread the
           rule exists to prevent. -->
      <AbsoluteTime iso={chartTime.toISOString()} alwaysDate />
    </p>
  </header>

  <!-- PM-3 — the chips navigate; they are not tabs. Built from the SAME latest-reading parameter set
       as PD-10, in the order delivered. -->
  <ParameterChips patientId={snapshot.patientId} {parameters} />

  <div class="grid min-w-0 gap-4 md:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
    <!-- PM-5 -->
    <section aria-labelledby="{uid}-chart" class="{CARD} min-w-0 xl:order-1">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="{uid}-chart" class="text-lg font-semibold">Charting history and provenance</h2>
        <p class="text-sm text-fg-muted">Where each value came from. Not a trend classification.</p>
      </div>
      <!-- LEGEND, new 2026-08-23, top-right of the header ("Render three visually distinct markers
           and a legend row in the card header, top-right"). Uppercase monospace, spelling the raw
           `Provenance` union values (`measured`/`carried_forward`/`population_reference`) rather than
           `PROVENANCE_LABEL`'s clinical-prose strings ("Carried forward", "Not measured on this
           patient") — a legend key naming which wire values a shape/colour stands for is a different
           kind of text than the clinical statement `PROVENANCE_LABEL` owns for a badge or a tooltip,
           so this is not a second spelling of that literal, it is the field's own value, shown once,
           in the one place that explains the chart's shape/colour key. Swatches reuse
           `PROVENANCE_MARK` — the SAME classes the chart marks themselves use, never a copy. -->
      <ul
        class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 font-mono text-xs uppercase"
      >
        {#each ['measured', 'carried_forward', 'population_reference'] as const as source (source)}
          <li class="flex items-center gap-1.5">
            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
              {#if source === 'carried_forward'}
                <circle cx="5" cy="5" r="4" class={PROVENANCE_MARK[source]} stroke-width="1.5" />
              {:else}
                <circle cx="5" cy="5" r="5" class={PROVENANCE_MARK[source]} />
              {/if}
            </svg>
            {source}
          </li>
        {/each}
      </ul>
      {#if charted.length >= 2}
        <ProvenanceChart
          {points}
          parameterName={parameter.name}
          unitLabel={assumedUnit?.label ?? UNIT_NOT_SUPPLIED}
          range={chartRange}
          isLive={liveSource}
        />
      {:else}
        <!-- `docs/spec/screens.md` section 5.5: fewer than two points in the window renders an
             explicit insufficient-history state, and a single point is NEVER drawn as a flat line.
             The gate is on the CHARTED points — a reading that does not carry this parameter is a
             gap and plots nothing — and the literal is the one F-2 prescribes, not a second
             wording invented here. Rendering one mark would show a charted provenance history on a
             screen whose whole purpose is showing where a value came from over time. `bg-chart-plot-bg`,
             not `bg-surface-sunken`, 2026-08-23: this box stands in for the chart, so it takes the
             same lightened background `ProvenanceChart` now uses. -->
        <p
          class="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border bg-chart-plot-bg p-4 text-center text-body text-fg-secondary"
        >
          insufficient history for a 24-hour view
        </p>
      {/if}
    </section>

    <div class="flex min-w-0 flex-col gap-4 md:gap-5 xl:order-2">
      <!-- PM-4 -->
      <section aria-labelledby="{uid}-current" class={CARD}>
        <h2 id="{uid}-current" class="text-lg font-semibold">Current value</h2>

        <p class="text-value font-semibold tabular-nums">
          <!-- The unit sits INSIDE the same non-wrapping element as the value, at every point of
               display. There is still no `unit` field on the wire (**G-01**); what the interface
               prints is its own assertion (**D-23**), so it carries the marker and the dotted rule,
               and a quantity the table does not know keeps `unit not supplied` instead. -->
          <span class="whitespace-nowrap"
            >{parameter.value}&nbsp;{#if assumedUnit !== null}<span
                class="text-body font-normal text-fg-muted underline decoration-dotted underline-offset-2"
                data-clarify="G-01">{assumedUnit.label}</span
              >{:else}<span class="text-body font-normal text-fg-muted">{UNIT_NOT_SUPPLIED}</span
              >{/if}</span
          >
        </p>

        {#if assumedUnit !== null}
          <!-- The note is not optional decoration: PM-4 is the one screen showing a single value in
               isolation, so it is the surface where a provisional label is most likely to be read
               as measured. The BASIS is here too — this is the one place with room for it, and it
               is what a clinician needs in order to say "no, that is wrong" (**D-23**). -->
          <p class="text-sm text-fg-secondary">
            <!-- The `basis` text — "Observed 395–464. Millilitres, not mL/kg PBW…" — used to print
                 here. It was removed 2026-08-17: an observed RANGE beside this patient's own value,
                 on the one screen that shows a single number in isolation, reads as a reference
                 band, and rule 16 bans those outright. The evidence still exists for the audience
                 that acts on it — `$lib/domain/units.ts` and the D-23 register row, which lists all
                 ten ranges. -->
            {UNIT_ASSUMED_NOTE}
          </p>
        {/if}

        <dl class="flex flex-col gap-3">
          <div>
            <dt class={LABEL}>Current source</dt>
            <dd class="mt-1">
              <ProvenanceBadge source={parameter.source} lastMeasured={parameter.lastMeasured} />
            </dd>
          </div>

          <div>
            <dt class={LABEL}>Model use</dt>
            <dd class="mt-1 text-body">
              {#if parameter.modelUse === 'score_factor'}
                Current score factor
              {:else if parameter.modelUse === 'available'}
                Available
              {:else}
                <!-- S-29. Never defaults to `Available`: that would assert the model ignored this
                     parameter. -->
                <UnknownInline clarify="G-04" />
              {/if}
            </dd>
          </div>

          <div>
            <dt class={LABEL}>Unit</dt>
            <dd class="mt-1"><UnknownInline clarify="G-01" /></dd>
          </div>
        </dl>
      </section>

      <!-- PM-6 — provenance summary. COUNTS, never a reliability score or a percentage. -->
      <section aria-labelledby="{uid}-summary" class={CARD}>
        <h2 id="{uid}-summary" class="text-lg font-semibold">Provenance summary</h2>
        <p class="text-sm text-fg-secondary">
          Readings in the 24-hour window, counted by where this parameter's value came from.
        </p>
        <dl class="flex flex-col gap-2">
          <div
            class="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-1.5"
          >
            <dt class="text-body">Measured</dt>
            <dd class="text-body font-semibold tabular-nums">{counts.measured}</dd>
          </div>
          <div
            class="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-1.5"
          >
            <dt class="text-body">Carried forward</dt>
            <dd class="text-body font-semibold tabular-nums">{counts.carriedForward}</dd>
          </div>
          <div
            class="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-1.5"
          >
            <dt class="text-body">Not measured on this patient</dt>
            <dd class="text-body font-semibold tabular-nums">{counts.populationReference}</dd>
          </div>
          <div
            class="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-1.5"
          >
            <!-- Its OWN line. Folding unknowns into `measured`, or omitting them so the counts
                 silently fail to add up, both misstate the data. -->
            <dt class="text-body">Provenance unknown</dt>
            <dd class="text-body font-semibold tabular-nums">{counts.unknown}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4">
            <dt class="text-body">Not charted in the reading</dt>
            <dd class="text-body font-semibold tabular-nums">{counts.absent}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>

  <!-- PM-7 — shown when AND ONLY WHEN the current source is `population_reference`. -->
  {#if parameter.source === 'population_reference'}
    <section
      data-clarify="G-33"
      aria-labelledby="{uid}-population"
      class="flex flex-col gap-2 rounded-lg border border-prov-population-border bg-prov-population-bg pm-hatch-population p-4 text-prov-population-fg"
    >
      <h2 id="{uid}-population" class="text-lg font-semibold">Not measured on this patient</h2>
      <p class="text-body">
        This value is a population reference. It was not measured on this patient, so it carries no
        last-measured time and no age — an age would imply a measurement that never happened. It is
        the one number on this screen that is not about this individual.
      </p>
      <!-- "The wording of this warning is not yet approved copy: Unspecified — see open question
           G-33" stood here until 2026-08-17. Its subject was the copy-approval status of the
           paragraph above it. G-33 is still OPEN and the id now travels on the section. -->
    </section>
  {/if}

  <!-- PM-8 — parameter metadata. The schema supplies almost nothing here; what does not exist is
       marked unavailable rather than filled in. -->
  <section aria-labelledby="{uid}-metadata" class={CARD}>
    <h2 id="{uid}-metadata" class="text-lg font-semibold">Parameter metadata</h2>
    <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt class={LABEL}>Name</dt>
        <dd class="mt-1 text-body">{parameter.name}</dd>
      </div>
      <div>
        <dt class={LABEL}>URL slug</dt>
        <dd class="mt-1 font-mono text-body">{parameter.slug}</dd>
      </div>
      <div>
        <dt class={LABEL}>Description</dt>
        <!-- No `description` field exists on the wire (**G-02**). Omitted rather than invented. -->
        <dd class="mt-1"><UnknownInline clarify="G-02" /></dd>
      </div>
      <div>
        <dt class={LABEL}>Unit</dt>
        <dd class="mt-1"><UnknownInline clarify="G-01" /></dd>
      </div>
    </dl>
  </section>

  <!-- PM-9 -->
  <Disclaimer />
</div>
