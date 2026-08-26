<!-- src/lib/components/Button.svelte
     CANONICAL DECLARATION — this file.

     One component for the two things that look identical and behave completely differently: a
     `<button>` that does something on this screen, and an `<a href>` that goes somewhere. Passing
     `href` selects the anchor. Nothing else about the call site changes, which is the point — the
     44px floor and the focus ring come from `CONTROL_BASE` either way and cannot be forgotten.

     It does NOT render `<svelte:element>`: the two branches take genuinely different attributes
     (`type`/`disabled` versus `href`), and one element with half its attributes conditional is how
     an `<a disabled>` — an element that looks unavailable and is fully clickable — gets shipped.

     `href` + `disabled` together is a compile-time error, not a runtime nicety. A link that cannot
     be followed should not be a link; render a button, or do not render the control. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    BUTTON_VARIANT,
    CONTROL_BASE,
    CONTROL_DISABLED,
    CONTROL_FULL,
    type ButtonVariant,
  } from '$lib/design/control-classes';

  type Common = {
    variant?: ButtonVariant;
    /** Stretch to the container. Phone layouts want this; desktop rows usually do not. */
    full?: boolean;
    /** Layout only — margin, grid placement, order. Never a variant class: the map owns those. */
    class?: string;
    children: Snippet;
  };

  type AsButton = Common & {
    href?: undefined;
    type?: 'button' | 'submit';
    disabled?: boolean;
    /**
     * `aria-busy` while an action is in flight. The CALLER swaps the label — a spinner alone tells a
     * screen-reader user nothing, and this component owns no clinical or status literal.
     */
    busy?: boolean;
    onclick?: (event: MouseEvent) => void;
  };

  type AsLink = Common & {
    href: string;
    /** Barred by the type on purpose — see the header comment. */
    disabled?: never;
    type?: never;
    busy?: never;
    onclick?: (event: MouseEvent) => void;
  };

  let {
    variant = 'secondary',
    full = false,
    class: klass,
    children,
    href,
    type = 'button',
    disabled = false,
    busy = false,
    onclick,
  }: AsButton | AsLink = $props();

  const classes = $derived([
    CONTROL_BASE,
    BUTTON_VARIANT[variant],
    href === undefined ? CONTROL_DISABLED : undefined,
    full ? CONTROL_FULL : undefined,
    klass,
  ]);
</script>

{#if href !== undefined}
  <a {href} class={classes} {onclick}>{@render children()}</a>
{:else}
  <button {type} class={classes} {disabled} aria-busy={busy ? 'true' : undefined} {onclick}>
    {@render children()}
  </button>
{/if}
