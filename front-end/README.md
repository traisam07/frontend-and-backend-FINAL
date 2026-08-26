# PulseMind — frontend

Clinical decision-support UI for ICU respiratory-risk assessment of adult ventilated patients.
SvelteKit 2 + Svelte 5 (runes) + TypeScript strict + Tailwind CSS v4.

**Read-only by construction.** No screen can edit a clinical value, and no value changes except when
new application data arrives.

## Run it

```bash
cd front-end
pnpm install
pnpm dev            # http://localhost:5173 — fixture data, no backend needed
```

Against the live service (`../back-end`, started with `npm run dev:seeded`):

```bash
PUBLIC_PULSEMIND_DATA_SOURCE=http PUBLIC_PULSEMIND_API_BASE=http://localhost:3500 pnpm dev
```

Two environment variables, no third. Unset means **fixtures**, and that default is the safe
direction: a deployment that mis-spells the variable gets the implementation that renders rather than
a screen of named errors. The comparison is against the exact string `http`, never a truthiness test.

Whichever source is live, **the board says so visibly on every screen**. The flag selects a data
source; it never selects whether the UI tells the truth about which one produced what is on screen.

## Scripts

| Command                       | What it does                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`                    | Vite dev server                                                                      |
| `pnpm build` / `pnpm preview` | production build / serve it                                                          |
| `pnpm check`                  | `svelte-kit sync && svelte-check` — **zero errors AND zero warnings** is the bar     |
| `pnpm lint` / `pnpm format`   | prettier + eslint                                                                    |
| `pnpm test`                   | Vitest, `node` environment, over the effect-free domain and data modules             |
| `pnpm test:e2e`               | Playwright, against a production build on `:4173`                                    |
| `pnpm fixtures`               | regenerate `src/lib/data/fixtures/patients.ts` from `../back-end/seed/patients.json` |

There is deliberately **no jsdom component suite**. Focus order, `:focus-visible`, live-region
timing, `inert`, overlay behaviour and real scroll containers are exactly what this product's
accessibility contract turns on, and jsdom fakes or omits all six — a green jsdom suite would be
evidence of nothing. Component and interaction behaviour is asserted in a real browser
(`e2e/`, open question **P-03**).

Visual review is its own pass, excluded from the default suite:

```bash
pnpm test:visual    # every screen, light and dark
```

Look at the output. Two user-visible defects survived a clean type check and 37 green e2e tests and
were caught only in a screenshot (`../docs/LESSONS.md` L-053).

## Layout

```
src/
  app.css              the ONLY stylesheet — @import "tailwindcss" + the @theme token stack
  app.d.ts             App.Error carries a REQUIRED `code`: the closed union of six named failures
  app.html             the theme script, synchronous, before the head placeholder
  lib/
    data/              the untrusted wire boundary — wire.ts, validate.ts, source.ts, fixtures/
    domain/            effect-free .ts — types, rank, derive, window, slug, format
    state/             Svelte context — triage, prefs, pending, context. NEVER module singletons
    a11y/              announcer.svelte.ts — one polite region, one assertive call-site
    design/            clinical state -> class maps, `as const satisfies Record<Union, string>`
    components/        presentational only
  routes/
    patients/                                  Patient Overview   (OV-1 … OV-7)
    patients/[patientId]/                      Patient Detail     (PD-1 … PD-12)
    patients/[patientId]/parameters/[slug]/    Parameter Detail   (PM-1 … PM-9)
```

`src/lib/data/source.ts` is the **only** module that calls `fetch`.

## The rules that are not style

Every one of these is a patient-safety rule, and each has a test. The full set is `../CLAUDE.md`
section 5; these are the ones most easily broken by a plausible edit.

- **Never default a clinical field.** `risk_level ?? 'Low'`, `risk_score ?? 0`, `catch { patients = [] }`.
  Five fields are nullable after validation (`riskLevel`, `riskScore`, `sufficientData`, `charttime`,
  `ParameterReading.source`) precisely so the compiler forces the missing-data branch to be written.
- **Clicking a patient card selects only — it must not navigate.** `Open patient detail` lives in the
  side panel. Asserted in `e2e/triage.spec.ts`.
- **`Mark as reviewed` changes only the local review state.** Asserted by snapshotting every derived
  clinical field before and after the click.
- **Never build a class name by interpolation.** ``class={`bg-risk-${level}`}`` is never generated,
  so a Critical patient would render unstyled and read as Low. Full-string lookup maps only.
- **Never encode a state by colour alone.** Risk = fill weight, provenance = border stroke, review =
  left rule, sufficiency = 45° hatch — each with a full text label and a glyph.
- **Never invent a scale, a threshold, or a unit.** `risk_score`, `imputed_share` and
  `documentation_share` print verbatim. There is no `unit` field on the wire, so every value carries
  the marker `unit not supplied`.
- **Never render a bare number or a relative-only time.** The unit sits in the same nowrap element as
  the value; absolute 24-hour time is always present, relative age is a parenthesised supplement.
- **Every failure ends in a named, visible state.** Six `App.Error` codes, no anonymous exception.

## Where the spec lives

`../CLAUDE.md` is the index. `../docs/spec/ui-states.md` is the state matrix and the authority on
every mandated literal; `../docs/spec/screens.md` is the screen map and the ranking rule;
`../docs/spec/data-contract.md` is the wire contract and the derived-data rules;
`../docs/spec/open-questions.md` is the register every `data-clarify` id resolves to.

A `data-clarify` attribute in the DOM is a real open question. Enumerate them:

```bash
pnpm test:visual    # then read the register directly
```
