# PulseMind — Lessons Learned

Durable, append-only log of mistakes, surprises, and corrections earned on this project.
Operated by the skill `.claude/skills/lessons-learned/SKILL.md` (CAPTURE mode writes here,
RECALL mode reads here). Read that skill before editing this file by hand.

## Rules of this log

1. **Newest first.** New entries go directly under `## Log`, never at the bottom. The seed batch
   `L-001`…`L-023` was written in one pass on 2026-08-16, the first audit batch `L-024`…`L-029` was
   written the same day after the harness audit, the re-audit batch `L-030`…`L-033` the same day
   after the third round, the exported-symbol batch `L-034`…`L-037` the same day after the fourth,
   the repository-reality batch `L-038`…`L-041` the same day after the fifth, when a `back-end/`
   project turned out to have appeared underneath the harness, the prose-versus-code batch
   `L-042`…`L-045` the same day after the sixth, the mandated-literal batch `L-046`…`L-048` the same
   day after the seventh, and the one-state-one-literal batch `L-049`…`L-051` the same day after the
   eighth and final audit round. The first IMPLEMENTATION batch, `L-052`…`L-059`, was written the
   same day after `back-end/` was repaired, the three screens were built, and a 75-agent adversarial
   review found what the green test suite had not — these are the first
   entries earned from running code rather than from reading documents. The responsive-redesign batch,
   `L-060`…`L-063`, was written the same day after the colour system was recomputed and the three
   screens were made to work at 320px — four CSS lessons, all found by one reflow test. The
   authentication batch, `L-064`…`L-068`, was written the same day after a component-reuse audit and
   the build of a sign-in surface with a second factor and passkeys, and `L-069`…`L-070` the same day
   after the app chrome was simplified and the triage board regrouped. `L-071`…`L-072` came from the
   first defect a USER reported rather than a test: a sign-in that failed only in Safari. `L-073` was
   written on 2026-08-17 while adding the display settings, `L-074` the same day after a user
   reported the phone layout breaking at the largest text size, and `L-075` the same day when
   retiring patient-card selection exposed a canonical declaration that had silently drifted from
   the code it declares. `L-076` came the same day from a 502 that looked like an authentication
   defect and was an orphaned dev server. The colour batch, `L-077`–`L-080`, closes the risk-ramp
   rebuild: two entries dated 2026-08-18 for what the D-21 reversal and the teal `Low` actually
   taught, and `L-079` on 2026-08-19 for the dead export those two changes left behind — the first
   entry in this log found by MEASURING a value nothing rendered rather than by reading a document,
   and `L-080` for the formatter that had been quietly breaking the generator's identity guarantee
   the whole time. `L-081`, the same day, is the register's own numbering — three defects from one
   batch, and the first entry whose remedy is a test over a `docs/` file rather than over `src/`.
   `L-082` came the same day from the brand refresh, when a supplied GIF turned out to sit outside
   the reduced-motion rule the app had trusted for everything, and `L-083` from the first two defects
   a product owner found by LOOKING at the board rather than by running anything. `L-084`, on
   2026-08-20, is the first entry about the test harness misreporting a security control, and `L-085`
   the same day is the first found by grepping a build rather than a source tree. Within one date,
   the higher ID is newer.
2. **One lesson per entry.** If you are writing "and also", you have two entries.
3. **Every entry must be actionable.** The `Rule going forward` line must be a single imperative
   sentence that a reviewer can check against a diff. "Be more careful" is not a lesson.
4. **Never append a twin.** Before writing, grep for a near-duplicate. If one exists, update it
   (see promotion rule below) instead of creating a second ID.
5. **Promote what generalises.** A lesson that applies beyond the incident belongs in
   `CLAUDE.md` or in the relevant skill; a lesson that can be checked mechanically belongs in a
   test or a hook. Promote it, then record where in `Enforced by` and keep the entry as the
   rationale trail.
6. **Never delete, never renumber.** IDs are permanent. Retired entries move to `## Archive` at
   the bottom with `(retired YYYY-MM-DD)` appended to the title.
7. **English only**, imperative voice, no filler.
8. **Cite the source.** Handoff rules cite `(Handoff section N)`. Data-contract gaps cite the gap
   ID from `docs/spec/open-questions.md`. Invented decisions say "harness-defined, pending design
   confirmation".
9. **Every path and ID in an entry must resolve.** Cite a real file and a real heading — never a
   directory alone, never an invented rule letter. `docs/spec/` holds exactly `screens.md`,
   `ui-states.md`, `data-contract.md`, and `open-questions.md`; the agents in `.claude/agents/` are
   exactly `svelte-ui-builder`, `svelte-code-reviewer`, `ui-state-auditor`, `a11y-auditor`,
   `data-contract-guardian`, and `handoff-conformance-checker` (see L-024 and L-025).

## Entry format (exact — do not vary)

```markdown
### L-NNN — <short imperative title>

- **Date:** YYYY-MM-DD
- **Category:** svelte | tailwind | a11y | data-contract | spec | process | tooling
- **Context:** what we were doing
- **What happened:** the mistake or surprise, concretely
- **Root cause:** why it happened
- **Rule going forward:** one imperative sentence — this is the part that matters
- **Enforced by:** which skill / agent / hook / test now catches it (or "not yet enforced")
```

`Enforced by` uses these prefixes so the field is greppable:
`doc:` (CLAUDE.md or docs/spec) · `skill:` (.claude/skills/…) · `agent:` (.claude/agents/…) ·
`hook:` (.claude/settings.json) · `test:` (an existing test) · `planned:` (the exact check to add
once application source exists) · `not yet enforced`.

---

## Log

### L-085 — A static import of fixture data ships it to every deployment, including the live one

- **Date:** 2026-08-20
- **Category:** data-contract
- **Context:** Auditing whether the frontend takes all of its patient data from the backend API.
- **What happened:** It does. Every clinical value on screen traces to `GET /patient/all` or to the three fragment endpoints, every field the service does not supply renders a marked unknown, and no clinical value is hard-coded. What the audit found instead was in the bundle. `src/lib/data/source.ts` imported `WIRE_PATIENT_FIXTURES` at module scope, and that module is what both loads call, so the bundler made the fixture data a dependency of the board, the patient detail and the parameter detail routes. A production build put a 162 KB chunk of synthetic patient-shaped records on the critical path of the first clinical screen on EVERY deployment, including one configured for the live service that would never read a byte of it. Nothing was ever displayed from it, so no test could have caught it: the failure is invisible from inside the running app.
- **Root cause:** A module-scope import is a build-time dependency regardless of whether the code path that uses it can ever run. The selector between fixtures and HTTP is a runtime branch, and a runtime branch cannot remove a static import.
- **Rule going forward:** Load a fallback or demonstration dataset with a dynamic `import()` inside the function that uses it, never at module scope, so the chunk follows the code path that needs it rather than the module that mentions it. Check it by grepping the BUILD output for a value only that dataset contains, not by reading the source.
- **Enforced by:** code: `getFixturePatientSource` now awaits `loadFixtures()`, which caches a dynamic import; both `PatientDataSource` methods were already async so the interface is unchanged. Verified by rebuilding and confirming that none of the three clinical route nodes reaches a chunk containing `underlying_condition`, and that the 113 chromium tests, which run the production build on fixtures, still pass.


### L-084 — A dev server answers the port before it compiles a route, so parallel workers race it

- **Date:** 2026-08-20
- **Category:** testing
- **Context:** The `gated` Playwright project, which is the only one that starts `pnpm dev`, after an edit to `app.html` that invalidated Vite's dependency cache.
- **What happened:** A changing subset of the nine gated tests failed on every run and all nine passed with `--workers=1`. The visible symptom was the worst one available: `the gate redirects to sign-in` received the patient board instead of `/login`, so a signed-out request appeared to reach clinical data. That reads as an authorisation defect. It was a build race. `playwright.config.ts` waits on `port: 5174`, and a Vite dev server accepts connections long before it has compiled anything, so all five workers were released against a cold server while `pnpm build` for the chromium project ran in the same directory and regenerated the `.svelte-kit` files the dev server was serving. `PUBLIC_PULSEMIND_REQUIRE_AUTH` intermittently resolved to nothing, and with the gate off the board renders.
- **Root cause:** `webServer.port` proves a listener exists, not that the application works. For a compiled-on-demand dev server those are far apart, and the gap is exactly where a cold-start test run lands.
- **Rule going forward:** Wait on a real ROUTE, never a port, for any dev server under test, and run a project that depends on one with a single worker unless there is evidence it is safe in parallel. When a test failure implicates a security control the change did not touch, suspect the harness before the code.
- **Enforced by:** code: `playwright.config.ts` now waits on `url: 'http://localhost:5174/patients'`, which compiles the layout, the gate and the redirect target before any test starts; code: `pnpm test:e2e` runs the gated project as a second invocation with `--workers=1`, because Playwright has no per-project `workers` option and `fullyParallel: false` only serialises within a file. Verified with three cold runs at 9/9. The reasoning is written beside the project definition so the next person does not "optimise" the extra invocation away.


### L-083 — A fixed grid track sized for one mandated literal is broken by the other

- **Date:** 2026-08-19
- **Category:** css
- **Context:** The triage board's seven-column subgrid, and the S-10 data-sufficiency chip that sits in its DATA column.
- **What happened:** The column was `5rem` — 80px, measured against `Data-limited`, the literal that state renders when `sufficient_data === 'insufficient'`. The SAME slot renders `data sufficiency unknown` when the field is `null`, which is 199px of text that rule and `ui-states.md` section 4 both forbid abbreviating. Held on one line by a `whitespace-nowrap`, it overflowed its track by 119px and painted over `readings at this level` in the next column: one mandated clinical literal covering another, on the row of the patient whose data is least trustworthy. Nothing caught it. The type check was clean, 196 unit tests and 114 e2e tests were green, and the reflow suite stayed quiet because a grid item overflowing INTO a sibling track does not overflow the page. A product owner reported it by eye.
- **Root cause:** The track was sized from one of the state's two literals. A grid item is allowed to exceed its track and simply paints over whatever is next to it, so the failure is silent by construction — unlike a flex row, nothing pushes, wraps, or scrolls to signal it.
- **Rule going forward:** Size a fixed track against the LONGEST literal the slot can render, not the common one, and let the widest case wrap inside its own cell — every state that has more than one mandated literal must be measured at all of them.
- **Enforced by:** code: the DATA column is `9rem` and `InsufficientChip` wraps instead of `whitespace-nowrap` (the fix L-062 already prescribes); test: `front-end/e2e/chrome.spec.ts` — "the data-sufficiency chip never paints over its neighbours", which measures the chip's cell against every other rendered box in the row and requires ZERO overlapping area. Verified by restoring `5rem` and watching it fail.


### L-082 — An animated GIF ignores `prefers-reduced-motion`; only a second file honours it

- **Date:** 2026-08-19
- **Category:** a11y
- **Context:** The product owner supplied `animation.gif` as the loading indicator, replacing the wordmark text on the boot screen and a rotating circle in the navigation bar.
- **What happened:** `app.css` carries a global `@media (prefers-reduced-motion: reduce)` block that collapses every animation and transition to 0.01ms, and it had been the app's whole answer on motion. It cannot touch a GIF. An animated GIF is decoded and played by the image pipeline, not the animation pipeline: there is no CSS property that pauses one, no HTML attribute, and no media query that reaches inside it. The rule that looked like a blanket guarantee silently covered nothing, and every existing test stayed green — the suite asserts the CSS block exists, which was still true.
- **Root cause:** The motion policy was written against the only motion the app had at the time (CSS transitions and one SVG spinner) and was then read as a policy about MOTION. A raster format that carries its own timeline is outside the mechanism entirely.
- **Rule going forward:** When motion arrives as an asset rather than as CSS, honour `prefers-reduced-motion` by SWAPPING THE ASSET — render a still image alongside the moving one and let the media query choose — and never assume a global reduced-motion block covers anything it cannot select.
- **Enforced by:** code: `front-end/scripts/build-brand.mjs` decodes the GIF's first frame to `animation-still.png`, so the still is generated from the moving file and cannot drift from it; code: `$lib/components/PulseLoader.svelte` and `src/app.html` both render the pair and swap in CSS; test: `front-end/src/boot-loader.test.ts` — "carries a still frame beside the moving one in BOTH places", which fails if either site loses the still or the query. doc: the reduced-motion block in `scripts/build-tokens.mjs` now says in the stylesheet itself that it cannot reach the loading mark, so the next reader does not re-derive this the hard way.


### L-081 — An id space with no uniqueness check will reuse an id, and every citation becomes ambiguous

- **Date:** 2026-08-19
- **Category:** process
- **Context:** Resuming work and reconciling `docs/spec/open-questions.md`, whose section 4 rule 1 says "Give it the next free ID in the right block."
- **What happened:** The authentication batch of 2026-08-17 appended rows without checking what was taken, and produced three numbering defects in one pass: `D-14` was reused for "may a form error wear the risk-critical red" while the original `D-14` was "confirm the staleness escalation thresholds", `P-11` was reused for the passkey-ceremony test while the original was the chart projection extensions, and `G-51` was skipped entirely. The duplicates are the damaging half. `CLAUDE.md`, `.claude/skills/tailwind-design-system/SKILL.md` and `src/lib/design/control-classes.ts` all cited `D-14` meaning the auth row, while the register's own coverage table cited `D-14` meaning the thresholds row — one id, two questions, and a reader resolves it to whichever they find first. It survived two days and a full audit round, because every gate in the project is green on a document nobody opens.
- **Root cause:** "Give it the next free ID" is an instruction to a human doing arithmetic across a 200KB file with four separate id blocks. Rule 1 stated the requirement and nothing measured it.
- **Rule going forward:** Give any id space a uniqueness check the moment it has a second author — and check the CITATIONS as well as the rows, because a dangling reference and a duplicated row are the same defect seen from opposite ends.
- **Enforced by:** test — `front-end/src/register.test.ts`, written the same day. It reads `docs/spec/open-questions.md` and `docs/spec/ui-states.md` with `import.meta.glob(…, { query: '?raw' })` and asserts three things: no two rows share an id, every `data-clarify` id reachable in `src/` resolves to a row (`CLAUDE.md` rule 13), and every `G/D/P/S/U` id cited in a `src/` comment resolves to one of the two documents. All three were verified by making each fail on purpose before this entry was written, per L-050. It deliberately does not judge a row's content or status — that is `ui-state-auditor`'s. Note the two id spaces are separate: `G/D/P` live in the register and `S/U` in the state matrix, and conflating them is how the first draft of the test failed on eleven correct citations.


### L-080 — A generated file inside the formatter's root breaks the generator's own identity guarantee

- **Date:** 2026-08-19
- **Category:** tooling
- **Context:** Re-running `node scripts/build-tokens.mjs` to check the committed tokens against the generator, as `CLAUDE.md` section 7 says to.
- **What happened:** The regeneration was correct and the checksum still changed, because `src/app.css` had been Prettier-formatted after the previous generation and the generator emits unwrapped `oklch(...)`. Two costs, neither loud. `pnpm lint` goes red after every regeneration until someone remembers `pnpm format` — a failure that names a stylesheet nobody edited. And `build-tokens.mjs` writes `src/app.css` and `.claude/skills/tailwind-design-system/references/tokens.css` byte-identically from one model, which is the whole basis of section 7's claim that the shipped stylesheet and the reviewer's copy "cannot disagree"; only the first is inside the Prettier root, so formatting silently broke that identity on whitespace. A reviewer diffing the two to check for drift gets noise instead of an empty diff.
- **Root cause:** `.prettierignore` already carried the exactly-parallel case — `src/lib/data/fixtures/patients.ts`, with a comment saying reformatting would make the generator and the committed file disagree — and the second generated file was simply never added when it appeared.
- **Rule going forward:** Add every generated file to `.prettierignore` in the same change that adds the generator, so regeneration is idempotent and the committed file IS the generator's output.
- **Enforced by:** code: `front-end/.prettierignore` now lists `src/app.css` with the reason at the entry; verified by `node scripts/build-tokens.mjs && cmp src/app.css ../.claude/skills/tailwind-design-system/references/tokens.css && pnpm lint`, which is now clean in that order with no `pnpm format` between.


### L-079 — An export that nothing imports is a claim, and two documents will teach it as shipped

- **Date:** 2026-08-19
- **Category:** process
- **Context:** Resuming the D-26/D-28 colour work and checking that `CLAUDE.md` rule 8's chart-mark sentence still matched the code.
- **What happened:** D-26 recorded that the chart marks had been "moved off the chip fills onto the searched ramp's `-border` values", and both `CLAUDE.md` rule 8 and `.claude/skills/tailwind-design-system/SKILL.md` taught it as a non-optional consequence. The vehicle was `RISK_MARK` in `src/lib/design/risk-classes.ts` — exported, and imported by nothing. `RiskHistoryChart` colours every point with one series token and carries data sufficiency by SHAPE, so three documents described a mechanism the rendered app never had. Importing it would have been worse than leaving it: measured, the four `-border` values sit ΔE2000 **3.6 apart under protanopia in the light theme and 1.1 in the dark**, against this project's floor of 15 — in dark mode the four risk bands are one colour. `pnpm check`, `pnpm lint`, 185 unit tests and 111 e2e tests were green throughout, because nothing fails when an export is unused.
- **Root cause:** The decision was landed by ADDING A SYMBOL rather than by changing a call site, and every gate in the toolchain treats an unused export as fine. The prose then documented the symbol's existence as though it were the symbol's use.
- **Rule going forward:** When a document claims the app DOES something, grep for the IMPORTER, not for the symbol — a decision lands at a call site, and an export with no importer is a claim rather than an implementation.
- **Enforced by:** doc: `docs/spec/contrast-ledger.md` section 2.1, which now measures the `-border` set every build and prints **FAIL** beside it; doc: `docs/spec/open-questions.md` **D-30**; code: the map is deleted and `risk-classes.ts` carries the measurement in its place, so the next builder meets the number before the idea. not yet enforced mechanically — an unused-export check (`knip`, or `eslint-plugin-import`'s `no-unused-modules`) would catch the whole class and is the obvious next step.


### L-078 — A colour that simulates to a neutral is not a colour, and a pairwise matrix never asks

- **Date:** 2026-08-18
- **Category:** a11y
- **Context:** The product owner raised the `Low` band and the `Risk level unavailable` chip in the context of green-blind readers (**D-28**).
- **What happened:** Every separation figure the harness had was band-versus-band, and the ramp passed at 18.3. Measured instead against a NEUTRAL of its own lightness, the teal `Low #6abbb9` held ΔE2000 **2.8 under protanopia** and 7.8 under deuteranopia, down from 20.2 with normal vision. It was not a wrong colour to a red-green dichromat; it was not a colour at all. The band that means "this patient is fine" read as an absence while the UNAVAILABLE chip kept a clear blue — so the two states most in need of being told apart were inverted, in exactly the population the ramp had been searched for. A person found it before the validator did.
- **Root cause:** A pairwise separation matrix asks "can these two be told apart?" and never asks "is this one still chromatic?". A hue can clear every pair and still simulate to grey, because its siblings move with it.
- **Rule going forward:** Measure every semantic colour against a neutral of its OWN lightness under each dichromacy as well as against its siblings, and read a low figure there as a hue that has silently joined the disabled/unavailable vocabulary.
- **Enforced by:** doc: `docs/spec/open-questions.md` **D-28** with the figures; code: `front-end/scripts/build-tokens.mjs` ships `Low` at `oklch(0.75 0.15 228)`; doc+code: `docs/spec/contrast-ledger.md` section 1.1, generated by the `chromaticity()` helper added on 2026-08-19, which prints the neutral-reference figure for all four bands under all four vision models on every build. It is ADVISORY and does not fail the build — `Critical` (8.5 protan) and `Medium` (14.2 normal) are genuinely near-neutral and are carried by the word and the glyph, which is a position worth seeing rather than a check worth failing.


### L-077 — A stakeholder's ink preference is a lightness ceiling; compute it before agreeing

- **Date:** 2026-08-18
- **Category:** a11y
- **Context:** The reversal from **D-21** to **D-26**. The product owner asked twice for white type on the risk chips.
- **What happened:** White type at the 4.5:1 text floor caps a fill's lightness near L 0.575. Four bands pushed under one ceiling landed inside a lightness range of **0.095**, leaving hue as the only axis they differed on — and hue is precisely what a red-green dichromat cannot use. High versus Medium measured ΔE2000 **1.2**. The harness implemented the request, measured it, and shipped it marked FAIL in the ledger; the owner then reported that Critical and High looked alike, which is that measurement arriving in a person's eyes. Reversing to a dark ink freed the range to L 0.64–0.96 and the worst pair went to 18.3.
- **Root cause:** "White text on the chips" reads as a taste question, so it was answered as one. It is not: choosing the ink fixes a contrast equation, and that equation bounds every fill the ink can ever sit on.
- **Rule going forward:** When someone specifies the INK on a set of coloured fills, compute the lightness range that ink's contrast floor leaves those fills BEFORE agreeing, and answer with the range rather than with the preference.
- **Enforced by:** doc: `CLAUDE.md` rule 8 — "a band may never be dark again while the ink is dark" is now a standing constraint; doc: **D-21** and **D-26** keep both measurements side by side so the reversal reads as a decision rather than a drift; code: `front-end/scripts/build-tokens.mjs` derives the ink from the fill via `bestInk()` and the ledger prints the verdict every build.


### L-076 — A reused dev server outlives the backend it proxies, and fails as a clinical-looking error

- **Date:** 2026-08-17
- **Category:** testing
- **Context:** Running `pnpm test:e2e` repeatedly while also stopping and starting the demo stack by hand.
- **What happened:** Six gated tests failed with `The sign-in service answered 502` / `HTTP_502` on the sign-in screen. The message names the auth transport, so the obvious reading is that authentication broke — and the change under test had touched neither auth nor the transport. The real cause was a `vite dev` server on :5174, orphaned by an earlier interrupted run. `playwright.config.ts` sets `reuseExistingServer: !process.env.CI` on **all three** servers, so Playwright adopted the orphan instead of starting a fresh one, and the orphan's `/api` proxy pointed at a backend that was no longer there. Killing the backend between runs made it worse rather than better: the orphan is the FRONTEND, and it survives every `pkill` aimed at `node server.js`.
- **Root cause:** `reuseExistingServer` trusts a listening port as evidence that the server behind it is the one this run wants. A dev server is a proxy as well as a compiler, so it can be perfectly healthy on its own port while every upstream call through it 502s — and the app renders that as the named transport failure it was carefully built to render, which is exactly what makes it convincing.
- **Rule going forward:** When a gated/e2e failure names a service the change did not touch, check what is LISTENING before reading any code — `lsof -nP -iTCP:5173 -iTCP:5174 -iTCP:3500 -sTCP:LISTEN` — and clear stray `vite dev` processes, not just backend ones. A clean run means no orphan on any of the three ports, and the suite going from 6 failures to 108/108 with no source change is the signature.
- **Enforced by:** process. A mechanical version would set `reuseExistingServer: false` for the two servers that carry state, at the cost of a rebuild per run; it is not done because the 180 s `pnpm build` in the chromium project is the reason the flag is on at all. Recorded here instead so the next 502 is diagnosed in a minute rather than an hour.


### L-075 — A canonical declaration is only canonical if something compares it to the code

- **Date:** 2026-08-17
- **Category:** process
- **Context:** Retiring patient-card selection after the product owner reversed Handoff sections 3 and 7 (**D-22**), and walking every document that taught the old rule.
- **What happened:** `CLAUDE.md` rule 19 names `.claude/skills/svelte5-runes/references/patterns.md` as the file that DECLARES `PatientCard.svelte` and `triage.svelte.ts`. Both declarations were stale — the card still carried `selected` / `onselect` / `aria-pressed`, and `TriageBoard` still declared `selectedId`, `selected`, `selectionMissing` and `select`, none of which had existed in `src/` for several sessions. The rule that exists specifically to stop two copies drifting had itself drifted, and every check stayed green the whole time: `pnpm check` type-checks `src/`, `pnpm test` runs `src/`, `pnpm lint` formats both but compares neither. The stale copy is the one a fresh agent reads first, so the next builder would have written the retired component back.
- **Root cause:** Rule 19 assigns ownership but nothing verifies it. A "canonical declaration" in prose is a claim about a file the toolchain never opens, so it decays exactly like a comment — silently, and fastest right after the code changes, which is when the claim matters most.
- **Rule going forward:** When a change touches a module whose declaring file is a document, edit the document in the SAME change, not afterwards — and treat "which documents teach this?" as part of the diff, not part of the write-up. The reversal here reached 17 documents (`CLAUDE.md` rule 9, nine sections of `screens.md`, four rows of `ui-states.md`, four skills, four agents); the ones that were nearly missed were the indirect teachers — an agent checklist, a WCAG success-criterion row, a props *idiom* that happened to use `selected` — because grepping for the component name does not find them. Grep for the retired **attribute** and the retired **literal** as well as the module.
- **Enforced by:** test — `front-end/src/declaration-register.test.ts`, written the same day this lesson was. It reads `.claude/skills/bootstrap/SKILL.md` with `import.meta.glob(…, { query: '?raw' })` (no `node:fs`, because this project deliberately carries no Node types) and asserts both directions: every module in `src/` is named in the register, and every `src/` path the register names still exists. Both halves were verified by making each one fail on purpose before the row was written — L-050's rule, applied to its own guard. **It checks membership, not content**: a row whose prop contract or export list has drifted still passes, which is the harder half and is left to review rather than to a half-parsed signature that would fail on correct code. That residue is why this lesson stays open-ended — the reconciliation that produced it found 12 modules with no row at all, plus 6 stale prop contracts and 4 stale export lists that only a human reading caught.


### L-074 — A layout that responds to viewport width alone breaks when the USER scales the text

- **Date:** 2026-08-17
- **Category:** css
- **Context:** A user-selectable text size (100% / 112.5% / 125% on the document root) meeting a phone layout built entirely on `min-width` breakpoints.
- **What happened:** Every multi-column block kept its column count when the text grew, because the count was decided by viewport width and nothing else. At 125% on a 390px phone the two summary cards became 169px-wide columns whose captions wrapped to six lines, and the eight parameter chips fell to one per row, each sized to its own text, leaving a third of the width empty and consuming 45% of the viewport. Combined with a header that wrapped to three rows and a 224px sticky search bar, **42% of an 844px screen was permanently chrome before a single patient appeared** — the app looked broken, and every existing test passed because nothing overflowed.
- **Root cause:** The obvious fix — a smaller breakpoint — cannot work. **`rem` inside a media query resolves against the browser's INITIAL font size and deliberately ignores the `html { font-size }` the app sets**, so a media query is blind to the very setting that caused the problem. The layout needed a rule that reacts to text size, and media queries are not one.
- **Rule going forward:** For anything whose usable size depends on the TEXT it holds, put the threshold in a property where `rem` scales — a track minimum inside `minmax()` on `grid-template-columns`, with `auto-fit`. The minimum then grows with the setting and the column count falls out of it, with no breakpoint to keep in sync. Wrap the minimum in `min(…, 100%)` so a container narrower than it shrinks the track instead of overflowing. Reserve width breakpoints for things that genuinely depend on the device.
- **Enforced by:** code: the summary grid in `front-end/src/routes/patients/+page.svelte` and the chip nav in `ParameterChips.svelte`; tests: `front-end/e2e/responsive.spec.ts` — "the summary cards drop to one column when the text is too large for two", "the parameter chips share rows evenly instead of one per row at larger text", and "enlarging the text does not turn a phone screen into chrome", which measures the whole chrome budget at three text sizes and two phone widths.


### L-073 — A popover cannot escape its parent's stacking context, however high its z-index

- **Date:** 2026-08-17
- **Category:** css
- **Context:** The account menu, opened from the header, once it grew a Display section tall enough to reach the board's sticky search bar.
- **What happened:** The panel carried `z-(--z-popover)` = 300 and the bar `z-(--z-sticky)` = 120, so the panel should have won. It did not: the panel is a CHILD of `<header>`, which has `z-(--z-header)` = 100 and therefore its own stacking context, and a descendant is composited within its ancestor's layer no matter what its own z-index says. Half the display settings rendered behind a translucent, blurred strip and could not be clicked. It was invisible until the panel got tall enough to overlap — the same component had been correct for two shorter versions.
- **Root cause:** The z-index scale was ordered by "how far up the page it floats" (header 100, sticky content 120) rather than by which layer OWNS the other's popovers. Any element that opens a popover must sit above everything that popover can reach.
- **Rule going forward:** Order the scale so chrome that hosts popovers is above page-level sticky content — the two never overlap by position anyway, because the bar sticks to the header's measured height. And assert the outcome by HIT-TESTING (`elementFromPoint`) rather than by comparing z-index values: what matters is what the pointer lands on.
- **Enforced by:** code: `--z-sticky: 100` / `--z-header: 120` in `front-end/scripts/build-tokens.mjs`, with the reason at the tokens; test: `front-end/e2e/chrome.spec.ts` "the account menu paints above the board's sticky search bar", which first asserts the two actually overlap so the test cannot pass vacuously.


### L-072 — An in-process rate limiter makes a long-lived shared test backend flaky

- **Date:** 2026-08-16
- **Category:** testing
- **Context:** The e2e suite reusing whatever backend was already listening on port 3500 — which, during development, was the tunnelled demo.
- **What happened:** The suite went green, then began failing intermittently in exactly the tests that assert failure paths: wrong password, wrong TOTP code. The cause was the sign-in throttle doing its job. Its counters live in the API process's memory, and two of those tests each produce a failed attempt per run, so eight runs inside the fifteen-minute window locked out the account they share. Nothing was wrong with the app; a security control was counting real failures, and the suite was supplying them.
- **Root cause:** Test isolation was assumed from `beforeEach` clearing cookies. Cookies are per-context; the throttle is per PROCESS, and `reuseExistingServer` meant one process outlived many runs.
- **Rule going forward:** State that outlives a test run has to be owned by the run. The demo backend moved to port 3600 so the suite always starts a fresh one on 3500 and every run begins with empty counters. Do not raise the threshold, disable the throttle, or add a retry — that trades a real protection for a green tick, which is what L-065 already said about single-use codes.
- **Enforced by:** config: `front-end/playwright.config.ts` starts its own backend; the demo's `run-demo.sh` binds 3600 with the reason at the line; `front-end/vite.config.ts` takes `PULSEMIND_PROXY_TARGET` so the two never have to share.

### L-071 — A cross-site session cookie fails only in the browsers nobody tests in

- **Date:** 2026-08-16
- **Category:** security
- **Context:** A user reporting that sign-in failed on the login screen after entering correct credentials.
- **What happened:** The app and the sign-in service were on two different Cloudflare tunnel hostnames — two registrable domains — so the session cookie was third-party. Safari blocks those by default, and Firefox's Total Cookie Protection does the same. `POST /auth/login` returned **200**, the browser silently discarded the `Set-Cookie`, the next `GET /auth/session` came back anonymous, and the route gate redirected the clinician back to the sign-in screen they had just completed. **No error was shown, and every automated check was green**: 77 e2e tests, a 25-assertion backend auth suite, and three live end-to-end runs — all in Chromium, where it works. Reproduced in one attempt once WebKit was installed.
- **Root cause:** Two of them, and the second is the worse one. The cause was a split-origin deployment, which the register had already flagged as **G-52** with the correct fix written in it — and the demo shipped the split anyway. The second was that the app treated "logged in" as "the POST returned 200" and never checked that the session actually stuck, so a completely predictable failure produced silence.
- **Rule going forward:** Serve the API under the app's own origin — a path proxy is enough — so the session cookie is first-party and CORS never applies; and when a proxy forwards, strip `Origin`, or the service CORS-checks a request that is no longer cross-origin. Separately: after any sign-in, VERIFY the session before navigating, and name the failure if it did not stick. And when a feature depends on cookie policy, test it in WebKit — Chromium's behaviour is the permissive one and proves nothing about Safari.
- **Enforced by:** code: the `/api` proxy in `front-end/vite.config.ts`; the `SESSION_NOT_STORED` branch in `front-end/src/routes/login/+page.svelte`; test: `front-end/e2e/auth.spec.ts` "a browser that refuses the session cookie is TOLD, not bounced silently", which forces an anonymous `/auth/session` after a successful login; doc: **G-52**, now answered.


### L-070 — Two Playwright reads are two moments; compare in one `evaluate`

- **Date:** 2026-08-16
- **Category:** testing
- **Context:** A board test asserting that the group headings' counts sum to the number of cards on screen.
- **What happened:** The test read the card count with one locator call and the heading counts with another, then compared them. It passed on its own and failed inside the full suite. Nothing was wrong with the page: the two calls sampled it at two different instants, and a board still settling made the sum look short. The same shape had already produced one flake in this suite (a 44px height read before layout finished, L-063's sibling), so this is the second time the cause was "measured at the wrong moment" rather than "the code is wrong".
- **Root cause:** Playwright's auto-waiting makes each call individually reliable and says nothing about two calls being consistent with each other. An invariant that RELATES two quantities has to observe them together.
- **Rule going forward:** When an assertion compares two things on the page, read both inside a single `page.evaluate`. When it measures geometry, wait for a control that must exist and for `document.fonts.ready` first. A test that passes alone and fails in the suite is a measurement bug until proven otherwise — do not add a retry.
- **Enforced by:** test: `front-end/e2e/chrome.spec.ts` reads the card count and the heading counts in one `evaluate`, with the reason written at the call.

### L-069 — Delete a control that controls nothing; do not defer it

- **Date:** 2026-08-16
- **Category:** design-system
- **Context:** The header's display-density selector — `comfortable` / `compact` / `wall` — reviewed while simplifying the app chrome.
- **What happened:** It had a typed union, a `localStorage` key, a rune in `prefs.svelte.ts`, a `data-density` attribute written to `<html>`, and two `<select>`s in the header. It had never had a single CSS rule: `grep -n "data-density" src/app.css` returned only a COMMENT describing how the gating would work. Choosing a density changed nothing a clinician could see, and had done since the day it shipped.
- **Root cause:** The state, the persistence and the control were built first and the stylesheet was left for later, and "later" left behind something that looks finished from every angle except the one that matters. Nothing failed, so nothing reported it.
- **Rule going forward:** A control that reports a state it does not produce is worse than a missing feature — on a clinical display it invites someone to believe the rendering has been adapted for them. Ship the effect and the control together, or ship neither. When auditing, check each preference against the stylesheet or the code that consumes it; a token or attribute with no reader is a finding.
- **Enforced by:** the control, the state, the attribute and the storage key are removed (`front-end/src/lib/state/prefs.svelte.ts`, `AppHeader.svelte`); test: `front-end/e2e/chrome.spec.ts` asserts no `data-density` attribute and no `<select>` survives; doc: `docs/spec/open-questions.md` **D-04** records that it was removed rather than deferred.


### L-068 — The e2e suite runs a production build, so a DEV-only validation error passes every test

- **Date:** 2026-08-16
- **Category:** testing
- **Context:** `src/routes/login/+page.ts` exported a helper, `safeNext()`, used by its own `load`.
- **What happened:** SvelteKit validates the exports of a `+page.ts` against a fixed list — `load`, `prerender`, `csr`, `ssr`, `trailingSlash`, `config`, `entries`, or a name starting with `_` — and refuses anything else with `Invalid export 'safeNext'`. The whole route 500s. That check runs in the **dev server** and not in the production build, and `pnpm test:e2e` runs against `vite preview` — a production build — deliberately, so that what is tested is what ships. So 64 e2e tests, 80 unit tests, a clean `pnpm check` and a clean `pnpm lint` were all green while `pnpm dev` served a 500 on the sign-in screen. It was found by opening the tunnelled app and reading the console.
- **Root cause:** "Test the production build" is the right default and it has a blind spot: every check that exists only in dev. The suite had no path that ever started a dev server.
- **Rule going forward:** For a constraint that only one of the two servers enforces, assert the constraint DIRECTLY rather than hoping a server run catches it. And when a screen is built, load it once in `pnpm dev` before calling it done — the same rule L-053 arrived at for pixels applies to the dev server.
- **Enforced by:** test: `front-end/src/routes/route-exports.test.ts` walks every `+page.ts` / `+layout.ts` and fails on any export outside SvelteKit's list, naming the file and the offending symbol. Verified against the original defect rather than assumed: the same matcher flags `safeNext`.


### L-067 — A safety-critical class string re-typed in seventeen files is a defect waiting for the eighteenth

- **Date:** 2026-08-16
- **Category:** design-system
- **Context:** A reusability audit of the thirty components, run before adding a sign-in screen.
- **What happened:** The audit's headline finding was GOOD — not one component reached into `page`, context, or navigation; every href and callback arrived as a prop, so the components were genuinely reusable. The defect was one level down: seventeen files each hand-wrote their own interactive-control recipe, producing **eleven** near-identical class strings. Two of the repeated fragments were `min-h-11` (the 44×44 target floor) and `focus-visible:pm-focus` (the focus indicator). Both fail silently — a control that omits either looks correct in review, in a screenshot, and in every test that does not specifically measure it.
- **Root cause:** "Reusable" was being read as "takes props and holds no global state". A component can satisfy that completely and still leave every caller re-deriving the same safety-critical styling by hand.
- **Rule going forward:** Audit reuse in both directions. Ask what a component REACHES FOR, and also what every caller has to REBUILD. Where the answer to the second is a WCAG requirement, it belongs in one typed map with a test that fails when a variant loses it — not in a comment asking people to remember.
- **Enforced by:** code: `front-end/src/lib/design/control-classes.ts`, `Button.svelte`, `TextField.svelte`, `FormAlert.svelte`; test: `front-end/src/lib/design/control-classes.test.ts` (every variant carries exactly one focus utility, and the filled ring if and only if the variant has a solid fill) and `e2e/auth.spec.ts` (every visible control on the sign-in screen clears 44px).

### L-066 — A commented-out feature can be a missing file, not a decision

- **Date:** 2026-08-16
- **Category:** backend
- **Context:** Building a sign-in screen on `back-end/`, whose five auth routes were all commented out in `server.js`.
- **What happened:** The harness had recorded this as **G-45** — "is that a deliberate development state, and what is the intended auth posture?" — a scope question for the backend team. It was not. All five auth controllers open with `require('../model/User')`, and `back-end/model/User.js` **was never committed**. Mounting any of those routes threw `MODULE_NOT_FOUND` at load, so the process could not boot. Commenting them out was the only way to start the service. The same defect class as **G-44**, sitting undetected behind a plausible product explanation.
- **Root cause:** A disabled feature was read as an intention. Nobody ran `node -e "require('./routes/auth')"`, which takes one second and answers it.
- **Rule going forward:** Before recording "is this deliberate?" about disabled code, try to ENABLE it. If it throws, the answer is not a scope question and the register row is describing the wrong thing. Amend the row with the cause rather than leaving a design question that will be asked of a team that never made that decision.
- **Enforced by:** doc: `docs/spec/open-questions.md` **G-45**, now carrying the cause; code: `back-end/model/User.js` written for PulseMind rather than reconstructed for the tutorial's five controllers, which stay unmounted.

### L-065 — A single-use code and a parallel test suite are in direct conflict, and the code wins

- **Date:** 2026-08-16
- **Category:** testing
- **Context:** `e2e/auth.spec.ts` under Playwright's `fullyParallel: true`, against the real TOTP service.
- **What happened:** One test failed only when the file ran as a whole, and passed alone. Two tests signed in as the same two-factor account inside the same 30-second step, computed the same code, and the service refused the second as a replay — which is the replay protection working exactly as designed. The tempting fixes were all wrong: widening the acceptance window, dropping the `last_used_step` check, or retrying until the next step (a 30-second sleep in every run).
- **Root cause:** The test suite assumed accounts were shareable. A correctly implemented one-time code makes an account a single-use resource for the length of a step.
- **Rule going forward:** One two-factor account per concurrently-running test, seeded for it. When a security property makes a test flaky, change the test — a weakened check that makes a suite green has removed the protection and kept the reassurance.
- **Enforced by:** code: `back-end/seed/users.js` seeds `oncall` AND `nightshift`, with the reason written at the account; test: `front-end/e2e/auth.spec.ts`, one account per test.

### L-064 — Prettier rewraps a comment, and `eslint-disable-next-line` stops pointing at the next line

- **Date:** 2026-08-16
- **Category:** tooling
- **Context:** Suppressing `svelte/no-navigation-without-resolve` on a `goto()` whose path is already resolved and validated.
- **What happened:** The directive was written as `// eslint-disable-next-line rule -- long explanation…`, and Prettier wrapped the explanation onto three more lines. `next-line` then referred to the second line of the explanation, so the suppression did nothing and eslint additionally reported the directive itself as unused. Two errors from one comment, and the error message for each pointed somewhere the problem was not.
- **Root cause:** `eslint-disable-next-line` is positional, and a formatter is free to move it.
- **Rule going forward:** Keep the directive alone on its own line and put the reasoning in a separate comment ABOVE it. The justification still has to be there — a bare disable is worse than the lint error — it just must not share the line.
- **Enforced by:** code: `front-end/src/routes/login/+page.svelte`; the pattern is now the one used anywhere a disable is justified.


### L-063 — `overflow-x: hidden` on `html` does not make a reflow test pass; it makes it lie

- **Date:** 2026-08-16
- **Category:** css
- **Context:** Chasing the last 26px of horizontal overflow at 320px during the responsive redesign, with `html { overflow-x: hidden }` in `app.css` as a "safety net".
- **What happened:** Two failures compounded. First, the metric: `document.documentElement.scrollWidth - innerWidth` counts content that a legitimate inner scroll container has already clipped, so the parameter table doing exactly what `clinical-a11y` section 5 requires — scrolling inside its own named region — read as a page-level overflow that did not exist. Rewriting the check as "try to scroll the window and see whether it moved" looked like the fix, and it still reported a failure: a `hidden` overflow is not unscrollable, it is only unscrollable *by the user*, and `window.scrollTo(200, 0)` moves it happily. So the clip that was supposed to prevent the bug was simultaneously hiding it from the test and faking the test's failure signal.
- **Root cause:** `overflow-x: hidden` was doing the job of a fix. It converts "content overflows and the user can see that it does" into "content overflows and nobody can reach it" — which is worse for a clinical screen, because the thing beyond the edge is a risk chip, not decoration.
- **Rule going forward:** No `overflow-x: hidden` on `html` or `body`. Wide content scrolls inside its OWN named region with a `tabindex="0"` and an accessible name; anything else reaching the edge is a bug fixed at the source. Measure reflow as two separate questions — does the window actually scroll, and is there an element past the viewport that no ancestor clips.
- **Enforced by:** code: `front-end/scripts/build-tokens.mjs` emits the `html` rule with the ban written into it, so a regenerated stylesheet cannot quietly restore the clip; test: `front-end/e2e/responsive.spec.ts` `pageScrollsSideways` + `unclippedOverflow` at four widths.

### L-062 — A mandated literal that cannot be shortened must be allowed to WRAP

- **Date:** 2026-08-16
- **Category:** design-system
- **Context:** `RiskChip` at 320px, in the S-05 + S-35 pair where it reads `Risk level unavailable · score unavailable`.
- **What happened:** `RISK_CHIP_BASE` carried `whitespace-nowrap`, which is the obvious choice for a chip and correct for every band name. In the unavailable pair the chip measured 317px inside a 262px column and pushed the entire board sideways. Every reflex fix was barred: rule 8 bans abbreviating to C/H/M/L, S-05 and S-35 fix the exact wording, rule 15 bans moving a label into a tooltip, and truncation would assert a shorter, weaker claim than the state matrix mandates. `flex-wrap` on the parent could not help either, because a nowrap child is a single unbreakable item.
- **Root cause:** `whitespace-nowrap` had been placed on the CONTAINER, where it governs the relationship *between* the literals, when what needed protecting was each literal *individually*.
- **Rule going forward:** Put `whitespace-nowrap` on the mandated string itself and let its container wrap. The chip then breaks between its parts at narrow widths with every word intact. The one place the container keeps it is a value and its unit, which rule 15 requires to stay in the same nowrap element.
- **Enforced by:** code: `front-end/src/lib/design/risk-classes.ts` (`flex-wrap` + the reasoning) and `front-end/src/lib/components/RiskChip.svelte` (per-literal `whitespace-nowrap`); test: `front-end/e2e/responsive.spec.ts` reflow at 320px, which fails on exactly this.

### L-061 — `<fieldset>` ignores `min-width: 0`, so the scroll container must be a wrapper

- **Date:** 2026-08-16
- **Category:** css
- **Context:** `TriageFilters` — a segmented radio group whose three labels are the handoff's own words and must not be shortened.
- **What happened:** The fieldset was given `min-w-0 overflow-x-auto` so it could scroll its own labels at 320px. It did not shrink, and it dragged the whole board sideways. A `<fieldset>` carries a UA `min-inline-size: min-content` that an author `min-width: 0` does not reliably beat, so the element sized to its widest content no matter what the flex algorithm was told.
- **Root cause:** Treating `<fieldset>` as an ordinary block. It is one of the elements with UA sizing behaviour that authors cannot fully override.
- **Rule going forward:** When a `<fieldset>` must shrink or scroll, wrap it in a plain `<div class="min-w-0 max-w-full overflow-x-auto">` and leave the fieldset intrinsically sized inside. Do not add `tabindex` to that wrapper when its contents are already tab stops — the radios are, and the browser scrolls the focused one into view.
- **Enforced by:** code: `front-end/src/lib/components/TriageFilters.svelte`, with the reason written above the wrapper; test: `front-end/e2e/responsive.spec.ts` reflow at 320px.

### L-060 — Flex and grid children default to `min-width: auto`, which is how a clinical board overflows

- **Date:** 2026-08-16
- **Category:** css
- **Context:** The responsive pass across Patient Overview, Patient Detail and Parameter Detail.
- **What happened:** Several columns refused to shrink below the width of their longest unbreakable descendant — a patient id, a chip, a table — and every one of them pushed the page sideways at 390px and 320px. The containers all had explicit widths that looked correct.
- **Root cause:** A flex or grid item's `min-width` computes to `auto`, meaning "never smaller than my content", not `0`. The width you set is a *preferred* size; the automatic minimum overrides it.
- **Rule going forward:** Thread `min-w-0` down every layout container on a path that can hold long clinical text, not just the outermost one — the automatic minimum applies at every level, so one unfixed ancestor reinstates the overflow. Pair it with `truncate` only where the text is an identifier that is repeated elsewhere on the screen; never on a mandated literal (see L-062).
- **Enforced by:** test: `front-end/e2e/responsive.spec.ts` reflow assertions at 320 / 390 / 834 / 1512, which is what found each one.

### L-059 — A component that reads `page.url` in a navigation hook must guard BOTH sides

- **Date:** 2026-08-16
- **Category:** svelte
- **Context:** Adding `afterNavigate` route-change focus management to `front-end/src/routes/+layout.svelte`.
- **What happened:** The guard was `if (nav.from?.url.pathname === nav.to?.url.pathname) return;`. The optional chain covers `nav.from` being `null` on the initial enter, but not `NavigationTarget.url` being `null` for a target SvelteKit could not resolve to a route — so every first load logged `TypeError: Cannot read properties of null (reading 'pathname')` to the console. Nothing broke visibly, 43 e2e tests stayed green, and it was found only because a debugging run happened to print `pageerror`.
- **Root cause:** `?.` was applied to the outer object and not to the nullable member one level in, and no test asserted "zero page errors".
- **Rule going forward:** Assert `pageerror` is empty in the e2e tests that load each screen, so a console-only exception cannot pass as green.
- **Enforced by:** code: the defensive reads in `front-end/src/routes/+layout.svelte`; test: `front-end/e2e/detail.spec.ts` "U-12 — a patient with colliding charttimes renders on ALL THREE screens" fails on any `pageerror`.

### L-058 — A mandated literal is per SCOPE, so a shared transport must be told which scope it is in

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Reusing `readJson` in `front-end/src/lib/data/source.ts` for both the three fragment reads and the new `GET /patient/all` board read.
- **What happened:** The helper hard-coded U-06's patient wording (`You do not have access to this patient`) and took a single `notFoundMessage`, into which the board call site passed U-09's literal `No patients in this unit`. A `403` on the BOARD would then have told a clinician they lacked access to *a patient*, and a `404` on the board would have rendered "no patients in this unit" — U-09's copy — as a `PATIENT_NOT_FOUND` error, conflating "the unit is empty" with "the list route is missing". Three of U-04's six mandated lead-ins had also drifted: the `(G-43)` pointer was dropped, and two interpolated "request" where the row says "fragment".
- **Root cause:** One helper served two scopes, and the mandated literals differ *by scope*, not by status code. Sharing the code without parameterising the copy silently merged two states.
- **Rule going forward:** Pass a scope object carrying the mandated wording for every branch whenever one transport helper serves more than one kind of request, and never let a branch hard-code a literal that names "patient" or "unit".
- **Enforced by:** code: the `RequestScope` interface and `fragmentScope` / `LIST_SCOPE` in `front-end/src/lib/data/source.ts`; doc: `docs/spec/ui-states.md` U-04 and U-06. planned: a test asserting each emitted lead-in against the U-04 row verbatim.

### L-057 — A colliding `charttime` makes an ISO instant an invalid `{#each}` key

- **Date:** 2026-08-16
- **Category:** svelte
- **Context:** Keying the risk-history chart, its data table, and the PM-5 provenance chart on `charttime.toISOString()` — which `CLAUDE.md` section 5 rule 4 itself names as an acceptable stable domain id.
- **What happened:** U-12 (colliding `charttime`) is an explicitly supported state, F-1 step 4 forbids deduping, and `orderByChartTimeAsc` deliberately keeps both readings. So the projections emitted two entries with the same `iso`, and Svelte throws `each_key_duplicate` on a repeated key **in production as well as in dev**. SvelteKit's `+error.svelte` boundaries catch LOAD failures, not RENDER failures, so there was no named state at all: `/patients/PT-2008` served an empty `<body>`, and the Overview lost its selected-patient chart. The one patient in the fixture set that exists to prove U-12 was the one patient whose detail screen could not render — and `pnpm check`, 54 unit tests and 37 e2e tests were all green, because no test opened that patient.
- **Root cause:** "Stable domain id" was read as "unique", and for `charttime` under U-12 those are different properties. The rule's own example was the trap.
- **Rule going forward:** Key an `{#each}` over a projection on a key the PRODUCER mints and guarantees unique — `\`${iso}#${ordinal}\`` — never on a clinical field the data contract permits to repeat.
- **Enforced by:** code: `key` on `ChartPoint`, `ChartTableRow` and `ProvenancePoint` (`front-end/src/lib/domain/types.ts`), minted in `front-end/src/lib/domain/derive.ts`; test: `front-end/src/lib/domain/derive.test.ts` "U-12 — colliding charttimes produce UNIQUE {#each} keys in all three projections"; test: `front-end/e2e/detail.spec.ts` opens PT-2008 on all three screens and fails on any `pageerror`. planned: promote to `CLAUDE.md` rule 4 — "stable AND unique; an ISO charttime is not unique under U-12".


### L-056 — Rendering an unavailable state in two sections needs one mandated heading, not two invented ones

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** Building PD-8 (plain-language explanation) and PD-9 (guideline references) in `front-end/src/lib/components/ExplanationSection.svelte`.
- **What happened:** PD-8 and PD-9 are drawn as two side-by-side cards, so when the sufficiency gate closed, each card was given its own heading — and the second one was invented. `Guideline references withheld`, `Guideline references withheld — data sufficiency unknown` and `Guideline references not supplied` do not appear anywhere in `docs/spec/ui-states.md`. S-10 mandates ONE heading for the pair ("the PD-8/PD-9 heading `Explanation withheld`"), and `docs/spec/screens.md` section 4.4 says the treatment *replaces* "the explanation and guideline references" — singular. The invented strings then got asserted in `front-end/e2e/detail.spec.ts`, which cemented an unmandated spelling into the test suite.
- **Root cause:** A two-column LAYOUT was read as two STATES. The matrix mandates literals per state and per slot, and PD-8 and PD-9 are one slot when the gate is closed.
- **Rule going forward:** When a mandated literal names two sections together ("the PD-8/PD-9 heading"), render one region with that one heading — and if a layout needs a second heading, that is a missing matrix row to raise, never a string to write.
- **Enforced by:** doc: `docs/spec/open-questions.md` (G-50, raised for the one branch that genuinely has no literal); code: `front-end/src/lib/components/ExplanationSection.svelte` header comment; test: `front-end/e2e/detail.spec.ts` now asserts that `/Guideline references withheld/` has zero matches. planned: a grep gate that fails when a `.svelte` file contains a heading string absent from `docs/spec/ui-states.md`.

### L-055 — `replaceState` from `$app/navigation` does not update `page.url`

- **Date:** 2026-08-16
- **Category:** svelte
- **Context:** Writing `?q=`, `?filter=` and `?selected=` back to the URL from `front-end/src/routes/patients/+page.svelte`.
- **What happened:** The route contract says selection must not push a history entry, so `replaceState(url, page.state)` looked like the exact tool. It is not: `replaceState` is SvelteKit's SHALLOW-ROUTING primitive. Reading `node_modules/@sveltejs/kit/src/runtime/client/client.js` confirms it calls `history.replaceState` and sets `page.state`, and never touches `page.url`. Every `$derived(page.url.searchParams…)` on the board therefore kept its first-paint value: the address bar showed `?selected=PT-1001` while the card stayed `aria-pressed="false"` and the selected-patient panel stayed empty. Nine e2e tests failed and no unit test could have caught it.
- **Root cause:** Two APIs with the same name do different jobs — `replaceState` the shallow-routing primitive versus `goto(url, { replaceState: true })` the navigation option — and only the second updates the page store.
- **Rule going forward:** Change a query parameter that the UI reads with `goto(url, { replaceState: true, keepFocus: true, noScroll: true })`; reserve `replaceState` from `$app/navigation` for `page.state` alone.
- **Enforced by:** code: the `writeUrl` comment in `front-end/src/routes/patients/+page.svelte`; test: `front-end/e2e/triage.spec.ts` "RULE ONE — clicking a patient card SELECTS ONLY and does not navigate" asserts `aria-pressed` flips, which is what failed. planned: grep for `replaceState(` imported from `$app/navigation` in any route that reads `page.url.searchParams`.

### L-054 — Never write `%sveltekit.head%` inside a comment in `app.html`

- **Date:** 2026-08-16
- **Category:** build
- **Context:** Documenting, in `front-end/src/app.html`, why the theme script must run before the head placeholder.
- **What happened:** The explanatory HTML comment contained the literal token `%sveltekit.head%`. SvelteKit substitutes the FIRST occurrence in the file, so the comment consumed the substitution and the real placeholder survived into the DOM — rendering the raw text `%sveltekit.head%` at the top-left of every page, above the header. It type-checked, built, and passed 37 e2e tests; it was caught only by looking at a screenshot.
- **Root cause:** The placeholder is a plain string replacement over the file, not an HTML-aware transform, so a comment is not a safe place to mention it.
- **Rule going forward:** Refer to SvelteKit's placeholders descriptively in `app.html` comments — "the head placeholder below" — and never spell `%sveltekit.head%` or `%sveltekit.body%` anywhere except the one place each is meant to be substituted.
- **Enforced by:** code: the note in `front-end/src/app.html`. planned: a grep gate asserting each of `%sveltekit.head%` and `%sveltekit.body%` appears exactly once in `src/app.html`; and an e2e assertion that no page body contains a `%sveltekit` substring.

### L-053 — Look at a screenshot before calling a screen finished

- **Date:** 2026-08-16
- **Category:** process
- **Context:** Finishing the three PulseMind screens with `pnpm check` clean, 54 unit tests green and 37 e2e tests green.
- **What happened:** Two user-visible defects survived all of it. A stray `%sveltekit.head%` rendered as text at the top of every page (L-054), and every reading time rendered in the FUTURE — `Assessed as of 21:40 local (in 3 h 1 min)` — because the fixture anchor was a fixed UTC instant that lands ahead of the wall clock in any timezone east of UTC. Both were obvious in one screenshot and invisible to every automated gate, because no test asserted "the page contains no template token" or "no reading time is in the future".
- **Root cause:** Type checks and assertions test what someone thought to assert. A rendering defect that no assertion names is invisible until the pixels are looked at.
- **Rule going forward:** Capture a screenshot of every screen in light and dark before reporting a UI change complete, and read it — a green suite is not evidence that the page renders correctly.
- **Enforced by:** code: `front-end/e2e/shots.spec.ts`, excluded from the default suite via `testIgnore` and run explicitly with `pnpm exec playwright test e2e/shots.spec.ts`; doc: `CLAUDE.md` section 10. planned: add "screenshot reviewed in light and dark" to the definition of done.

### L-052 — A frozen fixture timestamp reads as the future, not as history

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Generating the 30-patient sample unit in `back-end/seed/generate.js` with a fixed anchor of `2026-08-16T14:40:00.000Z`.
- **What happened:** Deterministic generation demands a fixed instant, so the anchor was written as a UTC literal. In a timezone ahead of UTC that instant is in the future, and the board rendered `Assessed as of 21:40 local (in 3 h 1 min)` on every card — a clinical screen stating that its readings had not happened yet. The same set is also unusable a week later, when every card reads "as of last Tuesday" and the 60-minute history looks abandoned.
- **Root cause:** Determinism and legibility pull in opposite directions for synthetic timestamps, and only one of them was designed for.
- **Rule going forward:** Keep the seed file's instants fixed for reproducibility and shift them by one constant offset where the data is consumed — once, at load, never on a timer — so relative spacing is exact and the shift is declared on screen.
- **Enforced by:** code: `rebaseFixtures` in `front-end/src/lib/data/source.ts` and `applySeed({ rebase: true })` in `back-end/seed/apply.js`; UI: `front-end/src/lib/components/SourceBanner.svelte` states the shift on every screen; doc: `docs/spec/open-questions.md` (P-10). planned: a unit test asserting no fixture-derived `charttime` is later than `Date.now()`.


### L-051 — A component that owns a mandated clinical string must be named in the declaring-file register

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** The component half of the declaring-file register in `.claude/skills/bootstrap/SKILL.md` section 4, read against the components the canonical snippets in `.claude/skills/svelte5-runes/references/patterns.md` and `.claude/skills/clinical-a11y/SKILL.md` actually import.
- **What happened:** Six components were imported by canonical declarations and declared in no file — `ProvenanceBadge`, `UnknownInline`, `PatientContextBody`, `RiskGlyph`, `AbsoluteTime`, `PatientDetailBody` — and three of them own strings `docs/spec/ui-states.md` calls non-negotiable: `ProvenanceBadge` owns all four S-12…S-15 badge literals, `UnknownInline` is where S-29's `Model use unknown` and its `data-clarify="G-04"` land, `PatientContextBody` owns S-26's `No recorded comorbidities` and S-36's source-status literal. The register listed them as "the next components to be built", which is true and was not enough: it left an implementer to invent, unreviewed, the file that owns copy the harness forbids them to choose, and an invented component invents its own spelling — the L-044/L-047 failure arriving through a missing file rather than a missing sentence.
- **Root cause:** The register's inclusion rule was "does a document declare this?", because it was built to stop one module being declared twice. A component nobody had declared yet failed that test and dropped out — exactly the components whose absence matters most, because a mandated literal with no named home is a literal whose first author decides its markup, its `data-clarify` marker, and its accessible name.
- **Rule going forward:** Give every component that renders a mandated literal a register row before the first implementation — its prop contract taken from the call site, the exact literals it owns, and an explicit **implementer-authored** marker while no file declares its body — and never leave a mandated string without a named owner.
- **Enforced by:** skill: `.claude/skills/bootstrap/SKILL.md` section 4, the fourth register table ("Implementer-authored components"), which now names all six with prop contracts, the literals each owns, the `data-clarify` element each must carry, and the instruction to move the row into the component table once the body is written; doc: `docs/spec/ui-states.md` section 3 rule 13 (the literal is part of the state, so it must render somewhere named) and section 4, the governing banned-copy list, which is only enforceable against a known owner; skill: `.claude/skills/ui-state-matrix/SKILL.md` section 6, whose audit template opens with "Renders which domain states?" — answerable only for a component the register knows about; doc: `CLAUDE.md` section 5 rule 19. planned: the `P-09` gate extended to fail any backticked mandated literal in `ui-states.md` that no register row claims as owned copy.

### L-050 — A verification command that matches no header form on disk passes by printing nothing

- **Date:** 2026-08-16
- **Category:** tooling
- **Context:** The two commands in `.claude/skills/bootstrap/SKILL.md` section 4 that regenerate and verify the declaring-file register, run for the first time against the files they name.
- **What happened:** The checklist command greps `^// src/lib/|^<!-- src/lib/|^export ` over the non-`patterns.md` declaring files and instructs the reader to confirm that "every `src/lib/…` header it prints has a row in one of the three tables". On disk the component and route declarations are headed `<!-- CANONICAL DECLARATION of src/lib/components/…` and `// CANONICAL DECLARATION of src/lib/…`, which neither alternative matches, so the command prints three `wire.ts`/`types.ts` headers and not one component. Every component row in the register verified vacuously. The section-4 command above it is half-fixed — it matches `^<!-- CANONICAL DECLARATION` but not the `//` form, missing `announcer.svelte.ts`, `risk-classes.ts` and `ReviewChip.svelte` — and both commands name three files where the register has four declaring files, omitting `.claude/skills/bootstrap/SKILL.md` itself.
- **Root cause:** The command was written from the header form the author had in mind rather than from the headers in the files, and nobody ran it. A grep that matches nothing and a grep that matches everything expected are indistinguishable when the expected output is "no findings" — this is L-040's guard-that-cannot-fail and L-045's table-nobody-regenerates arriving together, in the very check written to close them, which makes it the third instance of the class this log records.
- **Rule going forward:** Run every verification command you write, in the session you write it, and paste enough of the real output to prove it matched the thing it verifies — a check whose passing output is empty must be shown failing on a known-bad input before it may be relied on.
- **Enforced by:** skill: `.claude/skills/bootstrap/SKILL.md` section 4, which now tabulates the **four header forms that actually occur on disk** (bare `//`, bare `<!--`, marked `// CANONICAL DECLARATION of`, marked `<!-- CANONICAL DECLARATION of`), runs one pattern matching all of them across all **five** declaring files, and carries the standing instruction "confirm the output is non-empty before you read it" — with the same pattern in its section 8 checklist so the two cannot drift; doc: `CLAUDE.md` section 5 rule 19, which names the same header forms and now lists `.claude/skills/bootstrap/SKILL.md` section 3 (`src/routes/+layout.svelte`) among the non-`patterns.md` declarations it had been missing; doc: this log, rule 9 (every path and ID must resolve — extended in practice to every command). Verified by running the corrected pattern in this session: it prints 134 lines including all nine `CANONICAL DECLARATION` headers, where the old pattern printed three `wire.ts`/`types.ts` headers and no component at all. planned: the `P-09` CI step that runs it and diffs its output against the register in both directions.

### L-049 — Two surfaces that word the same cause differently are two states, not one state with two literals

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** State `U-11` in `docs/spec/ui-states.md`, after L-046 split its hedged single literal into two exact strings — one for PD-2 and the `NO_CURRENT_READING` path, one for the OV-4 card's time slot — and left both attached to the one state id.
- **What happened:** One row now mandated two different strings, and the invariant every downstream file had internalised was "one literal per state id". So each file resolved the contradiction its own way: `.claude/agents/ui-state-auditor.md` and the matrix declared using either literal in the other's slot a FAIL, while section 4's retired-spelling table listed both under a single "any second wording for the zero-readings state" entry — which reads each string as a competing spelling of the other's state. Two files ended up rendering copy that a third called banned, and a literal grep written from any one of them would have failed the components built from the others.
- **Root cause:** The two strings were treated as one state because they share one cause — this patient has no reading with a usable `charttime`. But a state row is a contract about a *slot*, not about a cause: PD-2 says the whole assessment is unavailable, the card's time slot says only that the assessment *time* is, and those are different claims that happen to have the same trigger. Merging them made "one literal per state id" and "state the exact string per surface" mutually unsatisfiable, and every file that tried to honour both had to break one.
- **Rule going forward:** Give every slot that needs its own wording its own state id — if a row's MUST-show column would carry two different literals for two different surfaces, split the row at the next free ID and cross-reference the two — and never list one state's mandated literal as another state's retired spelling.
- **Enforced by:** doc: `docs/spec/ui-states.md` — `U-11` (the whole assessment unavailable, `No assessment available for this patient`, no trailing period) and the new `U-22` (the OV-4 card's time slot, `No reading with a usable timestamp. The assessment time is unavailable.`, both periods), section 3 rule 14 stating in one sentence why they are two states and forbidding a re-merge, and section 4's retired-spelling table, which now carries one row per state and an explicit note that a different state's literal is never a retired spelling; doc: `docs/spec/screens.md` PD-2 and OV-4, and `docs/spec/data-contract.md` F-1.5 and F-14, which name the two ids per surface; skill: `.claude/skills/ui-state-matrix/SKILL.md` section 3 (both rows plus the same one-sentence rule). planned: the `P-09` literal grep, now writable — one exact string per state id, asserted per surface — plus a check that no string in the Mandated-literal column of the retired table appears in the Retired column of another row.

### L-048 — A seam the harness declares mandatory must be constructible from the harness alone

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** `docs/spec/data-contract.md` section 4.3, which makes `PatientDataSource` the only way the app may reach data and forbids improvising the adapter boundary, read against `.claude/skills/svelte5-runes/references/patterns.md` section 7, which declared exactly one factory.
- **What happened:** The single exported factory was the HTTP one, and its `listPatients` always terminates in a named `UPSTREAM_ERROR` citing **G-40** because no list endpoint exists. Three documents said a fixture implementation serves the Patient Overview board meanwhile — the handoff's default/starting screen — but no file declared one, named its export, or said which source a load receives. So the first thing an implementer had to do was invent the one seam the harness insists must never be invented, and every choice they made (module, factory name, how a deployment picks) would have been unreviewable and unmatched by any other file.
- **Root cause:** The harness specified the boundary as an interface and a prohibition, and treated the implementation that actually serves the primary screen as an implied detail. An interface plus a ban is not a construction: the ban is enforceable the moment someone writes code, while the thing that makes obeying it possible existed only as a noun in three sentences.
- **Rule going forward:** For every seam this harness declares mandatory, declare **every** implementation a screen actually depends on — its factory, its module, its exported fixture symbol, and the single selection rule that hands one to a load — in code in the canonical file, and treat "the fixture implementation" named in prose with no declaration as an unfinished specification.
- **Enforced by:** skill: `.claude/skills/svelte5-runes/references/patterns.md` section 7 (`getPatientSource` for HTTP, `getFixturePatientSource`, the selector `resolvePatientSource`, and the `WIRE_PATIENT_FIXTURES` export) and `.claude/skills/bootstrap/SKILL.md` section 6.1 (the two implementations, the one selector, and the WRONG/RIGHT row that fails a load which names an implementation directly); doc: `docs/spec/data-contract.md` sections 4.2–4.4 (which source serves the board, where `toPatientSummary` runs, and the fixture module's single export); doc: `CLAUDE.md` section 3 (the `src/lib/data/` comment now names both implementations and the selector). planned: a `P-09` check that every `PatientDataSource` implementation named in prose resolves to an exported factory in a declaring file, and the fixture-source tests in patterns.md section 10 running once `front-end/` exists.

### L-047 — Prohibition without prescription drifts; ban a wording only beside the wording that must appear

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** The rows of `docs/spec/ui-states.md` that carried only a MUST-NOT list — the carried-forward and unknown-provenance badges, the no-result empty state, the connected-source/input-status state, the parameter-not-in-reading state and the validation-failure state — reviewed against what the canonical components and the two design skills actually render.
- **What happened:** Every row that named a positive literal (`Reviewed · review time not recorded`, `No recorded comorbidities`, `Not measured on this patient`) held one spelling across seven audit rounds. Every row that listed only bans grew a second one: the provenance-unknown badge was described three different ways, the connected-source state had no declared string at all in the file that governs states, and the empty-result state existed as mandated copy in `tailwind-design-system` and as a description in the matrix. This is L-044's defect recurring at scale — the same shape, seven rows further along.
- **Root cause:** A ban constrains a string from one side. The complement of a finite ban list is infinite, so a row with prohibitions and no literal delegates the decision to whoever writes the component, and each author honours the ban and then writes their own wording — which looks like compliance in review, because nothing they wrote is on the list.
- **Rule going forward:** Never add a MUST-NOT wording to a state row without adding the MUST-show literal beside it, one per surface where the state renders, and treat any row whose MUST-show column contains no backticked string as an unfinished row that may not be implemented.
- **Enforced by:** doc: `docs/spec/ui-states.md` section 3 rule 13 (the standing requirement), every load-bearing `S-*` / `U-*` row (each now carries its literal), and section 4, which is the single governing banned-copy list and the superset — the two skills point at it and may add only an explicitly labelled skill-local term; skill: `.claude/skills/ui-state-matrix/SKILL.md` sections 2, 3 and 6 (mirrored cell by cell, one test per non-happy state asserting the exact literal). planned: a `P-09` check failing any row with bans and no backticked literal, plus a grep asserting each mandated literal appears exactly once per declaring file.

### L-046 — A mandated literal with a hedge attached is not mandated

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** State `U-11` in `docs/spec/ui-states.md`, whose MUST-show column read: the single literal `No assessment available for this patient` — that exact wording *(sentence-final punctuation aside)*.
- **What happened:** The parenthesis re-opened precisely the ambiguity the row existed to close. Two spellings — with and without a trailing period — were both compliant, so a test asserting the visible text had to choose one and could not cite the spec for the choice; the skill's working copy carried the same hedge, and a reviewer comparing a component against either file had no ground to reject either string. A row written to end a two-spelling problem had licensed a two-spelling problem in its own sentence.
- **Root cause:** The hedge was added in good faith, to keep the row from looking pedantic about punctuation. But an exact string is a machine-checkable artefact, and every qualifier attached to one converts it back into a description that a human must interpret — the same category of thing the row replaced. "Exact, except…" has no assertable form.
- **Rule going forward:** State every mandated literal as one exact string including its punctuation, and never attach a hedge — "punctuation aside", "or equivalent", "approximately", "in substance" — to a string a test is meant to assert; if two surfaces genuinely need different wording, declare two literals, one per surface, and say which is which.
- **Enforced by:** doc: `docs/spec/ui-states.md` — the hedge is gone and both strings are stated exactly, with their punctuation, on the two rows that now carry them: `U-11` (`No assessment available for this patient`, no trailing period, for PD-2 and the `NO_CURRENT_READING` path) and `U-22` (`No reading with a usable timestamp. The assessment time is unavailable.`, both periods, for the OV-4 card's time slot) — the split itself is L-049; also `S-26` ("no trailing period") and section 4's retired-spelling table, which bans the hedge itself; skill: `.claude/skills/ui-state-matrix/SKILL.md` (the same two rows, and section 6's test rule asserting each literal character for character). planned: the `P-09` literal grep, which cannot be written against a hedged string at all — that is the mechanical form of this lesson.

### L-045 — A reconciliation table is only as good as the discipline that regenerates it

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The symbol-reconciliation table in `.claude/skills/bootstrap/SKILL.md` section 4, written in the fourth audit round to stop a `Patient` / `PatientSnapshot` and `ParseResult` / `Parsed` split from recurring, and re-read against the canonical modules in the sixth.
- **What happened:** The table went stale in the same round it was written. Exports were added to canonical modules after it was generated — the table is a snapshot of a set of `export` statements, and nothing re-derives it — so a builder reconciling an import against it would have been told a symbol that exists does not. The table that was created to detect drift had itself drifted, and it drifts silently, because a missing row looks exactly like a module that legitimately exports nothing new.
- **Root cause:** The table is derived data stored as prose. Deriving it once and hand-maintaining it thereafter puts it in the same category as the duplicated module bodies it was written to police: two artefacts describing one truth, with no mechanism to notice when they disagree.
- **Rule going forward:** Regenerate every reconciliation table from the declaring files in the same change that adds, renames, or removes an export — never hand-patch one row — and treat a table nobody can regenerate mechanically as a defect to automate rather than a document to trust.
- **Enforced by:** doc: `.claude/skills/bootstrap/SKILL.md` section 4 — **both** tables now carry the command that regenerates them (`grep -rho '\$lib/[a-zA-Z0-9_./-]*' ../.claude | sort -u` for the import paths, `grep -nE '^// src/lib/|^export ' …patterns.md` for the symbol table) plus the standing instruction to rebuild the column rather than edit a cell; doc: `CLAUDE.md` section 5 rule 19, which now names every declaring file the register must list, including the components declared in `clinical-a11y` and `tailwind-design-system` (check the table before adding any code block to a document). The residual gap was that nothing *ran* either command; running them in the eighth round showed the second one matched no component header at all, which is **L-050** — read that entry for the corrected pattern before trusting either command here. planned: a `P-09` CI step that extracts every `export` and every declaration header from the declaring files and diffs it against the register, failing on either direction.

### L-044 — A state that lists only banned wordings will drift; every state needs a mandated literal

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** State `S-10` in `docs/spec/ui-states.md`, whose `null`-sufficiency branch banned `data sufficiency unavailable` and `unknown data` without naming the string that must be rendered in the explanation heading.
- **What happened:** Two skills and the canonical component file ended up with three different headings for the same slot — `Explanation withheld — data sufficiency unknown` in `.claude/skills/clinical-a11y/SKILL.md`, `Data sufficiency unknown — risk score is not reliable` in `.claude/skills/tailwind-design-system/SKILL.md`, and the banned `Explanation withheld — data sufficiency unavailable` in the canonical component. Every author had honoured the prohibition they read and then written their own positive wording, because the row gave them nothing to copy.
- **Root cause:** A prohibition constrains a string from one side only. The set of wordings that are not banned is infinite, so a row with bans and no mandated literal delegates the decision to whoever writes the component — which is exactly the silent choice the state matrix exists to prevent, arriving as copy rather than as behaviour.
- **Rule going forward:** Give every state a positive MUST-show literal in `docs/spec/ui-states.md`, one per surface where it renders, and treat a row that carries only a MUST-NOT list as an unfinished row.
- **Enforced by:** doc: `docs/spec/ui-states.md` — S-10's four mandated headings, and, since the seventh round, a positive mandated literal in **every** load-bearing row (S-05, S-12…S-15, S-17, S-19, S-26…S-29, S-35…S-38, U-03, U-04, U-06, U-09, U-11, U-13, U-14, U-20, U-21, U-22), section 3 rule 13 making that a standing requirement, and section 4's retired-spelling table, now the governing superset; skill: `.claude/skills/ui-state-matrix/SKILL.md` sections 2 and 3 (mirrored cell by cell) and section 6 ("one test per non-happy state asserting the **exact mandated literal**"). planned: a `P-09` check that fails any `S-*` / `U-*` row whose MUST-show column contains no backticked literal, and a grep for each mandated literal across `src/` and the harness.

### L-043 — `res.ok` is true for `204`, so branch on the status before reading any body

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** The canonical HTTP `getPatient` in `.claude/skills/svelte5-runes/references/patterns.md` section 7, against the `204` not-found path the backend actually returns (`docs/spec/data-contract.md` section 4.1 defect 3, **G-42**).
- **What happened:** `Response.ok` is `true` for every status in 200–299, `204` included, so the usual `if (!res.ok) throw …; return res.json();` shape sends the not-found response straight into `res.json()`. The body was discarded in transit, so parsing an empty string throws `SyntaxError: Unexpected end of JSON input` — a registered, named ambiguity (`PATIENT_NOT_FOUND`) converted into an unnamed exception on a triage screen, which is the one outcome every rule in this harness is arranged to prevent.
- **Root cause:** `res.ok` reads as "the request succeeded", and it does mean that; it says nothing about whether a body exists. The failure is invisible in review because the code looks like the idiom everyone writes, and invisible in a fixture-backed test suite because no fixture ever returns `204`.
- **Rule going forward:** Branch on `response.status` before reading any body — `204` to `PATIENT_NOT_FOUND`, `400` to `UPSTREAM_ERROR` (the live backend's `req.params.id` defect, **G-43**), `403` to `FORBIDDEN`, every other non-2xx to `UPSTREAM_ERROR` — and never let `res.ok` alone decide that a body can be parsed.
- **Enforced by:** doc: `docs/spec/data-contract.md` section 4.3 (the status table, branch-before-body, stated as the implementation's contract); doc: `docs/spec/ui-states.md` section 3 rules 2 and 9; doc: `docs/LESSONS.md` L-041 (the same defect seen from the backend's side); agent: `data-contract-guardian`; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, which now carries that test — `a 204 is PATIENT_NOT_FOUND, and never an exception on an empty body` — beside the timeout and fixture-source tests. planned: running it, which needs `front-end/` to exist.

### L-042 — Updating the prose and leaving the code is the most dangerous half-fix in a harness

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The fifth audit round corrected the transport contract in `docs/spec/data-contract.md` section 4 — three fragment endpoints, no list endpoint, composition inside `src/lib/data/source.ts` — while the canonical adapter that section points at, `.claude/skills/svelte5-runes/references/patterns.md` section 7, was left untouched.
- **What happened:** The spec forbade inventing endpoints; the adapter it named as the implementation went on fetching `/api/patients` and `/api/patients/{id}`, neither of which exists on the backend or anywhere else. Following the harness's own pointer chain — `CLAUDE.md` rule 19 to patterns.md as canonical for all code, and data-contract section 4.3 to the same file as the implementation — landed a builder on two invented endpoints, with the corrected prose one document away and never read, because the code block is the thing you copy.
- **Root cause:** Prose and code are read by different acts. A spec is read to decide what to do; a code block is read to be pasted. Fixing only the prose therefore fixes only the decision nobody was making — the paste happens either way — and the two artefacts look consistent to a reviewer who reads the file that was updated.
- **Rule going forward:** When a rule changes, edit the canonical code block in the same change as the prose, and treat any spec sentence naming a declaring file as a checklist item that the named file was opened and reconciled.
- **Enforced by:** doc: `CLAUDE.md` section 5 rule 19 (one declaring file per module; every other appearance is a marked EXCERPT, so there is exactly one block to edit); doc: `docs/spec/data-contract.md` section 4.3 (the transport contract now states the status branching, the fragment composition and the endpoint-less `listPatients` as the implementation's contract rather than as prose about it); doc: `docs/LESSONS.md` L-037 (the same directional drift in provenance tags). planned: a `P-09` link check that resolves every "canonical declaration:" pointer and fails when a declaring file's endpoints, symbols, or literals contradict the spec section that names it.

### L-041 — An empty HTTP response cannot carry a reason; `204` with a JSON body discards the body

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** The not-found path in every handler in `back-end/controllers/patientController.js`, read against `docs/spec/ui-states.md` section 3 rules 2 and 9.
- **What happened:** Each handler answers a missing patient with `res.status(204).json({ message: … })`. HTTP 204 means *No Content*: the body is discarded, so the client receives an empty 204 and never sees the message. On a triage product that collapses "no such patient" (`U-13`), "the unit is genuinely empty" (`U-09`), "you do not have access" (`U-06`) and "the backend failed" (`U-04`) into one silent outcome — the exact ambiguity the state matrix exists to forbid, arriving from the transport instead of from a `catch` block.
- **Root cause:** `204` reads as "success, nothing to say", and `.json()` after it compiles, runs, and logs nothing; the body's disappearance is invisible at every stage except the client, which is the one place nobody was looking.
- **Rule going forward:** Never let an empty HTTP response carry meaning — map a `204` on a patient read to an explicit named state, never to an empty list, an empty snapshot, or a `catch` that resolves to one, and register the status-code question rather than inferring the reason from emptiness.
- **Enforced by:** doc: `docs/spec/ui-states.md` section 3 rule 2 (five visibly distinct empty/error treatments) and rule 9 (every failure path terminates in a named visible state); skill: `.claude/skills/ui-state-matrix/SKILL.md` section 1 rows 4–8 and the section 5 `catch (e) { patients = [] }` anti-pattern; agent: `data-contract-guardian` (a backend defect becomes a register row, never an edit); doc: `docs/spec/open-questions.md` **G-42**, the row asking the backend to answer a missing patient with `404` plus a typed error body, and **G-30**, which standardises that envelope; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, the test asserting a `204` maps to `PATIENT_NOT_FOUND` and never to an empty result. planned: running that test once `front-end/` exists.

### L-040 — A guard that cannot fail is not a guard; write the check against the path the thing lives at

- **Date:** 2026-08-16
- **Category:** tooling
- **Context:** The precondition in `.claude/skills/bootstrap/SKILL.md` that refuses to scaffold when a project already exists.
- **What happened:** The check listed the **repository root** for a `package.json`. The frontend was always going to live one directory down, and the only `package.json` in the repository belongs to `back-end/` — so the guard passed on precisely the repository it was written to reject, and would have gone on passing after the frontend existed. Its green result was read as "safe to scaffold" right up to the point where a pnpm project would have been created over an existing npm one.
- **Root cause:** The predicate was derived from a sentence — "the project lives at the repository root" — that was itself an unchecked assumption, and a guard is never exercised in the state it exists to catch, so a predicate that can only return "clear" looks identical to one that works.
- **Rule going forward:** Write every precondition against the exact path the thing lives at — `front-end/package.json`, never a bare root listing — and prove the guard once by running it against a tree it must reject.
- **Enforced by:** skill: `.claude/skills/bootstrap/SKILL.md` (its precondition now tests `front-end/package.json`, owned by this round's bootstrap fixer); agent: all six in `.claude/agents/` test for `front-end/src/` and state that `back-end/package.json` is not evidence the frontend exists. planned: a `P-09` CI step that runs each precondition against a fixture tree it must reject, and fails when the guard passes.

### L-039 — Read the transport before specifying the data source; the backend's read model is the contract, not the screen list

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Reading `back-end/routes/api/patient.js` and `back-end/controllers/patientController.js` for the first time, against a `PatientDataSource` that had been specified from `docs/Handoff.pdf` alone.
- **What happened:** The live read model is three **fragment-shaped** GETs on one patient — `/patient/info/:patient_id` (demographics + `underlying_condition`), `/patient/warning/:patient_id` (the `warning_status` object), `/patient/reading/:patient_id` (the `readings` array) — and **no list endpoint is mounted at all**: `getAllPatient` is exported but routed nowhere and references an undefined `Patientatient`. So `getPatient(patientId)` is three calls something must compose, and Patient Overview — the screen the handoff calls the default/starting screen — has no data source whatsoever. None of that was discoverable from the handoff, and none of it was in the contract.
- **Root cause:** The contract was written from the screens down and never from the transport up, so it described the shape the UI wanted rather than the shape the wire has. A frontend spec that never reads the server is a spec about an imaginary server.
- **Rule going forward:** Read the actual transport before specifying a data source, enumerate both the endpoints that exist and the ones that do not, and absorb the fragment shape in the adapter so no component ever learns the wire is fragmented.
- **Enforced by:** agent: `data-contract-guardian` (Read-first items 2 and 3 name `back-end/model/Patient.js` and the live routes; procedure step 1 rebuilds the field inventory from three sources); agent: `handoff-conformance-checker` and `ui-state-auditor` report a screen the backend cannot feed as `deferred` against its register row, never as a missing component; doc: `docs/spec/data-contract.md` section 4 — the `PatientDataSource` re-specification with the adapter named as the seam (4.3), the no-list-endpoint rule (4.2) and the fixture rules (4.4); doc: `docs/spec/open-questions.md` **G-40**…**G-49**; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 7 and `.claude/skills/bootstrap/SKILL.md` section 6.1, which declare **two** implementations — `getPatientSource` (HTTP) and `getFixturePatientSource` — plus the one selector `resolvePatientSource`, so the fixture-backed `listPatients()` is constructible rather than promised. planned: nothing further here; the remaining work is the backend's.

### L-038 — Re-verify every filesystem claim in the entry-point document; a repo map is read forever and checked never

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The fifth audit round, opened by finding a `back-end/` Node/Express + Mongoose project in a repository whose `CLAUDE.md` section 3 still read "**Exists today:** `docs/Handoff.pdf`, `docs/patientSchema.js`, plus the harness itself … There is **no `src/`, no `package.json`, no git repo yet.**"
- **What happened:** The one document every agent loads on every turn asserted a filesystem fact that had stopped being true. `back-end/` had appeared after the harness was written, carrying its own `package.json`, its own npm toolchain, and the only real description of the transport in the repository. Because the map was trusted, the frontend was about to be scaffolded over an existing npm project at the repository root, and the backend's read model was never consulted while the data contract was being written.
- **Root cause:** A repo map is written once, from a directory listing taken that day, and then read forever; nothing re-reads it against disk, and a stale fact in the entry-point document is indistinguishable from a current one — it is asserted in the same voice as the rules around it.
- **Rule going forward:** Re-verify every filesystem claim in `CLAUDE.md` against a directory listing taken in the same turn before relying on it or repeating it, and phrase each claim as the path it asserts so a check can test the path rather than the sentence.
- **Enforced by:** agent: all six files in `.claude/agents/` now open with a "Repository layout" paragraph naming `front-end/` as the app root and `back-end/` as read-only, so no agent inherits the empty-repo assumption; doc: `CLAUDE.md` section 3, rewritten to the three projects that exist (the harness, `back-end/`, `front-end/`) and to what `back-end/` actually serves; hook: `.claude/settings.json` denies `Edit(back-end/**)` and `Write(back-end/**)` outright, so the read-only claim is enforced and not merely asserted; doc: this log, rule 9. planned: a `P-09` link-check that fails when a path `CLAUDE.md` asserts exists is absent from disk — or a path it asserts is absent is present.

### L-037 — Provenance drift is directional: copy the carve-out with the rule, or do not copy the rule

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The fourth audit round, comparing the anti-requirements list in `.claude/skills/pulsemind-spec/SKILL.md` section 7 against its origin in `docs/spec/screens.md` section 9, and every `(Handoff section N)` claim in the harness against the handoff extract.
- **What happened:** The skill's list was the screens list with all three of its parenthetical provenance carve-outs deleted. "Which clocks may tick" sat under a heading reading "Prototype fidelity (Handoff sections 1 and 9)"; the no-computed-age rule sat under "Clinical invention (Handoff section 8)"; the whole Interaction block, which mixes two handoff items with an `[UNDEFINED]` one (**G-38**) and three `[HARNESS]` ones, carried no tag at all. The same one-directional loss had happened in `.claude/skills/tailwind-design-system/SKILL.md` section 5.2 and in the release gate's own Part 2 table. Not once in the harness did a rule travel the other way and pick up a `[HARNESS]` label it did not have — because the label lives in a parenthesis and a parenthesis is what a copy edit drops.
- **Root cause:** A rule and its provenance are stored at different grammatical ranks: the rule is the sentence, the provenance is an aside. Copying preserves sentences and loses asides, and the result is not merely unlabelled — it is *promoted*, because the destination usually sits under a heading that names a handoff section. Nothing in the harness fails when a HARNESS rule becomes a HANDOFF one; it just stops being reviewable.
- **Rule going forward:** Copy the parenthetical carve-out with the rule or do not copy the rule at all, and never place an untagged rule under a heading that cites a handoff section — every mixed heading and every mixed table cell must name its `[HARNESS]` half inline, the way `docs/spec/ui-states.md` "Mixed rows must say so" requires.
- **Enforced by:** doc: `docs/spec/screens.md` section 9 (the three carve-outs, plus the lockstep note naming `.claude/skills/pulsemind-spec/SKILL.md` section 7); skill: `.claude/skills/pulsemind-spec/SKILL.md` section 7 (the same carve-outs, ported verbatim); doc: `docs/spec/ui-states.md` Source-column vocabulary, "Mixed rows must say so"; agent: `handoff-conformance-checker` (Part 1 items 1, 2, 6, 7 and 9, and the Part 2 `Selected item` row, now name their HARNESS halves the way the `Drawer open/closed` row already did). planned: a check that extracts every `(Handoff section N)` and `[HANDOFF …]` claim in the harness and diffs the rule it is attached to against the handoff text.

### L-036 — Break a domain tie-break explicitly; sort stability is not a specification

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** The canonical F-1 latest-reading helper in `.claude/skills/svelte5-runes/references/patterns.md` section 2, read against `docs/spec/data-contract.md` rule `F-1` step 4 and `.claude/skills/pulsemind-spec/SKILL.md` section 5.1 step 4.
- **What happened:** The helper sorted **descending** with `toSorted` and took element `[0]`. `toSorted` is stable, so for two readings carrying an identical `charttime` the one appearing **earlier** in the source array won — the exact opposite of F-1 step 4, which keeps the later one and raises a `U-12` integrity warning. The data contract's own RIGHT snippet sorts ascending and takes `.at(-1)`, which yields the later element, so two reference implementations of one rule disagreed while both compiled, both read as correct, and neither detected the collision the contract requires a fixture for.
- **Root cause:** Stability is a property of the sort algorithm, not of the domain rule, and "sort then take an end element" hides which of two equal elements is being taken — so the tie-break was never written down in code at all, only in prose one document away.
- **Rule going forward:** Break every domain tie explicitly on the field the spec names — capture the source index and compare it as the final key in the comparator — and never let sort stability, `[0]`, or `.at(-1)` stand in for a tie-break rule.
- **Enforced by:** doc: `docs/spec/data-contract.md` rule `F-1` step 4; skill: `.claude/skills/pulsemind-spec/SKILL.md` section 5.1 step 4 (tie broken on the source index, never on sort stability); doc: `CLAUDE.md` section 6, the "Reading" row; agent: `data-contract-guardian` procedure step 6; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, which carries that test — `on a charttime collision the LATER reading in the source array wins (F-1.4)`. planned: running it once `front-end/` exists.

### L-035 — A reconciliation check only catches the class it was written for; name the adjacent class in the same commit

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The `$lib/` module reconciliation table added to `.claude/skills/bootstrap/SKILL.md` section 4 in round three, which closed the import-path drift class between the skills and the bootstrap file tree.
- **What happened:** The table reconciled module **specifiers**, path by path, and passed. One screen away in the same file, `PatientDataSource` imported `Patient` and `ParseResult` — two symbols the canonical `src/lib/domain/types.ts` does not export. The check written to catch drift between two files sat beside the drift it structurally could not see, and its green result was read as coverage of the whole boundary.
- **Root cause:** A checklist encodes the shape of the last defect. The next one hides in the adjacent dimension of the same boundary — path, then exported symbol, then member name, then literal string — and each dimension needs its own inventory; passing the previous one says nothing about the next.
- **Rule going forward:** When you add a reconciliation check, write down in the same commit the adjacent class it does **not** cover and add that check too — beside a module-path table, that is an exported-symbol inventory listing the symbols each `$lib/` module must provide.
- **Enforced by:** agent: `data-contract-guardian` procedure step 2 (diffs each layer against its own canonical document and reports any symbol a `$lib/` module is imported for but does not export); skill: `.claude/skills/bootstrap/SKILL.md` section 4, where the exported-symbol table now sits beside the `$lib/` path table with its own regeneration command and its own "Canonically declared in" column; skill: `.claude/skills/lessons-learned/SKILL.md` promotion rule, row "The lesson names a **defect class**". planned: `pnpm check` over the scaffolded `src/`, which is what turns the table from a document into a check.

### L-034 — One module, one canonical definition, in one named document — the unit of authority is the exported symbol, not the file path

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Reconciling `src/lib/domain/types.ts`, which `docs/spec/data-contract.md` section 1 and `.claude/skills/svelte5-runes/references/patterns.md` section 1 each declared canonical, in a harness where `CLAUDE.md` section 7 routes type work to the first and every Svelte task loads the second.
- **What happened:** One module had two complete, incompatible definitions: two `export interface Reading` and two `export interface ParameterReading` with different member names and different value types (`IsoDateTime | null` vs `Date | null`), four pure synonym unions (`ParameterSource`/`Provenance`, `SufficientData`/`Sufficiency`, `ReviewState`/`ReviewStatus`, `ParseResult`/`Parsed`), and `Patient` versus `PatientSnapshot`. Each document was internally consistent and each read as authoritative, so three audit rounds — which reconciled file paths, then module specifiers — passed straight over it. The break is real and mechanical: the reference `PatientDataSource` imports two symbols the canonical types module never exports, so the first `pnpm check` after scaffolding fails on the first module written.
- **Root cause:** Authority was claimed per **file path**, and two documents can both be right about the path while describing different layers — the validated wire shapes and the domain shapes — with nothing in either naming which layer it owns. Identical entity names across the two layers turned a layering question into a duplicate-identifier error. This extends L-026, which requires one authority file per cross-cutting decision: here both files *were* authorities, for different things, and only an exported-symbol inventory could show it.
- **Rule going forward:** Give every module exactly one canonical definition in one named document, name the file and the layer in that document's first sentence with a pointer to the other layer's document, and keep the layers' entity names disjoint — prefix every validated-wire entity `Wire` — so a collision surfaces as a compile error instead of as a reading error.
- **Enforced by:** doc: `CLAUDE.md` section 3, "One module per layer, one canonical definition each" (and the retired-names list); doc: `docs/spec/data-contract.md` section 1 (the validated wire layer, `Wire*`, `src/lib/data/wire.ts`); skill: `.claude/skills/svelte5-runes/references/patterns.md` section 1 (the domain layer, `src/lib/domain/types.ts`); agent: `data-contract-guardian` procedure step 2. planned: `pnpm check` over the scaffolded `src/`, and a grep gate on the retired names `ParameterSource`, `SufficientData`, `ReviewState`, `ParseResult`, `PatientViewModel`, `Maybe<`.

### L-033 — Re-grep the whole repository after fixing a defect class; the last instance is the one that ships

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The third audit round over the PulseMind harness, run after round two reported a class of fixes applied "everywhere" across nine disjoint file-set owners.
- **What happened:** Both round-3 blockers were the single surviving instance of a class round two had fixed in every other file. `raw.underlying_conditions` in `.claude/skills/svelte5-runes/references/patterns.md` was the last plural wire key in the harness (L-031), and `src/routes/patients/[patientId]/+page.ts` was the last route file still carrying a load a child route depended on (L-030). Each read as correct in isolation, each sat in a file assigned to a different owner from the one who fixed the class, and each was copy-paste reference code — so the defect would have shipped verbatim into `src/`.
- **Root cause:** A class gets declared fixed when every instance the fixer *owns* is fixed, and disjoint file ownership guarantees that instances in other owners' files are never inside the grep that closes it; the closing grep is scoped to the same file list as the edit.
- **Rule going forward:** After fixing any defect class, re-grep the entire repository — including files you do not own — and report every surviving instance by path to its owner before treating the class as closed.
- **Enforced by:** skill: `.claude/skills/lessons-learned/SKILL.md` promotion rule, row "The lesson names a **defect class**". planned: the `docs/spec/open-questions.md` P-09 verify gate, whose documentation link check and `data-clarify` enumeration run over the whole harness rather than one owner's file set.

### L-032 — Adding a nullable member to a domain type is a spec change; add its state row in the same commit

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** Making `risk_score` nullable after validation in `docs/spec/data-contract.md` section 1.4, so an absent or non-finite score stops rejecting the whole patient.
- **What happened:** `risk_score: number \| null` landed in the data contract and no row landed in `docs/spec/ui-states.md`. `strict` then forced a fifth absence branch at every render site — the OV-4 card, the OV-5 panel, PD-5 and the PD-4 series — with no defined UI: the only guidance in the harness was the bare phrase "score unavailable", with no state ID, no MUST-NOT list, and no sort position. Three sibling files still asserted that four fields were nullable post-validation.
- **Root cause:** A type edit feels local and mechanical while the state matrix is a separate document with its own review, and nothing fails when a nullable member has no row — the compiler demands *a* branch and accepts any branch at all, including a rendered `0`.
- **Rule going forward:** When a domain type gains a nullable member, add its `S-*` / `U-*` row to `docs/spec/ui-states.md` in the same commit, carrying the MUST-show literal, the MUST-NOT list, and the sort position.
- **Enforced by:** doc: `docs/spec/ui-states.md` row `S-35` and section 3 rule 11; skill: `.claude/skills/ui-state-matrix/SKILL.md` section 1 item 10 and section 2 row `S-35`; agent: `ui-state-auditor` (`S-35` is release-blocking) and `data-contract-guardian` (five post-validation nullables; narrowing one is a BLOCKER). planned: a P-09 CI check cross-referencing every nullable in data-contract section 1.4 against a matrix row.

### L-031 — Copy wire keys from `docs/patientSchema.js` verbatim; check reference code key by key

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** The canonical `parsePatientSnapshot` validator in `.claude/skills/svelte5-runes/references/patterns.md` section 1, parsing the comorbidity list at the wire boundary. (Amended 2026-08-16: when this was written `docs/patientSchema.js` was the only schema in the repository; `back-end/model/Patient.js` has since appeared and is the live one, so the rule now names both — see L-038 and L-039.)
- **What happened:** The validator read `raw.underlying_conditions`. The schema field is singular — `underlying_condition`, `docs/patientSchema.js` line 37 — so the value was always `undefined`, `Array.isArray(undefined)` was `false`, and the parser returned `{ ok: false, problem: 'underlying_conditions is missing or not an array' }` for **every** patient: the entire board landed on `U-21`. It was the only plural spelling in the harness and it survived two audit rounds. The same block also returned `{ name }` only, silently discarding `catch`, so **G-10** could never be answered against stored data.
- **Root cause:** An English plural on an array-typed field reads as more correct than the schema's singular, and a validator that rejects every payload is indistinguishable from a working one until it runs against real data — which reference code never does.
- **Rule going forward:** Diff every wire key in adapter or validator code against **both** `docs/patientSchema.js` and the live `back-end/model/Patient.js` key by key before committing, reproduce the schema's spelling verbatim even where it is grammatically wrong, and register any sketch-versus-live divergence rather than picking a winner.
- **Enforced by:** doc: `docs/spec/data-contract.md` section 2.3 (the `underlying_condition[]` and `catchFlag` rows) and the section 5 merge checklist; skill: `.claude/skills/pulsemind-spec/SKILL.md` section 5.9; agent: `data-contract-guardian` (procedure step 1 rebuilds the field inventory from the schema and diffs it); skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, whose validator tests assert `parsePatientSnapshot` returns `ok: true` for the reference payload and that `underlyingConditions` carries `catchFlag`. planned: running them once `front-end/` exists.

### L-030 — Load in a `+layout.ts` anything a child route reads through `await parent()`

- **Date:** 2026-08-16
- **Category:** svelte
- **Context:** The Parameter Detail slug gate (`U-13`) in `.claude/skills/svelte5-runes/SKILL.md` section 5.1 and `.claude/skills/svelte5-runes/references/patterns.md` section 7, which takes the patient snapshot from `await parent()` rather than refetching it.
- **What happened:** The single-patient load sat on `src/routes/patients/[patientId]/+page.ts`, so `const { snapshot } = await parent()` in `parameters/[parameterSlug]/+page.ts` resolved to `{}` — `snapshot` does not type against `./$types` and is `undefined` at runtime, and `latestReading(snapshot.readings)` throws. The one gate that stops a deep link to a parameter absent from the latest reading falling back silently to the first chip was unimplementable as written, and it shipped as working reference code through two audit rounds.
- **Root cause:** `parent()` reads as "the route above me", but it resolves only the merged data of the parent **layout** loads; a sibling `+page.ts` is a leaf that contributes nothing, and neither the file name nor the generated `./$types` says so until the app is run.
- **Rule going forward:** Put every value a child route consumes via `await parent()` in a `+layout.ts`, never in a sibling `+page.ts`.
- **Enforced by:** skill: `.claude/skills/svelte5-runes/SKILL.md` section 5.1 (the route tree states there is no `[patientId]/+page.ts`) and `.claude/skills/svelte5-runes/references/patterns.md` section 7; agent: `svelte-code-reviewer` (rubric (b), Svelte 5 runes and SvelteKit 2). planned: a Playwright deep-link test asserting `PARAMETER_NOT_IN_READING` for a slug absent from the latest reading.

### L-029 — Destructure or `.at()` an array element; a `length` guard does not narrow an index access

- **Date:** 2026-08-16
- **Category:** tooling
- **Context:** The reference implementations of the F-1 latest-reading rule and of "readings held at this level" in `.claude/skills/svelte5-runes/references/patterns.md`, compiled against the tsconfig that `.claude/skills/bootstrap/SKILL.md` mandates.
- **What happened:** `noUncheckedIndexedAccess: true` types `ordered[0]` as `Reading | undefined`, and an earlier `if (ordered.length === 0) return []` does not narrow it — TypeScript does not relate `.length` to element presence — so `const anchor = ordered[0].charttime.getTime()` and `[...usable].sort(...).at(-1)!` both failed `pnpm check`, and the fastest fixes on offer were a `!` assertion or turning the flag off.
- **Root cause:** The flag exists precisely to make the empty-readings case unignorable, and the two ways to silence it (`!`, or relaxing the flag) are each one keystroke cheaper than the way that actually handles it.
- **Rule going forward:** Read the first or last element with a destructure or `.at()` followed by an explicit `undefined` check that returns a named unavailable state, and never silence the resulting error with `!` or by relaxing a tsconfig strictness flag.
- **Enforced by:** skill: `.claude/skills/bootstrap/SKILL.md` section 7 (`noUncheckedIndexedAccess: true`, and neither strictness flag may be relaxed); skill: `.claude/skills/svelte5-runes/references/patterns.md`; doc: `CLAUDE.md` section 5 rule 18; agent: `svelte-code-reviewer` (a `!` on a clinical field is a blocker). planned: `pnpm check` in CI, plus a grep check for `!.` and `]!` under `src/`.

### L-028 — Route theme-varying shadows through a `--color-*` token; Tailwind v4 inlines `--shadow-*` at build time

- **Date:** 2026-08-16
- **Category:** tailwind
- **Context:** Giving the drawer, the popovers, and the chart tooltip a separate dark-mode elevation in `.claude/skills/tailwind-design-system/references/tokens.css`.
- **What happened:** `--shadow-card`, `--shadow-popover`, and `--shadow-drawer` were redefined inside both dark blocks. Compiling the exact construct with tailwindcss 4.3.3 shows Tailwind copies the literal `--shadow-*` value into `--tw-shadow` at build time and never emits `--shadow-card` into `:root` at all, so the dark overrides are dead code and the 6%-alpha light shadow survives into dark mode, where it is invisible against a near-black surface.
- **Root cause:** `@theme` variables look like ordinary CSS custom properties, so redefining one in a media query looks like it must cascade; Tailwind's build-time inlining is invisible in the source and produces no warning.
- **Rule going forward:** Express every theme-varying shadow as `var(--color-shadow-*)` inside the `--shadow-*` definition and override only the `--color-*` token per theme, never the `--shadow-*` token itself.
- **Enforced by:** skill: `.claude/skills/tailwind-design-system/SKILL.md` section 2.3 and `.claude/skills/tailwind-design-system/references/tokens.css`; agent: `a11y-auditor` (elevation is a non-colour separation channel). planned: grep check that no `--shadow-` declaration appears inside a `prefers-color-scheme` or `[data-theme]` block.

### L-027 — Use `aria-pressed` for a selection toggle and `aria-current="page"` for the current item in a nav set

- **Date:** 2026-08-16
- **Category:** a11y
- **Context:** The Patient Overview card (a two-state selection control, `docs/spec/ui-states.md` S-16) and the Parameter Detail chips (links to a sibling route, `docs/spec/screens.md` section 5.3, `docs/spec/ui-states.md` S-18).
- **What happened:** Parallel authors shipped `aria-current={selected ? 'true' : undefined}` on the card in two skills while four other files used `aria-pressed`, and shipped `role="tab"` in a `role="tablist"` with `aria-selected` on the chips while three other files defined them as `<a href>`. `aria-current` omitted when unselected announces nothing at all, so "which patient is selected" becomes discoverable only by visiting every card; `aria-selected` on a link is ignored outright, which leaves the active chip encoded by colour alone in a product that bans colour-alone encoding.
- **Root cause:** The two attributes both read as "this is the one", and the tab pattern is the reflex for any one-of-N row of controls — even when the "panel" is a different URL and the control is a real link.
- **Rule going forward:** Give the patient card `<button type="button" aria-pressed={selected}>` with the attribute always present as `true` or `false`, and give exactly the active parameter chip `aria-current="page"` on an `<a href>` inside `<nav aria-label="Parameters">` — never `role="tab"`, `aria-selected`, or a roving tabindex.
- **Enforced by:** skill: `.claude/skills/clinical-a11y/SKILL.md`; skill: `.claude/skills/pulsemind-spec/SKILL.md`; skill: `.claude/skills/tailwind-design-system/SKILL.md`; doc: `CLAUDE.md` section 5 rule 9; doc: `docs/spec/ui-states.md` S-16 and S-18; agent: `a11y-auditor`; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, which carries `the selected card exposes aria-pressed, and an unselected one exposes it as false`. planned: the chip half — a test asserting exactly one chip carries `aria-current="page"`, matching the URL slug.

### L-026 — Give every cross-cutting decision exactly one named authority file

- **Date:** 2026-08-16
- **Category:** process
- **Context:** Auditing a harness whose UI state matrix exists twice — as `docs/spec/ui-states.md` and as the working table in `.claude/skills/ui-state-matrix/SKILL.md` — and whose ARIA and route contracts are restated in five or six files each.
- **What happened:** The two state matrices had silently diverged (S-31, S-32, S-33, U-20, U-21 present in one and absent from the other, and different mandated copy for S-17), and the ARIA attribute for the patient card and the role of the parameter chip each had two incompatible answers. Neither file claimed precedence, so the file an agent happened to read last won, and the disagreement produced no error anywhere.
- **Root cause:** Restating a rule close to where it is used is genuinely helpful, and nothing about a second copy signals that it is a copy — so the copy drifts and both versions still read as authoritative.
- **Rule going forward:** Name one authority file per cross-cutting decision — `docs/spec/ui-states.md` for states, `docs/spec/screens.md` for screens, routes, and interactions, `docs/spec/data-contract.md` for the wire boundary — and make every restatement carry a line saying which file wins when the two disagree.
- **Enforced by:** doc: `docs/spec/ui-states.md` (declares itself the audit target); skill: `.claude/skills/ui-state-matrix/SKILL.md` (carries the "`ui-states.md` wins and this file is the bug" precedence note); doc: `CLAUDE.md` section 7 (the routing table to the authorities); agent: `ui-state-auditor`. planned: a diff check that extracts the `S-*`/`U-*` ID sets from both matrices and fails when they differ.

### L-025 — Name only agents that exist in `.claude/agents/`; a delegation roster is a contract

- **Date:** 2026-08-16
- **Category:** process
- **Context:** `CLAUDE.md` section 8, "Available subagents" — the only delegation roster an agent sees before it starts work, loaded on every turn.
- **What happened:** Four of the six rows named agents that were never created — `clinical-ui-reviewer`, `state-matrix-auditor`, `spec-gap-hunter`, `test-author` — while `svelte-ui-builder` and `handoff-conformance-checker`, the builder and the release gate, were absent from the table entirely. A delegation to a nonexistent agent is a silent no-op, so the whole review layer of a clinical harness was disconnected while the document asserted it was in place.
- **Root cause:** The roster was written from the roles the harness ought to have rather than from `ls .claude/agents/`, and no failure is visible at the call site — the delegation simply does not happen.
- **Rule going forward:** Write every roster row from a directory listing taken in the same turn, and re-run that listing whenever an agent is added, renamed, or removed, so the table is never a wish list.
- **Enforced by:** doc: `CLAUDE.md` section 8 (now matches `.claude/agents/`: `svelte-ui-builder`, `svelte-code-reviewer`, `ui-state-auditor`, `a11y-auditor`, `data-contract-guardian`, `handoff-conformance-checker`); doc: this log, rule 9. planned: CI check that every backticked agent name in `CLAUDE.md` resolves to a file under `.claude/agents/`.

### L-024 — Link-check the harness against disk before trusting any pointer in it

- **Date:** 2026-08-16
- **Category:** process
- **Context:** Six agents authored `CLAUDE.md`, `.claude/agents/**`, `.claude/skills/**`, and `docs/spec/**` in parallel, each referencing the files the others were writing.
- **What happened:** Three adversarial verifiers found six blocker-class dead references: `docs/spec/product-spec.md`, `docs/spec/design-system.md`, and `docs/spec/accessibility.md` were routed to from `CLAUDE.md` and from two agent Read-first lists but never existed, `docs/spec/screens.md` was reachable from nothing, four agent names resolved to no file, and this log itself cited "rule C-i", "rule C-ii", and "section E" — identifiers that appear in no document. Every one of them reads as authoritative and fails only at the moment an agent with fresh context tries to follow it.
- **Root cause:** Parallel authors have to reference files that do not exist yet, so a plausible filename is written and never revisited; a dangling path in prose produces no error at write time and no error at read time, only a fruitless read and a re-derivation from the PDF.
- **Rule going forward:** Resolve every path, heading, ID, and agent name against disk before declaring a harness document finished, and cite a file plus a real heading rather than a bare directory.
- **Enforced by:** doc: this log, rule 9; agent: `handoff-conformance-checker` (its standard of evidence is a `file:line` citation, so an unresolvable path cannot count as evidence). planned: a link-check script over every backticked path in `CLAUDE.md`, `.claude/**`, and `docs/**` that fails when the path is absent from disk.

### L-023 — Write every harness file in English regardless of the language of the request

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The harness was commissioned in a mixed-language conversation in which the request to build the lessons system arrived in Vietnamese.
- **What happened:** The reflexive move is to mirror the requester's language into the artefact itself, and it happened: the `description` fields of `.claude/skills/bootstrap/SKILL.md` and `.claude/skills/lessons-learned/SKILL.md`, and the `Context` line of this very entry, all shipped with Vietnamese trigger phrases embedded in them — flagged independently by three verifiers in the harness audit.
- **Root cause:** Language mirroring is a strong conversational default; the project's English-only rule for files is a separate, explicit decision that has to override it, and a `description` field feels like conversation rather than like a file.
- **Rule going forward:** Answer the user in whatever language they used, but write every byte of `CLAUDE.md`, `.claude/**`, and `docs/**` in English, including skill `description` fields and quoted trigger phrases.
- **Enforced by:** skill: `.claude/skills/lessons-learned/SKILL.md` (Invariants: "English only, imperative voice, even when the conversation is in another language"); doc: this log, rule 7. planned: CI grep for non-ASCII letters outside typographic punctuation across `CLAUDE.md`, `.claude/**`, and `docs/**`.

### L-022 — Ship the harness, not the application

- **Date:** 2026-08-16
- **Category:** process
- **Context:** Building the PulseMind harness while the repository contained only `docs/Handoff.pdf` and `docs/patientSchema.js`.
- **What happened:** The instinctive next step after normalising a spec for a SvelteKit product is to scaffold `package.json`, `svelte.config.js`, `vite.config.ts`, and `src/` — none of which the user asked for in this workflow.
- **Root cause:** "Set up the project" is the strongest prior attached to this stack, and a stack decision reads like permission to scaffold it.
- **Rule going forward:** Create only `CLAUDE.md`, `.claude/**`, and `docs/**`; describe application files inside those documents and never write them to disk until the user explicitly asks for code.
- **Enforced by:** doc: `CLAUDE.md` section 3 (Repo map) and section 9 item 7; skill: `.claude/skills/bootstrap/SKILL.md`. planned: a `PreToolUse` matcher on `Write` that blocks paths outside `CLAUDE.md`, `.claude/**`, `docs/**` while the project is in harness-only mode.

### L-021 — Never let `underlying_condition[].catch` hide a comorbidity

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Mapping the patient-context drawer (Handoff section 4) onto `docs/patientSchema.js`.
- **What happened:** The schema declares `underlying_condition: [{ name: String, catch: Boolean }]`. `catch` is undocumented, is a JavaScript reserved word, and reads exactly like an `active`/`flagged` filter flag — so "show only the ones where `catch` is true" looks like the intended behaviour.
- **Root cause:** A plausible-sounding field name invites a plausible-sounding filter, and filtering is invisible once shipped: the clinician sees a shorter list, not a hidden one.
- **Rule going forward:** Render every element of `underlying_condition[]` and ignore `catch` entirely until gap G-10 is answered.
- **Enforced by:** doc: `docs/spec/open-questions.md` (G-10); doc: `docs/spec/data-contract.md` F-13; skill: `.claude/skills/pulsemind-spec/SKILL.md`. planned: grep check that no source file reads `.catch` on a condition object.

### L-020 — Make the triage comparator a total order

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** Implementing the ranking rule stated in the handoff: review state first (Pending review first), then risk level, then risk score (Handoff section 3).
- **What happened:** Three keys leave ties. Two patients tied on all three would fall back to the order the API happened to return them in, so a board could reshuffle between two refreshes carrying byte-identical data — and a clinician reads reshuffling as clinical change.
- **Root cause:** Trusting `Array.prototype.sort` stability plus input order instead of making the comparator itself total.
- **Rule going forward:** End the comparator with latest `charttime` descending and then `Intl.Collator` over `patient_id`, so ordering is a pure function of the data and never of input order.
- **Enforced by:** doc: `docs/spec/screens.md` section 6 (Ranking rule), 6.1 and 6.5; skill: `.claude/skills/svelte5-runes/SKILL.md` (use `toSorted`, never sort a `$state` array in place); skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, `ranking → is a total order: shuffling the input does not change the output`. planned: running it once `front-end/` exists.

### L-019 — Anchor the 60-minute history window on the latest reading, not on the wall clock

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** Deriving the "60-minute respiratory-risk history" (Handoff sections 3 and 4) from `readings[]`, which is the only time series the schema provides.
- **What happened:** The obvious window is `[Date.now() - 60min, Date.now()]`. With stale data — exactly the case that matters — that window is empty, and an empty chart renders as a calm, blank panel rather than as "no recent data".
- **Root cause:** Wall-clock windowing silently converts a data-freshness failure into a reassuring visual.
- **Rule going forward:** Anchor the window on the latest reading's `charttime` and always render "as of `<absolute charttime>` (`<age>`)" beside it.
- **Enforced by:** doc: `docs/spec/data-contract.md` F-2; doc: `docs/spec/ui-states.md` (state U-14); skill: `.claude/skills/ui-state-matrix/SKILL.md`. planned: unit test with a payload 6 hours old asserting a non-empty series plus a visible age.

### L-018 — Never treat `readings[0]` as the latest reading

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Every screen depends on "the current reading" — score, band, parameters, explanation. (Amended 2026-08-16: this entry's `Rule going forward` prescribed "sort `charttime` descending" with no tie-break, which is the exact defect L-036 retires — a stable descending sort plus element `[0]` keeps the *earlier*-in-source of two equal `charttime`s, the opposite of F-1 step 4. The rule below is the corrected one; the lesson itself — never trust array order — is unchanged and still live.)
- **What happened:** The schema guarantees no ordering for `readings[]`. `readings[0]`, `readings.at(-1)`, and "the backend probably sorts it" are all guesses, and a wrong guess silently displays an old assessment as current.
- **Root cause:** Array order feels like an implicit contract; it is not one anywhere in `docs/patientSchema.js`.
- **Rule going forward:** Select the latest reading by parsing `charttime`, excluding unparseable timestamps with an integrity warning, then sorting **ascending** and taking `.at(-1)` with the source index compared as the final key (F-1 step 4) — never `readings[0]`, never a descending sort plus element `[0]`, and never a synthesized fallback reading.
- **Enforced by:** doc: `docs/spec/data-contract.md` F-1 (including step 4); doc: `docs/spec/ui-states.md` (state U-11); skill: `.claude/skills/pulsemind-spec/SKILL.md` section 5.1; this log, L-036 (the tie-break must be explicit, never sort stability); skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10 — `readings with no usable charttime are excluded from latest selection` and the L-036 collision test. planned: running them once `front-end/` exists.

### L-017 — Never render `imputed_share` or `documentation_share` as a percentage

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Building the reading-state section (Handoff section 4: risk level, readings held at that level, imputed share, documentation share).
- **What happened:** Both fields are bare `Number` in the schema with no unit. `0.85` is either 85% or 0.85%, and the popular "if the value is ≤ 1 treat it as a fraction" heuristic breaks exactly at `1` — where 100% and 1% collide.
- **Root cause:** A number that looks like a proportion invites a `%` sign, and a `%` sign asserts a scale nobody confirmed.
- **Rule going forward:** Print the raw value labelled "scale unconfirmed", expose `scaleUnknown: true` from the adapter, and never append `%`, multiply by 100, or draw a proportional bar until gap G-11 is answered.
- **Enforced by:** doc: `docs/spec/data-contract.md` F-7; doc: `docs/spec/open-questions.md` (G-11 — BLOCKING); skill: `.claude/skills/clinical-a11y/SKILL.md` (never invent a scale). planned: grep check for `* 100` and `style: 'percent'` near these fields.

### L-016 — Model use is `unknown` unless proven; absence from `top_contributors` proves nothing

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** The parameter table needs a "Model use" column showing whether a parameter is a current score factor or simply available (Handoff section 4).
- **What happened:** The only join available is `parameters[].name` against `top_contributors[].name`. It is tempting to read a match as "score factor" and a miss as "available" — which turns a missing field into a two-valued answer.
- **Root cause:** `top_contributors` is plausibly a top-N list, so absence is evidence of nothing. Rendering "available" from absence tells a clinician, on a clinical screen, that the model ignored a parameter.
- **Rule going forward:** Emit `score_factor` only on an explicit name match, emit `unknown` for every miss, and render `available` only from an explicit backend flag (gap G-04).
- **Enforced by:** doc: `docs/spec/data-contract.md` F-8; doc: `docs/spec/open-questions.md` (G-04 — BLOCKING); doc: `docs/spec/ui-states.md` (states S-27/S-28/S-29); skill: `.claude/skills/ui-state-matrix/SKILL.md`; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, `the model-use join is exact after trim + case-fold, and nothing looser (F-8)`. planned: running it once `front-end/` exists.

### L-015 — Treat `warning_status.status === null` as a real third state

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Review status drives card styling, the Patient Detail warning panel, the `Needs review` filter, and the first ranking key.
- **What happened:** The handoff describes exactly two review states, Pending review and Reviewed (Handoff sections 3, 4, 6), while the schema declares `"Reviewed" || "Pending Review" || null`. Any `status === 'Reviewed' ? … : …` ternary therefore renders an unknown-status patient as *pending*, and the inverse test renders them as *reviewed* — which can hide an unreviewed patient.
- **Root cause:** A two-state narrative in prose against a three-state union in the schema; the boolean shape is the path of least resistance.
- **Rule going forward:** Model review state as `pending_review | reviewed | unknown`, map `null` and any unrecognised string to `unknown` plus an integrity warning, and switch exhaustively with a `never`-typed default.
- **Enforced by:** doc: `docs/spec/data-contract.md` F-5 and 2.2; doc: `docs/spec/open-questions.md` (G-09 — BLOCKING); doc: `docs/spec/ui-states.md` (state S-09, which renders "Review status unavailable"); skill: `.claude/skills/ui-state-matrix/SKILL.md`; agent: `data-contract-guardian`; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10, `review status normalizes on trim + spacing + case-fold, not on an exact string`. planned: the `null`-payload case of that test, and the type-level exhaustiveness check that comes with `pnpm check`.

### L-014 — Always show an absolute timestamp; relative age is only a supplement

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** Chart times, last-measured times, review times, and the age of carried-forward values appear on all three screens.
- **What happened:** Compact clinical cards pull toward "4 min ago" alone. A relative label that stops ticking — because a refresh failed, a tab was backgrounded, or the component never re-rendered — reads as fresh forever, and no clinician can tell the difference.
- **Root cause:** Relative time is a rendering of a number that is only correct at the instant it is painted.
- **Rule going forward:** Render every clinical time as a 24-hour absolute time inside a `<time datetime>` element, with the relative age as a parenthesised supplement that actually ticks; never ship "now", "just now", or "recently".
- **Enforced by:** doc: `docs/spec/data-contract.md` F-10; doc: `docs/spec/ui-states.md` section 4 (banned copy) and state S-07; doc: `CLAUDE.md` section 5 rule 15; skill: `.claude/skills/clinical-a11y/SKILL.md` (time-rendering rules). planned: grep check banning `just now`/`recently` copy and bare relative-time components.

### L-013 — Never encode risk level with colour alone

- **Date:** 2026-08-16
- **Category:** a11y
- **Context:** The handoff asks for "a consistent label/color treatment for Low, Medium, High, and Critical" (Handoff section 6); no prototype and no approved palette exist.
- **What happened:** The conventional critical-red / high-orange / medium-amber / low-teal ramp was run through a colour-vision-deficiency validator during design-system research and failed hard: High versus Medium is ΔE 2.3 under protanopia and only ΔE 9.4 with normal vision, and three alternative hue steppings could not fix it. ICU displays are also routinely dimmed, glare-washed, and occasionally monochrome.
- **Root cause:** The ramp is a clinical convention, and conventions get adopted without validation.
- **Rule going forward:** Encode risk with an orthogonal non-colour channel (fill weight) plus the full spelled-out text label on every instance, and treat colour as secondary decoration — never abbreviate to C/H/M/L and never move the label into a tooltip.
- **Enforced by:** doc: `docs/spec/ui-states.md` (states S-01…S-04); doc: `CLAUDE.md` section 5 rule 8; skill: `.claude/skills/clinical-a11y/SKILL.md`; skill: `.claude/skills/tailwind-design-system/SKILL.md` (every state map carries a non-colour differentiator); agent: `a11y-auditor`. planned: component test asserting the level label text is present in the accessible name.

### L-012 — Never build a Tailwind class name by interpolation

- **Date:** 2026-08-16
- **Category:** tailwind
- **Context:** Styling risk chips, provenance badges, and review markers from TypeScript unions.
- **What happened:** `class={`bg-risk-${level.toLowerCase()}`}` is the natural way to write this and it compiles, lints, and type-checks. Tailwind v4 detects classes by scanning source text for complete literal strings, so the class is never generated — and the patient it fails on is the Critical one, which then renders looking like a Low one.
- **Root cause:** Content detection is textual, not semantic, and the failure is silent at every stage except the screen.
- **Rule going forward:** Map every union member to a complete literal class string in a lookup declared `as const satisfies Record<Union, string>`, so a missing band is a compile error; never reach for `@source inline()` to rescue an interpolated name.
- **Enforced by:** skill: `.claude/skills/tailwind-design-system/SKILL.md`; agent: `svelte-code-reviewer`. planned: grep check for template literals and string concatenation inside `class` attributes.

### L-011 — Configure Tailwind v4 in CSS; there is no `tailwind.config.js` in this repo

- **Date:** 2026-08-16
- **Category:** tailwind
- **Context:** Defining the clinical design tokens for a Tailwind v4 + SvelteKit 2 project.
- **What happened:** Almost every Tailwind answer available from memory is v3: `tailwind.config.js` with `theme.extend.colors`, `content: [...]`, `@tailwind base/components/utilities`, `postcss.config.js` with autoprefixer, `darkMode: 'class'`, `safelist`, and `theme()` calls in CSS. All of it is wrong here, and several v3 names (`shadow-sm`, `rounded-sm`) still compile in v4 with different meanings and emit no warning at all.
- **Root cause:** v3 dominates the training distribution, and v4's failure mode for renamed scales is a silent visual change rather than an error.
- **Rule going forward:** Configure everything in `src/app.css` — `@import "tailwindcss";` plus `@theme` / `@theme inline` tokens — install only `tailwindcss` and `@tailwindcss/vite`, and verify every v3-renamed utility name before writing it.
- **Enforced by:** skill: `.claude/skills/tailwind-design-system/SKILL.md`; doc: `CLAUDE.md` section 2 (Stack) and section 5 rule 5. planned: CI check that fails if `tailwind.config.*` or `postcss.config.*` exists.

### L-010 — Never derive a value from `data` with a plain `const` in a `+page.svelte`

- **Date:** 2026-08-16
- **Category:** svelte
- **Context:** Patient Detail and Parameter Detail both compute display values from the route's loaded payload.
- **What happened:** SvelteKit reuses page components across navigation between sibling routes, so a `const band = classify(data.patient.risk_score)` is evaluated once and keeps the previous patient's value after navigating to a new patient. The SvelteKit docs label their own version of this example "THIS CODE IS BUGGY!". Here the bug is patient A's identity beside patient B's risk band.
- **Root cause:** Component reuse is invisible in the source; nothing about the file suggests it survives navigation.
- **Rule going forward:** Wrap every value computed from `data` or from `page.params` in `$derived(...)`, and additionally `{#key page.params.patientId}` the Patient Detail subtree so drawer, scroll, and hover state cannot bleed across patients.
- **Enforced by:** skill: `.claude/skills/svelte5-runes/SKILL.md`. planned: Playwright test navigating patient A → patient B and asserting every visible field belongs to B.

### L-009 — Write Svelte 5 runes; Svelte 4 syntax is wrong in this repo

- **Date:** 2026-08-16
- **Category:** svelte
- **Context:** Every code example in the harness, and all future component work, targets Svelte 5 in runes mode with TypeScript strict.
- **What happened:** Svelte snippets produced from memory come out in Svelte 4 by default: `export let`, `$:`, `on:click`, `createEventDispatcher`, `<slot>`, `<svelte:component>`, `class:`, `use:`, and `import { page } from '$app/stores'`. Some of these still compile in a mixed codebase, and `$: x = page.params.id` against `$app/state` silently never updates.
- **Root cause:** Svelte 4 dominates the training distribution, and legacy syntax degrades quietly rather than failing loudly.
- **Rule going forward:** Use `$props`/`$derived`/`$state`, `onclick`, callback props, `{#snippet}`/`{@render}`, the clsx-style `class` array, `{@attach}`, and `$app/state` — and treat any `$:` or `export let` in a diff as a defect, not a style preference.
- **Enforced by:** skill: `.claude/skills/svelte5-runes/SKILL.md`; doc: `CLAUDE.md` section 5 rule 1; agent: `svelte-code-reviewer`. planned: grep check in CI for `export let`, `on:`, `$:`, `<slot`, `$app/stores`.

### L-008 — Escalate the production states the handoff leaves undefined, and keep them visually distinct

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** The handoff enumerates what the prototype does not define: loading, backend-error, network-offline, permission-denied, and retry states, plus refresh strategy and persistence rules (Handoff section 8).
- **What happened:** The cheapest implementation collapses all of them into one empty board. On a triage screen, an empty board reads as "no patients at risk" — which is the single most dangerous sentence this product can accidentally say.
- **Root cause:** Undefined states have no acceptance criteria, so they inherit whatever the framework's default is: nothing rendered.
- **Rule going forward:** Give filter-empty, empty-unit, backend-error, offline, permission-denied, and loading six visibly distinct treatments, mark each as harness-defined pending design confirmation, and raise the question rather than closing the gap silently (Handoff section 8).
- **Enforced by:** doc: `docs/spec/ui-states.md` section 2 (U-01…U-22) and `docs/spec/open-questions.md`; skill: `.claude/skills/ui-state-matrix/SKILL.md`; agent: `ui-state-auditor`. planned: a build script enumerating every `data-clarify` id reachable in the running UI.

### L-007 — Label every invented visual decision as harness-defined

- **Date:** 2026-08-16
- **Category:** process
- **Context:** The handoff says "use the HTML prototype as the visual reference" for styling, layout, spacing, typography, and component appearance (Handoff section 1) — and no prototype file was supplied with the project.
- **What happened:** The harness therefore has to define the entire visual system itself: palette, tokens, density, dark-mode posture, focus indicators, breakpoints. Written without a marker, those choices are indistinguishable in a diff from handoff-mandated styling, and a reviewer will defend an invented colour as if the designer chose it.
- **Root cause:** Invented defaults and specified requirements look identical once they are written down.
- **Rule going forward:** Tag every self-invented visual or behavioural decision "harness-defined, pending design confirmation" at the point it is written, and keep it in the open-questions register until product confirms it.
- **Enforced by:** doc: `CLAUDE.md` section 1 (provenance tags table); doc: `docs/spec/open-questions.md` section 2 (`D-*` rows); skill: `.claude/skills/tailwind-design-system/SKILL.md`; skill: `.claude/skills/pulsemind-spec/SKILL.md`. not yet enforced mechanically.

### L-006 — `Mark as reviewed` may change only the local review state

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** The Patient Detail review panel exposes a `Mark as reviewed` action (Handoff section 4).
- **What happened:** The handoff is explicit: update the local UI review state to Reviewed "without changing the risk score or ventilator settings". The reflex implementation — fire a write, refetch the patient, replace the reading, show a "Saved" toast — violates this three times over, and no write contract exists anywhere in the schema (gap G-08).
- **Root cause:** "Mark as reviewed" reads like a persistence action, so it attracts a persistence implementation.
- **Rule going forward:** Change only the review state plus a locally-generated, locally-labelled timestamp; never refetch as a side effect, never touch a clinical field, and never use the word "saved" or "persisted" while G-08 is open.
- **Enforced by:** doc: `docs/spec/screens.md` section 8, RULE TWO; doc: `docs/spec/open-questions.md` (G-08 — BLOCKING); skill: `.claude/skills/pulsemind-spec/SKILL.md`; agent: `handoff-conformance-checker`; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10 — `mark as reviewed changes review state and nothing else`, plus the Playwright `marking reviewed does not change the risk score`. planned: running them once `front-end/` exists.

### L-005 — Clicking a patient card selects; it must not navigate

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** The Patient Overview triage board (Handoff sections 3 and 7).
- **What happened:** The handoff says it twice — "Select that patient and update the right-side/selected-patient panel. Do not navigate yet." and "Click patient card → Select patients only." — and the navigation diagram splits the Overview→Detail edge into two labelled steps. Every muscle memory in web development says a card is a link.
- **Root cause:** "Card equals link" is the dominant pattern outside clinical software. In triage it is actively harmful: a stray click pulls the clinician off the ranked board and onto a patient they were only glancing at.
- **Rule going forward:** Build the card as a `<button type="button">` carrying `aria-pressed={selected}` and never an `<a href>`, so that only the explicit `Open patient detail` action navigates and neither Enter nor double-click on a card leaves the board (see L-027).
- **Enforced by:** doc: `docs/spec/screens.md` section 8, RULE ONE; doc: `CLAUDE.md` section 5 rule 9; skill: `.claude/skills/pulsemind-spec/SKILL.md`; skill: `.claude/skills/clinical-a11y/SKILL.md`; agent: `handoff-conformance-checker`, `ui-state-auditor`; skill: `.claude/skills/svelte5-runes/references/patterns.md` section 10 — the component test `clicking the card selects and does not navigate` and the Playwright test `a patient card selects only`, which asserts `page.url.pathname` is unchanged. planned: running them once `front-end/` exists.

### L-004 — Suppress explanation and citations when data is insufficient, and make the suppression visible

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** Patient Detail renders a plain-language explanation and guideline references beneath the score (Handoff section 4).
- **What happened:** When `sufficient_data === 'insufficient'` the prototype withholds both, and the handoff adds an explicit Frontend rule: "Do not leave the explanation/reference area looking like a normal successful state when data is insufficient." A withheld explanation rendered as an empty card, a skeleton, or "No issues found" reads as a clean bill of health.
- **Root cause:** Empty is the default rendering of null, and empty looks reassuring.
- **Rule going forward:** Gate on `sufficient_data === 'insufficient'` first and render an explicit withheld treatment in the same slot at the same height — and keep "withheld because data is insufficient", "null although data is sufficient", and "the fetch failed" as three distinct treatments that never share a component.
- **Enforced by:** doc: `docs/spec/ui-states.md` (state S-10) and section 4 (banned copy); doc: `docs/spec/open-questions.md` (G-16); skill: `.claude/skills/ui-state-matrix/SKILL.md`; skill: `.claude/skills/clinical-a11y/SKILL.md` (banned reassurance copy). planned: component test asserting the explicit state renders for an insufficient-data payload.

### L-003 — The schema cannot feed the screens the document describes

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Cross-checking every field the handoff's three screens display against `docs/patientSchema.js`.
- **What happened:** Five things the document requires have no schema support at all: parameter `unit` (G-01), parameter `description` (G-02), `model use` (G-04), any device or data-source entity for the connected-source count, the Input status section and the drawer's connected devices (G-05), and any patient display name, bed, or unit (G-06). Building from either document alone produces a UI that looks complete and asserts facts the data cannot support — "0 sources connected" being the clearest example.
- **Root cause:** The prose describes the prototype, which had hard-coded demo values; the schema describes the backend. Nobody reconciled them.
- **Rule going forward:** Render an explicit "not available" state wherever the schema cannot supply a field, never a zero, an empty list, a guessed unit, or a synthesized identity — and file each one in the gap register with the question for the backend team.
- **Enforced by:** doc: `docs/spec/open-questions.md` section 1 (G-01…G-06); skill: `.claude/skills/pulsemind-spec/SKILL.md`; skill: `.claude/skills/ui-state-matrix/SKILL.md`. planned: `data-clarify` attribute enumeration in a build script.

### L-002 — Treat `patientSchema.js` as a broken sketch and normalise it in an adapter

- **Date:** 2026-08-16
- **Category:** data-contract
- **Context:** Deriving strict TypeScript types for the wire payload.
- **What happened:** The file does not parse as JavaScript or as valid Mongoose: it uses `;` where `,` belongs, `require` instead of `required`, TypeScript-style union literals (`"Reviewed" || "Pending Review" || null`), and is missing a separator after `underlying_condition`. Its review vocabulary is `"Pending Review"` (title case, space) while the handoff prose says `"Pending review"` throughout — so a literal string comparison against the document's wording fails, and a naive `status === 'Pending review'` check silently classifies an unreviewed patient as not-pending. Only six fields carry any requiredness marker (G-31).
- **Root cause:** The schema is a communication artefact, not runnable code, and its casing was never reconciled with the prose.
- **Rule going forward:** Runtime-validate the wire payload into strict domain types through an adapter that trims and case-folds the review status, and never write `response as WirePatient` or `??`/`||` defaults for clinical fields.
- **Enforced by:** doc: `docs/spec/data-contract.md` sections 1.1 and 2.2; doc: `docs/spec/open-questions.md` (G-09, G-31); skill: `.claude/skills/pulsemind-spec/SKILL.md`; agent: `data-contract-guardian`. planned: grep check for `as WirePatient` / `as PatientSnapshot` casts over a response and for `??` on clinical field names.

### L-001 — Never reimplement the prototype's demo timers as production logic

- **Date:** 2026-08-16
- **Category:** spec
- **Context:** Reading the handoff's implementation boundary (Handoff section 1, red callout "Important: demo simulation vs. production behavior").
- **What happened:** The prototype automatically updates risk scores, timestamps, history charts, and some review states to demonstrate a live interface. Reproducing that behaviour is the most natural possible reading of "match the prototype" — and it produces a clinical screen whose numbers move without any new data behind them.
- **Root cause:** A design prototype and a production frontend look identical in a screen recording; the difference is entirely in what causes a value to change.
- **Rule going forward:** Change a clinical value only when new application data arrives — no `setInterval` mutating clinical state, no scripted escalation, no animated count-up on the score — and let only the header clock and the relative-age rendering of a fixed timestamp tick on their own.
- **Enforced by:** doc: `docs/spec/screens.md` section 9 (Anti-requirements); doc: `docs/spec/ui-states.md` (state S-33); doc: `CLAUDE.md` section 5 rule 12; skill: `.claude/skills/pulsemind-spec/SKILL.md`. planned: grep check for `setInterval`/`setTimeout` in modules that touch clinical state.

---

## Archive

Entries retired because the harness now enforces them automatically. Nothing is deleted; retired
entries keep their ID, gain `(retired YYYY-MM-DD)` in the title, and keep an `Enforced by` line
naming the check that replaced them.

_Empty._
