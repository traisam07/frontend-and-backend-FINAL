<!-- src/lib/components/IntegrityWarnings.svelte
     STATE U-12, made visible.

     Every non-fatal contradiction the validator found rides on the snapshot as
     `integrityWarnings: readonly string[]`, and this is where it reaches the screen: a colliding
     `charttime`, a `carried_forward` parameter with no `last_measured`, an unrecognised
     `risk_level`, a `population_reference` row that arrived with a last-measured time, a colliding
     parameter slug, and the composed-from-three-reads note the HTTP source attaches (**G-41**).

     "Silent preference of one field, silent clamping, silent dedupe, suppressing the warning because
     the screen looks tidier" are all forbidden. The screen is tidier with this collapsed by default
     and honest because it is never hidden: the count is always visible, and `<details>` keeps the
     detail one keystroke away rather than behind a decision someone has to remember to make.

     It is NOT `role="alert"`: these are present on load, and alerts are for changes. -->
<script lang="ts">
  let { warnings }: { warnings: readonly string[] } = $props();
</script>

{#if warnings.length > 0}
  <details
    class="rounded-md border border-insufficient-border bg-insufficient-bg text-insufficient-fg"
  >
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-semibold focus-visible:pm-focus"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M8 2.2 14.4 13.4H1.6z" />
        <path d="M8 6.3v3.1" />
        <circle cx="8" cy="11.4" r="0.8" fill="currentColor" stroke="none" />
      </svg>
      Data integrity: {warnings.length}
      {warnings.length === 1 ? 'warning' : 'warnings'} on this patient
    </summary>

    <ul class="flex flex-col gap-1.5 px-4 pt-1 pb-4 text-sm">
      <!-- Keyed by the warning text: these are distinct strings naming distinct paths, and an index
           key would re-pair them across a refresh. -->
      {#each warnings as warning (warning)}
        <li class="border-s-2 border-insufficient-border ps-3 font-mono break-words">{warning}</li>
      {/each}
    </ul>

    <p class="px-4 pb-4 text-sm">
      Nothing was defaulted, filled in, or adjusted to make this screen render. Each value affected
      shows its own unavailable state above.
    </p>
  </details>
{/if}
