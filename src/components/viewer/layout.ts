export type BookMode = "single" | "double";

export interface BookLayout {
  mode: BookMode;
  /** Taille affichée d'une page, en px CSS (entiers). */
  pageW: number;
  pageH: number;
  /** Taille de la scène (zone disponible pour le livre, barre du haut comprise). */
  stageW: number;
  stageH: number;
  /** Hauteur réservée en haut pour la barre de titre (0 si elle flotte dans les marges). */
  offsetTop: number;
  /** Largeur libre de chaque côté du livre (sert à limiter le titre flottant). */
  sideSpace: number;
}

/** Encombrement de la barre du haut, mesuré dans la page. */
export interface HeaderMetrics {
  height: number;
  /** Largeur minimale requise de chaque côté du livre pour la laisser flotter. */
  sideNeed: number;
}

/** En dessous de cette largeur de viewport : page simple. */
export const DOUBLE_PAGE_MIN_WIDTH = 768;

/**
 * Double page si la fenêtre est assez large ET plus large que haute
 * (ordinateur, tablette ou téléphone à l'horizontale). Sinon page simple
 * (téléphone, tablette à la verticale) : la page est alors bien plus grande.
 */
export function chooseMode(viewportW: number, viewportH: number): BookMode {
  return viewportW >= DOUBLE_PAGE_MIN_WIDTH && viewportW >= viewportH ? "double" : "single";
}

/** Marges autour du livre : réduites au minimum pour qu'il occupe tout l'écran. */
export function stagePadding(viewportW: number, viewportH: number): { x: number; y: number } {
  if (viewportW < 640) return { x: 8, y: 10 };
  if (viewportH < 500) return { x: 16, y: 8 };
  return { x: 24, y: 16 };
}

function fit(availW: number, availH: number, ratio: number, cols: number) {
  let pageH = Math.max(40, availH);
  let pageW = pageH * ratio;
  if (pageW * cols > availW) {
    pageW = Math.max(40, availW) / cols;
    pageH = pageW / ratio;
  }
  return { pageW: Math.max(40, Math.floor(pageW)), pageH: Math.max(40, Math.floor(pageH)) };
}

/**
 * Plus grande taille de page qui tient dans la scène, au bon ratio.
 * La barre du haut (titre + boutons) flotte dans les marges latérales quand
 * il y a la place (cas typique : double page sur ordinateur) ; sinon on lui
 * réserve sa hauteur au-dessus du livre.
 */
export function computeLayout(
  stageW: number,
  stageH: number,
  ratio: number,
  mode: BookMode,
  pad: { x: number; y: number },
  header: HeaderMetrics,
): BookLayout {
  const cols = mode === "double" ? 2 : 1;
  const availW = stageW - pad.x * 2;

  // 1er essai : livre sur toute la hauteur, barre du haut flottante.
  let size = fit(availW, stageH - pad.y * 2, ratio, cols);
  let sideSpace = (stageW - size.pageW * cols) / 2;
  let offsetTop = 0;

  if (sideSpace < header.sideNeed) {
    // Pas assez de place sur les côtés : la barre prend sa hauteur.
    offsetTop = header.height;
    size = fit(availW, stageH - offsetTop - pad.y * 2, ratio, cols);
    sideSpace = (stageW - size.pageW * cols) / 2;
  }

  return { mode, ...size, stageW, stageH, offsetTop, sideSpace };
}

export type VisiblePart = "both" | "left" | "right";

/**
 * Partie du livre réellement visible en double page :
 * couverture seule (à droite), dernière page seule (à gauche) ou double page.
 */
export function visiblePart(index: number, pageCount: number, mode: BookMode): VisiblePart {
  if (mode === "single") return "both";
  if (index <= 0) return "right";
  if (pageCount % 2 === 0 && index >= pageCount - 1) return "left";
  return "both";
}

/** Index de la première page de la double page qui contient `index`. */
export function spreadStart(index: number, pageCount: number, mode: BookMode): number {
  if (mode === "single" || index <= 0) return Math.max(0, index);
  const i = Math.min(index, pageCount - 1);
  return i % 2 === 1 ? i : i - 1;
}

export function nextSpreadStart(current: number, pageCount: number, mode: BookMode): number {
  if (mode === "single") return Math.min(current + 1, pageCount - 1);
  if (current <= 0) return Math.min(1, pageCount - 1);
  return Math.min(current + 2, pageCount - 1);
}

export function prevSpreadStart(current: number, mode: BookMode): number {
  if (mode === "single") return Math.max(current - 1, 0);
  return current <= 1 ? 0 : current - 2;
}

/** Libellé de position : « 1 / 24 », « 2–3 / 24 ». */
export function pageLabel(index: number, pageCount: number, mode: BookMode): string {
  const start = spreadStart(index, pageCount, mode);
  const part = visiblePart(start, pageCount, mode);
  if (mode === "single" || part !== "both" || start + 1 >= pageCount) return `${start + 1}`;
  return `${start + 1}–${start + 2}`;
}
