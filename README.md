# PulseMind

Clinical decision-support frontend for ICU respiratory-risk assessment of adult ventilated patients.
Read-only: it displays an assessment, it does not make one, and nothing on any screen writes to a
patient record.

This file is about **running and deploying** the two projects. For how the product is meant to
behave, read `CLAUDE.md` and `docs/spec/`. For what changed most recently — including two
**data-contract overrides** that put numbers on screen which the schema does not confirm — read
`CHANGELOG.md`.

```
back-end/    Express 4 + Mongoose 6 on Node.  npm.   Port 3500.
front-end/   SvelteKit 2 + Svelte 5 + Tailwind v4.   pnpm.  Static SPA.
scripts/     run-demo.sh, which brings both up behind two Cloudflare tunnels.
docs/        the specification, the open-questions register, the lessons log.
```

They are **two separate projects with two separate lockfiles**. Never run `pnpm` at the repository
root or inside `back-end/`, and never run `npm install` inside `front-end/`. A package manager run in
the wrong directory creates a second project on top of an existing one and breaks both.

---

## Requirements

| | Version | Notes |
|---|---|---|
| Node | 22.x | backend declares `>=18`; the frontend toolchain is built and tested on 22 |
| pnpm | 10.x | frontend only |
| npm | bundled with Node | backend only |
| MongoDB | 6.x or Atlas | optional for a trial run, see below |

The backend can run with **no MongoDB installed**: `npm run dev:seeded` starts an in-process server
(`mongodb-memory-server`) and seeds it. That is for trying it and for tests. It keeps nothing when the
process stops, so it is never a deployment.

---

## Fastest way to see it working

```bash
cd back-end  && npm install && npm run dev:seeded    # :3500, in-process DB, seeded
cd front-end && pnpm install && pnpm dev             # :5173, fixtures
```

Open http://localhost:5173. This runs the frontend on **fixture data**, not on the service, and the
board says so with a `Fixture data — not the assessment service` banner. To point it at the backend
you just started, see the next section.

To expose both through public URLs for a demonstration, use `./scripts/run-demo.sh` from the
repository root. It prints the URLs and the sign-in credentials. Read `CLAUDE.md` section 4.1 first:
the hostname changes on every restart, which invalidates registered passkeys.

---

## Backend

### Install and run

```bash
cd back-end
npm ci                                              # `npm install` also works; `ci` uses the lockfile
MONGODB_URI='mongodb://127.0.0.1:27017/pulsemind' npm start
```

`npm start` runs `node server`. The process **binds the port whether or not the database connects**,
and `/patient/**` answers a named `503` while the database is down rather than hanging. Check which
state it is in:

```bash
curl -s localhost:3500/health
# {"service":"pulsemind-backend","listening":true,"database":"connected"}   200
# database "disconnected"                                                  503
```

### Seed data

The seed is 30 synthetic patients with 121 readings, and it deliberately includes edge cases a
validator would otherwise reject: a null `sufficient_data`, a null `risk_level`, an unrecognised
`source`, a carried-forward parameter with no `last_measured`. Those are what make the frontend's
missing-data states reachable at all. One patient (`PT-1001`) carries a denser 30-reading, ~58-minute
series specifically so the 60-minute charts' step behaviour and provenance mix are visible without
switching patients.

```bash
npm run seed              # insert into MONGODB_URI
npm run seed:rebase       # same, with timestamps shifted so the newest reading is recent
npm run seed:users        # the demo sign-in accounts
```

Synthetic only. Never seed a database that holds real patients.

### Environment

| Variable | Required | Default | What it does |
|---|---|---|---|
| `MONGODB_URI` | yes, in production | none | connection string. Unset plus `PULSEMIND_MEMORY_DB` starts an in-process database instead |
| `PORT` | no | `3500` | |
| `CORS_ORIGINS` | see below | none | comma-separated extra origins. The built-in allow-list is in `config/allowedOrigins.js` |
| `PULSEMIND_SESSION_SECRET` | **yes** | dev fallback | signs the session cookie. Set a real one |
| `PULSEMIND_PENDING_SECRET` | **yes** | dev fallback | signs the pending token between the password step and the second factor |
| `PULSEMIND_RP_ID` | for passkeys | none | the WebAuthn relying party: the **registrable domain of the page the user is on**, a host, never a URL and never a port |
| `PULSEMIND_RP_NAME` | for passkeys | none | shown in the browser's passkey prompt |
| `PULSEMIND_WEBAUTHN_ORIGINS` | for passkeys | none | full origins allowed to complete a ceremony |
| `PULSEMIND_COOKIE_CROSS_SITE` | only if cross-site | unset | sets `SameSite=None; Secure`. See the warning below |
| `PULSEMIND_MEMORY_DB` | dev/test only | unset | in-process MongoDB |
| `PULSEMIND_SEED_ON_BOOT` | dev/test only | unset | seed on start |
| `PULSEMIND_DEMO_PASSWORD` | no | `PulseMind-demo-2026` | the seeded accounts' password |

Set the two secrets to real random values. They have development fallbacks so the service starts, and
a fallback secret in production means anyone who has read this repository can mint a session.

### Routes

| Route | |
|---|---|
| `GET /health` | `200` connected, `503` otherwise |
| `GET /patient/all` | the whole unit, wire-shaped. `?limit=` optional. An empty unit is `200 []` |
| `GET /patient/info/:patient_id` | demographics and `underlying_condition` |
| `GET /patient/warning/:patient_id` | the `warning_status` object |
| `GET /patient/reading/:patient_id` | the `readings` array |
| `POST /patient/reading/:patient_id` | upsert one patient; the path id wins |
| `/auth/**` | sign-in, TOTP, passkeys, session, sign-out |

**`/patient/**` is not authenticated.** That is deliberate and recorded as **G-46**, not an
oversight: which patients a role may see has never been specified, and this repository will not
invent an authorisation model. The frontend's own gate (`D-16`) protects the UI, not the API. Before
this goes anywhere near real data, that row has to be answered and the API has to enforce it.

### Verify a deployment

```bash
npm run smoke        # 34 checks, each naming the register row it covers
npm run smoke:auth   # the sign-in surface
```

---

## Frontend

### Install and build

```bash
cd front-end
pnpm install --frozen-lockfile
pnpm build           # -> build/, about 1.1 MB
```

Verified from a clean extract of the source archive: install and build take under 20 seconds
together and produce `build/` with no further configuration.

`build/` is a **static SPA**: plain files, no Node process. Serve it from any static host or a
reverse proxy. There is no server to run.

Preview the real build locally:

```bash
pnpm preview         # :4173
```

### The host must serve the SPA fallback

Every route is resolved by the client router, so the host must return `build/index.html` for any path
it has no file for. Without this a refresh on `/patients/PT-1001`, or a deep link from a handover
message, is a 404 from the web server. That is the navigation a clinician is most likely to use.

nginx:

```nginx
root /srv/pulsemind;
location / {
  try_files $uri $uri/ /index.html;
}
```

Caddy:

```
root * /srv/pulsemind
try_files {path} /index.html
file_server
```

### Environment

Read at **build time** for `pnpm build`, and at request time by `pnpm dev`. A static host cannot
change them after the fact: rebuild to change one.

| Variable | Default | What it does |
|---|---|---|
| `PUBLIC_PULSEMIND_DATA_SOURCE` | *(fixtures)* | **exactly** `http` selects the live service. Any other value, and unset, selects fixtures |
| `PUBLIC_PULSEMIND_API_BASE` | `http://localhost:3500` | where the service is. **Set it to `/api`** in any real deployment, and see the next section for why |
| `PUBLIC_PULSEMIND_REQUIRE_AUTH` | `false` | `true` makes the UI require sign-in |

The default is fixtures on purpose. A deployment that misspells the variable gets a screen that
renders, carrying a visible `Fixture data — not the assessment service` banner, rather than a wall of
named transport errors. The comparison is against the exact string `http`, so
`PUBLIC_PULSEMIND_DATA_SOURCE=1` does not silently mean "go live".

A production deployment therefore wants:

```bash
PUBLIC_PULSEMIND_DATA_SOURCE=http \
PUBLIC_PULSEMIND_API_BASE=/api \
PUBLIC_PULSEMIND_REQUIRE_AUTH=true \
pnpm build
```

### Serve the API under the app's own origin

`PUBLIC_PULSEMIND_API_BASE=/api` and a reverse-proxy rule from `/api` to the backend. This is a
correctness requirement, not a convenience.

With the UI and the service on different registrable domains the session cookie is **third-party**.
Safari blocks those by default and Firefox's Total Cookie Protection does the same. The observed
failure was `POST /auth/login` returning `200`, the browser silently dropping the `Set-Cookie`, and
the clinician bounced back to the sign-in screen they had just completed, with no error. Every
Chromium-based test was green. It is **G-52** and `docs/LESSONS.md` L-071.

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3500/;
  proxy_set_header Host $host;
}
```

Note the trailing slashes: they strip the `/api` prefix, so `/api/patient/all` reaches the service as
`/patient/all`. Proxying this way also means there is no cross-origin request, so `CORS_ORIGINS`
needs no entry for the UI.

### Checks

```bash
pnpm check      # svelte-check, strict. Zero errors AND zero warnings is the bar
pnpm lint       # prettier + eslint
pnpm test       # vitest
pnpm test:e2e   # playwright: a production build on :4173, then the gated dev server on :5174
```

`pnpm test:e2e` starts its own backend on `:3500` and expects it fresh. `./scripts/run-demo.sh` binds
`:3600` for exactly this reason: the sign-in throttle is in-process, and a long-lived shared backend
accumulates failed-attempt counters until the tests that assert the failure paths lock themselves out
(`docs/LESSONS.md` L-072).

### Generated files

Do not hand-edit these; run the generator.

| Command | Writes |
|---|---|
| `node scripts/build-tokens.mjs` | `src/app.css`, the design-system tokens file, `docs/spec/contrast-ledger.md` |
| `pnpm brand` | the traced wordmark SVG and the loading mark's still frame, from `static/images/` |
| `pnpm fixtures` | `src/lib/data/fixtures/patients.ts`, from `back-end/seed/patients.json` |

`build-tokens.mjs` fails the build if any colour pair drops below its contrast floor. That is the
point of it.

---

## Before this is used with real patients

Not a checklist of nice-to-haves. Each of these is a row in `docs/spec/open-questions.md` that is
still open, and the first three are the ones that matter most.

- **`/patient/**` is unauthenticated (G-46).** The API must enforce authorisation, and who may see
  which patients must be specified first.
- **The units are provisional (G-01, D-23).** No `unit` field exists anywhere on the wire. The
  interface supplies a label from the parameter name, marks every one of them in the UI, and says so
  in the table header. A clinician has to sign those off, row by row.
- **The risk score's scale is undeclared (G-12).** The unit `%` was declared by the product owner
  (D-27). What it is a percentage *of*, and whether the model is bounded at 100, was not.
- The palette, the type scale, the copy for every unavailable state, and the loading treatment are
  harness-defined pending design confirmation. They are labelled as such in the UI.
- Session storage, throttling and WebAuthn challenges are in the API process's memory (G-53), so they
  reset on restart and do not survive more than one instance.
