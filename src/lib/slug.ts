import { isValidSlug } from "./catalog-urls";

/** Slugs réservés (routes ou contenus existants). */
export const RESERVED_SLUGS = new Set(["demo"]);

/** « Catalogue Été 2026 ! » → « catalogue-ete-2026 ». */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Nettoie une saisie manuelle de slug sans la reformater entièrement. */
export function sanitizeSlugInput(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 80);
}

export type SlugIssue = "empty" | "format" | "reserved";

export function slugIssue(slug: string): SlugIssue | null {
  if (!slug) return "empty";
  if (!isValidSlug(slug)) return "format";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  return null;
}

/** Titre lisible à partir d'un nom de fichier Canva. */
export function titleFromFilename(name: string): string {
  const base = name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}
