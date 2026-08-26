// src/lib/actions/measure.ts
// CANONICAL DECLARATION — this file.
//
// PUBLISH AN ELEMENT'S HEIGHT AS A CSS VARIABLE, so that whatever sticks below it can never be
// wrong about where it sits.
//
// This exists because of a real defect. The board's search bar was pinned with a hard-coded
// `top-[5.25rem]`, measured against a header that had two rows. When the header lost its second row
// the number stayed, and the bar stuck 11–27px BELOW the header depending on width — a gap that
// scrolled patient cards slid through, between two bars that are supposed to be flush. Nothing
// failed; the layout just quietly stopped meeting itself.
//
// A magic number describing another element's size is a promise to remember. This measures instead.

/**
 * Sets `--<name>` on the document root to this element's border-box height, and keeps it current
 * through resizes, font swaps, and content changes.
 *
 * On the document root rather than the element, because the consumers are elsewhere in the tree —
 * the sticky bar is not a child of the header, and the selected-patient panel is not a child of
 * either.
 *
 * Cleanup resets it to `0px`, which matters: `/login` renders no header at all, and a stale height
 * left behind would push that screen's content down by a header that is not there.
 */
export function publishHeight(node: HTMLElement, name: string) {
  const root = document.documentElement;

  const write = () => {
    // `getBoundingClientRect` rather than `offsetHeight`: it is sub-pixel, and a half-pixel error
    // repeated down a sticky stack is a visible seam.
    root.style.setProperty(name, `${node.getBoundingClientRect().height}px`);
  };

  write();
  const observer = new ResizeObserver(write);
  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
      root.style.setProperty(name, '0px');
    },
  };
}
