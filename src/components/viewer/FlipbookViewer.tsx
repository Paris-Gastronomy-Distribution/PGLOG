"use client";

import "./viewer.css";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { accentPalette } from "@/lib/color";
import type { ViewerCatalog } from "@/lib/types";
import { CheckIcon, RefreshIcon } from "./icons";
import { pageLabel, spreadStart, visiblePart } from "./layout";
import { useFlipbook, type HdMode } from "./useFlipbook";
import { usePanOverlay, useTouchGestures } from "./useGestures";
import { useStageLayout } from "./useStageLayout";
import { useZoomPan } from "./useZoomPan";
import { BottomBar, TopBar } from "./ViewerControls";

type FullscreenDoc = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

/** Densité de l'écran (pixels physiques par pixel CSS), suivie si la fenêtre change d'écran ou de zoom. */
function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const update = () => {
      setDpr(window.devicePixelRatio || 1);
      mq?.removeEventListener("change", update);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      mq.addEventListener("change", update);
    };
    update();
    return () => mq?.removeEventListener("change", update);
  }, []);
  return dpr;
}

/** Au-delà de 10 % d'agrandissement de la page par défaut, on passe à la HD. */
const HD_THRESHOLD = 1.1;

export default function FlipbookViewer({ catalog }: { catalog: ViewerCatalog }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const pageCount = catalog.pages.length;
  const ratio = catalog.pageWidth / catalog.pageHeight;
  const palette = useMemo(() => accentPalette(catalog.accentColor), [catalog.accentColor]);

  const touchMode = useCoarsePointer();
  const headerRef = useRef<HTMLElement>(null);
  const layout = useStageLayout(stageRef, headerRef, ratio);
  const dpr = useDevicePixelRatio();
  const [hd, setHd] = useState<HdMode>("off");
  const book = useFlipbook({
    hostRef,
    pages: catalog.pages,
    hdPages: catalog.hdPages,
    hd,
    layout,
    touchMode,
    title: catalog.title,
  });

  /* ---------- Géométrie : partie visible, recentrage, ombre ---------- */

  const mode = layout?.mode ?? "double";
  const displayIndex = book.target ?? book.current;
  const visible = visiblePart(displayIndex, pageCount, mode);
  const pageW = layout?.pageW ?? 0;
  const bookW = mode === "double" ? pageW * 2 : pageW;
  // En double page, la couverture seule (ou la dernière page seule) est recentrée.
  const shift = mode === "double" ? (visible === "right" ? -pageW / 2 : visible === "left" ? pageW / 2 : 0) : 0;
  const shadowLeft = mode === "double" && visible === "right" ? pageW : 0;
  const shadowWidth = mode === "double" && visible !== "both" ? pageW : bookW;
  // Ombre au sol : placée par transform pour rester fluide pendant le tour de page.
  const groundTransform = `translate3d(${shadowLeft}px,0,0) scaleX(${bookW ? shadowWidth / bookW : 1})`;

  const getContentRect = useCallback(() => {
    if (!layout) return null;
    const w = shadowWidth;
    const top = layout.offsetTop;
    return { x: (layout.stageW - w) / 2, y: top + (layout.stageH - top - layout.pageH) / 2, w, h: layout.pageH };
  }, [layout, shadowWidth]);

  const maxScale = layout ? Math.min(4, Math.max(2, 2000 / Math.max(1, layout.pageW))) : 3;
  const zoom = useZoomPan({ stageRef, contentRef: zoomRef, getContentRect, maxScale });
  const { reset: resetZoom, zoomBy, isZoomed, scale } = zoom;

  // Pixels physiques nécessaires pour afficher une page nette, à 100 % puis au zoom actuel.
  const hdMode: HdMode = (() => {
    if (!catalog.hdPages || !layout) return "off";
    const limit = catalog.pageWidth * HD_THRESHOLD;
    const needed = layout.pageW * dpr;
    if (needed > limit) return "screen";
    return needed * scale > limit ? "zoom" : "off";
  })();
  useEffect(() => setHd(hdMode), [hdMode]);

  // Le zoom revient à 100 % quand la page ou la mise en page change.
  const currentPage = book.current;
  useEffect(() => {
    resetZoom(false);
  }, [currentPage, layout?.mode, layout?.pageW, layout?.pageH, resetZoom]);

  // Pendant le zoom, la souris déplace la vue au lieu de tourner les pages.
  const { setInteractive } = book;
  useEffect(() => {
    setInteractive(!isZoomed);
  }, [isZoomed, setInteractive, book.ready]);

  /* ---------- Navigation ---------- */

  const { next: bookNext, prev: bookPrev, goTo: bookGoTo, preload } = book;
  const next = useCallback(
    (corner?: "top" | "bottom") => {
      if (isZoomed) resetZoom(true);
      bookNext(corner);
    },
    [isZoomed, resetZoom, bookNext],
  );
  const prev = useCallback(
    (corner?: "top" | "bottom") => {
      if (isZoomed) resetZoom(true);
      bookPrev(corner);
    },
    [isZoomed, resetZoom, bookPrev],
  );
  const goTo = useCallback(
    (i: number) => {
      if (isZoomed) resetZoom(true);
      bookGoTo(i);
    },
    [isZoomed, resetZoom, bookGoTo],
  );

  useTouchGestures({ enabled: touchMode, stageRef, zoom, onNext: next, onPrev: prev });
  usePanOverlay(overlayRef, zoom, !touchMode && isZoomed);

  /* ---------- Toast ---------- */

  // Le texte reste en place pendant le fondu de sortie (`visible` passe à false).
  const [toast, setToast] = useState<{ text: string; id: number; visible: boolean } | null>(null);
  const showToast = useCallback((text: string) => setToast({ text, id: Date.now(), visible: true }), []);
  const toastId = toast?.visible ? toast.id : null;
  useEffect(() => {
    if (toastId === null) return;
    const t = setTimeout(() => setToast((cur) => (cur && cur.id === toastId ? { ...cur, visible: false } : cur)), 2400);
    return () => clearTimeout(t);
  }, [toastId]);

  /* ---------- Partage ---------- */

  const share = useCallback(async () => {
    const url = `${window.location.origin}/c/${catalog.slug}`;
    if (touchMode && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: catalog.title, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    const ok = await copyToClipboard(url);
    showToast(ok ? "Lien copié" : "Copie impossible, sélectionnez l'adresse du navigateur");
  }, [catalog.slug, catalog.title, touchMode, showToast]);

  /* ---------- Plein écran ---------- */

  const [fsSupported, setFsSupported] = useState(false);
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const d = document as FullscreenDoc;
    setFsSupported(Boolean(d.fullscreenEnabled || d.webkitFullscreenEnabled));
    const onChange = () => setIsFs(Boolean(d.fullscreenElement || d.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const d = document as FullscreenDoc;
    const el = rootRef.current as FullscreenEl | null;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
      } else if (el) {
        await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen?.());
      }
    } catch {
      showToast("Plein écran indisponible sur cet appareil");
    }
  }, [showToast]);

  /* ---------- Clavier ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if ((e.key === " " || e.key === "Enter") && target?.closest("button, a")) return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          prev();
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(pageCount - 1);
          break;
        case "+":
        case "=":
          zoomBy(1.25);
          break;
        case "-":
        case "_":
          zoomBy(0.8);
          break;
        case "0":
          resetZoom(true);
          break;
        case "Escape": {
          const d = document as FullscreenDoc;
          if (isZoomed) resetZoom(true);
          else if (d.fullscreenElement || d.webkitFullscreenElement) void toggleFullscreen();
          else return;
          break;
        }
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, zoomBy, resetZoom, isZoomed, toggleFullscreen, pageCount]);

  /* ---------- Rendu ---------- */

  const label = pageLabel(book.current, pageCount, mode);
  const announce =
    label.includes("–") ? `Pages ${label.replace("–", " et ")} sur ${pageCount}` : `Page ${label} sur ${pageCount}`;

  const themeVars = {
    "--accent": palette.accent,
    "--accent-ui": palette.ui,
    "--on-accent": palette.onUi,
    "--page-ratio": `${catalog.pageWidth} / ${catalog.pageHeight}`,
  } as CSSProperties;

  return (
    <div ref={rootRef} className="viewer" style={themeVars} data-touch={touchMode || undefined}>
      <div className="v-main">
        <main
          ref={stageRef}
          className="v-stage"
          aria-roledescription="livre"
          aria-label={catalog.title}
          data-zoomed={isZoomed || undefined}
        >
          {!layout && <div className="v-placeholder" aria-hidden="true" />}

          {layout && (
            <div ref={zoomRef} className="v-zoom" style={{ paddingTop: layout.offsetTop }}>
              <div className="v-shift" style={{ transform: shift ? `translate3d(${shift}px,0,0)` : undefined }}>
                <div className="v-book" style={{ width: bookW, height: layout.pageH }}>
                  {mode === "double" ? (
                    <>
                      <div className="v-book-shadow" style={{ left: 0, width: pageW }} data-hidden={visible === "right" || undefined} aria-hidden="true" />
                      <div className="v-book-shadow" style={{ left: pageW, width: pageW }} data-hidden={visible === "left" || undefined} aria-hidden="true" />
                    </>
                  ) : (
                    <div className="v-book-shadow" style={{ left: 0, width: bookW }} aria-hidden="true" />
                  )}
                  <div className="v-book-ground" style={{ width: bookW, transform: groundTransform }} aria-hidden="true" />
                  {!book.ready && !book.error && (
                    <div className="v-book-skeleton" style={{ left: shadowLeft, width: shadowWidth }} aria-hidden="true" />
                  )}
                  <div ref={hostRef} className="v-book-host" />
                </div>
              </div>
            </div>
          )}

          {!touchMode && isZoomed && <div ref={overlayRef} className="v-pan" aria-hidden="true" />}

          {touchMode && isZoomed && (
            <button type="button" className="v-btn v-zoom-chip" onClick={() => resetZoom(true)} aria-label="Réinitialiser le zoom">
              {Math.round(scale * 100)} %
            </button>
          )}

          {book.error && (
            <div className="v-error" role="alert">
              <p>{book.error}</p>
              <button type="button" className="v-btn" onClick={book.retry}>
                <RefreshIcon />
                Réessayer
              </button>
            </div>
          )}

          <p className="sr-only" aria-live="polite">
            {book.ready ? announce : "Chargement du catalogue"}
          </p>
        </main>

        {/* Barre du haut posée sur la scène : elle flotte dans les marges du livre quand il y a la place. */}
        <TopBar
          ref={headerRef}
          title={catalog.title}
          downloadUrl={catalog.downloadUrl}
          fullscreenSupported={fsSupported}
          isFullscreen={isFs}
          floating={Boolean(layout && layout.offsetTop === 0)}
          titleMax={layout ? Math.max(120, Math.floor(layout.sideSpace - 40)) : undefined}
          onShare={share}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

      <BottomBar
        label={label}
        pageCount={pageCount}
        sliderValue={book.current + 1}
        canPrev={book.ready && book.current > 0}
        canNext={book.ready && book.current < spreadStart(pageCount - 1, pageCount, mode)}
        ready={book.ready}
        zoomPercent={Math.round(scale * 100)}
        canZoomIn={scale < maxScale - 0.001}
        canZoomOut={isZoomed}
        onPrev={prev}
        onNext={next}
        onGoTo={goTo}
        onPreview={preload}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onZoomReset={() => resetZoom(true)}
      />

      <div className="v-toast" data-show={toast?.visible ? "" : undefined} role="status" aria-live="polite">
        {toast && (
          <>
            <CheckIcon className="v-toast-icon" />
            {toast.text}
          </>
        )}
      </div>
    </div>
  );
}
