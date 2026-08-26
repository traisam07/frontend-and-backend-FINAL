import { expect, test } from '@playwright/test';

/**
 * THE USAGE GUIDE — shown once on a clinician's first sign-in, reachable from the profile menu after.
 *
 * The assertions worth reading are the ones about what the page must NOT say. A "how to use it" page
 * is the easiest place in a clinical application to smuggle in an invented threshold: one sentence
 * like "a score above 80 needs attention" would be model logic that Handoff section 8 puts out of
 * scope, wearing the clothes of documentation (CLAUDE.md rule 16). So the page is checked for
 * numbers, and for the mandated words it quotes.
 *
 * The first-run half is `@gated`: it needs a real session, and `$env/dynamic/public` resolves to
 * empty under `vite preview`, so only the `gated` project can exercise it.
 */

const PASSWORD = 'PulseMind-demo-2026';

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('the guide is readable without signing in and shows nothing clinical', async ({ page }) => {
  await page.goto('/guide');
  await expect(page.getByRole('heading', { name: 'How to use PulseMind', level: 1 })).toBeVisible();

  const body = await page.locator('main').innerText();
  // It describes the interface. No patient reaches it.
  expect(body).not.toMatch(/PT-\d{4}/);
  await expect(page.locator('[class*="risk-"], [class*="prov-"]')).toHaveCount(0);
});

test('the guide invents no threshold, scale, or clinical instruction', async ({ page }) => {
  await page.goto('/guide');
  const body = await page.locator('main').innerText();

  /**
   * NO NUMBERS AT ALL, apart from the ordered list's own markers. `risk_score` is unscaled and its
   * range is undefined, so any figure on this page would be a scale the app does not have — and the
   * sentence around it would read as guidance.
   */
  const numbers = body.match(/(?<![\w-])\d+(\.\d+)?(?![\w-])/g) ?? [];
  expect(numbers, `the guide must quote no numbers, found: ${numbers.join(', ')}`).toEqual([]);

  // And none of the verbs that turn description into instruction.
  for (const forbidden of [
    /\bescalate\b/i,
    /\bshould be (treated|escalated|reviewed within)\b/i,
    /\bnormal range\b/i,
    /\bthreshold\b/i,
    /\bdiagnos/i,
    /\bprescri/i,
  ]) {
    expect(body, `the guide must not say ${forbidden}`).not.toMatch(forbidden);
  }
});

test('the guide quotes the mandated words exactly, so it cannot drift from the screens', async ({
  page,
}) => {
  await page.goto('/guide');
  const body = await page.locator('main').innerText();

  // If any of these are ever respelled in the app, this fails and the guide gets fixed with them.
  for (const literal of [
    'Critical',
    'High',
    'Medium',
    'Low',
    'Pending review',
    'Reviewed',
    'Measured',
    'Carried forward',
    'Not measured on this patient',
    'Risk level unavailable',
    'Mark as reviewed',
    'Open patient detail',
  ]) {
    expect(body, `the guide must quote "${literal}" as the app spells it`).toContain(literal);
  }

  // The read-only posture is stated, and the local-mark caveat with it.
  expect(body).toMatch(/read-only/i);
  expect(body).toMatch(/not saved to the patient record/i);
});

test('the profile menu offers the guide, above the account settings @gated', async ({ page }) => {
  // `clinician` has already read the guide, so this test is about the MENU and is not entangled
  // with the one account that still has a first run to give.
  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  await page.getByRole('button', { name: /^Account menu/ }).click();
  const panel = page.getByRole('group', { name: 'Account' });
  const link = panel.getByRole('link', { name: 'How to use PulseMind' });
  await expect(link).toBeVisible();

  // Above `Account & security`: it is what someone who has forgotten how something works reaches
  // for, and they should not have to read past their own security settings to find it.
  const order = await panel.locator('a').allInnerTexts();
  expect(order[0]?.trim()).toBe('How to use PulseMind');

  await link.click();
  await expect(page).toHaveURL(/\/guide/);
  await expect(page.getByRole('heading', { name: 'How to use PulseMind', level: 1 })).toBeVisible();
  // Reopened, not first-run: it offers a way back and no acknowledgement.
  await expect(page.getByRole('button', { name: /I have read this/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to overview' }).first()).toBeVisible();
});

test('the first sign-in shows the guide once, per ACCOUNT, and remembers the destination @gated', async ({
  page,
}) => {
  // A deep link into a filtered board, from a signed-out browser.
  await page.goto('/patients?filter=needs-review');
  await expect(page).toHaveURL(/\/login/);
  /**
   * `newstarter` is the ONLY seeded account that has not acknowledged the guide, and it exists for
   * this test alone. Acknowledgement is stored per account on the server, so a shared account would
   * have its first run consumed by whichever test signed in first — the same shared-mutable-state
   * trap as the single-use TOTP code (L-065) and the in-process throttle (L-072).
   */
  await page.getByLabel('Username').fill('newstarter');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // The guide comes first, and it is carrying where they were going.
  await expect(page).toHaveURL(/\/guide\?first=1/);
  expect(decodeURIComponent(new URL(page.url()).search)).toContain(
    'next=/patients?filter=needs-review',
  );
  // No back link on a first run — there is nothing behind it yet.
  await expect(page.getByRole('link', { name: 'Back to overview' })).toHaveCount(0);

  await page.getByRole('button', { name: /I have read this/ }).click();

  // Straight to the destination they originally asked for, not a default view.
  await expect(page).toHaveURL(/\/patients\?filter=needs-review/);

  // And it does not come back. Not on the next navigation, and not after a reload.
  await page.goto('/patients');
  await expect(page).toHaveURL(/\/patients$/);
  await page.reload();
  await expect(page).toHaveURL(/\/patients$/);
  await expect(page.getByRole('heading', { name: 'Patient overview' })).toBeVisible();
});

test('a signed-out reader is never shown an acknowledgement it cannot record @gated', async ({
  page,
}) => {
  /**
   * `?first=1` is set by the gate, never by the clinician — but the URL is shareable, so the page
   * must not honour it for someone with no session. A button that 401s is worse than no button.
   */
  await page.goto('/guide?first=1');
  await expect(page.getByRole('heading', { name: 'How to use PulseMind', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /I have read this/ })).toHaveCount(0);
});
