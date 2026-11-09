export type BookMode = "single" | "double";

export interface BookLayout {
  mode: BookMode;
  /** Taille affichée d'une page, en px CSS (entiers). */
  pageW: number;
  pageH: number;
  /** Taille de la scène (zone disponible pour le livre). */
  stageW: number;
  stageH: number;
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

export function stagePadding(viewportW: number): { x: number; y: number } {
  return viewportW < 640 ? { x: 12, y: 14 } : { x: 40, y: 28 };
}

/** Plus grande taille de page qui tient dans la scène, au bon ratio. */
export function computeLayout(
  stageW: number,
  stageH: number,
  ratio: number,
  mode: BookMode,
  pad: { x: number; y: number },
): BookLayout {
  const cols = mode === "double" ? 2 : 1;
  const availW = Math.max(80, stageW - pad.x * 2);
  const availH = Math.max(80, stageH - pad.y * 2);

  let pageH = availH;
  let pageW = pageH * ratio;
  if (pageW * cols > availW) {
    pageW = availW / cols;
    pageH = pageW / ratio;
  }

  return {
    mode,
    pageW: Math.max(40, Math.floor(pageW)),
    pageH: Math.max(40, Math.floor(pageH)),
    stageW,
    stageH,
  };
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
