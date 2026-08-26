<!-- src/lib/components/AbsoluteTime.svelte
     FIRST DECLARATION — implementer-authored, listed in the declaring-file register
     (`.claude/skills/bootstrap/SKILL.md` section 4, fourth table).

     It owns NO copy of its own. It renders `<time datetime>` per
     `.claude/skills/clinical-a11y/SKILL.md` section 8.4: 24-hour `HH:mm`, the date whenever the
     instant is not today, the zone LABELLED, and the relative age parenthesised and SECOND.

     It must never fall back to a relative-only rendering, and `now` / `just now` / `recently` are
     banned (`docs/spec/ui-states.md` section 4) — `formatAge` is what enforces that, and this
     component never formats a time itself. -->
<script lang="ts">
  import { formatAbsolute, formatAge, toDateTimeAttribute } from '$lib/domain/format';
  import { getAppClock } from '$lib/state/context';

  let {
    iso,
    showRelative = true,
    alwaysDate = false,
    class: klass,
  }: {
    /** The instant, as delivered. Parsed here and nowhere else in the render path. */
    iso: string;
    /**
     * The parenthesised age. On by default. Turned off only where the surrounding copy already
     * carries an age — never to save space, because a bare `14:12` on a three-day-old reading is
     * exactly the misread this rule exists to prevent.
     */
    showRelative?: boolean;
    /**
     * Force the calendar date even when the instant is today. Section 8.4 requires it ALWAYS on
     * Parameter Detail and in the drawer, and only conditionally elsewhere — a bare `14:12` on a
     * screen a clinician reached by deep link says nothing about which day it belongs to.
     */
    alwaysDate?: boolean;
    class?: string;
  } = $props();

  // The ONE app clock tick, from context. Never `Date.now()` in a component: the relative age has to
  // tick on the same schedule everywhere, and a per-component clock would let two ages on one screen
  // disagree.
  const clock = getAppClock();

  const instant = $derived(new Date(iso));
  const valid = $derived(Number.isFinite(instant.getTime()));
  const relative = $derived(valid ? formatAge(instant, clock.now) : '');
</script>

{#if valid}
  <span class={['whitespace-nowrap', klass]}>
    <time datetime={toDateTimeAttribute(instant)} class="tabular-nums"
      >{formatAbsolute(instant, alwaysDate ? undefined : clock.now)}</time
    >
    <!-- Absolute FIRST; the relative age is a parenthesised supplement, never alone. Beyond 24 h
         `formatAge` returns the empty string and the absolute stamp stands by itself rather than
         inviting a glance-read of a day count. -->
    {#if showRelative && relative !== ''}
      <span class="text-fg-muted">({relative})</span>
    {/if}
  </span>
{:else}
  <!-- An instant that does not parse is a data-integrity fact, not a formatting problem. It renders
       explicitly rather than as a blank or an em dash. -->
  <span class={['text-insufficient-fg', klass]} data-clarify="G-31">timestamp unreadable</span>
{/if}
