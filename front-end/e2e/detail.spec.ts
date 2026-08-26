import { expect, test, type Page } from '@playwright/test';

/* ---- screens.md section 8, RULE TWO --------------------------------------------------------------- */

/** Every clinical field on Patient Detail, read as text, so a before/after diff can assert them. */
async function clinicalSnapshot(page: Page) {
  return {
    score: await page.locator('[aria-labelledby$="-score"] p').first().innerText(),
    readingState: await page.locator('[aria-labelledby$="-reading-state"] dl').innerText(),
    factors: await page.locator('[aria-labelledby$="-factors"]').innerText(),
    parameters: await page
      .getByRole('region', { name: 'Respiratory parameters, scrollable' })
      .innerText(),
  };
}

test('RULE TWO — Mark as reviewed changes ONLY the review state', async ({ page }) => {
  // PT-1001 is Pending review with a sufficient latest reading.
  await page.goto('/patients/PT-1001');
  await expect(page.getByRole('heading', { name: 'Pending review' })).toBeVisible();

  const before = await clinicalSnapshot(page);

  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  // The review state changed…
  await expect(page.getByRole('heading', { name: 'Reviewed' })).toBeVisible();
  // …and it says, in the one mandated literal, that nothing was saved.
  await expect(
    page.getByText('Marked locally in this session — not saved to the record'),
  ).toBeVisible();
  // "Saved" and "Persisted" stay banned while the write contract is open (G-08).
  await expect(page.getByText(/\bSaved\b|\bPersisted\b/)).toHaveCount(0);

  // …and every other clinical field is byte-identical.
  const after = await clinicalSnapshot(page);
  expect(after).toEqual(before);
});

/* ---- PD-2 / U-11 ---------------------------------------------------------------------------------- */

test('U-11 — a patient with zero readings renders the literal, no zeros and no empty panels', async ({
  page,
}) => {
  await page.goto('/patients/PT-2007');
  const body = page.locator('main');
  await expect(body).toContainText('No assessment available for this patient');
  // No score panel, no chart, no parameter table pretending to be empty.
  await expect(
    page.getByRole('region', { name: 'Respiratory parameters, scrollable' }),
  ).toHaveCount(0);
  await expect(page.getByText('score unavailable')).toHaveCount(0);
});

/* ---- PD-8 / PD-9: the sufficiency gate ------------------------------------------------------------ */

test('S-10 — an insufficient reading withholds the explanation and says the score is not reliable', async ({
  page,
}) => {
  await page.goto('/patients/PT-2001');
  await expect(
    page.getByRole('heading', { name: 'Insufficient data — risk score is not reliable' }),
  ).toBeVisible();
  // ONE region replaces BOTH PD-8 and PD-9 — S-10 mandates one heading for the pair, and an
  // earlier draft invented a second one for the references half.
  await expect(
    page.getByRole('heading', { name: 'Explanation withheld', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /Guideline references withheld/ })).toHaveCount(0);
  await expect(page.locator('main')).toContainText(
    'does not provide an explanation or guideline references',
  );
});

test('S-10 null branch — unknown sufficiency uses its OWN heading, never `insufficient`', async ({
  page,
}) => {
  await page.goto('/patients/PT-2006');
  await expect(
    page.getByRole('heading', { name: 'Data sufficiency unknown — risk score is not reliable' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Explanation withheld — data sufficiency unknown' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /Guideline references withheld/ })).toHaveCount(0);
  // Retired spellings must never appear.
  await expect(page.getByText('data sufficiency unavailable')).toHaveCount(0);
  await expect(page.getByText('unknown data')).toHaveCount(0);
});

test('S-37 — sufficient data with a null explanation is a SYSTEM statement, not S-10`s copy', async ({
  page,
}) => {
  await page.goto('/patients/PT-2012');
  await expect(page.getByRole('heading', { name: 'Explanation not supplied' })).toBeVisible();
  await expect(
    page.getByText(
      'No explanation accompanied this reading. This is not a statement that no risk factors are present.',
    ),
  ).toBeVisible();
  // It must never borrow the withheld treatment, which asserts a clinical reason.
  await expect(page.getByRole('heading', { name: /Explanation withheld/ })).toHaveCount(0);
  // And the references region escalates on its own register row rather than reusing S-37's sentence.
  await expect(page.locator('[data-clarify="G-50"]')).toBeVisible();
});

test('the score carries aria-describedby pointing at the insufficiency caveat', async ({
  page,
}) => {
  await page.goto('/patients/PT-2001');
  const score = page.locator('[aria-describedby]').first();
  const ids = ((await score.getAttribute('aria-describedby')) ?? '').split(/\s+/).filter(Boolean);
  expect(ids.length).toBeGreaterThan(0);

  // It is an ID LIST since D-24 — the insufficiency caveat AND the score-scale note. The ORDER is
  // the assertion worth making: "the risk score is not reliable" must be spoken first, never buried
  // behind a note about what scale the number is on.
  await expect(page.locator(`#${ids[0]}`)).toContainText('not reliable');
  for (const id of ids) await expect(page.locator(`#${id}`)).toHaveCount(1);
});

/* ---- PD-6 / S-38 ----------------------------------------------------------------------------------- */

test('S-38 — a null latest level makes the run-length slot unavailable, never a count', async ({
  page,
}) => {
  await page.goto('/patients/PT-2004');
  await expect(
    page.getByText(
      'Readings held at this level: unavailable. The latest reading has no risk level.',
    ),
  ).toBeVisible();
  // The retired ASCII spelling must never appear.
  await expect(page.getByText('>= ')).toHaveCount(0);
});

test('S-38 — a run that reaches the oldest supplied reading uses the ≥ glyph', async ({ page }) => {
  await page.goto('/patients/PT-2014');
  await expect(page.getByText(/≥ \d+ readings at this level/)).toBeVisible();
});

/* ---- PD-11: the drawer contract -------------------------------------------------------------------- */

test('the drawer meets its six requirements and lives in the URL', async ({ page }) => {
  await page.goto('/patients/PT-1001');
  const trigger = page.getByRole('button', { name: 'View patient context' });
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(page).toHaveURL(/drawer=context/);

  // Focus moved INTO the drawer, onto the heading, so the title is announced before the controls.
  await expect(page.getByRole('heading', { name: 'Patient context' })).toBeFocused();

  // Escape closes, and focus is restored to THE EXACT TRIGGER.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/drawer=context/);
  await expect(trigger).toBeFocused();
});

test('the drawer survives a refresh, because its state is in the URL', async ({ page }) => {
  await page.goto('/patients/PT-1001?drawer=context');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('closed means NOT IN THE DOM — never off-screen but tabbable', async ({ page }) => {
  await page.goto('/patients/PT-1001');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Patient context' })).toHaveCount(0);
});

test('S-26 — a patient with no comorbidities shows the handoff`s own literal', async ({ page }) => {
  await page.goto('/patients/PT-2015?drawer=context');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('No recorded comorbidities');
  // The section is never hidden, and the region for devices is still rendered.
  // The literal changed on 2026-08-17. Both earlier forms are retired: the long one carried spec
  // vocabulary, and the bare `Source status unavailable` it would shorten to was already retired for
  // reading as "the devices are down". The region is still never hidden.
  await expect(dialog).toContainText('Device and source status is not reported');
  await expect(dialog).not.toContainText('data contract');
  await expect(dialog).not.toContainText('Source status unavailable');
});

/* ---- PD-10 → PM: navigation and the slug gate -------------------------------------------------------- */

/* ---- units: G-01 is open, D-23 is the owner's decision to print one anyway --------------------- */

test('every parameter carries a real unit, adjacent to the value and marked as the interface’s', async ({
  page,
}) => {
  await page.goto('/patients/PT-1001');
  const table = page.getByRole('region', { name: 'Respiratory parameters, scrollable' });
  await expect(table).toBeVisible();

  // Rule 15: the unit is in the CELL, in the same nowrap element as the value — never in the column
  // header only, because rows get screen-read, copied and screenshotted in isolation.
  const rate = table.getByRole('row').filter({ hasText: 'Respiratory rate' });
  await expect(rate).toContainText('breaths/min');

  // The units are this interface's assertion, not the data's (**D-23**), so each one is reachable
  // as an open clarification. P-09 enumerates these from the DOM.
  const marked = table.locator('[data-clarify="G-01"]');
  expect(await marked.count()).toBeGreaterThan(4);

  // And it is said once in visible text, not only in an attribute.
  await expect(table).toContainText(
    'Units are supplied by this interface, not by the assessment data',
  );
});

test('FiO2 is a FRACTION on screen — never a percentage, and never rescaled', async ({ page }) => {
  // The one unit in the table that can cause harm. FiO2 arrives 0.35–0.55; `0.42 %` reads as a
  // fifth of room air. Rule 16 bans the other "fix" too — multiplying by 100 invents a scale.
  await page.goto('/patients/PT-1001');
  const row = page
    .getByRole('region', { name: 'Respiratory parameters, scrollable' })
    .getByRole('row')
    .filter({ hasText: 'FiO2' });

  const text = await row.innerText();
  expect(text).toContain('fraction (0–1)');
  expect(text, 'FiO2 must never be labelled as a percentage').not.toMatch(/\d\s*%/);
  // The delivered fractional value is still on screen, unscaled.
  expect(text).toMatch(/0\.\d+/);
});

test('Parameter Detail states the unit AND the evidence behind it', async ({ page }) => {
  // PM-4 shows one value in isolation, so it is where a provisional label is likeliest to read as
  // measured. It carries the basis a clinician needs in order to say "no, that is wrong".
  await page.goto('/patients/PT-1001/parameters/tidal-volume');
  const current = page.getByRole('region', { name: 'Current value' });
  await expect(current).toContainText('mL');
  await expect(current).toContainText('Units are supplied by this interface');
});

test('a parameter row link opens Parameter Detail for that patient and parameter', async ({
  page,
}) => {
  await page.goto('/patients/PT-1001');
  await page.getByRole('link', { name: 'Respiratory rate', exact: true }).first().click();
  await expect(page).toHaveURL(/\/patients\/PT-1001\/parameters\/respiratory-rate/);
  await expect(page.getByRole('heading', { name: 'Respiratory rate' })).toBeVisible();
});

test('U-13 — an unknown slug errors by name and NEVER falls back to the first chip', async ({
  page,
}) => {
  await page.goto('/patients/PT-1001/parameters/not-a-parameter');
  await expect(
    page.getByText('This parameter is not present in the current reading: "not-a-parameter"'),
  ).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  // The URL is unchanged: no redirect to a substitute parameter.
  await expect(page).toHaveURL(/not-a-parameter/);
});

test('U-13 — an unknown patient id errors by name, with the id in the message', async ({
  page,
}) => {
  await page.goto('/patients/NOT-A-PATIENT');
  await expect(page.getByText(/No patient matches id NOT-A-PATIENT/)).toBeVisible();
});

test('the parameter chips are LINKS, not tabs, with aria-current on exactly one', async ({
  page,
}) => {
  await page.goto('/patients/PT-1001/parameters/respiratory-rate');
  const nav = page.getByRole('navigation', { name: 'Parameters' });
  await expect(nav).toBeVisible();
  // No tab semantics anywhere.
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.locator('[aria-selected]')).toHaveCount(0);
  // Exactly one current chip, and it matches the URL slug.
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('[aria-current="page"]')).toHaveText(/Respiratory rate/);
});

test('switching chips keeps the same patient and moves aria-current', async ({ page }) => {
  await page.goto('/patients/PT-1001/parameters/respiratory-rate');
  const nav = page.getByRole('navigation', { name: 'Parameters' });
  await nav.getByRole('link', { name: 'PEEP' }).click();
  await expect(page).toHaveURL(/\/patients\/PT-1001\/parameters\/peep/);
  await expect(nav.locator('[aria-current="page"]')).toHaveText(/PEEP/);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
});

test('S-14 / PM-7 — a population-reference value shows the panel and no computed age', async ({
  page,
}) => {
  await page.goto('/patients/PT-2010');
  // Find the parameter whose badge says it was not measured on this patient.
  const badge = page.getByText('Not measured on this patient').first();
  await expect(badge).toBeVisible();
  // Its row carries no last-measured time.
  const row = badge.locator('xpath=ancestor::tr');
  await expect(row).not.toContainText('last measured');
});

/* ---- charts: the hard accessibility requirement -------------------------------------------------------- */

test('every chart ships a real data table and focusable points', async ({ page }) => {
  await page.goto('/patients/PT-1001');
  const toggle = page.locator('main button[aria-controls]').first();
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText('Show data table');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveText('Hide data table');
  await expect(page.getByRole('table').first()).toBeVisible();

  // Focusable marks with arrow-key navigation.
  const marks = page.locator('svg [role="img"][tabindex="0"]');
  await expect(marks.first()).toBeVisible(); // auto-waits; `count()` alone would race hydration
  expect(await marks.count()).toBeGreaterThan(1);
  await marks.first().focus();
  await expect(marks.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(marks.nth(1)).toBeFocused();
});

test('the chart is never labelled a trend', async ({ page }) => {
  await page.goto('/patients/PT-1001');
  const main = page.locator('main');
  await expect(main).not.toContainText(/\btrend\b(?!\s+classification)/i);
});

/* ---- the disclaimer is on all three screens ------------------------------------------------------------ */

test('S-32 — the disclaimer renders on all three screens and is never collapsed', async ({
  page,
}) => {
  for (const url of [
    '/patients',
    '/patients/PT-1001',
    '/patients/PT-1001/parameters/respiratory-rate',
  ]) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'Decision-support disclaimer' })).toBeVisible();
  }
});

test('the fixture source says so, visibly, on every screen', async ({ page }) => {
  for (const url of ['/patients', '/patients/PT-1001']) {
    await page.goto(url);
    await expect(page.getByText('Fixture data').first()).toBeVisible();
  }
});

/* ---- U-12: the patient the fixture set exists to prove it on ---------------------------------------- */

test('U-12 — a patient with colliding charttimes renders on ALL THREE screens', async ({
  page,
}) => {
  // This is the regression test for the defect that made PT-2008 a blank page: `{#each}` keyed on
  // `charttime.toISOString()`, which U-12 guarantees is not unique, and Svelte throws
  // `each_key_duplicate` in production. No route error boundary catches a RENDER failure, so there
  // was no named state at all — just an empty document (`../docs/LESSONS.md` L-057).
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/patients/PT-2008');
  await expect(page.getByRole('heading', { name: 'Patient PT-2008' })).toBeVisible();
  // The collision is SURFACED, not deduped away.
  await expect(page.locator('summary', { hasText: 'Data integrity' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '60-minute respiratory-risk history' }),
  ).toBeVisible();

  // The BOARD renders it too. There is no selected-patient panel any more (**D-22**): the card is
  // a link, so the board's job here is simply to draw the card without throwing.
  await page.goto('/patients?q=PT-2008');
  await expect(page.getByRole('link', { name: /Patient PT-2008\b/ })).toBeVisible();

  await page.goto('/patients/PT-2008/parameters/respiratory-rate');
  await expect(page.getByRole('heading', { name: 'Respiratory rate' })).toBeVisible();

  expect(errors, `page errors: ${errors.join(' | ')}`).toHaveLength(0);
});

test('the integrity warning names the collision rather than hiding it', async ({ page }) => {
  await page.goto('/patients/PT-2008');
  await page.locator('summary', { hasText: 'Data integrity' }).click();
  await expect(page.getByText(/Colliding charttime:/)).toBeVisible();
});

/* ---- route-change focus and the loading treatment --------------------------------------------------- */

test('a route change moves focus to the new page heading, never leaving it on body', async ({
  page,
}) => {
  await page.goto('/patients');
  // One click now — the card IS the link (**D-22**).
  await page.getByRole('link', { name: /Patient PT-1001\b/ }).click();
  await expect(page.getByRole('heading', { name: 'Patient PT-1001', level: 1 })).toBeFocused();
});

test('the returned-from parameter row is marked aria-current="page"', async ({ page }) => {
  await page.goto('/patients/PT-1001/parameters/peep');
  await page.getByRole('link', { name: 'Back to patient' }).click();
  await expect(page).toHaveURL(/from=peep/);
  const row = page.getByRole('row').filter({ hasText: 'PEEP' }).first();
  await expect(row.locator('[aria-current="page"]')).toHaveCount(1);
});

test('the initial document carries a named loading treatment, never a blank page', async ({
  page,
}) => {
  // With `ssr = false` the served document has no application markup. U-01 forbids that window
  // being blank — an empty page is the "looks like nothing is wrong" outcome.
  const html = await (await page.request.get('/patients')).text();
  expect(html).toContain('Loading — no assessment is being displayed yet.');
  expect(html).not.toContain('%sveltekit');
});

test('the chart marks a data-limited reading distinctly, by SHAPE not colour', async ({ page }) => {
  // PT-2001's readings are all `insufficient`, so every mark must be the square variant.
  await page.goto('/patients/PT-2001');
  const marks = page.locator('svg rect[role="img"]');
  // `toBeVisible` AUTO-WAITS; `locator.count()` does not. With `ssr = false` the chart hydrates
  // asynchronously, so counting first is a race — and a flaky assertion in a clinical suite is worse
  // than none, because it trains people to re-run rather than read.
  await expect(marks.first()).toBeVisible();
  expect(await marks.count()).toBeGreaterThan(1);
  await expect(marks.first()).toHaveAttribute('rx', '0');

  // PT-1001's are sufficient, so its marks are the rounded (circle) variant.
  await page.goto('/patients/PT-1001');
  await expect(page.locator('svg rect[role="img"]').first()).toHaveAttribute('rx', '99');
});

test('the source banner says nothing when the service is live, and shouts when it is not', async ({
  page,
}) => {
  /**
   * The live pill and its `/api` base were removed on 2026-08-17 at the product owner's request.
   * `docs/spec/data-contract.md` §4.4 rule 3 is one-directional — it requires labelling *while
   * fixtures are in use* — so the fixture warning is the whole of the rule and it is unchanged.
   *
   * This suite runs on the FIXTURE source, so the warning must be here. Its presence is now the
   * signal by itself: no banner means live.
   */
  await page.goto('/patients/PT-1001');
  await expect(page.getByText('Fixture data').first()).toBeVisible();

  // The transport path is not something a clinician can act on, and it is gone from every screen.
  await expect(page.getByText('Live assessment service')).toHaveCount(0);
  const body = await page.locator('body').innerText();
  expect(body, 'no API base path may be printed as routine chrome').not.toMatch(/^\s*\/api\s*$/m);
});

test('rule 15 — the risk score carries its unit, in the same nowrap element', async ({ page }) => {
  // The chart axis, its tooltip and its data table all carried `unit not supplied` while the one
  // number a clinician actually reads carried nothing. It is inside the value's own nowrap element
  // so the number cannot be screenshotted or read aloud without it.
  await page.goto('/patients/PT-1001');
  const hero = page.locator('[aria-labelledby$="-score"] p').first();
  // `%` since 2026-08-18 (**D-27**), declared by the product owner. It replaced the
  // `unit not supplied` marker; what did NOT change is that the score must never appear without it.
  await expect(hero).toContainText('%');

  // A REAL separator, not a CSS margin. `ms-2` looks right and reads "87.7unit not supplied" to a
  // screen reader and to anyone who copies the value into a note — the one place the unit has to
  // survive is exactly the place a margin does not reach.
  const text = (await hero.innerText()).replace(/\u00a0/g, ' ');
  // No space before the sign — percent convention — but still inside ONE nowrap element, so the
  // number cannot be read aloud, screenshotted or pasted into a note without its unit.
  expect(text).toMatch(/\d%/);
  // And not one digit moved when the unit arrived: the value is the delivered one.
  expect(text).not.toMatch(/\d{4,}/);

  const nowrapHoldsBoth = await hero.evaluate((el) =>
    [...el.querySelectorAll('span')].some(
      (s) =>
        getComputedStyle(s).whiteSpace === 'nowrap' &&
        // ONE element holding the digits AND the unit. Checked by shape rather than by the unit's
        // spelling, so the assertion outlives the next time the unit changes — it has already
        // changed twice: nothing, then `unit not supplied`, then `%`.
        /\d/.test(s.textContent ?? '') &&
        /%\s*$/.test((s.textContent ?? '').trim()),
    ),
  );
  expect(nowrapHoldsBoth, 'value and unit must share one nowrap element').toBe(true);
});

test('the 60-minute chart plots no number a reading never carried', async ({ page }) => {
  // The y-axis midpoint tick was `Math.round(((low + high) / 2) * 100) / 100` — a score-shaped value
  // no reading ever held, rounded to 2dp on an axis where every real score is verbatim, and an
  // interpolation (rule 17) that implies an interval scale nobody has declared (G-12).
  await page.goto('/patients/PT-1001');
  const chart = page.getByRole('region', { name: /60-minute respiratory-risk history/ });
  await expect(chart).toBeVisible();

  // The data table is always in the DOM but collapsed behind its own disclosure button.
  await chart.getByRole('button', { name: 'Show data table' }).click();
  // `allTextContents()`, not `allInnerTexts()`: SVG elements have no `innerText`, so the inner-text
  // form returns empty strings and the check would pass over nothing. The length guard below is what
  // caught that — a clean axis and an unread axis look identical without it (docs/LESSONS.md L-050).
  const axisLabels = await chart.locator('svg text').allTextContents();
  const plotted = (await chart.getByRole('table').innerText()).match(/\d+(\.\d+)?/g) ?? [];
  // `allInnerTexts()` can yield empty or undefined entries for decorative `<text>` nodes, so the
  // numeric labels are extracted rather than assumed — a `.trim()` on undefined is how this test
  // failed the first time, which would have read as "the axis is clean".
  const numeric = axisLabels.map((t) => (t ?? '').trim()).filter((t) => /^\d+(\.\d+)?$/.test(t));
  expect(numeric.length, 'the axis must actually carry numeric labels to check').toBeGreaterThan(1);
  for (const label of numeric) {
    expect(plotted, `axis label ${label} is not a delivered value`).toContain(label);
  }
});
