<!-- src/routes/+layout.svelte
     CANONICAL DECLARATION — `.claude/skills/bootstrap/SKILL.md` section 3, plus the two live regions
     and the `setAnnouncer()` call excerpted in `.claude/skills/clinical-a11y/SKILL.md` section 6.
     Assembled here, in one file. -->
<script lang="ts">
  import '../app.css';
  import { onMount, tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { setAnnouncer } from '$lib/a11y/announcer.svelte';
  import { setAppClock } from '$lib/state/context';
  import { hydratePrefs } from '$lib/state/prefs.svelte';
  import PulseLoader from '$lib/components/PulseLoader.svelte';
  import { delayGate } from '$lib/state/pending.svelte';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  // The two live regions are per session and hold text that can contain a patient id — PHI (G-29) —
  // so the announcer is created HERE and held in context, never in module scope.
  const announcer = setAnnouncer();

  /** Routes that render their own frame. Today that is the sign-in screen and only it. */
  const chromeless = $derived(page.url.pathname.startsWith('/login'));

  /**
   * THE ONE APP CLOCK, and the only timer that touches anything on screen.
   *
   * What it is allowed to drive: the header's labelled wall clock, and the relative-age supplement
   * beside a FIXED timestamp. Both are anti-requirement 3's explicit carve-outs.
   *
   * What it must never drive: any clinical value. There is no `setInterval` that mutates a score, no
   * scripted escalation, no animated counter. A clinical value changes only when new application
   * data arrives (Handoff section 1).
   *
   * 10 s, because `.claude/skills/clinical-a11y/SKILL.md` section 8.4 requires the relative age to
   * actually tick at least every 30 s — a frozen "2 min ago" is worse than none — and because the
   * wall clock has to stay accurate to the displayed minute.
   */
  let now = $state(new Date());
  setAppClock({
    get now() {
      return now;
    },
  });

  /**
   * STATE U-01 / U-02 — the navigation loading treatment.
   *
   * Delay-gated at 250 ms so a fast navigation does not flash it: a skeleton that appears for two
   * frames reads as instability on a triage board. Above the threshold it appears and STAYS until
   * the navigation settles, so it never flickers off and on.
   *
   * It is a TEXT treatment, never a zeroed screen. U-01 forbids rendering "zeros, dashes, empty
   * cards, or a rendered board a clinician could read as 'no patients at risk'", and it must not
   * look like the empty state. The threshold is harness-defined (**G-30**, **D-11**, **P-05**).
   */
  const gate = delayGate();
  $effect(() => {
    if (navigating.to !== null) gate.start();
    else gate.stop();
  });

  /**
   * SC 2.4.11 / clinical-a11y section 2.2: on route change, move focus to the new page's `<h1>` and
   * announce the page politely. Never leave focus on `<body>` — a keyboard user would otherwise
   * restart from the top of the document on every navigation, and a screen-reader user would be told
   * nothing at all about where they had arrived.
   *
   * The drawer is the one exception, and it excludes itself: it navigates with `keepFocus: true`
   * because it owns focus movement, and `afterNavigate` respects that by skipping same-page
   * navigations.
   */
  afterNavigate(async (nav) => {
    // Read both sides defensively. `from` is `null` on the initial enter, and `to` is `null` on an
    // external navigation — and `NavigationTarget.url` is itself nullable for a target SvelteKit
    // could not resolve to a route. A bare `nav.from?.url.pathname` throws on that last case, which
    // is what put `Cannot read properties of null (reading 'pathname')` in the console on first load.
    const fromPath = nav.from?.url?.pathname ?? null;
    const toPath = nav.to?.url?.pathname ?? null;
    // A query-only change is the drawer, the filter, or a selection. Those own their own focus.
    if (fromPath !== null && fromPath === toPath) return;
    await tick();
    const heading = document.querySelector<HTMLElement>('main h1');
    heading?.focus();
    if (heading?.textContent) announcer.say(`${heading.textContent.trim()}.`);
  });

  onMount(() => {
    hydratePrefs();
    // Remove the pre-hydration boot treatment in `app.html`. Until this runs, that markup IS the
    // U-01 initial-loading state: with `ssr = false` the served document has no application markup
    // at all, and an empty page is exactly the "looks like nothing is wrong" outcome U-01 exists to
    // prevent.
    document.getElementById('pm-boot')?.remove();

    const timer = setInterval(() => {
      now = new Date();
    }, 10_000);
    return () => clearInterval(timer);
  });
</script>

<!-- SC 2.4.1. First focusable element on every page, visible on focus. -->
<!-- A same-document fragment, not a navigation: there is no route to resolve. -->
<a
  href="#pm-main"
  class="sr-only rounded-sm bg-accent-solid px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-(--z-tooltip)"
>
  Skip to main content
</a>

<div class="flex min-h-dvh flex-col bg-canvas text-fg">
  <!-- NO HEADER ON THE SIGN-IN SCREEN.
       Every part of that toolbar is about a clinical session: the unit clock, the read-only posture,
       who is signed in, where to go next. Before anyone has signed in there is no session to frame,
       so it was chrome around an empty room — and the one control it carried that still applies, the
       theme switch, the sign-in page renders itself.

       `$derived`, never a plain const: this layout persists across navigation, so a captured value
       would leave the header hidden on the board after signing in (CLAUDE.md rule 3). -->
  {#if !chromeless}
    <!-- The header shows WHO is signed in and how to leave. `data.session` is the root load's, so
         the identity in the header and the identity the gate checked are the same object — a header
         reading its own copy is how a signed-out app ends up still displaying a name. -->
    <AppHeader session={data.session} authRequired={data.authRequired} />
  {/if}

  {#if gate.visible}
    <!-- STATE U-01 / U-02. Unmistakably "not data yet": a moving indicator PLUS text saying what is
         being fetched. It never replaces what is already on screen — the page underneath stays fully
         visible and at full opacity, because dimming stale clinical data is banned (U-03). -->
    <p
      role="status"
      class="flex items-center gap-2 border-b border-border bg-surface-sunken px-4 py-2 text-sm text-fg-secondary lg:px-8"
    >
      <!-- The supplied loading mark, not a borrowed rotating circle (**D-31**). Its colours are in
           the artwork, so this cannot wear `fg-secondary` the way a drawn mark could — it is red on
           a screen that also carries risk bands, which is the collision **D-20** is about. It is
           kept small, it sits in the neutral bar ABOVE the board rather than among the cards, and
           the sentence beside it says what it means. Clinical confirmation is D-31's open half. -->
      <PulseLoader size={24} />
      <!-- SCREEN-READER ONLY since 2026-08-19 (**D-31**). The words were visible; the product owner
           asked for the mark alone. They are kept for assistive technology because this is a
           `role="status"` region and one with no text content announces nothing at all — a blind
           clinician would get silence where a sighted one gets a moving mark (SC 4.1.3). -->
      <span class="sr-only">Loading — no assessment is being displayed yet.</span>
    </p>
  {/if}

  <main id="pm-main" class="flex-1 px-4 py-6 lg:px-8" tabindex="-1">
    {@render children()}
  </main>
</div>

<!--
  TWO REGIONS, both present in the DOM from first paint, both `aria-atomic`. A live region created at
  announcement time is not announced by several screen readers.

  Polite carries routine, expected, and user-initiated changes, debounced and coalesced. Assertive is
  reserved for a patient NEWLY entering Critical and for a connection failure, and it has exactly one
  call-site in the codebase (`Announcer.alertCritical`) so the policy cannot erode.

  Neither is `aria-live` on the board container, a `<tbody>`, or a chart.
-->
<p class="sr-only" role="status" aria-atomic="true">{announcer.polite}</p>
<p class="sr-only" role="alert" aria-atomic="true">{announcer.assertive}</p>
