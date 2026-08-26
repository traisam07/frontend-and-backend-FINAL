import { expect, test } from '@playwright/test';

/**
 * THE GATE — `PUBLIC_PULSEMIND_REQUIRE_AUTH=true` (**D-16**).
 *
 * Tagged `@gated` and run by the `gated` project, which is the only one that starts a DEV server.
 * That is not a convenience: `$env/dynamic/public` resolves to empty in a `vite preview` of this SPA
 * build, so the flag has no effect there and this half of D-16 is untestable on the preview server.
 *
 * Both defects these tests were written after were invisible to the other 64:
 *
 *   `/login` 500'd in dev because its `+page.ts` exported a helper — a check SvelteKit runs only in
 *   the dev server (L-068).
 *
 *   A completed sign-in navigated to `/undefined`, because `invalidate('pulsemind:session')` re-runs
 *   this page's own load, that load redirects once the session is valid, and `data` was read AFTER
 *   the await. With the gate off the load does not redirect and the bug cannot happen.
 *
 * Neither is exotic. Both are what "tested" looked like ten minutes before someone opened the app.
 */

const PASSWORD = 'PulseMind-demo-2026';

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('the gate redirects to sign-in and remembers where you were going @gated', async ({
  page,
}) => {
  await page.goto('/patients?filter=needs-review&q=PT-10');

  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole('heading', { name: 'Sign in to PulseMind' })).toBeVisible();
  // The WHOLE destination survives — path and query — so a deep link into a filtered board is not
  // silently downgraded to the default view.
  expect(decodeURIComponent(new URL(page.url()).search)).toContain(
    'next=/patients?filter=needs-review&q=PT-10',
  );
});

test('signing in lands on the original destination, not on /undefined @gated', async ({ page }) => {
  await page.goto('/patients?filter=needs-review&q=PT-10');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/patients\?filter=needs-review&q=PT-10/);
  await expect(page.getByRole('heading', { name: 'Patient overview' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Account menu/ })).toBeVisible();
});

test('every clinical route is refused while signed out @gated', async ({ page }) => {
  for (const path of [
    '/patients',
    '/patients/PT-1001',
    '/patients/PT-1001/parameters/respiratory-rate',
  ]) {
    await page.goto(path);
    await expect(page, `${path} must be gated`).toHaveURL(/\/login/);
    // And nothing clinical leaked into the redirect on the way past.
    expect(await page.locator('body').innerText()).not.toMatch(/PT-\d{4}/);
  }
});

test('/login sends an already-signed-in user onward instead of asking again @gated', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  // Coming back to the sign-in screen with a live session: it has nothing to offer.
  await page.goto('/login?next=%2Fpatients%2FPT-1001');
  await expect(page).toHaveURL(/\/patients\/PT-1001/);
});

test('signing out returns to the gate @gated', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('viewer');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  await page.getByRole('button', { name: /^Account menu/ }).click();
  await page.getByRole('button', { name: /^Sign out/ }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Sign in to PulseMind' })).toBeVisible();

  // The board is refused again — the cookie really is gone, not just the header text.
  await page.goto('/patients');
  await expect(page).toHaveURL(/\/login/);
});

test('no route in the app throws a dev-only error @gated', async ({ page }) => {
  /**
   * The cheap, general version of L-068. SvelteKit's route-export validation, `$env` resolution and
   * several other checks run in the dev server only, and each one surfaces as a console error on a
   * page that otherwise renders an error state. Loading every route once with a listener attached
   * costs a second and covers the whole class.
   */
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  for (const path of [
    '/patients',
    '/patients/PT-1001',
    '/patients/PT-1001/parameters/respiratory-rate',
    '/account/security',
    '/login',
  ]) {
    await page.goto(path);
    await page.waitForTimeout(400);
  }

  // Favicon 404s and the like are not what this is looking for.
  const real = errors.filter((e) => !/favicon|net::ERR_/i.test(e));
  expect(real, `dev-only errors: ${real.join(' | ')}`).toEqual([]);
});
