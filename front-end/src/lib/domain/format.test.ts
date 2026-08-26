import { expect, test } from 'vitest';
import { formatAbsolute, formatAge, formatInterval } from './format';

const NOW = new Date('2026-08-16T12:00:00.000Z');

test('the absolute rendering is 24-hour and zone-labelled, with the date when not today', () => {
  const today = formatAbsolute(new Date('2026-08-16T09:05:00.000Z'), NOW);
  expect(today).toMatch(/^\d{2}:\d{2} local$/);
  expect(today).not.toMatch(/am|pm/i);

  const other = formatAbsolute(new Date('2026-08-14T09:05:00.000Z'), NOW);
  expect(other).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} local$/);
});

test('omitting the reference means ALWAYS print the date — never a wall-clock fallback', () => {
  // Parameter Detail and the drawer require the date unconditionally (clinical-a11y 8.4). A
  // wall-clock fallback would render the same instant differently at 23:59 and at 00:01.
  const stamped = formatAbsolute(new Date('2026-08-16T09:05:00.000Z'));
  expect(stamped).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} local$/);
});

test('the relative age is a measurement, never a reassurance', () => {
  const banned = /\bnow\b|just now|moments ago|recently|a while ago/i;
  for (const minutes of [0, 0.5, 1, 42, 90, 600]) {
    const text = formatAge(new Date(NOW.getTime() - minutes * 60_000), NOW);
    expect(text).not.toMatch(banned);
  }
  expect(formatAge(new Date(NOW.getTime() - 30_000), NOW)).toBe('< 1 min ago');
  expect(formatAge(new Date(NOW.getTime() - 42 * 60_000), NOW)).toBe('42 min ago');
  expect(formatAge(new Date(NOW.getTime() - 72 * 60_000), NOW)).toBe('1 h 12 min ago');
});

test('beyond 24 hours the relative supplement is dropped, not rounded to days', () => {
  expect(formatAge(new Date(NOW.getTime() - 30 * 60 * 60_000), NOW)).toBe('');
});

test('a future instant renders as future rather than being clamped to zero', () => {
  // Clock skew between the workstation and the source is a clock problem. Clamping it to
  // "0 min ago" would present it as freshness.
  expect(formatAge(new Date(NOW.getTime() + 20 * 60_000), NOW)).toBe('in 20 min');
});

test('an interval carries no "ago" — it is between two data points, not against the clock', () => {
  const a = new Date('2026-08-16T11:00:00.000Z');
  const b = new Date('2026-08-16T12:12:00.000Z');
  expect(formatInterval(a, b)).toBe('1 h 12 min');
  expect(formatInterval(b, a)).toBe('1 h 12 min');
  expect(formatInterval(a, new Date(a.getTime() + 20_000))).toBe('< 1 min');
});
