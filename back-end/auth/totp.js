/**
 * back-end/auth/totp.js
 *
 * RFC 6238 TOTP over RFC 4226 HOTP, on `node:crypto` alone. No dependency, because the algorithm is
 * forty lines and the interesting parts are the ones a library would not decide for you: the
 * acceptance window, replay, and constant-time comparison.
 *
 * SHA-1 / 6 digits / 30 seconds. Not a lapse — it is what Google Authenticator, 1Password, Aegis and
 * every other TOTP app implement, and an authenticator that cannot read the secret is not more
 * secure, it is unusable. The HMAC key here is high-entropy and single-purpose, which is the setting
 * SHA-1's weaknesses do not apply to.
 */
const crypto = require('crypto');

const DIGITS = 6;
const PERIOD_SECONDS = 30;
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32, unpadded — the encoding every authenticator app expects. */
function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
    return out;
}

function base32Decode(input) {
    const clean = String(input || '')
        .toUpperCase()
        .replace(/[\s-]/g, '')
        .replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    const out = [];
    for (const ch of clean) {
        const idx = B32_ALPHABET.indexOf(ch);
        if (idx === -1) throw new Error(`Not base32: ${ch}`);
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

/** 160 bits, matching the SHA-1 block the HMAC uses. */
function generateSecret(bytes = 20) {
    return base32Encode(crypto.randomBytes(bytes));
}

function stepFor(date = new Date()) {
    return Math.floor(date.getTime() / 1000 / PERIOD_SECONDS);
}

/** RFC 4226 section 5.3 — dynamic truncation. */
function codeForStep(secretBase32, step) {
    const key = base32Decode(secretBase32);
    const counter = Buffer.alloc(8);
    counter.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
    counter.writeUInt32BE(step >>> 0, 4);

    const digest = crypto.createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

    return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Length-safe constant-time compare — `crypto.timingSafeEqual` throws on a length mismatch. */
function constantTimeEquals(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a submitted code.
 *
 * `window` is how many steps either side of now are accepted; 1 means the code is good for roughly
 * 30 seconds before and after, which covers clock drift and a user typing slowly. It is not a place
 * to be generous: every extra step widens the window in which a shoulder-surfed code still works.
 *
 * `lastUsedStep` makes each code SINGLE-USE. Without it a code remains valid for its entire window,
 * so an attacker who observes one has up to a minute and a half to replay it. Callers must persist
 * the returned `step`.
 */
function verify(secretBase32, token, { window = 1, lastUsedStep = null, at = new Date() } = {}) {
    const cleaned = String(token || '').replace(/[\s-]/g, '');
    if (!/^\d{6}$/.test(cleaned)) return { ok: false, reason: 'malformed' };
    if (!secretBase32) return { ok: false, reason: 'not_enrolled' };

    const now = stepFor(at);
    for (let offset = -window; offset <= window; offset += 1) {
        const step = now + offset;
        if (!constantTimeEquals(cleaned, codeForStep(secretBase32, step))) continue;
        if (lastUsedStep !== null && step <= lastUsedStep) return { ok: false, reason: 'replayed' };
        return { ok: true, step };
    }
    return { ok: false, reason: 'mismatch' };
}

/**
 * The `otpauth://` URI an authenticator app scans. `issuer` appears both in the path and as a
 * parameter because different apps read different ones, and an app that shows a bare account name
 * with no issuer leaves a clinician guessing which of six codes is the hospital's.
 */
function otpauthUri({ issuer, account, secretBase32 }) {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({
        secret: secretBase32,
        issuer,
        algorithm: 'SHA1',
        digits: String(DIGITS),
        period: String(PERIOD_SECONDS)
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = {
    DIGITS,
    PERIOD_SECONDS,
    base32Encode,
    base32Decode,
    generateSecret,
    stepFor,
    codeForStep,
    verify,
    otpauthUri
};
