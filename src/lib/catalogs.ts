import "server-only";
import { cache } from "react";
import {
  FALLBACK_PAGE_SIZE,
  isValidSlug,
  ogImagePath,
  pagePath,
  pdfDownloadUrl,
  storagePublicUrl,
  withVersion,
} from "./catalog-urls";
import { DEMO_CATALOG, DEMO_SLUG } from "./demo-catalog";
import { getSupabaseAdmin } from "./supabase/server";
import type { CatalogRow, ViewerCatalog } from "./types";

function toViewerCatalog(row: CatalogRow): ViewerCatalog {
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
      withVersion(storagePublicUrl(pagePath(row.slug, i + 1)), version),
    ),
    ogImage: withVersion(storagePublicUrl(ogImagePath(row.slug)), version),
    downloadUrl: row.allow_download && row.pdf_url ? pdfDownloadUrl(row.pdf_url, row.slug) : null,
  };
}

/**
 * Catalogue à afficher pour un slug, ou null s'il n'existe pas.
 * `cache` déduplique l'appel entre generateMetadata() et la page.
 * Une erreur Supabase est propagée (affichée par error.tsx), un slug inconnu
 * renvoie null (affiché par not-found.tsx).
 */
export const getViewerCatalog = cache(async (slug: string): Promise<ViewerCatalog | null> => {
  if (!isValidSlug(slug)) return null;
  if (slug === DEMO_SLUG) return DEMO_CATALOG;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("catalogs")
    .select(
      "id, slug, title, description, page_count, page_width, page_height, cover_url, accent_color, allow_download, pdf_url, created_at",
    )
    .eq("slug", slug)
    .maybeSingle<CatalogRow>();

  if (error) throw new Error(`Lecture du catalogue « ${slug} » impossible : ${error.message}`);
  if (!data || data.page_count < 1) return null;

  return toViewerCatalog(data);
});
