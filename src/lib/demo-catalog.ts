import type { ViewerCatalog } from "./types";

/**
 * Catalogue de démonstration servi sur /c/demo, sans Supabase.
 * Fichiers générés par `node scripts/generate-demo.mjs` dans public/demo/.
 * Visible tant que Supabase n'est pas configuré (ou si ENABLE_DEMO=true) :
 * voir getViewerCatalog() dans catalogs.ts.
 */
export const DEMO_SLUG = "demo";

const PAGE_COUNT = 24;

export const DEMO_CATALOG: ViewerCatalog = {
  slug: DEMO_SLUG,
  title: "Catalogue Automne — Hiver 2026",
  description:
    "Épicerie fine, crèmerie, charcuterie, cave et douceurs : notre sélection professionnelle de la saison, prix HT.",
  accentColor: "#C38E2F",
  pageWidth: 1600,
  pageHeight: 2263,
  pages: Array.from({ length: PAGE_COUNT }, (_, i) => `/demo/page-${String(i + 1).padStart(3, "0")}.webp`),
  ogImage: "/demo/og.jpg",
  downloadUrl: "/demo/demo.pdf",
};
