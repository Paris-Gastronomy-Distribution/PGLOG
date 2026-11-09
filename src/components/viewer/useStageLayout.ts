"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { chooseMode, computeLayout, stagePadding, type BookLayout } from "./layout";

const MODE_SWITCH_DELAY = 180;

function same(a: BookLayout | null, b: BookLayout): boolean {
  return (
    !!a &&
    a.mode === b.mode &&
    a.pageW === b.pageW &&
    a.pageH === b.pageH &&
    Math.round(a.stageW) === Math.round(b.stageW) &&
    Math.round(a.stageH) === Math.round(b.stageH)
  );
}

/**
 * Mesure la scène (ResizeObserver) et calcule la taille du livre.
 * - Changement de taille seul : appliqué à la frame suivante (redimensionnement léger).
 * - Changement de mode (simple ↔ double) : différé de 180 ms (ré-initialisation
 *   du moteur), en gardant entre-temps l'ancien mode à la nouvelle taille.
 */
export function useStageLayout(stageRef: RefObject<HTMLElement | null>, ratio: number): BookLayout | null {
  const [layout, setLayout] = useState<BookLayout | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    let current: BookLayout | null = null;
    let raf = 0;
    let modeTimer: ReturnType<typeof setTimeout> | undefined;

    const commit = (next: BookLayout) => {
      if (same(current, next)) return;
      current = next;
      setLayout(next);
    };

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = stagePadding(vw);
      const mode = chooseMode(vw, vh);

      if (!current || current.mode === mode) {
        clearTimeout(modeTimer);
        commit(computeLayout(width, height, ratio, mode, pad));
        return;
      }
      // Mode différent : on garde l'ancien mode, redimensionné, puis on bascule.
      commit(computeLayout(width, height, ratio, current.mode, pad));
      clearTimeout(modeTimer);
      modeTimer = setTimeout(() => {
        const r = el.getBoundingClientRect();
        commit(computeLayout(r.width, r.height, ratio, chooseMode(window.innerWidth, window.innerHeight), stagePadding(window.innerWidth)));
      }, MODE_SWITCH_DELAY);
    };

    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    window.addEventListener("orientationchange", measure);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(modeTimer);
      window.removeEventListener("orientationchange", measure);
    };
  }, [stageRef, ratio]);

  return layout;
}
