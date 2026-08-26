#!/usr/bin/env node
/**
 * PulseMind backend — smoke test.
 *
 * Boots the real server against an in-process MongoDB, seeds it, and exercises every route plus the
 * CORS preflight the frontend actually issues. Each assertion names the `docs/spec/open-questions.md`
 * row it proves, so a green run is evidence against the register rather than a vibe.
 *
 *   node scripts/smoke.js
 */

'use strict';

process.env.PULSEMIND_MEMORY_DB = process.env.PULSEMIND_MEMORY_DB || '1';
process.env.PULSEMIND_SEED_ON_BOOT = process.env.PULSEMIND_SEED_ON_BOOT || '1';
process.env.PORT = process.env.PORT || '3599';

const BASE = `http://127.0.0.1:${process.env.PORT}`;

let passed = 0;
const failures = [];

function check(name, condition, detail) {
    if (condition) {
        passed += 1;
        console.log(`  ok   ${name}`);
    } else {
        failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
        console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

async function waitForHealth(attempts = 90) {
    for (let i = 0; i < attempts; i += 1) {
        try {
            const res = await fetch(`${BASE}/health`);
            const body = await res.json();
            if (body.database === 'connected') return true;
        } catch {
            /* not listening yet */
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
}

async function main() {
    require('../server');

    console.log('Waiting for the server and its in-process MongoDB…');
    const ready = await waitForHealth();
    if (!ready) {
        console.error('Server never became ready.');
        process.exit(1);
    }

    console.log('\nG-44 — the process boots and listens');
    {
        const res = await fetch(`${BASE}/health`);
        const body = await res.json();
        check('GET /health answers 200', res.status === 200, `got ${res.status}`);
        check('database reports connected', body.database === 'connected', body.database);
    }

    console.log('\nG-40 — the triage board has a list endpoint');
    {
        const res = await fetch(`${BASE}/patient/all`);
        const body = await res.json();
        check('GET /patient/all answers 200', res.status === 200, `got ${res.status}`);
        check('returns an array', Array.isArray(body));
        check('returns the whole seeded unit', body.length === 30, `got ${body.length}`);
        check(
            'elements are whole patients, not summaries',
            Array.isArray(body[0]?.readings) && Array.isArray(body[0]?.underlying_condition)
        );
        check('no Mongo internals leak', !('_id' in body[0]) && !('__v' in body[0]));
        check(
            'no _id on subdocuments either',
            body[0].readings.length === 0 || !('_id' in body[0].readings[0])
        );
        check('?limit= is honoured', (await (await fetch(`${BASE}/patient/all?limit=3`)).json()).length === 3);
    }

    console.log('\nG-43 — :patient_id is read, and the lookup is on the business key');
    {
        const res = await fetch(`${BASE}/patient/info/PT-1001`);
        const body = await res.json();
        check('GET /patient/info/:patient_id answers 200, not 400', res.status === 200, `got ${res.status}`);
        check('resolves the BUSINESS patient_id', body.patient_id === 'PT-1001', JSON.stringify(body).slice(0, 120));
        check('carries the demographic fragment only', 'age' in body && !('readings' in body));
        check('underlying_condition is present and singular-keyed', Array.isArray(body.underlying_condition));
    }
    {
        const res = await fetch(`${BASE}/patient/warning/PT-1001`);
        const body = await res.json();
        check('GET /patient/warning/:patient_id answers 200', res.status === 200, `got ${res.status}`);
        check('returns the bare warning_status object', 'status' in body && 'flags' in body);
    }
    {
        const res = await fetch(`${BASE}/patient/reading/PT-1001`);
        const body = await res.json();
        check('GET /patient/reading/:patient_id answers 200', res.status === 200, `got ${res.status}`);
        check('returns the bare readings array', Array.isArray(body) && body.length > 0);
    }

    console.log('\nG-42 — not-found is a 404 with a readable body, never a 204');
    {
        const res = await fetch(`${BASE}/patient/info/NO-SUCH-PATIENT`);
        check('answers 404', res.status === 404, `got ${res.status}`);
        const body = await res.json();
        check('the body survived', typeof body.message === 'string' && body.message.includes('NO-SUCH-PATIENT'));
    }

    console.log('\nG-49 — the Vite dev origin passes CORS');
    {
        const res = await fetch(`${BASE}/patient/all`, {
            method: 'OPTIONS',
            headers: {
                Origin: 'http://localhost:5173',
                'Access-Control-Request-Method': 'GET'
            }
        });
        check('preflight from http://localhost:5173 succeeds', res.status < 400, `got ${res.status}`);
        check(
            'Access-Control-Allow-Origin echoes the dev origin',
            res.headers.get('access-control-allow-origin') === 'http://localhost:5173',
            res.headers.get('access-control-allow-origin')
        );
    }

    console.log('\nSeed coverage — the states the UI has to render');
    {
        const all = await (await fetch(`${BASE}/patient/all`)).json();
        const byId = Object.fromEntries(all.map((p) => [p.patient_id, p]));
        const latest = (p) =>
            [...p.readings]
                .filter((r) => r.charttime)
                .sort((a, b) => Date.parse(a.charttime) - Date.parse(b.charttime))
                .at(-1);

        check('S-09 null review status survives the round trip', byId['PT-2003'].warning_status.status === null);
        check('S-05 null risk_level survives', latest(byId['PT-2004']).risk_level === null);
        check('S-35 null risk_score survives', latest(byId['PT-2005']).risk_score === null);
        check('S-10 null sufficient_data survives', latest(byId['PT-2006']).sufficient_data === null);
        check('U-11/U-22 zero readings survives', byId['PT-2007'].readings.length === 0);
        check(
            'U-12 colliding charttimes survive',
            new Set(byId['PT-2008'].readings.map((r) => r.charttime)).size < byId['PT-2008'].readings.length
        );
        check(
            'S-15 unrecognised source survives the model enum',
            latest(byId['PT-2011']).parameters.some((p) => p.source === 'device_estimate')
        );
        check(
            'G-18 carried_forward with no last_measured survives',
            latest(byId['PT-2009']).parameters.some(
                (p) => p.source === 'carried_forward' && p.last_measured === null
            )
        );
        check('S-14 population_reference present', latest(byId['PT-2010']).parameters.some((p) => p.source === 'population_reference'));
        check('S-37 sufficient + null explanation present', latest(byId['PT-2012']).sufficient_data === 'sufficient' && latest(byId['PT-2012']).explanation === null);
        check('S-26 no comorbidities present', byId['PT-2015'].underlying_condition.length === 0);
        check('F-1 null charttime survives', byId['PT-2016'].readings.some((r) => r.charttime === null));
        check('no invented `unit` field', !latest(byId['PT-1001']).parameters.some((p) => 'unit' in p));
    }

    console.log(`\n${passed} passed, ${failures.length} failed`);
    if (failures.length > 0) {
        for (const failure of failures) console.error(`  - ${failure}`);
        process.exit(1);
    }
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
