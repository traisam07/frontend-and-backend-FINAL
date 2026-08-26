<!-- src/routes/guide/+page.svelte
     HOW TO USE PULSEMIND — shown once on a clinician's first sign-in, and reachable from the account
     menu forever after.

     WHAT THIS PAGE MAY SAY, and the line is not a stylistic one. It describes THE INTERFACE and the
     safety posture: what the marks mean, what an action does and does not do, where a value comes
     from. It says nothing about what a score means clinically, what number is concerning, when to
     escalate, or what to do about a patient. Handoff section 8 puts clinical thresholds and model
     logic out of scope, and a "how to use it" page is the easiest place in an application to smuggle
     one in — a sentence like "a score above X needs attention" would be an invented threshold
     wearing the clothes of documentation (CLAUDE.md rule 16).

     Every claim here is checked against behaviour the app actually has, and `e2e/guide.spec.ts`
     re-checks the ones that could drift: the four mandated review/provenance words, and the fact
     that the page names no number.

     Harness-defined, pending design and clinical copy confirmation (**D-19**) — the handoff
     describes no onboarding, no help screen, and no first-run experience. -->
<script lang="ts">
  import { goto, invalidate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Button from '$lib/components/Button.svelte';
  import FormAlert from '$lib/components/FormAlert.svelte';
  import { acknowledgeGuide, type AuthFailure } from '$lib/auth/client';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let busy = $state(false);
  let failure = $state<AuthFailure | null>(null);

  /**
   * `$derived`, never a captured const: this component is reused across navigations, and after the
   * acknowledgement the layout's session reloads — a captured value would keep this screen in
   * first-run mode for the rest of the session (CLAUDE.md rule 3).
   */
  const firstRun = $derived(data.firstRun);

  async function acknowledge() {
    if (busy) return;
    busy = true;
    failure = null;

    const result = await acknowledgeGuide();
    busy = false;

    if (!result.ok) {
      failure = result.error;
      return;
    }
    // The root layout holds the session, and the first-run gate reads it. Refresh it before
    // navigating, or the gate sends the clinician straight back here.
    await invalidate('pulsemind:session');
    // `data.next` is ALREADY a validated, same-origin absolute path — `safeNext()` in `+page.ts`
    // rejects anything else. Resolving it again here would prepend a configured base path twice.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    await goto(data.next, { replaceState: true });
  }

  const SECTION = 'flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-5';
  const H2 = 'text-lg font-semibold text-fg';
  const TERM = 'font-semibold text-fg';
</script>

<svelte:head>
  <title>How to use PulseMind — PulseMind</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-[46rem] min-w-0 flex-col gap-5">
  {#if !firstRun}
    <Button href={resolve('/patients')} variant="quiet" class="w-fit px-0">
      ← Back to overview
    </Button>
  {/if}

  <div class="flex flex-col gap-2">
    <h1 class="text-xl font-semibold tracking-tight text-fg md:text-2xl" tabindex="-1">
      How to use PulseMind
    </h1>
    <p class="text-body text-fg-secondary">
      {#if firstRun}
        A short tour before you start. It takes a minute, and you can reopen it any time from your
        profile menu.
      {:else}
        Reopened from your profile menu. Nothing on this page changes what you are looking at.
      {/if}
    </p>
  </div>

  {#if failure}
    <FormAlert tone="error" title={failure.message}>Reference: {failure.code}</FormAlert>
  {/if}

  <!-- FIRST, and deliberately so: what the tool is NOT. -->
  <section class={SECTION} aria-labelledby="pm-guide-what">
    <h2 id="pm-guide-what" class={H2}>What PulseMind is</h2>
    <p>
      It shows a respiratory-risk assessment for the adult ventilated patients on your unit, so you
      can decide who to look at first. It is <span class={TERM}>read-only</span>: nothing you do
      here is written to the patient record, no order is placed, and no clinician is notified.
    </p>
    <p>
      It supports your review. It does not make decisions, and it does not replace looking at the
      patient.
    </p>
  </section>

  <section class={SECTION} aria-labelledby="pm-guide-screens">
    <h2 id="pm-guide-screens" class={H2}>The three screens</h2>
    <ol class="flex list-decimal flex-col gap-2 ps-5">
      <li>
        <span class={TERM}>Patient overview</span> — the whole unit, ranked. Selecting a card shows
        a summary panel beside the board;
        <span class={TERM}>Open patient detail</span> is what actually opens the patient. Selecting and
        opening are two separate actions on purpose.
      </li>
      <li>
        <span class={TERM}>Patient detail</span> — one patient: the current score and its risk level,
        what is driving it, the ventilator parameters from the latest reading, and the review panel.
      </li>
      <li>
        <span class={TERM}>Parameter detail</span> — one parameter over the recent window, and where each
        value came from.
      </li>
    </ol>
    <p class="text-sm text-fg-secondary">
      Every screen keeps its state in the address bar, so refreshing, going back, or sharing a link
      brings back exactly the view you were looking at.
    </p>
  </section>

  <section class={SECTION} aria-labelledby="pm-guide-order">
    <h2 id="pm-guide-order" class={H2}>How the board is ordered</h2>
    <p>
      Patients needing review come first, then by risk level, then by risk score. The board is
      grouped by those review blocks with a count on each, so you can see the shape of the unit
      without counting cards.
    </p>
    <p>
      The risk-level row above the search box counts every loaded patient by band. Selecting a band
      filters the board; selecting it again clears it. Those counts always describe the whole loaded
      unit, never the filtered view — so they do not move under you while you narrow things down.
    </p>
  </section>

  <section class={SECTION} aria-labelledby="pm-guide-marks">
    <h2 id="pm-guide-marks" class={H2}>Reading the marks</h2>
    <p>
      Colour is never the only signal. Every state also carries a word and a shape, so the screen
      stays readable in greyscale, on a dimmed display, and in print.
    </p>
    <ul class="flex flex-col gap-2">
      <li>
        <span class={TERM}>Risk level</span> — always written out (<span class="font-mono text-sm"
          >Critical</span
        >, <span class="font-mono text-sm">High</span>,
        <span class="font-mono text-sm">Medium</span>, <span class="font-mono text-sm">Low</span>),
        never abbreviated, with the fill getting heavier as the level rises.
      </li>
      <li>
        <span class={TERM}>Review status</span> —
        <span class="font-mono text-sm">Pending review</span>
        or <span class="font-mono text-sm">Reviewed</span>, marked by a coloured rule down the left
        of the chip.
      </li>
      <li>
        <span class={TERM}>Where a value came from</span> —
        <span class="font-mono text-sm">Measured</span> (read from the device at that time),
        <span class="font-mono text-sm">Carried forward</span> (an earlier value reused, with the
        time it was actually measured), or
        <span class="font-mono text-sm">Not measured on this patient</span> (a population reference).
        The border tells them apart. Carried-forward and reference values are shown at full contrast,
        never greyed out — they are real inputs to the assessment.
      </li>
      <li>
        <span class={TERM}>Data-limited</span> — a hatched badge. It means the latest reading did not
        have enough data behind it, so the score is not reliable and the explanation is withheld rather
        than guessed.
      </li>
    </ul>
  </section>

  <section class={SECTION} aria-labelledby="pm-guide-review">
    <h2 id="pm-guide-review" class={H2}>Marking a patient reviewed</h2>
    <p>
      <span class={TERM}>Mark as reviewed</span> changes the review state on this screen and nothing else.
      The risk score, the risk level and every ventilator value are exactly what they were before.
    </p>
    <p>
      It is a local mark. It is not saved to the patient record and no one else sees it — the screen
      says so beside the timestamp it shows.
    </p>
  </section>

  <section class={SECTION} aria-labelledby="pm-guide-trust">
    <h2 id="pm-guide-trust" class={H2}>When something is missing</h2>
    <p>
      Where a value is absent or the assessment could not supply one, this app says so in words. It
      does not fill the gap with a zero, a dash, or a default — a missing risk level reads
      <span class="font-mono text-sm">Risk level unavailable</span>, not
      <span class="font-mono text-sm">Low</span>.
    </p>
    <p>
      <!-- REWRITTEN 2026-08-17. The old wording described the `unspecified — see open question`
           notes that used to appear on screen; those are gone, so describing them would send a
           reader looking for something that is not there. Its last clause — "with no unit invented
           for them" — had also been FALSE since units were supplied (D-23), and a false reassurance
           is worse than process text: it tells a clinician the label beside the number came from the
           data when this interface chose it. -->
      Where a value is missing, the screen says so in words —
      <span class={TERM}>Risk level unavailable</span>,
      <span class={TERM}>score unavailable</span>, <span class={TERM}>unit not supplied</span> — and never
      fills the gap with a zero, a dash, or a blank. Numbers are printed exactly as received and are never
      rounded or rescaled. Where a unit appears beside a value, this interface chose it from the parameter's
      name; the assessment data does not send units.
    </p>
    <p>
      Values change only when new assessment data arrives. Nothing on these screens animates, counts
      up, or drifts on a timer.
    </p>
  </section>

  <section class={SECTION} aria-labelledby="pm-guide-display">
    <h2 id="pm-guide-display" class={H2}>Making it easier to read</h2>
    <p>
      Your profile menu — the round button at the top right — holds
      <span class={TERM}>Display</span>: light or dark, text size, and text weight. The settings
      stay on this workstation, and text size never goes below the default.
    </p>
    <p>
      The same menu has <span class={TERM}>Account &amp; security</span> for your passkey and
      authenticator app, and this guide under
      <span class={TERM}>How to use PulseMind</span>.
    </p>
  </section>

  {#if firstRun}
    <!-- The first-run exit. It is a real acknowledgement recorded against the ACCOUNT, so the next
         clinician to use this workstation still gets the tour and this one does not get it twice on
         another terminal. -->
    <div class="flex flex-col gap-3 rounded-lg border border-accent-border bg-accent-bg p-4">
      <p class="font-semibold text-accent-fg">Ready to start?</p>
      <p class="text-sm text-fg-secondary">
        You can reopen this from your profile menu whenever you need it.
      </p>
      <Button variant="primary" class="w-fit" onclick={acknowledge} disabled={busy} {busy}>
        {busy ? 'Saving…' : 'I have read this — go to the unit'}
      </Button>
    </div>
  {:else}
    <Button variant="primary" href={resolve('/patients')} class="w-fit">Back to overview</Button>
  {/if}
</div>
