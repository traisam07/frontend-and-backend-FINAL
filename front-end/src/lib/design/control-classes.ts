// src/lib/design/control-classes.ts
// CANONICAL DECLARATION — this file. No skill document holds a competing copy (CLAUDE.md rule 19);
// `.claude/skills/tailwind-design-system/SKILL.md` section 5.4 points here and shows excerpts only.
//
// WHY THIS FILE EXISTS. Before it, seventeen files hand-wrote their own interactive-control recipe
// and produced ELEVEN near-identical class strings for what are really four controls. Two of the
// fragments being re-typed each time are not decoration:
//
//   `min-h-11`                 the 44x44 target floor (WCAG 2.2 SC 2.5.8 / clinical-a11y section 6)
//   `focus-visible:pm-focus`   the two-ring focus indicator (SC 2.4.11 / 2.4.13)
//
// A control that omits either is a WCAG failure that looks completely fine in review, in a
// screenshot, and in every test that does not specifically measure it. Re-typing a safety-critical
// string in seventeen places is not a style problem; it is a defect waiting for the eighteenth.
//
// Same discipline as `risk-classes.ts`: every value is a COMPLETE, greppable class string, never
// built by concatenation or interpolation, and every map is `as const satisfies Record<Union, …>` so
// adding a variant to the union turns this file red instead of yielding `undefined` at a call site.
//
// Harness-defined, pending design confirmation (**D-01**) — the handoff supplies no control specs.

/** Which job the control does, not what it looks like. */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'review' | 'brand';

/**
 * Shared by `<button>` and by an `<a>` styled as a button, so the two cannot drift apart. It carries
 * the target floor; the focus ring lives in the VARIANT map and not here, which is deliberate.
 *
 * There are two focus utilities, and using the wrong one is a real regression rather than a
 * preference: `pm-focus` rings against the page, and `pm-focus-filled` inverts so the ring stays
 * visible on a SOLID fill, where an outer ring the same colour as the button is no ring at all. So
 * the filled variants carry `pm-focus-filled` and the outlined ones carry `pm-focus`, every entry in
 * the map has exactly one of them, and `control-classes.test.ts` fails the build if any entry has
 * neither. That test is the guarantee this file exists to provide.
 *
 * `no-underline` is here because the `<a>` form needs it and a `<button>` is unaffected — one base
 * string beats two that differ by one utility and get edited separately.
 */
export const CONTROL_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-body font-semibold ' +
  'no-underline';

/**
 * `disabled:` covers the `<button>` form. The `<a>` form has no disabled state by design — a link
 * that cannot be followed should not be a link — so `Button.svelte` refuses `href` + `disabled`
 * together rather than rendering an `<a>` that lies about being interactive.
 */
export const CONTROL_DISABLED =
  'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-disabled ' +
  'disabled:text-fg-disabled disabled:hover:bg-surface-disabled';

export const BUTTON_VARIANT = {
  /** The one action a screen most wants you to take. At most one per view. */
  primary:
    'border border-accent-solid bg-accent-solid text-on-accent hover:bg-accent-hover ' +
    'active:bg-accent-active focus-visible:pm-focus-filled',
  /** Everything else that is still a real action: back, cancel, secondary navigation. */
  secondary:
    'border border-border-strong bg-surface text-fg hover:bg-surface-hover focus-visible:pm-focus',
  /** A text action inside dense content. Still 44px tall, still focus-ringed. */
  quiet:
    'border border-transparent text-accent-fg hover:bg-surface-hover hover:underline ' +
    'focus-visible:pm-focus',
  /**
   * `Mark as reviewed`, and nothing else. It wears the REVIEW family rather than the accent family
   * so the action and the state it produces read as one thing (Handoff section 4 makes pending
   * review the prominent state). Never use it for a generic submit.
   */
  review:
    'border border-review-pending-solid bg-review-pending-solid text-review-pending-on ' +
    'hover:opacity-95 focus-visible:pm-focus-filled',
  /**
   * THE SIGN-IN ACTIONS, and nowhere else.
   *
   * A supplied brand red, identical in light and dark — fill AND ink. Every other family here has a
   * light tone and a dark tone; this one deliberately does not, because the two sign-in buttons were
   * asked to look the same on either workstation.
   *
   * White is the correct ink and not merely the specified one: measured, white on this red is
   * **5.72:1** and black would be 3.67:1, so white clears SC 1.4.3's 4.5 floor and black does not
   * (`docs/spec/contrast-ledger.md`).
   *
   * `border-brand-border` is not decoration. In DARK the fill measures 2.92:1 against the surface —
   * under SC 1.4.11's 3:1 floor for a component's visual boundary — so the button's shape would fade
   * into the page while its label stayed legible. The border is the fill itself in light and a
   * lighter rim at the same hue in dark, which restores the edge without touching the fill.
   *
   * AUTH SURFACE ONLY (**D-20**). This red sits close to the risk-critical family, and a red primary
   * action beside a risk band would put an ACTION and a SEVERITY in one visual language. `/login`
   * renders no patient and `e2e/auth.spec.ts` asserts it, so the collision is unreachable — but that
   * is a property of that screen, not of this class string. Do not use it where a patient appears.
   */
  brand:
    'border border-brand-border bg-brand-solid text-brand-on hover:opacity-95 ' +
    'focus-visible:pm-focus-filled',
} as const satisfies Record<ButtonVariant, string>;

/** Applied when the caller asks for a full-width control; kept here so the spelling is one string. */
export const CONTROL_FULL = 'w-full';

// ------------------------------------------------------------------------------------------------
// Form fields.
//
// These exist for the AUTHENTICATION surface (`/login`, `/account/security`), which renders no
// patient data at all. That boundary is the reason the invalid state below is allowed to borrow the
// risk-critical family: on a clinical screen a red border means "this patient is Critical", and
// reusing it for "this field is wrong" would collide two meanings in one channel (CLAUDE.md rule 8).
// On the auth surface no risk chip, band, or score can appear — `e2e/auth.spec.ts` asserts exactly
// that — so the collision is not reachable. Do NOT use `FIELD_INPUT_INVALID` on a screen that shows
// a patient. Registered as **D-29**.
// ------------------------------------------------------------------------------------------------

export const FIELD_LABEL = 'text-sm font-semibold text-fg';

export const FIELD_INPUT =
  'min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-body text-fg ' +
  'placeholder:text-fg-muted focus-visible:pm-focus';

/** Border weight, not colour, is the primary channel — the message below the field is the real one. */
export const FIELD_INPUT_INVALID = 'border-2 border-risk-critical-border';

export const FIELD_HINT = 'text-sm text-fg-secondary';

export const FIELD_ERROR = 'flex items-start gap-1.5 text-sm font-semibold text-risk-critical-fg';

/** A one-time code: fixed-width digits, generous tracking, never `type="number"` (spinners, locale). */
export const FIELD_INPUT_CODE =
  'min-h-14 w-full rounded-md border border-border-strong bg-surface px-3 text-center font-mono ' +
  'text-2xl tracking-[0.35em] tabular-nums text-fg placeholder:tracking-normal ' +
  'placeholder:text-fg-muted focus-visible:pm-focus';
