/**
 * back-end/scripts/auth-check.js
 *
 * `npm run smoke` for the sign-in surface. Boots the service on an in-process MongoDB, seeds the
 * demo accounts, and drives every ceremony end to end.
 *
 * The assertions worth reading are the ones that check what must NOT happen: an unknown username and
 * a wrong password produce byte-identical bodies; no session cookie exists after the password step
 * of a two-factor account; the same TOTP code cannot be spent twice; passkey registration is refused
 * outright without a session. Those are the properties that turn a login form into a security
 * control, and every one of them is a single line away from silently not being true.
 */
process.env.PULSEMIND_MEMORY_DB = '1';
process.env.PULSEMIND_SEED_ON_BOOT = '1';
process.env.PORT = '3577';
process.env.PULSEMIND_SESSION_SECRET = 'test-session-secret-please-change';
process.env.PULSEMIND_PENDING_SECRET = 'test-pending-secret-please-change';

const totp = require(__dirname + '/../auth/totp');
const { DEMO_TOTP_SECRET } = require(__dirname + '/../seed/users');
require(__dirname + '/../server.js');

const BASE = 'http://127.0.0.1:3577';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? (pass++, console.log('  ok   ' + name)) : (fail++, console.log('  FAIL ' + name + ' ' + extra)); };

let cookie = null;
async function call(path, opts = {}) {
  const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
  if (cookie) headers.cookie = cookie;
  const r = await fetch(BASE + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  let body = null; try { body = await r.json(); } catch {}
  return { status: r.status, body, set };
}

(async () => {
  for (let i = 0; i < 120; i++) {
    try { const h = await fetch(BASE + '/health').then(r => r.json()); if (h.database === 'connected') break; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  await new Promise(r => setTimeout(r, 1200));

  console.log('\n-- session before signing in');
  let r = await call('/auth/session');
  ok('GET /auth/session is 200 and unauthenticated', r.status === 200 && r.body.authenticated === false, JSON.stringify(r.body));

  console.log('\n-- password only (clinician)');
  r = await call('/auth/login', { method: 'POST', body: { username: 'clinician', password: 'PulseMind-demo-2026' } });
  ok('login returns step=authenticated', r.status === 200 && r.body.step === 'authenticated', JSON.stringify(r.body));
  ok('session cookie is httpOnly', /HttpOnly/i.test(r.set || ''), r.set || 'no set-cookie');
  r = await call('/auth/session');
  ok('session now reports the user', r.body.authenticated === true && r.body.user.username === 'clinician', JSON.stringify(r.body));
  ok('session never carries the password hash', !JSON.stringify(r.body).includes('password_hash'));

  console.log('\n-- wrong password and unknown user are indistinguishable');
  cookie = null;
  const bad1 = await call('/auth/login', { method: 'POST', body: { username: 'clinician', password: 'nope' } });
  const bad2 = await call('/auth/login', { method: 'POST', body: { username: 'no-such-person', password: 'nope' } });
  ok('both are 401', bad1.status === 401 && bad2.status === 401);
  ok('both send the identical body', JSON.stringify(bad1.body) === JSON.stringify(bad2.body), JSON.stringify(bad1.body) + ' vs ' + JSON.stringify(bad2.body));

  console.log('\n-- two-factor (oncall)');
  cookie = null;
  r = await call('/auth/login', { method: 'POST', body: { username: 'oncall', password: 'PulseMind-demo-2026' } });
  ok('login stops at the second factor', r.status === 200 && r.body.step === 'second_factor' && r.body.factor === 'totp', JSON.stringify(r.body));
  ok('NO session cookie is issued at step one', !/pm_session=[^;]+/.test(r.set || '') || /pm_session=;/.test(r.set || ''), r.set || 'none');
  const pending = r.body.pending_token;
  const s = await call('/auth/session');
  ok('and the session is still unauthenticated', s.body.authenticated === false);

  const wrong = await call('/auth/login/totp', { method: 'POST', body: { pending_token: pending, code: '000000' } });
  ok('a wrong code is 401 INVALID_CODE', wrong.status === 401 && wrong.body.code === 'INVALID_CODE', JSON.stringify(wrong.body));

  const step = totp.stepFor();
  const code = totp.codeForStep(DEMO_TOTP_SECRET, step);
  r = await call('/auth/login/totp', { method: 'POST', body: { pending_token: pending, code } });
  ok('the right code authenticates', r.status === 200 && r.body.step === 'authenticated', JSON.stringify(r.body));

  const replay = await fetch(BASE + '/auth/login/totp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pending_token: pending, code }) }).then(async x => ({ status: x.status, body: await x.json() }));
  ok('the SAME code cannot be used twice', replay.status === 401 && replay.body.code === 'CODE_ALREADY_USED', JSON.stringify(replay.body));

  console.log('\n-- passkey enrolment requires a session');
  const noSession = await fetch(BASE + '/auth/passkey/register/options', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(async x => ({ status: x.status, body: await x.json() }));
  ok('unauthenticated passkey registration is 401 NOT_AUTHENTICATED', noSession.status === 401 && noSession.body.code === 'NOT_AUTHENTICATED', JSON.stringify(noSession.body));

  r = await call('/auth/passkey/register/options', { method: 'POST', body: {} });
  ok('authenticated registration returns a challenge and rp.id', r.status === 200 && typeof r.body.challenge === 'string' && r.body.rp?.id === 'localhost', JSON.stringify(r.body).slice(0, 160));
  ok('and excludeCredentials is present', Array.isArray(r.body.excludeCredentials));

  r = await call('/auth/passkey/login/options', { method: 'POST', body: { username: 'oncall' } });
  ok('login options work with no passkeys registered', r.status === 200 && typeof r.body.challenge === 'string');
  const unknown = await call('/auth/passkey/login/options', { method: 'POST', body: { username: 'definitely-not-a-user' } });
  ok('an unknown username is not distinguishable here', unknown.status === 200 && typeof unknown.body.challenge === 'string');

  console.log('\n-- TOTP enrolment round trip (clinician)');
  cookie = null;
  await call('/auth/login', { method: 'POST', body: { username: 'clinician', password: 'PulseMind-demo-2026' } });
  r = await call('/auth/totp/enrol', { method: 'POST', body: {} });
  ok('enrol returns a secret, a URI and an SVG QR', r.status === 200 && /^[A-Z2-7]{32}$/.test(r.body.secret_base32) && r.body.otpauth_uri.startsWith('otpauth://totp/') && r.body.qr_svg.includes('<svg'), JSON.stringify(r.body).slice(0, 120));
  const newSecret = r.body.secret_base32;
  const badConfirm = await call('/auth/totp/enrol/confirm', { method: 'POST', body: { code: '111111' } });
  ok('a wrong confirmation code does not enrol', badConfirm.status === 400 && badConfirm.body.code === 'INVALID_CODE');
  r = await call('/auth/totp/enrol/confirm', { method: 'POST', body: { code: totp.codeForStep(newSecret, totp.stepFor()) } });
  ok('the right code completes enrolment', r.status === 200 && r.body.user.totp_enrolled === true, JSON.stringify(r.body));
  r = await call('/auth/login', { method: 'POST', body: { username: 'clinician', password: 'PulseMind-demo-2026' } });
  ok('and the next sign-in now demands the second factor', r.body.step === 'second_factor');

  console.log('\n-- first-run guide acknowledgement');
  cookie = null;
  r = await call('/auth/login', { method: 'POST', body: { username: 'newstarter', password: 'PulseMind-demo-2026' } });
  ok('the first-run account has never acknowledged the guide', r.body.user.guide_ack_at === null, JSON.stringify(r.body.user.guide_ack_at));
  const settled = await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'viewer', password: 'PulseMind-demo-2026' }) }).then(x => x.json());
  // `viewer`, not `clinician`: this script enrols clinician in TOTP earlier, so its login now stops
  // at the second factor and returns no user at all.
  ok('an established account already has, so it is not interrupted', typeof settled.user.guide_ack_at === 'string', JSON.stringify(settled.user && settled.user.guide_ack_at));
  const noAck = await fetch(BASE + '/auth/guide/acknowledge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(async x => ({ status: x.status, body: await x.json() }));
  ok('acknowledging without a session is 401 NOT_AUTHENTICATED', noAck.status === 401 && noAck.body.code === 'NOT_AUTHENTICATED', JSON.stringify(noAck.body));
  r = await call('/auth/guide/acknowledge', { method: 'POST', body: {} });
  ok('acknowledging stamps a time', r.status === 200 && typeof r.body.user.guide_ack_at === 'string', JSON.stringify(r.body.user && r.body.user.guide_ack_at));
  r = await call('/auth/session');
  ok('and the session carries it, so the gate sees it', typeof r.body.user.guide_ack_at === 'string');

  console.log('\n-- logout');
  cookie = null;
  await call('/auth/login', { method: 'POST', body: { username: 'viewer', password: 'PulseMind-demo-2026' } });
  r = await call('/auth/logout', { method: 'POST', body: {} });
  ok('logout is 200', r.status === 200);
  r = await call('/auth/session');
  ok('and the session is gone', r.body.authenticated === false, JSON.stringify(r.body));

  console.log('\n-- the clinical read model is untouched');
  const all = await fetch(BASE + '/patient/all').then(async x => ({ status: x.status, body: await x.json() }));
  ok('GET /patient/all still answers without a session', all.status === 200 && Array.isArray(all.body) && all.body.length === 30, all.status + ' n=' + (all.body?.length));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
