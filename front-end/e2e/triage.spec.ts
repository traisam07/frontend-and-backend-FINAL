import { expect, test, type Page } from '@playwright/test';

/**
 * Each test below exists because a `CLAUDE.md` section 5 rule, or a `docs/spec/screens.md` section 8
 * RULE, could be broken by a plausible edit. The test names cite the rule so a failure says WHY it
 * matters, not just what changed.
 */

async function openBoard(page: Page) {
  await page.goto('/patients');
  await expect(page.getByRole('heading', { name: 'Patient overview' })).toBeVisible();
}

/** The fixture set is deterministic, so a card can be addressed by patient id. */
const card = (page: Page, id: string) =>
  page.getByRole('link', { name: new RegExp(`Patient ${id}\\b`) });

test('/ redirects to /patients', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/patients$/);
});

/* ---- the card is a link — D-22, which OVERRIDES Handoff section 3 ---------------------------- */

test('clicking a patient card opens Patient Detail', async ({ page }) => {
  /**
   * THIS REVERSES A HANDOFF REQUIREMENT, deliberately. Handoff section 3 says "Select that patient …
   * Do not navigate yet" and section 7 says "Click patient card → Select patients only", and the
   * test that used to live here asserted exactly that. The product owner asked for the card to open
   * the patient, was shown the conflict, and confirmed it — recorded as **D-22**, so the handoff
   * team meets a decision rather than a silent drift.
   */
  await openBoard(page);
  await card(page, 'PT-1001').click();
  await expect(page).toHaveURL(/\/patients\/PT-1001/);
});

test('the card carries the board’s filters through, so Back returns to the same view', async ({
  page,
}) => {
  await page.goto('/patients?q=PT-100&filter=needs-review');
  await card(page, 'PT-1001').click();
  // The query and filter ride along, so "Back to overview" reconstructs the board the clinician
  // left rather than a default one.
  await expect(page).toHaveURL(/q=PT-100/);
  await expect(page).toHaveURL(/filter=needs-review/);
});

test('the card is a real link: href, keyboard and open-in-new-tab all work', async ({ page }) => {
  await openBoard(page);
  const target = card(page, 'PT-1002');

  // A real href, not a click handler — this is what makes open-in-new-tab and "copy link address"
  // work, and what puts the destination in the status bar on hover.
  await expect(target).toHaveAttribute('href', /\/patients\/PT-1002/);

  await target.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/patients\/PT-1002/);
});

test('the card carries no nested interactive element', async ({ page }) => {
  await openBoard(page);
  // A link inside a link is invalid HTML and destroys keyboard order. The card IS the link now, so
  // nothing focusable may sit inside it.
  const nested = card(page, 'PT-1001').locator('a, button');
  expect(await nested.count()).toBe(0);
});

test('the board offers a review history in place of the selected-patient panel', async ({
  page,
}) => {
  await openBoard(page);
  const panel = page.getByRole('region', { name: 'Review history' });
  await expect(panel).toBeVisible();

  // Two groups, never merged: what YOU marked here is local and unsaved; what the data reports is
  // not. One list would let a clinician read their own click as a recorded review — the misreading
  // RULE TWO exists to prevent.
  await expect(panel.getByText('Marked by you — this session')).toBeVisible();
  await expect(panel.getByText('Already reviewed in the data')).toBeVisible();
  await expect(panel).toContainText('not saved to the patient record');

  // The old panel is gone with the selection it described.
  await expect(page.getByRole('region', { name: 'Selected patient' })).toHaveCount(0);
});

test('marking a patient reviewed puts it in the review history, with the time and the caveat', async ({
  page,
}) => {
  await openBoard(page);
  await card(page, 'PT-1001').click();
  await expect(page).toHaveURL(/\/patients\/PT-1001/);
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  // The risk history says WHEN, and says it was not saved.
  const history = page.getByRole('region', {
    name: 'Respiratory-risk score · last 24 hours',
  });
  await expect(history).toContainText('Marked reviewed');
  await expect(history).toContainText('not saved to the patient record');

  await page.getByRole('link', { name: 'Back to overview' }).click();
  const panel = page.getByRole('region', { name: 'Review history' });
  await expect(panel.getByRole('link', { name: /PT-1001/ }).first()).toBeVisible();
  await expect(panel).toContainText('Local to this screen');
});

/* ---- states the board must render distinctly ------------------------------------------------------ */

test('S-05 / S-35 — an absent level and score render their literals, never Low and never 0', async ({
  page,
}) => {
  await openBoard(page);
  // PT-2004's latest reading has no risk_level; PT-2005's has no risk_score.
  await expect(card(page, 'PT-2004')).toContainText('Risk level unavailable');
  await expect(card(page, 'PT-2005')).toContainText('score unavailable');
  await expect(card(page, 'PT-2004')).not.toContainText('Low');
});

test('S-09 — a null review status renders its literal and is EXCLUDED from Needs review', async ({
  page,
}) => {
  await openBoard(page);
  await expect(card(page, 'PT-2003')).toContainText('Review status unavailable');

  await page.getByText(/^Needs review/).click();
  await expect(page.getByRole('radio', { name: /Needs review/ })).toBeChecked();
  // It ranks above Reviewed but is excluded from this filter. The asymmetry is deliberate.
  await expect(card(page, 'PT-2003')).toHaveCount(0);
});

test('U-22 — the card time slot has its own literal, not U-11`s', async ({ page }) => {
  await openBoard(page);
  const zeroReadings = card(page, 'PT-2007');
  await expect(zeroReadings).toContainText(
    'No reading with a usable timestamp. The assessment time is unavailable.',
  );
  // U-11's literal belongs to PD-2 and the NO_CURRENT_READING path, never to this slot.
  await expect(zeroReadings).not.toContainText('No assessment available for this patient');
});

test('S-19 — an empty filter result names the query AND the filter, and is not the error state', async ({
  page,
}) => {
  await openBoard(page);
  await page.getByRole('searchbox', { name: /Search Patient ID/ }).fill('ZZZ-NOPE');
  await expect(page.getByText('No patients match "ZZZ-NOPE" with the All filter.')).toBeVisible();
  // An empty state is never an alert: S-19 and U-04 must be visibly distinct treatments.
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('U-20 — an unrecognised filter renders All plus a visible notice', async ({ page }) => {
  await page.goto('/patients?filter=bogus');
  await expect(page.getByText('Unrecognised filter — showing all patients')).toBeVisible();
  await expect(card(page, 'PT-1001')).toBeVisible();
});

test('K1 — pending review outranks a reviewed Critical patient', async ({ page }) => {
  await openBoard(page);
  const names = await page.getByRole('link', { name: /Patient PT-/ }).allInnerTexts();
  const first = names[0] ?? '';
  expect(first).toContain('Pending review');
});

test('search and filter survive back-navigation through the URL', async ({ page }) => {
  await page.goto('/patients?q=PT-100&filter=needs-review');
  await card(page, 'PT-1001').click();
  await expect(page).toHaveURL(/\/patients\/PT-1001/);

  await page.getByRole('link', { name: 'Back to overview' }).click();
  await expect(page).toHaveURL(/q=PT-100/);
  await expect(page).toHaveURL(/filter=needs-review/);
  await expect(page.getByRole('searchbox', { name: /Search Patient ID/ })).toHaveValue('PT-100');
});
