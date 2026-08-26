import { test } from '@playwright/test';

/**
 * The visual-review pass. It asserts nothing — it exists so a human looks at the pixels before a
 * screen is called finished, which is how two user-visible defects were found that a clean type
 * check and 37 green e2e tests had missed (`../docs/LESSONS.md` L-053).
 *
 * Tagged `@visual` and run by `pnpm test:visual`, never by `pnpm test:e2e`.
 *
 * THREE WIDTHS, because U-18 forbids hiding anything clinically load-bearing at any width, and the
 * only way to know is to look at the narrowest one.
 */
const OUT =
  '/private/tmp/claude-501/-Users-henry-Desktop-pulsemind/0ea4979f-c716-4eee-b1e0-c05792b6c680/scratchpad/shots';

const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1512, height: 1000 },
] as const;

const SCREENS = [
  { name: 'overview', url: '/patients?selected=PT-1001' },
  { name: 'detail', url: '/patients/PT-1001' },
  { name: 'insufficient', url: '/patients/PT-2001' },
  { name: 'drawer', url: '/patients/PT-1001?drawer=context' },
  { name: 'parameter', url: '/patients/PT-1001/parameters/respiratory-rate' },
  { name: 'error', url: '/patients/PT-1001/parameters/nope' },
] as const;

for (const theme of ['light', 'dark'] as const) {
  for (const size of WIDTHS) {
    for (const screen of SCREENS) {
      test(`${size.name} ${theme} ${screen.name} @visual`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.addInitScript((t) => localStorage.setItem('pm-theme', t), theme);
        await page.goto(screen.url);
        await page.waitForTimeout(900);
        await page.screenshot({
          path: `${OUT}/${size.name}-${theme}-${screen.name}.png`,
          fullPage: true,
        });
      });
    }
  }
}
