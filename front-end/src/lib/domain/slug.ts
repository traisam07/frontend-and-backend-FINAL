// src/lib/domain/slug.ts
// The parameter slug. There is no parameter id in the schema (**G-03**), so the URL segment is
// derived from the display name, and the derivation is defined once here.
//
// Rules (`docs/spec/screens.md` section 2.1): lowercase, trim, non-alphanumeric runs collapse to a
// single `-`, leading and trailing `-` removed. Nothing else — no transliteration table, no
// stop-word removal, no truncation, because every one of those makes two distinct parameters more
// likely to collide.
//
// A collision INSIDE one reading is a data-integrity error to surface (state U-12), never something
// to disambiguate by guessing — see `slugCollisions` below, which the validator uses to raise it.

/**
 * `Respiratory rate` -> `respiratory-rate`; `PaO2/FiO2 ratio` -> `pao2-fio2-ratio`;
 * `FiO2` -> `fio2`.
 *
 * Unicode-aware: `\p{L}\p{N}` keeps letters and digits from any script, so a non-ASCII parameter
 * name does not collapse to an empty slug. A name that contains no letters or digits at all yields
 * the empty string, which `slugCollisions` reports rather than silently mapping to `/parameters/`.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Every slug produced more than once by the given names, in the order the duplicate was first seen.
 * The validator turns each into an integrity warning (U-12); nothing anywhere picks a winner.
 */
export function slugCollisions(names: readonly string[]): readonly string[] {
  const seen = new Map<string, number>();
  const collisions: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    const count = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, count);
    if (count === 2) collisions.push(slug);
  }
  return collisions;
}
