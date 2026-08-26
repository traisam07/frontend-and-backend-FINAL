<!-- src/lib/components/TextField.svelte
     CANONICAL DECLARATION — this file.

     A labelled text input with the three things that are always forgotten wired in by construction:

       1. A REAL `<label for>`. Never a placeholder standing in for a label — a placeholder vanishes
          the moment typing starts, which is exactly when the user needs it (SC 3.3.2).
       2. `aria-describedby` pointing at the hint AND the error, so both are announced with the
          field rather than sitting silently beside it.
       3. `aria-invalid` driven by the same `error` prop that renders the message, so the two can
          never disagree — a field that looks wrong and reads as valid is worse than either.

     The error is a TEXT message with a glyph, never a red border alone (CLAUDE.md rule 8). The
     border thickens as the non-colour channel; colour is secondary here as everywhere.

     Ids come from `$props.id()`, so several fields on one page cannot collide. -->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import {
    FIELD_ERROR,
    FIELD_HINT,
    FIELD_INPUT,
    FIELD_INPUT_CODE,
    FIELD_INPUT_INVALID,
    FIELD_LABEL,
  } from '$lib/design/control-classes';

  let {
    label,
    value = $bindable(''),
    type = 'text',
    /** `one-time-code` swaps in the wide tracked numeric treatment. */
    appearance = 'text',
    hint,
    error,
    required = false,
    autocomplete,
    inputmode,
    placeholder,
    maxlength,
    autofocus = false,
    name,
    class: klass,
    oninput,
  }: {
    label: string;
    value?: string;
    type?: 'text' | 'password' | 'email';
    appearance?: 'text' | 'one-time-code';
    hint?: string;
    /** Present means invalid. The same value drives `aria-invalid` and the visible message. */
    error?: string | null;
    required?: boolean;
    /** The DOM's own union, not `string` — a typo like `one-time-pass` is silently inert. */
    autocomplete?: HTMLInputAttributes['autocomplete'];
    inputmode?: 'text' | 'numeric';
    placeholder?: string;
    maxlength?: number;
    autofocus?: boolean;
    name?: string;
    class?: string;
    oninput?: (event: Event) => void;
  } = $props();

  const uid = $props.id();
  const inputId = `${uid}-input`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;

  const invalid = $derived(typeof error === 'string' && error.length > 0);

  // Both ids when both exist, in reading order. `undefined` rather than an empty string, so the
  // attribute is absent instead of pointing at nothing.
  const describedBy = $derived(
    [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ') || undefined,
  );
</script>

<div class={['flex flex-col gap-1.5', klass]}>
  <label class={FIELD_LABEL} for={inputId}>
    {label}
    {#if required}<span class="font-normal text-fg-secondary">(required)</span>{/if}
  </label>

  {#if hint}
    <p id={hintId} class={FIELD_HINT}>{hint}</p>
  {/if}

  <!-- svelte-ignore a11y_autofocus -->
  <!-- `autofocus` is opt-in and used only where the field IS the screen's purpose — the code step of
       a two-factor challenge, which the user reached by submitting the step before it. That is the
       case the lint rule's own documentation exempts; anywhere else, leave it false. -->
  <input
    id={inputId}
    {name}
    {type}
    {required}
    {autocomplete}
    {inputmode}
    {placeholder}
    {maxlength}
    {autofocus}
    bind:value
    {oninput}
    aria-invalid={invalid ? 'true' : undefined}
    aria-describedby={describedBy}
    class={[
      appearance === 'one-time-code' ? FIELD_INPUT_CODE : FIELD_INPUT,
      invalid ? FIELD_INPUT_INVALID : undefined,
    ]}
  />

  {#if invalid}
    <!-- Not `role="alert"`: the surrounding form owns one alert region for the submit result, and
         three fields shouting at once is noise. This message is reachable through the field's own
         accessible description. -->
    <p id={errorId} class={FIELD_ERROR}>
      <svg
        aria-hidden="true"
        focusable="false"
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="mt-0.5 shrink-0"
      >
        <circle cx="8" cy="8" r="6.2" />
        <path d="M8 4.8v3.6" />
        <circle cx="8" cy="11" r="0.8" fill="currentColor" stroke="none" />
      </svg>
      {error}
    </p>
  {/if}
</div>
