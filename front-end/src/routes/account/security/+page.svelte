<!-- src/routes/account/security/+page.svelte
     ACCOUNT & SECURITY — a person managing their own sign-in factors. Never anyone else's, and never
     anything clinical: no patient, no risk band, no score appears on this route.

     Two sections, in the order they should be adopted:

       PASSKEYS first, because they are the stronger factor and the one that removes typing from a
       shared ward terminal. Each registered key is listed with a label and a last-used time so a
       clinician can revoke a lost phone without guessing which row it is.

       AUTHENTICATOR APP second, as the fallback for a device that cannot hold a passkey. Enrolment
       is deliberately TWO steps — show the secret, then prove a code — so a mis-scanned QR is caught
       here rather than at the next sign-in, when it would be a lockout.

     Harness-defined, pending design confirmation (**D-16**). -->
<script lang="ts">
  import { invalidate } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import TextField from '$lib/components/TextField.svelte';
  import FormAlert from '$lib/components/FormAlert.svelte';
  import AbsoluteTime from '$lib/components/AbsoluteTime.svelte';
  import {
    beginTotpEnrolment,
    confirmTotpEnrolment,
    deletePasskey,
    disableTotp,
    registerPasskey,
    passkeysSupported,
    type AuthFailure,
    type SessionUser,
    type TotpEnrolment,
  } from '$lib/auth/client';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  /**
   * NOT `let user = $state(data.user)`. SvelteKit reuses a page component across navigations, so a
   * plain capture of `data` renders the PREVIOUS visit's account after the next one loads — the
   * failure CLAUDE.md rule 3 exists for, and here it would put one clinician's passkey list under
   * another's name.
   *
   * So the load's value is the base and every mutation writes an override on top of it. A fresh
   * `data` from a new load flows through automatically; an override survives until it does.
   */
  let updated = $state<SessionUser | null>(null);
  const user = $derived(updated ?? data.user);
  let failure = $state<AuthFailure | null>(null);
  let notice = $state<string | null>(null);
  let busy = $state<string | null>(null);

  const canUsePasskeys = passkeysSupported();

  let passkeyLabel = $state('');
  let enrolment = $state<TotpEnrolment | null>(null);
  let enrolCode = $state('');
  let copied = $state(false);

  function reset() {
    failure = null;
    notice = null;
  }

  async function addPasskey() {
    if (busy) return;
    reset();
    busy = 'passkey';
    const label = passkeyLabel.trim() || 'This device';
    const result = await registerPasskey(label);
    busy = null;

    if (!result.ok) {
      failure = result.error;
      return;
    }
    updated = result.value;
    passkeyLabel = '';
    notice = `Passkey "${label}" is registered. You can sign in with it from now on.`;
    await invalidate('pulsemind:session');
  }

  async function removePasskey(id: string, label: string) {
    if (busy) return;
    reset();
    busy = `passkey:${id}`;
    const result = await deletePasskey(id);
    busy = null;

    if (!result.ok) {
      failure = result.error;
      return;
    }
    updated = result.value;
    notice = `Passkey "${label}" was removed.`;
    await invalidate('pulsemind:session');
  }

  async function startTotp() {
    if (busy) return;
    reset();
    busy = 'totp';
    const result = await beginTotpEnrolment();
    busy = null;

    if (!result.ok) {
      failure = result.error;
      return;
    }
    enrolment = result.value;
    enrolCode = '';
    copied = false;
  }

  async function confirmTotp(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    reset();
    busy = 'totp-confirm';
    const result = await confirmTotpEnrolment(enrolCode);
    busy = null;

    if (!result.ok) {
      failure = result.error;
      enrolCode = '';
      return;
    }
    updated = result.value;
    enrolment = null;
    notice = 'The authenticator app is set up. Your next sign-in will ask for a code.';
    await invalidate('pulsemind:session');
  }

  async function turnOffTotp() {
    if (busy) return;
    reset();
    busy = 'totp-off';
    const result = await disableTotp();
    busy = null;

    if (!result.ok) {
      failure = result.error;
      return;
    }
    updated = result.value;
    notice = 'The authenticator app was removed from this account.';
    await invalidate('pulsemind:session');
  }

  async function copySecret() {
    if (!enrolment) return;
    try {
      await navigator.clipboard.writeText(enrolment.secretBase32);
      copied = true;
    } catch {
      // Clipboard access can be refused, and the secret is already on screen to be typed. Saying
      // nothing here is correct: there is no failure the user needs to act on.
      copied = false;
    }
  }

  /**
   * The QR as a DATA URI on an `<img>`, never `{@html}`.
   *
   * The service returns SVG markup, and injecting it would be an HTML-injection sink in the one
   * place a clinician is copying a secret — the argument that the string "comes from our own QR
   * encoder" is exactly the argument that stops being true after one refactor. An `<img>` renders
   * SVG in a restricted context where script does not run, so the sink does not exist at all.
   *
   * The alt text is short because the key itself is on screen beside the image as selectable text:
   * the QR is a convenience for a phone camera, not the only way through this screen.
   */
  const qrSource = $derived(
    enrolment
      ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(enrolment.qrSvg)))}`
      : null,
  );

  const SECTION = 'flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-5';
</script>

<svelte:head>
  <title>Account &amp; security — PulseMind</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-[46rem] min-w-0 flex-col gap-5">
  <div class="flex flex-col gap-1">
    <Button href="/patients" variant="quiet" class="w-fit px-0">← Back to overview</Button>
    <h1 class="text-xl font-semibold tracking-tight text-fg md:text-2xl" tabindex="-1">
      Account &amp; security
    </h1>
    <p class="text-sm text-fg-secondary">
      Sign-in methods for <span class="font-semibold text-fg">{user.username}</span>. Changing them
      affects how you sign in and nothing else — no patient record, review state, or risk score is
      touched from this screen.
    </p>
  </div>

  {#if failure}
    <FormAlert tone="error" title={failure.message}>Reference: {failure.code}</FormAlert>
  {/if}
  {#if notice}
    <FormAlert tone="success" title={notice} />
  {/if}

  <!-- ------------------------------------------------------------------ passkeys -->
  <section class={SECTION} aria-labelledby="pm-passkeys-heading">
    <div class="flex flex-col gap-1">
      <h2 id="pm-passkeys-heading" class="text-lg font-semibold text-fg">Passkeys</h2>
      <p class="text-sm text-fg-secondary">
        A passkey signs you in with this device's screen lock, fingerprint, or face. There is
        nothing to type and nothing to remember, and the key itself never leaves the device.
      </p>
    </div>

    {#if user.passkeys.length > 0}
      <ul class="flex flex-col gap-2">
        <!-- Keyed by the credential id — a stable domain id, never the index: this list is
             re-rendered after every add and remove. -->
        {#each user.passkeys as key (key.id)}
          <li
            class="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-surface-sunken p-3 sm:flex-row sm:items-center"
          >
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="font-semibold break-words text-fg">{key.label}</span>
              <span class="text-sm text-fg-secondary">
                {#if key.lastUsedAt}
                  Last used <AbsoluteTime iso={key.lastUsedAt} />
                {:else}
                  Not used yet
                {/if}
                {#if key.backedUp}
                  · synced across your devices
                {:else}
                  · on this device only
                {/if}
              </span>
            </div>
            <Button
              class="sm:ms-auto"
              onclick={() => removePasskey(key.id, key.label)}
              disabled={busy !== null}
            >
              Remove
            </Button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="rounded-md border border-dashed border-border p-3 text-sm text-fg-secondary">
        No passkeys are registered on this account yet.
      </p>
    {/if}

    {#if canUsePasskeys}
      <div class="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
        <TextField
          class="min-w-0 flex-1"
          label="Name this device"
          hint="So you can tell your keys apart later — “Ward 4 terminal”, “my phone”."
          bind:value={passkeyLabel}
          placeholder="This device"
        />
        <Button
          variant="primary"
          onclick={addPasskey}
          busy={busy === 'passkey'}
          disabled={busy !== null}
        >
          {busy === 'passkey' ? 'Waiting for your device…' : 'Add a passkey'}
        </Button>
      </div>
    {:else}
      <!-- Stated plainly rather than hiding the section: a clinician who was told to set up a
           passkey needs to know it is the BROWSER refusing, not their account. -->
      <p class="rounded-md border border-dashed border-border p-3 text-sm text-fg-secondary">
        This browser does not support passkeys, so one cannot be added here. Use an authenticator
        app below, or sign in from a browser that supports them.
      </p>
    {/if}
  </section>

  <!-- ------------------------------------------------------- authenticator app -->
  <section class={SECTION} aria-labelledby="pm-totp-heading">
    <div class="flex flex-col gap-1">
      <h2 id="pm-totp-heading" class="text-lg font-semibold text-fg">Authenticator app</h2>
      <p class="text-sm text-fg-secondary">
        A six-digit code that changes every 30 seconds, asked for after your password.
      </p>
    </div>

    {#if user.totpEnrolled && !enrolment}
      <p
        class="flex items-center gap-2 rounded-md border border-review-done-border bg-review-done-bg p-3 text-review-done-fg"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2.6 8.4 6.2 12l7.2-8" />
        </svg>
        <span class="font-semibold">Set up. Your sign-in asks for a code.</span>
      </p>
      <Button class="w-fit" onclick={turnOffTotp} disabled={busy !== null}>
        {busy === 'totp-off' ? 'Removing…' : 'Remove the authenticator app'}
      </Button>
    {:else if enrolment}
      <div class="flex flex-col gap-4 md:flex-row md:items-start">
        {#if qrSource}
          <img
            src={qrSource}
            alt="QR code for authenticator app setup"
            width="240"
            height="240"
            class="mx-auto h-auto w-[min(15rem,100%)] shrink-0 rounded-md border border-border bg-surface p-2"
          />
        {/if}

        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <p class="text-sm text-fg-secondary">
            Scan this with your authenticator app, then enter the code it shows to confirm.
          </p>

          <!-- The typed secret is offered ALONGSIDE the QR, not instead of it. A QR code is unusable
               to someone enrolling on the same device, using a password manager, or reading with a
               screen reader — "scan or you cannot enrol" is an accessibility failure. -->
          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-semibold text-fg">Or enter this key by hand</span>
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <code
                class="min-w-0 flex-1 rounded-md border border-border bg-surface-sunken px-2 py-2 font-mono text-sm break-all"
                >{enrolment.secretBase32}</code
              >
              <Button onclick={copySecret}>{copied ? 'Copied' : 'Copy'}</Button>
            </div>
            <p class="text-sm text-fg-secondary">
              {enrolment.digits} digits, every {enrolment.periodSeconds} seconds.
            </p>
          </div>

          <form class="flex flex-col gap-3" onsubmit={confirmTotp} novalidate>
            <TextField
              label="Code from the app"
              bind:value={enrolCode}
              appearance="one-time-code"
              autocomplete="one-time-code"
              inputmode="numeric"
              maxlength={6}
              placeholder="000000"
              required
            />
            <div class="flex flex-wrap gap-2">
              <Button variant="primary" type="submit" disabled={busy !== null}>
                {busy === 'totp-confirm' ? 'Checking…' : 'Confirm and turn on'}
              </Button>
              <Button onclick={() => (enrolment = null)} disabled={busy !== null}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    {:else}
      <p class="rounded-md border border-dashed border-border p-3 text-sm text-fg-secondary">
        Not set up. Your sign-in asks for a password only.
      </p>
      <Button variant="primary" class="w-fit" onclick={startTotp} disabled={busy !== null}>
        {busy === 'totp' ? 'Preparing…' : 'Set up an authenticator app'}
      </Button>
    {/if}
  </section>

  <p class="text-sm text-fg-secondary">
    Signed in with: {data.amr.length > 0 ? data.amr.join(', ') : 'unrecorded'}.
  </p>
</div>
