import { expect, test } from '@playwright/test';

/**
 * THE APP CHROME — what the header claims, and what the board's new structure guarantees.
 *
 * Each assertion here stands for a rule that a one-line edit could break silently:
 *
 *   a session marker rendered before anyone has signed in states something the app does not know;
 *   a preference control that reports a state it does not produce (the removed density selector);
 *   a grouped board whose groups no longer reproduce the mandated ranking order;
 *   a risk tally that does not add up to the loaded set, which means a patient is invisible.
 */

const PASSWORD = 'PulseMind-demo-2026';
test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('signed out, the header claims no session and no read-only posture', async ({ page }) => {
  await page.goto('/patients');
  const header = page.getByRole('banner');

  await expect(header.getByText('Session')).toHaveCount(0);
  await expect(header.getByText(/Read-only/i)).toHaveCount(0);
  // The G-23 unknown treatment went with it: there is no gap to mark where there is no claim.
  await expect(header.locator('[data-clarify="G-23"]')).toHaveCount(0);
  // What remains is the offer to sign in, and the clock.
  await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible();

  // The read-only posture is NOT lost — it is stated in full by the disclaimer, which is the item
  // U-18's no-hiding list actually names, and it is still on the clinical screen.
  await expect(page.getByRole('heading', { name: 'Decision-support disclaimer' })).toBeVisible();
  await expect(page.getByText(/PulseMind supports clinical review/)).toBeVisible();
});

test('signed in, the header names who is there through the avatar alone', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('viewer');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  const header = page.getByRole('banner');
  const menu = header.getByRole('button', { name: /^Account menu/ });

  /**
   * THE AVATAR IS THE WHOLE CONTROL. There is no inline `Session — name — role` beside it: it was
   * repeating what the panel already says. Nothing is lost to assistive technology, and this is the
   * assertion that keeps that true — the button's accessible name still carries the person AND their
   * role, so a screen reader announces both without opening anything.
   */
  await expect(menu).toHaveAccessibleName(/Ward Display, Read-only account/);
  await expect(header.getByText('Session', { exact: true })).toHaveCount(0);
  await expect(header.getByText('Read-only account', { exact: true })).toHaveCount(0);

  // Both are stated in full inside the panel, along with the two actions.
  await expect(page.getByRole('link', { name: 'Account & security' })).toHaveCount(0);
  await menu.click();
  const panel = page.getByRole('group', { name: 'Account' });
  await expect(panel.getByText('Signed in as')).toBeVisible();
  await expect(panel.getByText('Ward Display', { exact: true })).toBeVisible();
  await expect(panel.getByText('Read-only account', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Account & security' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sign out/ })).toBeVisible();
});

test('appearance lives in the account menu, not in the toolbar', async ({ page }) => {
  /**
   * The toolbar had a theme switch AND the account menu had an Appearance control — the same setting
   * in two shapes. The menu keeps it, beside text size and weight, because they are one subject:
   * "how this screen is set". The toolbar keeps none of them.
   *
   * `/login` is the exception and renders the switch itself: it has no header and no account menu,
   * and it is where a signed-out clinician sets the theme at all.
   */
  await page.goto('/patients');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(
    page.getByRole('banner').getByRole('switch', { name: 'Dark theme' }),
    'the toolbar must carry no theme switch',
  ).toHaveCount(0);

  // Signed out there is no account menu either, so the board offers no appearance control at all.
  await expect(page.getByRole('button', { name: /^Account menu/ })).toHaveCount(0);

  // The sign-in screen still has one, and it works.
  await page.goto('/login');
  const toggle = page.getByRole('switch', { name: 'Dark theme' });
  await expect(toggle).toBeVisible();
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await toggle.click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after);

  // Signed in, appearance is in the menu — and it is a 44px target at the narrowest tier.
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);
  await page.setViewportSize({ width: 320, height: 720 });
  const menu = page.getByRole('button', { name: /^Account menu/ });
  const box = await menu.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  await menu.click();
  await expect(
    page.getByRole('group', { name: 'Account' }).getByRole('radiogroup', { name: 'Appearance' }),
  ).toBeVisible();

  // Density is gone — control, attribute and all. It selected nothing.
  await expect(page.getByLabel(/density/i)).toHaveCount(0);
  await expect(page.locator('select')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.density)).toBeUndefined();
});

test('the board groups by review block WITHOUT changing the ranked order', async ({ page }) => {
  await page.goto('/patients');
  // Wait for the board itself before reading headings. Without this the assertion can run against a
  // page holding only the tally's `h3`, which passes alone and fails inside the suite — the same
  // measure-too-early flake as L-070, and the third time in this file.
  await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

  // The three group headings, in the ranking's own order: pending first, unknown second (it ranks
  // above Reviewed and is excluded from the Needs review filter — the deliberate G-09 asymmetry),
  // Reviewed last.
  // Filtered in JS rather than with `hasText`: the tally's heading is an `h3` too, and reading them
  // all and picking is clearer than a locator predicate that silently matches nothing.
  const allHeadings = await page.locator('h3').allInnerTexts();
  const groupHeadings = allHeadings.filter((h) =>
    /^(Pending review|Review status unavailable|Reviewed)\b/.test(h),
  );
  expect(groupHeadings.length).toBeGreaterThan(1);
  expect(groupHeadings[0]?.startsWith('Pending review')).toBe(true);

  // The decisive assertion: reading every card top to bottom must still yield the ranked order, so
  // the headings sit on boundaries the comparator already had rather than creating new ones.
  const cards = await page.getByRole('link', { name: /Patient PT-/ }).allInnerTexts();
  const reviewOf = (text: string) =>
    text.includes('Pending review') ? 0 : text.includes('Review status unavailable') ? 1 : 2;
  const ranks = cards.map(reviewOf);
  expect(ranks, 'review blocks must not interleave').toEqual([...ranks].sort((a, b) => a - b));

  // The rank number runs 1…N down the page, across group boundaries.
  expect(cards[0]?.trim().startsWith('1')).toBe(true);
});

test('every group heading carries a count, and the counts sum to the visible board', async ({
  page,
}) => {
  await page.goto('/patients');

  await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

  // BOTH numbers read in ONE evaluate. Reading them as two separate Playwright calls compares the
  // page at two different moments, and a board still settling makes the sum look wrong — it passed
  // alone and failed inside the suite, which is the signature of that race and not of a real defect.
  const { cards, summed } = await page.evaluate(() => {
    // Scoped to the review-block sections. `button[aria-pressed]` alone is no longer "a patient
    // card": the risk tally's cells are toggles too, and counting those inflated the total by five.
    const cardCount = document.querySelectorAll(
      'section[aria-labelledby^="pm-group-"] li > a',
    ).length;
    const counts = Array.from(document.querySelectorAll('h3 span.rounded-pill')).map((n) =>
      Number(n.textContent?.trim() ?? '0'),
    );
    return { cards: cardCount, summed: counts.reduce((a, b) => a + b, 0) };
  });
  expect(summed, 'group counts must account for every visible patient').toBe(cards);
});

test('the risk tally accounts for every loaded patient, including the unknown band', async ({
  page,
}) => {
  await page.goto('/patients');

  const tally = page.getByRole('region', { name: /Risk levels across all/ });
  await expect(tally).toBeVisible();

  // Five cells, always — `Risk level unavailable` is a cell with a zero, not an omission, because a
  // band that appears only when it is non-zero cannot be trusted when it is absent.
  const cells = tally.getByRole('listitem');
  await expect(cells).toHaveCount(5);
  for (const band of ['Critical', 'High', 'Medium', 'Low', 'Risk level unavailable']) {
    await expect(tally.getByText(band, { exact: true })).toBeVisible();
  }

  // `innerText` returns the RENDERED text, and this heading is `uppercase` in CSS — so the match
  // has to be case-insensitive or it reads "RISK LEVELS ACROSS ALL 30…" and finds nothing.
  const heading = await tally.locator('h3').innerText();
  const loaded = Number(/across all (\d+)/i.exec(heading)?.[1] ?? '0');
  expect(loaded).toBeGreaterThan(0);

  const numbers = await cells.evaluateAll((nodes) =>
    nodes.map((n) => Number(n.querySelector('span:last-child')?.textContent?.trim() ?? '0')),
  );
  expect(
    numbers.reduce((a, b) => a + b, 0),
    'a patient missing from the tally is a patient the unit cannot see',
  ).toBe(loaded);

  // Counted across the FULL loaded set, never the filtered view (F-12) — filtering must not move it.
  await page.goto('/patients?filter=needs-review');
  const filteredHeading = await page
    .getByRole('region', { name: /Risk levels across all/ })
    .locator('h3')
    .innerText();
  expect(filteredHeading).toBe(heading);
});

test('the account menu folds identity and its actions behind one avatar on a phone', async ({
  page,
}) => {
  // `clinician` (password only), NOT a two-factor account. This test is about the menu, and a TOTP
  // code is single-use — a third test sharing `oncall`'s code inside one 30-second step would have
  // one of them correctly refused as a replay, which is the rule L-065 already recorded and which
  // this test broke the first time it was written.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  const menu = page.getByRole('button', { name: /^Account menu/ });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');

  // Closed means NOT IN THE DOM, never off-screen but tabbable — the same rule the drawer keeps.
  await expect(page.getByRole('link', { name: 'Account & security' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Sign out/ })).toHaveCount(0);

  // The avatar carries the person and the role in its accessible name; the visible initials carry
  // neither, so a screen-reader user must not be left with two letters.
  await expect(menu).toHaveAccessibleName(/Dr A\. Clinician, Clinician/);

  // 44x44 at the narrowest tier this app supports.
  await page.setViewportSize({ width: 320, height: 720 });
  const box = await menu.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);

  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');

  // Scoped to the named panel. The inline copy of the identity is still in the DOM at this width
  // (hidden by CSS, not removed), so an unscoped text match resolves to two elements — and the one
  // that matters is the one a phone user can actually reach.
  const panel = page.getByRole('group', { name: 'Account' });
  await expect(panel).toBeVisible();
  // Below `md` this panel is the ONLY place the role appears, so it has to be in there.
  await expect(panel.getByText('Signed in as')).toBeVisible();
  await expect(panel.getByText('Clinician', { exact: true })).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Account & security' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Sign out/ })).toBeVisible();
});

test('the account menu closes on Escape and on an outside click, and gives focus back', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  const menu = page.getByRole('button', { name: /^Account menu/ });

  await menu.click();
  await expect(page.getByRole('link', { name: 'Account & security' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Account & security' })).toHaveCount(0);
  // Focus RETURNS to the trigger. Without this a keyboard user is dropped at the top of the
  // document every time they open and dismiss the menu.
  await expect(menu).toBeFocused();

  await menu.click();
  await expect(page.getByRole('link', { name: 'Account & security' })).toBeVisible();
  // A click on the page behind it dismisses it — and does not also select a patient, because the
  // outside-click listener runs on the capture phase before the board sees the event.
  await page.getByRole('heading', { name: 'Patient overview' }).click();
  await expect(page.getByRole('link', { name: 'Account & security' })).toHaveCount(0);
});

/** The board's patient cards, excluding the risk tally's toggles — both carry `aria-pressed`. */
function cards(page: import('@playwright/test').Page) {
  return page.getByRole('link', { name: /Patient PT-/ });
}

function band(page: import('@playwright/test').Page, name: string) {
  return page.getByRole('button', { name: new RegExp(`^${name}`) });
}

test('selecting a risk band filters the board and says so in the URL', async ({ page }) => {
  await page.goto('/patients');
  await expect(cards(page).first()).toBeVisible();
  const all = await cards(page).count();

  const critical = band(page, 'Critical');
  await expect(critical).toHaveAttribute('aria-pressed', 'false');
  await critical.click();

  // The URL carries it, so a refresh, a deep link and Back all reconstruct the same view.
  await expect(page).toHaveURL(/risk=Critical/);
  await expect(critical).toHaveAttribute('aria-pressed', 'true');

  const filtered = await cards(page).count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(all);
  // Every remaining card really is that band — the filter is not just a label.
  for (const text of await cards(page).allInnerTexts()) {
    expect(text).toContain('Critical');
  }

  // Toggling the active band clears it, rather than needing a separate "all" control.
  await critical.click();
  await expect(page).not.toHaveURL(/risk=/);
  await expect(cards(page)).toHaveCount(all);
});

test('the tally keeps counting the WHOLE loaded set while a band is selected', async ({ page }) => {
  await page.goto('/patients');
  await expect(cards(page).first()).toBeVisible();

  const tally = page.getByRole('region', { name: /Risk levels across all/ });
  const before = await tally.getByRole('listitem').allInnerTexts();

  await band(page, 'Low').click();
  await expect(page).toHaveURL(/risk=Low/);

  // Unchanged. A tally that narrowed to its own selection would show zero in every other band and
  // leave no way back to them — the control would erase its own options.
  expect(await tally.getByRole('listitem').allInnerTexts()).toEqual(before);
});

test('the risk band composes with the review filter rather than replacing it', async ({ page }) => {
  await page.goto('/patients?filter=needs-review&risk=Critical');
  await expect(cards(page).first()).toBeVisible();

  await expect(page.getByRole('radio', { name: /Needs review/ })).toBeChecked();
  await expect(band(page, 'Critical')).toHaveAttribute('aria-pressed', 'true');

  // Both conditions hold on every card, which is the whole point of keeping the two dimensions
  // apart instead of making the band a fourth value of `?filter=`.
  for (const text of await cards(page).allInnerTexts()) {
    expect(text).toContain('Pending review');
    expect(text).toContain('Critical');
  }
});

test('an unrecognised ?risk= shows every band AND says the link was wrong', async ({ page }) => {
  await page.goto('/patients?risk=Catastrophic');
  await expect(cards(page).first()).toBeVisible();

  // U-20's shape for the second parameter: never silently treated as "no filter".
  await expect(page.getByText('Unrecognised risk level — showing all risk levels')).toBeVisible();
  await expect(band(page, 'Critical')).toHaveAttribute('aria-pressed', 'false');
});

test('a band that filters everything out explains BOTH reasons and can be cleared', async ({
  page,
}) => {
  // `Low` + a query that matches only Critical patients: a genuinely empty result.
  await page.goto('/patients?q=PT-1001&risk=Low');

  // The S-19 literal is intact, word for word, with the risk stated in its own adjacent sentence
  // rather than spliced into it.
  await expect(page.getByText('No patients match "PT-1001" with the All filter.')).toBeVisible();
  await expect(page.getByText(/The risk level filter is also active/)).toBeVisible();
  await expect(page.getByText('Low', { exact: true }).last()).toBeVisible();

  // One action clears every dimension, because they are all "filter" to the person reading it.
  await page.getByRole('button', { name: 'Clear search and filter' }).click();
  await expect(page).not.toHaveURL(/risk=|q=/);
  await expect(cards(page).first()).toBeVisible();
});

test('every display setting changes something real, and is remembered', async ({ page }) => {
  /**
   * L-069 in test form. A density control once shipped with a typed union, a storage key, an
   * attribute on `<html>` and two `<select>`s — and no stylesheet rule behind any of it, so
   * choosing a density changed nothing a clinician could see. Each assertion below measures the
   * THING the control claims to change, not the attribute it writes.
   */
  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  const panel = page.getByRole('group', { name: 'Account' });
  const trigger = page.getByRole('button', { name: /^Account menu/ });

  /**
   * Idempotent about opening. The panel stays open after a choice — a settings group that closed on
   * every click would make changing two of three settings three round trips — so clicking the
   * trigger again would TOGGLE it shut. Open only when it is not already open.
   */
  const choose = async (group: string, option: string) => {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
    await panel.getByRole('radiogroup', { name: group }).getByText(option, { exact: true }).click();
  };
  const measure = () =>
    page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      return {
        root: parseFloat(getComputedStyle(document.documentElement).fontSize),
        theme: document.documentElement.dataset.theme,
        headingWeight: parseInt(getComputedStyle(h1).fontWeight, 10),
        headingSize: parseFloat(getComputedStyle(h1).fontSize),
      };
    });

  const before = await measure();
  expect(before.root).toBe(16);
  expect(before.theme).toBe('light');

  // APPEARANCE is the only display setting since 2026-08-20. Text size and text weight were removed
  // at the product owner's instruction (**D-34**); the assertion below that no OTHER control is in
  // the group is what stops one reappearing without a decision behind it.
  await choose('Appearance', 'Dark');
  expect((await measure()).theme).toBe('dark');

  const groups = await panel
    .getByRole('radiogroup')
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20)),
    );
  expect(groups, 'the Display group holds exactly one control').toEqual(['Appearance']);

  const chosen = await measure();

  // It survives a reload, and it is applied BEFORE first paint. A theme that landed after hydration
  // would flash the light palette on a darkened ward workstation.
  await page.reload();
  await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();
  expect(await measure(), 'the display setting must survive a reload').toEqual(chosen);
});

/*
 * REMOVED 2026-08-20 with the controls they covered (**D-34**):
 *   - "the text-size options never go below the default"
 *   - "the weight ladder keeps its steps at both weight settings"
 *
 * The weight ladder itself still exists as four fixed steps in `app.css`; what is gone is the
 * setting that shifted it. The reflow protection those tests sat beside did NOT go away: it moved
 * to `e2e/responsive.spec.ts`, which now drives a larger BROWSER text size instead of the app's own
 * control, because that is the mechanism a user still has.
 */

test('the account menu paints above the board’s sticky search bar', async ({ page }) => {
  /**
   * A regression test for a stacking bug that was invisible until the panel got tall enough to reach
   * the bar. The menu is a CHILD of the header, and a child cannot escape its parent's stacking
   * context however high its own z-index is — so with the header below the sticky bar, half the
   * display settings were painted behind a blurred translucent strip and could not be clicked.
   *
   * Asserted by hit-testing rather than by reading z-index values, because what matters is what the
   * user's pointer actually lands on.
   */
  await page.setViewportSize({ width: 1100, height: 950 });
  await page.goto('/login');
  await page.getByLabel('Username').fill('clinician');
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patients/);

  await page.getByRole('button', { name: /^Account menu/ }).click();
  const panel = page.getByRole('group', { name: 'Account' });
  await expect(panel).toBeVisible();

  // The panel must overlap the bar for this to be testing anything.
  const overlaps = await page.evaluate(() => {
    const p = document
      .querySelector('[role="group"][aria-label="Account"]')!
      .getBoundingClientRect();
    const bar = document
      .querySelector('section[aria-label="Search and filter"]')!
      .getBoundingClientRect();
    return p.bottom > bar.top && p.top < bar.bottom;
  });
  expect(overlaps, 'the panel must reach the sticky bar for this assertion to mean anything').toBe(
    true,
  );

  const topmost = await page.evaluate(() => {
    const p = document
      .querySelector('[role="group"][aria-label="Account"]')!
      .getBoundingClientRect();
    const bar = document
      .querySelector('section[aria-label="Search and filter"]')!
      .getBoundingClientRect();
    // A point inside the panel AND inside the bar's band.
    const y = Math.min(p.bottom, bar.bottom) - 4;
    const hit = document.elementFromPoint(p.left + p.width / 2, y);
    return hit?.closest('[role="group"][aria-label="Account"]') ? 'panel' : 'something else';
  });
  expect(topmost, 'the sticky bar must not paint over the account menu').toBe('panel');

  // And the control down there is actually clickable, not just visible.
  await panel.getByRole('radiogroup', { name: 'Appearance' }).getByText('Dark').click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});

test('every state chip is a solid fill whose label clears 4.5:1, with ONE ink across the four risk bands, in BOTH themes', async ({
  page,
}) => {
  /**
   * The chips were tints; they are fills now, so the type sits ON the colour and its legibility is a
   * property of the pair rather than of the surface behind it. This computes the WCAG ratio from what
   * the browser actually painted, in both themes, rather than trusting the token comments.
   *
   * IT ALSO PINS THE INK, and the contract it pins REVERSED on 2026-08-18. It used to require WHITE
   * type on every band (**D-21**). The product owner asked for Critical and High to stop looking
   * alike, and white type was the cause: at 4.5:1 it caps every band near L 0.575, leaving four
   * bands inside a lightness range of 0.095 with nothing to differ by but hue — which is precisely
   * what a red-green dichromat cannot see. The bands now carry ONE shared dark ink and light fills,
   * the ramp's worst pair went from ΔE2000 1.2 to 18.3, and the ledger says PASS for the first time
   * since the type was made white (**D-26**).
   */
  for (const theme of ['light', 'dark'] as const) {
    await page.addInitScript((t) => localStorage.setItem('pm-theme', t), theme);
    await page.goto('/patients');
    await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

    const measured = await page.evaluate(() => {
      /**
       * Resolve through a CANVAS, not by parsing the string. `getComputedStyle` hands back
       * `oklch(...)` here — the browser keeps the author's colour space — so a regex that assumes
       * `rgb()` reads the oklch components as if they were 0-255 channels. It reported every chip at
       * exactly 1:1, which is what a wrong unit looks like rather than a real finding. Painting the
       * colour and reading the pixel gives the sRGB bytes the screen actually shows.
       */
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      const toRgb = (css: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0]!, d[1]!, d[2]!, d[3]!];
      };
      const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const luminance = (css: string) => {
        const [r, g, b] = toRgb(css);
        return 0.2126 * channel(r! / 255) + 0.7152 * channel(g! / 255) + 0.0722 * channel(b! / 255);
      };
      const ratio = (a: string, b: string) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
      };

      const out: { name: string; ratio: number; filled: boolean; ink: string }[] = [];
      const record = (name: string, el: Element) => {
        const cs = getComputedStyle(el);
        out.push({
          name,
          ratio: ratio(cs.backgroundColor, cs.color),
          // A tint would be translucent or transparent; a fill is opaque.
          filled: toRgb(cs.backgroundColor)[3] === 255,
          // The painted ink, as sRGB bytes — comparable across chips so "one ink" is checkable.
          ink: toRgb(cs.color).slice(0, 3).join(','),
        });
      };

      document
        .querySelectorAll('section[aria-labelledby="pm-tally-heading"] button')
        .forEach((b) => record((b.textContent || '').trim().split(/\s+/).slice(0, 3).join(' '), b));

      // By the CLASS that carries the fill, not by walking up from the text: the chip's structure is
      // its own business, and a parent-walk breaks the moment a wrapper is added.
      const pending = document.querySelector('[class*="bg-review-pending-solid"]');
      if (pending) record('Pending review', pending);

      return out;
    });

    expect(measured.length, `chips found in ${theme}`).toBeGreaterThan(4);

    for (const chip of measured) {
      expect(chip.filled, `${chip.name} must be a solid fill in ${theme}`).toBe(true);
      expect(chip.ratio, `${chip.name} type on its own fill in ${theme}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }

    // ONE INK ACROSS THE FOUR RISK BANDS, in both themes — the consistency the product owner asked
    // for (**D-26**).
    //
    // Scoped to the four NAMED bands on purpose. Two other chips sit in the same tally and must NOT
    // be dragged into the rule: `Pending review` belongs to the review family, and
    // `Risk level unavailable` belongs to the insufficient family. Keeping their own ink is what
    // stops "unknown" reading as a fifth severity between Low and Medium, so the assertion below
    // requires the unavailable cell to DIFFER rather than conform.
    const BANDS = ['Critical', 'High', 'Medium', 'Low'];
    const bands = measured.filter((c) => BANDS.includes(c.name.split(/\s+/)[0] ?? ''));
    expect(bands.length, `risk band chips found in ${theme}`).toBe(4);
    expect(
      [...new Set(bands.map((c) => c.ink))],
      `the four risk bands must share one label colour in ${theme}, not one per band`,
    ).toHaveLength(1);

    const unknown = measured.find((c) => c.name.startsWith('Risk level'));
    if (unknown) {
      expect(
        unknown.ink,
        'the unavailable cell must not borrow the bands’ ink — it is not a fifth severity',
      ).not.toBe(bands[0]?.ink);
    }
  }
});

test('every risk chip still names its band in full, which is what a dichromat reads', async ({
  page,
}) => {
  /**
   * THIS IS THE ASSERTION THAT MAKES THE COLOUR DECISION SURVIVABLE.
   *
   * The chip fills carry white type on vivid colours (**D-21**), and the price was measured: High
   * and Medium are 1.2 ΔE apart under deuteranopia — the same colour to roughly one man in twelve.
   * Colour was always the SECONDARY channel here; the word and the glyph are the primary one. So the
   * word must be present, complete, and never abbreviated, on every chip and at every width.
   */
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/patients');
    await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

    const tally = page.getByRole('region', { name: /Risk levels across all/ });
    for (const band of ['Critical', 'High', 'Medium', 'Low', 'Risk level unavailable']) {
      await expect(tally.getByText(band, { exact: true }), `${band} at ${width}px`).toBeVisible();
    }

    // Every chip carries a glyph beside the word — the second non-colour channel.
    const glyphs = await tally.locator('svg[aria-hidden="true"]').count();
    expect(glyphs, `glyphs at ${width}px`).toBeGreaterThanOrEqual(5);

    // And no label is clipped, which would put a dichromat back on colour alone.
    const clipped = await tally.evaluate((el) =>
      [...el.querySelectorAll('span')]
        .filter((s) => s.childElementCount === 0 && s.scrollWidth > s.clientWidth + 1)
        .map((s) => s.textContent),
    );
    expect(clipped, `clipped band labels at ${width}px`).toEqual([]);
  }
});

/**
 * THE BRAND MARKS — asserted by MEASURING what the browser paints, never by reading CSS.
 *
 * `Logo.svelte` and `PulseLoader.svelte` each hold two or three images and let CSS reveal exactly
 * one. That arrangement has a specific failure mode, and it shipped once before these tests existed:
 * `.pm-logo img` is specificity (0,1,1) and `.pm-logo-light` is (0,1,0), so a `display: block` on the
 * element-qualified rule silently outranked the `display: none` on the class one and EVERY image
 * stayed visible. Nothing threw, the type checker was clean, and the only symptom was the 320px
 * reflow test failing for a reason that read like a layout problem.
 *
 * `docs/LESSONS.md` L-073 is the same lesson from the z-index incident: assert the OUTCOME the user
 * gets, not the declarations that were supposed to produce it. So these count visible boxes.
 */

/** How many of a selector's matches are actually laid out. `display: none` has no box. */
const visibleCount = async (page: import('@playwright/test').Page, selector: string) =>
  page
    .locator(selector)
    .evaluateAll(
      (els) => els.filter((el) => (el as HTMLElement).getClientRects().length > 0).length,
    );

test('one wordmark is painted, and the theme changes its COLOURS rather than its file', async ({
  page,
}) => {
  await page.goto('/patients');
  await page.setViewportSize({ width: 1280, height: 900 });

  // One inlined SVG, not a pair of `<img>` swapped by theme (**D-32**). Two paths inside it carry
  // the two roles the artwork separates: the PULSE/MIND letters, and the E + ECG + curve.
  const svg = page.locator('header .pm-logo-word svg');
  await expect(svg).toHaveCount(1);
  await expect(svg).toBeVisible();
  expect(await visibleCount(page, 'header .pm-logo-mark')).toBe(0);

  const fills = async () =>
    svg.locator('path').evaluateAll((els) => els.map((el) => getComputedStyle(el).fill));

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const light = await fills();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const dark = await fills();

  expect(light).toHaveLength(2);
  expect(dark).toHaveLength(2);

  // The supplied light artwork is ONE colour: letters and accent are both the brand crimson. That
  // is the fact the light theme has to reproduce, and it is why the two roles are allowed to be
  // equal here and required to differ below.
  expect(light[0]).toBe(light[1]);

  // The dark artwork separates them — light-grey letters, brighter red accent. If a custom property
  // ever fails to reach the inlined SVG (the exact failure mode `<img src>` would have had, since
  // the page's variables do not cascade into an external document), both roles collapse back to the
  // file's own fallback and this is what notices.
  expect(dark[0]).not.toBe(dark[1]);
  expect(dark[0]).not.toBe(light[0]);
});

test('a 320px phone gets the compact mark and no wordmark at all', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/patients');

  // The wordmark is 5.6:1. At a 26px height that is ~147px of a 320px row, which is what pushed the
  // header onto a second line and cost 42% of the viewport to chrome the first time (L-074).
  expect(await visibleCount(page, 'header .pm-logo img')).toBe(0);
  await expect(page.locator('header .pm-logo-mark')).toBeVisible();
});

test('reduced motion swaps the loading mark to a still frame instead of animating at the reader', async ({
  browser,
}) => {
  // A GIF ignores every motion preference — no CSS property and no attribute pauses one — so the
  // ONLY correct implementation is a second file, and the only honest test is that the moving file
  // is not painted (L-082).
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/patients');

  const moving = page.locator('.pm-loader-moving, #pm-boot-moving');
  const still = page.locator('.pm-loader-still, #pm-boot-still');
  // Both marks live in the DOM at boot; assert on the ones that exist rather than requiring one.
  if ((await still.count()) > 0) {
    expect(await visibleCount(page, '.pm-loader-moving, #pm-boot-moving')).toBe(0);
    await expect(moving.first()).toBeHidden();
  }
  await context.close();
});

/**
 * THE BOARD ROW'S CHIPS — reported by the product owner on 2026-08-19, both by eye, both real.
 *
 * Neither was catchable by any check this project had: the type check was clean, 196 unit tests and
 * 114 e2e tests were green, and nothing overflowed the page, so the reflow suite stayed quiet too.
 * A mandated clinical literal was painting over another mandated clinical literal inside one row,
 * and three chips in that row were rendering at two different sizes. `docs/LESSONS.md` L-053 is the
 * standing lesson — look at the pixels — and these two assertions are that lesson made mechanical.
 */

test('the data-sufficiency chip never paints over its neighbours', async ({ page }) => {
  await page.goto('/patients');

  // `data sufficiency unknown` is S-10's `null` branch and cannot be abbreviated (`ui-states.md`
  // section 4). It measured 199px inside an 80px column, held on one line by a `whitespace-nowrap`,
  // and covered `readings at this level` in the next column by 109x23px.
  const chip = page
    .locator('a [data-clarify="G-31"]')
    .filter({ hasText: 'data sufficiency unknown' })
    .first();
  await expect(chip).toBeVisible();

  const worst = await chip.evaluate((inner) => {
    const el = inner.parentElement as HTMLElement;
    const row = el.closest('a') as HTMLElement;
    let cell: HTMLElement = el;
    while (cell.parentElement && getComputedStyle(cell.parentElement).display !== 'grid') {
      cell = cell.parentElement;
    }
    const c = cell.getBoundingClientRect();
    let area = 0;
    for (const n of Array.from(row.querySelectorAll('*'))) {
      const r = n.getBoundingClientRect();
      if (r.width < 3 || r.height < 3 || !n.textContent?.trim()) continue;
      if (cell.contains(n) || n.contains(cell)) continue;
      const ox = Math.min(c.right, r.right) - Math.max(c.left, r.left);
      const oy = Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top);
      if (ox > 1 && oy > 1) area = Math.max(area, ox * oy);
    }
    return area;
  });

  expect(worst).toBe(0);
});

test('the three state chips in a row are one size', async ({ page }) => {
  await page.goto('/patients');
  await page.setViewportSize({ width: 1400, height: 1000 });

  // Until 2026-08-19 the risk chip was 16px while review and sufficiency were 14px, because only the
  // risk chip had been lifted to the clinical-value floor. The score read as shouted. They are
  // levelled UP rather than down: `app.css` calls 16px the floor for a clinical value, and a risk
  // score is one — lowering it to match would put a clinical value below the floor.
  const sizes = await page.evaluate(() => {
    const inner = Array.from(document.querySelectorAll('[data-clarify="G-31"]')).find(
      (s) => s.textContent?.trim() === 'data sufficiency unknown' && s.closest('a'),
    );
    const row = inner?.closest('a');
    if (!row) return null;
    const size = (sel: string) => {
      const el = row.querySelector(sel);
      return el ? getComputedStyle(el).fontSize : null;
    };
    return {
      risk: size('[class*="bg-risk-"]'),
      review: size('[class*="border-l-review"]'),
      sufficiency: getComputedStyle(inner!.parentElement as HTMLElement).fontSize,
    };
  });

  expect(sizes).not.toBeNull();
  expect(sizes!.risk).toBe('16px');
  expect(sizes!.review).toBe(sizes!.risk);
  expect(sizes!.sufficiency).toBe(sizes!.risk);
});

test('the patient identifier is never truncated on the board', async ({ page }) => {
  await page.goto('/patients');
  await page.setViewportSize({ width: 1400, height: 1000 });

  // Reported by the product owner on 2026-08-19: the column rendered `Patient PT-1...`. A truncated
  // identifier is a safety defect rather than a layout compromise — PT-1001 and PT-1004 render
  // identically, and the id is the one thing on the row that says WHICH patient it is. The word
  // `Patient` moved to screen-reader-only text, which is what made the id itself fit.
  const clipped = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('a')).filter((a) =>
      /\/patients\/PT-/.test(a.getAttribute('href') ?? ''),
    );
    const bad: string[] = [];
    for (const row of rows.slice(0, 12)) {
      const id = Array.from(row.querySelectorAll('span')).find((n) =>
        /^PT-\d+$/.test(n.textContent?.trim() ?? ''),
      );
      // No element rendering the id may be scrolling its own text out of view.
      if (!id) bad.push(`${row.getAttribute('href')}: no id element`);
      else if (id.scrollWidth > id.clientWidth + 1)
        bad.push(`${id.textContent?.trim()} is clipped`);
    }
    return bad;
  });

  expect(clipped).toEqual([]);
});
