<!-- src/lib/components/Logo.svelte
     CANONICAL DECLARATION — this file. No skill document holds a competing copy (CLAUDE.md rule 19);
     registered in `.claude/skills/bootstrap/SKILL.md` section 4.1b.

     THE BRAND WORDMARK — ONE FILE, BOTH THEMES (**D-32**).

     The artwork arrived on 2026-08-19 as two 1920x1080 rasters, and this component briefly swapped
     between them. It does not any more. Measured, the two files were the same drawing twice — their
     alpha masks matched on every one of 199 994 ink pixels — so `scripts/trace-logo.mjs` vectorises
     the dark one, whose two colours already separate the PULSE/MIND letters from the E, the ECG line
     and the stethoscope curve. The result is one SVG with two CSS variables, and the theme is a
     colour change rather than a file change. `pnpm brand` regenerates it; the trace is verified by
     re-rasterising and comparing to the source, so a tracer bug cannot ship a subtly wrong logo.

     INLINED WITH `{@html}`, AND THAT IS A REQUIREMENT RATHER THAN A PREFERENCE. An SVG referenced
     from `<img src>` is an isolated document: the page's custom properties do not cascade into it,
     so `--pm-logo-word` would never reach the paths and both themes would render the file's own
     fallback. Inlining is what makes the whole approach work. The string is a build-time import of a
     generated asset in this repository — never user input, never a network response — which is the
     one shape of `{@html}` that carries no injection surface.

     IT DEGRADES TO TYPE, DELIBERATELY. If the trace has not been generated, `hasArtwork` is false at
     BUILD time and this renders the pulse glyph plus the word `PulseMind` — what shipped before the
     artwork existed. A broken image in the header of a clinical app is worse than a wordmark set in
     type, and `import.meta.glob` resolves at build time so there is no request to fail.

     NOTHING CLINICAL IS HERE. A logotype is branding, not a statement about the screen: `U-18`'s
     list of what may never be dropped names risk, review, badges, units, timestamps, provenance and
     the disclaimer, and a logo is none of them. That is why the wordmark may hide below `sm`.
-->
<script lang="ts">
  let {
    /** Rendered height in px. Width follows the artwork's own aspect ratio. */
    height = 24,
    /** Layout only — margin, alignment. Never a colour. */
    class: klass = '',
    /**
     * Hide the wordmark below `sm` and show the compact mark instead.
     *
     * TRUE in the app header, where the logo shares a row with the unit clock, the read-only badge,
     * the theme switch and the account control, and a 5.6:1 graphic is what pushes that row onto a
     * second line at 320px (L-074). FALSE on the sign-in screen, which renders no header at all and
     * has the full card width to itself — there the wordmark is the only branding on the page and
     * shrinking it to a spike would be a loss for nothing.
     */
    responsive = true,
  }: { height?: number; class?: string; responsive?: boolean } = $props();

  /**
   * Resolved at BUILD time. An empty result is the honest "not generated yet" state and selects the
   * type fallback below; it is not an error and must not be rendered as one.
   */
  const ART = import.meta.glob('../assets/brand/pulsemind.svg', {
    eager: true,
    import: 'default',
    query: '?raw',
  }) as Record<string, string>;

  const markup = Object.values(ART)[0] ?? null;
  const hasArtwork = markup !== null;
</script>

{#if hasArtwork}
  <!-- `aria-hidden` on the wrapper, so the `role="img"` and `<title>` the generated file carries for
       standalone use do not announce a second name: the LINK around this component already names the
       application, and two names on one control is worse than none. -->
  <span
    class={['pm-logo', responsive ? 'pm-logo-responsive' : 'pm-logo-always', klass]}
    style="--pm-logo-h: {height}px"
    aria-hidden="true"
    role="presentation"
  >
    <!-- THE COMPACT MARK, below `sm` only. The wordmark is 5.6:1, so at a 26px height it is ~147px
         wide — and on a 320px phone that is what pushes the clock, the theme switch and the account
         control onto a second header row. `docs/LESSONS.md` L-074 is that incident, and this
         component reproduced it the moment an always-hidden text became an always-visible graphic.
         A width breakpoint is the right tool HERE and only here: the artwork is a fixed aspect ratio
         and does not grow with the text setting, which is the case L-074 leaves to `min-width`. -->
    <svg
      class="pm-logo-mark"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="3.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M2.5 16 H9 l3.6 -9.5 l5.2 19 l3.6 -9.5 H29.5" />
    </svg>
    <span class="pm-logo-word">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html markup}
    </span>
  </span>
{:else}
  <!-- THE TYPE FALLBACK — what shipped before the artwork existed, kept intact rather than replaced
       by a placeholder box. Same responsive shape: the glyph always, the word from `sm` up. -->
  <span class={['inline-flex items-center gap-2', klass]}>
    <svg
      aria-hidden="true"
      focusable="false"
      width={height}
      {height}
      viewBox="0 0 26 26"
      fill="none"
      stroke="currentColor"
      stroke-width="2.1"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-accent-fg"
    >
      <path d="M1.8 13h4.4l2.4-6.6 4.1 13.2 2.6-6.6h6.9" />
    </svg>
    <span class="sr-only sm:not-sr-only sm:text-lg sm:font-semibold sm:tracking-tight sm:text-fg">
      PulseMind
    </span>
  </span>
{/if}

<style>
  .pm-logo {
    display: inline-flex;
    align-items: center;

    /* THE TWO ROLES. Light theme is the default and reproduces the supplied all-crimson artwork
       exactly — in it the letters and the accent are one colour, which is why both fall to the same
       value here. The dark theme is where they separate. */
    --pm-logo-word: #cd082d;
    --pm-logo-accent: #cd082d;
  }

  /* Literal hex rather than `--color-brand-solid`, and this is the one place that is correct: the
     generated SVG is also used standalone (a favicon source has no stylesheet), so its own fallback
     must be a real colour. These two must stay in step with `--color-brand-solid` in `app.css`;
     `e2e/chrome.spec.ts` asserts the painted result rather than the declaration. */
  :global([data-theme='dark']) .pm-logo {
    --pm-logo-word: #e6e1db;
    --pm-logo-accent: #ed1c24;
  }

  .pm-logo-mark {
    display: block;
    width: var(--pm-logo-h);
    height: var(--pm-logo-h);
    color: var(--color-brand-solid);
  }

  /* NO `display` on a descendant-with-element selector anywhere below. `.pm-logo svg` would be
     specificity (0,1,1) and would outrank the single-class rules that decide visibility — which is
     how an earlier version of this component painted every variant at once and blew the 320px
     reflow test. Sizing and visibility are kept in single-class rules only. */
  /* Responsive: mark below `sm`, wordmark from `sm` up. */
  .pm-logo-responsive .pm-logo-word {
    display: none;
  }

  /* Always: the wordmark at every width, and no compact mark in the DOM's layout at all. */
  .pm-logo-always .pm-logo-mark {
    display: none;
  }

  .pm-logo-always .pm-logo-word {
    display: block;
    line-height: 0;
  }

  .pm-logo-word :global(svg) {
    height: var(--pm-logo-h);
    width: auto;
  }

  /* 40rem is Tailwind's `sm`, and `rem` in a media query deliberately resolves against the BROWSER's
     initial font size rather than the `html { font-size }` this app sets (L-074). That is correct
     here: what has to fit is a fixed aspect ratio, which does not grow with the text setting. */
  @media (min-width: 40rem) {
    .pm-logo-responsive .pm-logo-mark {
      display: none;
    }

    .pm-logo-responsive .pm-logo-word {
      display: block;
      line-height: 0;
    }
  }

  /* forced-colors replaces the page's colours with the user's own. A vector follows it, unlike the
     raster this replaced — one of the reasons D-32 wanted a vector. Nothing clinical depends on the
     logo, so it is allowed to become system colours rather than being pinned. */
</style>
