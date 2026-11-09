/** Ligne de la table `catalogs` (voir supabase/schema.sql). */
export interface CatalogRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  page_count: number;
  page_width: number | null;
  page_height: number | null;
  cover_url: string | null;
  accent_color: string;
  allow_download: boolean;
  pdf_url: string | null;
  created_at: string;
}

/** Données strictement nécessaires au viewer, URLs déjà résolues. */
export interface ViewerCatalog {
  slug: string;
  title: string;
  description: string | null;
  accentColor: string;
  /** Dimensions en px des pages rendues (servent au ratio du livre). */
  pageWidth: number;
  pageHeight: number;
  /** URL de chaque page, dans l'ordre. */
  pages: string[];
  /** Image d'aperçu 1200×630 (absolue, ou relative au site). */
  ogImage: string;
  /** URL de téléchargement du PDF, ou null si non autorisé. */
  downloadUrl: string | null;
}
