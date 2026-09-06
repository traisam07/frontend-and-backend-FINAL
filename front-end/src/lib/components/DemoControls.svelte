<!-- src/lib/components/DemoControls.svelte
     CANONICAL DECLARATION — this file.

     THE DEMONSTRATION STRIP. Restart the ward, advance it, stream it, warm the explainer, and open
     the pipeline panel.

     WHY THIS EXISTS AT ALL, AND WHY IT IS NOT CLINICAL CHROME. Rule 12 bans the prototype's fake
     timers and scripted score changes, and it is right to: a clinical value must change only when
     new application data arrives. This strip does not break that rule, it satisfies it from the
     other side. Every button here asks the SERVICE to produce new application data, through the real
     model, and the screen then renders what came back. Nothing on it animates a number.

     It is still not part of the interface a clinician uses, so it is behind
     `PUBLIC_PULSEMIND_DEMO_CONTROLS=true`, it says what it is in words, and it sits below the
     clinical frame rather than inside it.

     ⚠️ THE STREAM IS SELF-CLOCKING, NOT AN INTERVAL. `POST /api/ward/tick` is single-flight and
     answers 409 to an overlap, because two concurrent ticks both read and both write the same stay
     state and the second discards the first's latch update with no error anywhere. A fixed interval
     cannot know the previous tick is still running. So the loop awaits its own tick and THEN sleeps.

     ⚠️ THE EPOCH GUARD. Stop and start inside one cadence window and, without it, two loops run
     against one ward for the rest of the session.

     ⚠️ ONE GPU THREAD SERVES BOTH SCORING AND THE 7B. Generation does not refuse a tick, it delays
     it, and behind a cold load that is most of the scoring timeout. Warm the explainer BEFORE
     streaming, and warm it before demonstrating: the load needs 6700 MiB free of the card's 8151 and
     the route answers 503 naming the measured figure rather than segfaulting the service. -->
<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { postDemoAction } from '$lib/data/pulsemind-source';
  import { resetWardClock } from '$lib/state/ward-clock.svelte';
  import Button from './Button.svelte';
  import TelemetryDock from './TelemetryDock.svelte';

  /** How many hourly readings a restart backfills. Twenty-four fills the risk history window. */
  const BACKFILL_TICKS = 24;

  /** The cadence between ticks once one has FINISHED. Not a period: see the header. */
  const CADENCE_MS = 3000;

  /** A cold load has been measured at 43 s, and generation swings with what is left on the card. */
  const WARMUP_TIMEOUT_MS = 300_000;
  const TICK_TIMEOUT_MS = 180_000;
  const SEED_TIMEOUT_MS = 300_000;

  let busy = $state(false);
  let streaming = $state(false);
  let message = $state<string | null>(null);
  let failed = $state(false);
  let dockOpen = $state(false);

  /** Bumped on every stop. A loop whose epoch is stale exits instead of ticking a ward it no
   *  longer owns. */
  let epoch = 0;

  function report(text: string, isFailure = false) {
    message = text;
    failed = isFailure;
  }

  /** Re-read what the ward now says. The loads own the fetching; this only marks them stale. */
  async function refresh() {
    await invalidate('pulsemind:board');
    await invalidate('pulsemind:patient');
  }

  async function seed() {
    if (busy || streaming) return;
    busy = true;
    report('Restarting the ward…');
    const result = await postDemoAction(
      fetch,
      'ward/seed',
      { backfill_ticks: BACKFILL_TICKS },
      SEED_TIMEOUT_MS,
    );
    busy = false;
    if (!result.ok) {
      report(result.problem ?? 'The ward could not be restarted.', true);
      return;
    }
    // ⚠️ THE CLOCK HAS TO COME BACK WITH IT. `observeWardInstants` only ever moves forward, so a
    // restart whose newest reading is EARLIER than the ward just torn down left the app clock pinned
    // to an instant that no longer exists: the header kept saying `Ward clock · simulated` and every
    // age on the board read `in 4 h 12 min` against readings that were minutes old. The two features
    // were written together and did not compose.
    resetWardClock();
    await refresh();
    report(`Ward restarted with ${BACKFILL_TICKS} hourly readings per bed.`);
  }

  /** One reading for every bed. An hour of ward time, not a wall-clock second. */
  async function tick(): Promise<boolean> {
    const result = await postDemoAction(fetch, 'ward/tick', {}, TICK_TIMEOUT_MS);
    if (!result.ok) {
      report(result.problem ?? 'The ward could not be advanced.', true);
      return false;
    }
    await refresh();
    return true;
  }

  async function advance() {
    if (busy || streaming) return;
    busy = true;
    report('Advancing one reading…');
    const ok = await tick();
    busy = false;
    if (ok) report('Ward advanced by one reading, which is one hour of ward time.');
  }

  function stop() {
    epoch += 1;
    streaming = false;
    report('Stream stopped.');
  }

  async function stream() {
    if (busy) return;
    if (streaming) {
      stop();
      return;
    }
    streaming = true;
    const mine = ++epoch;
    report('Streaming. Each reading is an hour of ward time.');

    // SELF-CLOCKING. Await the tick, then sleep. Never `setInterval`.
    while (streaming && epoch === mine) {
      const ok = await tick();
      // ⚠️ THE EPOCH IS CHECKED FIRST, BEFORE THE FAILURE. A tick can be in flight for minutes, so
      // Stop-then-Stream leaves the old loop parked inside `await tick()`. Checked second, a stale
      // loop whose tick failed set the SHARED `streaming = false` and killed the live one.
      if (epoch !== mine) return;
      // A failure STOPS the stream and surfaces the message. It does not retry: a loop that retries
      // a failing tick hides the failure behind a screen that keeps looking busy.
      if (!ok) {
        streaming = false;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, CADENCE_MS));
    }
  }

  async function warm() {
    if (busy || streaming) return;
    busy = true;
    report('Loading the 7B onto the card. This takes tens of seconds…');
    const result = await postDemoAction(fetch, 'ward/warmup', {}, WARMUP_TIMEOUT_MS);
    busy = false;
    if (!result.ok) {
      // The VRAM gate refuses BEFORE the allocation and names the measured free figure, because a
      // model that will not fit does not raise, it segfaults the process.
      report(result.problem ?? 'The explainer could not be loaded.', true);
      return;
    }
    report('Explainer loaded. Keep the card free: generation slows sharply as it fills.');
  }
</script>

<section
  aria-label="Demonstration controls"
  class="border-border bg-surface-sunken shrink-0 border-t"
>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
    <p class="text-micro text-fg-muted font-semibold tracking-[0.04em] uppercase">
      Demonstration controls · not part of the clinical interface
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <Button variant="secondary" disabled={busy || streaming} onclick={seed}>Restart ward</Button>
      <Button variant="secondary" disabled={busy || streaming} onclick={advance}>
        Advance one reading
      </Button>
      <Button variant="secondary" disabled={busy} onclick={stream}>
        {streaming ? 'Stop stream' : 'Stream'}
      </Button>
      <Button variant="secondary" disabled={busy || streaming} onclick={warm}>
        Warm explainer
      </Button>
      <Button variant="quiet" onclick={() => (dockOpen = !dockOpen)}>
        {dockOpen ? 'Hide pipeline' : 'Show pipeline'}
      </Button>
    </div>

    {#if message !== null}
      <p class="text-sm {failed ? 'text-insufficient-fg' : 'text-fg-secondary'}" role="status">
        {message}
      </p>
    {/if}
  </div>

  <!-- CLOSED, THE PANEL COSTS THE BOARD NO HEIGHT AT ALL. That is why the toggle lives in this bar
       rather than in a second one of its own. -->
  {#if dockOpen}
    <TelemetryDock onclose={() => (dockOpen = false)} />
  {/if}
</section>
