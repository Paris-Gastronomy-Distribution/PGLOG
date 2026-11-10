"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CollapseIcon,
  DownloadIcon,
  ExpandIcon,
  ShareIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "./icons";

/* ---------- Barre du haut ---------- */

interface TopBarProps {
  title: string;
  downloadUrl: string | null;
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  /** true : la barre flotte dans les marges latérales du livre. */
  floating: boolean;
  /** Largeur max du titre quand la barre flotte (place libre à gauche du livre). */
  titleMax?: number;
  onShare: () => void;
  onToggleFullscreen: () => void;
  ref?: Ref<HTMLElement>;
}

export function TopBar({ title, downloadUrl, fullscreenSupported, isFullscreen, floating, titleMax, onShare, onToggleFullscreen, ref }: TopBarProps) {
  return (
    <header ref={ref} className="v-top" data-floating={floating || undefined}>
      <h1 className="v-title" title={title} style={floating && titleMax ? { maxWidth: titleMax } : undefined}>
        {title}
      </h1>
      <div className="v-actions" data-actions>
        <button type="button" className="v-btn" onClick={onShare} aria-label="Partager le lien du catalogue">
          <ShareIcon />
          <span className="v-btn-label">Partager</span>
        </button>
        {downloadUrl && (
          <a className="v-btn v-btn--accent" href={downloadUrl} download aria-label="Télécharger le PDF">
            <DownloadIcon />
            <span className="v-btn-label">Télécharger</span>
          </a>
        )}
        {fullscreenSupported && (
          <button
            type="button"
            className="v-btn v-btn--icon"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        )}
      </div>
    </header>
  );
}

/* ---------- Slider de navigation ---------- */

interface SliderProps {
  /** Page courante, base 1. */
  value: number;
  max: number;
  disabled: boolean;
  onPreview: (index: number) => void;
  onCommit: (index: number) => void;
  onStep: (direction: 1 | -1) => void;
}

function PageSlider({ value, max, disabled, onPreview, onCommit, onStep }: SliderProps) {
  const [scrub, setScrub] = useState<number | null>(null);
  const scrubRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const shown = scrub ?? value;
  const frac = max > 1 ? (shown - 1) / (max - 1) : 0;

  const endDrag = () => {
    draggingRef.current = false;
    const v = scrubRef.current;
    scrubRef.current = null;
    setScrub(null);
    if (v !== null) onCommit(v - 1);
  };

  const onPointerDown = () => {
    draggingRef.current = true;
    window.addEventListener("pointerup", endDrag, { once: true });
    window.addEventListener("pointercancel", endDrag, { once: true });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Au clavier, le slider avance double page par double page.
    const keys: Record<string, () => void> = {
      ArrowRight: () => onStep(1),
      ArrowUp: () => onStep(1),
      ArrowLeft: () => onStep(-1),
      ArrowDown: () => onStep(-1),
      Home: () => onCommit(0),
      End: () => onCommit(max - 1),
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="v-slider" style={{ "--frac": frac } as CSSProperties}>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={shown}
        disabled={disabled}
        aria-label="Aller à la page"
        aria-valuetext={`Page ${shown} sur ${max}`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (draggingRef.current) {
            scrubRef.current = v;
            setScrub(v);
            onPreview(v - 1);
          } else {
            onCommit(v - 1);
          }
        }}
      />
      {scrub !== null && (
        <output className="v-slider-bubble" aria-hidden="true">
          Page {scrub}
        </output>
      )}
    </div>
  );
}

/* ---------- Barre du bas ---------- */

interface BottomBarProps {
  label: string;
  pageCount: number;
  sliderValue: number;
  canPrev: boolean;
  canNext: boolean;
  ready: boolean;
  zoomPercent: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  onPreview: (index: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function BottomBar(p: BottomBarProps) {
  return (
    <footer className="v-bottom">
      <nav className="v-bar" aria-label="Navigation dans le catalogue">
        <button type="button" className="v-btn v-btn--icon" onClick={() => p.onPrev()} disabled={!p.canPrev} aria-label="Page précédente">
          <ChevronLeft />
        </button>

        <PageSlider
          value={p.sliderValue}
          max={p.pageCount}
          disabled={!p.ready || p.pageCount < 2}
          onPreview={p.onPreview}
          onCommit={p.onGoTo}
          onStep={(d) => (d > 0 ? p.onNext() : p.onPrev())}
        />

        <span className="v-counter" aria-hidden="true">
          <b>{p.label}</b>
          <span className="v-counter-sep">/</span>
          {p.pageCount}
        </span>

        <button type="button" className="v-btn v-btn--icon" onClick={() => p.onNext()} disabled={!p.canNext} aria-label="Page suivante">
          <ChevronRight />
        </button>

        <div className="v-zoom-group" role="group" aria-label="Zoom">
          <button type="button" className="v-btn v-btn--icon v-btn--ghost" onClick={() => p.onZoomOut()} disabled={!p.canZoomOut} aria-label="Dézoomer">
            <ZoomOutIcon />
          </button>
          <button type="button" className="v-zoom-pct" onClick={() => p.onZoomReset()} aria-label="Réinitialiser le zoom">
            {p.zoomPercent} %
          </button>
          <button type="button" className="v-btn v-btn--icon v-btn--ghost" onClick={() => p.onZoomIn()} disabled={!p.canZoomIn} aria-label="Zoomer">
            <ZoomInIcon />
          </button>
        </div>
      </nav>
    </footer>
  );
}
