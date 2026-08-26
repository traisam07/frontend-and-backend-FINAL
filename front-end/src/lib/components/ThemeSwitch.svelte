<!-- src/lib/components/ThemeSwitch.svelte
     CANONICAL DECLARATION — this file.

     The app's only preference control, extracted so the header and the sign-in screen share ONE of
     it. The sign-in screen renders no header (it has no clinical content to frame), and copying a
     44px-square button with a focus ring into a second file is exactly the duplication that produced
     eleven near-identical control strings the first time round (`docs/LESSONS.md` L-067).

     `role="switch"` with `aria-checked`, not `aria-pressed` and not a `<select>`. A switch is the
     role for a setting that is on or off and applies immediately, and it states its value without
     the user opening anything. The accessible name says what it CONTROLS — "Dark theme" — because
     "Dark theme, on" is unambiguous where "Theme" beside a moon icon is not.

     There is no third `system` option and that is not a loss: an untouched install still FOLLOWS the
     system preference, because only an explicit choice is stored (`prefs.svelte.ts`). The switch
     shows the resolved state either way (**D-03**). -->
<script lang="ts">
  import { prefs, setTheme } from '$lib/state/prefs.svelte';

  let { class: klass }: { class?: string } = $props();

  const dark = $derived(prefs.theme === 'dark');
</script>

<button
  type="button"
  role="switch"
  aria-checked={dark}
  onclick={() => setTheme(dark ? 'light' : 'dark')}
  class={[
    'inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface text-fg hover:bg-surface-hover focus-visible:pm-focus',
    klass,
  ]}
>
  <span class="sr-only">Dark theme</span>
  {#if dark}
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
    >
      <circle cx="8" cy="8" r="3.1" />
      <path
        d="M8 1.3v1.6M8 13.1v1.6M1.3 8h1.6M13.1 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1"
      />
    </svg>
  {:else}
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M13.2 9.4A5.6 5.6 0 0 1 6.6 2.8a5.6 5.6 0 1 0 6.6 6.6z" />
    </svg>
  {/if}
</button>
