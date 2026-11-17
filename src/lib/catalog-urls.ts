/**
 * Conventions de chemins du bucket Storage `catalogs`.
 * Partagé entre le viewer (lecture) et l'admin (upload).
 */

export const STORAGE_BUCKET = "catalogs";

/** Largeur des pages affichées par défaut (px) : nettes à 100 % sur la plupart des écrans. */
export const PAGE_RENDER_WIDTH = 1600;

/**
 * Largeur des pages haute définition (px), chargées par le lecteur seulement
 * quand l'écran ou le zoom le demande. Les pages par défaut en sont une
 * réduction (suréchantillonnage : texte et filets plus fins).
 */
export const PAGE_HD_WIDTH = 3200;

/** Taille maximale d'un fichier du stockage (plafond du plan gratuit Supabase), donc du PDF. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/** Ratio A4 portrait, utilisé si un catalogue n'a pas de dimensions connues. */
export const FALLBACK_PAGE_SIZE = { width: 1600, height: 2263 } as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}

const pageName = (pageNumber: number) => `page-${String(pageNumber).padStart(3, "0")}`;

export const pagePath = (slug: string, pageNumber: number) => `${slug}/${pageName(pageNumber)}.webp`;
/** Dans le même dossier (pas de sous-dossier) : la suppression d'un catalogue vide un seul niveau. */
export const pageHdPath = (slug: string, pageNumber: number) => `${slug}/${pageName(pageNumber)}-hd.webp`;
export const coverPath = (slug: string) => `${slug}/cover.webp`;
export const ogImagePath = (slug: string) => `${slug}/og.jpg`;
export const pdfPath = (slug: string) => `${slug}/${slug}.pdf`;

/** URL publique d'un fichier du bucket. */
export function storagePublicUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** Ajoute un paramètre de version pour invalider les caches si un slug est réutilisé. */
export function withVersion(url: string, version: string | number): string {
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

/**
 * URL qui force le téléchargement avec un nom de fichier propre.
 * Supabase Storage accepte `?download=<nom>` (en-tête Content-Disposition).
 */
export function pdfDownloadUrl(pdfUrl: string, slug: string): string {
  if (!/\/storage\/v1\/object\/public\//.test(pdfUrl)) return pdfUrl;
  return `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}download=${encodeURIComponent(`${slug}.pdf`)}`;
}
