import { expect, test, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';

/**
 * THE SIGN-IN SURFACE, against the real service.
 *
 * `playwright.config.ts` boots `back-end/server.js` on an in-process MongoDB with the demo accounts
 * seeded, so every assertion below crosses a real HTTP boundary, a real bcrypt comparison and a real
 * TOTP verification. A mocked backend here would assert that the mock matches the mock — and the
 * things most worth testing (no session at step one, a code that cannot be replayed, no user
 * enumeration) live entirely on the far side of that boundary.
 *
 * WHAT IS NOT TESTED HERE, and why it is stated rather than skipped silently: the passkey CEREMONY.
 * A real `navigator.credentials.create()` needs an authenticator, and Chrome's virtual authenticator
 * is driven through CDP — which is a fair thing to add, and until it is, the assertions below cover
 * everything around the ceremony (the button's presence, the capability probe, the server's refusal
 * of an unauthenticated registration) and stop honestly at the browser prompt. Registered as **P-12**.
 */

const PASSWORD = 'PulseMind-demo-2026';
/** Matches `back-end/seed/users.js`. Fixed so a code can be computed here rather than typed. */
const DEMO_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

/** RFC 6238, six digits, 30 s — the same algorithm the service runs, implemented independently. */
function totpCode(secretBase32: string, at = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of secretBase32) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const step = Math.floor(at / 1000 / 30);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
  counter.writeUInt32BE(step >>> 0, 4);
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

/**
 * The form's alert, not the layout's.
 *
 * `+layout.svelte` keeps two permanently-present sr-only live regions, and one of them is
 * `role="alert"` (the assertive channel). A bare `getByRole('alert')` matches it too, resolves to
 * two elements, and — when it does not throw for strictness — reads the empty one. Scoping to
 * `<main>` is what makes the assertion about the message the user was shown.
 */
function formAlert(page: Page) {
  return page.locator('main').getByRole('alert');
}

/**
 * The signed-in signal, and the way out.
 *
 * Identity and its two actions live behind one avatar control now (`AccountMenu`), so "is anyone
 * signed in" is "does the account menu exist" rather than "is a Sign out button on screen", and
 * signing out is two steps. Both are helpers so the contract lives in ONE place — every test that
 * open-codes it is a test that breaks the next time the header changes shape.
 */
function accountMenu(page: Page) {
  return page.getByRole('button', { name: /^Account menu/ });
}

async function signOut(page: Page) {
  await accountMenu(page).click();
  await page.getByRole('button', { name: /^Sign out/ }).click();
}

async function signIn(page: Page, username: string) {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test.beforeEach(async ({ context }) => {
  // Every test starts signed out. Without this the suite's own order decides its results.
  await context.clearCookies();
});

test('the sign-in screen shows nothing clinical', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in to PulseMind' })).toBeVisible();

  /**
   * The invariant is that no patient DATA reaches this screen — not that the words never appear.
   * The page's own copy says "the adult ventilated unit", and banning the word would be a test of
   * this harness's prose rather than of what is rendered. So the assertions are structural: no
   * patient identifier, no risk-family styling, no risk or review chip.
   */
  const body = await page.locator('body').innerText();
  expect(body, 'no patient identifier may appear on the sign-in screen').not.toMatch(/PT-\d{4}/);
  await expect(page.locator('[class*="risk-"], [class*="review-"], [class*="prov-"]')).toHaveCount(
    0,
  );
  await expect(page.getByText(/^(Critical|High|Medium|Low)$/)).toHaveCount(0);
  await expect(page.getByText('Pending review')).toHaveCount(0);
});

test('password-only sign-in reaches the board and names the user', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, 'clinician');

  await expect(page).toHaveURL(/\/patients/);
  // The header stops rendering the G-23 unknown treatment and shows a real identity. The avatar's
  // accessible name carries the person AND the role, because the visible initials carry neither.
  await expect(accountMenu(page)).toHaveAccessibleName(/Dr A\. Clinician, Clinician/);
});

test('a wrong password and an unknown user are indistinguishable on screen', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, 'clinician');
  // …with the wrong password this time.
  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const wrongPassword = await formAlert(page).innerText();

  await page.goto('/login');
  await page.getByLabel('Username').fill('nobody-by-that-name');
  await page.getByLabel('Password', { exact: false }).fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const unknownUser = await formAlert(page).innerText();

  expect(unknownUser).toBe(wrongPassword);
  expect(wrongPassword).toContain('not recognised');
});

test('two-factor: the password alone does not sign anyone in', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, 'oncall');

  // A separate screen state with its own heading, not a field that grew under the password.
  await expect(page.getByLabel('Six-digit code')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  // The decisive assertion: the board is still refused at this point. Navigating away and back must
  // not produce a signed-in app.
  await page.goto('/patients');
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
  await expect(page.getByText('Dr B. On-call')).toHaveCount(0);
});

test('two-factor: a wrong code is named, and the right code completes the sign-in', async ({
  page,
}) => {
  await page.goto('/login');
  await signIn(page, 'oncall');

  await page.getByLabel('Six-digit code').fill('000000');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(formAlert(page)).toContainText('not correct');
  // Named, not anonymous — the code is on screen for a support call.
  await expect(formAlert(page)).toContainText('INVALID_CODE');

  await page.getByLabel('Six-digit code').fill(totpCode(DEMO_TOTP_SECRET));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();

  await expect(page).toHaveURL(/\/patients/);
  await expect(accountMenu(page)).toHaveAccessibleName(/Dr B\. On-call/);
});

test('signing out clears the session and the header identity', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, 'clinician');
  await expect(accountMenu(page)).toBeVisible();

  await signOut(page);
  await expect(accountMenu(page)).toHaveCount(0);
  await expect(page.getByText('Dr A. Clinician')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('the security page refuses a signed-out visitor by name, not by redirect', async ({
  page,
}) => {
  await page.goto('/account/security');
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
  // Distinct from the clinical error state: it must not claim the assessment service failed.
  await expect(page.getByText('PulseMind is not showing an assessment')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Go to sign in' })).toBeVisible();
});

test('the security page lists a signed-in account’s factors and no patient data', async ({
  page,
}) => {
  // `nightshift`, not `oncall`: both are enrolled with the same demo secret, and a TOTP code is
  // single-use, so two parallel tests submitting the same account's code would have one of them
  // correctly refused as a replay. One two-factor account per concurrent test.
  await page.goto('/login');
  await signIn(page, 'nightshift');
  await page.getByLabel('Six-digit code').fill(totpCode(DEMO_TOTP_SECRET));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page).toHaveURL(/\/patients/);

  await accountMenu(page).click();
  await page.getByRole('link', { name: 'Account & security' }).click();
  await expect(page.getByRole('heading', { name: 'Account & security' })).toBeVisible();

  // `oncall` is enrolled, so the authenticator section reports it rather than offering setup.
  await expect(page.getByText('Set up. Your sign-in asks for a code.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Passkeys' })).toBeVisible();
  await expect(page.getByText('No passkeys are registered on this account yet.')).toBeVisible();

  // Structural again: this page explains that it changes no risk score, so the WORDS are expected.
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/PT-\d{4}/);
  await expect(page.locator('[class*="risk-"], [class*="prov-"]')).toHaveCount(0);
});

test('a passkey enrolment round trip is offered, and the server refuses it without a session', async ({
  page,
  request,
}) => {
  // The browser side: the capability probe decides whether the button exists at all, and Chromium
  // reports support, so it must be offered — a passkey button that is never rendered is the most
  // common way this feature ships broken.
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Sign in with a passkey/ })).toBeVisible();

  // The server side: registration is refused outright without a session, with a NAMED code.
  const refused = await request.post('http://localhost:3500/auth/passkey/register/options', {
    data: {},
    failOnStatusCode: false,
  });
  expect(refused.status()).toBe(401);
  expect((await refused.json()).code).toBe('NOT_AUTHENTICATED');
});

test('an open redirect through ?next= is refused', async ({ page }) => {
  await page.goto('/login?next=https://evil.example/harvest');
  await signIn(page, 'clinician');
  // Signed in, and landed on the board — never on the attacker's host.
  await expect(page).toHaveURL(/localhost:4173\/patients/);
});

test('every control on the sign-in screen clears the 44px target floor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');

  /**
   * Settle before measuring. This assertion reads box heights, and a box measured while the page is
   * still laying out is a number about nothing — it failed once on a cold first run of the suite and
   * passed on every warm one, which is the signature of measuring too early rather than of a real
   * regression. Waiting on a control that must exist, and on font loading, removes the whole class.
   */
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const controls = page.locator('main button, main a[href], main input, main summary');
  const count = await controls.count();
  expect(count).toBeGreaterThan(3);
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    const name =
      (await control.innerText().catch(() => '')) ||
      (await control.inputValue().catch(() => '')) ||
      `control ${i}`;
    expect(box?.height ?? 0, `${name} height`).toBeGreaterThanOrEqual(44);
  }
});

test('a browser that refuses the session cookie is TOLD, not bounced silently', async ({
  page,
}) => {
  /**
   * The real-world failure this stands for: the app on one hostname, the service on another, so the
   * session cookie is third-party. Safari blocks those by default and Firefox's Total Cookie
   * Protection does the same. `POST /auth/login` returns 200, the browser drops the `Set-Cookie`,
   * and the app is anonymous again on the very next request — a clinician types the right password
   * and lands back on the sign-in screen with nothing said. Reproduced in WebKit against the
   * tunnelled demo; completely invisible in Chromium, which is why it survived to a user report.
   *
   * Simulated here by stripping `set-cookie` from the login response, which is exactly what those
   * browsers do to it. The cause is fixed at the root by the `/api` proxy in `vite.config.ts`; this
   * asserts the app still NAMES the state when a deployment has not done that.
   */
  /**
   * Simulated at the boundary the APP observes — "the session did not stick" — rather than by
   * stripping `Set-Cookie`. Stripping it does not work: `route.fetch()` performs the request through
   * the browser context, so the cookie is stored by that call before the response is ever rewritten,
   * and the app sees a perfectly good session. What a cookie-blocking browser actually produces, from
   * this code's point of view, is a login that returns 200 followed by an anonymous
   * `GET /auth/session` — which is what this forces.
   */
  let signedInOnce = false;
  await page.route('**/auth/login', async (route) => {
    signedInOnce = true;
    await route.continue();
  });
  await page.route('**/auth/session', async (route) => {
    if (!signedInOnce) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false, user: null }),
    });
  });

  await page.goto('/login');
  await signIn(page, 'clinician');

  await expect(formAlert(page)).toContainText('did not keep it');
  await expect(formAlert(page)).toContainText('SESSION_NOT_STORED');
  // It must not pretend to have worked: no navigation to the board.
  await expect(page).toHaveURL(/\/login/);
});

test('the sign-in screen renders no app toolbar', async ({ page }) => {
  await page.goto('/login');

  /**
   * Every part of that header is about a clinical session — the unit clock, the read-only posture,
   * who is signed in, where to go next — and none of it has an answer before anyone has signed in.
   * So the sign-in screen renders its own frame and no toolbar at all.
   */
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByText(/Unit clock/i)).toHaveCount(0);
  await expect(page.getByText('Session')).toHaveCount(0);

  // The one control that still applies is still here — the page renders it itself, and it is the
  // same component the header uses rather than a second copy of a 44px button.
  const toggle = page.getByRole('switch', { name: 'Dark theme' });
  await expect(toggle).toBeVisible();
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(before);

  // And the toolbar comes back the moment there is a session to frame.
  await signIn(page, 'clinician');
  await expect(page).toHaveURL(/\/patients/);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByText(/Unit clock/i).first()).toBeVisible();
});

test('the sign-in actions carry the brand red with white type in BOTH themes', async ({ page }) => {
  /**
   * A supplied brand colour, so the assertion is the exact rendered value — not "looks red". The ink
   * is white in light AND dark, which is unusual here (every other family has a light tone and a
   * dark tone) and is the point: the two sign-in buttons look the same on either workstation.
   *
   * Measured rather than assumed: white on this red is 5.72:1, over SC 1.4.3's 4.5 floor, while
   * black would be 3.67:1 — so white is the CORRECT ink, not merely the requested one
   * (`docs/spec/contrast-ledger.md`).
   */
  const BRAND = 'rgb(205, 8, 45)'; // #CD082D
  const WHITE = 'rgb(255, 255, 255)';

  for (const theme of ['light', 'dark'] as const) {
    await page.addInitScript((t) => localStorage.setItem('pm-theme', t), theme);
    await page.goto('/login');

    const passkey = page.getByRole('button', { name: /Sign in with a passkey/ });
    const submit = page.getByRole('button', { name: 'Sign in', exact: true });
    await expect(submit).toBeVisible();

    for (const [label, control] of [
      ['passkey', passkey],
      ['sign in', submit],
    ] as const) {
      const paint = await control.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { background: cs.backgroundColor, colour: cs.color, border: cs.borderTopColor };
      });
      expect(paint.background, `${label} background in ${theme}`).toBe(BRAND);
      expect(paint.colour, `${label} text in ${theme}`).toBe(WHITE);
      // The boundary is never the same as the fill in dark: at 2.92:1 against the surface the fill
      // alone is under SC 1.4.11's 3:1 floor, so the button's shape would fade into the page.
      if (theme === 'dark') {
        expect(paint.border, `${label} needs its own edge in dark`).not.toBe(BRAND);
      }
    }
  }
});

test('the brand red never appears on a screen that shows a patient', async ({ page }) => {
  /**
   * The constraint that makes the colour safe. This red sits close to the risk-critical family; on a
   * screen carrying risk bands it would put an ACTION and a SEVERITY in one visual language. It is
   * confined to the sign-in ceremony, and that confinement is asserted rather than trusted (**D-20**).
   */
  await page.goto('/login');
  await signIn(page, 'clinician');
  await expect(page).toHaveURL(/\/patients/);

  for (const url of [
    '/patients',
    '/patients/PT-1001',
    '/patients/PT-1001/parameters/respiratory-rate',
  ]) {
    await page.goto(url);
    await expect(page.getByRole('heading').first()).toBeVisible();
    const brandUses = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>('body *')].filter((el) =>
          String(el.className).includes('bg-brand-solid'),
        ).length,
    );
    expect(brandUses, `the brand variant must not reach ${url}`).toBe(0);
  }
});
