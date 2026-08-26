# PulseMind — contrast and colour-vision ledger

**GENERATED.** Run `node scripts/build-tokens.mjs` from `front-end/`. Every number here was
computed by `front-end/scripts/color.mjs` from the same model that emits `src/app.css`, in one pass,
so the stylesheet and this file cannot disagree. Nothing below is estimated.

Pipeline: `oklch -> OKLab -> linear sRGB -> gamut-map by chroma reduction -> 8-bit sRGB -> WCAG
relative luminance -> (L1+0.05)/(L2+0.05)`. The hex beside each token is what a browser renders after
gamut mapping, which is what the ratio is measured on.

Floors: **4.5:1** for text (WCAG 2.2 AA SC 1.4.3) and **3:1** for large text, UI boundaries and
graphical objects (SC 1.4.11).

Provenance: every VALUE is harness-defined, pending design confirmation (**D-01**, **D-02**). Every
RATIO is measured.

---

## 1. Risk-ramp colour-vision separation — the figure D-01 and D-02 turn on

The ramp this replaced was red / orange / amber / teal, and it **failed**: CIEDE2000 between High and
Medium measured **2.7 under simulated protanopia** and **3.0 under deuteranopia**, against a floor of
**15**. Two adjacent risk BANDS were the same colour to a red-green dichromat — roughly
one man in twelve — reading a triage board at a glance.

Those two numbers are **this file's own measurement**, and they are the ones to quote. An earlier
design-research pass recorded ΔE2000 2.3 under protanopia and 9.4 at normal vision for the same
family of hues, and that pair is still quoted in `docs/LESSONS.md` as the historical finding. The
two disagree because they measure different specific hex values, not because either is wrong; they
agree on the verdict, which is the only part that ever mattered. Anywhere a document needs a current
figure it cites this ledger, so there is exactly one number in play at a time.

The replacement is searched rather than chosen. `scripts/palette.mjs` maximises the **minimum**
pairwise separation across normal vision and all three dichromacies (Machado, Oliveira & Fernandes
2009 matrices, severity 1.0), subject to every contrast floor below. Hue windows keep the
conventional clinical reading — red is worst, teal is best (**G-35** is still open on whether a ward
convention should override that).

### Light theme — CHIP fills (what is on the board)

| Vision model | min ΔE2000 | Verdict | Closest pair |
|---|---:|---|---|
| normal | 18.4 | pass | High vs Medium |
| protanopia | 17.8 | pass | High vs Medium |
| deuteranopia | 16.2 | pass | High vs Medium |
| tritanopia | 20.1 | pass | High vs Medium |
| **overall** | **16.2** | **PASS** | floor 15 |

Bands: Critical `#a02e40` · High `#ebb16c` · Medium `#fff0d1` · Low `#57bbe5`


### Light theme — searched ramp (surfaces, panels, chart marks)

| Vision model | min ΔE2000 | Verdict | Closest pair |
|---|---:|---|---|
| normal | 24.9 | **PASS** | High vs Medium |
| protanopia | 25.4 | **PASS** | High vs Medium |
| deuteranopia | 22.3 | **PASS** | High vs Medium |
| tritanopia | 22 | **PASS** | Critical vs High |
| **overall** | **22** | **PASS** | floor 15 |

Bands (the SEARCH's own picks — the seed `-fg`, `-bg` and `-border` are derived from, and NOT a shipped fill; the chip fills are the table above): Critical `#9d001d` · High `#b97a13` · Medium `#f6d48a` · Low `#367c79`

Chart marks take the `-border` values, which are solved to the 3:1 object floor at a near-constant lightness — so they do NOT inherit this table's spread. Their own separation is section 2.1.

### Dark theme — CHIP fills (what is on the board)

| Vision model | min ΔE2000 | Verdict | Closest pair |
|---|---:|---|---|
| normal | 18.4 | pass | High vs Medium |
| protanopia | 17.8 | pass | High vs Medium |
| deuteranopia | 16.2 | pass | High vs Medium |
| tritanopia | 20.1 | pass | High vs Medium |
| **overall** | **16.2** | **PASS** | floor 15 |

Bands: Critical `#a02e40` · High `#ebb16c` · Medium `#fff0d1` · Low `#57bbe5`


### Dark theme — searched ramp (surfaces, panels, chart marks)

| Vision model | min ΔE2000 | Verdict | Closest pair |
|---|---:|---|---|
| normal | 22.4 | **PASS** | High vs Medium |
| protanopia | 21.8 | **PASS** | High vs Medium |
| deuteranopia | 19.1 | **PASS** | High vs Medium |
| tritanopia | 19.5 | **PASS** | Critical vs High |
| **overall** | **19.1** | **PASS** | floor 15 |

Bands (the SEARCH's own picks — the seed `-fg`, `-bg` and `-border` are derived from, and NOT a shipped fill; the chip fills are the table above): Critical `#d23a4e` · High `#e79700` · Medium `#ffe5ad` · Low `#50a29f`

Chart marks take the `-border` values, which are solved to the 3:1 object floor at a near-constant lightness — so they do NOT inherit this table's spread. Their own separation is section 2.1.

**This is evidence, not a closure.** It is still a harness-invented palette measured by the harness
that invented it. A design-supplied ramp replaces these hues and must arrive with this table
re-measured — which is one command.

**And colour still never leads.** Passing the floor makes colour a better SECOND channel; it does not
promote it to first. Risk keeps fill weight, provenance keeps border stroke, review keeps the left
rule, sufficiency keeps the hatch, and every state keeps its full text label and glyph (SC 1.4.1).

### 1.1 Is each band still a COLOUR? — measured against a neutral of its own lightness

Every table above is pairwise: it asks whether two bands can be told apart. **None of them asks
whether a band is still chromatic**, and a hue can clear every pair and still simulate to grey,
because its siblings move with it. That is the defect a product owner found in the teal `Low`
before this file did (**D-28**, `docs/LESSONS.md` L-078): 20.2 from an equal-lightness neutral with
normal vision, **2.8 under protanopia** — the band meaning "this patient is fine" read as an ABSENCE
and joined the disabled/unavailable vocabulary, in exactly the population the ramp was searched for.

The reference is a neutral at the colour's own lightness, which isolates hue. **This table is
ADVISORY and does not fail the build**: a near-neutral band is survivable when the full word and the
glyph carry it, and `Critical` is genuinely near-neutral to a protanope. It exists so that fact is
visible rather than discovered by a reader.

| Theme | Band | Hex | normal | protan | deutan | tritan | Reads as |
|---|---|---|---:|---:|---:|---:|---|
| light | Critical | `#a02e40` | 27.1 | 7.3 | 20 | 22.4 | **near-neutral** |
| light | High | `#ebb16c` | 24.1 | 23.1 | 24.3 | 25.3 | chromatic |
| light | Medium | `#fff0d1` | 14.2 | 14 | 14.6 | 10.5 | **near-neutral** |
| light | Low | `#57bbe5` | 19.7 | 16.5 | 18 | 23.1 | chromatic |
| dark | Critical | `#a02e40` | 27.1 | 7.3 | 20 | 22.4 | **near-neutral** |
| dark | High | `#ebb16c` | 24.1 | 23.1 | 24.3 | 25.3 | chromatic |
| dark | Medium | `#fff0d1` | 14.2 | 14 | 14.6 | 10.5 | **near-neutral** |
| dark | Low | `#57bbe5` | 19.7 | 16.5 | 18 | 23.1 | chromatic |

---

## 2. Chart-mark separation

Chart marks are separate tokens from badge tokens — a badge sits on a text surface and needs dark,
high-ratio ink; a mark sits on the plot surface and needs mid-lightness. The three provenance marks
must also stay apart under CVD, because a mark's SHAPE and its colour together carry provenance.

### 2.1 Risk marks — the `-border` set, MEASURED AND NOT ADOPTED

The four `-border` values are what a per-band chart mark WOULD use, and this table is why no chart
colours its marks by risk band today. `-border` is solved to the 3:1 object floor against the plot
surface, which pins all four to a near-constant lightness — and lightness spread is the whole of
what D-26's chip ramp separates by. Flattened, the warm bands collapse exactly as they did under
D-21.

| Theme | | | | | | Verdict |
|---|---|---|---|---|---|---|
| light | normal 8.5 | protanopia 3.6 | deuteranopia 4.1 | tritanopia 7.2 | **min 3.6** | **FAIL** vs floor 15 (High vs Medium) |
| dark | normal 6.9 | protanopia 1.1 | deuteranopia 1.3 | tritanopia 5.2 | **min 1.1** | **FAIL** vs floor 15 (High vs Medium) |

**What ships instead**, and it is a deliberate position rather than an omission: `RiskHistoryChart`
draws every point in one series colour and encodes the only mark-borne clinical fact — data
sufficiency — by SHAPE (a hollow square for `insufficient` or unknown, a filled circle otherwise),
repeated in each mark's accessible name and in the chart's mandatory data table. Risk band is read
from the chip beside the chart, never from a mark's hue. Adopting a per-band mark ramp needs a fresh
search against the 3:1 object floor, not a reuse of `-border`; registered as **D-30**.

### 2.2 Provenance marks

| Theme | | | | | |
|---|---|---|---|---|---|
| light | normal 27.5 | protanopia 5.1 | deuteranopia 6.8 | tritanopia 11.9 | **min 5.1** |
| dark | normal 27.2 | protanopia 5.4 | deuteranopia 6.6 | tritanopia 12 | **min 5.4** |

---

## 3. Light theme

### Text — floor 4.5:1

| Token | Hex | Measured against |
|---|---|---|
| `color-fg` | `#12171f` | surface 17.98 · canvas 16.6 · surface-sunken 15.59 · surface-raised 17.98 · surface-hover 15.54 |
| `color-fg-secondary` | `#4c525c` | surface 7.87 · canvas 7.26 · surface-sunken 6.82 · surface-raised 7.87 · surface-hover 6.8 |
| `color-fg-muted` | `#636972` | surface 5.53 · canvas 5.11 · surface-sunken 4.8 · surface-raised 5.53 · surface-hover 4.78 |
| `color-accent-fg` | `#185bb8` | surface 6.51 · canvas 6.01 · surface-sunken 5.64 · surface-raised 6.51 · surface-hover 5.62 · own-bg 5.77 |
| `color-risk-critical-fg` | `#ac3035` | surface 6.5 · canvas 6 · surface-sunken 5.64 · surface-raised 6.5 · surface-hover 5.62 · own-bg 5.71 |
| `color-risk-high-fg` | `#835400` | surface 6.5 · canvas 6 · surface-sunken 5.63 · surface-raised 6.5 · surface-hover 5.61 · own-bg 5.75 |
| `color-risk-medium-fg` | `#775900` | surface 6.54 · canvas 6.03 · surface-sunken 5.67 · surface-raised 6.54 · surface-hover 5.65 · own-bg 5.77 |
| `color-risk-low-fg` | `#1f6866` | surface 6.5 · canvas 6 · surface-sunken 5.64 · surface-raised 6.5 · surface-hover 5.62 · own-bg 5.8 |
| `color-review-pending-fg` | `#6e46b7` | surface 6.52 · canvas 6.01 · surface-sunken 5.65 · surface-raised 6.52 · surface-hover 5.63 · own-bg 5.72 |
| `color-review-done-fg` | `#27694f` | surface 6.52 · canvas 6.02 · surface-sunken 5.65 · surface-raised 6.52 · surface-hover 5.64 · own-bg 5.82 |
| `color-insufficient-fg` | `#4d5e7e` | surface 6.53 · canvas 6.02 · surface-sunken 5.66 · surface-raised 6.53 · surface-hover 5.64 · own-bg 5.76 |
| `color-prov-measured-fg` | `#595e69` | surface 6.5 · canvas 6 · surface-sunken 5.64 · surface-raised 6.5 · surface-hover 5.62 · own-bg 5.75 |
| `color-prov-carried-fg` | `#595e69` | surface 6.5 · canvas 6 · surface-sunken 5.64 · surface-raised 6.5 · surface-hover 5.62 · own-bg 5.75 |
| `color-prov-population-fg` | `#8f399c` | surface 6.5 · canvas 6 · surface-sunken 5.63 · surface-raised 6.5 · surface-hover 5.61 · own-bg 5.69 |
| `color-stale-fg` | `#845311` | surface 6.51 · canvas 6.01 · surface-sunken 5.64 · surface-raised 6.51 · surface-hover 5.63 |

### Graphical objects and boundaries — floor 3:1

| Token | Hex | Measured against |
|---|---|---|
| `color-border-strong` | `#757a82` | surface 4.32 · canvas 3.99 · sunken 3.74 |
| `color-focus` | `#1660c3` | surface 6.01 · canvas 5.55 · sunken 5.21 |
| `color-accent-border` | `#3f80e0` | surface 3.91 · canvas 3.61 · sunken 3.39 |
| `color-accent-solid` | `#1660c3` | surface 6.01 · canvas 5.55 · sunken 5.21 |
| `color-risk-critical-border` | `#e14d50` | surface 3.9 · canvas 3.6 · sunken 3.38 |
| `color-risk-high-border` | `#b27402` | surface 3.89 · canvas 3.6 · sunken 3.38 |
| `color-risk-medium-border` | `#9c7c32` | surface 3.93 · canvas 3.63 · sunken 3.41 |
| `color-risk-low-border` | `#478c8a` | surface 3.9 · canvas 3.6 · sunken 3.38 |
| `color-review-pending-border` | `#916bdf` | surface 3.91 · canvas 3.61 · sunken 3.39 |
| `color-review-done-border` | `#4d8d71` | surface 3.92 · canvas 3.61 · sunken 3.39 |
| `color-insufficient-border` | `#6f81a3` | surface 3.93 · canvas 3.63 · sunken 3.41 |
| `color-prov-measured-border` | `#7b818c` | surface 3.92 · canvas 3.62 · sunken 3.4 |
| `color-prov-population-border` | `#b55fc3` | surface 3.9 · canvas 3.6 · sunken 3.38 |
| `color-chart-series` | `#336bbb` | surface 5.3 · canvas 4.89 · sunken 4.6 |
| `color-chart-prov-measured` | `#447ccf` | surface 4.18 · canvas 3.85 · sunken 3.62 |
| `color-chart-prov-carried` | `#ac6f1c` | surface 4.16 · canvas 3.84 · sunken 3.61 |
| `color-chart-prov-population` | `#ad5dba` | surface 4.16 · canvas 3.84 · sunken 3.6 |

### Ink on a filled control — floor 4.5:1

| Token | Hex | Ratio |
|---|---|---|
| `color-on-accent on color-accent-solid` | `#ffffff` | 6.01 |
| `color-risk-critical-on on color-risk-critical-solid` | `#ffffff` | 7.1 |
| `color-risk-high-on on color-risk-high-solid` | `#1d140d` | 9.53 |
| `color-risk-medium-on on color-risk-medium-solid` | `#1d140d` | 16.09 |
| `color-risk-low-on on color-risk-low-solid` | `#1d140d` | 8.33 |
| `color-review-pending-on on color-review-pending-solid` | `#ffffff` | 6.07 |

---

## 4. Dark theme

### Text — floor 4.5:1

| Token | Hex | Measured against |
|---|---|---|
| `color-fg` | `#f2f3f6` | surface 15.44 · canvas 17.2 · surface-sunken 17.87 · surface-raised 13.53 · surface-hover 13.24 |
| `color-fg-secondary` | `#bdc2c9` | surface 9.57 · canvas 10.65 · surface-sunken 11.07 · surface-raised 8.38 · surface-hover 8.2 |
| `color-fg-muted` | `#9ea4ac` | surface 6.82 · canvas 7.6 · surface-sunken 7.89 · surface-raised 5.97 · surface-hover 5.85 |
| `color-accent-fg` | `#60a0ff` | surface 6.5 · canvas 7.24 · surface-sunken 7.52 · surface-raised 5.7 · surface-hover 5.57 · own-bg 5.26 |
| `color-risk-critical-fg` | `#ef7e83` | surface 6.51 · canvas 7.25 · surface-sunken 7.54 · surface-raised 5.7 · surface-hover 5.58 · own-bg 5.38 |
| `color-risk-high-fg` | `#d79127` | surface 6.5 · canvas 7.24 · surface-sunken 7.52 · surface-raised 5.7 · surface-hover 5.57 · own-bg 5.33 |
| `color-risk-medium-fg` | `#be9b47` | surface 6.5 · canvas 7.24 · surface-sunken 7.52 · surface-raised 5.7 · surface-hover 5.57 · own-bg 5.29 |
| `color-risk-low-fg` | `#5bada9` | surface 6.52 · canvas 7.26 · surface-sunken 7.55 · surface-raised 5.71 · surface-hover 5.59 · own-bg 5.26 |
| `color-review-pending-fg` | `#af8cff` | surface 6.54 · canvas 7.29 · surface-sunken 7.57 · surface-raised 5.73 · surface-hover 5.61 · own-bg 5.42 |
| `color-review-done-fg` | `#6dad90` | surface 6.55 · canvas 7.3 · surface-sunken 7.58 · surface-raised 5.74 · surface-hover 5.62 · own-bg 5.2 |
| `color-insufficient-fg` | `#8da1c3` | surface 6.54 · canvas 7.29 · surface-sunken 7.57 · surface-raised 5.73 · surface-hover 5.61 · own-bg 5.29 |
| `color-prov-measured-fg` | `#99a0ab` | surface 6.5 · canvas 7.24 · surface-sunken 7.52 · surface-raised 5.7 · surface-hover 5.58 · own-bg 5.25 |
| `color-prov-carried-fg` | `#99a0ab` | surface 6.5 · canvas 7.24 · surface-sunken 7.52 · surface-raised 5.7 · surface-hover 5.58 · own-bg 5.25 |
| `color-prov-population-fg` | `#d67ee4` | surface 6.5 · canvas 7.24 · surface-sunken 7.52 · surface-raised 5.69 · surface-hover 5.57 · own-bg 5.44 |
| `color-stale-fg` | `#cb955a` | surface 6.52 · canvas 7.26 · surface-sunken 7.54 · surface-raised 5.71 · surface-hover 5.59 |

### Graphical objects and boundaries — floor 3:1

| Token | Hex | Measured against |
|---|---|---|
| `color-border-strong` | `#757c88` | surface 4.08 · canvas 4.54 · sunken 4.72 |
| `color-focus` | `#85cbff` | surface 9.78 · canvas 10.89 · sunken 11.31 |
| `color-accent-border` | `#3072d0` | surface 3.63 · canvas 4.04 · sunken 4.19 |
| `color-accent-solid` | `#4087ee` | surface 4.83 · canvas 5.38 · sunken 5.59 |
| `color-risk-critical-border` | `#ce3e4f` | surface 3.61 · canvas 4.02 · sunken 4.18 |
| `color-risk-high-border` | `#9f6700` | surface 3.6 · canvas 4.01 · sunken 4.17 |
| `color-risk-medium-border` | `#906e0d` | surface 3.61 · canvas 4.02 · sunken 4.17 |
| `color-risk-low-border` | `#297f7c` | surface 3.61 · canvas 4.02 · sunken 4.17 |
| `color-review-pending-border` | `#835dcf` | surface 3.62 · canvas 4.03 · sunken 4.18 |
| `color-review-done-border` | `#3e7f63` | surface 3.61 · canvas 4.02 · sunken 4.17 |
| `color-insufficient-border` | `#627494` | surface 3.63 · canvas 4.04 · sunken 4.2 |
| `color-prov-measured-border` | `#6d747e` | surface 3.63 · canvas 4.04 · sunken 4.2 |
| `color-prov-population-border` | `#a650b3` | surface 3.61 · canvas 4.02 · sunken 4.17 |
| `color-chart-series` | `#4c85d8` | surface 4.61 · canvas 5.14 · sunken 5.34 |
| `color-chart-prov-measured` | `#3b73c4` | surface 3.62 · canvas 4.03 · sunken 4.19 |
| `color-chart-prov-carried` | `#a3650b` | surface 3.61 · canvas 4.02 · sunken 4.18 |
| `color-chart-prov-population` | `#a353af` | surface 3.6 · canvas 4.01 · sunken 4.17 |

### Ink on a filled control — floor 4.5:1

| Token | Hex | Ratio |
|---|---|---|
| `color-on-accent on color-accent-solid` | `#080d16` | 5.48 |
| `color-risk-critical-on on color-risk-critical-solid` | `#ffffff` | 7.1 |
| `color-risk-high-on on color-risk-high-solid` | `#1d140d` | 9.53 |
| `color-risk-medium-on on color-risk-medium-solid` | `#1d140d` | 16.09 |
| `color-risk-low-on on color-risk-low-solid` | `#1d140d` | 8.33 |
| `color-review-pending-on on color-review-pending-solid` | `#ffffff` | 4.71 |

---

## 5. Verdict

**Every pair in this ledger passes its floor.** Regenerate after any token change; this line is written from the measurements, not asserted.
