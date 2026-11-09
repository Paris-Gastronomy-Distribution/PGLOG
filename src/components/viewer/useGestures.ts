"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ZoomPan } from "./useZoomPan";

interface Point {
  x: number;
  y: number;
}

interface TouchOptions {
  enabled: boolean;
  stageRef: RefObject<HTMLElement | null>;
  zoom: ZoomPan;
  onNext: (corner: "top" | "bottom") => void;
  onPrev: (corner: "top" | "bottom") => void;
}

const SWIPE_MIN = 40;
const SWIPE_MAX_MS = 700;
const TAP_MOVE = 10;
const TAP_MS = 300;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_ZOOM = 2.5;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Gestes tactiles (écrans tactiles uniquement) sur la scène :
 * - glisser gauche/droite → page suivante/précédente (animation StPageFlip) ;
 * - toucher le bord gauche/droit → page précédente/suivante ;
 * - pincer → zoom, double toucher → zoom ×2,5 / retour ;
 * - glisser quand zoomé → déplacement.
 */
export function useTouchGestures({ enabled, stageRef, zoom, onNext, onPrev }: TouchOptions) {
  const cb = useRef({ zoom, onNext, onPrev });
  useEffect(() => {
    cb.current = { zoom, onNext, onPrev };
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!enabled || !stage) return;

    const pointers = new Map<number, Point>();
    let mode: "none" | "swipe" | "pan" | "pinch" = "none";
    let start = { p: { x: 0, y: 0 }, t: 0, tx: 0, ty: 0, s: 1, d: 1, m: { x: 0, y: 0 } };
    let lastTap: { t: number; p: Point } | null = null;
    let tapTimer: ReturnType<typeof setTimeout> | undefined;

    const local = (e: PointerEvent): Point => {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const ignore = (e: PointerEvent) =>
      e.pointerType === "mouse" || (e.target instanceof Element && !!e.target.closest("button, a, input, [data-no-zoom]"));

    const beginSingle = (p: Point) => {
      const t = cb.current.zoom.get();
      start = { ...start, p, t: performance.now(), tx: t.x, ty: t.y, s: t.s };
      mode = t.s > 1.001 ? "pan" : "swipe";
    };

    const beginPinch = () => {
      const [a, b] = [...pointers.values()];
      const t = cb.current.zoom.get();
      start = { ...start, d: Math.max(1, dist(a, b)), m: mid(a, b), s: t.s, tx: t.x, ty: t.y };
      mode = "pinch";
      clearTimeout(tapTimer);
    };

    const onDown = (e: PointerEvent) => {
      if (ignore(e)) return;
      stage.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, local(e));
      if (pointers.size === 1) beginSingle(local(e));
      else if (pointers.size === 2) beginPinch();
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      const { zoom: z } = cb.current;

      if (mode === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const m = mid(a, b);
        const s = Math.min(6, Math.max(0.85, (start.s * dist(a, b)) / start.d));
        const k = s / start.s;
        z.touchGesture();
        z.setRaw({ s, x: m.x - (start.m.x - start.tx) * k, y: m.y - (start.m.y - start.ty) * k });
      } else if (mode === "pan") {
        z.touchGesture();
        z.panTo(start.tx + (p.x - start.p.x), start.ty + (p.y - start.p.y));
      }
    };

    const handleTap = (p: Point) => {
      const now = performance.now();
      const { zoom: z, onNext: next, onPrev: previous } = cb.current;
      if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && dist(lastTap.p, p) < 30) {
        clearTimeout(tapTimer);
        lastTap = null;
        if (z.get().s > 1.001) z.reset(true);
        else z.zoomTo(DOUBLE_TAP_ZOOM, p, true);
        return;
      }
      lastTap = { t: now, p };
      clearTimeout(tapTimer);
      if (z.get().s > 1.001) return;
      tapTimer = setTimeout(() => {
        const w = stage.clientWidth;
        const corner = p.y < stage.clientHeight / 2 ? "top" : "bottom";
        if (p.x < w * 0.28) previous(corner);
        else if (p.x > w * 0.72) next(corner);
      }, DOUBLE_TAP_MS);
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.delete(e.pointerId);
      const { zoom: z, onNext: next, onPrev: previous } = cb.current;

      if (mode === "pinch") {
        if (pointers.size === 1) {
          // Un doigt reste posé : on enchaîne sur un déplacement.
          z.settle();
          beginSingle([...pointers.values()][0]);
          mode = z.get().s > 1.001 ? "pan" : "none";
        } else if (pointers.size === 0) {
          z.settle();
          mode = "none";
        }
        return;
      }
      if (pointers.size > 0) return;

      const dx = p.x - start.p.x;
      const dy = p.y - start.p.y;
      const dt = performance.now() - start.t;
      const isTap = Math.abs(dx) < TAP_MOVE && Math.abs(dy) < TAP_MOVE && dt < TAP_MS;

      if (mode === "swipe" && !isTap) {
        if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < SWIPE_MAX_MS) {
          const corner = start.p.y < stage.clientHeight / 2 ? "top" : "bottom";
          if (dx < 0) next(corner);
          else previous(corner);
        }
      } else if (isTap && e.type === "pointerup") {
        handleTap(p);
      }
      mode = "none";
    };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    return () => {
      clearTimeout(tapTimer);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
    };
  }, [enabled, stageRef]);
}

/**
 * Déplacement à la souris quand le livre est zoomé (ordinateur).
 * Un calque transparent couvre la scène : StPageFlip ne reçoit plus les
 * clics (pas de page tournée par erreur), et on bloque la propagation des
 * mouvements jusqu'à `window` (pas de coin replié pendant le déplacement).
 */
export function usePanOverlay(overlayRef: RefObject<HTMLElement | null>, zoom: ZoomPan, active: boolean) {
  const zRef = useRef(zoom);
  useEffect(() => {
    zRef.current = zoom;
  });

  useEffect(() => {
    const el = overlayRef.current;
    if (!active || !el) return;
    let drag: { x: number; y: number; tx: number; ty: number } | null = null;

    const stop = (e: Event) => e.stopPropagation();
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const t = zRef.current.get();
      drag = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y };
      el.dataset.dragging = "true";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      zRef.current.touchGesture();
      zRef.current.panTo(drag.tx + e.clientX - drag.x, drag.ty + e.clientY - drag.y);
    };
    const onUp = () => {
      drag = null;
      delete el.dataset.dragging;
    };
    const onDblClick = () => zRef.current.reset(true);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("dblclick", onDblClick);
    for (const type of ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"]) {
      el.addEventListener(type, stop);
    }
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("dblclick", onDblClick);
      for (const type of ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"]) {
        el.removeEventListener(type, stop);
      }
    };
  }, [overlayRef, active]);
}
