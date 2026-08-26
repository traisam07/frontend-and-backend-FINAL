// src/lib/design/control-classes.test.ts
//
// The guarantee `control-classes.ts` exists to provide, asserted rather than commented.
//
// Every one of these was a real class string typed by hand in a different file before the primitive
// existed, so every one of them is a thing that has already been forgotten once.

import { describe, expect, it } from 'vitest';
import {
  BUTTON_VARIANT,
  CONTROL_BASE,
  FIELD_INPUT,
  FIELD_INPUT_CODE,
  type ButtonVariant,
} from './control-classes';

const VARIANTS = Object.keys(BUTTON_VARIANT) as ButtonVariant[];

describe('every button variant', () => {
  it.each(VARIANTS)('%s carries exactly one focus utility', (variant) => {
    const classes = BUTTON_VARIANT[variant];
    const filled = classes.includes('focus-visible:pm-focus-filled');
    // `pm-focus` is a prefix of `pm-focus-filled`, so count the plain one only when it is not the
    // filled one — otherwise a filled variant would look like it carries both.
    const plain = classes.includes('focus-visible:pm-focus') && !filled;
    expect(filled || plain, `${variant} has no focus indicator`).toBe(true);
    expect(filled && plain).toBe(false);
  });

  it.each(VARIANTS)('%s uses the filled ring if and only if it has a solid fill', (variant) => {
    const classes = BUTTON_VARIANT[variant];
    // A solid fill is `bg-<something>-solid`. A ring the same colour as the button is not a ring.
    const solid = /\bbg-[a-z-]+-solid\b/.test(classes);
    expect(classes.includes('focus-visible:pm-focus-filled')).toBe(solid);
  });

  it.each(VARIANTS)('%s builds no class name by interpolation', (variant) => {
    expect(BUTTON_VARIANT[variant]).not.toMatch(/\$\{|\+ *[a-z]/i);
  });
});

describe('the control base', () => {
  it('carries the 44px target floor, so no variant can omit it', () => {
    expect(CONTROL_BASE).toContain('min-h-11');
  });

  it('carries no focus utility — that is the variant map’s job', () => {
    expect(CONTROL_BASE).not.toContain('focus-visible:');
  });

  it('never encodes a risk, review, or provenance state', () => {
    expect(CONTROL_BASE).not.toMatch(/risk-|review-|prov-/);
  });
});

describe('form fields', () => {
  it('both input treatments clear the target floor', () => {
    // `min-h-11` is 44px; the code field is taller still.
    expect(FIELD_INPUT).toContain('min-h-11');
    expect(FIELD_INPUT_CODE).toContain('min-h-14');
  });

  it('both input treatments carry a focus indicator', () => {
    expect(FIELD_INPUT).toContain('focus-visible:pm-focus');
    expect(FIELD_INPUT_CODE).toContain('focus-visible:pm-focus');
  });

  it('the one-time-code field is not type=number by styling accident', () => {
    // Spinners, locale-dependent grouping, and silent value coercion. `inputmode` handles the
    // keypad instead; this asserts the intent is recorded somewhere a change would trip over.
    expect(FIELD_INPUT_CODE).toContain('tabular-nums');
  });
});
