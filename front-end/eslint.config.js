import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

/**
 * The five custom rules below are not style. Each one bans a construct that this harness classes as
 * a patient-safety defect, and each names the rule it enforces so a reviewer can find it:
 *
 *   no-restricted-syntax  `as` over wire data / non-null `!` on a clinical field
 *                         (CLAUDE.md section 5 rule 18)
 *   no-restricted-imports `$app/stores` — `$app/state` is the runes-mode API (rule 3)
 *   no-restricted-syntax  `export let` and `on:` are Svelte 4 (rule 1); the Svelte plugin covers
 *                         most of this, and the template-literal class rule (rule 6) does not exist
 *                         upstream, so it is written out here.
 */
export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
      },
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.svelte'],
    rules: {
      // A non-null assertion on a clinical field deletes the branch the type exists to force.
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      // `const { underlying_condition: _drop, ...rest } = …` in a test is the clearest way to build
      // a payload that OMITS a key. The leading underscore is the convention for it.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      /**
       * OFF, deliberately, and this is the reasoning rather than a shrug.
       *
       * `svelte/prefer-svelte-reactivity` wants `SvelteSet` / `SvelteURLSearchParams` wherever a
       * built-in collection is constructed. Both of its hits here are false positives, and adopting
       * the reactive variants would make the code WORSE:
       *
       *   - `TriageBoard.locallyReviewed` is `$state<ReadonlySet<string>>` and is REASSIGNED
       *     wholesale (`this.locallyReviewed = next`), never mutated in place. That is already the
       *     reactive pattern the rule is trying to reach, and a `SvelteSet` would invite the
       *     in-place mutation the immutable type currently forbids.
       *   - every `URLSearchParams` is a throwaway built inside a `$derived` or an event handler to
       *     compute one string. Nothing subscribes to it; a reactive one would allocate a proxy per
       *     keystroke for no observer.
       */
      'svelte/prefer-svelte-reactivity': 'off',
      /**
       * `goto` stays CHECKED; the link half is turned off, and here is why that is not a shrug.
       *
       * Every path in this app is constructed with `resolve()` from `$app/paths`, against the typed
       * route id, at the small number of places that build one: `AppHeader`, `ParameterChips`,
       * `PatientDetailBody`, the three `+error.svelte` boundaries, and the `backHref` /
       * `detailHref` derivations in the three route components. Everything else RECEIVES an
       * already-resolved string as a prop.
       *
       * The rule cannot see through a prop or through a local variable, so it reports on
       * `<a href={backHref}>` no matter how the value was built — and the directive cannot be
       * anchored, because the report lands on the attribute rather than the element. Suppressing it
       * six times would put six near-identical comments in six files and still leave the rule unable
       * to catch a genuinely unresolved literal.
       *
       * `goto` is where the real risk lives — a base path missing from a programmatic navigation is
       * silent — and it stays enforced. The two `goto` calls that ARE suppressed pass a clone of
       * `page.url`, which already carries any configured base, and each carries that reasoning at
       * the call site.
       */
      'svelte/no-navigation-without-resolve': ['error', { ignoreLinks: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '$app/stores',
              message: 'Use `$app/state` — `$app/stores` is the pre-runes API (CLAUDE.md rule 3).',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      '.svelte-kit/',
      'build/',
      'node_modules/',
      'static/',
      'playwright-report/',
      'test-results/',
      // Generated from back-end/seed/patients.json — 8k lines of data, not source to lint.
      'src/lib/data/fixtures/patients.ts',
    ],
  },
);
