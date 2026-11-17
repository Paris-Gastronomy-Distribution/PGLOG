"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { PageFlip } from "page-flip";
import { nextSpreadStart, prevSpreadStart, spreadStart, type BookLayout } from "./layout";

/**
 * Pages haute définition voulues :
 *   - "off"    : pages par défaut partout ;
 *   - "zoom"   : HD pour les pages visibles (zoom en cours) ;
 *   - "screen" : HD pour la double page visible et ses voisines (écran très dense).
 */
export type HdMode = "off" | "zoom" | "screen";

/** Pages chargées d'emblée (spécification : les 4 premières). */
const EAGER_PAGES = 4;
/** Fenêtre de préchargement autour de la page courante. */
const PRELOAD_BEHIND = 2;
const PRELOAD_AHEAD = 6;
const FLIP_DURATION = 750;

interface Options {
  /** Élément géré par React dans lequel le conteneur StPageFlip est inséré. */
  hostRef: RefObject<HTMLDivElement | null>;
  pages: string[];
  /** Pages haute définition (même ordre), ou null. */
  hdPages: string[] | null;
  hd: HdMode;
  layout: BookLayout | null;
  /** Écran tactile : gestes gérés par le viewer, pas par StPageFlip. */
  touchMode: boolean;
  title: string;
}

/* ---------- Pages (DOM impératif, réutilisé entre ré-initialisations) ---------- */

function createPageElements(urls: string[], hdUrls: string[] | null, title: string): HTMLElement[] {
  return urls.map((url, i) => {
    const page = document.createElement("div");
    page.className = "fb-page";
    page.dataset.index = String(i);
    page.dataset.src = url;
    if (hdUrls?.[i]) page.dataset.hd = hdUrls[i];

    const skeleton = document.createElement("div");
    skeleton.className = "fb-page__skeleton";

    const img = document.createElement("img");
    img.className = "fb-page__img";
    img.alt = `${title} — page ${i + 1}`;
    img.decoding = "async";
    img.draggable = false;

    const error = document.createElement("div");
    error.className = "fb-page__error";
    error.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><path d="M4 4l16 16"/></svg>';
    const label = document.createElement("span");
    label.textContent = `Page ${i + 1} indisponible`;
    error.appendChild(label);

    const gutter = document.createElement("div");
    gutter.className = "fb-page__gutter";

    page.append(skeleton, img, error, gutter);
    return page;
  });
}

function loadPage(page: HTMLElement | undefined) {
  if (!page || page.dataset.state) return;
  const img = page.querySelector("img");
  const src = page.dataset.src;
  if (!img || !src) return;

  page.dataset.state = "loading";
  let retried = false;
  img.onload = () => {
    // Image décodée avant d'être affichée : pas d'à-coup au milieu d'un tour de page.
    void img
      .decode()
      .catch(() => undefined)
      .then(() => {
        page.dataset.state = "loaded";
      });
  };
  img.onerror = () => {
    // Page HD illisible : retour à la page par défaut, sans afficher d'erreur.
    if (page.dataset.hdState === "loaded") {
      page.dataset.hdState = "error";
      img.src = src;
      return;
    }
    if (!retried) {
      retried = true;
      img.src = `${src}${src.includes("?") ? "&" : "?"}retry=${Date.now()}`;
      return;
    }
    page.dataset.state = "error";
  };
  img.src = src;
}

/**
 * Passe une page en haute définition. L'image HD est téléchargée et décodée
 * à part, puis substituée : la page reste affichée pendant tout ce temps,
 * sans clignotement.
 */
function upgradePage(page: HTMLElement | undefined) {
  const hd = page?.dataset.hd;
  const img = page?.querySelector("img");
  if (!page || !hd || !img || page.dataset.hdState) return;

  loadPage(page);
  page.dataset.hdState = "loading";
  const probe = new Image();
  probe.decoding = "async";
  probe.onload = () => {
    void probe
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (page.dataset.hdState !== "loading") return; // revenue entre-temps à la page par défaut
        page.dataset.hdState = "loaded";
        img.src = hd;
      });
  };
  probe.onerror = () => {
    if (page.dataset.hdState === "loading") page.dataset.hdState = "error";
  };
  probe.src = hd;
}

/** Revient à la page par défaut (libère la mémoire de l'image HD, lourde sur téléphone). */
function downgradePage(page: HTMLElement | undefined) {
  const state = page?.dataset.hdState;
  if (!page || !state || state === "error") return;
  delete page.dataset.hdState;
  const img = page.querySelector("img");
  if (state === "loaded" && img && page.dataset.src) img.src = page.dataset.src;
}

/**
 * Neutralise une instance détruite. StPageFlip 2.0.7 ne stoppe ni sa boucle
 * requestAnimationFrame ni son écouteur `resize` dans destroy() : sans ça,
 * l'ancienne instance continuerait d'écrire dans les pages réutilisées.
 */
function teardown(pf: PageFlip) {
  const ui = pf.getUI() as unknown as { onResize?: () => void } | undefined;
  const render = pf.getRender() as unknown as { render?: (t: number) => void } | undefined;
  try {
    pf.destroy();
  } catch {
    // instance partiellement initialisée : rien à faire
  }
  if (render) render.render = () => {};
  if (ui?.onResize) window.removeEventListener("resize", ui.onResize);
}

function sizeContainer(el: HTMLElement, layout: BookLayout) {
  const cols = layout.mode === "double" ? 2 : 1;
  el.style.width = `${layout.pageW * cols}px`;
  el.style.height = `${layout.pageH}px`;
  el.style.minWidth = "0";
  el.style.minHeight = "0";
}

/* ---------- Hook ---------- */

export function useFlipbook({ hostRef, pages, hdPages, hd, layout, touchMode, title }: Options) {
  const pageCount = pages.length;
  const [current, setCurrent] = useState(0);
  /** Page visée pendant une animation (sert au recentrage du livre). */
  const [target, setTarget] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const pfRef = useRef<PageFlip | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageElsRef = useRef<HTMLElement[] | null>(null);
  const currentRef = useRef(0);
  const pendingTargetRef = useRef<number | null>(null);
  const layoutRef = useRef(layout);

  useLayoutEffect(() => {
    layoutRef.current = layout;
  });

  const getPageEls = useCallback(() => {
    pageElsRef.current ??= createPageElements(pages, hdPages, title);
    return pageElsRef.current;
  }, [pages, hdPages, title]);

  const loadRange = useCallback(
    (from: number, to: number) => {
      const els = getPageEls();
      for (let i = Math.max(0, from); i <= Math.min(els.length - 1, to); i++) loadPage(els[i]);
    },
    [getPageEls],
  );

  const loadAround = useCallback(
    (index: number) => loadRange(index - PRELOAD_BEHIND, index + PRELOAD_AHEAD),
    [loadRange],
  );

  const mode = layout?.mode ?? null;

  // Création / re-création de l'instance StPageFlip (au montage et au changement de mode).
  useEffect(() => {
    const host = hostRef.current;
    if (!mode || !host) return;

    let disposed = false;
    let pf: PageFlip | null = null;
    const container = document.createElement("div");
    container.className = `fb-book fb-book--${mode}`;
    host.appendChild(container);
    containerRef.current = container;
    setReady(false);
    setError(null);

    import("page-flip")
      .then(({ PageFlip }) => {
        const L = layoutRef.current;
        if (disposed || !L) return;
        sizeContainer(container, L);

        const els = getPageEls();
        for (const el of els) {
          el.className = "fb-page";
          el.style.cssText = "";
        }

        const start = Math.min(Math.max(currentRef.current, 0), pageCount - 1);
        pf = new PageFlip(container, {
          width: L.pageW,
          height: L.pageH,
          size: "fixed",
          autoSize: false,
          usePortrait: L.mode === "single",
          showCover: true,
          startPage: start,
          drawShadow: true,
          maxShadowOpacity: 0.5,
          flippingTime: FLIP_DURATION,
          mobileScrollSupport: false,
          useMouseEvents: !touchMode,
          showPageCorners: !touchMode,
          clickEventForward: true,
          swipeDistance: 30,
        });

        pf.on("flip", (e) => {
          currentRef.current = e.data;
          pendingTargetRef.current = null;
          setCurrent(e.data);
          setTarget(null);
          loadAround(e.data);
        });

        pf.on("changeState", (e) => {
          if (e.data === "flipping" && pf) {
            const cur = currentRef.current;
            const forward = pf.getRender().getDirection() === 0;
            const t =
              pendingTargetRef.current ??
              (forward ? nextSpreadStart(cur, pageCount, L.mode) : prevSpreadStart(cur, L.mode));
            setTarget(t);
            loadAround(t);
          } else if (e.data === "read") {
            pendingTargetRef.current = null;
            setTarget(null);
          }
        });

        pf.on("init", () => {
          if (!disposed) setReady(true);
        });

        pf.loadFromHTML(els);
        sizeContainer(container, L); // StPageFlip impose min-width/min-height : on les neutralise.
        pfRef.current = pf;

        loadRange(0, EAGER_PAGES - 1);
        loadAround(start);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!disposed) setError("Le lecteur n'a pas pu démarrer.");
      });

    return () => {
      disposed = true;
      pfRef.current = null;
      containerRef.current = null;
      if (pf) teardown(pf);
      container.remove();
    };
  }, [mode, touchMode, attempt, hostRef, pageCount, getPageEls, loadRange, loadAround]);

  // Redimensionnement sans changement de mode : mise à jour à chaud, sans ré-initialisation.
  const pageW = layout?.pageW;
  const pageH = layout?.pageH;
  useEffect(() => {
    const pf = pfRef.current;
    const container = containerRef.current;
    const L = layoutRef.current;
    if (!pf || !container || !L || !pageW || !pageH) return;

    const s = pf.getSettings();
    if (s.width === pageW && s.height === pageH) return;
    Object.assign(s, {
      width: pageW,
      height: pageH,
      minWidth: pageW,
      maxWidth: pageW,
      minHeight: pageH,
      maxHeight: pageH,
    });
    sizeContainer(container, L);
    pf.update();
  }, [pageW, pageH, ready]);

  // Haute définition seulement là où elle se voit : moins de données et de mémoire.
  useEffect(() => {
    const els = pageElsRef.current;
    const L = layoutRef.current;
    if (!els || !L || !ready) return;
    const keep = new Set<number>();
    if (hd !== "off") {
      const span = L.mode === "double" ? 2 : 1;
      const around = hd === "screen" ? span : 0;
      for (const index of new Set([current, target ?? current])) {
        const start = spreadStart(index, pageCount, L.mode);
        for (let i = start - around; i < start + span + around; i++) if (i >= 0 && i < pageCount) keep.add(i);
      }
    }
    els.forEach((el, i) => (keep.has(i) ? upgradePage(el) : downgradePage(el)));
  }, [hd, current, target, ready, mode, pageCount]);

  /* ---------- API ---------- */

  const next = useCallback(
    (corner?: "top" | "bottom") => {
      const pf = pfRef.current;
      if (!pf || currentRef.current >= pageCount - 1) return;
      pf.flipNext(corner === "top" ? "top" : "bottom");
    },
    [pageCount],
  );

  const prev = useCallback((corner?: "top" | "bottom") => {
    const pf = pfRef.current;
    if (!pf || currentRef.current <= 0) return;
    pf.flipPrev(corner === "top" ? "top" : "bottom");
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const pf = pfRef.current;
      const L = layoutRef.current;
      if (!pf || !L) return;
      const i = Math.min(Math.max(index, 0), pageCount - 1);
      const targetStart = spreadStart(i, pageCount, L.mode);
      if (targetStart === spreadStart(currentRef.current, pageCount, L.mode)) return;
      loadAround(targetStart);
      pendingTargetRef.current = targetStart;
      pf.flip(i, "bottom");
    },
    [pageCount, loadAround],
  );

  /** Active/désactive les interactions souris de StPageFlip (désactivées pendant le zoom). */
  const setInteractive = useCallback(
    (interactive: boolean) => {
      const pf = pfRef.current;
      if (!pf) return;
      const s = pf.getSettings();
      s.showPageCorners = interactive && !touchMode;
      s.disableFlipByClick = !interactive;
    },
    [touchMode],
  );

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    pageCount,
    current,
    target,
    ready,
    error,
    next,
    prev,
    goTo,
    preload: loadAround,
    setInteractive,
    retry,
  };
}
