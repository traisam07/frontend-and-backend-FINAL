<!-- src/routes/login/+page.svelte
     SIGN IN.

     Three ways in, in the order a clinician should meet them:

       1. A PASSKEY, offered first and only when the browser can actually do it. It is the strongest
          factor and the fastest — one prompt, no code, nothing to type on a shared ward terminal.
       2. A PASSWORD, which may then demand a one-time CODE. The code step is a separate screen state
          with its own heading, not a field that appears under the password — a form that grows while
          you are reading it loses people.
       3. Nothing else. There is no "remember me", no social sign-in, and no self-service
          registration: accounts are provisioned server-side (**G-54**).

     WHAT THIS SCREEN NEVER SHOWS: a patient, a risk band, a score, a count. It renders before anyone
     is known, so anything clinical here would be visible to whoever reached the URL. `e2e/auth.spec.ts`
     asserts it — that assertion is also what lets the error styling borrow the risk-critical family
     without the two meanings ever colliding (see `control-classes.ts`).

     Harness-defined, pending design confirmation: the whole layout, the copy, and the ordering above.
     The handoff describes no sign-in at all (**D-16**). -->
<script lang="ts">
  import { goto, invalidate } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import TextField from '$lib/components/TextField.svelte';
  import FormAlert from '$lib/components/FormAlert.svelte';
  import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import {
    authApiBase,
    login,
    loginWithPasskey,
    fetchSession,
    passkeysSupported,
    submitTotp,
    type AuthFailure,
  } from '$lib/auth/client';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type Step = 'credentials' | 'second_factor';

  let step = $state<Step>('credentials');
  let username = $state('');
  let password = $state('');
  let code = $state('');
  let pendingToken = $state('');
  let busy = $state(false);
  let failure = $state<AuthFailure | null>(null);
  let passkeyBusy = $state(false);

  // Read once, in the browser, at component init. Not `$derived`: it never changes for the life of
  // the page, and a derived value would re-run the capability probe on every keystroke.
  const canUsePasskeys = passkeysSupported();

  /** The one place a completed sign-in lands, so the three routes into it cannot diverge. */
  async function finish() {
    /**
     * READ THE TARGET FIRST. `invalidate` re-runs this page's own load, and that load redirects as
     * soon as the session is valid and the gate is on — which replaces `data` out from under this
     * function. Reading `data.next` afterwards yielded `undefined` and navigated to `/undefined`,
     * a 404, after a sign-in that had actually succeeded.
     *
     * It only reproduced with `PUBLIC_PULSEMIND_REQUIRE_AUTH=true`, because with the gate off the
     * load does not redirect and `data` survives. `e2e/auth-gated.spec.ts` is the project that
     * exercises that half.
     */
    const target = data.next;

    // The root layout holds the session. Invalidating it re-runs that load, so the header shows the
    // signed-in user immediately — without this the app would navigate to a board still convinced
    // nobody is signed in.
    await invalidate('pulsemind:session');

    /**
     * DID THE SESSION ACTUALLY STICK? Asked explicitly, because the answer can be no even after the
     * service returned 200.
     *
     * The session is an httpOnly cookie. When the app and the service are on different registrable
     * domains that cookie is third-party, and Safari refuses it by default, as does Firefox's Total
     * Cookie Protection. The observed failure: correct password, `POST /auth/login` -> 200, cookie
     * silently dropped, the next `GET /auth/session` anonymous, and the gate redirects the clinician
     * straight back to the sign-in screen they had just completed — with NO message at all. Someone
     * typing the right password and being returned to the login form learns nothing about why.
     *
     * A silent bounce is exactly the anonymous state CLAUDE.md rule 13 forbids, so it gets a name.
     * The cause is fixed at the root by serving the service under this app's own origin (the
     * `/api` proxy in `vite.config.ts`); this check is what happens when a deployment has not done
     * that. See **G-52** and `docs/LESSONS.md` L-071.
     */
    const stored = await fetchSession();
    if (!stored.authenticated) {
      failure = {
        code: 'SESSION_NOT_STORED',
        message: 'Your sign-in was accepted, but this browser did not keep it.',
      };
      return;
    }
    // `target` is ALREADY a resolved, same-origin absolute path: `safeNext()` in `+page.ts`
    // rejects anything that is not one, and calls `resolve()` itself for the default. Resolving it
    // again here would prepend a configured base path twice.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    await goto(target, { replaceState: true });
  }

  async function submitCredentials(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    failure = null;

    const result = await login(username, password);
    busy = false;

    if (!result.ok) {
      failure = result.error;
      return;
    }
    if (result.value.step === 'second_factor') {
      pendingToken = result.value.pendingToken;
      password = ''; // Not needed again, and not worth keeping in memory behind the next screen.
      step = 'second_factor';
      return;
    }
    await finish();
  }

  async function submitCode(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    failure = null;

    const result = await submitTotp(pendingToken, code);
    busy = false;

    if (!result.ok) {
      failure = result.error;
      code = '';
      return;
    }
    await finish();
  }

  async function usePasskey() {
    if (passkeyBusy) return;
    passkeyBusy = true;
    failure = null;

    // The username is passed when it has been typed and left out when it has not. Leaving it out is
    // the usernameless path: the authenticator offers whatever it holds for this site.
    const result = await loginWithPasskey(username.trim() || undefined);
    passkeyBusy = false;

    if (!result.ok) {
      failure = result.error;
      return;
    }
    await finish();
  }

  function restart() {
    step = 'credentials';
    pendingToken = '';
    code = '';
    failure = null;
  }
</script>

<svelte:head>
  <title>Sign in — PulseMind</title>
</svelte:head>

<!-- The theme switch, and nothing else, because this screen renders no header. It sits at the top
     of the column rather than floating over the viewport: a fixed-position control would overlap the
     card at 320px, and the one thing this page cannot afford is chrome on top of the form. -->
<div class="mx-auto flex w-full max-w-[26rem] flex-col gap-5 py-2 sm:py-8">
  <div class="flex justify-end">
    <ThemeSwitch />
  </div>

  <div class="flex flex-col gap-2 text-center">
    <!-- THE BRANDMARK, not a generic pulse glyph in a tinted box. This is the first screen anyone
         sees and the only one with no header, so it is where the product should identify itself.

         `responsive={false}`: the header hides the wordmark below `sm` because it shares a row with
         the clock, the read-only badge and the account control (L-074). This card shares its width
         with nothing, so the wordmark shows at every width.

         `aria-hidden` inside the component, and the `<h1>` below already reads `Sign in to
         PulseMind` — so the name is announced once, by the heading, where it belongs. -->
    <Logo height={30} responsive={false} class="mx-auto" />
    <h1 class="text-xl font-semibold tracking-tight text-fg">Sign in to PulseMind</h1>
    <p class="text-sm text-fg-secondary">
      {#if step === 'credentials'}
        Respiratory-risk decision support for the adult ventilated unit.
      {:else}
        Second step for <span class="font-semibold text-fg">{username}</span>.
      {/if}
    </p>
  </div>

  {#if failure}
    <!-- One alert region for the submit result. Field-level messages live on their fields. -->
    <FormAlert tone="error" title={failure.message}>
      {#if failure.code === 'SESSION_NOT_STORED'}
        <!-- The one failure the user cannot fix by retrying, so retrying is not what it suggests.
             The remedy is a deployment change or a browser setting, and saying which is the whole
             point of naming it. -->
        <p>
          The sign-in service is at a different address from this page, so the browser treats its
          session cookie as third-party and blocks it. Safari and Firefox do this by default.
        </p>
        <p class="mt-1.5">
          Serve the service under this app's own address, or allow cross-site cookies for this site.
          Reference: {failure.code}.
        </p>
      {:else}
        Reference: {failure.code}{#if failure.retryAfterSeconds}
          · try again in {failure.retryAfterSeconds}s{/if}
      {/if}
    </FormAlert>
  {/if}

  <div class="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-card">
    {#if step === 'credentials'}
      {#if canUsePasskeys}
        <div class="flex flex-col gap-2">
          <Button variant="brand" full onclick={usePasskey} busy={passkeyBusy}>
            <svg
              aria-hidden="true"
              focusable="false"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="10" cy="8" r="4" />
              <path d="M10 12c-3.3 0-6 2.2-6 5v3h8" />
              <path d="M15.5 15.5h6v4h-6zM17 15.5v-1.8a1.8 1.8 0 0 1 3.6 0v1.8" />
            </svg>
            {passkeyBusy ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
          </Button>
          <p class="text-center text-sm text-fg-secondary">
            Uses this device's screen lock, fingerprint, or face. Nothing to type.
          </p>
        </div>

        <!-- A divider that is decoration for sighted users and silence for everyone else. -->
        <div class="flex items-center gap-3" aria-hidden="true">
          <span class="h-px flex-1 bg-border"></span>
          <span class="text-micro font-semibold tracking-[0.06em] text-fg-muted uppercase">
            or use your password
          </span>
          <span class="h-px flex-1 bg-border"></span>
        </div>
      {/if}

      <form class="flex flex-col gap-4" onsubmit={submitCredentials} novalidate>
        <TextField
          label="Username"
          bind:value={username}
          autocomplete="username webauthn"
          required
          name="username"
        />
        <TextField
          label="Password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          required
          name="password"
        />
        <Button variant="brand" type="submit" full disabled={busy} {busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    {:else}
      <form class="flex flex-col gap-4" onsubmit={submitCode} novalidate>
        <TextField
          label="Six-digit code"
          hint="From your authenticator app. It changes every 30 seconds."
          bind:value={code}
          appearance="one-time-code"
          autocomplete="one-time-code"
          inputmode="numeric"
          maxlength={6}
          placeholder="000000"
          required
          autofocus
          name="code"
        />
        <Button variant="brand" type="submit" full disabled={busy} {busy}>
          {busy ? 'Checking…' : 'Verify and sign in'}
        </Button>
        <Button full onclick={restart}>Use a different account</Button>
      </form>
    {/if}
  </div>

  <!-- READ-ONLY posture, restated here because this is the first screen anyone sees. The same
       sentence is in the app disclaimer; a clinician should not have to reach the board to learn it. -->
  <p class="text-center text-sm text-fg-secondary">
    PulseMind supports clinical review. It does not make decisions and it changes nothing in the
    record.
  </p>

  {#if !data.authRequired}
    <!-- Visible ONLY while the gate is off — i.e. in the demo build. It is the honest way to ship a
         sign-in screen with published credentials: say so, on the screen, rather than leaving a
         reader to discover that the whole unit is reachable without signing in at all (**D-16**). -->
    <details class="rounded-md border border-dashed border-border bg-surface-sunken p-3">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center font-semibold text-fg focus-visible:pm-focus"
      >
        Demonstration build — sign-in is not enforced
      </summary>
      <div class="flex flex-col gap-2 pt-2 text-sm text-fg-secondary">
        <p>
          The clinical screens are reachable without an account in this build, so this page can be
          exercised without locking anyone out. Set
          <code class="font-mono break-all">PUBLIC_PULSEMIND_REQUIRE_AUTH=true</code> to enforce it.
        </p>
        <p>
          Demo accounts — <code class="font-mono break-all">clinician</code> (password only),
          <code class="font-mono break-all">oncall</code> (password + code),
          <code class="font-mono break-all">viewer</code> (read-only). Password
          <code class="font-mono break-all">PulseMind-demo-2026</code>. They exist against a
          synthetic 30-patient unit and no real record.
        </p>
        <p>Sign-in service: <code class="font-mono break-all">{authApiBase()}</code></p>
      </div>
    </details>
  {/if}
</div>
