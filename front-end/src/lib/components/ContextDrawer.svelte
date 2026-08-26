<!-- src/lib/components/ContextDrawer.svelte
     CANONICAL DECLARATION — `.claude/skills/clinical-a11y/SKILL.md` section 4.

     ALL SIX REQUIREMENTS LIVE HERE, not at the call site:
       `role="dialog"` + `aria-modal="true"` + `aria-labelledby` · focus moves in on open · focus is
       TRAPPED · `Escape` closes from anywhere inside · focus is restored to THE EXACT TRIGGER NODE ·
       the background is `inert` (that last one is the caller's, because only the route knows what
       "the background" is — see `[patientId]/+page.svelte`).

     Closed means NOT IN THE DOM. Never merely translated off-screen while still focusable: a
     clinician could otherwise Tab into a hidden panel and read another patient's values.

     ON THE NARROWEST TIER IT IS A FULL-SCREEN SHEET, with exactly the same contract — still
     `role="dialog"`, still trapped, still Escape-closable, focus still restored to the trigger. It
     is NEVER a drag-handle bottom sheet: SC 2.5.7 forbids making anything depend on dragging, and a
     gloved hand on a bedside tablet is the worst case for a drag target. The body carries
     `pm-safe-b` so the last control clears the home indicator.

     `aria-hidden` on the background would NOT be enough, which is why the caller uses `inert`:
     `aria-hidden` leaves the background tabbable, so Tab escapes the modal and lands on page content
     behind the scrim. -->
<script lang="ts">
  import { tick, type Snippet } from 'svelte';

  let {
    open,
    title,
    onclose,
    children,
  }: {
    open: boolean;
    /** The dialog's accessible name. No default: a caller that omits it fails `svelte-check`
     *  rather than shipping an unnamed dialog. */
    title: string;
    onclose: () => void;
    children: Snippet;
  } = $props();

  const uid = $props.id();
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
    ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let panel: HTMLElement | undefined = $state();
  let heading: HTMLElement | undefined = $state();
  let trigger: HTMLElement | null = null;

  $effect(() => {
    if (!open) return; // dependency read synchronously
    trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    void tick().then(() => heading?.focus()); // announce the title before the controls

    return () => {
      document.body.style.overflow = previousOverflow;
      // Restore to the EXACT trigger; fall back to the page heading only if it unmounted.
      const target = trigger?.isConnected
        ? trigger
        : document.querySelector<HTMLElement>('main h1');
      target?.focus();
      trigger = null;
    };
  });

  function focusables(): HTMLElement[] {
    if (!panel) return [];
    return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation(); // works from inside a nested <select> too
      onclose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    // `.at()` under `noUncheckedIndexedAccess`: the guard is the narrowing, so no `!` and no cast.
    const first = items.at(0);
    const last = items.at(-1);
    if (!first || !last) {
      event.preventDefault(); // never let Tab escape the modal
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === heading || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

{#if open}
  <!-- The scrim is a POINTER CONVENIENCE only: Escape and the Close button are the keyboard paths,
       so it needs no key handler of its own and is `aria-hidden`. -->
  <div
    class="fixed inset-0 z-(--z-scrim) bg-scrim motion-safe:transition-opacity motion-safe:duration-(--duration-drawer)"
    aria-hidden="true"
    onclick={onclose}
  ></div>

  <div
    bind:this={panel}
    class="fixed inset-0 z-(--z-drawer) flex flex-col bg-surface-raised shadow-drawer sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[min(28rem,100vw)]"
    role="dialog"
    aria-modal="true"
    aria-labelledby="{uid}-title"
    tabindex="-1"
    {onkeydown}
  >
    <header
      class="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-surface-raised px-4 py-3"
    >
      <!-- `tabindex="-1"` so focus can be moved here programmatically without adding a tab stop. -->
      <h2 id="{uid}-title" bind:this={heading} tabindex="-1" class="text-lg font-semibold">
        {title}
      </h2>
      <button
        type="button"
        onclick={onclose}
        class="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-hover focus-visible:pm-focus"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
        <span class="sr-only">Close</span>
      </button>
    </header>

    <div class="flex-1 overflow-y-auto overscroll-contain p-4 pm-safe-b">
      {@render children()}
    </div>
  </div>
{/if}
