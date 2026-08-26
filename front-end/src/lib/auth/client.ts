// src/lib/auth/client.ts
// CANONICAL DECLARATION — this file.
//
// The authentication transport. It is the SECOND module in the app allowed to call `fetch`, and the
// boundary is drawn on purpose: `src/lib/data/source.ts` is the only module that fetches PATIENT
// data, and this one never touches a patient. Nothing here parses, validates, or returns a clinical
// value, and nothing in `src/lib/data/` knows a user exists.
//
// EVERY REQUEST SENDS `credentials: 'include'`, because the session is an httpOnly cookie and a
// `fetch` without that flag silently omits it — producing a sign-in that appears to succeed and a
// next request that is anonymous. It is the single most common way this pattern is shipped broken.
//
// EVERY FAILURE IS NAMED. The service answers `{ code, message }` for every error path, and this
// module preserves both rather than collapsing them into a boolean. A login screen that can only say
// "something went wrong" makes a locked-out clinician guess between a typo, an expired code, a
// throttle, and a service that is down — which is the same class of harm CLAUDE.md rule 13 forbids
// on the clinical screens.

import { env } from '$env/dynamic/public';

const API_BASE = (env.PUBLIC_PULSEMIND_API_BASE ?? 'http://localhost:3500').replace(/\/+$/, '');

/**
 * Whether a signed-in user is REQUIRED to reach the clinical screens.
 *
 * Default `false`, and that default is a deliberate, reviewable position rather than laziness.
 * Handoff section 8 puts permission-denied out of scope, the backend's own `verifyJWT` is still
 * unmounted, and which patients a role may see is unanswered (**G-46**). Turning enforcement on by
 * default would mean this harness had quietly decided an authorisation model. So the sign-in surface
 * is fully built and fully testable, and whether it GATES anything is one environment variable that
 * an operator sets on purpose. Registered as **D-16**.
 */
export function authRequired(): boolean {
  return env.PUBLIC_PULSEMIND_REQUIRE_AUTH === 'true';
}

export function authApiBase(): string {
  return API_BASE;
}

export type SessionUser = {
  username: string;
  displayName: string | null;
  role: 'clinician' | 'read_only';
  totpEnrolled: boolean;
  /**
   * When this clinician last confirmed they had read the usage guide, or `null` if never. Carried on
   * the USER rather than in `localStorage` — a ward workstation is shared, so a per-browser flag
   * would hide the guide from the next person to sit down and re-show it to the same person on the
   * next terminal.
   */
  guideAcknowledgedAt: string | null;
  passkeys: readonly {
    id: string;
    label: string;
    createdAt: string;
    lastUsedAt: string | null;
    backedUp: boolean;
  }[];
};

export type SessionState = {
  authenticated: boolean;
  user: SessionUser | null;
  /** Which factors the current session actually used: `pwd`, `otp`, `passkey`, `uv`. */
  amr: readonly string[];
};

/** A named failure, never a bare boolean. `code` is the service's own, not invented here. */
export type AuthFailure = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: AuthFailure };

const UNREACHABLE: AuthFailure = {
  code: 'SERVICE_UNREACHABLE',
  message: `The sign-in service at ${API_BASE} could not be reached.`,
};

type Json = Record<string, unknown>;

/**
 * One request helper. It branches on the STATUS before reading any body — the same discipline
 * `source.ts` uses — because a body read first will throw on an empty 502 and report a JSON parse
 * error where the real fact is "the gateway is down".
 */
/**
 * `fetchImpl` exists for ONE caller: the root layout load, which is handed its own `fetch` by
 * SvelteKit. Using it there is not cosmetic — SvelteKit's `fetch` participates in the framework's
 * request handling and it is what stops the console filling with
 * "Loading … using `window.fetch`" on every navigation. Everywhere else the global is correct,
 * because everywhere else is an event handler and not a load.
 */
async function request<T>(
  path: string,
  // `Omit` because `RequestInit['body']` is `BodyInit` — a JSON object is not one, and widening the
  // parameter to accept both would let a caller pass a `FormData` that this function then
  // `JSON.stringify`s into `"{}"`.
  init: Omit<RequestInit, 'body'> & { body?: Json } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<AuthResult<T>> {
  // Built conditionally rather than with `: undefined`. Under `exactOptionalPropertyTypes` an
  // explicit `undefined` is not the same as an absent key, and `RequestInit['body']` does not admit
  // it — which is the compiler noticing something real: a GET carrying `body: undefined` and a
  // content-type header is a request shape that surprises servers.
  const { body, ...rest } = init;
  const requestInit: RequestInit = { ...rest, credentials: 'include' };
  if (body) {
    requestInit.headers = { 'content-type': 'application/json' };
    requestInit.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetchImpl(`${API_BASE}${path}`, requestInit);
  } catch {
    return { ok: false, error: UNREACHABLE };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Left null. An empty or non-JSON body is normal for a 502 or a 204, and the status below is
    // what the caller branches on.
  }

  if (!response.ok) {
    const shape = (payload ?? {}) as Partial<AuthFailure> & { retry_after_seconds?: number };
    const error: AuthFailure = {
      code: typeof shape.code === 'string' ? shape.code : `HTTP_${response.status}`,
      message:
        typeof shape.message === 'string'
          ? shape.message
          : `The sign-in service answered ${response.status}.`,
    };
    // Assigned only when the service sent one — an absent key, not a present `undefined`.
    if (typeof shape.retry_after_seconds === 'number') {
      error.retryAfterSeconds = shape.retry_after_seconds;
    }
    return { ok: false, error };
  }

  return { ok: true, value: payload as T };
}

// ------------------------------------------------------------------------------------------------
// Wire shapes. snake_case in, camelCase out — the same convention as the clinical wire boundary, so
// nobody has to remember which side of the app they are on.
// ------------------------------------------------------------------------------------------------

type WireUser = {
  username?: unknown;
  display_name?: unknown;
  role?: unknown;
  totp_enrolled?: unknown;
  guide_ack_at?: unknown;
  passkeys?: unknown;
};

function toUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as WireUser;
  if (typeof w.username !== 'string') return null;
  return {
    username: w.username,
    displayName: typeof w.display_name === 'string' ? w.display_name : null,
    // An unrecognised role is NOT silently promoted to `clinician`. The narrower value is the safe
    // one when the wire says something this build does not understand.
    role: w.role === 'clinician' ? 'clinician' : 'read_only',
    totpEnrolled: w.totp_enrolled === true,
    guideAcknowledgedAt: typeof w.guide_ack_at === 'string' ? w.guide_ack_at : null,
    passkeys: Array.isArray(w.passkeys)
      ? w.passkeys.flatMap((k) => {
          if (!k || typeof k !== 'object') return [];
          const p = k as Record<string, unknown>;
          if (typeof p.id !== 'string') return [];
          return [
            {
              id: p.id,
              label: typeof p.label === 'string' ? p.label : 'Passkey',
              createdAt: typeof p.created_at === 'string' ? p.created_at : '',
              lastUsedAt: typeof p.last_used_at === 'string' ? p.last_used_at : null,
              backedUp: p.backed_up === true,
            },
          ];
        })
      : [],
  };
}

export const SIGNED_OUT: SessionState = { authenticated: false, user: null, amr: [] };

/**
 * Who is signed in. NEVER throws and never rejects: it is called from the root layout load on every
 * navigation, and a sign-in service that is down must not take the whole app with it. An
 * unreachable service reports signed-out, which is the safe reading — the caller decides what to do
 * about it, and when `authRequired()` is false the answer is "nothing".
 */
export async function fetchSession(fetchImpl: typeof fetch = fetch): Promise<SessionState> {
  const result = await request<{ authenticated?: unknown; user?: unknown; amr?: unknown }>(
    '/auth/session',
    { method: 'GET' },
    fetchImpl,
  );
  if (!result.ok) return SIGNED_OUT;
  const user = toUser(result.value.user);
  return {
    authenticated: result.value.authenticated === true && user !== null,
    user,
    amr: Array.isArray(result.value.amr)
      ? result.value.amr.filter((a) => typeof a === 'string')
      : [],
  };
}

export type LoginOutcome =
  | { step: 'authenticated'; user: SessionUser }
  | { step: 'second_factor'; factor: 'totp'; pendingToken: string };

export async function login(username: string, password: string): Promise<AuthResult<LoginOutcome>> {
  const result = await request<Json>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  if (!result.ok) return result;

  if (result.value.step === 'second_factor') {
    return {
      ok: true,
      value: {
        step: 'second_factor',
        factor: 'totp',
        pendingToken: String(result.value.pending_token ?? ''),
      },
    };
  }
  const user = toUser(result.value.user);
  if (!user) {
    return {
      ok: false,
      error: { code: 'MALFORMED_RESPONSE', message: 'The sign-in service returned no account.' },
    };
  }
  return { ok: true, value: { step: 'authenticated', user } };
}

export async function submitTotp(
  pendingToken: string,
  code: string,
): Promise<AuthResult<SessionUser>> {
  const result = await request<Json>('/auth/login/totp', {
    method: 'POST',
    body: { pending_token: pendingToken, code },
  });
  if (!result.ok) return result;
  const user = toUser(result.value.user);
  return user
    ? { ok: true, value: user }
    : {
        ok: false,
        error: { code: 'MALFORMED_RESPONSE', message: 'The sign-in service returned no account.' },
      };
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST', body: {} });
}

// ------------------------------------------------------------------------------------------------
// TOTP enrolment
// ------------------------------------------------------------------------------------------------

export type TotpEnrolment = {
  secretBase32: string;
  otpauthUri: string;
  /** An inline `<svg>` string from the service. Rendered with `{@html}` — see the call site. */
  qrSvg: string;
  digits: number;
  periodSeconds: number;
};

export async function beginTotpEnrolment(): Promise<AuthResult<TotpEnrolment>> {
  const result = await request<Json>('/auth/totp/enrol', { method: 'POST', body: {} });
  if (!result.ok) return result;
  return {
    ok: true,
    value: {
      secretBase32: String(result.value.secret_base32 ?? ''),
      otpauthUri: String(result.value.otpauth_uri ?? ''),
      qrSvg: String(result.value.qr_svg ?? ''),
      digits: Number(result.value.digits ?? 6),
      periodSeconds: Number(result.value.period_seconds ?? 30),
    },
  };
}

export async function confirmTotpEnrolment(code: string): Promise<AuthResult<SessionUser>> {
  const result = await request<Json>('/auth/totp/enrol/confirm', {
    method: 'POST',
    body: { code },
  });
  if (!result.ok) return result;
  const user = toUser(result.value.user);
  return user
    ? { ok: true, value: user }
    : { ok: false, error: { code: 'MALFORMED_RESPONSE', message: 'No account was returned.' } };
}

export async function disableTotp(): Promise<AuthResult<SessionUser>> {
  const result = await request<Json>('/auth/totp/disable', { method: 'POST', body: {} });
  if (!result.ok) return result;
  const user = toUser(result.value.user);
  return user
    ? { ok: true, value: user }
    : { ok: false, error: { code: 'MALFORMED_RESPONSE', message: 'No account was returned.' } };
}

// ------------------------------------------------------------------------------------------------
// Passkeys (WebAuthn)
//
// The base64url <-> ArrayBuffer conversions below are the whole reason a "webauthn browser helper"
// library exists. They are ninety lines, they have no policy in them, and writing them here keeps
// the dependency count of a security-critical path at zero on this side of the wire.
// ------------------------------------------------------------------------------------------------

/**
 * Returns an `ArrayBuffer`, not a `Uint8Array`. Since TypeScript 5.7 a bare `new Uint8Array(n)` is
 * `Uint8Array<ArrayBufferLike>`, which the DOM's `BufferSource` refuses because `ArrayBufferLike`
 * admits `SharedArrayBuffer`. Allocating the buffer explicitly and handing that back is the fix that
 * does not involve a cast over a value the browser is about to treat as a credential.
 */
function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Can this browser do passkeys AT ALL. Checked before the button is rendered, because a passkey
 * button that throws `undefined is not an object` on an old browser is worse than no button.
 */
export function passkeysSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential === 'function' &&
    typeof navigator.credentials?.create === 'function'
  );
}

/** Does the device itself hold a passkey (Face ID, Windows Hello, a fingerprint reader). */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

type OptionsJson = {
  challenge: string;
  rp?: { id?: string; name?: string };
  user?: { id: string; name: string; displayName: string };
  pubKeyCredParams?: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: { id: string; transports?: string[] }[];
  allowCredentials?: { id: string; transports?: string[] }[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  userVerification?: UserVerificationRequirement;
};

/**
 * The browser aborts the ceremony for a dozen reasons — cancelled, no matching credential, wrong
 * origin, timeout — and every one of them arrives as a `DOMException`. Mapping the two that a user
 * can act on keeps the screen from saying "NotAllowedError" to a clinician.
 */
/**
 * A credential descriptor with `transports` present only when the service sent it. Spreading an
 * `undefined` would be a present key with an undefined value, which `exactOptionalPropertyTypes`
 * refuses — and which browsers read as "no transports are usable" rather than "unspecified".
 */
function toDescriptor(c: { id: string; transports?: string[] }): PublicKeyCredentialDescriptor {
  const descriptor: PublicKeyCredentialDescriptor = {
    id: fromBase64Url(c.id),
    type: 'public-key',
  };
  if (c.transports?.length) descriptor.transports = c.transports as AuthenticatorTransport[];
  return descriptor;
}

function ceremonyFailure(err: unknown): AuthFailure {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError') {
    return {
      code: 'PASSKEY_CANCELLED',
      message: 'The passkey prompt was dismissed or timed out. Try again, or use your password.',
    };
  }
  if (name === 'InvalidStateError') {
    return {
      code: 'PASSKEY_ALREADY_REGISTERED',
      message: 'This device already has a passkey for PulseMind.',
    };
  }
  return {
    code: 'PASSKEY_FAILED',
    message: err instanceof Error ? err.message : 'The passkey could not be used.',
  };
}

export async function registerPasskey(label: string): Promise<AuthResult<SessionUser>> {
  if (!passkeysSupported()) {
    return {
      ok: false,
      error: { code: 'PASSKEYS_UNSUPPORTED', message: 'This browser does not support passkeys.' },
    };
  }

  const optionsResult = await request<OptionsJson>('/auth/passkey/register/options', {
    method: 'POST',
    body: {},
  });
  if (!optionsResult.ok) return optionsResult;
  const options = optionsResult.value;

  // Checked rather than asserted with `!`. A registration payload without a `user` is a service
  // that changed shape, and `options.user!.id` would turn that into a `TypeError` in a credential
  // ceremony — an unreadable failure exactly where the user is being asked to touch a fingerprint
  // reader. `no-non-null-assertion` is doing its job here.
  const account = options.user;
  if (!account) {
    return {
      ok: false,
      error: {
        code: 'MALFORMED_RESPONSE',
        message: 'The sign-in service did not describe the account to register a passkey against.',
      },
    };
  }

  let credential: PublicKeyCredential | null;
  try {
    // Built field by field rather than spread. `...options` would carry the SERVICE's base64url
    // strings straight through — `challenge` and `user.id` as text where the browser demands
    // buffers — and `pubKeyCredParams` is required, so an options payload that omitted it would
    // fail at the authenticator rather than here.
    const publicKey: PublicKeyCredentialCreationOptions = {
      rp: {
        name: options.rp?.name ?? 'PulseMind',
        ...(options.rp?.id ? { id: options.rp.id } : {}),
      },
      user: {
        id: fromBase64Url(account.id),
        name: account.name,
        displayName: account.displayName,
      },
      challenge: fromBase64Url(options.challenge),
      pubKeyCredParams: options.pubKeyCredParams ?? [
        // ES256 then RS256 — the two every authenticator implements, in preference order.
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      excludeCredentials: (options.excludeCredentials ?? []).map(toDescriptor),
    };
    if (options.timeout !== undefined) publicKey.timeout = options.timeout;
    if (options.attestation !== undefined) publicKey.attestation = options.attestation;
    if (options.authenticatorSelection !== undefined) {
      publicKey.authenticatorSelection = options.authenticatorSelection;
    }

    credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  } catch (err) {
    return { ok: false, error: ceremonyFailure(err) };
  }
  if (!credential) {
    return {
      ok: false,
      error: { code: 'PASSKEY_CANCELLED', message: 'No passkey was created.' },
    };
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  const result = await request<Json>('/auth/passkey/register/verify', {
    method: 'POST',
    body: {
      label,
      credential: {
        id: credential.id,
        rawId: toBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: toBase64Url(response.clientDataJSON),
          attestationObject: toBase64Url(response.attestationObject),
          transports: response.getTransports?.() ?? [],
        },
        clientExtensionResults: credential.getClientExtensionResults(),
      },
    },
  });
  if (!result.ok) return result;
  const user = toUser(result.value.user);
  return user
    ? { ok: true, value: user }
    : { ok: false, error: { code: 'MALFORMED_RESPONSE', message: 'No account was returned.' } };
}

export async function deletePasskey(id: string): Promise<AuthResult<SessionUser>> {
  const result = await request<Json>(`/auth/passkey/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!result.ok) return result;
  const user = toUser(result.value.user);
  return user
    ? { ok: true, value: user }
    : { ok: false, error: { code: 'MALFORMED_RESPONSE', message: 'No account was returned.' } };
}

/**
 * Sign in with a passkey. `username` is optional: leaving it out asks the authenticator to offer
 * whatever it holds for this site, which is what makes a usernameless sign-in possible.
 */
export async function loginWithPasskey(username?: string): Promise<AuthResult<SessionUser>> {
  if (!passkeysSupported()) {
    return {
      ok: false,
      error: { code: 'PASSKEYS_UNSUPPORTED', message: 'This browser does not support passkeys.' },
    };
  }

  const optionsResult = await request<OptionsJson>('/auth/passkey/login/options', {
    method: 'POST',
    body: username ? { username } : {},
  });
  if (!optionsResult.ok) return optionsResult;
  const options = optionsResult.value;

  let assertion: PublicKeyCredential | null;
  try {
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: fromBase64Url(options.challenge),
      allowCredentials: (options.allowCredentials ?? []).map(toDescriptor),
    };
    // Each assigned only when present: under `exactOptionalPropertyTypes` an explicit `undefined`
    // is not the same as an absent key, and `rpId: undefined` is not the same as "this origin".
    if (options.rp?.id !== undefined) publicKey.rpId = options.rp.id;
    if (options.timeout !== undefined) publicKey.timeout = options.timeout;
    if (options.userVerification !== undefined) {
      publicKey.userVerification = options.userVerification;
    }

    assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  } catch (err) {
    return { ok: false, error: ceremonyFailure(err) };
  }
  if (!assertion) {
    return { ok: false, error: { code: 'PASSKEY_CANCELLED', message: 'No passkey was used.' } };
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  const result = await request<Json>('/auth/passkey/login/verify', {
    method: 'POST',
    body: {
      // The challenge goes back with the assertion because a usernameless sign-in has no account to
      // have stored it against. The service holds it in a single-use table and deletes it on read.
      challenge: options.challenge,
      credential: {
        id: assertion.id,
        rawId: toBase64Url(assertion.rawId),
        type: assertion.type,
        response: {
          clientDataJSON: toBase64Url(response.clientDataJSON),
          authenticatorData: toBase64Url(response.authenticatorData),
          signature: toBase64Url(response.signature),
          userHandle: response.userHandle ? toBase64Url(response.userHandle) : undefined,
        },
        clientExtensionResults: assertion.getClientExtensionResults(),
      },
    },
  });
  if (!result.ok) return result;
  const user = toUser(result.value.user);
  return user
    ? { ok: true, value: user }
    : { ok: false, error: { code: 'MALFORMED_RESPONSE', message: 'No account was returned.' } };
}

/**
 * Record that this clinician has read the usage guide.
 *
 * There is no way to un-acknowledge: the only thing a caller can say is "I have read it, now", and
 * the service stamps the time. A boolean the client could flip either way would let a mis-click
 * silently re-arm a first-run screen for someone who had already dismissed it.
 */
export async function acknowledgeGuide(): Promise<AuthResult<SessionUser>> {
  const result = await request<Json>('/auth/guide/acknowledge', { method: 'POST', body: {} });
  if (!result.ok) return result;
  const user = toUser(result.value.user);
  return user
    ? { ok: true, value: user }
    : { ok: false, error: { code: 'MALFORMED_RESPONSE', message: 'No account was returned.' } };
}
