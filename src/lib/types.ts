/** Ligne de la table `catalogs` (voir supabase/schema.sql). */
export interface CatalogRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  page_count: number;
  page_width: number | null;
  page_height: number | null;
  /**
   * Largeur en px des pages haute définition ({slug}/page-001-hd.webp…),
   * null pour un catalogue publié avant leur ajout. Absent si la colonne
   * n'existe pas encore en base.
   */
  hd_width?: number | null;
  cover_url: string | null;
  accent_color: string;
  allow_download: boolean;
  pdf_url: string | null;
  /**
   * false : lien désactivé depuis l'administration (le catalogue est conservé).
   * Absent si la colonne n'a pas encore été ajoutée à la base : actif.
   */
  is_active?: boolean;
  created_at: string;
}

export const isActive = (row: Pick<CatalogRow, "is_active">) => row.is_active !== false;

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
  /** Pages haute définition (même ordre), ou null si le catalogue n'en a pas. */
  hdPages: string[] | null;
  /** Largeur en px des pages haute définition, ou null. */
  hdWidth: number | null;
  /** Image d'aperçu 1200×630 (absolue, ou relative au site). */
  ogImage: string;
  /** URL de téléchargement du PDF, ou null si non autorisé. */
  downloadUrl: string | null;
}
