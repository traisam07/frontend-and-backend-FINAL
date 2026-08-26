/**
 * PulseMind — patient endpoints.
 *
 * Every fix below is a registered row in `docs/spec/open-questions.md`; the row is named beside the
 * change so the diff is auditable against the register rather than against memory.
 *
 *   G-44  `module.exports` named `createNewPatient`, which was defined nowhere in this file (the
 *         function that existed was `create100NewPatient`). Referencing an undeclared identifier in
 *         an object literal throws a `ReferenceError` at module load, so `require`ing this
 *         controller failed and the server never started. `createNewPatient` is now a real handler.
 *         The same defect had a second cause: `require('axios')` at module scope while `axios` was
 *         not in `package.json`. It is now a declared dependency AND required lazily, so a missing
 *         optional integration can never again take the whole service down at boot.
 *
 *   G-43  The routes declare `:patient_id` while every handler read `req.params.id`. Express keys
 *         `req.params` by the name in the path, so `req.params.id` was always `undefined` and every
 *         request answered `400 "Patient ID required."`. Handlers now read `req.params.patient_id`.
 *         The second half of the same row: the lookup was `findOne({ _id: … })`, keyed on the Mongo
 *         ObjectId, while the URL, the triage card, the ranking key and every deep link carry the
 *         business `patient_id`. The frontend never holds an `_id`, so it could not address a
 *         patient at all. Lookups are now on `patient_id`.
 *
 *   G-42  The not-found path was `res.status(204).json({ message: … })`. HTTP 204 means *No
 *         Content* and the body is discarded in transit, so the client could not tell "no such
 *         patient" from any other empty response. It is now `404` with a readable body.
 *
 *   G-40  `getAllPatient` was defined and exported but routed nowhere, and its body called
 *         `Patientatient.find()` — an undeclared identifier that would have thrown on the first
 *         request. It is fixed and mounted (`routes/api/patient.js`), so the triage board finally
 *         has an endpoint to call.
 *
 * Responses are `.lean()` throughout: the seed data deliberately contains values the Mongoose model's
 * `enum`s do not list (`sufficient_data: null`, an unrecognised `source`, a null `risk_level`),
 * because those are the real states `docs/spec/ui-states.md` S-05 / S-10 / S-15 exist for. Hydrating
 * them through the model would cast or drop exactly the cases the frontend must prove it handles.
 */

const Patient = require('../model/Patient');

/** Keys Mongo adds that are not part of the wire contract. Stripped so the payload is schema-shaped. */
const INTERNAL_KEYS = new Set(['_id', '__v']);

/**
 * Deep-strip `_id` / `__v`, including from every subdocument. Mongoose stamps an `_id` on each
 * element of an array of subdocuments, and shipping them would add fields
 * `docs/patientSchema.js` does not define.
 */
function stripInternal(value) {
    if (Array.isArray(value)) return value.map(stripInternal);
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();

    const out = {};
    for (const [key, entry] of Object.entries(value)) {
        if (INTERNAL_KEYS.has(key)) continue;
        out[key] = stripInternal(entry);
    }
    return out;
}

/** Wraps an async handler so a rejected promise becomes an Express error, never a silent hang. */
function asyncHandler(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/**
 * Resolve the patient id from the path. The parameter is `:patient_id` — the name the routes
 * declare — and it is read here in exactly one place so the G-43 mismatch cannot come back one
 * handler at a time.
 */
function readPatientId(req) {
    const raw = req?.params?.patient_id;
    return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

/** The one not-found response. `404` with a body — never `204`, whose body is discarded (G-42). */
function notFound(res, patientId) {
    return res.status(404).json({ message: `No patient matches id ${patientId}.` });
}

function badRequest(res) {
    return res.status(400).json({ message: 'Patient ID required.' });
}

/** Lookup by the BUSINESS key. The frontend holds `patient_id` and never an `_id` (G-43). */
function findByPatientId(patientId) {
    return Patient.findOne({ patient_id: patientId }).lean().exec();
}

/* ------------------------------------------------------------------------------------------------
 * The three fragment endpoints (docs/spec/data-contract.md section 4.1)
 * ---------------------------------------------------------------------------------------------- */

const getPatientInfo = asyncHandler(async (req, res) => {
    const patientId = readPatientId(req);
    if (!patientId) return badRequest(res);

    const patient = await findByPatientId(patientId);
    if (!patient) return notFound(res, patientId);

    return res.json(
        stripInternal({
            patient_id: patient.patient_id,
            age: patient.age,
            gender: patient.gender,
            weight: patient.weight ?? null,
            height: patient.height ?? null,
            race: patient.race,
            underlying_condition: patient.underlying_condition ?? []
        })
    );
});

const getWarning = asyncHandler(async (req, res) => {
    const patientId = readPatientId(req);
    if (!patientId) return badRequest(res);

    const patient = await findByPatientId(patientId);
    if (!patient) return notFound(res, patientId);

    // The bare `warning_status` object, exactly as section 4.1 records it. `status` may legitimately
    // be `null` — that is a real third review state (G-09, state S-09) and is never coerced here.
    return res.json(stripInternal(patient.warning_status ?? { status: null, flags: [] }));
});

const getPatientReading = asyncHandler(async (req, res) => {
    const patientId = readPatientId(req);
    if (!patientId) return badRequest(res);

    const patient = await findByPatientId(patientId);
    if (!patient) return notFound(res, patientId);

    // The bare `readings` array. Order is NOT guaranteed and is not sorted here: F-1 is the
    // frontend's rule and sorting server-side would hide a violation of it rather than fix one.
    return res.json(stripInternal(patient.readings ?? []));
});

/* ------------------------------------------------------------------------------------------------
 * The list endpoint (G-40)
 * ---------------------------------------------------------------------------------------------- */

/**
 * The whole unit, as an array of complete patients in the wire shape of `docs/patientSchema.js`.
 *
 * This is the endpoint the Patient Overview board had no way to call. It returns FULL patients
 * rather than a summary, so the frontend runs the same `parsePatientSnapshot` over every element
 * that it runs over a single patient — one validator, one parse path, no lighter contract for the
 * list (`docs/spec/data-contract.md` section 4.4 rule 1).
 *
 * `?limit=` is accepted so a large unit can be paged by the caller. It is NOT a default: unset means
 * the whole unit, because a silently truncated board would misstate the unit's membership, which is
 * a clinical claim (**G-07** remains open on what real pagination should look like).
 */
const getAllPatient = asyncHandler(async (req, res) => {
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 0;

    const query = Patient.find({}, { __v: 0 }).lean();
    if (limit > 0) query.limit(limit);

    const patients = await query.exec();

    // An empty unit is a legitimate answer (`[]`, state U-09 on the frontend), not a 204 and not an
    // error. The frontend renders `No patients in this unit` for it.
    return res.json(stripInternal(patients));
});

/* ------------------------------------------------------------------------------------------------
 * Writes
 * ---------------------------------------------------------------------------------------------- */

/**
 * Create or replace one patient (G-44 — this is the export that did not exist).
 *
 * The route is `POST /patient/reading/:patient_id`, so the path id is authoritative and a
 * conflicting `patient_id` in the body is rejected rather than silently preferred.
 *
 * Note what this is NOT: it is not a review-write endpoint. `Mark as reviewed` is local UI state
 * only while **G-08** is open, and no route here accepts it.
 */
const createNewPatient = asyncHandler(async (req, res) => {
    const patientId = readPatientId(req);
    if (!patientId) return badRequest(res);

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ message: 'Request body must be a patient object.' });
    }
    if (typeof body.patient_id === 'string' && body.patient_id !== patientId) {
        return res.status(409).json({
            message: `Body patient_id "${body.patient_id}" does not match path patient_id "${patientId}".`
        });
    }

    const document = { ...body, patient_id: patientId };

    // `collection.replaceOne` rather than the model, deliberately: the seed and the wire both carry
    // values the model's `enum`s do not list (`sufficient_data: null`, an unrecognised `source`),
    // and those are real states the UI must be able to receive. Validating them away here would make
    // S-05 / S-10 / S-15 unreachable and would hide the very gaps G-31 and G-18 record.
    const result = await Patient.collection.replaceOne({ patient_id: patientId }, document, {
        upsert: true
    });

    return res.status(result.upsertedCount > 0 ? 201 : 200).json({
        patient_id: patientId,
        created: result.upsertedCount > 0
    });
});

/**
 * Import 100 patients from the FastAPI-style producer at `http://127.0.0.1:8000/data/{i}`
 * (`back-end/pythonService/routes/data_service.py`). Whether the frontend ever sees that service is
 * **G-47** and is not decided here.
 *
 * Three things were wrong with the previous version and are fixed: it read `response` instead of
 * `response.data`, so every destructured field was `undefined`; it called `res.status(201).json()`
 * inside the loop, so it tried to send 100 responses on one request; and it swallowed every failure
 * into `console.error`, so a completely failed import reported nothing. `axios` is required lazily
 * so this optional integration cannot break module load again (G-44).
 */
const create100NewPatient = asyncHandler(async (req, res) => {
    const axios = require('axios');
    const base = process.env.PULSEMIND_PRODUCER_BASE || 'http://127.0.0.1:8000';
    const count = Number.parseInt(req.query.count, 10) || 100;

    const imported = [];
    const failed = [];

    for (let i = 0; i < count; i += 1) {
        try {
            const response = await axios.get(`${base}/data/${i}`);
            const payload = response.data;
            if (!payload || typeof payload !== 'object' || typeof payload.patient_id !== 'string') {
                failed.push({ index: i, reason: 'Producer returned no usable patient_id' });
                continue;
            }
            await Patient.collection.replaceOne({ patient_id: payload.patient_id }, payload, {
                upsert: true
            });
            imported.push(payload.patient_id);
        } catch (err) {
            failed.push({ index: i, reason: err.message });
        }
    }

    // One response, after the loop — and the failures are reported rather than logged and dropped.
    return res.status(imported.length > 0 ? 201 : 502).json({
        imported: imported.length,
        failed: failed.length,
        patient_ids: imported,
        failures: failed.slice(0, 10)
    });
});

module.exports = {
    getAllPatient,
    getPatientInfo,
    getPatientReading,
    getWarning,
    createNewPatient,
    create100NewPatient
};
