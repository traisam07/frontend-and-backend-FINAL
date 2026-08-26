// src/register.test.ts
//
// `docs/spec/open-questions.md` is the gap register. Every `[UNDEFINED]` the harness meets becomes a
// row there, and `CLAUDE.md` rule 13 requires the UI's unknown treatment to carry that row's id in
// `data-clarify` — "never an invented slug, because the id must resolve to a row".
//
// Nothing checked either half until this file existed, and on 2026-08-19 an audit found three
// numbering defects from a single batch two days earlier: `D-14` and `P-11` had each been reused for
// a second, unrelated question, and `G-51` had been skipped. Two rows sharing an id is the damaging
// one — `CLAUDE.md`, a skill, an agent and a source comment all cited `D-14`, and half of them meant
// the other row. `pnpm check`, `pnpm lint`, 185 unit tests and 111 e2e tests were green throughout,
// because none of them opens a harness document. Same failure mode as `docs/LESSONS.md` L-075, and
// the same remedy: compare the document to something.
//
// What this test proves, and what it does not:
//
//   IT PROVES that no two rows share an id, that every `data-clarify` id reachable in `src/` resolves
//   to a real row, and that every register id cited in a `src/` comment resolves. Those are the three
//   that break silently and that a reader cannot spot by scanning — a duplicate id looks like a
//   normal row, and a dangling `data-clarify` renders a perfectly ordinary unknown state.
//
//   IT DOES NOT PROVE that a row's CONTENT is current, that its Status is right, or that a gap which
//   SHOULD have a row has one. Those need judgement, and `ui-state-auditor` owns them.
//
// Read with `import.meta.glob`, not `node:fs`: this project's `tsconfig` carries no Node types on
// purpose, and adding them so one test can call `readFileSync` would put `process` and `Buffer` in
// scope for every component in `src/` (the same reasoning as `src/declaration-register.test.ts`).

import { describe, expect, it } from 'vitest';

/** Both documents live outside `src/`, so these globs climb out of the Vite root. Raw, never parsed. */
const SPEC_FILES = import.meta.glob('../../docs/spec/*.md', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const fileEnding = (suffix: string): string => {
  const entry = Object.entries(SPEC_FILES).find(([path]) => path.endsWith(suffix));
  if (!entry) throw new Error(`missing spec document: ${suffix}`);
  return entry[1];
};

/** `G-*` / `D-*` / `P-*` — the gap register. */
const REGISTER = fileEnding('open-questions.md');
/** `S-*` / `U-*` — the state matrix. A different document with a different id space. */
const STATES = fileEnding('ui-states.md');

/** Every application module — the tests themselves excluded, so this file's own examples cannot lie. */
const MODULES = import.meta.glob(['./**/*.ts', './**/*.svelte', '!./**/*.test.ts'], {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

/**
 * A row opens a markdown table line: `| G-12 | …`. Anchoring to the line start is what keeps the
 * prose apart from the data — the register cites its own ids in sentences constantly, and a looser
 * pattern would count every one of those as a row and report spurious duplicates.
 */
const ROW_ID = /^\| ([GDP]-\d{2}) \|/gm;
const STATE_ID = /^\| ([SU]-\d{2}) \|/gm;

const rowIds = (): string[] => [...REGISTER.matchAll(ROW_ID)].map((m) => m[1] as string);
const stateIds = (): string[] => [...STATES.matchAll(STATE_ID)].map((m) => m[1] as string);

describe('the register is a register', () => {
  it('reads a plausible number of rows, so a pattern that matches nothing cannot pass quietly', () => {
    // L-050's rule: a verification that matches no line on disk passes by printing nothing. If the
    // table format ever changes, this is the assertion that says so instead of going green.
    expect(rowIds().length).toBeGreaterThan(50);
  });

  it('gives every row a unique id', () => {
    const seen = new Map<string, number>();
    for (const id of rowIds()) seen.set(id, (seen.get(id) ?? 0) + 1);
    const duplicated = [...seen.entries()]
      .filter(([, n]) => n > 1)
      .map(([id, n]) => `${id} appears ${n} times`);

    // Two rows under one id is not cosmetic: every document that cites the id now points at both,
    // and a reader resolves it to whichever they find first.
    expect(duplicated).toEqual([]);
  });
});

describe('every register id the app names resolves to a row', () => {
  const ids = new Set(rowIds());

  it('resolves every `data-clarify` id reachable in `src/`', () => {
    const dangling: string[] = [];
    for (const [path, source] of Object.entries(MODULES)) {
      for (const match of source.matchAll(/data-clarify="([^"]+)"/g)) {
        const id = match[1] as string;
        if (!ids.has(id)) dangling.push(`${path}: data-clarify="${id}"`);
      }
    }

    // CLAUDE.md rule 13. A `data-clarify` that resolves to nothing renders an unknown state whose
    // provenance cannot be looked up, which is exactly the silent decision the attribute exists to
    // prevent.
    expect(dangling).toEqual([]);
  });

  it('resolves every register and state id cited in a `src/` comment', () => {
    // `G/D/P` belong to the gap register and `S/U` to the state matrix. They are separate id spaces
    // in separate documents, and checking a `U-` against the register is how the first draft of this
    // test failed on eleven correct citations.
    const known = new Set([...ids, ...stateIds()]);
    const dangling: string[] = [];
    for (const [path, source] of Object.entries(MODULES)) {
      // Bounded on both sides so a version string, a date, or a token like `oklch(0.75 0.15 228)`
      // cannot masquerade as an id.
      for (const match of source.matchAll(/(?<![\w-])([GDPSU]-\d{2})(?![\w-])/g)) {
        const id = match[1] as string;
        if (!known.has(id)) dangling.push(`${path}: ${id}`);
      }
    }
    expect([...new Set(dangling)]).toEqual([]);
  });
});
