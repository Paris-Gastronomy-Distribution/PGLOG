/**
 * Conventions de chemins du bucket Storage `catalogs`.
 * Partagé entre le viewer (lecture) et l'admin (upload).
 */

export const STORAGE_BUCKET = "catalogs";

/** Largeur cible des pages rendues (px). */
export const PAGE_RENDER_WIDTH = 1600;

/** Ratio A4 portrait, utilisé si un catalogue n'a pas de dimensions connues. */
export const FALLBACK_PAGE_SIZE = { width: 1600, height: 2263 } as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}

export const pagePath = (slug: string, pageNumber: number) =>
  `${slug}/page-${String(pageNumber).padStart(3, "0")}.webp`;
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
