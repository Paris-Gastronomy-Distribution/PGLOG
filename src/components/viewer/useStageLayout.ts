"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { chooseMode, computeLayout, stagePadding, type BookLayout, type HeaderMetrics } from "./layout";

const MODE_SWITCH_DELAY = 180;
/** Largeur minimale gardée pour le titre quand il flotte à gauche du livre. */
const TITLE_MIN = 140;
/** Écart entre les éléments flottants et le bord du livre. */
const SIDE_GAP = 28;

function same(a: BookLayout | null, b: BookLayout): boolean {
  return (
    !!a &&
    a.mode === b.mode &&
    a.pageW === b.pageW &&
    a.pageH === b.pageH &&
    a.offsetTop === b.offsetTop &&
    Math.round(a.sideSpace) === Math.round(b.sideSpace) &&
    Math.round(a.stageW) === Math.round(b.stageW) &&
    Math.round(a.stageH) === Math.round(b.stageH)
  );
}

function headerMetrics(header: HTMLElement | null): HeaderMetrics {
  if (!header) return { height: 0, sideNeed: 0 };
  const actions = header.querySelector<HTMLElement>("[data-actions]");
  const actionsW = actions?.offsetWidth ?? 0;
  return { height: header.offsetHeight, sideNeed: Math.max(actionsW, TITLE_MIN) + SIDE_GAP };
}

/**
 * Mesure la scène (ResizeObserver) et calcule la taille du livre.
 * - Changement de taille seul : appliqué à la frame suivante (redimensionnement léger).
 * - Changement de mode (simple ↔ double) : différé de 180 ms (ré-initialisation
 *   du moteur), en gardant entre-temps l'ancien mode à la nouvelle taille.
 */
export function useStageLayout(
  stageRef: RefObject<HTMLElement | null>,
  headerRef: RefObject<HTMLElement | null>,
  ratio: number,
): BookLayout | null {
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

    const compute = (mode: BookLayout["mode"]) => {
      const { width, height } = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return computeLayout(width, height, ratio, mode, stagePadding(vw, vh), headerMetrics(headerRef.current));
    };

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const mode = chooseMode(window.innerWidth, window.innerHeight);

      if (!current || current.mode === mode) {
        clearTimeout(modeTimer);
        commit(compute(mode));
        return;
      }
      // Mode différent : on garde l'ancien mode, redimensionné, puis on bascule.
      commit(compute(current.mode));
      clearTimeout(modeTimer);
      modeTimer = setTimeout(() => commit(compute(chooseMode(window.innerWidth, window.innerHeight))), MODE_SWITCH_DELAY);
    };

    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    // Les boutons de la barre du haut peuvent changer (plein écran détecté après coup…).
    const actions = headerRef.current?.querySelector("[data-actions]");
    if (actions) ro.observe(actions);
    window.addEventListener("orientationchange", measure);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(modeTimer);
      window.removeEventListener("orientationchange", measure);
    };
  }, [stageRef, headerRef, ratio]);

  return layout;
}
