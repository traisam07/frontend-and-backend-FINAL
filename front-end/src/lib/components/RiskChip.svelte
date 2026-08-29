<!-- src/lib/components/RiskChip.svelte
     CANONICAL DECLARATION — `.claude/skills/tailwind-design-system/SKILL.md` sections 3 and 5.1.
     The only declaration in the app; every other appearance is a call site, and every call site
     passes exactly these props and nothing else.

     Non-interactive everywhere in PulseMind: no `tabindex`, no `title`, no hover tooltip. -->
<script lang="ts">
  import RiskGlyph from './RiskGlyph.svelte';
  import { RISK_CHIP, RISK_CHIP_BASE, RISK_CHIP_UNKNOWN } from '$lib/design/risk-classes';
  import type { RiskLevel } from '$lib/domain/types';
  import { RISK_SCORE_UNIT } from '$lib/domain/derive';

  let {
    level,
    score,
    id,
    class: klass,
  }: {
    level: RiskLevel | null;
    score: number | null;
    /** Set when a parent composes the chip into its own `aria-labelledby` list. */
    id?: string;
    /** Layout only — margin, grid placement. Never a risk class: the chip owns those. */
    class?: string;
  } = $props();

  // No silent fallback. An unrecognised level renders the explicit unknown state, never `Low`.
  const classes = $derived(
    level !== null && level in RISK_CHIP ? RISK_CHIP[level] : RISK_CHIP_UNKNOWN,
  );

  // S-05 is "missing OR unrecognised", so the LABEL branches on the same predicate as the classes.
  // Deriving it from `level === null` alone would let an unrecognised value wear the unknown styling
  // while printing the raw wire string where the mandated literal belongs.
  const levelUnknown = $derived(level === null || !(level in RISK_CHIP));
</script>

<span {id} class={[RISK_CHIP_BASE, classes, klass]}>
  <!-- The glyph sets its own `aria-hidden="true" focusable="false"`. A caller that passes them
       hands the component two undeclared props. -->
  <RiskGlyph {level} />

  <!-- STATE S-05. The mandated literal sits in its OWN element carrying `data-clarify="G-31"`,
       because the row mandates the marker ON the literal: an enumeration of reachable
       clarifications reads the RENDERED DOM, so a marker that exists only in `ui-states.md` is a
       marker the running app does not have. The value is the register row ID, never a slug. -->
  <!-- `whitespace-nowrap` belongs on the LITERAL, not on the chip: the chip must be free to wrap
       between its two parts at 320px (see `RISK_CHIP_BASE`), while each mandated string stays whole
       on its own line rather than breaking mid-phrase.

       `uppercase`, 2026-08-23, at the product owner's request ("nếu trong filter mục nào in hoa
       thì trong table phần đó cũng nên in hoa cho consistent"): `RiskTally.svelte`'s Risk row
       already uppercases these same four level names plus this same S-05 literal via CSS
       `text-transform` (its own file header explains why — CSS only, the DOM text stays mixed-case
       for anything that reads it, e.g. `aria-label` composition elsewhere is unaffected). This chip
       is the board table's own rendering of the identical value, so it now matches. -->
  {#if levelUnknown}<span class="whitespace-nowrap uppercase" data-clarify="G-31"
      >Risk level unavailable</span
    >{:else}<span class="whitespace-nowrap uppercase">{level}</span>{/if}

  <span aria-hidden="true">·</span>

  <!-- `score` is nullable after validation. `null` is state S-35: say so. Never blank, never `0`,
       never a bare em dash, and never a reason to drop the patient from the board. -->
  <!-- The unit travels with the score, HERE as well as on PD-5 — rule 15 asks for it at every
       display point. It is `%` since 2026-08-18 (**D-27**), declared by the product owner; before
       that it was the `unit not supplied` marker, and before THAT the board printed a bare number
       while Patient Detail printed the marker for the same value.

       ⚠️ A SPACE BEFORE THE UNIT, and it is not cosmetic. Closed-up is the convention for the
       `%` sign this used to carry, and it is wrong for a word: `0.7246probability (0-1)` is what
       the board rendered on the first live run. The space is a plain one inside the same
       `whitespace-nowrap` element, so it separates the two without ever letting a line break,
       a screenshot or a copy-paste put the number somewhere the unit is not.
       -->
  {#if score !== null}<span class="whitespace-nowrap"
      >{score} <span class="font-normal">{RISK_SCORE_UNIT}</span></span
    >{:else}<span class="whitespace-nowrap" data-clarify="G-31">score unavailable</span>{/if}
</span>
