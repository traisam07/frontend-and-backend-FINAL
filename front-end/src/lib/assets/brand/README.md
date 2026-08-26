# Brand artwork — GENERATED

**Do not edit or add files here by hand.** `pnpm brand` (`node scripts/build-brand.mjs`) writes this
folder from the sources the product owner supplied, which live in `front-end/static/images/`.

| Source (`static/images/`)                              | Generated                            | Used by                                             |
| ------------------------------------------------------ | ------------------------------------ | --------------------------------------------------- |
| `logo-dark.png` (+ `logo-white.png`, as a cross-check) | `src/lib/assets/brand/pulsemind.svg` | `Logo.svelte`, both themes                          |
| `animation.gif`                                        | `static/images/animation-still.png`  | `PulseLoader.svelte` under `prefers-reduced-motion` |

## One file for both themes

The two supplied wordmarks are the **same drawing twice**. Measured on every build: their alpha masks
match on all 199,994 ink pixels, so only the colours differ. `logo-dark.png` is the one that
separates the two roles — `rgb(230,225,219)` for the PULSE/MIND letters, `rgb(237,28,36)` for the E,
the ECG line and the stethoscope curve — so it is the file that gets traced, and the light theme is
reproduced by setting both roles to the brand crimson the light artwork uses throughout.

`scripts/trace-logo.mjs` walks the pixel boundary of each role, chains the edges into closed loops,
simplifies them, and emits two `<path>`s whose `fill` is a CSS variable. It is not an approximation:
the artwork is flat colour with no gradients, so the pixel boundary **is** the outline.

**The output is checked, not trusted.** The emitted paths are re-rasterised with a scanline fill and
compared to the source mask pixel by pixel. The build fails below 99.5% agreement; both roles
currently trace at **99.99%**. A brand mark that is subtly wrong is exactly the defect nobody catches
in review, so it is measured instead.

## The invariant that makes one file legal

If `logo-white.png` and `logo-dark.png` ever stop being the same shape, one traced SVG cannot serve
both themes — it would silently ship the dark file's geometry for both. The build compares the two
masks and **fails** rather than remembering. It also fails if either source loses its transparent
background, which would paint a white slab on every dark screen.

## Re-exporting

Replace the file in `static/images/` under the same name and run `pnpm brand`. Canvas size, padding
and scale do not matter — the tracer finds the ink itself. Three things do: keep the background
**transparent**, keep the two files the **same drawing**, and keep the dark version's two colours
distinguishable (the classifier asks whether a pixel is notably redder than it is green or blue).

## Still outstanding — **D-32**

A **square app-icon** crop. `static/favicon.svg` is a hand-authored single spike, because a 5.6:1
wordmark is illegible at 16px and no square lockup was supplied. That is the last piece of artwork
this project is missing.
