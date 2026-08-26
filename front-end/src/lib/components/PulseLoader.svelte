<!-- src/lib/components/PulseLoader.svelte
     CANONICAL DECLARATION — this file. No skill document holds a competing copy (CLAUDE.md rule 19);
     registered in `.claude/skills/bootstrap/SKILL.md` section 4.1b.

     THE SUPPLIED LOADING MARK — the app's loading indicator (**D-31**).

     It replaces a generic rotating circle, and the reason is not decoration: the boot screen and the
     navigation bar are the two places a clinician meets this app before any assessment exists, and a
     borrowed spinner says nothing about WHICH system is thinking. The product owner supplied
     `static/images/animation.gif` on 2026-08-19 and this renders that file.

     A GIF CANNOT BE PAUSED, and that is the whole reason this component is more than one `<img>`.
     There is no CSS property and no HTML attribute that stops an animated GIF, so
     `prefers-reduced-motion` has nothing to act on — the app's global reduced-motion block in
     `app.css` is powerless over it. The fix is a second image: `scripts/build-brand.mjs` decodes the
     GIF's first frame to `animation-still.png`, and CSS picks the still for anyone who asked not to
     be moved. Both are in the DOM, so there is no frame where neither is chosen.

     WHAT THIS IS NOT, and the distinction is load-bearing on a clinical screen. The mark is fixed
     artwork. It is NOT a waveform, NOT derived from any patient, and its frames never change — no
     reading, score, or measurement reaches it, and the component takes no clinical prop and never
     will. `CLAUDE.md` rule 12 bans reproducing the prototype's scripted clinical motion; nothing
     here is a value. Every call site pairs it with text that says exactly that (`U-01`).

     THE ARTWORK IS RED AT BOTH CALL SITES, which is a change from the harness's first draft and is
     recorded rather than hidden: the supplied file carries its own colours, so the plan to wear
     `fg-secondary` in-app is not available. **D-31** carries the mitigations and the open question
     for clinical — red near a risk band is the collision **D-20** exists about.
-->
<script lang="ts">
  import { assets } from '$app/paths';

  let {
    /** Rendered size in px. The artwork is square (47x47 as supplied). */
    size = 32,
    /** Layout only — margin, alignment. */
    class: klass = '',
    /**
     * Show the visible word `Loading` and the animating ellipsis beside the mark.
     *
     * It is `aria-hidden`, always. Every call site sits inside a `role="status"` region that already
     * carries the fuller sentence for assistive technology, and a second `Loading` there would make
     * a screen reader read `Loading Loading — no assessment is being displayed yet`.
     */
    label = true,
  }: { size?: number; class?: string; label?: boolean } = $props();

  /**
   * `static/`, not an `import` — deliberately.
   *
   * `src/app.html` renders the SAME two files, and it paints before any module has loaded, so it can
   * only reference a URL. Importing here would give the component a content-hashed copy of a file
   * the boot screen fetches by path: two URLs, two cache entries, two downloads of one 23 KB GIF,
   * and the boot mark and the app mark able to drift apart. One path, fetched once, shared.
   */
  const MOVING = `${assets}/images/animation.gif`;
  const STILL = `${assets}/images/animation-still.png`;
</script>

<!-- `alt=""` on both. Every call site renders the mandated U-01 sentence inside the same
     `role="status"` region, so the words are already there; a real `alt` would announce a second,
     redundant label, and two images each carrying one would announce it twice. -->
<span class={['pm-loader', klass]} style="--pm-loader-size: {size}px">
  <img class="pm-loader-moving" src={MOVING} alt="" width={size} height={size} />
  <img class="pm-loader-still" src={STILL} alt="" width={size} height={size} />
  {#if label}
    <!-- `aria-hidden` on the whole label, including the dots: the region's own sentence is what is
         announced. Reading three full stops aloud is noise even when the word beside them is not. -->
    <span class="pm-loader-label" aria-hidden="true"
      >Loading<span class="pm-loader-dots"><span>.</span><span>.</span><span>.</span></span></span
    >
  {/if}
</span>

<style>
  .pm-loader {
    display: inline-flex;
    flex: none;
    align-items: center;
  }

  /* NO `display` HERE, deliberately. `.pm-loader img` is (0,1,1) and `.pm-loader-still` is (0,1,0),
     so a `display: block` on this rule would outrank the `display: none` below and render the still
     frame permanently beside the moving one — two marks, and the reduced-motion swap silently doing
     nothing. Sizing only; visibility belongs to the single-class rules. */
  .pm-loader img {
    width: var(--pm-loader-size);
    height: var(--pm-loader-size);
  }

  /* MOVING IS THE DEFAULT and the still overrides it, not the other way round: a user agent that
     does not understand the query gets the animation, which is the state the indicator is for. */
  .pm-loader-moving {
    display: block;
  }

  .pm-loader-still {
    display: none;
  }

  .pm-loader-label {
    /* Inherits size and colour from the call site, so the bar and the boot screen each keep their
       own type scale rather than this component deciding one for both. */
    white-space: nowrap;
  }

  /* THE ELLIPSIS ANIMATES; THE WORD DOES NOT. Three dots fading in turn reads as "still working"
     without moving anything a clinician has to track. The dots are always PRESENT — they fade
     between full and low opacity rather than appearing and disappearing — so the label never
     changes width and never nudges the text beside it, which is the usual defect of a typed-out
     ellipsis. */
  .pm-loader-dots span {
    animation: pm-dots 1.4s ease-in-out infinite;
  }

  .pm-loader-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .pm-loader-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pm-dots {
    0%,
    60%,
    100% {
      opacity: 0.25;
    }
    30% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    /* A static, fully-visible ellipsis. The app's global reduced-motion block would freeze these at
       their END keyframe — 0.25 opacity — which is a barely-visible ellipsis rather than none, so
       the opacity is restored explicitly instead of left to a collapsed animation. */
    .pm-loader-dots span {
      animation: none;
      opacity: 1;
    }

    .pm-loader-moving {
      display: none;
    }
    .pm-loader-still {
      display: block;
    }
  }
</style>
