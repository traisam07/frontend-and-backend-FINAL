// src/boot-loader.test.ts
//
// The loading mark exists TWICE on purpose, and this is what stops the two copies drifting.
//
// `src/app.html` paints the U-01 initial-loading state before any JavaScript module or stylesheet
// has loaded — `export const ssr = false` means the served document carries no application markup,
// so that block is the only thing standing between a cold workstation and a blank white page. It
// therefore cannot import `$lib/components/PulseLoader.svelte` and cannot use a Tailwind utility;
// it references the artwork by PATH. Everything else in the app uses the component.
//
// Both must point at the SAME two files. A second copy under another name would be a second
// download of the same 23 KB GIF and two marks free to drift apart — the failure `docs/LESSONS.md`
// L-075 and L-079 were written about, and it would fail quietly: the boot mark and the in-app mark
// are never on screen together, so nobody would see them disagree.
//
// This test also pins the parts of the boot block that are SAFETY requirements rather than styling.
// U-01 mandates an indicator PLUS text, and the text is the half that actually states no assessment
// is on screen — an animation alone is a prettier blank page. Deleting the sentence while tidying
// the markup is a plausible edit, so it is asserted rather than trusted.
//
// Read with `import.meta.glob`, not `node:fs`: this project's `tsconfig` carries no Node types on
// purpose (the same reasoning as `src/declaration-register.test.ts`).

import { describe, expect, it } from 'vitest';

const RAW = import.meta.glob(['./app.html', './lib/components/PulseLoader.svelte'], {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const file = (suffix: string): string => {
  const entry = Object.entries(RAW).find(([path]) => path.endsWith(suffix));
  if (!entry) throw new Error(`missing file: ${suffix}`);
  return entry[1];
};

const APP_HTML = file('app.html');
const COMPONENT = file('PulseLoader.svelte');

/** The two artwork files, however each file happens to spell the prefix in front of them. */
const assetNames = (source: string): string[] =>
  [...source.matchAll(/images\/(animation(?:-still)?\.(?:gif|png))/g)].map((m) => m[1] as string);

describe('the boot mark and the PulseLoader component load the same artwork', () => {
  it('finds both files in each place, so a rename cannot pass by matching nothing', () => {
    // L-050: a check that matches nothing on disk passes by printing nothing.
    expect(new Set(assetNames(APP_HTML))).toEqual(
      new Set(['animation.gif', 'animation-still.png']),
    );
    expect(new Set(assetNames(COMPONENT))).toEqual(
      new Set(['animation.gif', 'animation-still.png']),
    );
  });

  it('carries a still frame beside the moving one in BOTH places', () => {
    // This is the accessibility half and it is easy to lose while tidying markup. A GIF ignores
    // `prefers-reduced-motion` outright — no CSS property and no attribute stops one — so a still
    // image to swap to is the ONLY way the preference can be honoured. Drop it and the app silently
    // animates at a reader who asked it not to, with every other test still green.
    expect(assetNames(APP_HTML)).toContain('animation-still.png');
    expect(assetNames(COMPONENT)).toContain('animation-still.png');
    expect(APP_HTML).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(COMPONENT).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe('the boot block still satisfies U-01', () => {
  it('renders the mandated sentence beside the indicator, not the indicator alone', () => {
    // U-01: "a loading treatment that is unmistakably 'not data yet': skeleton or spinner PLUS text".
    // The mark is the indicator; this sentence is the half a clinician can actually read.
    expect(APP_HTML).toContain('Loading — no assessment is being displayed yet.');
  });

  it('names the application for a screen reader now that the wordmark text is gone', () => {
    // The visible `PulseMind` text was replaced by the mark, so the accessible name moved onto it.
    // Losing it would leave a `role="status"` region that never says which system is loading.
    expect(APP_HTML).toMatch(/alt="PulseMind"/);
  });

  it('renders no zero, dash, or empty clinical shape a reader could take for "no patients at risk"', () => {
    // Slice from the OPENING `<div`, not from the id attribute inside it: starting mid-tag leaves
    // that tag's own attributes outside any `<...>` match, so `inset: 0` survives the strip below
    // and trips the `\b0\b` guard on markup no clinician ever reads.
    const idAt = APP_HTML.indexOf('id="pm-boot"');
    const boot = APP_HTML.slice(
      APP_HTML.lastIndexOf('<div', idAt),
      APP_HTML.indexOf('%sveltekit.body%'),
    );
    // U-01's banned column. The SVG geometry is full of digits, so this looks only at TEXT nodes —
    // what a clinician actually reads.
    const text = boot
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');
    expect(text).not.toMatch(/\b0\b|—\s*$|\bNo issues\b|\bAll clear\b/);
  });
});
