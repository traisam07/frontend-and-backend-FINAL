<!-- src/lib/components/AppHeader.svelte
     OV-1, and the same header on all three screens: read-only status, live clock/date, session
     information (`docs/spec/screens.md` section 3.2).

     THE WALL CLOCK IS THE ONE ELEMENT ALLOWED TO TICK ON ITS OWN, and it displays nothing clinical
     (anti-requirement 3). It is a separate, clearly-labelled element and is kept visually apart from
     every data timestamp — an adjacent wall clock and reading time imply a shared source, and a
     clinician who reads the wall clock as the assessment time is reading a fresh number off stale
     data.

     ONE ROW. Identity, its two actions and the session marker used to be a second row; they are one
     subject, so they are now one avatar control (`AccountMenu`), which keeps the role badge visible
     from `md` and folds the rest behind it below that. The header is not rendered at all on
     `/login` — see `+layout.svelte`.

     WHEN NOBODY IS SIGNED IN, THE SESSION MARKER AND THE READ-ONLY PILL ARE NOT RENDERED.
     A session marker states who is at this terminal, and before a sign-in there is no answer to
     state — the previous unknown treatment (`data-clarify="G-23"`) described a handoff gap that a
     real session mechanism has now closed for this half of the question. Nothing clinical is lost
     with it: the read-only posture is stated in full by the S-32 disclaimer region, which renders on
     every clinical screen and is the item U-18's no-hiding list actually names. The header pill was
     a second, shorter copy of it.

     NO THEME SWITCH IN THE TOOLBAR. Appearance lives in the account menu's Display section beside
     text size and weight — one place for "how this screen is set" rather than the same setting in
     two shapes. `ThemeSwitch` still exists and is still declared: `/login` renders no header and
     renders it itself, which is also how a signed-out clinician sets the theme at all.

     THERE IS NO DENSITY CONTROL. The three-way light/dark/system select was
     two interactions to do one thing, and density (`comfortable` / `compact` / `wall`) was a harness
     invention with no stylesheet behind it — no rule in `app.css` ever keyed on `data-density`, so
     it changed nothing on screen. Removing a control that does nothing is not a feature loss. The
     system preference is still honoured: it seeds the switch on a first visit and only an explicit
     choice is stored (**D-03**).

     RESPONSIVE RULE. Nothing collapses into a disclosure at any width any more, because the only
     preference left is a single 44px button that fits at 320px. -->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto, invalidate } from '$app/navigation';
  import { logout, type SessionState } from '$lib/auth/client';
  import { getAppClock } from '$lib/state/context';
  import AccountMenu from './AccountMenu.svelte';
  import Logo from './Logo.svelte';
  import { DISPLAY_ZONE_LABEL } from '$lib/domain/format';
  import { publishHeight } from '$lib/actions/measure';

  let {
    session,
    authRequired = false,
  }: {
    /** The ROOT LOAD's session, never a copy this component fetched for itself. */
    session: SessionState;
    authRequired?: boolean;
  } = $props();

  const clock = getAppClock();

  let signingOut = $state(false);

  /**
   * Sign out, then make the app forget. The order matters: clearing the cookie without invalidating
   * would leave the header still showing a name for a session the service has already dropped, and
   * invalidating first would re-read a session that is still valid.
   *
   * When the gate is off there is nowhere to send anyone, so the app stays where it is and simply
   * stops claiming to know who is there.
   */
  async function signOut() {
    if (signingOut) return;
    signingOut = true;
    await logout();
    await invalidate('pulsemind:session');
    signingOut = false;
    if (authRequired) await goto(resolve('/login'));
  }

  const clockTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const clockDateLong = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const clockDateShort = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  });

  const signedIn = $derived(session.authenticated && session.user !== null);
</script>

<!-- It publishes its own height, so the board's sticky search bar sits flush against it at every
     width instead of trusting a hard-coded offset that was measured when this header had two rows
     (`$lib/actions/measure`). -->
<header
  use:publishHeight={'--pm-header-h'}
  class="sticky top-0 z-(--z-header) border-b border-border bg-surface/95 backdrop-blur-md"
  aria-label="PulseMind"
>
  <div class="mx-auto flex max-w-[120rem] flex-col px-3 py-2 md:px-6 md:py-2.5 lg:px-8">
    <!-- WRAPS rather than overflows. At 320px with the largest text setting the logo, the clock,
         the theme switch and the account control do not fit on one line, and every one of them is a
         statement about what the screen IS — none may be dropped (U-18). Wrapping keeps them all and
         costs a second row only at the tier and text size that need it. The sticky bar below follows
         automatically, because it is pinned to the header's MEASURED height. -->
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 md:gap-x-5">
      <a
        href={resolve('/patients')}
        aria-label="PulseMind — go to Patient Overview"
        class="flex shrink-0 items-center gap-2 rounded-sm no-underline focus-visible:pm-focus"
      >
        <!-- The brand wordmark, swapped by theme in CSS (`$lib/components/Logo.svelte`). The
             accessible name lives on this LINK, not on the images, so the product name is announced
             once however many files are in the DOM.

             Until the artwork is on disk the component renders its own type fallback — the glyph
             plus the word `PulseMind`, hidden below `sm` — which is what shipped before and is why
             the header cannot break while the files are outstanding.

             It is branding, not a statement about the screen: at 320px, or at 390px with the largest
             text, this is the ~110px that forced the header onto a second row, and U-18's list of
             what may never be dropped — risk, review, badges, units, timestamps, provenance, the
             disclaimer — does not include a logotype. -->
        <Logo height={26} class="shrink-0" />
      </a>

      {#if signedIn}
        <p
          class="hidden rounded-pill border border-border-strong px-2.5 py-0.5 text-micro font-semibold tracking-[0.04em] text-fg-secondary uppercase lg:block"
        >
          Read-only · Decision support
        </p>
      {/if}

      <!-- THE WALL CLOCK. Labelled, and deliberately not adjacent to any data timestamp. -->
      <p class="ms-auto flex min-w-0 flex-col items-end leading-tight">
        <span
          class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase"
          aria-hidden="true"
        >
          Unit clock · {DISPLAY_ZONE_LABEL}
        </span>
        <span class="text-body font-semibold text-fg tabular-nums md:text-lg">
          <span class="sr-only">Unit clock, {DISPLAY_ZONE_LABEL} time:</span>
          {clockTime.format(clock.now)}
          <span class="hidden text-sm font-normal text-fg-secondary md:inline"
            >{clockDateLong.format(clock.now)}</span
          >
          <span class="text-sm font-normal text-fg-secondary md:hidden"
            >{clockDateShort.format(clock.now)}</span
          >
        </span>
      </p>

      <!-- WHO IS SIGNED IN, in ONE control instead of a second header row. That row held a session
           marker, a name, a role badge and two actions, and on a phone they fought over 320px for a
           single subject. `AccountMenu` keeps the role badge visible from `md` and folds the rest
           behind the avatar. Signed out there is nothing to fold: one link says it all. -->
      {#if signedIn && session.user}
        <AccountMenu user={session.user} onsignout={signOut} {signingOut} />
      {:else}
        <a
          href={resolve('/login')}
          class="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 font-semibold text-accent-fg no-underline hover:underline focus-visible:pm-focus"
        >
          Sign in
        </a>
      {/if}
    </div>
  </div>
</header>
