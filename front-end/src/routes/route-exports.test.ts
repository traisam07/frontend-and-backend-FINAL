// src/routes/route-exports.test.ts
//
// SvelteKit rejects any export from a `+page.ts` / `+layout.ts` outside a fixed set, and the error is
// fatal for the whole route: `Invalid export 'safeNext'` → a 500 where the screen should be.
//
// The reason this needs a test rather than care is that the check runs in the DEV SERVER and not in
// the production build. `pnpm test:e2e` runs against `vite preview` — a production build — so the
// entire suite stayed green while `pnpm dev` was serving a 500 on `/login`. It was found by opening
// the app, which is not a strategy. See `docs/LESSONS.md` L-068.
//
// A helper inside a route module is fine; it just must not be EXPORTED (or must start with `_`).
//
// The sources are read with `import.meta.glob`, not `node:fs`. This project's `tsconfig` deliberately
// carries no Node types — it is a browser application — and pulling `@types/node` in so that one test
// can call `readFileSync` would put `process`, `Buffer` and `__dirname` in scope for every component
// in `src/`. Vite's own primitive does the job with nothing added.

import { describe, expect, it } from 'vitest';

/** SvelteKit's own list, plus the `_`-prefixed escape hatch it documents. */
const ALLOWED = new Set([
  'load',
  'prerender',
  'csr',
  'ssr',
  'trailingSlash',
  'config',
  'entries',
  'actions',
]);

const MODULES = import.meta.glob('./**/+*.ts', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

/**
 * Deliberately a regex over the source rather than a parse. It only has to see the same thing
 * SvelteKit's validator sees — top-level named exports — and a test that needs a TypeScript compiler
 * to run is a test that gets deleted the first time it is inconvenient.
 */
function namedExports(source: string): string[] {
  const names: string[] = [];
  const declaration =
    /^export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  // No `!` on `match[1]`. Under `noUncheckedIndexedAccess` a capture group is `string | undefined`
  // whatever the pattern promises, and asserting it away here would be asserting away the compiler's
  // only view of a regex that someone later edits.
  for (const match of source.matchAll(declaration)) {
    if (match[1]) names.push(match[1]);
  }
  const list = /^export\s*\{([^}]*)\}/gm;
  for (const match of source.matchAll(list)) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name && name !== 'type') names.push(name);
    }
  }
  return names;
}

describe('every route module exports only what SvelteKit allows', () => {
  const entries = Object.entries(MODULES);

  it('finds route modules to check', () => {
    // A refactor that moves the route tree must not turn this into a test that passes over nothing.
    expect(entries.length).toBeGreaterThan(3);
  });

  it.each(entries)('%s', (path, source) => {
    const offenders = namedExports(source).filter(
      (name) => !ALLOWED.has(name) && !name.startsWith('_'),
    );
    expect(
      offenders,
      `${path} exports ${offenders.join(', ')} — SvelteKit refuses the route at runtime. ` +
        'Make the helper module-local, prefix it with `_`, or move it to $lib.',
    ).toEqual([]);
  });

  it('catches the defect it exists for', () => {
    // Verified rather than assumed: this is the exact shape that 500'd `/login`.
    const bad =
      'export function safeNext(raw) {\n  return raw;\n}\nexport const load = async () => ({});\n';
    expect(namedExports(bad).filter((n) => !ALLOWED.has(n))).toEqual(['safeNext']);
  });
});
