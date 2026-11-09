import "server-only";
import { cache } from "react";
import { FALLBACK_PAGE_SIZE, isValidSlug, ogImagePath, pagePath, pdfDownloadUrl, withVersion } from "./catalog-urls";
import { DEMO_CATALOG, DEMO_SLUG, isDemoEnabled } from "./demo-catalog";
import { getSiteUrl } from "./site";
import { getStore } from "./store";
import type { CatalogStore } from "./store/types";
import type { CatalogRow, ViewerCatalog } from "./types";

function toViewerCatalog(row: CatalogRow, store: CatalogStore): ViewerCatalog {
  const version = Date.parse(row.created_at) || 0;
  const hasSize = Boolean(row.page_width && row.page_height);

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    accentColor: row.accent_color,
    pageWidth: hasSize ? row.page_width! : FALLBACK_PAGE_SIZE.width,
    pageHeight: hasSize ? row.page_height! : FALLBACK_PAGE_SIZE.height,
    pages: Array.from({ length: row.page_count }, (_, i) =>
      withVersion(store.publicUrl(pagePath(row.slug, i + 1)), version),
    ),
    ogImage: withVersion(store.publicUrl(ogImagePath(row.slug)), version),
    downloadUrl: row.allow_download && row.pdf_url ? pdfDownloadUrl(row.pdf_url, row.slug) : null,
  };
}

/**
 * Catalogue à afficher pour un slug, ou null s'il n'existe pas.
 * `cache` déduplique l'appel entre generateMetadata() et la page.
 * Une erreur de stockage est propagée (error.tsx), un slug inconnu renvoie
 * null (not-found.tsx).
 */
export const getViewerCatalog = cache(async (slug: string): Promise<ViewerCatalog | null> => {
  if (!isValidSlug(slug)) return null;
  if (slug === DEMO_SLUG) return isDemoEnabled() ? DEMO_CATALOG : null;

  const store = getStore();
  if (!store) return null;

  const row = await store.getBySlug(slug);
  if (!row || row.page_count < 1) return null;
  return toViewerCatalog(row, store);
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
    pageCount: row.page_count,
    coverUrl: row.cover_url ? withVersion(row.cover_url, Date.parse(row.created_at) || 0) : null,
    coverRatio:
      row.page_width && row.page_height
        ? row.page_width / row.page_height
        : FALLBACK_PAGE_SIZE.width / FALLBACK_PAGE_SIZE.height,
    createdAt: row.created_at,
    publicUrl: catalogPublicUrl(row.slug),
  };
}
