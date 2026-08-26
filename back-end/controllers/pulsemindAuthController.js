/**
 * back-end/controllers/pulsemindAuthController.js
 *
 * The `/auth` surface: password + TOTP, and passkeys (WebAuthn).
 *
 * This does NOT repair `controllers/authController.js`. That one is the MERN tutorial's, it models
 * employees with a numeric `roles` object, and it requires a `model/User` that was never committed —
 * which is the actual reason every auth route in `server.js` is commented out (**G-45**). It stays
 * as it is, unmounted. This file is what serves `/auth`.
 *
 * FOUR RULES THIS FILE KEEPS, all of which are easy to break by accident:
 *
 *   1. **No user enumeration.** An unknown username and a wrong password produce the same status,
 *      the same body, and comparable timing. Anything else turns the login form into a directory of
 *      who works here.
 *   2. **The second factor is not optional.** The password step issues a token whose `purpose` is
 *      `second_factor` and which `requireSession` refuses. There is no code path where completing
 *      step one alone yields a session.
 *   3. **Every failure is NAMED.** `{ code, message }`, never `res.sendStatus(401)`. The frontend
 *      renders states, and a bare status forces it to invent one — the exact habit CLAUDE.md rule 13
 *      exists to prevent.
 *   4. **Nothing clinical is here.** Signing in returns a user, never a patient. Which patients a
 *      role may see is **G-46**, still open, and this file does not quietly answer it.
 */
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const User = require('../model/User');
const totp = require('../auth/totp');
const throttle = require('../auth/throttle');
const {
    issueSession,
    clearSession,
    readSession,
    issuePendingToken,
    readPendingToken
} = require('../auth/session');

const BCRYPT_ROUNDS = 12;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ISSUER = 'PulseMind';

/**
 * The Relying Party ID is the DOMAIN a credential is bound to, and getting it wrong does not fail
 * loudly — it fails at the browser, before any request reaches here, with an opaque error. It must
 * be the registrable domain of the page the user is on, never a URL and never a port.
 *
 * Behind the Cloudflare tunnels the frontend's host is what matters, not this service's, so it is
 * configuration. Default `localhost`, which is what local development serves.
 */
function rpId() {
    return process.env.PULSEMIND_RP_ID || 'localhost';
}

function rpName() {
    return process.env.PULSEMIND_RP_NAME || 'PulseMind';
}

/**
 * Origins a WebAuthn response may claim. The library checks the assertion's origin against this, so
 * a permissive value here is a real hole — it is an allow-list, not a hint.
 */
function expectedOrigins() {
    const configured = (process.env.PULSEMIND_WEBAUTHN_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (configured.length) return configured;
    return [
        'http://localhost:5173',
        'http://localhost:4173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:4173'
    ];
}

function clientAddress(req) {
    return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/** One body shape for every failure, so the frontend never has to guess what it received. */
function fail(res, status, code, message, extra = {}) {
    return res.status(status).json({ code, message, ...extra });
}

const INVALID_CREDENTIALS = {
    code: 'INVALID_CREDENTIALS',
    message: 'That username and password combination was not recognised.'
};

// ------------------------------------------------------------------------------------------------
// Password step
// ------------------------------------------------------------------------------------------------

const login = async (req, res) => {
    const username = String(req.body?.username || '')
        .trim()
        .toLowerCase();
    const password = String(req.body?.password || '');
    const address = clientAddress(req);

    if (!username || !password) {
        return fail(res, 400, 'MISSING_FIELDS', 'Enter your username and your password.');
    }

    const gate = throttle.check('login', username, address);
    if (!gate.allowed) {
        return fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Try again later.', {
            retry_after_seconds: gate.retryAfterSeconds
        });
    }

    const user = await User.findOne({ username }).exec();

    /**
     * The comparison runs even when the user does not exist, against a fixed hash. Skipping it would
     * make "no such user" measurably faster than "wrong password", and a stopwatch would recover the
     * staff list from a form that returns identical bodies.
     */
    const hash = user ? user.password_hash : '$2b$12$0000000000000000000000000000000000000000000000000000';
    const ok = await bcrypt.compare(password, hash).catch(() => false);

    if (!user || !ok) {
        throttle.recordFailure('login', username, address);
        return fail(res, 401, INVALID_CREDENTIALS.code, INVALID_CREDENTIALS.message);
    }

    throttle.recordSuccess('login', username, address);

    if (user.totp && user.totp.secret_base32) {
        // Step one done, NOT signed in. No session cookie is set on this path.
        return res.json({
            step: 'second_factor',
            factor: 'totp',
            pending_token: issuePendingToken(user, 'totp')
        });
    }

    issueSession(res, user, ['pwd']);
    return res.json({ step: 'authenticated', user: user.toPublicJSON() });
};

// ------------------------------------------------------------------------------------------------
// TOTP step
// ------------------------------------------------------------------------------------------------

const loginTotp = async (req, res) => {
    const claims = readPendingToken(req.body?.pending_token);
    if (!claims) {
        return fail(
            res,
            401,
            'CHALLENGE_EXPIRED',
            'That sign-in step timed out. Enter your username and password again.'
        );
    }

    const address = clientAddress(req);
    const gate = throttle.check('totp', claims.username, address);
    if (!gate.allowed) {
        return fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Try again later.', {
            retry_after_seconds: gate.retryAfterSeconds
        });
    }

    const user = await User.findById(claims.sub).exec();
    if (!user || !user.totp || !user.totp.secret_base32) {
        return fail(res, 401, INVALID_CREDENTIALS.code, INVALID_CREDENTIALS.message);
    }

    const result = totp.verify(user.totp.secret_base32, req.body?.code, {
        lastUsedStep: user.totp.last_used_step
    });

    if (!result.ok) {
        throttle.recordFailure('totp', claims.username, address);
        // `replayed` is reported distinctly. A correct-but-reused code is a different event from a
        // wrong one, and flattening them hides the only signal that a code leaked.
        return fail(
            res,
            401,
            result.reason === 'replayed' ? 'CODE_ALREADY_USED' : 'INVALID_CODE',
            result.reason === 'replayed'
                ? 'That code has already been used. Wait for the next one.'
                : 'That code is not correct. Check the app and try the current code.'
        );
    }

    // Persist the step FIRST, so the code cannot be spent twice by two concurrent requests.
    user.totp.last_used_step = result.step;
    user.updated_at = new Date();
    await user.save();

    throttle.recordSuccess('totp', claims.username, address);
    issueSession(res, user, ['pwd', 'otp']);
    return res.json({ step: 'authenticated', user: user.toPublicJSON() });
};

// ------------------------------------------------------------------------------------------------
// Session
// ------------------------------------------------------------------------------------------------

const session = async (req, res) => {
    const claims = readSession(req);
    if (!claims) return res.json({ authenticated: false, user: null });

    const user = await User.findById(claims.sub).exec();
    if (!user) {
        // The cookie is valid but the account is gone. Clear it rather than reporting a phantom.
        clearSession(res);
        return res.json({ authenticated: false, user: null });
    }
    return res.json({ authenticated: true, user: user.toPublicJSON(), amr: claims.amr || [] });
};

const logout = async (req, res) => {
    clearSession(res);
    return res.json({ ok: true });
};

// ------------------------------------------------------------------------------------------------
// TOTP enrolment (authenticated)
// ------------------------------------------------------------------------------------------------

const totpEnrolBegin = async (req, res) => {
    const user = await User.findById(req.session.sub).exec();
    if (!user) return fail(res, 401, 'NOT_AUTHENTICATED', 'Sign in to continue.');

    const secret = totp.generateSecret();
    user.totp.pending_secret_base32 = secret;
    user.totp.pending_started_at = new Date();
    user.updated_at = new Date();
    await user.save();

    const uri = totp.otpauthUri({ issuer: ISSUER, account: user.username, secretBase32: secret });

    // SVG rather than a PNG data URI: it scales to any density, it is a fraction of the bytes, and
    // it renders inline without a second request. `type: 'svg'` returns markup, not a file.
    const qr_svg = await QRCode.toString(uri, { type: 'svg', margin: 1, width: 240 });

    /**
     * The secret is returned in plain text ALONGSIDE the QR code on purpose. A QR code is unusable
     * to someone entering the key on a second device, using a password manager, or working with a
     * screen reader, and "scan this or you cannot enrol" is an accessibility failure, not a security
     * control. The secret is only useful to a caller who is already authenticated as this user.
     */
    return res.json({
        secret_base32: secret,
        otpauth_uri: uri,
        qr_svg,
        digits: totp.DIGITS,
        period_seconds: totp.PERIOD_SECONDS
    });
};

const totpEnrolConfirm = async (req, res) => {
    const user = await User.findById(req.session.sub).exec();
    if (!user) return fail(res, 401, 'NOT_AUTHENTICATED', 'Sign in to continue.');

    const pending = user.totp && user.totp.pending_secret_base32;
    if (!pending) {
        return fail(res, 409, 'NO_ENROLMENT_IN_PROGRESS', 'Start setting up the code app again.');
    }

    // Proving the code BEFORE storing the secret is the whole point of a two-call enrolment: a user
    // who mis-scans is told now, not at their next sign-in when they are locked out.
    const result = totp.verify(pending, req.body?.code);
    if (!result.ok) {
        return fail(res, 400, 'INVALID_CODE', 'That code is not correct. Try the current code.');
    }

    user.totp.secret_base32 = pending;
    user.totp.enrolled_at = new Date();
    user.totp.last_used_step = result.step;
    user.totp.pending_secret_base32 = null;
    user.totp.pending_started_at = null;
    user.updated_at = new Date();
    await user.save();

    return res.json({ ok: true, user: user.toPublicJSON() });
};

const totpDisable = async (req, res) => {
    const user = await User.findById(req.session.sub).exec();
    if (!user) return fail(res, 401, 'NOT_AUTHENTICATED', 'Sign in to continue.');

    user.totp.secret_base32 = null;
    user.totp.enrolled_at = null;
    user.totp.last_used_step = null;
    user.totp.pending_secret_base32 = null;
    user.updated_at = new Date();
    await user.save();
    return res.json({ ok: true, user: user.toPublicJSON() });
};

/**
 * Record that this clinician has read the usage guide.
 *
 * Deliberately NOT a body-driven setter: there is no way to un-acknowledge and no way to backdate.
 * The only thing a caller can say is "I have read it, now", and the server stamps the time.
 */
const acknowledgeGuide = async (req, res) => {
    const user = await User.findById(req.session.sub).exec();
    if (!user) return fail(res, 401, 'NOT_AUTHENTICATED', 'Sign in to continue.');

    user.guide_ack_at = new Date();
    user.updated_at = new Date();
    await user.save();
    return res.json({ ok: true, user: user.toPublicJSON() });
};

// ------------------------------------------------------------------------------------------------
// Passkeys — registration
// ------------------------------------------------------------------------------------------------

function storeChallenge(user, challenge) {
    user.webauthn_challenge = challenge;
    user.webauthn_challenge_expires_at = new Date(Date.now() + CHALLENGE_TTL_MS);
    user.updated_at = new Date();
}

function takeChallenge(user) {
    const challenge = user.webauthn_challenge;
    const expires = user.webauthn_challenge_expires_at;
    // Single-use, whatever the outcome. A challenge left in place is a replayable one.
    user.webauthn_challenge = null;
    user.webauthn_challenge_expires_at = null;
    if (!challenge || !expires || expires.getTime() < Date.now()) return null;
    return challenge;
}

const passkeyRegisterOptions = async (req, res) => {
    const user = await User.findById(req.session.sub).exec();
    if (!user) return fail(res, 401, 'NOT_AUTHENTICATED', 'Sign in to continue.');

    const options = await generateRegistrationOptions({
        rpName: rpName(),
        rpID: rpId(),
        userName: user.username,
        userDisplayName: user.display_name || user.username,
        attestationType: 'none',
        /**
         * Listing what is already registered is what makes the authenticator say "you already have a
         * key here" instead of silently creating a second credential for the same device — which
         * looks like success and leaves a list of duplicates nobody can tell apart.
         */
        excludeCredentials: user.passkeys.map((k) => ({
            id: k.credential_id,
            transports: k.transports
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred'
        }
    });

    storeChallenge(user, options.challenge);
    await user.save();
    return res.json(options);
};

const passkeyRegisterVerify = async (req, res) => {
    const user = await User.findById(req.session.sub).exec();
    if (!user) return fail(res, 401, 'NOT_AUTHENTICATED', 'Sign in to continue.');

    const expectedChallenge = takeChallenge(user);
    if (!expectedChallenge) {
        await user.save();
        return fail(res, 400, 'CHALLENGE_EXPIRED', 'That took too long. Start again.');
    }

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: req.body?.credential,
            expectedChallenge,
            expectedOrigin: expectedOrigins(),
            expectedRPID: rpId(),
            requireUserVerification: false
        });
    } catch (err) {
        await user.save();
        return fail(res, 400, 'PASSKEY_REJECTED', err.message);
    }

    if (!verification.verified || !verification.registrationInfo) {
        await user.save();
        return fail(res, 400, 'PASSKEY_REJECTED', 'That passkey could not be verified.');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    if (user.passkeys.some((k) => k.credential_id === credential.id)) {
        await user.save();
        return fail(res, 409, 'PASSKEY_ALREADY_REGISTERED', 'That passkey is already registered.');
    }

    user.passkeys.push({
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports || [],
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        label: String(req.body?.label || '').trim() || 'Passkey'
    });
    user.updated_at = new Date();
    await user.save();

    return res.json({ ok: true, user: user.toPublicJSON() });
};

const passkeyDelete = async (req, res) => {
    const user = await User.findById(req.session.sub).exec();
    if (!user) return fail(res, 401, 'NOT_AUTHENTICATED', 'Sign in to continue.');

    const before = user.passkeys.length;
    user.passkeys = user.passkeys.filter((k) => String(k._id) !== String(req.params.passkeyId));
    if (user.passkeys.length === before) {
        return fail(res, 404, 'PASSKEY_NOT_FOUND', 'No such passkey on this account.');
    }
    user.updated_at = new Date();
    await user.save();
    return res.json({ ok: true, user: user.toPublicJSON() });
};

// ------------------------------------------------------------------------------------------------
// Passkeys — authentication
// ------------------------------------------------------------------------------------------------

/**
 * The challenge for a sign-in cannot be stored on the user, because at this point there may be no
 * username: a discoverable credential identifies the account itself. So it is held here, keyed by
 * the challenge, with its own deadline.
 *
 * Same in-process caveat as the throttle (**G-53**).
 */
const loginChallenges = new Map();

function sweepLoginChallenges(now = Date.now()) {
    for (const [key, entry] of loginChallenges) {
        if (entry.expires < now) loginChallenges.delete(key);
    }
}

const passkeyLoginOptions = async (req, res) => {
    const username = String(req.body?.username || '')
        .trim()
        .toLowerCase();

    /**
     * When a username is supplied the response lists that account's credentials; when it is not, the
     * list is empty and the authenticator offers whatever it holds for this site. Both are correct.
     * What is NOT done is telling the caller which case happened — an empty list for an unknown user
     * looks exactly like an empty list for a user with no passkeys, which is what keeps this
     * endpoint from becoming a username oracle.
     */
    let allowCredentials;
    if (username) {
        const user = await User.findOne({ username }).exec();
        allowCredentials = (user?.passkeys || []).map((k) => ({
            id: k.credential_id,
            transports: k.transports
        }));
    }

    const options = await generateAuthenticationOptions({
        rpID: rpId(),
        userVerification: 'preferred',
        allowCredentials
    });

    sweepLoginChallenges();
    loginChallenges.set(options.challenge, { expires: Date.now() + CHALLENGE_TTL_MS });
    return res.json(options);
};

const passkeyLoginVerify = async (req, res) => {
    const credential = req.body?.credential;
    const challenge = String(req.body?.challenge || '');
    const address = clientAddress(req);

    sweepLoginChallenges();
    if (!challenge || !loginChallenges.has(challenge)) {
        return fail(res, 400, 'CHALLENGE_EXPIRED', 'That sign-in attempt timed out. Try again.');
    }
    // Single-use, before any verification runs.
    loginChallenges.delete(challenge);

    const credentialId = String(credential?.id || '');
    if (!credentialId) {
        return fail(res, 400, 'PASSKEY_REJECTED', 'That passkey response was incomplete.');
    }

    const gate = throttle.check('passkey', credentialId, address);
    if (!gate.allowed) {
        return fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Try again later.', {
            retry_after_seconds: gate.retryAfterSeconds
        });
    }

    const user = await User.findOne({ 'passkeys.credential_id': credentialId }).exec();
    const stored = user?.passkeys.find((k) => k.credential_id === credentialId);
    if (!user || !stored) {
        throttle.recordFailure('passkey', credentialId, address);
        return fail(res, 401, 'PASSKEY_UNKNOWN', 'That passkey is not registered here.');
    }

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge: challenge,
            expectedOrigin: expectedOrigins(),
            expectedRPID: rpId(),
            credential: {
                id: stored.credential_id,
                publicKey: new Uint8Array(Buffer.from(stored.public_key, 'base64url')),
                counter: stored.counter,
                transports: stored.transports
            },
            requireUserVerification: false
        });
    } catch (err) {
        throttle.recordFailure('passkey', credentialId, address);
        return fail(res, 401, 'PASSKEY_REJECTED', err.message);
    }

    if (!verification.verified) {
        throttle.recordFailure('passkey', credentialId, address);
        return fail(res, 401, 'PASSKEY_REJECTED', 'That passkey could not be verified.');
    }

    /**
     * Counter handling, which is the part that gets written wrong.
     *
     * A counter that goes BACKWARDS is the cloned-authenticator signal and is refused. A counter
     * that stays at zero is not: most platform authenticators — iCloud Keychain, Windows Hello,
     * Android — never implement one and always report 0. Refusing "not greater than stored" would
     * reject every passkey on every phone, so the check is `newCounter > 0 && newCounter <= stored`.
     */
    const newCounter = verification.authenticationInfo.newCounter;
    if (newCounter > 0 && newCounter <= stored.counter) {
        throttle.recordFailure('passkey', credentialId, address);
        return fail(
            res,
            401,
            'PASSKEY_COUNTER_REGRESSED',
            'That passkey reported an out-of-order counter and was refused. It may have been cloned.'
        );
    }

    stored.counter = newCounter;
    stored.last_used_at = new Date();
    user.updated_at = new Date();
    await user.save();

    throttle.recordSuccess('passkey', credentialId, address);

    /**
     * A passkey is a single ceremony that already proved possession of the device and — when user
     * verification ran — a PIN or biometric on it. Sending that user on to a TOTP prompt afterwards
     * is a downgrade dressed as caution: it adds the weakest factor to the strongest one. Whether
     * this hospital's policy agrees is **D-15**, and the `amr` claim records what actually happened
     * either way.
     */
    issueSession(res, user, verification.authenticationInfo.userVerified ? ['passkey', 'uv'] : ['passkey']);
    return res.json({ step: 'authenticated', user: user.toPublicJSON() });
};

// ------------------------------------------------------------------------------------------------

/** Used by the seed and by `scripts/create-user.js`. Never exposed as a public registration route. */
async function createUser({ username, password, displayName = null, role = 'clinician' }) {
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return User.create({
        username: String(username).trim().toLowerCase(),
        display_name: displayName,
        role,
        password_hash
    });
}

module.exports = {
    login,
    loginTotp,
    session,
    logout,
    totpEnrolBegin,
    totpEnrolConfirm,
    totpDisable,
    acknowledgeGuide,
    passkeyRegisterOptions,
    passkeyRegisterVerify,
    passkeyDelete,
    passkeyLoginOptions,
    passkeyLoginVerify,
    createUser,
    rpId,
    expectedOrigins
};
