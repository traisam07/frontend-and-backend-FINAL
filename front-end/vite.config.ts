// CANONICAL DECLARATION of vite.config.ts — `.claude/skills/bootstrap/SKILL.md` section 3.
// `.claude/skills/tailwind-design-system/SKILL.md` section 1.1 carries the plugin-order line as a
// marked EXCERPT and declares nothing. Build config, not an application module.
/**
 * `adapter-static`, not `adapter-auto`, and it is the difference between a build and a deployable.
 *
 * `adapter-auto` picks an adapter from the host it detects. On any machine that is not one of the
 * handful it recognises it detects nothing, prints `Could not detect a supported production
 * environment`, exits 0, and emits NOTHING to deploy. `pnpm build` looked like it worked for months
 * and produced no `build/` directory; the gap only shows when someone tries to ship it.
 *
 * The SPA posture is P-01's recorded decision and this config is what implements it: every screen is
 * authenticated per-patient PHI, so prerendering is categorically forbidden and SSR buys nothing.
 * `src/routes/+layout.ts` already sets `ssr = false` and `prerender = false`; `fallback` is the other
 * half, and without it a deep link to `/patients/PT-1001` is a 404 from the static host rather than a
 * route the client router resolves.
 */
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
// `vitest/config` re-exports Vite's `defineConfig` with the `test` key typed. Importing it from
// `vite` instead is the "'test' does not exist in type 'UserConfigExport'" error.
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * A one-line ambient declaration instead of `@types/node`.
 *
 * This project's `tsconfig` deliberately carries no Node types: it is a browser application, and
 * pulling them in to configure a build would put `process`, `Buffer` and `__dirname` in scope for
 * every component in `src/`. Declaring the single member this file reads keeps that boundary intact
 * and still type-checks.
 */
declare const process: { env: Record<string, string | undefined> };

/**
 * Where `/api` forwards to. Defaults to the service's own default port; the demo runs the backend on
 * a DIFFERENT port so that a running demo can never be mistaken for — or collide with — the fresh
 * backend the test suite starts. That isolation is not cosmetic: the sign-in throttle is in-process,
 * so a long-lived shared backend accumulates failed-attempt counters across suite runs and starts
 * locking out the very tests that assert the failure paths (`docs/LESSONS.md` L-072).
 */
const API_TARGET = process.env.PULSEMIND_PROXY_TARGET ?? 'http://localhost:3500';

export default defineConfig({
  // tailwindcss() MUST come before sveltekit(). Reversing them is the v3-habit failure the design
  // system skill calls out: the Svelte plugin would process component styles before Tailwind has
  // registered its transform, and custom `@theme` utilities silently stop resolving.
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Runes mode is not optional in this project — CLAUDE.md section 5 rule 1.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
      adapter: adapter({
        // `build/`, so the deployable artifact is one directory with an obvious name.
        pages: 'build',
        assets: 'build',
        // THE SPA FALLBACK. Every route is client-resolved, so the host must serve this file for any
        // path it has no file for. Without it `/patients/PT-1001` 404s on refresh and on a deep link
        // from a handover message, which is the one navigation a clinician is most likely to use.
        fallback: 'index.html',
        precompress: false,
        strict: false,
      }),
    }),
  ],
  // Vite refuses requests whose Host header it does not recognise, which is the correct default and
  // which also blocks every tunnel. These two entries let a Cloudflare Quick Tunnel reach the dev
  // and preview servers for a demo. They are hostname allow-lists, not an auth mechanism: a tunnelled
  // PulseMind is serving PHI-shaped data over a public URL with no authentication behind it
  // (**G-45**, **G-23**), so it is for demonstration with fixture data and never for real patients.
  //
  // THE `/api` PROXY IS A SECURITY FIX, NOT A CONVENIENCE, and it was written after a real failure.
  //
  // With the UI on one hostname and the service on another, the session cookie is THIRD-PARTY.
  // Safari blocks those by default, Firefox's Total Cookie Protection does the same, and Chrome is
  // moving the same way — so `POST /auth/login` returned 200, the browser silently dropped the
  // `Set-Cookie`, the very next `GET /auth/session` came back anonymous, and the gate bounced the
  // clinician back to the sign-in screen they had just completed. Correct password, no error, no
  // way in. Reproduced in WebKit; invisible in Chromium (`docs/LESSONS.md` L-071, **G-52**).
  //
  // Proxying the service under the app's OWN origin makes the cookie first-party, which is the fix
  // rather than a workaround: it also removes the CORS preflight and the `SameSite=None; Secure`
  // requirement entirely. Set `PUBLIC_PULSEMIND_API_BASE=/api` and both the clinical transport and
  // the auth transport go through here.
  //
  // The target is always LOCAL: this proxy exists so the browser talks to one origin, and the hop
  // from the dev server to the service never leaves the machine.
  //
  // `changeOrigin: false` on purpose: the backend's CORS allow-list and WebAuthn origin checks
  // should keep seeing the real browser origin rather than a rewritten one.
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // STRIP `Origin` ON THE WAY THROUGH. The browser sends it on every non-GET request even when
        // the request is same-origin, so forwarding it makes the service run a CORS check on a
        // request that is no longer cross-origin — and refuse it with "Not allowed by CORS" unless
        // its allow-list happens to name the app's host. That re-imposes exactly what this proxy
        // exists to remove.
        //
        // Safe here, and not by luck: a cross-site page still cannot READ a response from `/api`
        // (this server sends no CORS headers of its own), and it cannot ride the session on a
        // cross-site POST either, because the cookie is `SameSite=Lax`. WebAuthn is unaffected —
        // its origin check reads `clientDataJSON`, which the browser signs, not this header.
        configure: (proxy) => {
          // Vite types `configure` against a `ProxyServer` shape that omits the EventEmitter surface
          // in this version, so the emitter is named explicitly. A narrow structural type rather
          // than `any`: this asserts the two members actually used and nothing else.
          const emitter = proxy as unknown as {
            on(
              event: 'proxyReq',
              listener: (proxyReq: { removeHeader(name: string): void }) => void,
            ): void;
          };
          emitter.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
  preview: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // STRIP `Origin` ON THE WAY THROUGH. The browser sends it on every non-GET request even when
        // the request is same-origin, so forwarding it makes the service run a CORS check on a
        // request that is no longer cross-origin — and refuse it with "Not allowed by CORS" unless
        // its allow-list happens to name the app's host. That re-imposes exactly what this proxy
        // exists to remove.
        //
        // Safe here, and not by luck: a cross-site page still cannot READ a response from `/api`
        // (this server sends no CORS headers of its own), and it cannot ride the session on a
        // cross-site POST either, because the cookie is `SameSite=Lax`. WebAuthn is unaffected —
        // its origin check reads `clientDataJSON`, which the browser signs, not this header.
        configure: (proxy) => {
          // Vite types `configure` against a `ProxyServer` shape that omits the EventEmitter surface
          // in this version, so the emitter is named explicitly. A narrow structural type rather
          // than `any`: this asserts the two members actually used and nothing else.
          const emitter = proxy as unknown as {
            on(
              event: 'proxyReq',
              listener: (proxyReq: { removeHeader(name: string): void }) => void,
            ): void;
          };
          emitter.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
  test: {
    // Unit tests run in `node`, over the effect-free domain and data modules. Ranking, filtering,
    // windowing, run counting, validation and provenance classification are all pure functions and
    // are tested there directly, never through DOM queries.
    //
    // There is deliberately NO jsdom component project. Focus order, `:focus-visible`, live-region
    // timing, `inert`, and overlay behaviour are exactly what this product's accessibility contract
    // turns on, and jsdom fakes or omits all five — a green jsdom suite would be evidence of
    // nothing. Component and interaction behaviour is asserted in a real browser by Playwright
    // (`pnpm test:e2e`). Open question **P-03** records the choice.
    name: 'unit',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
