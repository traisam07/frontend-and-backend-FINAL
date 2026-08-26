<!-- src/lib/components/InsufficientChip.svelte
     FIRST DECLARATION — implementer-authored, listed in the declaring-file register
     (`.claude/skills/bootstrap/SKILL.md` section 4, fourth table).

     It takes the STATE, never a label, so no caller can choose the wording. It owns BOTH S-10 badge
     literals:

       'insufficient'  ->  `Data-limited`                 (the handoff's own filter label)
       null            ->  `data sufficiency unknown`     (data contract F-6)

     `data sufficiency unavailable` and `unknown data` are retired spellings
     (`docs/spec/ui-states.md` section 4) and must never reappear. Calling the null branch
     `insufficient` would claim the data is KNOWN to be inadequate, which is itself a claim.

     'sufficient' renders NOTHING — the caller's `{#if}` is what decides that, and this component
     returning an empty badge would leave a stray gap in the card's reading order. -->
<script lang="ts">
  import SufficiencyGlyph from './SufficiencyGlyph.svelte';
  import type { Sufficiency } from '$lib/domain/types';

  let {
    sufficiency,
    class: klass,
  }: {
    sufficiency: Sufficiency | null;
    /** Layout only. */
    class?: string;
  } = $props();

  /**
   * `flex-wrap`, NOT `whitespace-nowrap`, and `items-start` so the glyph stays on the first line.
   *
   * The two literals this chip owns are very different lengths — `Data-limited` and
   * `data sufficiency unknown` — and neither may be shortened. Held on one line the long one
   * measured 199px inside an 80px board column and painted straight over `readings at this level`
   * in the next column: a mandated clinical literal covering another mandated clinical literal.
   * `docs/LESSONS.md` L-062 is the rule it broke, and `RiskChip` already carries the same fix for
   * the same reason. The column was widened at the same time so the wrap is two lines, not four.
   *
   * `text-body`, not `text-sm`: `app.css` calls 16px the FLOOR for any clinical value, and data
   * sufficiency is a clinical state (S-10), not table meta. It also puts this chip, `ReviewChip`
   * and `RiskChip` at ONE size — until 2026-08-19 the risk chip was 16px and these two were 14px,
   * which read as the score being shouted and was reported as exactly that.
   *
   * `uppercase`, 2026-08-23, at the product owner's request ("nếu trong filter mục nào in hoa thì
   * trong table phần đó cũng nên in hoa cho consistent"): `RiskTally.svelte`'s Data row already
   * uppercases these same two literals via CSS `text-transform` — this is the board table's own
   * rendering of the identical values, so it now matches. On `BASE` rather than per-branch: both
   * branches are pure glyph + label with nothing else inside the outer `<span>` that transform
   * could reach.
   */
  const BASE =
    'inline-flex min-h-6 flex-wrap items-start gap-x-1.5 gap-y-0.5 rounded-sm border ' +
    'px-2 py-0.5 text-body font-semibold uppercase';

  /**
   * MOVED OFF the shared `insufficient-*` navy tint on 2026-08-23, at the product owner's request:
   * this card badge and `RiskTally`'s filter row render the SAME two facts (`Data-limited` /
   * `data sufficiency unknown`) and had drifted to different colours — the filter row got its own
   * `datalimited-*` / `datasufficiencyunknown-*` solids earlier the same day, and this component
   * had not been updated to match. Now both classes reuse those exact tokens, so a clinician
   * reading a card and the filter bar sees one colour per state, not two.
   *
   * `pm-hatch` DROPPED from both branches, scoped to this component only — every OTHER
   * `insufficient-*` surface (`SourceBanner`, `ExplanationSection`, `PatientDetailBody`, the
   * review panel's unknown state) keeps it unchanged, because those still use the shared pale
   * tint hatch was designed for. Here it would draw the tint's fixed navy flecks over an unrelated
   * fill colour. Three non-colour channels remain without it: the border style (solid vs dashed),
   * `SufficiencyGlyph`, and the literal itself, always present (SC 1.4.1).
   */
  const INSUFFICIENT_CLASS = 'border-datalimited-solid bg-datalimited-solid text-datalimited-on';
  const UNKNOWN_CLASS =
    'border-dashed border-datasufficiencyunknown-on bg-datasufficiencyunknown-solid ' +
    'text-datasufficiencyunknown-on';
</script>

{#if sufficiency === 'insufficient'}
  <span class={[BASE, INSUFFICIENT_CLASS, klass]}>
    <SufficiencyGlyph />
    Data-limited
  </span>
{:else if sufficiency === null}
  <!-- The `null` branch gates identically to `insufficient` but is labelled differently, and it
       carries the clarify marker because per-field requiredness is the open row behind it. -->
  <span class={[BASE, UNKNOWN_CLASS, klass]}>
    <SufficiencyGlyph />
    <span data-clarify="G-31">data sufficiency unknown</span>
  </span>
{/if}
