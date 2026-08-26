import { expect, test, type Page } from '@playwright/test';

/**
 * A larger BROWSER text setting.
 *
 * These reflow tests used to drive the app's own text-size control. That control was removed on
 * 2026-08-20 (**D-34**), and the concern behind the tests did not go with it: a user who sets a
 * larger default font size in the browser, or uses the OS text-scaling setting, scales every `rem`
 * in this app exactly the way the removed control did. `docs/LESSONS.md` L-074 is about whether the
 * LAYOUT survives that, so only the driver moved.
 */
const ROOT_SIZE = { default: '100%', large: '112.5%', larger: '125%' } as const;

const withTextScale = (page: import('@playwright/test').Page, size: keyof typeof ROOT_SIZE) =>
  page.addInitScript((value) => {
    const set = () => {
      // `documentElement` is null this early on the very first init pass. Guarded, because an
      // uncaught throw here aborts the REST of this init script, and the listener below is what
      // actually applies the scale. The first version of this helper threw on that line, registered
      // nothing, and left every text-scale test silently running at 100%.
      if (document.documentElement) document.documentElement.style.fontSize = value;
    };
    document.addEventListener('DOMContentLoaded', set);
    set();
  }, ROOT_SIZE[size]);

/**
 * STATE U-18 made testable.
 *
 * The row says: "Harness-defined desktop-first clinical layout; **nothing clinically load-bearing is
 * hidden** at any width", and it forbids "collapsing risk level, review status, data-limited badges,
 * units, timestamps, provenance badges, or the disclaimer out of view".
 *
 * A responsive layout is exactly the kind of change that breaks that quietly — a `hidden md:block`
 * is one character away from hiding a risk band — so every item on that list is asserted at the
 * NARROWEST tier, where the temptation to hide something is strongest.
 *
 * WCAG 1.4.10 (Reflow) is asserted alongside it: no page may scroll sideways at 320px.
 */

const TIERS = [
  { name: 'small phone', width: 320, height: 720 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1512, height: 1000 },
] as const;

const SCREENS = [
  ['overview', '/patients?selected=PT-1001'],
  ['detail', '/patients/PT-1001'],
  ['insufficient', '/patients/PT-2001'],
  ['parameter', '/patients/PT-1001/parameters/respiratory-rate'],
] as const;

/**
 * SC 1.4.10 asks whether the USER has to scroll sideways to read the page, and that is two distinct
 * questions. `documentElement.scrollWidth` answers neither on its own: it counts content that a
 * legitimate inner scroll container has already clipped, so a parameter table doing exactly what
 * clinical-a11y section 5 requires — scrolling inside its own region — reads as a page-level
 * overflow that is not there.
 *
 * So both halves are measured directly:
 *   `pageScrollsSideways` — try to scroll the window and see whether it moved.
 *   `unclippedOverflow`   — find elements past the viewport edge that NO ancestor clips, which is
 *                            content genuinely cut off with no way to reach it.
 */
async function pageScrollsSideways(page: Page) {
  return page.evaluate(() => {
    window.scrollTo(200, 0);
    const moved = window.scrollX;
    window.scrollTo(0, 0);
    return moved > 1;
  });
}

async function unclippedOverflow(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const clipped = (el: Element) => {
      let n = el.parentElement;
      while (n && n !== document.body) {
        const o = getComputedStyle(n).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
        n = n.parentElement;
      }
      return false;
    };
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1 && !clipped(el)) {
        offenders.push(
          `${el.tagName}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`,
        );
      }
    });
    return offenders;
  });
}

for (const tier of TIERS) {
  test(`SC 1.4.10 — no page scrolls sideways at ${tier.width}px (${tier.name})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: tier.width, height: tier.height });
    for (const [name, url] of SCREENS) {
      await page.goto(url);
      await page.waitForTimeout(400);
      expect(await pageScrollsSideways(page), `${name} at ${tier.width}px scrolls sideways`).toBe(
        false,
      );
      expect(
        await unclippedOverflow(page),
        `${name} at ${tier.width}px has content past the edge that nothing clips`,
      ).toEqual([]);
    }
  });
}

test('U-18 — the board hides nothing clinically load-bearing at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/patients?selected=PT-1001');
  const main = page.locator('main');

  // Risk level and score, as words and numbers rather than an abbreviation.
  await expect(main.getByText('Critical', { exact: false }).first()).toBeVisible();
  // Review status.
  await expect(main.getByText('Pending review').first()).toBeVisible();
  // The data-limited badge, on the patient that has one.
  await page.goto('/patients?q=PT-2001');
  await expect(page.getByText('Data-limited').first()).toBeVisible();
  // A timestamp, absolute and labelled.
  await expect(page.getByText(/Assessed as of \d{2}:\d{2} local/).first()).toBeVisible();
  // The disclaimer — never collapsed, never behind a disclosure.
  await expect(page.getByRole('heading', { name: 'Decision-support disclaimer' })).toBeVisible();
  await expect(page.getByText(/PulseMind supports clinical review/)).toBeVisible();
});

test('U-18 — Patient Detail hides nothing clinically load-bearing at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/patients/PT-1001');

  // The score, its band, and a unit beside every value — rule 15 holds at the narrowest tier too.
  await expect(
    page.getByRole('heading', { name: /Current respiratory-risk score/i }),
  ).toBeVisible();
  // The score's own unit is `%` since 2026-08-18 (**D-27**). It used to be the `unit not supplied`
  // marker, and this assertion is about the unit being PRESENT at 320px, not about which one it is.
  await expect(page.locator('[aria-labelledby$="-score"]').getByText('%').first()).toBeVisible();
  // And a parameter carries its own, from the units table (**D-23**).
  await expect(page.getByText('breaths/min').first()).toBeVisible();
  // Provenance badges survive — the table scrolls sideways rather than dropping columns.
  await expect(page.getByText('Measured').first()).toBeVisible();
  // The review panel and its action.
  await expect(page.getByRole('button', { name: 'Mark as reviewed' })).toBeVisible();
  // The disclaimer.
  await expect(page.getByRole('heading', { name: 'Decision-support disclaimer' })).toBeVisible();
});

test('the parameter table stays a TABLE at 320px — it never becomes cards', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/patients/PT-1001');

  // clinical-a11y section 5: "On the narrowest tier the table does NOT become cards. The column
  // relationships (value <-> source <-> age) are the clinical content."
  const table = page.getByRole('table').last();
  await expect(table).toBeVisible();
  await expect(table.locator('th[scope="col"]')).toHaveCount(5);
  await expect(table.locator('th[scope="row"]').first()).toBeVisible();

  // And it scrolls inside its OWN named region rather than pushing the page sideways.
  const region = page.getByRole('region', { name: 'Respiratory parameters, scrollable' });
  await expect(region).toBeVisible();
  const scrollable = await region.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrollable, 'the table region should scroll horizontally at 320px').toBe(true);
  // …and the PAGE still does not.
  expect(await pageScrollsSideways(page)).toBe(false);
  expect(await unclippedOverflow(page)).toEqual([]);
});

test('the board’s right column carries the review history at every width', async ({ page }) => {
  // The mobile selection bar went with selection itself (**D-22**): the card opens the patient, so
  // there is nothing to select and nothing to raise a bar for.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/patients');
  await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

  await expect(page.getByRole('region', { name: 'Review history' })).toBeVisible();

  // And nothing fixed covers the end of the list any more.
  const fixedBars = await page.evaluate(
    () =>
      [...document.querySelectorAll('div')].filter((el) => {
        const box = el.getBoundingClientRect();
        return (
          getComputedStyle(el).position === 'fixed' &&
          box.height > 0 &&
          box.bottom >= window.innerHeight - 2
        );
      }).length,
  );
  expect(fixedBars, 'no fixed bottom bar should remain').toBe(0);
});
test('the drawer is a full-screen sheet on a phone, with the same dialog contract', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/patients/PT-1001');
  const trigger = page.getByRole('button', { name: 'View patient context' });
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  // Full width at this tier — a sheet, never a 480px panel hanging off the side.
  const box = await dialog.boundingBox();
  expect(box?.width).toBeGreaterThan(380);
  // Same contract: focus in, Escape out, focus restored.
  await expect(page.getByRole('heading', { name: 'Patient context' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('every primary clinical action clears the 44x44 target floor on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/patients/PT-1001');

  for (const name of ['Mark as reviewed', 'View patient context']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box?.height, `${name} height`).toBeGreaterThanOrEqual(44);
  }
  const back = await page.getByRole('link', { name: 'Back to overview' }).boundingBox();
  expect(back?.height).toBeGreaterThanOrEqual(44);
});

test('the sticky search bar sits flush against the header at every width', async ({ page }) => {
  /**
   * This is a regression test for a defect that shipped. The bar was pinned with a hard-coded
   * `top-[5.25rem]` measured against a header that had TWO rows. The header later lost its second
   * row, the number stayed, and the bar stuck 11–27px below it depending on width — a gap that
   * scrolled patient cards slid through, between two bars meant to be flush. Nothing failed and no
   * test noticed.
   *
   * The fix measures instead of guessing (`$lib/actions/measure`), and this asserts the two agree.
   */
  /**
   * `lg` AND UP ONLY — 1280px in this project, whose breakpoints are redefined to its own tiers in
   * `app.css` (xs 380 / sm 640 / md 1024 / lg 1280 / xl 1728).
   *
   * THE THRESHOLD MOVED FROM `md` TO `lg` ON 2026-08-18, when the risk tally joined the bar. With
   * two controls the bar was ~64px at 1024 and pinning it was free. With three it is 210px there,
   * because the tally wraps below the other two — and 210px stuck to the top is 23% of a 900px
   * tablet permanently under chrome, the failure `docs/LESSONS.md` L-074 measured. So below `lg` the
   * bar scrolls away and flushness is not a question that applies.
   *
   * Getting the width wrong is easy and this assertion catches it twice over: written against
   * Tailwind's default 768 it failed at 834px with `top: NaN`, and left at 1024 after the tally
   * moved it failed the same way — both times because the bar is CORRECTLY static there.
   */
  for (const width of [1280, 1512]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/patients');
    await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

    const { headerHeight, stickyTop, published } = await page.evaluate(() => {
      const header = document.querySelector('header')!.getBoundingClientRect().height;
      const bar = document.querySelector('section[aria-label="Search and filter"]')!;
      return {
        headerHeight: header,
        stickyTop: parseFloat(getComputedStyle(bar).top),
        published: getComputedStyle(document.documentElement).getPropertyValue('--pm-header-h'),
      };
    });

    expect(published.trim(), `--pm-header-h must be published at ${width}px`).not.toBe('');
    expect(
      Math.abs(stickyTop - headerHeight),
      `the bar must stick flush against the header at ${width}px (header ${headerHeight}, top ${stickyTop})`,
    ).toBeLessThanOrEqual(1);
  }
});

test('the sticky bar bleeds to both edges, and everything else shares one gutter', async ({
  page,
}) => {
  /**
   * The bar's full-width background was pulled out with `-mx-3` while its container padded with
   * `px-4`, so it stopped 4px short of each edge: neither aligned nor full-bleed, just visibly off.
   * The negative margin has to cancel the container's OWN padding, at every breakpoint it defines.
   */
  for (const width of [320, 390, 834, 1512]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/patients');
    await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

    const m = await page.evaluate((vw) => {
      const box = (sel: string) => {
        const b = document.querySelector(sel)!.getBoundingClientRect();
        return { left: Math.round(b.left), right: Math.round(vw - b.right) };
      };
      return {
        bar: box('section[aria-label="Search and filter"]'),
        heading: box('h1'),
        tally: box('#pm-tally-heading'),
        searchLabel: box('section[aria-label="Search and filter"] label'),
      };
    }, width);

    expect(m.bar, `the bar must reach both edges at ${width}px`).toEqual({ left: 0, right: 0 });
    // The things the eye lines up down the left share ONE gutter.
    expect(m.searchLabel.left, `search gutter at ${width}px`).toBe(m.heading.left);

    // The risk tally joined the control bar on 2026-08-18, so it only sits on the page gutter while
    // the bar is STACKED. Once the three controls share a row it is the third of them and starts
    // wherever the second ends — asserting the gutter there would be asserting the old layout.
    if (width < 1024) {
      expect(m.tally.left, `tally gutter at ${width}px`).toBe(m.heading.left);
    } else {
      expect(m.tally.left, `the tally must be IN the row at ${width}px`).toBeGreaterThan(
        m.searchLabel.left,
      );
    }
  }
});

test('the overview keeps one vertical rhythm: 24 between sections, 12 between blocks, 8 to a label', async ({
  page,
}) => {
  for (const width of [390, 1512]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/patients');
    await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

    const gaps = await page.evaluate(() => {
      const gap = (a: string, b: string) =>
        Math.round(
          document.querySelector(b)!.getBoundingClientRect().top -
            document.querySelector(a)!.getBoundingClientRect().bottom,
        );
      return {
        // The tally moved INTO the control bar on 2026-08-18, so the old summary-grid -> tally ->
        // bar staircase no longer exists. What the scale still governs, and what this asserts, is
        // the outer gap between two sections and the inner gap from a label to what it labels.
        sections: gap(
          'section[aria-labelledby="pm-summary-heading"]',
          'section[aria-label="Search and filter"]',
        ),
        label: gap('#pm-tally-heading', 'section[aria-labelledby="pm-tally-heading"] ul'),
      };
    });

    // One scale, and the SAME at every width — two different outer gaps made the step between levels
    // almost invisible on the tier where the screen is most crowded.
    expect(gaps, `rhythm at ${width}px`).toEqual({ sections: 24, label: 8 });
  }
});

test('320px still reflows correctly at the largest text size', async ({ page }) => {
  /**
   * A larger browser text size scales the ROOT, so every rem in the app grows with it, and the tier
   * where that first breaks is the narrowest one. It DID break: at 320px with 125%, the header
   * overflowed by 45px because the sign-in link carried `shrink-0` and the row could not wrap.
   * A text setting that makes a clinical screen scroll sideways is not an accessibility feature.
   */
  await withTextScale(page, 'larger');
  await page.setViewportSize({ width: 320, height: 780 });

  for (const [name, url] of [...SCREENS, ['login', '/login'] as const]) {
    await page.goto(url);
    await page.waitForTimeout(500);

    // L-050, and not hypothetical here: the first version of `withTextScale` threw before it
    // registered its listener, so every screen below ran at 100% and this whole test passed while
    // proving nothing. A no-sideways-scroll assertion is trivially true at the default size, so the
    // scale has to be asserted, not assumed.
    expect(
      await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)),
      `the 125% text scale did not apply on ${name}`,
    ).toBeCloseTo(20, 1);

    expect(
      await pageScrollsSideways(page),
      `${name} at 320px / largest text scrolls sideways`,
    ).toBe(false);
    expect(
      await unclippedOverflow(page),
      `${name} at 320px / largest text has content past the edge`,
    ).toEqual([]);
  }

  // …and the setting really was in force for that whole run.
  expect(
    await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)),
  ).toBeGreaterThan(16);
});

test('enlarging the text does not turn a phone screen into chrome', async ({ page }) => {
  /**
   * The user-visible complaint this stands for: at the largest text scale on a phone the app "broke".
   * Measured, it was four separate defects — the header wrapped to two and three rows, the sticky
   * search bar grew to 224px and followed the board down, the fixed selection bar covered the end of
   * the list, and the summary cards stayed in two columns 169px wide. Together, 42% of an 844px
   * viewport was permanently chrome before a single patient appeared.
   */
  for (const size of ['default', 'large', 'larger'] as const) {
    for (const width of [320, 390] as const) {
      await withTextScale(page, size);
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/patients?selected=PT-1001');
      await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();

      const m = await page.evaluate(() => {
        const header = document.querySelector('header')!;
        const bar = document.querySelector('section[aria-label="Search and filter"]')!;
        /**
         * "Did the header wrap" is a question about ROWS, and both obvious ways to ask it are wrong:
         * a pixel threshold is wrong at some text size (every length here scales with the setting),
         * and comparing children's `top` values is wrong because `items-center` gives differently
         * sized children different tops on the SAME row. So compare the row's height against its
         * tallest child: one row is about as tall as its tallest item, a wrapped one is a multiple.
         */
        const row = header.querySelector('div > div')!;
        const rowHeight = row.getBoundingClientRect().height;
        const tallestChild = Math.max(
          ...[...row.children].map((c) => c.getBoundingClientRect().height),
        );
        return {
          rowRatio: rowHeight / tallestChild,
          barSticky: getComputedStyle(bar).position === 'sticky',
        };
      });

      // The board's search bar does NOT stick on a phone — it is 180-224px of permanently occupied
      // viewport there, and scrolling back to it costs one gesture.
      expect(m.barSticky, `search bar must not be sticky at ${width}px / ${size}`).toBe(false);

      // The header stays a SINGLE row at every phone width and every text size. 1.5x leaves room
      // for padding and line-height without admitting a second row, which would be ~2x.
      expect(
        m.rowRatio,
        `header wrapped at ${width}px / ${size} (row is ${m.rowRatio.toFixed(2)}x its tallest child)`,
      ).toBeLessThan(1.5);

      // Nothing fixed overlays the end of the list any more — the selection bar went with
      // selection itself (**D-22**), so the page simply ends where it ends.
      const fixedOverlays = await page.evaluate(
        () =>
          [...document.querySelectorAll('div')].filter((el) => {
            const box = el.getBoundingClientRect();
            return (
              getComputedStyle(el).position === 'fixed' &&
              box.height > 0 &&
              box.bottom >= window.innerHeight - 2
            );
          }).length,
      );
      expect(fixedOverlays, `fixed bottom overlay at ${width}px / ${size}`).toBe(0);
    }
  }
});

test('the summary cards drop to one column when the text is too large for two', async ({
  page,
}) => {
  /**
   * The column count follows the TEXT SIZE, not the viewport width, so the track minimum is a `rem`
   * value inside `minmax()` where it scales with the root. A `min-width` media query cannot do this:
   * `rem` inside one resolves against the browser's INITIAL font size and ignores a later root size.
   */
  const columns = async (size: string, width: number) => {
    await withTextScale(page, size);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/patients');
    await expect(page.getByRole('link', { name: /Patient PT-/ }).first()).toBeVisible();
    return page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector('section[aria-labelledby="pm-summary-heading"] > div.grid')!,
        ).gridTemplateColumns.split(' ').length,
    );
  };

  // A 390px phone fits two cards at the default size and only one at the largest — without a
  // breakpoint naming either.
  expect(await columns('default', 390)).toBe(2);
  expect(await columns('larger', 390)).toBe(1);
  // The narrowest phone is one column either way, and the desktop keeps its four.
  expect(await columns('default', 320)).toBe(1);
  expect(await columns('default', 1440)).toBe(4);
});

test('the parameter chips share rows evenly instead of one per row at larger text', async ({
  page,
}) => {
  /**
   * As a wrapping flex row, eight chips with labels like `Minute ventilation` fell to ONE per row at
   * the largest text setting — each sized to its own text, so a third of the width sat empty and the
   * nav ate 45% of a phone viewport, pushing the parameter's own card off the screen.
   *
   * The chips must never be shortened: the labels are the parameter names. So the fix is the track
   * minimum, not the text.
   */
  for (const size of ['default', 'larger'] as const) {
    for (const width of [320, 390] as const) {
      await withTextScale(page, size);
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/patients/PT-1001/parameters/respiratory-rate');
      await expect(page.getByRole('navigation', { name: 'Parameters' })).toBeVisible();

      const m = await page.evaluate(() => {
        const list = document.querySelector('nav[aria-label="Parameters"] ul')!;
        const chips = [...list.querySelectorAll('a')];
        return {
          columns: getComputedStyle(list).gridTemplateColumns.split(' ').length,
          heightShare: list.getBoundingClientRect().height / window.innerHeight,
          // Chips fill their track, so a row of them is a row of equal targets.
          widths: new Set(chips.map((a) => Math.round(a.getBoundingClientRect().width))).size,
          clipped: chips.filter((a) => a.scrollWidth > a.clientWidth + 1).map((a) => a.textContent),
          shortest: Math.min(...chips.map((a) => a.getBoundingClientRect().height)),
        };
      });

      expect(m.columns, `chips fell to one per row at ${width}px / ${size}`).toBeGreaterThan(1);
      expect(
        m.heightShare,
        `the parameter nav takes ${Math.round(m.heightShare * 100)}% of the viewport at ${width}px / ${size}`,
      ).toBeLessThan(0.4);
      // No label is ever cut: these are the parameter names, and rule 8 bans abbreviating them.
      expect(m.clipped, `clipped parameter labels at ${width}px / ${size}`).toEqual([]);
      expect(m.shortest, `chip target floor at ${width}px / ${size}`).toBeGreaterThanOrEqual(44);
    }
  }
});

/**
 * The filter control must show all three options at every width, and must not spill past the board.
 *
 * Reported by the product owner on 2026-08-19. The control was a segmented row inside an
 * `overflow-x: auto` wrapper, and at 390px the three options measured 361px inside a 358px box, so
 * the group was clipped mid-border with `Data-limited` running off the right edge and nothing to
 * indicate it could be scrolled to. `Data-limited` is the filter that finds the patients whose risk
 * score is not reliable, so an option a clinician cannot see is the wrong option to hide.
 *
 * It wraps now. Both halves are asserted, because either one alone can be satisfied wrongly: a
 * control that fits by CLIPPING passes the overflow check, and a control that shows every label by
 * spilling past the board passes the visibility check.
 */
for (const width of [320, 360, 390, 414, 768, 1024, 1400]) {
  test(`the board filter shows every option inside its container at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/patients');
    // Wait for the board, do not sample for it. Without this the evaluate below can run before the
    // board has rendered and returns null, which fails as "the three filter options were not found"
    // at whichever width happens to be slowest that run. (The filter is a `<fieldset>` with a
    // screen-reader-only `<legend>`, so its role is `group`, not `radiogroup`.)
    await expect(page.getByRole('link', { name: /PT-/ }).first()).toBeVisible();

    const m = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label')).filter((l) =>
        /^(All|Needs review|Data-limited)\b/.test(l.textContent?.trim() ?? ''),
      );
      const group = labels[0]?.closest('fieldset');
      if (!group || labels.length !== 3) return null;
      const g = group.getBoundingClientRect();
      const parent = (group.parentElement as HTMLElement).getBoundingClientRect();
      return {
        pastParent: Math.round(g.right - parent.right),
        clippedGroup: group.scrollWidth - group.clientWidth,
        // Every label fully inside the group's own box, and none with its text scrolled away.
        outside: labels
          .filter((l) => l.getBoundingClientRect().right > g.right + 1)
          .map((l) => l.textContent?.trim()),
        clippedLabels: labels
          .filter((l) => l.scrollWidth > l.clientWidth + 1)
          .map((l) => l.textContent?.trim()),
      };
    });

    expect(m, 'the three filter options were not found').not.toBeNull();
    expect(
      m!.pastParent,
      `the filter group spills past the board at ${width}px`,
    ).toBeLessThanOrEqual(0);
    expect(m!.clippedGroup, `the filter group is clipped at ${width}px`).toBe(0);
    expect(m!.outside, `filter options outside the group at ${width}px`).toEqual([]);
    expect(m!.clippedLabels, `filter labels with cut text at ${width}px`).toEqual([]);
  });
}
