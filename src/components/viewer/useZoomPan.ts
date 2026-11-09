"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Transform {
  s: number;
  x: number;
  y: number;
}

interface Options {
  stageRef: RefObject<HTMLElement | null>;
  /** Élément transformé (translate + scale, origine 0 0). */
  contentRef: RefObject<HTMLElement | null>;
  /** Rectangle visible du livre, en coordonnées de la scène, à l'échelle 1. */
  getContentRect: () => Rect | null;
  maxScale: number;
}

const PAN_MARGIN = 24;

/**
 * Zoom + déplacement du livre par transformation CSS.
 * Le style est écrit directement sur l'élément (60 fps pendant les gestes) ;
 * l'état React ne sert qu'à l'interface (pourcentage, boutons).
 * `will-change` n'est actif que pendant un geste : au repos le navigateur
 * re-rastérise à l'échelle finale et le texte reste net.
 */
export function useZoomPan({ stageRef, contentRef, getContentRect, maxScale }: Options) {
  const tRef = useRef<Transform>({ s: 1, x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const maxRef = useRef(maxScale);

  useEffect(() => {
    maxRef.current = maxScale;
  }, [maxScale]);

  const stageSize = useCallback(() => {
    const el = stageRef.current;
    return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 0, h: 0 };
  }, [stageRef]);

  /** Contraint la translation pour garder le livre à l'écran. */
  const clamp = useCallback(
    (t: Transform): Transform => {
      if (t.s <= 1) return { s: 1, x: 0, y: 0 };
      const r = getContentRect();
      const { w, h } = stageSize();
      if (!r || !w || !h) return t;
      const axis = (pos: number, start: number, size: number, view: number) => {
        const scaled = size * t.s;
        if (scaled <= view) return (view - scaled) / 2 - start * t.s;
        const min = view - (start + size) * t.s - PAN_MARGIN;
        const max = -start * t.s + PAN_MARGIN;
        return Math.min(max, Math.max(min, pos));
      };
      return { s: t.s, x: axis(t.x, r.x, r.w, w), y: axis(t.y, r.y, r.h, h) };
    },
    [getContentRect, stageSize],
  );

  const apply = useCallback(
    (t: Transform, animate: boolean) => {
      tRef.current = t;
      const el = contentRef.current;
      if (el) {
        el.style.transition = animate ? "transform 220ms cubic-bezier(.2,.7,.2,1)" : "none";
        el.style.transform = t.s === 1 ? "" : `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.s})`;
      }
      setScale((prev) => (Math.abs(prev - t.s) < 0.001 ? prev : t.s));
    },
    [contentRef],
  );

  /** Signale un geste en cours (will-change) ; le retire 160 ms après la fin. */
  const touchGesture = useCallback(() => {
    const el = contentRef.current;
    if (el) el.style.willChange = "transform";
    clearTimeout(gestureTimer.current);
    gestureTimer.current = setTimeout(() => {
      if (contentRef.current) contentRef.current.style.willChange = "";
    }, 160);
  }, [contentRef]);

  /** Zoom vers `s` en gardant fixe le point `origin` (coordonnées scène). */
  const zoomTo = useCallback(
    (s: number, origin?: { x: number; y: number }, animate = true, loose = false) => {
      const cur = tRef.current;
      const min = loose ? 0.85 : 1;
      const next = Math.min(maxRef.current, Math.max(min, s));
      const { w, h } = stageSize();
      const o = origin ?? { x: w / 2, y: h / 2 };
      const k = next / cur.s;
      const t = { s: next, x: o.x - (o.x - cur.x) * k, y: o.y - (o.y - cur.y) * k };
      apply(loose ? t : clamp(t), animate);
    },
    [apply, clamp, stageSize],
  );

  const zoomBy = useCallback(
    (factor: number, origin?: { x: number; y: number }, animate = true) => zoomTo(tRef.current.s * factor, origin, animate),
    [zoomTo],
  );

  const panTo = useCallback(
    (x: number, y: number, animate = false) => apply(clamp({ s: tRef.current.s, x, y }), animate),
    [apply, clamp],
  );

  /** Pose une transformation brute (pincement en cours), sans contrainte. */
  const setRaw = useCallback((t: Transform) => apply(t, false), [apply]);

  const reset = useCallback((animate = true) => apply({ s: 1, x: 0, y: 0 }, animate), [apply]);

  /** Fin de geste : ramène dans les bornes (rebond). */
  const settle = useCallback(() => {
    const t = tRef.current;
    if (t.s < 1.04) reset(true);
    else if (t.s > maxRef.current) zoomTo(maxRef.current, undefined, true);
    else apply(clamp(t), true);
  }, [apply, clamp, reset, zoomTo]);

  // Molette / trackpad : zoom centré sur le curseur.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-no-zoom]")) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.clientHeight : 1;
      const dy = e.deltaY * unit;
      const speed = e.ctrlKey ? 0.01 : 0.0018; // ctrl+molette = pincement trackpad
      const factor = Math.exp(-Math.max(-120, Math.min(120, dy)) * speed);
      const rect = stage.getBoundingClientRect();
      touchGesture();
      zoomTo(tRef.current.s * factor, { x: e.clientX - rect.left, y: e.clientY - rect.top }, false);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [stageRef, zoomTo, touchGesture]);

  useEffect(() => () => clearTimeout(gestureTimer.current), []);

  return {
    scale,
    isZoomed: scale > 1.001,
    get: () => tRef.current,
    zoomTo,
    zoomBy,
    panTo,
    setRaw,
    reset,
    settle,
    touchGesture,
  };
}

export type ZoomPan = ReturnType<typeof useZoomPan>;
