/**
 * The seeding step itself, shared by `scripts/seed.js` (a one-shot CLI against a real MongoDB) and
 * by `server.js` (auto-seeding an in-process MongoDB on boot, which is the only way an ephemeral
 * database can have data at all — the seed and the server must be the same process).
 *
 * Documents go in through `collection.insertMany`, NOT the Mongoose model. The set deliberately
 * carries values the model's `enum`s do not list — `sufficient_data: null`, `risk_level: null`, an
 * unrecognised `source`, a `carried_forward` parameter with no `last_measured` — because those are
 * the real states `docs/spec/ui-states.md` S-05 / S-10 / S-15 and rows G-18 / G-31 exist for.
 * Validating them away at insert time would make the frontend look correct by never showing it the
 * cases it has to handle.
 */

'use strict';

const Patient = require('../model/Patient');
const patients = require('./patients.json');

/**
 * Shift every ISO instant by one constant offset so the newest `charttime` lands on `at`.
 *
 * The offset is the SAME for every field of every patient, so all relative spacing — the 60-minute
 * window, the deliberate 26-minute gap, the carried-forward ages, the exact-collision pair — is
 * preserved. This is a presentation convenience for a demo, never a clinical transform: no value is
 * recomputed, and no reading is added, removed, or reordered.
 */
function rebase(set, at) {
    let newest = Number.NEGATIVE_INFINITY;
    for (const patient of set) {
        for (const reading of patient.readings ?? []) {
            const t = Date.parse(reading.charttime ?? '');
            if (Number.isFinite(t) && t > newest) newest = t;
        }
    }
    if (!Number.isFinite(newest)) return set;

    const offset = at - newest;
    const shift = (value) => {
        if (typeof value !== 'string') return value;
        const t = Date.parse(value);
        return Number.isFinite(t) ? new Date(t + offset).toISOString() : value;
    };
    const INSTANT_KEYS = new Set(['charttime', 'last_measured', 'review_at', 'flag_when']);

    const walk = (node) => {
        if (Array.isArray(node)) return node.map(walk);
        if (node === null || typeof node !== 'object') return node;
        const out = {};
        for (const [key, value] of Object.entries(node)) {
            out[key] = INSTANT_KEYS.has(key) ? shift(value) : walk(value);
        }
        return out;
    };

    return set.map(walk);
}

/**
 * @param {{ rebase?: boolean, wipe?: boolean, at?: number }} options
 * @returns {Promise<{ inserted: number, readings: number, removed: number }>}
 */
async function applySeed(options = {}) {
    const { rebase: shouldRebase = false, wipe = true, at = Date.now() } = options;

    const documents = shouldRebase ? rebase(patients, at) : patients;

    let removed = 0;
    if (wipe) {
        const result = await Patient.collection.deleteMany({});
        removed = result.deletedCount ?? 0;
    }

    // Unique on the BUSINESS key, so re-seeding cannot silently produce two of the same patient —
    // which would make the unit's membership wrong in a way no screen could show.
    await Patient.collection.createIndex({ patient_id: 1 }, { unique: true });

    const result = await Patient.collection.insertMany(documents, { ordered: false });
    const readings = documents.reduce((n, p) => n + (p.readings?.length ?? 0), 0);

    return { inserted: result.insertedCount ?? 0, readings, removed };
}

async function isEmpty() {
    return (await Patient.collection.countDocuments({}, { limit: 1 })) === 0;
}

module.exports = { applySeed, isEmpty, rebase, patients };
