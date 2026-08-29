// src/lib/state/ward-clock.test.ts
//
// The clock is the one piece of this integration that changes what EVERY timestamp on screen says,
// and its failure mode is quiet: without it a streaming ward renders `in 3 h 42 min` beside every
// reading and the header claims a time hours behind the rows under it. Nothing throws.

import { beforeEach, expect, test } from 'vitest';
import { observeWardInstants, resetWardClock, wardClockFor } from './ward-clock.svelte';

const WALL = new Date('2026-08-28T12:00:00.000Z');
const minutes = (n: number) => new Date(WALL.getTime() + n * 60_000);

beforeEach(() => {
  resetWardClock();
});

test('with no data observed the clock is the wall clock and says so', () => {
  const clock = wardClockFor(WALL);
  expect(clock.now).toEqual(WALL);
  expect(clock.simulated).toBe(false);
});

test('data at or behind the wall clock does not move it', () => {
  observeWardInstants([minutes(-120), minutes(-1)]);
  const clock = wardClockFor(WALL);
  expect(clock.now).toEqual(WALL);
  expect(clock.simulated).toBe(false);
});

test('a lead inside the threshold is treated as skew, not as a simulated ward', () => {
  // Half a minute ahead is clock skew or network latency. Following it would make the header's own
  // label flicker between two readings of the same instant.
  observeWardInstants([minutes(0.5)]);
  expect(wardClockFor(WALL).simulated).toBe(false);
});

test('a ward hours ahead becomes the clock, and the clock declares itself simulated', () => {
  observeWardInstants([minutes(240)]);
  const clock = wardClockFor(WALL);
  expect(clock.now).toEqual(minutes(240));
  expect(clock.simulated).toBe(true);
});

test('a null or unparseable instant can never drag the clock back to the epoch', () => {
  // The failure this guards: `readings[].charttime` is nullable by design (U-11), and a `null`
  // coerced through `new Date(...)` or `Number(null)` is 1970. One unusable reading would then make
  // every age on the board read as fifty-six years.
  observeWardInstants([minutes(240)]);
  observeWardInstants([null, undefined, new Date('not a date')]);
  expect(wardClockFor(WALL).now).toEqual(minutes(240));
});

test('the observed instant only ever moves forward within a session', () => {
  // Navigating from the board to one patient whose own newest reading is older must not walk the
  // header's clock backwards mid-shift.
  observeWardInstants([minutes(240)]);
  observeWardInstants([minutes(60)]);
  expect(wardClockFor(WALL).now).toEqual(minutes(240));
});
