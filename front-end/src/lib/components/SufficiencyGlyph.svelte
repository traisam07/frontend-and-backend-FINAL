<!-- src/lib/components/SufficiencyGlyph.svelte
     Data sufficiency's non-colour channel is the 45° `pm-hatch` texture; this warning triangle is
     the second cue. One glyph for both non-sufficient states — `insufficient` and `null` gate
     identically (F-6), and the DIFFERENCE between them is carried by the label, which
     `InsufficientChip` owns.

     Renders no text, owns no literal, and sets `aria-hidden` / `focusable` on its own `<svg>`. -->
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
  class="shrink-0"
>
  <path d="M8 2.2 14.4 13.4H1.6z" />
  <path d="M8 6.3v3.1" />
  <circle cx="8" cy="11.4" r="0.8" fill="currentColor" stroke="none" />
</svg>
