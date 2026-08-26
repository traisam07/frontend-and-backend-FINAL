/**
 * back-end/auth/session.js
 *
 * One signed, httpOnly session cookie. No access token in the response body, and none in
 * `localStorage`: a token the page's JavaScript can read is a token an XSS can exfiltrate, and this
 * SPA renders text that came off the wire. The browser holds the cookie, the browser attaches it,
 * the page never sees it.
 *
 * SAMESITE IS THE PART THAT IS NOT COSMETIC. The frontend and this service are the same site during
 * local development (`localhost:4173` -> `localhost:3500` differ only by port, which SameSite
 * ignores) and DIFFERENT sites behind two Cloudflare tunnels. `Lax` is correct and safer for the
 * first; the second cannot work without `SameSite=None; Secure`. So it is configuration, defaulting
 * to the safer value, and the demo script opts in. Browsers that block third-party cookies outright
 * will refuse the cross-site case no matter what is sent — that limitation is registered as
 * **G-52**, not papered over by moving the token somewhere scriptable.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SESSION_COOKIE = 'pm_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // one long shift
const PENDING_TTL_SECONDS = 5 * 60; // between password and second factor

/**
 * A missing secret must stop the process, not default to a constant. A hard-coded fallback signs
 * tokens anyone with the source can forge, and it fails silently, which is the worst combination.
 * Generating a random one per boot is the safe degradation: sessions do not survive a restart, which
 * is visible, rather than being universally forgeable, which is not.
 */
function secretFor(name) {
    const value = process.env[name];
    if (value && value.length >= 16) return value;
    if (!secretFor._warned) {
        secretFor._warned = new Set();
    }
    if (!secretFor._warned.has(name)) {
        secretFor._warned.add(name);
        console.warn(
            `[auth] ${name} is unset or too short. Using a random per-boot secret: sessions will ` +
                'not survive a restart. Set it in back-end/.env for anything but a demo.'
        );
    }
    if (!secretFor._generated) secretFor._generated = new Map();
    if (!secretFor._generated.has(name)) {
        secretFor._generated.set(name, crypto.randomBytes(32).toString('hex'));
    }
    return secretFor._generated.get(name);
}

function cookieOptions() {
    const crossSite = Boolean(process.env.PULSEMIND_COOKIE_CROSS_SITE);
    return {
        httpOnly: true,
        // `None` REQUIRES `Secure`; sending it over plain http means the browser drops the cookie
        // and the user gets a login that appears to succeed and then forgets them.
        sameSite: crossSite ? 'none' : 'lax',
        secure: crossSite || process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_TTL_SECONDS * 1000
    };
}

/**
 * `amr` is the authentication-methods-referenced claim: which factors were actually used. It is
 * recorded because "signed in with a passkey" and "signed in with a password and a code" are
 * different facts, and a later authorisation rule (**G-46**) may care which one happened.
 */
function issueSession(res, user, amr) {
    const token = jwt.sign(
        {
            sub: String(user._id),
            username: user.username,
            role: user.role,
            amr
        },
        secretFor('PULSEMIND_SESSION_SECRET'),
        { expiresIn: SESSION_TTL_SECONDS }
    );
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return token;
}

function clearSession(res) {
    // The clearing cookie must match the original's attributes or the browser keeps the old one.
    const { maxAge, ...rest } = cookieOptions();
    void maxAge;
    res.clearCookie(SESSION_COOKIE, rest);
}

function readSession(req) {
    const raw = req.cookies ? req.cookies[SESSION_COOKIE] : null;
    if (!raw) return null;
    try {
        return jwt.verify(raw, secretFor('PULSEMIND_SESSION_SECRET'));
    } catch {
        return null;
    }
}

/**
 * The token that carries a half-finished login from the password step to the second factor. It is
 * NOT a session: it names a purpose, it expires in five minutes, and `requireSession` rejects it.
 * A pending token that could be spent as a session would make the second factor optional.
 */
function issuePendingToken(user, factor) {
    return jwt.sign(
        { sub: String(user._id), username: user.username, purpose: 'second_factor', factor },
        secretFor('PULSEMIND_PENDING_SECRET'),
        { expiresIn: PENDING_TTL_SECONDS }
    );
}

function readPendingToken(token) {
    try {
        const claims = jwt.verify(String(token || ''), secretFor('PULSEMIND_PENDING_SECRET'));
        return claims.purpose === 'second_factor' ? claims : null;
    } catch {
        return null;
    }
}

/** Express middleware. 401 with a NAMED code, never a bare `sendStatus`. */
function requireSession(req, res, next) {
    const claims = readSession(req);
    if (!claims) {
        return res.status(401).json({
            code: 'NOT_AUTHENTICATED',
            message: 'Sign in to continue.'
        });
    }
    req.session = claims;
    return next();
}

module.exports = {
    SESSION_COOKIE,
    SESSION_TTL_SECONDS,
    PENDING_TTL_SECONDS,
    issueSession,
    clearSession,
    readSession,
    issuePendingToken,
    readPendingToken,
    requireSession
};
