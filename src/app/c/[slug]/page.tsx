import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preconnect, preload } from "react-dom";
import { DisabledScreen } from "@/components/StatusScreen";
import FlipbookViewer from "@/components/viewer/FlipbookViewer";
import { lookupCatalog } from "@/lib/catalogs";

/**
 * Page mise en cache 5 minutes (ISR) : réponses instantanées et peu de
 * requêtes vers Supabase. L'admin invalide le cache à chaque modification
 * d'un catalogue (revalidatePath).
 */
export const revalidate = 300;

/** Liste vide : rien n'est pré-rendu au build, chaque catalogue est rendu puis mis en cache à sa première visite. */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

/** Pages téléchargées dès le HTML, avant même le démarrage du lecteur. */
const PRELOADED_PAGES = 3;

type Props = { params: Promise<{ slug: string }> };

function describe(title: string, description: string | null): string {
  const text = description?.trim();
  if (text) return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
  return `Feuilletez « ${title} » en ligne.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await lookupCatalog(slug);
  if (result.status === "disabled") return { title: "Catalogue indisponible" };
  if (result.status !== "ok") return { title: "Catalogue introuvable" };

  const { catalog } = result;
  const description = describe(catalog.title, catalog.description);
  const url = `/c/${catalog.slug}`;

  return {
    title: catalog.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url,
      title: catalog.title,
      description,
      images: [{ url: catalog.ogImage, width: 1200, height: 630, alt: catalog.title, type: "image/jpeg" }],
    },
    twitter: {
      card: "summary_large_image",
      title: catalog.title,
      description,
      images: [{ url: catalog.ogImage, alt: catalog.title }],
    },
  };
}

export default async function CatalogPage({ params }: Props) {
  const { slug } = await params;
  const result = await lookupCatalog(slug);
  if (result.status === "disabled") return <DisabledScreen />;
  if (result.status !== "ok") notFound();

  const { catalog } = result;
  const first = catalog.pages[0];
  // Même mode (sans CORS) que les <img> du lecteur, pour que la connexion et les préchargements servent.
  if (first && /^https?:\/\//.test(first)) preconnect(new URL(first).origin);
  catalog.pages.slice(0, PRELOADED_PAGES).forEach((href, i) => {
    preload(href, { as: "image", fetchPriority: i === 0 ? "high" : "auto" });
  });

  return <FlipbookViewer catalog={catalog} />;
}
