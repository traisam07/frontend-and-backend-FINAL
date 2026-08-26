<!-- src/routes/patients/+layout.svelte
     THE ONLY THING THIS LAYOUT EXISTS FOR: to own the local review marks for the whole `/patients`
     subtree.

     Each screen builds its own `TriageBoard` — the board from the loaded list, Patient Detail from an
     empty one — so a mark made on Patient Detail died on the way back to the board, and the board's
     review history was permanently empty. Held here, the marks survive board → detail → board, which
     is the only path a clinician actually takes.

     In CONTEXT, never in module scope: it maps patient ids to times, which is identity data, and
     module scope is shared. Same rule and same pattern as the announcer in the root layout.

     It renders no chrome. A layout with a component is not a licence to put something on screen. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ReviewLog } from '$lib/state/review-log.svelte';
  import { setReviewLog } from '$lib/state/context';

  let { children }: { children: Snippet } = $props();

  setReviewLog(new ReviewLog());
</script>

{@render children()}
