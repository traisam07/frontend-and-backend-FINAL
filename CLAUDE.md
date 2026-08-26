# PulseMind — Claude Code Harness

## 1. What this project is

PulseMind is a clinical decision-support frontend for ICU respiratory-risk assessment of adult ventilated patients. It is a **read-only** triage and explanation UI for clinicians, with three screens: Patient Overview → Patient Detail → Parameter Detail. Safety posture: silently inventing a state, silently degrading to a "looks fine" empty state, or silently carrying a stale value forward is a **patient-safety-class bug**, not a cosmetic one — this harness's reading of Handoff section 8's "mark it for design/product clarification rather than silently choosing a behavior".

**Provenance tags — use them in every doc, comment, and TODO you write, and never let one drift:**

| Tag | Meaning |
|---|---|
| `[HANDOFF §n]` | Stated in `docs/Handoff.pdf`, section `n`. Non-negotiable. Do not redesign. |
| `[SCHEMA]` | Implied by `docs/patientSchema.js` rather than by the handoff prose — e.g. a `null` the document never describes. Equally non-negotiable, but it is a data fact, not a design one. Same meaning as `SCHEMA` in `docs/spec/ui-states.md`'s Source vocabulary. |
| `[HARNESS]` | Invented here because no prototype exists. Always write it out as "harness-defined, pending design confirmation". |
| `[UNDEFINED]` | Handoff section 8 gap. Raise it in `docs/spec/open-questions.md`. Never silently decide it. |

## 2. Stack

- SvelteKit 2 + Svelte 5 in **runes mode** + TypeScript **strict** + Tailwind CSS **v4** + Vite.
- Node 22.x, pnpm 10.x, macOS.
- Unit/component tests: Vitest (+ vitest-browser-svelte or @testing-library/svelte). E2E: Playwright.
- No HTML prototype exists. The visual design system is harness-defined; see `.claude/skills/tailwind-design-system/SKILL.md`.
- The stack above is the **frontend's**, and it lives in `front-end/` (section 3). `back-end/` is a separate, pre-existing **npm** project — Express 4 + Mongoose 6 on Node — that this workflow reads and never writes, never installs, and never runs `pnpm` inside.

## 3. Repo map

**Exists today**, at `/Users/henry/Desktop/pulsemind/`:

```
CLAUDE.md              this file
.claude/               the harness: skills/**, agents/**, settings.json
docs/                  Handoff.pdf, patientSchema.js, LESSONS.md, spec/** (five files)
scripts/               run-demo.sh — the whole stack behind two Cloudflare tunnels (section 4.1).
                       Repo-level, not front-end's: it starts BOTH projects, so it belongs to
                       neither. Re-run it after every update; `.demo-logs/` is its scratch output
back-end/              A REAL, SEPARATE **npm** PROJECT. Repaired 2026-08-16 — see below.
front-end/             THE pnpm SVELTEKIT APP. Scaffolded 2026-08-16. A sibling of back-end/.
```

**Status as of 2026-08-16 — both projects are built and running.** The frontend is scaffolded at
`front-end/` with all three screens implemented; `pnpm check` is clean, `pnpm test` is 54 green,
`pnpm test:e2e` is 49 green. `back-end/` boots, serves, and is seeded with a 30-patient sample unit.
Do not re-run `.claude/skills/bootstrap/SKILL.md` — it is not idempotent and its own precondition
(`ls front-end/package.json` returns *No such file*) no longer holds. There is still **no git repo**
(**P-06**).

`back-end/package.json` and anything npm creates beside it belong to a different project and are
never the frontend's — "a `package.json` exists at some depth" is not evidence about which project
you are in.

**`back-end/` — what is actually there.** The paragraphs immediately below describe the service **as
originally committed**, and they are kept because they are the reason the frontend is built the way
it is. **Seven of the defects they describe were repaired on 2026-08-16 at the user's explicit
instruction**, which overrode this file's earlier read-only rule; the repairs are listed after them,
and the register rows carry the evidence. Read both halves before assuming either.

*As originally committed:*

- Express 4 on port **3500** (`PORT` overridable), Mongoose 6 against MongoDB, `cookie-parser`, a
  CORS allow-list in `back-end/config/allowedOrigins.js` — which does **not** list the Vite dev origin
  `http://localhost:5173`, so the first real request from `pnpm dev` fails CORS (**G-49**) — and a JWT
  middleware in `back-end/middleware/verifyJWT.js`.
- **`app.use(verifyJWT)` and every auth route (`root`, `register`, `auth`, `refresh`, `logout`) are
  commented out** in `back-end/server.js`. The only live mount is `app.use('/patient', …)` (**G-45**).
- Three GET routes (in `back-end/routes/api/patient.js`), **all fragment-shaped**, all keyed on a
  `:patient_id` path parameter, plus one POST wired to a controller export that does not exist
  (table below).
- **No list endpoint was mounted** (**G-40**). `getAllPatient` was defined and exported in
  `back-end/controllers/patientController.js` but routed nowhere, and its body referenced an
  undeclared `Patientatient`, so the Patient Overview board had no way to fetch the unit. *Fixed
  2026-08-16: `GET /patient/all`.* The board's **default source is still `getFixturePatientSource()`**
  — a real implementation of the same `PatientDataSource` interface, not a stub — because the
  selector defaults to fixtures and only `PUBLIC_PULSEMIND_DATA_SOURCE=http` selects the live
  service. Whichever is live, the board says visibly which one it is
  (`docs/spec/data-contract.md` sections 4.2–4.4).
- `back-end/model/Patient.js` is the **live** Mongoose model. It is close to, but not identical with,
  `docs/patientSchema.js`, and which of the two is the source of truth is **G-48**.
- A FastAPI-style producer is expected at `http://127.0.0.1:8000/data/{i}`
  (`back-end/pythonService/routes/data_service.py`); whether the frontend ever sees it is **G-47**.

| Route mounted today | Returns |
|---|---|
| `GET /patient/all` | the whole unit — an array of complete, wire-shaped patients (**G-40**, mounted 2026-08-16). `?limit=` optional and never defaulted; an empty unit is `200 []`, never a `204` |
| `GET /patient/info/:patient_id` | demographics + `underlying_condition` only |
| `GET /patient/warning/:patient_id` | the `warning_status` object only |
| `GET /patient/reading/:patient_id` | the `readings` array only |
| `POST /patient/reading/:patient_id` | `patientController.createNewPatient` — a real handler now (**G-44**); upserts one patient, path id authoritative |
| `POST /patient/import/producer` | optional bulk import from the FastAPI producer (**G-47**, still open) |
| `GET /health` | `200` when the database is connected, `503` otherwise — so "not installed", "crashed at boot" and "database down" stop presenting as one refused connection |
| `/auth/**` | the sign-in surface, added 2026-08-16 (**G-45**). `POST /auth/guide/acknowledge` records that a clinician has read the usage guide — on the USER, because a ward workstation is shared and a per-browser flag would hide it from the next person and re-show it to this one on the next terminal. `POST /auth/login` → `{ step: 'authenticated' }` or `{ step: 'second_factor', pending_token }`; `POST /auth/login/totp`; `GET /auth/session`; `POST /auth/logout`; `POST /auth/totp/enrol` + `/confirm` + `/disable`; `POST /auth/passkey/{register,login}/{options,verify}`; `DELETE /auth/passkey/:id`. Every failure is `{ code, message }` — never a bare `sendStatus` |

**"The order of failure" is now history, and it is worth keeping as history.** As committed, the
defects were sequential rather than simultaneous: while **G-44** stood the process did not boot, so
the client saw a refused connection and never an HTTP status; fixing G-44 alone still produced no
listener, because `app.listen` was reachable only from inside `mongoose.connection.once('open', …)`;
and only with both — the export fixed *and* a reachable MongoDB — did every request answer
`400 "Patient ID required."` (**G-43**), because the handlers read `req.params.id` while the routes
declared `:patient_id`. All three steps are fixed. `docs/spec/data-contract.md` section 4.1 keeps the
full account, and it stays there because it is the reason the frontend's transport branches on status
before reading any body and names every failure — the frontend does **not** assume the backend is
healthy, and must not start.

*As repaired, 2026-08-16.* The user instructed "sửa backend" — fix the backend — which overrode the
read-only rule this section previously carried; `.claude/settings.json` was changed in the same
session so the deny no longer blocks it. Seven defects were fixed **in the backend**, not worked
around in the frontend, and each register row now carries `ANSWERED 2026-08-16` with the detail:

| Row | What changed | Where |
|---|---|---|
| **G-44** | `createNewPatient` is a real handler instead of an undeclared identifier in the exports literal, so requiring the controller no longer throws at module load. `axios` is a declared dependency AND required lazily. | `controllers/patientController.js`, `package.json` |
| **G-44** (boot) | `app.listen` now runs **unconditionally**; a `/health` route reports the database state, and `/patient/**` answers a named `503` while the database is down rather than hanging on a driver timeout. The old code bound the port only inside `mongoose.connection.once('open', …)`. | `server.js`, `config/dbConn.js` |
| **G-43** | Handlers read `req.params.patient_id` — the name the routes declare — through one `readPatientId` helper, and look up the **business `patient_id`**, not the Mongo `_id`. | `controllers/patientController.js` |
| **G-42** | Not-found is `404` with a readable JSON body, never `204` with a body discarded in transit. | `controllers/patientController.js` |
| **G-40** | `getAllPatient` is fixed (it called an undeclared `Patientatient`) and **mounted at `GET /patient/all`**, returning an array of whole patients in the wire shape. The board finally has an endpoint. | `routes/api/patient.js` |
| **G-49** | The CORS allow-list includes `http://localhost:5173` / `http://127.0.0.1:5173` and the `4173` preview pair, plus a `CORS_ORIGINS` escape hatch. | `config/allowedOrigins.js` |
| — | `errorHandler` answers JSON and never leaks a stack to the client. | `middleware/errorHandler.js` |

**Sample data.** `back-end/seed/generate.js` deterministically writes `back-end/seed/patients.json` —
30 patients, 96 readings, wire-shaped — and `back-end/seed/apply.js` inserts it through
`collection.insertMany`, deliberately bypassing the Mongoose model so the edge cases survive: a null
`sufficient_data`, a null `risk_level`, an unrecognised `source`, a `carried_forward` parameter with
no `last_measured`. Validating those away would make S-05 / S-10 / S-15 unreachable and the frontend
would look correct because it never met the cases it must handle.
`front-end/src/lib/data/fixtures/patients.ts` is **generated from the same JSON**
(`node scripts/build-fixtures.mjs`), so the fixture board and the live board are the same unit.

**Running it:** `cd back-end && npm install && npm run dev:seeded` starts an in-process MongoDB
(`mongodb-memory-server`), seeds it, and serves on `:3500` with no MongoDB installed and no Docker.
`npm run smoke` boots it and asserts all of the above — 34 checks, each naming its register row.
Against a real database, set `MONGODB_URI` and use `npm run seed:rebase`.

**A ninth defect was found and fixed on the same day, and it changes what G-45 meant.** All five of
the tutorial's auth controllers open with `require('../model/User')`, and `back-end/model/User.js`
**was never committed** — so mounting any auth route threw `MODULE_NOT_FOUND` at load and the process
could not boot. Commenting them out was not a scope decision about authentication; it was the only
way to start the service. A purpose-built `model/User.js`, `controllers/pulsemindAuthController.js`,
`routes/pulsemindAuth.js` and `auth/{totp,session,throttle}.js` now serve a real `/auth`: bcrypt
passwords with no user enumeration, RFC 6238 TOTP with single-use codes, WebAuthn passkeys through
`@simplewebauthn/server`, and failed-attempt throttling. The tutorial's five controllers stay
untouched and unmounted. Demo accounts are seeded on the same switch as the patients
(`npm run dev:seeded`), and `npm run demo:code` prints the current TOTP code for the `oncall`
account. **`/patient/**` is still unauthenticated on purpose** — gating it is an authorisation
decision that belongs to **G-46**, and the frontend's own gate is **D-16**.

**What is still true:** `G-45`'s remaining half (`/patient/**` unauthenticated, `verifyJWT` off),
`G-46`, `G-47`, `G-48` and the response-envelope
rows `G-30` / `G-39` are **untouched and still open**. Do not change `back-end/model/Patient.js` —
which of the three schema artefacts governs is still `G-48`. The full endpoint shapes and the
original defect list are `docs/spec/data-contract.md` section 4.

**`front-end/` is where the app goes**, as a sibling of `back-end/`, so that no pnpm project is ever
created over or inside the existing npm project — nesting them silently breaks both lockfiles.
`.claude/skills/bootstrap/SKILL.md` scaffolds there and must never run `pnpm` at the repository root.
*This location is the orchestrator's decision, not the handoff's or the user's; the user may override
it, and if they do, every path in this section, in the bootstrap skill, and in
`docs/spec/data-contract.md` section 4 changes with it.*

Intended source layout once `.claude/skills/bootstrap` has run — **rooted at `front-end/`**, so every
`src/…` path below is `front-end/src/…` on disk:

```
front-end/                 # the pnpm project root — `pnpm` runs HERE, never at the repository root
package.json               # front-end/package.json; back-end/package.json is a different project
src/                       # i.e. front-end/src/
  app.html                 # inline data-theme script BEFORE %sveltekit.head% (no FOUC)
  app.css                  # the ONLY stylesheet: @import "tailwindcss"; + @theme tokens
  app.d.ts                 # App.Error carries a REQUIRED `code` — the closed union of six named
                           #   failures every load throws and every +error.svelte reads
                           #   (bootstrap SKILL section 4.1). Write it before the first route:
                           #   without it `pnpm check` is red on the first error() call.
  lib/
    data/                  # source.ts, adapter.ts, wire.ts, validate.ts, fixtures/ — the untrusted
                           #   wire boundary. wire.ts holds the snake_case `Wire*` types
                           #   (docs/spec/data-contract.md section 1); validate.ts turns them into
                           #   the domain types and exports Parsed<T>.
                           #   source.ts is the only module that fetches PATIENT data (the second
                           #   and last fetch caller in the app is src/lib/auth/client.ts, which
                           #   never touches one). It declares TWO
                           #   implementations of PatientDataSource — getPatientSource (HTTP:
                           #   composes the three fragment GETs under a deadline, branches on the
                           #   status BEFORE reading any body, and has NO list endpoint to call:
                           #   G-40) and getFixturePatientSource (validates WIRE_PATIENT_FIXTURES
                           #   through the same parsePatientList/parsePatientSnapshot and implements
                           #   listPatients for real) — plus resolvePatientSource, the one selector
                           #   every load calls, which returns fixtures unless
                           #   PUBLIC_PULSEMIND_DATA_SOURCE === 'http' (data-contract section 4.3;
                           #   implementation in patterns.md section 7).
    domain/                # types.ts, rank.ts, derive.ts, window.ts, slug.ts, format.ts — effect-free .ts
    state/                 # triage.svelte.ts, context.ts, prefs.svelte.ts, pending.svelte.ts —
                           #   Svelte context. pending.svelte.ts exports `delayGate`, the 250 ms
                           #   loading-flag gate state U-01 depends on (svelte5-runes 6.3, P-05).
                           #   NEVER a module singleton: server-side module scope is shared, PHI leaks across requests.
    auth/                  # client.ts — the sign-in transport. The ONLY other fetch caller in the
                           #   app, and it never reads, parses, or returns a clinical value; nothing
                           #   under data/ knows a user exists. Session = one httpOnly cookie, so
                           #   every request sends `credentials: 'include'` (D-16, G-52).
    actions/               # measure.ts — publishHeight, so a sticky offset is MEASURED rather than
                           #   hard-coded against another element's height (that drifted once)
    a11y/                  # announcer.svelte.ts — one polite region + one assertive call-site
    design/                # state -> class maps, `as const satisfies Record<Union, string>`
    components/            # presentational components
  routes/
    +layout.svelte                                     # header, disclaimer, live regions
    +layout.ts                                         # `export const ssr = false;` +
                                                       #   `export const prerender = false;` (P-01),
                                                       #   AND the session load + the sign-in gate.
                                                       #   It reads `event.url` only when the gate is
                                                       #   ON — touching it unconditionally would make
                                                       #   the load re-run, and re-fetch, on every
                                                       #   navigation for a guard that is switched off
    +error.svelte                                      # the root boundary: a named, visible error
                                                       #   state, never an empty page
    +page.ts                                           # redirect() -> /patients
    patients/
      +page.svelte  +page.ts  +error.svelte            # Patient Overview (+ the boundary that
                                                       #   catches [patientId]/+layout.ts failures)
      [patientId]/
        +layout.ts   # THE SINGLE-PATIENT LOAD LIVES HERE, typed LayoutLoad, returning
                     #   { snapshot }. NOT a +page.ts: `await parent()` in a +page.ts resolves the
                     #   merged data of the parent LAYOUT loads only, so a sibling +page.ts is a
                     #   leaf that contributes nothing and the child below would receive {}.
        +page.svelte # Patient Detail, rendered from data.snapshot (layout data merges into page data)
        +error.svelte                                  # catches what the parameter route throws below it
                     # There is NO [patientId]/+page.ts and NO [patientId]/+layout.svelte —
                     #   a layout load needs no layout component. Do not add an empty one.
        parameters/
          [parameterSlug]/
            +page.svelte                               # Parameter Detail
            +page.ts     # KEEP THIS FILE. It resolves the slug against the latest reading's
                         #   parameters and calls error(404, PARAMETER_NOT_IN_READING) on a miss
                         #   (state U-13). Its `await parent()` yields { snapshot } from
                         #   [patientId]/+layout.ts and NEVER refetches the patient, so switching
                         #   chips cannot re-render mixed identity.
    guide/
      +page.svelte  +page.ts   # How to use PulseMind. PUBLIC — it describes the interface and holds
                               #   no patient data. It may state what the marks MEAN and what an
                               #   action does; it may never state a threshold, a scale, or what to
                               #   do about a patient (rule 16). `e2e/guide.spec.ts` asserts the page
                               #   quotes NO number at all, and that it spells the mandated review
                               #   and provenance words exactly as the screens do
    login/
      +page.svelte  +page.ts   # Sign in. `+page.ts` owns `safeNext()`, which refuses any `?next=`
                               #   that is not a same-origin absolute path — an unchecked one turns
                               #   this page into an open redirect on a link mailed to a clinician
    account/
      security/
        +page.svelte  +page.ts # Your own passkeys and authenticator app. The load fetches its OWN
                               #   session rather than reading the layout's, which is deliberately
                               #   empty when the gate is off, and throws NOT_AUTHENTICATED — a
                               #   named state, never a redirect
```

There is **no `src/lib/api/` and no `src/lib/types/`** — the wire boundary is `src/lib/data/`, the types are `src/lib/domain/types.ts`. Do not resurrect either name.

**One module per layer, one canonical definition each.** `src/lib/domain/types.ts` is defined in `.claude/skills/svelte5-runes/references/patterns.md` section 1 (camelCase, real `Date`s, `PatientSnapshot` / `PatientSummary`) — with exactly three carve-outs, declared in `docs/spec/data-contract.md` section 1.6 and mirrored there with a pointer back: `ModelUse`, `Known<T>` and `RankKey`. `src/lib/data/wire.ts` is defined **only** in `docs/spec/data-contract.md` section 1 (snake_case, ISO strings, every entity prefixed `Wire`). `src/lib/data/validate.ts` exports `Parsed<T>`, `parsePatientSnapshot`, and `parsePatientList`. One name per concept: `Provenance`, `Sufficiency`, `ReviewStatus`, `Parsed<T>`, `PatientSnapshot`, `PatientSummary` — `ParameterSource`, `SufficientData`, `ReviewState`, `ParseResult`, `Patient`, `PatientViewModel`, and `Maybe<T>` are retired names; never reintroduce one.

Route contract `[HARNESS]` — patient and parameter context always live in the URL so refresh, deep-link, back/forward, and open-in-new-tab reconstruct the exact view:

| Route | Screen | Params |
|---|---|---|
| `/patients` | Patient Overview | `?q=` `?filter=all\|needs-review\|data-limited` `?risk=Critical\|High\|Medium\|Low\|unknown` — `?selected=` retired (**D-22**) |
| `/patients/[patientId]` | Patient Detail | `?drawer=context`; carries `q`/`filter` for the back link |
| `/patients/[patientId]/parameters/[parameterSlug]` | Parameter Detail | carries `q`/`filter` |
| `/login` | Sign in — password, TOTP second factor, passkey | `?next=` (validated: same-origin absolute path only, or it is discarded) |
| `/account/security` | Manage your own passkeys and authenticator app | — |
| `/guide` | How to use PulseMind — shown once on a clinician's first sign-in, reachable from the profile menu after | `?first=1` (set by the gate, honoured only for a signed-in account that has not acknowledged), `?next=` (validated the same way `/login` validates its own) |
| `/api/**` | **Not a route** — a dev/preview proxy to the backend (`vite.config.ts`) | — |

**SERVE THE API UNDER THE APP'S OWN ORIGIN.** `PUBLIC_PULSEMIND_API_BASE=/api` routes both the
clinical transport and the auth transport through the Vite proxy to the backend. This is not a
convenience: with the two on different registrable domains the session cookie is THIRD-PARTY, and
Safari blocks those by default (Firefox's Total Cookie Protection likewise). The observed failure was
`POST /auth/login` returning 200, the cookie being dropped, and the clinician bounced back to a
sign-in screen they had just completed — with no message, and with every Chromium-based test green
(**G-52**, `docs/LESSONS.md` L-071). The proxy also strips the forwarded `Origin` header, or the
service CORS-checks a request that is no longer cross-origin.

The two auth routes are the AUTHENTICATION surface and are not clinical screens: they render no patient, no
risk band, no score, and `front-end/e2e/auth.spec.ts` asserts it. That boundary is load-bearing —
it is what lets a form error there wear the risk-critical red without ever colliding with a risk band
(**D-29**). Whether signing in is REQUIRED to reach the clinical screens is
`PUBLIC_PULSEMIND_REQUIRE_AUTH`, default `false`, and that default is a reviewable position rather
than an oversight: enforcing by default would mean this harness had chosen an authorisation model
while **G-46** is open (**D-16**).

Two consequences that are not optional. (a) Drawer state is URL-addressable at `?drawer=context` so it survives refresh, deep-link, and back/forward — harness-defined, pending design confirmation (`docs/spec/open-questions.md` D-13). (b) The URL always names the visible parameter, so the parameter chips are `<a href>` links to the sibling route inside `<nav aria-label="Parameters">`, with `aria-current="page"` on exactly the active chip — never `role="tab"`/`role="tablist"`, never `aria-selected`, never a roving tabindex.

## 4. Commands

`front-end/package.json` exists and carries exactly these scripts, plus two more. `pnpm fixtures`
regenerates `src/lib/data/fixtures/patients.ts` from `back-end/seed/patients.json`
(`node scripts/build-fixtures.mjs`). `pnpm brand` regenerates the brand assets from the artwork in
`front-end/static/images/` (`node scripts/build-brand.mjs`): it TRACES the supplied wordmark into
one themeable SVG and extracts a still frame from the loading GIF, because a GIF ignores
`prefers-reduced-motion` and only a second file can honour it. It FAILS if a source loses its
transparent background, if the two supplied wordmarks stop being the same shape, or if the trace
drops below 99.5% agreement with the source (**D-31**, **D-32**;
`src/lib/assets/brand/README.md`). Do not invent different script names.

**Every command below runs from `front-end/`, never from the repository root.** `back-end/` is an
npm project with its own `package.json` and its own `start` / `dev` scripts; running `pnpm` at the
root would create a second project on top of it and break both lockfiles. `back-end/`'s scripts are
the backend team's to run — this workflow never installs, starts, or modifies it.

```bash
cd front-end
pnpm install
pnpm dev          # vite dev
pnpm build        # vite build
pnpm preview      # vite preview
pnpm check        # svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
                  #   (strict; must be zero errors AND zero warnings. `svelte-kit sync` first:
                  #    without it the generated ./.svelte-kit/tsconfig.json may not exist yet and
                  #    the check fails for a reason that has nothing to do with your code)
pnpm lint         # prettier --check . && eslint .
pnpm format       # prettier --write .
pnpm test         # vitest run
pnpm test:e2e     # playwright test --project=chromium --project=gated
                  #   It starts its OWN backend on :3500. The demo script binds :3600 instead, so a
                  #   running demo can never share it — the sign-in throttle is in-process, and a
                  #   long-lived shared backend accumulates failed-attempt counters until the tests
                  #   that assert the failure paths get locked out (docs/LESSONS.md L-072).
                  #   TWO projects. `chromium` runs against a production build on `vite preview`,
                  #   so what is tested is what ships. `gated` runs against `pnpm dev` on :5174 with
                  #   PUBLIC_PULSEMIND_REQUIRE_AUTH=true, and it is the ONLY project that starts a
                  #   dev server — two whole classes of defect exist only there: `$env/dynamic/public`
                  #   resolves to empty under `vite preview` (so the sign-in gate cannot be tested on
                  #   it at all), and SvelteKit's route-export validation runs in dev only, where a
                  #   `+page.ts` exporting a helper 500s a route that builds perfectly
                  #   (docs/LESSONS.md L-068). Both suites also boot the real back-end on :3500 with
                  #   an in-process MongoDB — the auth tests cross a real HTTP boundary, a real
                  #   bcrypt compare and a real TOTP verification, because a mocked one would only
                  #   assert that the mock matches the mock
```

### 4.1 The live demo — RESTART THE TUNNEL AFTER EVERY UPDATE

**Standing instruction from the user, 2026-08-17.** Any change that alters what the demo serves —
frontend source, backend source, seed data, generated tokens — is not delivered until the tunnelled
demo has been **restarted** and the **new URL reported**. Do not describe a change as live, and do
not repeat a previously printed URL, without doing this. It runs from the repository root:

```bash
./scripts/run-demo.sh down      # stop the two tunnels and both servers
./scripts/run-demo.sh           # bring everything up; prints the UI and API URLs
```

Four things about it that are not optional and are easy to get wrong:

- **The public hostname CHANGES on every restart.** Cloudflare Quick Tunnels allocate a random
  `<random>.trycloudflare.com`, so the old link dies and the new one must be read back out of the
  script's output, never remembered. It also **invalidates every registered passkey**: WebAuthn binds
  a credential to the registrable domain (`PULSEMIND_RP_ID`), so a passkey enrolled against the
  previous hostname will not be offered against the new one. Password and TOTP sign-in are unaffected;
  say so when reporting, or a clinician reads a dead passkey as a broken build.
- **The demo backend binds :3600, never :3500.** `pnpm test:e2e` starts its own backend on :3500 and
  expects it fresh; the sign-in throttle is in-process, so a long-lived shared instance accumulates
  failed-attempt counters until the tests that assert the failure paths lock themselves out
  (`docs/LESSONS.md` L-072). A demo and a test run must never share a port.
- **The frontend runs `pnpm dev`, not `pnpm preview`.** `$env/dynamic/public` resolves to empty under
  `vite preview` for this SPA build, which would silently put the board back on fixtures while the
  banner claimed it was live.
- **The API is served under the app's own origin** (`PUBLIC_PULSEMIND_API_BASE=/api`, through the
  Vite proxy). Two tunnels are two registrable domains, which makes the session cookie third-party —
  Safari drops it, sign-in returns `200`, and the next request is anonymous (**G-52**,
  `docs/LESSONS.md` L-071).

The demo enforces sign-in (`PUBLIC_PULSEMIND_REQUIRE_AUTH=true`) because a public URL with a login
screen that guards nothing is worse than no login screen. Its credentials are published in the
script's output, it serves a synthetic 30-patient sample unit, and it is a demonstration — never a
route to real patients.

## 5. NON-NEGOTIABLE RULES

**Every rule below carries its provenance, and the tag is part of the rule.** `[HANDOFF §n]` means the
handoff PDF states it and it is not re-designable; `[SCHEMA]` means `docs/patientSchema.js` does.
`[HARNESS]` means this harness invented it because no prototype exists: obey it, and label it in the
UI as "harness-defined, pending design confirmation". A rule with both tags is non-negotiable only in
its handoff half — the tags are section 1's, unchanged. Never
strip a tag when you copy a rule out of this file — a rule that loses its `[HARNESS]` half stops being
reviewable (see `docs/LESSONS.md` L-037).

1. **Runes only.** No `export let`, no `$:`, no `on:click`, no `createEventDispatcher`, no `<slot>`, no `<svelte:component>`. Use `$props()`, `$derived`, `onclick`, callback props, `{@render children?.()}`. `[HARNESS]` — the handoff names no framework; the stack is section 2's decision.
2. **Derive, don't sync.** Every clinical value on screen is `$derived`. An `$effect` that writes state which could have been `$derived` paints one frame late and can show patient A's identity beside patient B's risk band — review-blocking defect. `[HARNESS]` — a Svelte-correctness rule; the clinical consequence is this harness's reason for making it non-negotiable.
3. **Never compute from `data` with a plain `const` in a `+page.svelte`.** SvelteKit reuses page components across navigation, so it will render the previous patient's number. Always `$derived(data...)`. Import `page` from `$app/state`, never `$app/stores`. `[HARNESS]` — SvelteKit component-reuse semantics.
4. **Key every `{#each}` over clinical data by a stable domain id that is also UNIQUE** (`patient_id`, parameter name within one reading). Never by index — the triage board re-sorts, and an index key mismatches identity and value. **And never by ISO `charttime`:** U-12 makes a colliding `charttime` a supported state and F-1 step 4 forbids deduping, so two readings can share one instant, and Svelte throws `each_key_duplicate` on a repeated key **in production as well as in dev**. No `+error.svelte` catches it — route boundaries catch load failures, not render failures — so the screen goes blank with no named state. Where a projection can repeat a clinical instant, the **producer mints the key** (`` `${iso}#${ordinal}` ``) and the component uses that. `[HARNESS]`; see `docs/LESSONS.md` L-057, which is the incident this sentence was rewritten from.
5. **Tailwind v4, CSS-first only.** No `tailwind.config.js`, no `postcss.config.js`, no `@tailwind base/components/utilities`, no `theme()`, no `darkMode`, no `safelist`. One `@import "tailwindcss";` plus `@theme` / `@theme inline` in `src/app.css`. `@apply` is banned inside Svelte `<style>` blocks. `[HARNESS]` — the handoff says only that styling should follow a prototype that does not exist (**D-01**).
6. **Never build a class name by concatenation or interpolation.** `` class={`bg-risk-${level}`} `` is never generated, so a Critical patient renders unstyled and reads as Low. Use a full-string lookup map typed `as const satisfies Record<RiskLevel, string>`. `[HARNESS]`.
7. **Semantic design tokens only.** `bg-surface`, `text-ink`, `border-risk-critical`. Raw palette utilities (`bg-red-600`, `text-slate-900`), hex literals, and inline style colours must return zero grep hits in `src/`. `[HARNESS]` — the token set itself is harness-defined, pending design confirmation (**D-01**, **D-02**).
8. **Never encode risk, review state, or provenance by colour alone.** Colour is secondary; the
   primary channels are the **full text label and a distinct glyph shape** on every state, plus
   border style (provenance), left rule (review) and hatch (data sufficiency). **The risk ramp was
   rebuilt on 2026-08-18 and now PASSES the colour-vision floor** (**D-26**, **D-28**). The four
   bands are **light fills carrying ONE shared near-black label colour** — `Critical #ec4761`,
   `High #faab3f`, `Medium #fff0d1`, `Low #00bff6`, ink `#1d140d` — and the ramp's worst pair
   measures **ΔE2000 18.3 across normal, protan, deutan and tritan vision, in both themes**, against
   a floor of 15. **`Low` is AZURE, and it may never drift back toward teal** (**D-28**): the teal it
   replaced held ΔE2000 **2.8** against an equal-lightness neutral under protanopia, so the one band
   that means "this patient is fine" read as an ABSENCE of colour rather than as a colour. It
   measures 19.2 after the move, and 27.3 from the `Risk level unavailable` chip it moved toward.
   **This reverses D-21, and the reversal is the point of the row.** From 2026-08-17 the bands were
   vivid dark fills with WHITE type at the product owner's instruction, and the cost was measured and
   shipped as a FAIL: white type at 4.5:1 caps every band near L 0.575, which left four bands inside
   a lightness range of 0.095 with nothing to differ by but hue — and hue is exactly what a red-green
   dichromat cannot see. `High/Medium` measured **1.2**. The owner then reported that Critical and
   High looked alike, which is that measurement arriving in a person's eyes, and chose the ramp
   above. Dark type inverts the binding constraint: every band must now be LIGHT, which opens
   L 0.64–0.96 and gives the ramp room to spread. **Two consequences that are not optional.** A band
   may never be dark again while the ink is dark, and the CHART MARKS do not share the chip fills,
   because `risk-medium-solid` measures 1.13 against the plot surface and a mark has nothing but
   itself to be seen by (SC 1.4.11). **`-border` is not the alternative, and there is no per-band
   chart mark today** (**D-30**): a `RISK_MARK` map pointing at `fill-risk-<band>-border` was
   exported and imported by nothing until it was removed on 2026-08-19, and it measures ΔE2000 3.6
   apart under protanopia in the light theme and **1.1 in the dark** — one colour, four bands. Every
   `-border` is solved to the same 3:1 object floor against the same surface, so all four share a
   lightness, and lightness spread is the whole of what the chip ramp separates by
   (`docs/spec/contrast-ledger.md` section 2.1, measured every build). `RiskHistoryChart` draws one
   series colour and carries data sufficiency by SHAPE, accessible name and data table; risk band is
   read from the chip beside the chart. Never abbreviate to C/H/M/L and never move the label into a
   tooltip. **Provenance:** `[HANDOFF §9]` requires only that
   measured / carried-forward / population-reference stay *visibly distinct*. **Risk:**
   `[HANDOFF §6]` requires only "a consistent label/color treatment" and supplies no values.
   **Everything else in this rule is `[HARNESS]`, harness-defined pending design confirmation**
   (**D-01**, **D-02**; states S-01…S-04, S-12…S-15): the ban on colour-alone, the four-channel
   assignment above, the no-abbreviation and no-tooltip rules, and the measurement behind them.
   Colour still never leads, because a passing ΔE is not a licence to encode by hue: monochrome
   printing, dimmed ICU displays and glare do not care about ΔE. These are this harness's
   measurements of this harness's colours, not handoff findings and not clinical ones; a
   design-supplied palette replaces them and must arrive with a regenerated ledger (**D-02**). The
   ledger is generated, not asserted — `front-end/scripts/build-tokens.mjs` emits
   `docs/spec/contrast-ledger.md`, `front-end/src/app.css` and the design-system tokens file from one
   model, so a hue change that breaks the floor cannot reach the app without changing that table.

9. `[HANDOFF §3, §7]` **OVERRIDDEN 2026-08-17 by the product owner — see D-22.** The handoff said "Select that patient … Do not navigate yet" (section 3) and "Click patient card → Select patients only" (section 7), and this harness enforced it. **The card is now an `<a href>` that opens Patient Detail.** The owner asked for it, was shown the conflict in writing, and confirmed it; the row records the reversal so the handoff team meets a decision rather than a drift. With selection gone there is no `?selected=`, no selected-patient panel, no mobile selection bar and no `aria-pressed` on the card — the board's right column carries the REVIEW HISTORY instead. Everything else in the old rule still holds: the card carries no nested interactive element (a link inside a link destroys keyboard order), and the link carries `q`/`filter`/`risk` so `Back to overview` restores the board that was left. E2E asserts the card navigates and that the filters ride along.
10. `[HANDOFF §4]` + `[HARNESS]`. **"Mark as reviewed" changes only the local review state** (Handoff section 4: "Update the local UI review state to Reviewed without changing the risk score or ventilator settings"), plus a locally-generated, locally-labelled timestamp — harness-defined, pending design confirmation (`docs/spec/screens.md` section 8 RULE TWO); the handoff's row carries no timestamp. The risk score, risk band, and every other clinical field must be byte-identical before and after. Do not invent a write endpoint and do not use the word "saved" or "persisted" while the persistence contract is open.
11. `[HANDOFF §3, §4, §6]` + `[HARNESS]`. **When `sufficient_data === "insufficient"`, state explicitly that the risk score is not reliable, and suppress the explanation and guideline references with a visually explicit unavailable treatment** (Handoff section 4, Frontend rule: "The unavailable state should be visually explicit"). Gate on the flag first, never merely on the fields being non-null. Never render a skeleton, an empty card, or placeholder text there — that concrete ban, and the minimum-height rule behind it, are harness-defined, pending design confirmation (state `S-10`). A `sufficient` reading whose `explanation` is nevertheless `null` is a **different** state with different copy — `Explanation not supplied`, state `S-37` (**G-16**) — and must never borrow S-10's withheld wording, which would assert a clinical reason the data does not support.
12. `[HANDOFF §1]`. **Never reproduce the prototype's fake timers or scripted score changes** (Handoff section 1). Clinical values change only when new application data arrives. No animated counters, no simulated escalation, no wall-clock-driven risk.
13. `[HANDOFF §8]`; the `data-clarify` mechanism is `[HARNESS]`. **Never invent an undefined production state.** Loading, backend error, offline, permission denied, retry, polling strategy, review persistence, and clinical thresholds are all out of scope (Handoff section 8). Render the shared unknown treatment with a `data-clarify` attribute carrying the **open-questions register ID** — `data-clarify="G-04"`, `data-clarify="G-09"`, `data-clarify="G-16"` — never an invented slug, because the id must resolve to a row in `docs/spec/open-questions.md`. Then add that row.
14. `[SCHEMA]` + `[HARNESS]` — the handoff never discusses defaulting; `docs/patientSchema.js` is what makes `null` reachable (**G-31**), and every literal named here is harness-defined. **Never default a clinical field.** `risk_level ?? "Low"`, `risk_score ?? 0`, `?? RISK.Low`, and `catch (e) { patients = [] }` are patient-safety bugs. `warning_status.status === null` is a real third state, rendered with the literal string `Review status unavailable` (never "unknown", never coerced to Reviewed) — the state is in the schema, the copy and the ranking are harness-defined pending **G-09** (state `S-09`). Use an exhaustive `switch` with a `never`-typed default. Every failure path terminates in a **named, visible** error state.
15. **Never render a bare clinical number and never render a relative-only time.** The unit sits adjacent to the value inside the same nowrap element at every display point, including the accessible name. Absolute 24-hour time (`HH:mm`, date when not today, labelled zone) inside `<time datetime>` is always present; relative age is a parenthesised supplement only. "now", "just now", "recently" are banned. `[HANDOFF §4]` lists "Latest value + unit" among the parameter table's columns — and no `unit` field exists (**G-01**). Everything else here is `[HARNESS]`, pending design confirmation: the same-nowrap-element rule, the accessible name, the 24-hour absolute format inside `<time datetime>`, the labelled zone (**G-21**), and the banned relative words (states `S-12`, `U-14`).
16. **Never invent a scale or a threshold.** `imputed_share` and `documentation_share` are unscaled numbers: print them verbatim, never append `%` or `/100`, never multiply by 100, never draw a proportional gauge, never derive risk level from score, never draw reference bands. **`risk_score` carries the unit `%` as of 2026-08-18, DECLARED by the product owner (D-27) — not inferred here**, which is the distinction this rule turns on and the same one D-23 drew for the parameter units. Everything else about the score is unchanged and still binding: **not one digit moves** (no `toFixed`, no `Math.round`, no `* 100`, no `/ 100`), the 60-minute chart still scales to the window's own extremes rather than pinning 0–100, and no gauge, bar or reference band may be drawn. Knowing that a number is a percentage is not knowing what it is a percentage OF, nor that this model is bounded at 100 — that is still **G-12** and still open. `[HANDOFF §8]` for the ban itself ("final clinical thresholds or model logic … should not be invented"); each specific ban is a `[HARNESS]` elaboration of it (**G-11**, **G-12**, **G-28**).
17. **Never back-fill or interpolate.** The parameter table is the latest reading's snapshot — do not merge parameters across readings. Chart gaps render as visible breaks; below two points show the explicit literal `insufficient history for a 60-minute view`. Carried-forward and population-reference values render at **full** contrast with a provenance badge, never dimmed or greyed. `[HANDOFF §9]` requires only that provenance stay visibly distinct; the no-backfill rule, the visible-break gap rendering, that exact insufficient-history literal, and the full-contrast rule are all `[HARNESS]`, pending design confirmation (states `S-13`, `S-14`; data contract F-2, F-9).
18. `[HARNESS]` — TypeScript strictness is an engineering decision of this harness; the five nullable fields follow from the schema's missing requiredness (**G-31**). **TypeScript strict, no `any`, no `as`-casting the wire, no `!` on a clinical field.** `res.json() as WirePatient` and `readings.at(-1)!` are both forbidden; runtime-validate into strict types and route validation failure to a visible UI state. `strict` and `noUncheckedIndexedAccess` are both `true` and no snippet may relax either — absence stays representable (**five** fields are nullable post-validation: `risk_level`, `sufficient_data`, `source`, `charttime`, `risk_score`) so the compiler forces the missing-data branch instead of letting a default slip in. Each has a named state: S-05, S-10, S-15, U-11, S-35 — and the states are per **slot**, not per field, so one nullable can resolve to more than one row: `charttime` is `U-11` on PD-2 and `U-22` in the OV-4 card's time slot, `risk_level` is `S-05` in a chip and `S-38`'s unavailable rendering in PD-6's run-length slot.
19. `[HARNESS]` — documentation hygiene invented here; the handoff says nothing about it, and it exists because three audits watched a duplicated module drift. **Exactly one file DECLARES each `src/` module; every other appearance is an EXCERPT and says so.** `.claude/skills/svelte5-runes/references/patterns.md` is **canonical for all code** — every full module body lives there unless the table in `.claude/skills/bootstrap/SKILL.md` section 4 names a different declaring file. That table is the register — all **four** of its tables together: `$lib` modules, declared components, route modules, and the implementer-authored components that own mandated clinical literals — it must list **every** declaring file, and today the non-patterns.md declarations are **four files**, reconciled against that register: `docs/spec/data-contract.md` sections 1.2–1.5 (`src/lib/data/wire.ts`) and section 1.6 (`ModelUse`, `Known<T>`, `RankKey`); `.claude/skills/bootstrap/SKILL.md` section 6 (the `PatientDataSource` interface) **and section 3 (`src/routes/+layout.svelte`)** — that second one is easy to lose because it is a route module rather than a `$lib` module, and it belongs to the same register; `.claude/skills/tailwind-design-system/SKILL.md` (`RiskChip.svelte`, `ReviewChip.svelte` — `src/lib/design/risk-classes.ts` moved OUT of it on 2026-08-19 and now declares itself, see below); and `.claude/skills/clinical-a11y/SKILL.md` (`src/lib/a11y/announcer.svelte.ts`, `ContextDrawer.svelte`, `ParameterRow.svelte`, `RiskHistoryChart.svelte`). A module whose declaring file is missing from that table is a harness bug: add the row, do not add a second declaration. **The declaration headers come in FIVE forms on disk** — `// src/lib/…` (also `// src/routes/…`, `// src/app.d.ts`), `<!-- src/… -->`, `// CANONICAL DECLARATION of src/…`, `<!-- CANONICAL DECLARATION of src/… -->`, and `CANONICAL DECLARATION — this file` — so any grep written to enumerate them must match all five or it will report an empty, passing result over a register that is actually short (`docs/LESSONS.md` L-050). The fifth form is for modules that declare THEMSELVES, and it is the right answer for a component whose entire purpose is that exactly one of it exists: a second full copy of its body in a skill document is a copy that can drift. Those modules are registered in `.claude/skills/bootstrap/SKILL.md` section 4 — most of them in its 4.1b table (`src/lib/design/control-classes.ts`, `src/lib/components/Button.svelte`, `TextField.svelte`, `FormAlert.svelte`, `src/lib/auth/client.ts`) and two in the `$lib` table with **the file itself** named as their declaring file (`src/lib/design/risk-classes.ts` and `src/lib/design/review-classes.ts`). Do not read "section 4.1b" as the whole list; it is one of the four tables, and a module credited to itself in any of them belongs here. **`risk-classes.ts` joined that list on 2026-08-19 and the reason is the rule's own evidence:** its copy in the design-system skill was four exports short and still carried the pre-D-21 fill-weight ladder, `Low: bg-transparent` included — an outline chip on a board whose shipped `Low` is a solid azure fill. Its twin `review-classes.ts` had already been self-declaring for exactly this reason, which is what made the asymmetry a bug rather than a preference. Prose documents — `.claude/skills/pulsemind-spec/SKILL.md`, `.claude/skills/svelte5-runes/SKILL.md`, the `docs/spec/` files — describe **rules** and may show excerpts, never a competing full module. An excerpt carries a header comment naming the declaring file, in the form `// EXCERPT of src/lib/domain/rank.ts — canonical declaration: .claude/skills/svelte5-runes/references/patterns.md section 2`. Two files declaring the same module is how `Patient` / `PatientSnapshot` and `ParseResult` / `Parsed` survived three audits: the copies drift, both look authoritative, and the one a builder happens to read decides what ships. Before adding any code block longer than a few lines to a document, check the section 4 symbol-reconciliation table and either point at the declaration or mark the block an excerpt.

## 6. Domain vocabulary

| Term | Meaning |
|---|---|
| Risk level | `"Critical" \| "High" \| "Medium" \| "Low"` from the backend. Never computed client-side; missing/unrecognised is its own state. |
| Risk score | `readings[].risk_score`, an unscaled Number. Range is undefined (**G-12**) — print verbatim, no gauge, no reference band. The **unit is `%`**, DECLARED by the product owner on 2026-08-18 (**D-27**) and rendered from the single constant `RISK_SCORE_UNIT` in `$lib/domain/derive`; knowing the unit is not knowing the scale, so not one digit moves and the 60-minute chart still scales to the window's own extremes rather than pinning 0–100. Nullable post-validation: absent or non-finite is an integrity warning plus an explicit "score unavailable" render (state **S-35**), never `0`, and never a reason to drop the patient from the board. |
| Reading | One entry in `readings[]`, stamped `charttime`. "Latest" = parse every `charttime`, sort **ascending**, take the last element; on an exact tie the reading appearing **later in the source array** wins and raises an integrity warning (state **U-12**). Never `readings[0]`, and never rely on sort stability to break the tie. |
| Contributor / primary driver | `readings[].top_contributors[]` (`name`, `contribution`). Primary driver = element `[0]` **after** the deterministic F-4 ordering (contribution descending, then name via `Intl.Collator`), never element `[0]` as delivered — the schema marks no primary. Sign and scale are unspecified: never `Math.abs`, never re-normalise to 100%. Empty or absent renders the literal string `No ranked factors available` — never a fabricated driver. |
| Imputed share | `readings[].imputed_share`, unscaled Number. How much of the reading was imputed. Scale unconfirmed — do not format as a percentage. |
| Documentation share | `readings[].documentation_share`, unscaled Number. Same rule as imputed share. |
| Provenance (`source`) | `measured` (read from device at chart time), `carried_forward` (last measured value reused; must retain `last_measured`), `population_reference` (not measured on this patient; distinct styling + explanatory panel, and **no** computed age). Nullable post-validation: absent or unrecognised is state **S-15**. The four badge literals are `Measured`, `Carried forward`, `Not measured on this patient` and `Provenance unknown` (`docs/spec/ui-states.md` S-12…S-15) — never a fifth spelling, never a default of `measured`. |
| Sufficient / insufficient data | `readings[].sufficient_data`. `insufficient` means the score is not reliable and explanation + citations are withheld. Nullable post-validation, and `null` is **not** `sufficient`: it gates exactly as `insufficient` does under the label `data sufficiency unknown` (state **S-10**). Only `=== 'sufficient'` unlocks the normal rendering. |
| Warning status | `warning_status.status`: `"Reviewed" \| "Pending Review" \| null`. Schema casing differs from the doc's "Pending review" — normalise in the adapter, never in components. |
| Review status (`ReviewStatus`) | Derived triage state: `pending_review` / `reviewed` / `unknown`. Pending ranks first; unknown ranks second but is **excluded** from the "Needs review" filter. That asymmetry is deliberate. |
| Model use | Whether a parameter is a current score factor or merely available. **Not in the schema.** The union is `'score_factor' \| 'available' \| 'unknown'`. A name match against `top_contributors` proves `score_factor`; absence proves nothing and renders `unknown`. `available` is only ever produced by an explicit backend flag — never inferred from a `top_contributors` miss (**G-04**). |
| Readings held at this level | Backwards run-length over `readings[]` on `risk_level`. When the run reaches the first returned reading the count is a lower bound: display `≥ N readings at this level`, otherwise `N readings at this level`. When the latest reading's `risk_level` is `null` the walk never starts and the slot renders `Readings held at this level: unavailable. The latest reading has no risk level.` — never a count beside a `Risk level unavailable` chip. All three literals are state `S-38`; the ASCII `>= N` is a retired spelling (`docs/spec/ui-states.md` section 4). |

## 7. Where the deep knowledge lives

| When you are about to… | Read / invoke |
|---|---|
| Write or review any `.svelte` / `.svelte.ts` file | `.claude/skills/svelte5-runes/SKILL.md` |
| Choose a colour, token, class, layout, or dark-mode behaviour | `.claude/skills/tailwind-design-system/SKILL.md` |
| Implement a screen, route, ranking, filter, or the data adapter | `.claude/skills/pulsemind-spec/SKILL.md` |
| Ship a component that has more than one state | `.claude/skills/ui-state-matrix/SKILL.md` (working copy of `docs/spec/ui-states.md`; on any disagreement `ui-states.md` wins) |
| Add focus, keyboard, live-region, drawer, table, or chart behaviour | `.claude/skills/clinical-a11y/SKILL.md` |
| Hit something surprising, or fix a bug you could have prevented | `.claude/skills/lessons-learned/SKILL.md` → `docs/LESSONS.md` |
| Create `package.json`, configs, or the initial `src/` tree | `.claude/skills/bootstrap/SKILL.md` |
| Need the normalized screen map, routes, ranking comparator, interaction rules | `docs/spec/screens.md` |
| Map the schema to the **wire** types or write the validation boundary | `docs/spec/data-contract.md` (section 1 = `src/lib/data/wire.ts`) |
| Write or change a **domain** type in `src/lib/domain/types.ts` | `.claude/skills/svelte5-runes/references/patterns.md` section 1 — canonical there for every member except `ModelUse`, `Known<T>` and `RankKey`, which are canonical in `docs/spec/data-contract.md` section 1.6 |
| Check what a given state must and must not show | `docs/spec/ui-states.md` — the authoritative state matrix |
| Look up a token, contrast ratio, or component spec | `.claude/skills/tailwind-design-system/SKILL.md` + `.claude/skills/tailwind-design-system/references/tokens.css` |
| Quote a contrast ratio or a colour-vision separation figure | `docs/spec/contrast-ledger.md` — **generated**, never hand-edited |
| Check a WCAG 2.2 AA requirement | `.claude/skills/clinical-a11y/SKILL.md` |
| Find or file an open gap | `docs/spec/open-questions.md` |

Every path above exists on disk today. `docs/spec/` contains exactly **five** files — `screens.md`,
`ui-states.md`, `data-contract.md`, `open-questions.md`, and `contrast-ledger.md`; there is no
`product-spec.md`, `design-system.md`, or `accessibility.md`. If a lookup lands on a missing file,
that is a harness bug: report it, do not re-derive the rule.

`contrast-ledger.md` is the odd one out and the rule for it is different: **it is generated, and it
is the only place a contrast ratio or a ΔE figure is authoritative.** `front-end/scripts/build-tokens.mjs`
emits `front-end/src/app.css`, `.claude/skills/tailwind-design-system/references/tokens.css` and that
ledger from one model in one pass, so the stylesheet the app ships and the table a reviewer quotes
cannot disagree. Never hand-edit it, never hand-edit the two generated CSS files, and never restate
one of its numbers as a literal in prose that will not be regenerated with it — cite the ledger.
Changing a colour means editing `scripts/palette.mjs` or `scripts/build-tokens.mjs` and re-running
`node scripts/build-tokens.mjs` from `front-end/`; the script fails loudly if any pair drops below a
floor, which is the point.

`docs/Handoff.pdf` and `docs/patientSchema.js` are the spec of record. If a harness doc conflicts with them, the handoff wins and the harness doc is a bug. Never read the PDF to re-derive a rule that is already normalized in `docs/spec/` — quote the spec file and cite the handoff section it carries.

Two more schema artefacts now exist and **neither has replaced `docs/patientSchema.js`**: `back-end/model/patientSchema.js` is a copy of it whose only difference is the line endings — CRLF in `docs/`, LF under `back-end/`, so the contents match character for character while the bytes and the checksums do not — and `back-end/model/Patient.js` is the **live** Mongoose model, which differs from both. Which one governs the wire contract is **G-48**, and until it is answered the validator stays defensive against every difference — see `docs/spec/data-contract.md` section 4.5 for the enumerated divergences. Do not "reconcile" them by editing anything under `back-end/`.

## 8. Available subagents

These six are the entire roster in `.claude/agents/`. There is no `clinical-ui-reviewer`, `state-matrix-auditor`, `spec-gap-hunter`, or `test-author` — never delegate to a name not in this table.

| Agent | Delegate when |
|---|---|
| `svelte-ui-builder` | A screen, route, component, or `.svelte.ts` module under `src/` must be written or extended — including the Vitest/Playwright assertions for the section-5 rules it could break. |
| `svelte-code-reviewer` | Any component, route, or state module touching patient data was written or changed: runes correctness, derive-don't-sync, keying, class-name construction, `any`/`as`/`!` over wire data. |
| `ui-state-auditor` | A component gains a branch, before calling any screen done, or the moment you are tempted to pick a default the handoff never specified — it owns gap-hunting and files the `docs/spec/open-questions.md` row. |
| `a11y-auditor` | Focus, keyboard, ARIA, contrast, live regions, tables, charts, or the drawer are touched. |
| `data-contract-guardian` | `src/lib/data/**` or `src/lib/domain/types.ts` changes, or any `readings` / `warning_status` / provenance handling crosses the wire boundary. |
| `handoff-conformance-checker` | **Release gate.** Before any milestone, demo, PR, or handback — it walks the Handoff section 9 frontend checklist, the section 6 global state reference, and the section 7 navigation table. Nothing ships without it. |

## 9. Working agreement

1. Read the relevant skill **before** writing code, not after review comments.
2. Check `.claude/skills/ui-state-matrix/SKILL.md` before declaring any component finished. Enumerate its states; a component with an unhandled state is unfinished.
3. Ask rather than invent. If the handoff is silent, add a row to `docs/spec/open-questions.md`, render the labelled unknown treatment with that row's register id in `data-clarify`, and say so in your summary. Do not fill the gap and move on.
4. Label every self-invented visual decision inline as "harness-defined, pending design confirmation" so nobody mistakes it for handoff-mandated styling.
5. Run `pnpm check` and `pnpm test` before reporting done. Zero type errors is the bar.
6. Record anything surprising in `docs/LESSONS.md` via `.claude/skills/lessons-learned/SKILL.md` — especially any near-miss where a silent default almost shipped.
7. Never scaffold application source unless the task explicitly asks for it. Harness and docs are the current deliverable.
8. **Write like an engineer, not like an AI.** Instruction from the product owner, 2026-08-19. Two hard rules.

   **Never use the em dash character.** Not in chat, not in code comments, not in register rows, not in `docs/LESSONS.md`, not in skill documents. Use a comma, a colon, brackets, or start a new sentence. The same goes for the en dash used as punctuation; it stays only inside numeric ranges such as `0.64-0.96` and `4.5:1`.

   **ONE EXCEPTION, and it is not negotiable: the mandated clinical literals keep the exact characters `docs/spec/ui-states.md` mandates.** Four of them contain an em dash today: `Insufficient data — risk score is not reliable`, `Data sufficiency unknown — risk score is not reliable`, `Explanation withheld — data sufficiency unknown`, and `Guideline references withheld — data sufficiency unknown`. Those strings are asserted character for character by tests and by the state matrix. Editing one to satisfy this rule changes what a clinician reads on a screen about data they cannot trust. Do not touch them. If the wording itself should change, that is a row in `docs/spec/open-questions.md` under **D-10**, not a punctuation cleanup.

   **Drop the machine cadence.** Say the thing, then stop. No long appositive clauses stacked into one sentence, no "not X but Y", no restating a point in a second shape for emphasis, no bolded punchline at the end of a paragraph. Short sentences are fine. Plain words are fine.

   This is not a style preference. These documents go to a design and clinical team, and prose that reads as machine-written costs the work credibility it has to earn back. Existing files still carry the old style in about 3,300 places; fix them as you touch them rather than in one sweep.

## 10. Definition of done (any UI change)

- [ ] Every state the component can reach is enumerated and rendered distinctly — including missing, unknown, insufficient, error, and empty. No two of those share a treatment.
- [ ] No colour-only encoding; every risk / review / provenance / sufficiency signal carries a text label and a non-colour channel.
- [ ] No interpolated class names; no raw palette utilities; no hex literals.
- [ ] No `$effect` that writes state a `$derived` could compute; every `{#each}` over clinical data is keyed by a domain id.
- [ ] Units adjacent to every value; absolute timestamps present; no fabricated time, scale, threshold, or unit.
- [ ] Keyboard reachable, `:focus-visible` two-ring indicator present, 44×44 target floor for primary clinical actions, no dragging.
- [ ] `pnpm check` clean, `pnpm test` green, and a test exists for each section-5 rule this change could break.
- [ ] Every gap encountered is a row in `docs/spec/open-questions.md`, not a silent default.
