<!-- src/lib/components/ParameterChips.svelte
     CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 6.1.

     A chip CHANGES THE URL, so it is an `<a href>` to the sibling route inside a
     `<nav aria-label="Parameters">`. `aria-current="page"` marks exactly the chip whose slug is in
     the address bar — never two, never zero.

     NO `role="tab"`, NO `role="tablist"`, NO `aria-selected`, NO roving `tabindex`. Those strip the
     link role, so right-click, middle-click and "copy link address" stop working; they imply an
     `aria-controls` → `role="tabpanel"` contract that cannot exist because the target is a different
     page; and `aria-selected` is ignored on a link, which would leave the active parameter conveyed
     by colour alone — in the one product that bans colour-alone states.

     "In place" (Handoff section 5) describes what the clinician sees — the patient does not change,
     the page does not reset — not an in-memory swap that leaves the URL stale. If a chip were ever
     highlighted while the URL named a different parameter, the address bar, the back button and a
     shared link would all disagree with the value being read. -->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import type { ParameterReading } from '$lib/domain/types';

  let { patientId, parameters }: { patientId: string; parameters: readonly ParameterReading[] } =
    $props();

  // `$derived`, not a plain const: this nav survives navigation between sibling parameters, so a
  // const would keep `aria-current` on the chip the clinician came FROM.
  const activeSlug = $derived(page.params.parameterSlug);

  /** `q` / `filter` are carried through, so the back link chain still restores the board. */
  const carry = $derived.by(() => {
    const params = new URLSearchParams();
    const q = page.url.searchParams.get('q');
    const filter = page.url.searchParams.get('filter');
    if (q !== null && q !== '') params.set('q', q);
    if (filter !== null && filter !== '') params.set('filter', filter);
    const search = params.toString();
    return search === '' ? '' : `?${search}`;
  });
</script>

<!-- A GRID whose column count follows the TEXT SIZE, not the viewport width — the same technique
     the board's summary cards use, and for the same reason. As a wrapping flex row, eight chips with
     labels like `Minute ventilation` fell to one per row at the largest text setting, each sized to
     its own content, leaving about a third of the width ragged and empty and consuming 45% of a
     phone viewport. A `rem` track minimum inside `minmax()` scales with the setting where a media
     query cannot, so the chips share rows evenly, fill the width, and drop to one per row exactly
     when two would no longer fit. Bigger tap targets, less height, and no label shortened — the
     parameter names are the handoff's and are never abbreviated or truncated. -->
<nav aria-label="Parameters">
  <ul class="grid grid-cols-[repeat(auto-fit,minmax(min(6.5rem,100%),1fr))] gap-2">
    <!-- Keyed by the parameter NAME — a stable domain id — never by index. -->
    {#each parameters as parameter (parameter.name)}
      {@const current = parameter.slug === activeSlug}
      <li class="flex min-w-0">
        <a
          href={resolve('/patients/[patientId]/parameters/[parameterSlug]', {
            patientId,
            parameterSlug: parameter.slug,
          }) + carry}
          aria-current={current ? 'page' : undefined}
          class={[
            // `w-full` + `justify-center`: the chip now fills its grid track instead of hugging its
            // own text, so a row of chips reads as one row of equal targets rather than a ragged edge.
            'inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-pill border px-3 py-1.5 text-center text-sm',
            'font-semibold no-underline focus-visible:pm-focus',
            current
              ? 'border-accent-border bg-accent-bg text-accent-fg'
              : 'border-border-strong bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg',
          ]}
        >
          <!-- The active state is not colour-alone: `aria-current` + the accent fill + this dot. -->
          {#if current}
            <svg
              aria-hidden="true"
              focusable="false"
              width="8"
              height="8"
              viewBox="0 0 8 8"
              class="fill-current"
            >
              <circle cx="4" cy="4" r="4" />
            </svg>
          {/if}
          {parameter.name}
        </a>
      </li>
    {/each}
  </ul>
</nav>
