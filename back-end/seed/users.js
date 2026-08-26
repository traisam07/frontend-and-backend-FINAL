/**
 * back-end/seed/users.js
 *
 * Three demo accounts, so the sign-in screen can be exercised in all three shapes it supports
 * without anyone having to enrol a factor first:
 *
 *   clinician  password only          — the plain path
 *   oncall     password + TOTP        — the two-step path, with a FIXED secret so a code can be
 *                                       generated from the command line (`npm run demo:code`)
 *   viewer     password only, read_only role
 *
 * Passkeys are deliberately NOT seeded. A passkey is bound to a real authenticator and to an origin;
 * a fabricated one would be a credential nobody holds the private key for, which would fail at the
 * first ceremony and look like a bug in the verifier. Passkeys are registered from the running app.
 *
 * THESE ARE DEMO CREDENTIALS FOR A SYNTHETIC 30-PATIENT UNIT. The seed refuses to run when
 * `NODE_ENV=production` unless `PULSEMIND_SEED_USERS_FORCE=1` is set, because the one thing worse
 * than no authentication is authentication with a published password.
 */
const bcrypt = require('bcrypt');
const User = require('../model/User');
const totp = require('../auth/totp');

const BCRYPT_ROUNDS = 12;

/** Fixed so the demo is reproducible. Never reuse this shape for a real account. */
const DEMO_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

function demoPassword() {
    return process.env.PULSEMIND_DEMO_PASSWORD || 'PulseMind-demo-2026';
}

const ACCOUNTS = [
    {
        username: 'clinician',
        display_name: 'Dr A. Clinician',
        role: 'clinician',
        totp: false
    },
    {
        username: 'oncall',
        display_name: 'Dr B. On-call',
        role: 'clinician',
        totp: true
    },
    {
        /**
         * A SECOND two-factor account, and the reason is a real property rather than test plumbing:
         * a TOTP code is single-use, so two sign-ins for the same account inside one 30-second step
         * cannot both succeed. The e2e suite runs fully parallel, so two tests sharing `oncall`
         * would have one of them correctly refused as a replay. One account per concurrent test is
         * the fix; weakening the replay check to make a test pass would not be.
         */
        username: 'nightshift',
        display_name: 'Dr C. Night-shift',
        role: 'clinician',
        totp: true
    },
    {
        username: 'viewer',
        display_name: 'Ward Display',
        role: 'read_only',
        totp: false
    },
    {
        /**
         * THE ONLY ACCOUNT THAT HAS NOT READ THE GUIDE, and it exists so that "first sign-in" is
         * demonstrable and testable without depending on test order.
         *
         * Acknowledgement is stored per ACCOUNT on the server, so the first test to sign in as any
         * shared account would consume its first run and every later test would see something
         * different — the same shared-mutable-state trap as the single-use TOTP code (L-065) and the
         * in-process throttle (L-072). One dedicated account, one first run.
         */
        username: 'newstarter',
        display_name: 'Dr D. New-starter',
        role: 'clinician',
        totp: false,
        guideRead: false
    }
];

async function isEmpty() {
    return (await User.estimatedDocumentCount()) === 0;
}

async function applyUserSeed({ force = false } = {}) {
    if (process.env.NODE_ENV === 'production' && !process.env.PULSEMIND_SEED_USERS_FORCE) {
        throw new Error(
            'Refusing to seed demo accounts with NODE_ENV=production. ' +
                'Set PULSEMIND_SEED_USERS_FORCE=1 only if you understand that these passwords are published.'
        );
    }

    if (force) await User.deleteMany({});

    /**
     * CREATE WHAT IS MISSING, rather than "skip if anything exists".
     *
     * The old rule skipped the whole seed as soon as ONE account was present, so adding an account
     * to this file did nothing on a database that already had the others — the new one simply never
     * appeared, and the only symptom was a sign-in that failed for a username the seed clearly
     * lists. Existing accounts are never touched: a password someone has changed is theirs, and
     * `--force` is the explicit way to start over.
     */
    const existing = new Set(
        (await User.find({}, { username: 1 }).lean()).map((u) => u.username)
    );
    const missing = ACCOUNTS.filter((a) => !existing.has(a.username));
    if (missing.length === 0) {
        return { created: 0, skipped: true, existing: existing.size };
    }

    const password_hash = await bcrypt.hash(demoPassword(), BCRYPT_ROUNDS);
    const now = new Date();

    const docs = missing.map((a) => ({
        username: a.username,
        display_name: a.display_name,
        role: a.role,
        password_hash,
        totp: a.totp
            ? {
                  secret_base32: DEMO_TOTP_SECRET,
                  enrolled_at: now,
                  // Never `stepFor(now)` — that would make the current code already-used, and the
                  // first sign-in would be refused as a replay.
                  last_used_step: null,
                  pending_secret_base32: null,
                  pending_started_at: null
              }
            : {
                  secret_base32: null,
                  enrolled_at: null,
                  last_used_step: null,
                  pending_secret_base32: null,
                  pending_started_at: null
              },
        passkeys: [],
        // Everyone EXCEPT `newstarter` is an established user who has already seen the guide, so
        // signing in as them goes straight to the unit.
        guide_ack_at: a.guideRead === false ? null : now,
        created_at: now,
        updated_at: now
    }));

    await User.insertMany(docs);
    return {
        created: docs.length,
        skipped: false,
        usernames: docs.map((d) => d.username),
        existing: existing.size
    };
}

/** What to print after seeding. Kept here so the script and the server say the same thing. */
function demoSummary() {
    return {
        password: demoPassword(),
        accounts: ACCOUNTS.map((a) => a.username),
        totp_accounts: ['oncall', 'nightshift'],
        first_run_account: 'newstarter',
        totp_account: 'oncall',
        totp_secret_base32: DEMO_TOTP_SECRET,
        otpauth_uri: totp.otpauthUri({
            issuer: 'PulseMind',
            account: 'oncall',
            secretBase32: DEMO_TOTP_SECRET
        })
    };
}

module.exports = { applyUserSeed, isEmpty, demoSummary, DEMO_TOTP_SECRET, ACCOUNTS };
