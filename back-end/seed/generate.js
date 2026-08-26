/**
 * PulseMind — deterministic sample-data generator.
 *
 * Writes `back-end/seed/patients.json`: an array of WIRE-SHAPED patients, spelled exactly as
 * `docs/patientSchema.js` spells them (snake_case, `underlying_condition` SINGULAR, `catch`,
 * `last_measured`, ISO-8601 instants as strings).
 *
 * It is deterministic: a seeded LCG and a fixed ANCHOR instant, so re-running it produces a
 * byte-identical file. There is no `Math.random()` and no `Date.now()` anywhere below.
 *
 * The set is built to satisfy `docs/spec/data-contract.md` section 4.4 rule 3 — it must reach every
 * state in `docs/spec/ui-states.md` that data can produce. The edge cases are declared explicitly in
 * EDGE_CASES below, each annotated with the state ID it exists to make reachable, so a reader can
 * check the coverage claim rather than trust it.
 *
 * It invents NO field the schema does not define (rule 2): no `unit`, no `description`, no
 * `model_use`. Those are G-01, G-02 and G-04 and they stay open.
 *
 * Run:  node back-end/seed/generate.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/* ------------------------------------------------------------------------------------------------
 * Determinism
 * ---------------------------------------------------------------------------------------------- */

/** Numerical Recipes LCG. Deterministic across Node versions — `Math.random()` is not. */
function makeRandom(seed) {
    let state = seed >>> 0;
    return function random() {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/** Round to `places` decimals without `toFixed` string round-tripping in the data itself. */
function round(value, places) {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
}

/**
 * The instant every timestamp below is measured back from. Fixed, not `Date.now()`, so the file is
 * reproducible. `back-end/scripts/seed.js --rebase` shifts the whole set forward at seed time when a
 * demo needs fresh-looking ages; the JSON on disk always carries these literal instants.
 */
const ANCHOR = Date.parse('2026-08-16T14:40:00.000Z');
const MINUTE = 60_000;

function isoMinutesBefore(minutes) {
    return new Date(ANCHOR - minutes * MINUTE).toISOString();
}

/* ------------------------------------------------------------------------------------------------
 * Clinical vocabulary
 *
 * Parameter names only. No units (G-01), no descriptions (G-02) — inventing either would close a
 * blocking open question with a fabricated answer.
 * ---------------------------------------------------------------------------------------------- */

const PARAMETERS = [
    { name: 'Respiratory rate', base: 22, spread: 6, places: 0 },
    { name: 'Tidal volume', base: 430, spread: 70, places: 0 },
    { name: 'PEEP', base: 8, spread: 3, places: 0 },
    { name: 'FiO2', base: 0.45, spread: 0.2, places: 2 },
    { name: 'SpO2', base: 94, spread: 4, places: 0 },
    { name: 'Plateau pressure', base: 24, spread: 6, places: 0 },
    { name: 'Driving pressure', base: 13, spread: 4, places: 0 },
    { name: 'Minute ventilation', base: 9.4, spread: 2.6, places: 1 },
    { name: 'Peak inspiratory pressure', base: 29, spread: 7, places: 0 },
    { name: 'Dynamic compliance', base: 38, spread: 12, places: 0 },
    { name: 'End-tidal CO2', base: 41, spread: 7, places: 0 },
    { name: 'PaO2/FiO2 ratio', base: 212, spread: 70, places: 0 }
];

const CONDITIONS = [
    'COPD',
    'Type 2 diabetes mellitus',
    'Chronic kidney disease stage 3',
    'Congestive heart failure',
    'Obstructive sleep apnoea',
    'Hypertension',
    'Obesity (BMI 34)',
    'Atrial fibrillation',
    'Interstitial lung disease',
    'Community-acquired pneumonia',
    'Post-operative — thoracic',
    'Immunosuppressed — transplant recipient'
];

const GENDERS = ['F', 'M', 'F', 'M', 'Unknown'];
const RACES = ['White', 'Black or African American', 'Asian', 'Hispanic or Latino', 'Unknown', 'Other'];

/**
 * Explanation prose. Every sentence is descriptive of what the listed contributors did — none of it
 * states a threshold, a trend classification, a prognosis, or an action, because the handoff
 * (section 8) leaves clinical thresholds and model logic undefined.
 */
const EXPLANATION_TEMPLATES = [
    'The score is driven mainly by {driver}, which has moved across the readings in this window. {second} contributes next. Values shown are those the model received for this reading.',
    '{driver} carries the largest contribution in this reading, followed by {second}. The remaining recorded factors contribute less individually.',
    'This assessment is dominated by {driver}. {second} also contributes. No factor outside the recorded parameter set entered this reading.',
    'The largest recorded contribution in this reading is {driver}; {second} follows. The contribution values are the model’s own and are not normalised.'
];

const CITATION_POOL = [
    {
        name: 'ARDS Definition Task Force, Berlin Definition',
        claim: 'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.'
    },
    {
        name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
        claim: 'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.'
    },
    {
        name: 'Surviving Sepsis Campaign, Respiratory Support',
        claim: 'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.'
    },
    {
        name: 'GOLD Report, Chapter 5',
        claim: 'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.'
    },
    {
        name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
        claim: 'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.'
    }
];

/* ------------------------------------------------------------------------------------------------
 * Builders
 * ---------------------------------------------------------------------------------------------- */

function pick(random, list) {
    return list[Math.floor(random() * list.length)];
}

function buildParameters(random, options) {
    const count = options.parameterCount;
    const chosen = PARAMETERS.slice(0, count);
    return chosen.map((spec, index) => {
        const drift = (random() - 0.5) * spec.spread;
        const value = round(spec.base + drift, spec.places);

        // Provenance distribution: mostly measured, some carried forward, occasionally a population
        // reference. `source` is a real schema field, so this is data, not a UI decision.
        let source = 'measured';
        let lastMeasured = options.charttime;
        const roll = random();
        if (options.forcePopulationAt === index) {
            source = 'population_reference';
            lastMeasured = null;
        } else if (options.forceCarriedAt === index) {
            source = 'carried_forward';
            lastMeasured = isoMinutesBefore(options.minutesBefore + 12 + Math.floor(random() * 20));
        } else if (roll < 0.16) {
            source = 'carried_forward';
            lastMeasured = isoMinutesBefore(options.minutesBefore + 6 + Math.floor(random() * 24));
        } else if (roll < 0.2) {
            source = 'population_reference';
            lastMeasured = null;
        }

        return {
            name: spec.name,
            value,
            source,
            last_measured: lastMeasured
        };
    });
}

function buildContributors(random, parameters, count) {
    const pool = parameters.map((p) => p.name);
    const picked = [];
    for (let i = 0; i < count && pool.length > 0; i += 1) {
        const index = Math.floor(random() * pool.length);
        picked.push(pool.splice(index, 1)[0]);
    }
    // Contributions are unscaled and NOT normalised to sum to 1 — G-24 leaves scale and sign
    // unspecified, and re-normalising would invent one.
    return picked.map((name, i) => ({
        name,
        contribution: round(0.62 - i * 0.11 + (random() - 0.5) * 0.06, 3)
    }));
}

function buildReading(random, options) {
    const charttime = options.charttime;
    const parameters = buildParameters(random, options);
    const topContributors =
        options.contributorCount === 0
            ? []
            : buildContributors(random, parameters, options.contributorCount ?? 4);

    const driver = topContributors[0]?.name ?? 'the recorded parameters';
    const second = topContributors[1]?.name ?? 'no second factor';

    const sufficient = options.sufficientData;
    let explanation = null;
    let citations = null;

    if (sufficient === 'sufficient' && options.explanationSupplied !== false) {
        explanation = pick(random, EXPLANATION_TEMPLATES)
            .replace('{driver}', driver)
            .replace('{second}', second);
        const citationCount = 1 + Math.floor(random() * 2);
        citations = [];
        const pool = CITATION_POOL.slice();
        for (let i = 0; i < citationCount && pool.length > 0; i += 1) {
            citations.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
        }
    }

    return {
        charttime,
        imputed_share: round(random() * 0.42, 3),
        documentation_share: round(0.5 + random() * 0.48, 3),
        sufficient_data: sufficient,
        risk_score: options.riskScore,
        risk_level: options.riskLevel,
        review_at: options.reviewAt ?? null,
        top_contributors: topContributors,
        parameters,
        explanation,
        citations
    };
}

/**
 * A run of readings ending at the anchor. `levels` gives the risk level of each reading oldest-first,
 * so a caller can shape the F-3 "readings held at this level" run precisely.
 */
function buildReadings(random, spec) {
    const levels = spec.levels;
    const count = levels.length;
    const readings = [];

    for (let i = 0; i < count; i += 1) {
        const stepsFromLatest = count - 1 - i;
        const minutesBefore =
            spec.intervalMinutes * stepsFromLatest +
            (spec.extraGapAfter !== undefined && stepsFromLatest > spec.extraGapAfter
                ? spec.extraGapMinutes ?? 0
                : 0);

        const level = levels[i];
        const scoreBase = { Critical: 88, High: 71, Medium: 52, Low: 28 }[level] ?? 55;

        // `reviewedStepsFromLatest`, added 2026-08-23 for the risk-history chart's new per-point
        // "reviewed" marker ("thêm màu/dấu hiệu riêng cho các điểm đã được review"): a HISTORICAL
        // (non-latest) reading can carry its own `review_at` on the real wire schema, but nothing
        // in this generator had ever produced one before this — `reviewAt` was only ever set on
        // `stepsFromLatest === 0`. A step named here gets a `review_at` a few minutes after its own
        // `charttime`, so the marker has real data to demonstrate against.
        const reviewedHere = spec.reviewedStepsFromLatest?.has(stepsFromLatest) ?? false;

        readings.push(
            buildReading(random, {
                charttime: isoMinutesBefore(minutesBefore),
                minutesBefore,
                riskLevel: level,
                riskScore: round(scoreBase + (random() - 0.5) * 7, 1),
                sufficientData: spec.sufficientData ?? 'sufficient',
                explanationSupplied: spec.explanationSupplied,
                reviewAt:
                    stepsFromLatest === 0
                        ? (spec.reviewAt ?? null)
                        : reviewedHere
                          ? isoMinutesBefore(Math.max(0, minutesBefore - 2))
                          : null,
                parameterCount: spec.parameterCount ?? 8,
                contributorCount: spec.contributorCount,
                forceCarriedAt: spec.forceCarriedAt,
                forcePopulationAt: spec.forcePopulationAt
            })
        );
    }

    return readings;
}

function buildPatient(random, spec) {
    const conditionCount = spec.conditionCount ?? 1 + Math.floor(random() * 3);
    const pool = CONDITIONS.slice();
    const conditions = [];
    for (let i = 0; i < conditionCount && pool.length > 0; i += 1) {
        conditions.push({
            name: pool.splice(Math.floor(random() * pool.length), 1)[0],
            // `catch` is the wire key. Its meaning is unexplained (G-10) — it is carried, never used.
            catch: random() < 0.45
        });
    }

    return {
        patient_id: spec.patientId,
        age: spec.age ?? 44 + Math.floor(random() * 42),
        gender: spec.gender ?? pick(random, GENDERS),
        weight: spec.weight === undefined ? `${58 + Math.floor(random() * 46)}` : spec.weight,
        height: spec.height === undefined ? `${152 + Math.floor(random() * 38)}` : spec.height,
        race: spec.race ?? pick(random, RACES),
        warning_status: {
            status: spec.reviewStatus,
            flags: spec.flags ?? []
        },
        underlying_condition: conditions,
        readings: spec.readings
    };
}

/* ------------------------------------------------------------------------------------------------
 * The set
 *
 * Every entry names the `docs/spec/ui-states.md` row it makes reachable. Ordinary patients come
 * first so the board is not a wall of edge cases; the edge cases follow and are individually
 * annotated.
 * ---------------------------------------------------------------------------------------------- */

function build() {
    const random = makeRandom(20260816);
    const patients = [];

    const ordinary = [
        // DENSER SERIES, 2026-08-23, at the product owner's request ("Use a denser series (roughly
        // one reading per 1-2 minutes across the window, ~25-35 points)"), so the risk-history and
        // provenance charts' step behaviour and threshold bands are visible on a real, non-trivial
        // window rather than the five widely-spaced points the other `ordinary` entries still use.
        // 30 readings x 2-minute interval = a 58-minute span, comfortably filling the 60-minute
        // window. Same High -> Critical shape as before, just stretched: 10 `High` then 20
        // `Critical`, so F-3's "readings held at this level" run is still non-truncated (20, not the
        // full 30) and the S-38 "N readings at this level" state stays reachable, just at a larger N.
        {
            patientId: 'PT-1001',
            levels: [...Array(10).fill('High'), ...Array(20).fill('Critical')],
            reviewStatus: 'Pending Review',
            interval: 2,
            // Three EARLIER (non-latest) readings carry their own `review_at`, so the risk-history
            // chart's new per-point "reviewed" marker has real data to demonstrate against — see
            // `reviewedStepsFromLatest`'s own comment on `buildReadings` above.
            reviewedStepsFromLatest: new Set([25, 18, 9]),
        },
        { patientId: 'PT-1002', levels: ['Medium', 'High', 'High', 'High'], reviewStatus: 'Pending Review', interval: 6 },
        { patientId: 'PT-1003', levels: ['Medium', 'Medium', 'Medium'], reviewStatus: 'Reviewed', interval: 7, reviewAt: isoMinutesBefore(3) },
        { patientId: 'PT-1004', levels: ['Low', 'Low', 'Low', 'Low'], reviewStatus: 'Reviewed', interval: 8, reviewAt: isoMinutesBefore(11) },
        { patientId: 'PT-1005', levels: ['High', 'Medium', 'Medium'], reviewStatus: 'Reviewed', interval: 5, reviewAt: isoMinutesBefore(19) },
        { patientId: 'PT-1006', levels: ['Critical', 'Critical', 'High', 'High'], reviewStatus: 'Pending Review', interval: 5 },
        { patientId: 'PT-1007', levels: ['Low', 'Low', 'Medium'], reviewStatus: 'Pending Review', interval: 9 },
        { patientId: 'PT-1008', levels: ['Medium', 'Low', 'Low', 'Low', 'Low'], reviewStatus: 'Reviewed', interval: 6, reviewAt: isoMinutesBefore(27) },
        { patientId: 'PT-1009', levels: ['High', 'High'], reviewStatus: 'Pending Review', interval: 12 },
        { patientId: 'PT-1010', levels: ['Critical', 'High', 'Medium', 'Medium'], reviewStatus: 'Reviewed', interval: 6, reviewAt: isoMinutesBefore(2) }
    ];

    for (const spec of ordinary) {
        patients.push(
            buildPatient(random, {
                patientId: spec.patientId,
                reviewStatus: spec.reviewStatus,
                readings: buildReadings(random, {
                    levels: spec.levels,
                    intervalMinutes: spec.interval,
                    reviewAt: spec.reviewAt,
                    reviewedStepsFromLatest: spec.reviewedStepsFromLatest
                })
            })
        );
    }

    /* -------- edge cases, one per state ---------------------------------------------------- */

    // S-06 + S-10 `insufficient`: pending review AND a data-limited latest reading. The banner
    // literal `Insufficient data — risk score is not reliable` and the withheld `Explanation
    // withheld` treatment are both reachable from here.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2001',
            reviewStatus: 'Pending Review',
            readings: buildReadings(random, {
                levels: ['High', 'High', 'High'],
                intervalMinutes: 7,
                sufficientData: 'insufficient'
            })
        })
    );

    // S-08: reviewed with NO `review_at` anywhere -> `Reviewed · review time not recorded`.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2002',
            reviewStatus: 'Reviewed',
            readings: buildReadings(random, { levels: ['Low', 'Low', 'Medium'], intervalMinutes: 8 })
        })
    );

    // S-09: `warning_status.status === null` -> `Review status unavailable`, ranked K1 = 1, and
    // EXCLUDED from the `Needs review` filter.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2003',
            reviewStatus: null,
            readings: buildReadings(random, { levels: ['High', 'Critical', 'Critical'], intervalMinutes: 5 })
        })
    );

    // S-05 + S-38 unavailable: the LATEST reading has no `risk_level`, so the held-at-level walk
    // never starts and PD-6 renders `Readings held at this level: unavailable. …`.
    {
        const readings = buildReadings(random, { levels: ['Medium', 'Medium', 'Medium'], intervalMinutes: 6 });
        readings[readings.length - 1].risk_level = null;
        patients.push(buildPatient(random, { patientId: 'PT-2004', reviewStatus: 'Pending Review', readings }));
    }

    // S-35: the latest reading carries no `risk_score` -> `score unavailable`, never `0`, and the
    // patient still appears on the board, sorted after every present score.
    {
        const readings = buildReadings(random, { levels: ['Medium', 'High', 'High'], intervalMinutes: 6 });
        readings[readings.length - 1].risk_score = null;
        patients.push(buildPatient(random, { patientId: 'PT-2005', reviewStatus: 'Reviewed', readings }));
    }

    // S-10 `null` branch: `sufficient_data` absent on the latest reading. Gates exactly as
    // `insufficient` does, under the label `data sufficiency unknown`.
    {
        const readings = buildReadings(random, { levels: ['High', 'High', 'Critical'], intervalMinutes: 5 });
        readings[readings.length - 1].sufficient_data = null;
        patients.push(buildPatient(random, { patientId: 'PT-2006', reviewStatus: 'Pending Review', readings }));
    }

    // U-11 + U-22: zero readings. PD-2 renders `No assessment available for this patient`; the OV-4
    // card's TIME slot renders U-22's own literal, and its risk/score slots render S-05 and S-35.
    patients.push(
        buildPatient(random, { patientId: 'PT-2007', reviewStatus: 'Pending Review', readings: [] })
    );

    // U-12: two readings with the EXACT same `charttime`. F-1 step 4 keeps the later-in-source one
    // and raises the collision as an integrity warning.
    {
        const readings = buildReadings(random, { levels: ['Medium', 'High', 'High'], intervalMinutes: 6 });
        const clone = JSON.parse(JSON.stringify(readings[readings.length - 1]));
        clone.risk_score = round(clone.risk_score + 4.2, 1);
        readings.push(clone);
        patients.push(buildPatient(random, { patientId: 'PT-2008', reviewStatus: 'Reviewed', readings }));
    }

    // S-13 contradiction / U-12 / G-18: a `carried_forward` parameter whose `last_measured` is null.
    // The handoff (section 5) requires the time to be retained, so this is an integrity warning and
    // NOT a fifth badge.
    {
        const readings = buildReadings(random, {
            levels: ['Medium', 'Medium', 'High'],
            intervalMinutes: 6,
            forceCarriedAt: 1
        });
        const latest = readings[readings.length - 1];
        latest.parameters[1].source = 'carried_forward';
        latest.parameters[1].last_measured = null;
        patients.push(buildPatient(random, { patientId: 'PT-2009', reviewStatus: 'Pending Review', readings }));
    }

    // S-14 + S-31 + PM-7: a `population_reference` parameter on the latest reading, so the
    // population-reference explanatory panel is reachable.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2010',
            reviewStatus: 'Reviewed',
            readings: buildReadings(random, {
                levels: ['Low', 'Medium', 'Medium'],
                intervalMinutes: 7,
                forcePopulationAt: 2,
                reviewAt: isoMinutesBefore(6)
            })
        })
    );

    // S-15: an unrecognised `source` string -> `Provenance unknown`, never defaulted to `measured`.
    {
        const readings = buildReadings(random, { levels: ['High', 'High', 'High'], intervalMinutes: 6 });
        const latest = readings[readings.length - 1];
        latest.parameters[3].source = 'device_estimate';
        latest.parameters[4].source = null;
        patients.push(buildPatient(random, { patientId: 'PT-2011', reviewStatus: 'Pending Review', readings }));
    }

    // S-37: data IS sufficient and `explanation` / `citations` are nevertheless null. A SYSTEM
    // statement (`Explanation not supplied`), never S-10's clinical withheld copy.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2012',
            reviewStatus: 'Reviewed',
            readings: buildReadings(random, {
                levels: ['Medium', 'Medium', 'Medium'],
                intervalMinutes: 6,
                explanationSupplied: false,
                reviewAt: isoMinutesBefore(14)
            })
        })
    );

    // F-4 empty list -> `No ranked factors available`. Never a fabricated driver.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2013',
            reviewStatus: 'Pending Review',
            readings: buildReadings(random, {
                levels: ['Low', 'Low', 'Medium'],
                intervalMinutes: 8,
                contributorCount: 0,
                explanationSupplied: false
            })
        })
    );

    // S-38 truncated: every delivered reading holds the same level, so the run reaches the oldest
    // reading supplied and the slot renders `≥ N readings at this level` with the ≥ glyph.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2014',
            reviewStatus: 'Pending Review',
            readings: buildReadings(random, {
                levels: ['Critical', 'Critical', 'Critical', 'Critical', 'Critical', 'Critical'],
                intervalMinutes: 4
            })
        })
    );

    // S-26: no comorbidities recorded -> the handoff's own literal `No recorded comorbidities`.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2015',
            reviewStatus: 'Reviewed',
            conditionCount: 0,
            weight: null,
            height: null,
            readings: buildReadings(random, {
                levels: ['Low', 'Low'],
                intervalMinutes: 10,
                reviewAt: isoMinutesBefore(31)
            })
        })
    );

    // F-1 step 2: a reading whose `charttime` is null. Excluded from latest-selection, raises an
    // integrity warning, and is never used as a fallback.
    {
        const readings = buildReadings(random, { levels: ['Medium', 'High', 'High'], intervalMinutes: 6 });
        readings[0].charttime = null;
        patients.push(buildPatient(random, { patientId: 'PT-2016', reviewStatus: 'Pending Review', readings }));
    }

    // F-2 gap rendering: a 26-minute hole inside the 60-minute window renders as a VISIBLE BREAK,
    // never a straight connecting segment.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2017',
            reviewStatus: 'Reviewed',
            readings: buildReadings(random, {
                levels: ['High', 'High', 'Medium', 'Medium'],
                intervalMinutes: 4,
                extraGapAfter: 1,
                extraGapMinutes: 26,
                reviewAt: isoMinutesBefore(4)
            })
        })
    );

    // F-2 below two plotted points -> the literal `insufficient history for a 60-minute view`.
    // A single point is never drawn as a flat line.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2018',
            reviewStatus: 'Pending Review',
            readings: buildReadings(random, { levels: ['Critical'], intervalMinutes: 5 })
        })
    );

    // F-4 exact tie for first place -> the driver is still deterministic (contribution desc, then
    // name via Intl.Collator) and the card must say `(tied)` rather than present one of equals.
    {
        const readings = buildReadings(random, { levels: ['High', 'High', 'High'], intervalMinutes: 6 });
        const latest = readings[readings.length - 1];
        if (latest.top_contributors.length >= 2) {
            latest.top_contributors[1].contribution = latest.top_contributors[0].contribution;
        }
        patients.push(buildPatient(random, { patientId: 'PT-2019', reviewStatus: 'Reviewed', readings }));
    }

    // A second Critical + Reviewed patient, so ranking key K1 is visibly doing work: this one sits
    // BELOW every pending-review patient despite being Critical.
    patients.push(
        buildPatient(random, {
            patientId: 'PT-2020',
            reviewStatus: 'Reviewed',
            readings: buildReadings(random, {
                levels: ['High', 'Critical', 'Critical'],
                intervalMinutes: 5,
                reviewAt: isoMinutesBefore(1)
            })
        })
    );

    return patients;
}

/* ------------------------------------------------------------------------------------------------
 * Emit
 * ---------------------------------------------------------------------------------------------- */

const patients = build();
const outPath = path.join(__dirname, 'patients.json');
fs.writeFileSync(outPath, `${JSON.stringify(patients, null, 2)}\n`, 'utf8');

const readingCount = patients.reduce((n, p) => n + p.readings.length, 0);
console.log(`Wrote ${patients.length} patients / ${readingCount} readings to ${outPath}`);
