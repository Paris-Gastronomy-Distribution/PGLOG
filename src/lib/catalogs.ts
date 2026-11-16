import "server-only";
import { cache } from "react";
import { FALLBACK_PAGE_SIZE, isValidSlug, ogImagePath, pagePath, pdfDownloadUrl, withVersion } from "./catalog-urls";
import { DEMO_CATALOG, DEMO_SLUG } from "./demo-catalog";
import { getSiteUrl } from "./site";
import { getBackendStatus, getStore } from "./store";
import type { CatalogStore } from "./store/types";
import { isActive, type CatalogRow, type ViewerCatalog } from "./types";

/** Version des fichiers : invalide les caches si un slug est réutilisé. */
const fileVersion = (row: CatalogRow) => Date.parse(row.created_at) || 0;

function pageRatio(row: CatalogRow): number {
  return row.page_width && row.page_height
    ? row.page_width / row.page_height
    : FALLBACK_PAGE_SIZE.width / FALLBACK_PAGE_SIZE.height;
}

/** URLs publiques des pages, dans l'ordre. */
export function pageUrls(row: CatalogRow, store: CatalogStore): string[] {
  const version = fileVersion(row);
  return Array.from({ length: row.page_count }, (_, i) => withVersion(store.publicUrl(pagePath(row.slug, i + 1)), version));
}

function toViewerCatalog(row: CatalogRow, store: CatalogStore): ViewerCatalog {
  const hasSize = Boolean(row.page_width && row.page_height);
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    accentColor: row.accent_color,
    pageWidth: hasSize ? row.page_width! : FALLBACK_PAGE_SIZE.width,
    pageHeight: hasSize ? row.page_height! : FALLBACK_PAGE_SIZE.height,
    pages: pageUrls(row, store),
    ogImage: withVersion(store.publicUrl(ogImagePath(row.slug)), fileVersion(row)),
    downloadUrl: row.allow_download && row.pdf_url ? pdfDownloadUrl(row.pdf_url, row.slug) : null,
  };
}

/**
 * La démo /c/demo reste visible tant que Supabase n'est pas branché (pour
 * avoir quelque chose à montrer), puis disparaît automatiquement pour
 * qu'aucun faux catalogue ne traîne sur votre domaine. ENABLE_DEMO=true
 * la force.
 */
function isDemoEnabled(): boolean {
  return process.env.ENABLE_DEMO === "true" || getBackendStatus().kind !== "supabase";
}

export type CatalogLookup =
  | { status: "ok"; catalog: ViewerCatalog }
  | { status: "disabled" }
  | { status: "missing" };

/**
 * Catalogue à afficher pour un slug. `cache` déduplique l'appel entre
 * generateMetadata() et la page. Une erreur de stockage est propagée
 * (error.tsx) ; un slug inconnu donne « missing » (404).
 */
export const lookupCatalog = cache(async (slug: string): Promise<CatalogLookup> => {
  if (!isValidSlug(slug)) return { status: "missing" };
  if (slug === DEMO_SLUG) return isDemoEnabled() ? { status: "ok", catalog: DEMO_CATALOG } : { status: "missing" };

  const store = getStore();
  if (!store) return { status: "missing" };

  const row = await store.getBySlug(slug);
  if (!row || row.page_count < 1) return { status: "missing" };
  if (!isActive(row)) return { status: "disabled" };
  return { status: "ok", catalog: toViewerCatalog(row, store) };
});

/** Lien public d'un catalogue, à envoyer aux clients. */
export function catalogPublicUrl(slug: string): string {
  return new URL(`/c/${slug}`, getSiteUrl()).toString();
}

/** Données d'une carte de la page d'accueil de l'admin. */
export interface AdminCatalog {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  accentColor: string;
  allowDownload: boolean;
  hasPdf: boolean;
  active: boolean;
  pageCount: number;
  coverUrl: string | null;
  coverRatio: number;
  createdAt: string;
  publicUrl: string;
}

export function toAdminCatalog(row: CatalogRow): AdminCatalog {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    accentColor: row.accent_color,
    allowDownload: row.allow_download,
    hasPdf: Boolean(row.pdf_url),
    active: isActive(row),
    pageCount: row.page_count,
    coverUrl: row.cover_url ? withVersion(row.cover_url, fileVersion(row)) : null,
    coverRatio: pageRatio(row),
    createdAt: row.created_at,
    publicUrl: catalogPublicUrl(row.slug),
  };
}
