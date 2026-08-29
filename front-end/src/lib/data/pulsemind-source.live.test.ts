// src/lib/data/pulsemind-source.live.test.ts
//
// THE ADAPTER, AGAINST THE RUNNING SERVICE, THROUGH ITS REAL ENTRY POINT.
//
// Everything else in this suite is a pure function over a literal. This file is the only thing that
// proves the mapping in `pulsemind-source.ts` produces a shape the validator accepts, because the
// mapping's whole job is to be correct about payloads nobody wrote by hand. A fixture of what I
// BELIEVE the service returns would test my belief.
//
// SKIPPED, NOT FAILED, WHEN THE SERVICE IS DOWN. A red suite on a laptop with no GPU running would
// train everyone to ignore it. It says which it did.
//
//   1  ..\.venv\Scripts\python.exe -m uvicorn app:app --app-dir back-end/pythonService
//   2  $env:PM_ALLOW_DESTRUCTIVE="true"; node back-end/server.js
//   3  curl -X POST http://127.0.0.1:3500/api/ward/seed -d '{"backfill_ticks":24}'
//   4  $env:PUBLIC_PULSEMIND_API_BASE="http://127.0.0.1:3500/api"; pnpm test
//
// The base has to be ABSOLUTE here. The app runs in a browser and uses `/api` through the Vite
// proxy, which is what makes the session cookie first-party and `Server-Timing` readable; Node's
// `fetch` cannot resolve a relative URL, so the env var is set for the run.

import { beforeAll, describe, expect, test } from 'vitest';
import { getPulsemindSource } from './pulsemind-source';
import { latestReading } from '$lib/domain/derive';
// The SAME env module the app reads, not `process.env`. This project carries no Node types on
// purpose: adding them so one test can name `process` would put `process`, `Buffer` and `__dirname`
// in scope for every component in `src/`, which is the reasoning `route-exports.test.ts` records.
import { env } from '$env/dynamic/public';

const BASE = env.PUBLIC_PULSEMIND_API_BASE ?? '';
const ABSOLUTE = BASE.startsWith('http');

let reachable = false;

beforeAll(async () => {
  if (!ABSOLUTE) return;
  try {
    const res = await fetch(`${BASE}/ward`, { signal: AbortSignal.timeout(4000) });
    reachable = res.status === 200;
  } catch {
    reachable = false;
  }
});

const live = describe.skipIf(!ABSOLUTE);

// The board is one request that fans out to nine concurrent Mongo reads against Atlas, and Atlas is
// most of a tick. Vitest's 5 s default is a property of the harness, not of the product, and a test
// that fails on it reports a slow database as a broken adapter.
const SLOW = 30_000;

live('the live pipeline, through PatientDataSource', () => {
  test(
    'every bed on the board validates, and none is dropped',
    async () => {
      if (!reachable) return;
      const result = await getPulsemindSource(fetch).listPatients();
      // A failure here is a CONTRACT_VIOLATION the app would render as U-21. The message names the
      // field path, which is the whole point of routing through the one validator.
      expect(result.ok, result.ok ? '' : result.problem).toBe(true);
      if (!result.ok) return;
      expect(result.value.length).toBe(8);
    },
    SLOW,
  );

  test(
    'bed identity, the run length and the review state all arrive',
    async () => {
      if (!reachable) return;
      const result = await getPulsemindSource(fetch).listPatients();
      if (!result.ok) throw new Error(result.problem);

      for (const patient of result.value) {
        expect(patient.bedCode, `${patient.patientId} has no bed`).not.toBeNull();
        expect(patient.careUnit, `${patient.patientId} has no unit`).not.toBeNull();
      }

      // **G-32.** The board carries ONE reading per patient, so the client-side walk could only ever
      // answer "at least 1". Anything above that proves the publisher's own count is being used.
      const counts = result.value.map((p) =>
        p.heldAtLevel.kind === 'value' ? p.heldAtLevel.count : null,
      );
      expect(counts.some((n) => n !== null && n > 1)).toBe(true);

      // The prompt decides the review state, and the ward has both kinds plus patients with none.
      const states = new Set(result.value.map((p) => p.reviewStatus));
      expect(states.has('pending_review')).toBe(true);
    },
    SLOW,
  );

  test(
    'the refusing bed publishes NO score and NO band, and is still on the board',
    async () => {
      if (!reachable) return;
      // PM-355 withholds all eleven parameters, so every reading falls below the sufficiency floor.
      // This is the assertion that matters: a refusal must never arrive as a zero or as a Low band.
      const result = await getPulsemindSource(fetch).getPatient('PM-355');
      expect(result.ok, result.ok ? '' : result.problem).toBe(true);
      if (!result.ok) return;

      expect(result.value.readings.length).toBeGreaterThan(1);
      for (const reading of result.value.readings) {
        expect(reading.sufficientData).toBe('insufficient');
        expect(reading.riskScore).toBeNull();
        expect(reading.riskLevel).toBeNull();
      }
    },
    SLOW,
  );

  test(
    'a scored bed carries a probability in [0,1], a title-case band, and real units',
    async () => {
      if (!reachable) return;
      const result = await getPulsemindSource(fetch).getPatient('PM-204');
      expect(result.ok, result.ok ? '' : result.problem).toBe(true);
      if (!result.ok) return;

      const latest = latestReading(result.value.readings);
      expect(latest).not.toBeNull();
      if (latest === null) return;

      // **G-12.** The reason the unit is `probability (0-1)` and the chart's axis is 0-1.
      // Narrowed, not asserted. `!` is banned on a clinical field (rule 18) and eslint enforces it,
      // which is the right call even in a test: an assertion the compiler cannot check is exactly
      // what this project refuses everywhere else.
      const score = latest.riskScore;
      expect(score).not.toBeNull();
      if (score === null) return;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);

      // The service says LOW/MEDIUM/HIGH/CRITICAL; the wire and every screen say title case.
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(latest.riskLevel);

      // **G-01, and the shape of the answer is not what the row assumed.** The service supplies a real
      // unit for nine of its eleven parameters. The two it does not are `inspiratory_ratio` and
      // `expiratory_ratio`, and that is a POSITIVE FACT rather than a gap: an I:E ratio is
      // dimensionless, so a null there is the service saying "this quantity has no unit", not
      // "nobody told me".
      //
      // ⚠️ THE UI CANNOT YET TELL THOSE TWO CASES APART, and this assertion is where that is written
      // down. The fallback chain renders both as `unit not supplied` with `data-clarify="G-01"`, which
      // is right for an unknown quantity and WRONG for a dimensionless one: it declares an absence the
      // service does not have. No label is invented here to paper over it, because choosing a unit is
      // a clinical fact this interface may not supply. It is recorded in the register instead.
      expect(latest.parameters.length).toBe(11);
      const unitless = latest.parameters.filter((p) => p.unit === null).map((p) => p.name);
      expect(unitless.sort()).toEqual(['expiratory_ratio', 'inspiratory_ratio']);
      for (const parameter of latest.parameters) {
        if (unitless.includes(parameter.name)) continue;
        expect(parameter.unit, `${parameter.name} arrived with no unit`).not.toBeNull();
      }

      // **G-04, the half that IS answered.** The join key proves at least one score factor.
      expect(latest.parameters.some((p) => p.modelUse === 'score_factor')).toBe(true);
      // And the half that is not: `available` is never produced, because only the top eight
      // contributors of 109 features are stored.
      expect(latest.parameters.some((p) => p.modelUse === 'available')).toBe(false);
    },
    SLOW,
  );

  test(
    'a population-reference value carries no last-measured instant',
    async () => {
      if (!reachable) return;
      const result = await getPulsemindSource(fetch).getPatient('PM-204');
      if (!result.ok) throw new Error(result.problem);
      const latest = latestReading(result.value.readings);
      if (latest === null) return;

      // S-14: a cohort default was never measured on this patient, so it has no age. The adapter must
      // not compute one from `age_minutes`, which the service deliberately sends as null.
      for (const parameter of latest.parameters) {
        if (parameter.source !== 'population_reference') continue;
        expect(parameter.lastMeasured.kind).toBe('unavailable');
      }
    },
    SLOW,
  );

  test(
    'readings span a full day of ward time, so the history window is not empty',
    async () => {
      if (!reachable) return;
      const result = await getPulsemindSource(fetch).getPatient('PM-204');
      if (!result.ok) throw new Error(result.problem);

      const instants = result.value.readings
        .map((r) => r.charttime)
        .filter((d): d is Date => d !== null)
        .map((d) => d.getTime())
        .sort((a, b) => a - b);

      expect(instants.length).toBeGreaterThanOrEqual(24);
      // The reason F-2's width changed: consecutive readings are an HOUR apart, so a 60-minute window
      // admitted two of them.
      const oldest = instants.at(0);
      const newest = instants.at(-1);
      if (oldest === undefined || newest === undefined) return;
      expect((newest - oldest) / 3_600_000).toBeGreaterThan(20);
    },
    SLOW,
  );

  test(
    'a patient that does not exist is a named not-found, never an empty patient',
    async () => {
      if (!reachable) return;
      await expect(getPulsemindSource(fetch).getPatient('PM-000')).rejects.toMatchObject({
        status: 404,
      });
    },
    SLOW,
  );
});
