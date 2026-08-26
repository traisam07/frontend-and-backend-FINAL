// src/declaration-register.test.ts
//
// CLAUDE.md rule 19: "Exactly one file DECLARES each `src/` module", and the register of declaring
// files is the four tables in `.claude/skills/bootstrap/SKILL.md` section 4. Until this test existed
// the rule was enforced by reading, and it decayed exactly the way an unchecked comment does — see
// `docs/LESSONS.md` L-075, which was written after `patterns.md` was found still declaring a
// `PatientCard` with `selected` / `onselect` / `aria-pressed` that had not existed in `src/` for
// several sessions, with `pnpm check`, `pnpm test` and `pnpm lint` all green throughout. None of the
// three opens a harness document.
//
// What this test can prove, and what it cannot:
//
//   IT PROVES that every module on disk is NAMED in the register, and that every `src/` path the
//   register names still exists. Those are the two halves that go stale on their own — a module
//   added without a row, and a row left behind by a rename or a deletion.
//
//   IT DOES NOT PROVE that a row's CONTENT is current. A prop contract or an export list can still
//   drift from the module it describes, which is the harder half and needs a parse rather than a
//   membership check. It is deliberately not attempted here: a half-parsed TypeScript signature that
//   disagrees with `tsc` would fail on correct code, and a test that cries wolf is a test that gets
//   deleted. Reviewers still read the row; this test guarantees there IS one to read.
//
// The register and the sources are both read with `import.meta.glob`, not `node:fs`. This project's
// `tsconfig` carries no Node types on purpose — it is a browser application — and adding them so one
// test can call `readFileSync` would put `process`, `Buffer` and `__dirname` in scope for every
// component in `src/` (the same reasoning as `src/routes/route-exports.test.ts`).

import { describe, expect, it } from 'vitest';

/**
 * The register lives outside `src/`, so this glob climbs out of the Vite root. It is eager and
 * raw — the markdown is read as a string, never parsed as a module.
 */
const REGISTER_FILES = import.meta.glob('../../.claude/skills/bootstrap/SKILL.md', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const REGISTER = Object.values(REGISTER_FILES).join('\n');

/** Every application module — `.svelte` and `.ts`, excluding the tests themselves. */
const MODULES = import.meta.glob(['./**/*.ts', './**/*.svelte', '!./**/*.test.ts'], {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

/** `./lib/components/RiskChip.svelte` -> `src/lib/components/RiskChip.svelte`. */
const toRepoPath = (globKey: string) => globKey.replace(/^\.\//, 'src/');

/**
 * The register writes `$lib/…` for library modules and drops the extension on `.ts` ones, so one
 * module has several spellings a row may legitimately use. All of them are accepted; what is not
 * accepted is a module that appears under none of them.
 */
function spellings(repoPath: string): string[] {
  const asLib = repoPath.replace(/^src\/lib\//, '$lib/');
  const forms = new Set([repoPath, asLib]);
  for (const form of [repoPath, asLib]) {
    if (form.endsWith('.svelte.ts')) forms.add(form.slice(0, -'.ts'.length));
    else if (form.endsWith('.ts')) forms.add(form.slice(0, -'.ts'.length));
  }
  return [...forms];
}

describe('the declaring-file register in .claude/skills/bootstrap/SKILL.md section 4', () => {
  it('reads the register, rather than passing over an empty string', () => {
    // L-050: this harness has already shipped one register check whose pattern matched nothing and
    // reported green over a register that was short. A guard that cannot fail is not a guard.
    expect(REGISTER.length).toBeGreaterThan(10_000);
    expect(REGISTER).toContain('The register is the FOUR tables together and it is closed.');
  });

  it('finds modules to check', () => {
    expect(Object.keys(MODULES).length).toBeGreaterThan(50);
  });

  // There is deliberately no exemption list. A generated module (`$lib/data/fixtures/patients.ts`)
  // still gets a row — one that says it is generated and names its generator — because "this file is
  // not authored by hand" is exactly the kind of thing the next builder needs told.
  it.each(Object.keys(MODULES).map(toRepoPath).sort())('%s has a register row', (repoPath) => {
    const found = spellings(repoPath).some((form) => REGISTER.includes(form));
    expect(
      found,
      `${repoPath} is in src/ and named nowhere in the register. Rule 19: a module in a harness ` +
        'document and in none of the four tables is the finding — either add its row (naming the ' +
        'file that DECLARES it, which may be the file itself) or, if it is a second copy of ' +
        'something already declared, give it an EXCERPT header instead.',
    ).toBe(true);
  });

  it('names no src/ path that has been deleted or renamed', () => {
    const onDisk = new Set(Object.keys(MODULES).map(toRepoPath));
    const spelt = new Set<string>();
    for (const path of onDisk) for (const form of spellings(path)) spelt.add(form);

    // Paths the register cites as prohibitions or as files outside src/ — they are supposed to be
    // absent, and a check that flagged them would punish the register for being explicit.
    const ALLOWED_ABSENT = /^(src\/lib\/(api|types)\/|src\/app\.html$|\$lib\/data\/adapter$)/;

    const cited = [...REGISTER.matchAll(/`((?:\$lib|src)\/[A-Za-z0-9_\-[\].+/]+)`/g)]
      .map((match) => match[1])
      .filter((path): path is string => typeof path === 'string')
      .filter((path) => /\.(ts|svelte)$|^\$lib\/[\w\-./]+$/.test(path))
      .filter((path) => !ALLOWED_ABSENT.test(path));

    const dangling = [...new Set(cited)].filter((path) => !spelt.has(path)).sort();

    expect(
      dangling,
      'the register names src/ paths that do not exist. A row left behind by a rename points a ' +
        'builder at a file that is not there, which is how a second copy gets written.',
    ).toEqual([]);
  });
});
