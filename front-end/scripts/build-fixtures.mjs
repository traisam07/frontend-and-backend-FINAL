/**
 * Generate `src/lib/data/fixtures/patients.ts` from the seed set the backend uses.
 *
 *   node scripts/build-fixtures.mjs            # from front-end/
 *
 * One dataset, two consumers. `back-end/seed/patients.json` is the single source of truth — produced
 * deterministically by `back-end/seed/generate.js` — and it is what the backend inserts into MongoDB.
 * This script embeds the same bytes into a TypeScript module so the frontend's fixture source and the
 * live API serve the *same* unit. Two hand-maintained copies of a 30-patient clinical set would drift,
 * and the drift would be invisible: the board would render, just not the same board.
 *
 * The read reaches ACROSS project boundaries, and that is deliberate and bounded — it happens at
 * authoring time only, never during `vite build`. The emitted module is committed, so the Vite project
 * root stays self-contained and `back-end/` stays outside the frontend's build graph.
 *
 * The emitted constant is typed `readonly unknown[]` and NOT `readonly WirePatient[]`. Pre-typing it
 * would be `as` wearing a nicer coat: it would assert by declaration the very conformance
 * `parsePatientList` exists to test at runtime, and a fixture that drifted from the schema would then
 * fail silently at render time instead of loudly at the boundary
 * (`docs/spec/data-contract.md` section 4.4 rule 1).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../back-end/seed/patients.json');
const target = resolve(here, '../src/lib/data/fixtures/patients.ts');

const raw = readFileSync(source, 'utf8');
const patients = JSON.parse(raw);

const readings = patients.reduce((n, p) => n + (p.readings?.length ?? 0), 0);

const header = `// src/lib/data/fixtures/patients.ts
//
// GENERATED — do not edit by hand. Run \`node scripts/build-fixtures.mjs\` from \`front-end/\`.
// Source of truth: \`back-end/seed/patients.json\`, produced by \`back-end/seed/generate.js\`.
// The backend seeds MongoDB from those same bytes, so the fixture board and the live board are the
// same unit rather than two sets that happen to look alike.
//
// ${patients.length} patients / ${readings} readings, WIRE-SHAPED: snake_case keys spelled exactly as
// \`docs/patientSchema.js\` spells them — \`underlying_condition\` SINGULAR, \`catch\`, \`last_measured\` —
// and every instant an ISO-8601 string, never a \`Date\`.
//
// The set reaches every state \`docs/spec/ui-states.md\` says data can produce
// (\`docs/spec/data-contract.md\` section 4.4 rule 3): a null review status (S-09), a null risk level
// (S-05) and its S-38 unavailable run-length, a null risk score (S-35), a null \`sufficient_data\`
// (S-10's null branch) and an \`insufficient\` one, zero readings (U-11 / U-22), colliding
// \`charttime\`s (U-12), a null \`charttime\` (F-1 step 2), a \`carried_forward\` parameter with no
// \`last_measured\` (G-18), a \`population_reference\` parameter (S-14, and PM-7's panel), an
// unrecognised \`source\` string (S-15), a sufficient reading whose \`explanation\` is null (S-37), an
// empty \`top_contributors\` list, a first-place contribution tie (F-4), a run that reaches the oldest
// delivered reading (S-38's \`≥ N\` form), no comorbidities (S-26), a 26-minute gap inside the
// 60-minute window (F-2), and a patient with one plotted point (F-2's insufficient-history literal).
//
// It adds NO field the schema does not define (rule 2): there is no \`unit\`, no \`description\` and no
// \`model_use\` anywhere below. Those are G-01, G-02 and G-04, and they stay open.

/**
 * Typed \`readonly unknown[]\` on purpose. \`readonly WirePatient[]\` would assert by declaration the
 * conformance \`parsePatientList\` exists to prove at runtime, so a drifted fixture would fail
 * silently at render time instead of loudly at the boundary. \`getFixturePatientSource\` is the only
 * importer.
 */
export const WIRE_PATIENT_FIXTURES: readonly unknown[] = `;

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${header}${JSON.stringify(patients, null, 2)};\n`, 'utf8');

console.log(`Wrote ${patients.length} patients / ${readings} readings to ${target}`);
