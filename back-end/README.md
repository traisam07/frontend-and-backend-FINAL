# PulseMind — assessment service

Express 4 + Mongoose 6. Serves the ICU respiratory-risk patient data that the PulseMind frontend
(`../front-end`) renders.

## Run it

```bash
cd back-end
npm install

# No MongoDB installed? No Docker? This is the one to use.
npm run dev:seeded      # in-process MongoDB + 30 seeded patients, on :3500

# Against a real database
MONGODB_URI=... npm start
MONGODB_URI=... npm run seed:rebase
```

`npm run dev:seeded` sets `PULSEMIND_MEMORY_DB=1` and `PULSEMIND_SEED_ON_BOOT=1`. It starts an
in-process MongoDB through `mongodb-memory-server` and seeds it **in the same process**, which is the
only way an ephemeral database can hold data — it dies with the process that created it. Nothing is
persisted between runs.

Verify everything with one command:

```bash
npm run smoke           # boots the real server, seeds it, runs 34 checks
```

Each check names the `docs/spec/open-questions.md` row it proves, so a green run is evidence against
the register rather than a feeling.

## Endpoints

| Method | Path | Returns |
|---|---|---|
| `GET` | `/health` | `200` when the database is connected, `503` otherwise |
| `GET` | `/patient/all` | the whole unit — an array of complete, wire-shaped patients. `?limit=` optional |
| `GET` | `/patient/info/:patient_id` | demographics + `underlying_condition` |
| `GET` | `/patient/warning/:patient_id` | the bare `warning_status` object |
| `GET` | `/patient/reading/:patient_id` | the bare `readings` array |
| `POST` | `/patient/reading/:patient_id` | upsert one patient; the path id is authoritative |
| `POST` | `/patient/import/producer` | optional bulk import from the FastAPI producer (**G-47**) |

Not-found is `404` with a readable JSON body. An empty unit is `200 []` — never a `204`, and never an
error.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3500` | listen port |
| `MONGODB_URI` | — | connection string. Unset + `PULSEMIND_MEMORY_DB` starts an in-process MongoDB |
| `PULSEMIND_MEMORY_DB` | unset | `1` starts an in-process MongoDB |
| `PULSEMIND_SEED_ON_BOOT` | unset | `1` seeds on boot **when the collection is empty** |
| `PULSEMIND_SEED_FORCE` | unset | `1` re-seeds even when it is not empty |
| `CORS_ORIGINS` | — | comma-separated extra origins, on top of the built-in dev list |
| `PULSEMIND_PRODUCER_BASE` | `http://127.0.0.1:8000` | the FastAPI producer for the bulk import |

## What was repaired, 2026-08-16

Seven defects, each a registered row in `../docs/spec/open-questions.md`, all now
`ANSWERED 2026-08-16`:

- **G-44** — `module.exports` named a `createNewPatient` that was defined nowhere in the controller
  (the function that existed was `create100NewPatient`), so requiring the controller threw a
  `ReferenceError` at module load and the process never started. `axios` was required by the same
  file and absent from `package.json`, which would have thrown for a second reason. `createNewPatient`
  is a real handler now, and `axios` is both declared and required lazily so an optional integration
  can never again take the service down at boot.
- **G-44 (boot)** — `app.listen` ran **only** inside `mongoose.connection.once('open', …)`, so with no
  reachable database the process started, bound nothing, and never exited. "Not installed", "crashed
  at boot" and "database unreachable" all reached a client as one refused connection. The port now
  binds unconditionally, `/health` reports the database state, and `/patient/**` answers a named
  `503` instead of hanging on a driver timeout.
- **G-43** — every handler guarded on `req?.params?.id` while the routes declared `:patient_id`, so
  `req.params.id` was always `undefined` and every request answered `400 "Patient ID required."`.
  The lookup was also `findOne({ _id })`, keyed on the Mongo ObjectId, while the URL, the triage
  card, the ranking key and every deep link carry the business `patient_id`. Both halves fixed, and
  the id is read in exactly one place so the mismatch cannot return one handler at a time.
- **G-42** — not-found was `res.status(204).json({ message: … })`. HTTP 204 means *No Content* and the
  body is discarded in transit, so a client could not tell "no such patient" from any other empty
  response. It is `404` with a body now.
- **G-40** — `getAllPatient` was defined and exported but routed nowhere, and its body called an
  undeclared `Patientatient`. The Patient Overview board had no endpoint to call at all. Fixed and
  mounted at `GET /patient/all`.
- **G-49** — the CORS allow-list omitted `http://localhost:5173`, the Vite dev origin, so the first
  real request from `pnpm dev` failed the preflight. Both `5173` spellings and the `4173` preview
  pair are listed, and `CORS_ORIGINS` covers anything else without a code change.
- `errorHandler` sent `err.message` as plain text on every failure. It answers JSON now and never
  leaks a stack to the client.

**Deliberately NOT changed.** `model/Patient.js` is untouched — which of the three schema artefacts
governs the wire contract is still **G-48**. Authentication is still commented out (**G-45**), the
response envelope is still unspecified (**G-30**, **G-39**), and the `enum` quirk in
`warning_status.status` is still **G-46**.

## Sample data

```bash
npm run seed:generate   # rewrite seed/patients.json deterministically
npm run seed            # insert it into MONGODB_URI
npm run seed:rebase     # ...with every instant shifted so the newest reading is now
```

`seed/generate.js` is deterministic — a seeded LCG and a fixed anchor, no `Math.random()` and no
`Date.now()` — so re-running it produces a byte-identical file. 30 patients, 121 readings.

The set is built to reach **every state** `../docs/spec/ui-states.md` says data can produce, and the
edge cases are declared individually in `generate.js` with the state id each one makes reachable: a
null review status (S-09), a null risk level (S-05) and its S-38 unavailable run-length, a null risk
score (S-35), both branches of S-10, zero readings (U-11 / U-22), colliding `charttime`s (U-12), a
null `charttime`, a `carried_forward` parameter with no `last_measured` (G-18), a
`population_reference` parameter (S-14), an unrecognised `source` string (S-15), a sufficient reading
whose `explanation` is null (S-37), an empty contributor list, a first-place tie, a run reaching the
oldest delivered reading, no comorbidities (S-26), a 26-minute gap inside the 60-minute window, and a
patient with a single plotted point.

Rows go in through `collection.insertMany`, **deliberately bypassing the Mongoose model**. Several of
those values are outside the model's `enum`s, and they are exactly the cases the UI must handle —
validating them away at insert time would make the frontend look correct by never showing it the
states it exists to render.

`../front-end/src/lib/data/fixtures/patients.ts` is **generated from the same JSON**
(`cd ../front-end && node scripts/build-fixtures.mjs`), so the frontend's fixture board and this
service's live board are the same unit rather than two sets that happen to look alike.

## Pointing the frontend at this service

The frontend defaults to fixtures. To use this service:

```bash
cd ../front-end
PUBLIC_PULSEMIND_DATA_SOURCE=http PUBLIC_PULSEMIND_API_BASE=http://localhost:3500 pnpm dev
```

The board says visibly which source produced what is on screen, either way.
