// src/lib/design/provenance-classes.ts
// Visual contract: `.claude/skills/tailwind-design-system/SKILL.md` section 5.2.
//
// Provenance's non-colour channel is BORDER STROKE: solid / dashed / dotted, plus a glyph.
//
// The map has FOUR rows, not three. `Provenance` is `Provenance | null` after validation, so a
// lookup miss is reachable, and a silent fallback is forbidden: the fourth row renders the mandated
// badge literal `Provenance unknown` (S-15) and is NEVER the `measured` row.
//
// Measured and carried-forward share a hue ON PURPOSE — their difference is stroke + glyph + the
// mandatory `last measured …` detail, all of which survive greyscale and CVD. Population reference
// is the clinically dangerous one and is the only provenance state with a distinct hue.
//
// The two hatches are DIFFERENT utilities and mean different things: `pm-hatch-population` (9px
// pitch, population hue) versus `pm-hatch` (6px pitch, the sufficiency/unknown texture). Giving a
// population badge the sufficiency hatch would assert that the data behind the value is
// insufficient — a different clinical claim from "this number is not about this patient".

import type { Provenance } from '$lib/domain/types';

export const PROVENANCE_BADGE_BASE =
  'inline-flex min-h-[22px] items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 ' +
  'text-sm font-medium';

export const PROVENANCE_BADGE = {
  measured: 'border-solid border-prov-measured-border bg-prov-measured-bg text-prov-measured-fg',
  carried_forward:
    'border-dashed border-prov-carried-border bg-prov-carried-bg text-prov-carried-fg',
  population_reference:
    'border-dotted border-prov-population-border bg-prov-population-bg text-prov-population-fg pm-hatch-population',
} as const satisfies Record<Provenance, string>;

export const PROVENANCE_BADGE_UNKNOWN =
  'border-dotted border-insufficient-border bg-insufficient-bg text-insufficient-fg pm-hatch';

/**
 * The four badge literals, owned here so no call site spells one. `Measured` (S-12),
 * `Carried forward` (S-13), `Not measured on this patient` (S-14) — that casing, everywhere it
 * renders as a label — and `Provenance unknown` (S-15). There is no fifth spelling and no default
 * of `measured`.
 */
export const PROVENANCE_LABEL = {
  measured: 'Measured',
  carried_forward: 'Carried forward',
  population_reference: 'Not measured on this patient',
} as const satisfies Record<Provenance, string>;

export const PROVENANCE_LABEL_UNKNOWN = 'Provenance unknown';

/** Chart marks: mid-lightness, chroma >= 0.10, and shape still carries identity. */
export const PROVENANCE_MARK = {
  measured: 'fill-chart-prov-measured',
  carried_forward: 'fill-none stroke-chart-prov-carried',
  population_reference: 'fill-chart-prov-population',
} as const satisfies Record<Provenance, string>;

export const PROVENANCE_MARK_UNKNOWN = 'fill-none stroke-insufficient-border';
