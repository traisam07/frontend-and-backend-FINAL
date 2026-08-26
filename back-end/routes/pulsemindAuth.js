/**
 * back-end/routes/pulsemindAuth.js
 *
 * `/auth`. Mounted in `server.js`; the tutorial's `routes/auth.js`, `register.js`, `refresh.js` and
 * `logout.js` stay unmounted (**G-45**) because they require a `model/User` that was never committed
 * and would throw at load.
 *
 * There is deliberately NO public registration route. A clinical system does not let the internet
 * create clinician accounts; users are created by `npm run seed:users` or `scripts/create-user.js`,
 * both of which run on the server. That is a HARNESS decision standing in for an account-provisioning
 * process the handoff never describes (**G-54**).
 */
const express = require('express');
const router = express.Router();

const auth = require('../controllers/pulsemindAuthController');
const { requireSession } = require('../auth/session');

// --- unauthenticated: the sign-in ceremony itself -------------------------------------------------
router.post('/login', auth.login);
router.post('/login/totp', auth.loginTotp);
router.post('/passkey/login/options', auth.passkeyLoginOptions);
router.post('/passkey/login/verify', auth.passkeyLoginVerify);

// `GET` so the SPA can ask "who am I" on boot without a body, and so a logged-out answer is a
// perfectly ordinary 200 rather than an error the client has to special-case.
router.get('/session', auth.session);
router.post('/logout', auth.logout);

// --- authenticated: managing your own factors ----------------------------------------------------
router.post('/totp/enrol', requireSession, auth.totpEnrolBegin);
router.post('/totp/enrol/confirm', requireSession, auth.totpEnrolConfirm);
router.post('/totp/disable', requireSession, auth.totpDisable);

// Reading the guide needs no account; recording that YOU read it obviously does.
router.post('/guide/acknowledge', requireSession, auth.acknowledgeGuide);

router.post('/passkey/register/options', requireSession, auth.passkeyRegisterOptions);
router.post('/passkey/register/verify', requireSession, auth.passkeyRegisterVerify);
router.delete('/passkey/:passkeyId', requireSession, auth.passkeyDelete);

module.exports = router;
