<!-- src/lib/components/AccountMenu.svelte
     CANONICAL DECLARATION — this file.

     WHO IS SIGNED IN, WHAT THEY CAN DO ABOUT IT, HOW THE SCREEN IS SET, AND HOW ANY OF IT WORKS —
     behind one avatar.

     On a phone the header's second row was a session marker, a name, a role badge, an
     `Account & security` link and a `Sign out` button, all competing for 320px. They are one
     subject, so they collapse into one control. The trigger is an AVATAR rather than a hamburger,
     because a hamburger says "more of this page" and this is not about the page — it is about the
     person at the terminal.

     THE AVATAR IS THE WHOLE CONTROL. There is no inline `Session — name — role` beside it: the
     header is one row of chrome and the identity was repeating, at `md` and up, what the panel says
     anyway. Nothing is lost to assistive technology — the button's accessible name is
     `Account menu — <name>, <role>`, so a screen reader still announces both without opening it —
     and the panel states them in full under `Signed in as`.

     ONE THING TO WATCH: a `read_only` clinician now learns their role by opening the menu rather
     than by glancing at the header. That is acceptable TODAY because nothing is denied on the
     strength of a role yet (**G-46** is open, and `Mark as reviewed` is not gated). If a role ever
     starts refusing an action, the refusal must say so at the point of the action — not rely on a
     badge somewhere else, which is what a badge in the header was always a weak substitute for.

     A DISCLOSURE, NOT `role="menu"`. The menu role brings an arrow-key contract with it — roving
     focus, Home/End, type-ahead — and a component that claims the role without implementing it is
     worse for a screen-reader user than an honest button-plus-region, because the promised keys do
     nothing. This is a button with `aria-expanded` over a region of ordinary links and buttons: Tab
     moves through them, Escape closes and returns focus, a click outside closes it.

     NO AVATAR IMAGE. The data contract carries no photo and none is invented — the initials are
     derived from the display name the service already returns. An `<img>` here would need a source
     that does not exist.

     Harness-defined, pending design confirmation (**D-16**). -->
<script lang="ts">
  import { resolve } from '$app/paths';
  import type { SessionUser } from '$lib/auth/client';
  import { prefs, setTheme, type Theme } from '$lib/state/prefs.svelte';
  import SettingChoice from './SettingChoice.svelte';

  let {
    user,
    onsignout,
    signingOut = false,
  }: {
    user: SessionUser;
    onsignout: () => void;
    signingOut?: boolean;
  } = $props();

  const uid = $props.id();
  const panelId = `${uid}-panel`;

  let open = $state(false);
  let trigger = $state<HTMLButtonElement | null>(null);
  let panel = $state<HTMLDivElement | null>(null);

  /**
   * DISPLAY SETTINGS live in this panel because they belong to the person, not to the screen, and it
   * is the same menu they already open to find their own account. The header keeps the one-click
   * theme switch as a shortcut. Both call `setTheme` and both read `prefs.theme`, so they cannot
   * disagree.
   *
   * `system` is deliberately NOT an option here. It is the default until someone chooses, and a
   * three-way control made choosing dark two interactions instead of one (**D-03**).
   */
  const THEMES = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ] as const satisfies ReadonlyArray<{ value: Exclude<Theme, 'system'>; label: string }>;

  /** `system` resolves to whichever the OS is showing, so the control reflects what is on screen. */
  const resolvedTheme = $derived<Exclude<Theme, 'system'>>(
    prefs.theme === 'system'
      ? typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : prefs.theme,
  );

  const label = $derived(user.displayName ?? user.username);
  const roleLabel = $derived(user.role === 'clinician' ? 'Clinician' : 'Read-only account');

  /**
   * Initials from the display name, with a leading title dropped so `Dr A. Clinician` reads `AC`
   * rather than `DA`. Falls back to the username, which always exists — an avatar that renders
   * blank because a display name was null is a worse answer than two letters.
   */
  const initials = $derived.by(() => {
    const TITLES = new Set(['dr', 'dr.', 'prof', 'prof.', 'mr', 'mrs', 'ms', 'sr', 'nurse']);
    const words = label
      .split(/\s+/)
      .filter((word) => word.length > 0 && !TITLES.has(word.toLowerCase()));
    const source = words.length > 0 ? words : [user.username];
    const first = source[0] ?? '';
    const last = source[source.length - 1] ?? '';
    const letters = source.length > 1 ? `${first.charAt(0)}${last.charAt(0)}` : first.slice(0, 2);
    return letters.toUpperCase();
  });

  function close(returnFocus: boolean) {
    if (!open) return;
    open = false;
    if (returnFocus) trigger?.focus();
  }

  /**
   * Closing on an outside click and on Escape. An `$effect` is correct here and is not a
   * "derive-don't-sync" violation: the source is a document-level event, which no `$derived` can
   * compute, and the listeners exist only while the panel is open.
   */
  $effect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (panel?.contains(target) || trigger?.contains(target))) return;
      close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  });
</script>

<div class="relative flex items-center gap-2">
  <button
    bind:this={trigger}
    type="button"
    aria-expanded={open}
    aria-controls={panelId}
    onclick={() => (open = !open)}
    class="inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-border-strong bg-accent-bg text-sm font-semibold text-accent-fg tabular-nums hover:bg-surface-hover focus-visible:pm-focus"
  >
    <!-- The accessible name carries the person AND their role, because the visible initials carry
         neither. `aria-expanded` supplies the open/closed state; it is not spelled into the name. -->
    <span class="sr-only">Account menu — {label}, {roleLabel}</span>
    <span aria-hidden="true">{initials}</span>
  </button>

  {#if open}
    <!-- A NAMED region, not an anonymous `<div>`. The panel repeats the identity that is inline at
         `md`, so without a name a screen-reader user meets the same words twice with nothing to say
         which is which — and a test cannot address one of them either. -->
    <div
      bind:this={panel}
      id={panelId}
      role="group"
      aria-label="Account"
      class="absolute end-0 top-full z-(--z-popover) mt-2 flex max-h-[min(80vh,38rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-surface-raised p-2 shadow-sheet"
    >
      <!-- Identity repeated INSIDE the panel, because below `md` this is the only place it appears.
           Above `md` it duplicates the inline copy, which is the correct trade: one component owns
           the strings, so the two can never disagree. -->
      <div class="flex flex-col gap-1 border-b border-border px-2 pt-1 pb-2">
        <span class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase">
          Signed in as
        </span>
        <span class="font-semibold break-words text-fg">{label}</span>
        <span class="text-sm text-fg-secondary">{roleLabel}</span>
      </div>

      <!-- The guide, FIRST among the links: it is what a clinician who has forgotten how something
           works reaches for, and they should not have to read past their own security settings to
           find it. Named as a question rather than "Help", so it says what it answers. -->
      <a
        href={resolve('/guide')}
        onclick={() => close(false)}
        class="flex min-h-11 items-center rounded-md px-2 font-semibold text-accent-fg no-underline hover:bg-surface-hover focus-visible:pm-focus"
      >
        How to use PulseMind
      </a>

      <a
        href={resolve('/account/security')}
        onclick={() => close(false)}
        class="flex min-h-11 items-center rounded-md px-2 font-semibold text-accent-fg no-underline hover:bg-surface-hover focus-visible:pm-focus"
      >
        Account &amp; security
      </a>

      <button
        type="button"
        onclick={() => {
          close(false);
          onsignout();
        }}
        aria-busy={signingOut ? 'true' : undefined}
        class="flex min-h-11 items-center rounded-md px-2 text-left font-semibold text-fg hover:bg-surface-hover focus-visible:pm-focus"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      <!-- DISPLAY. Below the account actions, because it is the thing you come here for least often,
           and separated by a rule so the destructive-adjacent `Sign out` is never mistaken for part
           of a settings group. Every control here changes something REAL and measurable: the theme
           swaps the palette. A control that reports a state it does not produce is the defect L-069
           was written about.

           TEXT SIZE and TEXT WEIGHT were here until 2026-08-20 and were removed at the product
           owner's instruction (**D-34**). They worked, unlike the density control before them; they
           are gone as a product decision. Appearance is the only display setting now, so this group
           holds one control and keeps its heading, because a second one is expected back only with a
           decision behind it. -->
      <div class="mt-1 flex flex-col gap-3 border-t border-border px-2 pt-3 pb-1">
        <span class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase">
          Display
        </span>

        <SettingChoice
          label="Appearance"
          value={resolvedTheme}
          options={THEMES}
          onchange={setTheme}
        />
        <!-- Said once, where the settings are, rather than as a tooltip on each. -->
        <p class="text-sm text-fg-secondary">Applies on this workstation and is remembered here.</p>
      </div>
    </div>
  {/if}
</div>
