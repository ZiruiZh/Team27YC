import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Elastic overscroll for a scroll container: when you scroll past the top or
 * bottom, the content stretches with resistance and springs back on release.
 * `scroller` is the element with overflow: auto, `content` is its inner wrapper.
 */
export function useRubberBand(scroller: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const MAX = 140;
    let offset = 0;
    let releaseTimer = 0;
    let raf = 0;
    let touchY: number | null = null;

    const atTop = () => el.scrollTop <= 0;
    const atBottom = () => Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;

    const paint = (animate: boolean) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        inner.style.transition = animate ? "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
        inner.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : "";
      });
    };

    const pull = (delta: number) => {
      // Resistance grows as the stretch approaches MAX.
      const resistance = 1 - Math.min(Math.abs(offset) / MAX, 0.95);
      offset = Math.max(-MAX, Math.min(MAX, offset + delta * 0.45 * resistance));
      paint(false);
    };

    const release = () => {
      if (!offset) return;
      offset = 0;
      paint(true);
    };

    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaY;
      const overTop = atTop() && (dy < 0 || offset > 0);
      const overBottom = atBottom() && (dy > 0 || offset < 0);
      if (!overTop && !overBottom) {
        if (offset) release();
        return;
      }
      pull(-dy);
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(release, 110);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null) return;
      const y = e.touches[0].clientY;
      const dy = y - touchY;
      touchY = y;
      if ((atTop() && (dy > 0 || offset > 0)) || (atBottom() && (dy < 0 || offset < 0))) pull(dy * 1.4);
    };
    const onTouchEnd = () => {
      touchY = null;
      release();
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      window.clearTimeout(releaseTimer);
      cancelAnimationFrame(raf);
      inner.style.transform = "";
    };
  }, [scroller, content]);
}
