<!-- src/routes/patients/[patientId]/+page.svelte
     CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 8.
     `.claude/skills/clinical-a11y/SKILL.md` section 4 shows the drawer half as a marked EXCERPT.

     THIS ROUTE COMPONENT CARRIES TWO MECHANISMS, and neither may be dropped when the other is
     edited:
       1. the per-patient `{#key}` isolation, and
       2. the `?drawer=context` wiring with its `inert` background.

     There is no `[patientId]/+page.ts`. `data.snapshot` arrives from `[patientId]/+layout.ts`:
     layout data merges into the page's `data`, so `PageProps` types it and no wrapper component is
     needed. -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';
  import { TriageBoard } from '$lib/state/triage.svelte';
  import { setTriageBoard, getReviewLog } from '$lib/state/context';
  import { observeWardInstants } from '$lib/state/ward-clock.svelte';
  import ContextDrawer from '$lib/components/ContextDrawer.svelte';
  import PatientContextBody from '$lib/components/PatientContextBody.svelte';
  import PatientDetailBody from '$lib/components/PatientDetailBody.svelte';
  import Disclaimer from '$lib/components/Disclaimer.svelte';
  import SourceBanner from '$lib/components/SourceBanner.svelte';
  import { isLiveSource } from '$lib/data/source';

  let { data }: PageProps = $props();

  // `$derived`, never a plain const: SvelteKit reuses page components across navigation, so a const
  // would render the previous patient's number beside this patient's identity.
  const patientId = $derived(page.params.patientId ?? '');
  // `snapshot` is the one key `[patientId]/+layout.ts` returns.
  const snapshot = $derived(data.snapshot);

  // PUBLISH THE WARD'S NEWEST INSTANT so the app clock can follow it. A `$effect` rather than a
  // `$derived` because the READER is the root layout and this is a route component far below it:
  // Svelte context reads downward only, so no derivation can see both ends. It writes one number,
  // no clinical value is computed from it, and it is idempotent.
  $effect(() => {
    observeWardInstants(snapshot.readings.map((r) => r.charttime));
  });

  /**
   * The board context, so `ReviewPanel` can hold the local `Mark as reviewed` set on this screen
   * too. It is seeded from this one patient's summary rather than the unit's, because the board load
   * did not run for this route — the local review set is per session and per patient id, so a mark
   * made here is the same mark the board would show.
   *
   * PHI, so it is created HERE and put in context — never a module singleton.
   */
  const board = new TriageBoard(() => [], getReviewLog());
  setTriageBoard(board);

  /**
   * Drawer open/closed is URL STATE, not component state: `?drawer=context` on
   * `/patients/[patientId]`, so it survives refresh, deep link and back/forward (S-24 / S-25).
   * Harness-defined, pending design confirmation (**D-13**).
   *
   * Holding it in a component variable is the defect this rule prevents: the drawer would close
   * silently on refresh, could not be deep-linked into, and `Back` would walk off the patient screen
   * while a modal overlay was on top of it.
   */
  const drawerParam = $derived(page.url.searchParams.get('drawer'));
  const drawerOpen = $derived(drawerParam === 'context');
  /** Any OTHER `drawer` value renders closed AND is surfaced — never silently ignored (U-20). */
  const drawerUnrecognised = $derived(drawerParam !== null && drawerParam !== 'context');

  /** `q` / `filter` are carried through so `Back to overview` restores the board (PD-1). */
  const backHref = $derived.by(() => {
    const params = new URLSearchParams();
    const q = page.url.searchParams.get('q');
    const filter = page.url.searchParams.get('filter');
    if (q !== null && q !== '') params.set('q', q);
    if (filter !== null && filter !== '') params.set('filter', filter);
    params.set('selected', patientId);
    return `${resolve('/patients')}?${params.toString()}`;
  });

  function setDrawer(open: boolean) {
    const url = new URL(page.url);
    if (open) url.searchParams.set('drawer', 'context');
    else url.searchParams.delete('drawer');
    // keepFocus: the drawer owns focus movement, so the navigation must not move it.
    // noScroll: never jump the page under the clinician.
    // `url` is a clone of `page.url`, so it ALREADY carries whatever base path is configured;
    // `resolve()` here would prepend it a second time. The rule cannot tell a same-page query
    // update from a new route.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(url, { keepFocus: true, noScroll: true });
  }
</script>

<svelte:head>
  <title>Patient {patientId} — Patient detail — PulseMind</title>
</svelte:head>

<!--
  {#key} makes it structurally impossible for one patient's drawer state, chart hover, or scroll
  position to bleed into another patient's screen. Harness-defined.
-->
{#key patientId}
  <!-- `inert`, not `aria-hidden`: aria-hidden alone leaves the background TABBABLE, so a clinician
       can Tab out of an open modal into the page underneath and read another patient's values
       through the scrim. -->
  <div inert={drawerOpen} class="flex min-w-0 flex-col gap-4 md:gap-5">
    <!-- CONDITIONAL ON `isLiveSource()`, added 2026-08-23, at the product owner's request ("phần
         padding/margin của dòng back to overview đang quá lớn"): `SourceBanner` already renders
         NOTHING when live — the whole point of its own root `{#if !live}`, per its file header
         ("An element that renders nothing must occupy nothing, or the layout keeps a gap that
         reads as a missing component") — but THIS wrapper div was unconditional, so when live it
         still sat in the flow as a collapsed, zero-height flex child. `gap-4`/`gap-5` on the
         parent column apply to EVERY child regardless of that child's own height, so a phantom
         gap the width of one full row landed above "Back to overview" with nothing in it. Gating
         the wrapper on the same read `SourceBanner` uses internally is what makes "renders
         nothing" also mean "reserves nothing" one level up. -->
    {#if !isLiveSource()}
      <div class="mx-auto flex w-full max-w-[120rem] min-w-0 justify-end">
        <SourceBanner />
      </div>
    {/if}

    {#if drawerUnrecognised}
      <p
        role="status"
        class="mx-auto w-full max-w-[120rem] rounded-md border border-insufficient-border bg-insufficient-bg px-3 py-2 text-sm text-insufficient-fg"
      >
        Unrecognised drawer parameter — the patient context drawer is closed
      </p>
    {/if}

    <PatientDetailBody {snapshot} {backHref} onopencontext={() => setDrawer(true)} />

    <!-- PD-12 — the disclaimer, last element in <main>, on all three screens. -->
    <div class="mx-auto w-full max-w-[120rem] min-w-0">
      <Disclaimer />
    </div>
  </div>

  <!-- PD-11 -->
  <ContextDrawer open={drawerOpen} title="Patient context" onclose={() => setDrawer(false)}>
    <PatientContextBody {snapshot} />
  </ContextDrawer>
{/key}
