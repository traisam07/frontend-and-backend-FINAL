import { defineConfig, devices } from '@playwright/test';

/**
 * Component and interaction behaviour is asserted HERE, in a real browser, rather than in jsdom.
 *
 * That is a deliberate choice, not a convenience: focus order, `:focus-visible`, live-region timing,
 * `inert`, overlay behaviour and real scroll containers are exactly what this product's
 * accessibility contract turns on, and jsdom fakes or omits all of them — a green jsdom suite would
 * be evidence of nothing. Open question **P-03** records it.
 *
 * The suite runs against `vite preview` on a production build, so what is tested is what ships.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  /**
   * TWO PROJECTS, because the visual pass is a review tool rather than a regression suite: it
   * asserts nothing and writes PNGs outside the project, so it must not run on `pnpm test:e2e`.
   *
   * A config-level `grepInvert` would have been simpler and is WRONG: Playwright ANDs a config
   * `grepInvert` with a CLI `--grep`, so `--grep @visual` resolves to "@visual and not @visual"
   * and matches nothing. `testIgnore` is worse still — it makes the file unrunnable even by name.
   * Separate projects keep both runnable: `pnpm test:e2e` and `pnpm test:visual`.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@visual|@gated/,
    },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
      grep: /@visual/,
    },
    /**
     * THE GATED PROJECT, and it runs against `pnpm dev` rather than a preview build. Two reasons,
     * both learned the hard way:
     *
     *   1. `$env/dynamic/public` is read at REQUEST time by the dev server and resolves to empty in
     *      a `vite preview` of this SPA build, so `PUBLIC_PULSEMIND_REQUIRE_AUTH=true` simply has no
     *      effect there. The gated half of D-16 is untestable on the preview server.
     *   2. SvelteKit's route-export validation ALSO runs only in dev. A `+page.ts` exporting a
     *      helper 500s the route in `pnpm dev` and builds perfectly — 64 green e2e tests over a
     *      screen that did not load (`docs/LESSONS.md` L-068). This project is the only one that
     *      ever starts a dev server.
     */
    {
      name: 'gated',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' },
      grep: /@gated/,
      /**
       * RUN THIS PROJECT WITH `--workers=1`. The `test:e2e` script does; running
       * `playwright test --project=gated` by hand does not, and it will be flaky.
       *
       * These nine tests failed in changing combinations across runs and passed every time on a
       * single worker. A dev server accepts connections long before it has compiled a route, and
       * `pnpm build` for the chromium project starts in the same directory at the same moment, so
       * several workers arrive mid-compile. What that looks like from the outside is the gate
       * letting a signed-out request through to the board, which reads exactly like an
       * authorisation defect and is not one. Three cold runs at one worker: 9/9 each.
       *
       * `fullyParallel: false` was tried first and is not enough: it serialises within a FILE, and
       * the two gated files still ran at once. Per-project `workers` is not a Playwright option,
       * which is why this lives in the script instead of here.
       *
       * The cost is about 30 seconds on a suite that takes minutes. A suite that cries wolf about
       * the sign-in gate is worse: a gate nobody trusts stops being checked.
       */
    },
  ],
  /**
   * TWO SERVERS. The frontend, and the real sign-in service.
   *
   * `e2e/auth.spec.ts` drives an actual password + TOTP ceremony, so a mocked backend would only be
   * asserting that the mock matches the mock. The service boots an in-process MongoDB
   * (`mongodb-memory-server`) and seeds its own demo accounts, so the suite needs nothing installed
   * and leaves nothing behind.
   *
   * The CLINICAL screens still run on fixtures — `PUBLIC_PULSEMIND_DATA_SOURCE` is not set — so this
   * server exists for `/auth` alone and no test's patient data depends on it.
   */
  webServer: [
    {
      command: 'pnpm build && pnpm preview --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // The dev server, for the `gated` project only. Different port, so it never collides with a
      // developer's own `pnpm dev`.
      // `/api`, so the gated project reaches the service through the app's OWN origin — the same
      // proxy a tunnelled deployment uses. It needs no CORS entry, which also makes it immune to
      // whatever CORS allow-list happens to be configured on a service already listening on 3500
      // (a running demo, for instance, allowed only its tunnel and broke these tests).
      command:
        'PUBLIC_PULSEMIND_REQUIRE_AUTH=true PUBLIC_PULSEMIND_API_BASE=/api pnpm dev --port 5174',
      // `url`, not `port`. A dev server accepts connections long before it has compiled anything, so
      // waiting on the port releases every worker against a cold Vite: the first tests then race the
      // first compile of the root layout and the gate, and lose. That is what made
      // `the gate redirects to sign-in` fail in parallel and pass with `--workers=1`, on a run whose
      // only source change was an edit to `app.html` that invalidated the dep cache. Waiting on a
      // REAL route compiles the layout, the gate and the redirect target before any test starts.
      url: 'http://localhost:5174/patients',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command:
        'cd ../back-end && PULSEMIND_MEMORY_DB=1 PULSEMIND_SEED_ON_BOOT=1 ' +
        // The `gated` project's dev server runs on 5174, which is not in the service's own CORS
        // allow-list and should not be — that list is production configuration, not a place to
        // park a test port. `CORS_ORIGINS` is the escape hatch G-49 added for exactly this.
        'CORS_ORIGINS=http://localhost:5174,http://127.0.0.1:5174 ' +
        'PULSEMIND_SESSION_SECRET=e2e-session-secret-not-for-production ' +
        'PULSEMIND_PENDING_SECRET=e2e-pending-secret-not-for-production ' +
        'node server.js',
      // `/health` reports 503 until MongoDB is connected, so waiting on the URL rather than the port
      // means the first test cannot race the database.
      url: 'http://localhost:3500/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
