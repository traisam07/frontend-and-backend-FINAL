// src/lib/state/prefs.svelte.ts
// CANONICAL DECLARATION — `.claude/skills/svelte5-runes/references/patterns.md` section 3.
//
// NON-PHI CHROME ONLY. This is the one place a module-level `$state` is permitted, because nothing
// here is patient data: the theme is a per-workstation preference with no clinical content. Mutate a
// PROPERTY, never reassign the export, or every subscriber loses its reference.
//
// WHAT THIS NO LONGER CARRIES, so nobody re-adds it from memory.
//
// DENSITY. `comfortable` / `compact` / `wall` shipped as a control and as an attribute on `<html>`,
// and nothing was ever keyed on it: `app.css` contained no `[data-density]` rule, so choosing a
// density changed nothing a clinician could see. A control that reports a state it does not produce
// invites someone to believe the display has been adapted.
//
// TEXT SIZE and TEXT WEIGHT. Removed 2026-08-20 at the product owner's instruction (**D-34**).
// Unlike density these did work, and the CSS behind them was real. They are gone as a product
// decision, not a defect: a ward workstation is shared, the setting was per-browser, and the type
// scale is being settled directly instead of being made adjustable while it is still unsettled.
//
// Either can come back with the stylesheet that implements it, not before (**D-04**).

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'pm-theme';

export const prefs = $state({
  theme: 'system' as Theme,
});

/**
 * Read what the inline `app.html` script already resolved, so the runtime state agrees with the
 * attribute that is on screen. The script runs before first paint; this runs after hydration, and
 * it must not change what is painted.
 *
 * Where the choice persists is a product decision — `localStorage` per workstation is a harness
 * placeholder, pending design confirmation (**D-03**).
 */
export function hydratePrefs(): void {
  if (typeof localStorage === 'undefined') return;
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') prefs.theme = storedTheme;
  // A previously-stored density, text size or text weight is deliberately not read back and not
  // migrated. Those keys are left to expire with the browser profile rather than resurrected into
  // types that no longer exist.
}

export function setTheme(theme: Theme): void {
  prefs.theme = theme;
  if (typeof document === 'undefined') return;

  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  // The attribute is always set to an explicit value, never removed. The stylesheet's dark blocks
  // are keyed on it, and an unset attribute lets the toggle and the OS preference disagree.
  document.documentElement.setAttribute('data-theme', resolved);

  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* a locked-down clinical browser profile may refuse storage; the theme still applies */
  }
}
