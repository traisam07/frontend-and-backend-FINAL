// src/lib/state/pending.svelte.ts
// The 250 ms loading-flag gate state U-01 depends on
// (`.claude/skills/svelte5-runes/SKILL.md` section 6.3).
//
// Why a gate at all: a load that resolves in 40 ms would otherwise flash a skeleton for two frames,
// and a flashing skeleton on a triage board reads as instability. Below the threshold nothing is
// shown; above it the loading treatment appears and STAYS until the load resolves, so it never
// flickers off and on again.
//
// The 250 ms threshold is harness-defined, pending design confirmation (**G-30**, **D-11**).

const DEFAULT_DELAY_MS = 250;

export interface DelayGate {
  /** True only once the underlying operation has been pending for longer than the threshold. */
  readonly visible: boolean;
  /** Call when the operation starts. Idempotent. */
  start(): void;
  /** Call when it finishes — success or failure. Cancels a pending timer. */
  stop(): void;
}

/**
 * A factory, not a module singleton: a singleton would make two concurrent loads share one flag, and
 * the first to finish would hide the other's loading state.
 *
 * `$state` is used through a closure rather than a class field so the returned object can be handed
 * straight into a component's props.
 */
export function delayGate(delayMs: number = DEFAULT_DELAY_MS): DelayGate {
  let visible = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    get visible() {
      return visible;
    },
    start() {
      if (timer !== undefined || visible) return;
      timer = setTimeout(() => {
        visible = true;
        timer = undefined;
      }, delayMs);
    },
    stop() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      visible = false;
    },
  };
}
