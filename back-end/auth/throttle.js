/**
 * back-end/auth/throttle.js
 *
 * Failed-attempt throttling for the sign-in endpoints.
 *
 * A six-digit code has a million values, and a login endpoint with no limit lets an attacker walk
 * all of them. TOTP's own window makes that worse, not better: with a ±1-step window each guess
 * covers three codes, so the effective space is a third of what it looks like. Throttling is not a
 * nicety on a second factor, it is what makes six digits enough.
 *
 * IN-PROCESS AND DELIBERATELY SO — with its limits stated rather than implied. The counters live in
 * this process's memory, so they reset on restart and are not shared across instances. For the
 * single-process demo this service is, that is honest and sufficient; for a real deployment behind
 * more than one instance it must move to a shared store, which is registered as **G-53**.
 *
 * Keyed on username AND client address together, so one clinician failing a code cannot lock out a
 * ward that shares an address, and one address cannot spray attempts across many usernames.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

/** key -> { failures: number[], lockedUntil: number|null } */
const buckets = new Map();

function keyFor(scope, identity, address) {
    return `${scope}|${String(identity || '').toLowerCase()}|${address || 'unknown'}`;
}

function prune(entry, now) {
    entry.failures = entry.failures.filter((t) => now - t < WINDOW_MS);
    if (entry.lockedUntil && entry.lockedUntil <= now) entry.lockedUntil = null;
}

/**
 * Call BEFORE doing any work. Returns `{ allowed, retryAfterSeconds }`.
 *
 * The lock is checked before the password is compared, so a locked account costs an attacker a
 * cheap 429 rather than a bcrypt round — otherwise the throttle becomes the denial-of-service.
 */
function check(scope, identity, address, now = Date.now()) {
    const key = keyFor(scope, identity, address);
    const entry = buckets.get(key);
    if (!entry) return { allowed: true, retryAfterSeconds: 0 };
    prune(entry, now);
    if (entry.lockedUntil) {
        return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
}

function recordFailure(scope, identity, address, now = Date.now()) {
    const key = keyFor(scope, identity, address);
    const entry = buckets.get(key) || { failures: [], lockedUntil: null };
    prune(entry, now);
    entry.failures.push(now);
    if (entry.failures.length >= MAX_FAILURES) {
        entry.lockedUntil = now + WINDOW_MS;
        entry.failures = [];
    }
    buckets.set(key, entry);
    return entry;
}

function recordSuccess(scope, identity, address) {
    buckets.delete(keyFor(scope, identity, address));
}

/** Tests only. Never call from a request path. */
function reset() {
    buckets.clear();
}

module.exports = { WINDOW_MS, MAX_FAILURES, check, recordFailure, recordSuccess, reset };
