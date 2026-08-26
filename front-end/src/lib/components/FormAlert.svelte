<!-- src/lib/components/FormAlert.svelte
     CANONICAL DECLARATION — this file.

     The result of submitting a form: one region, one message, announced once.

     `role="alert"` here is correct and is the exception that proves the rule elsewhere in this app.
     Every clinical panel refuses the role because clinical states are PRESENT ON LOAD and an alert
     is for a change. A submit result is the opposite: it did not exist a moment ago, the user caused
     it, and they are waiting for it.

     Three tones, and none of them is carried by colour alone (CLAUDE.md rule 8): each has a distinct
     glyph, a distinct border weight, and a visible word in the message itself. Rendered in greyscale
     the three stay tellable apart.

     AUTH SURFACE ONLY for the `error` tone, which borrows the risk-critical family — see the note in
     `control-classes.ts`. On a screen showing a patient, red means Critical. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    tone = 'error',
    title,
    children,
    class: klass,
  }: {
    tone?: 'error' | 'info' | 'success';
    /** The whole message when there is no body; the heading when `children` is supplied. */
    title: string;
    children?: Snippet;
    class?: string;
  } = $props();

  const TONE = {
    error: 'border-2 border-risk-critical-border bg-risk-critical-bg text-risk-critical-fg',
    info: 'border border-accent-border bg-accent-bg text-accent-fg',
    success: 'border border-review-done-border bg-review-done-bg text-review-done-fg',
  } as const satisfies Record<'error' | 'info' | 'success', string>;
</script>

<div role="alert" class={['flex items-start gap-2.5 rounded-md p-3', TONE[tone], klass]}>
  <svg
    aria-hidden="true"
    focusable="false"
    width="18"
    height="18"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="mt-0.5 shrink-0"
  >
    {#if tone === 'error'}
      <circle cx="8" cy="8" r="6.2" />
      <path d="M5.8 5.8 10.2 10.2M10.2 5.8 5.8 10.2" />
    {:else if tone === 'success'}
      <path d="M2.6 8.4 6.2 12l7.2-8" />
    {:else}
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 7.4v3.4" />
      <circle cx="8" cy="5.2" r="0.8" fill="currentColor" stroke="none" />
    {/if}
  </svg>

  <div class="flex min-w-0 flex-col gap-1">
    <p class="font-semibold">{title}</p>
    {#if children}<div class="text-sm">{@render children()}</div>{/if}
  </div>
</div>
