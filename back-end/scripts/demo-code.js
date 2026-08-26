/**
 * back-end/scripts/demo-code.js
 *
 * Prints the TOTP code the seeded `oncall` account expects right now, and how long it lasts.
 *
 * This exists so the two-factor path can be demonstrated and tested without an authenticator app on
 * a phone. It only knows the code because `seed/users.js` uses a FIXED demo secret — it is not a way
 * to read a real user's secret, which is stored per account and never printed.
 */
const totp = require('../auth/totp');
const { DEMO_TOTP_SECRET } = require('../seed/users');

const step = totp.stepFor();
const secondsLeft = totp.PERIOD_SECONDS - (Math.floor(Date.now() / 1000) % totp.PERIOD_SECONDS);

console.log(`account   oncall`);
console.log(`code      ${totp.codeForStep(DEMO_TOTP_SECRET, step)}`);
console.log(`valid for ${secondsLeft}s (then the next one)`);
