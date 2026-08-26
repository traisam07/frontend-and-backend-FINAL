<!-- src/lib/components/UnknownInline.svelte
     FIRST DECLARATION — implementer-authored, listed in the declaring-file register
     (`.claude/skills/bootstrap/SKILL.md` section 4, fourth table).

     The ONE inline unknown treatment. It takes the register row ID and maps it to the literal, so no
     call site composes one and a state cannot acquire a second spelling by being rendered in two
     places.

     `clarify` is a `G-*` / `D-*` / `P-*` row ID from `docs/spec/open-questions.md`, NEVER a slug:
     the register has no slug column, so `model-use` or `review-null` resolves to nothing and the
     P-09 CI gate ("fails when an id has no row in this register") could never pass.

     Visual contract: `.claude/skills/tailwind-design-system/SKILL.md` section 5.9, "unknown—inline".
     Its non-colour channel is the DOTTED border plus the warning glyph. -->
<script lang="ts">
  import SufficiencyGlyph from './SufficiencyGlyph.svelte';

  let {
    clarify,
    class: klass,
  }: {
    /** An open-questions register row ID. Never a slug. */
    clarify: string;
    class?: string;
  } = $props();

  /**
   * The literal each row mandates. A row that is NOT in this map has no mandated literal yet, and
   * the component must not invent one — it renders the register id itself, visibly, so the gap
   * escalates on screen instead of being papered over with plausible copy.
   *
   * `G-31` is deliberately absent: `docs/spec/ui-states.md` section 4 lists U-10 among the rows that
   * still carry bans and no literal, so supplying one here would be the implementer deciding copy
   * the matrix has not decided.
   */
  const LITERAL: Readonly<Record<string, string>> = {
    'G-04': 'Model use unknown', // S-29
    'G-01': 'unit not supplied', // G-01 — the marker beside every value
    // S-36. Both earlier spellings are RETIRED (`ui-states.md` section 4): the long
    // `… — not provided by the data contract` carried spec vocabulary the product owner asked off
    // the screen, and the bare `Source status unavailable` it would naturally shorten to was
    // ALREADY retired, because it reads as "the devices are down" — a clinical claim the data
    // cannot support. This form names the absent REPORT instead of a device state.
    'G-05': 'Device and source status is not reported',
    'G-18': 'Provenance unknown', // S-15
    'G-02': 'No description supplied', // G-02 — the schema has no `description` field
    // G-50 deliberately has NO entry: the register row exists precisely because no literal has been
    // decided for it, so the component must escalate visibly rather than supply one.
  };

  /**
   * THE FALLBACK STOPPED NAMING THE REGISTER ON 2026-08-17. It rendered
   * `Unspecified — see open question ${clarify}` — a sentence addressed to the handoff team, shown
   * to a clinician, pointing at a document they will never open. The product owner asked for the
   * not-yet-defined decisions to come off the screen.
   *
   * What replaces it is the same FACT without the process: this field carried no value. The register
   * id still travels in `data-clarify` on the element below, so `P-09` enumerates the gap from the
   * DOM exactly as before and nothing is lost to the audience that acts on it.
   *
   * It is still not an invented literal. `not supplied` says only what is true of the payload, and a
   * row that later gains a mandated literal in `docs/spec/ui-states.md` overrides it through the map
   * above — which is why the map, not this line, is where copy decisions land.
   */
  const text = $derived(LITERAL[clarify] ?? 'not supplied');
</script>

<span
  data-clarify={clarify}
  class={[
    'inline-flex items-center gap-1 rounded-xs border border-dotted border-insufficient-border',
    'px-1 text-sm text-insufficient-fg',
    klass,
  ]}
>
  <SufficiencyGlyph />
  {text}
</span>
