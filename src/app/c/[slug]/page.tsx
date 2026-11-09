import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FlipbookViewer from "@/components/viewer/FlipbookViewer";
import { getViewerCatalog } from "@/lib/catalogs";

/**
 * Page mise en cache 5 minutes (ISR) : réponses instantanées et peu de
 * requêtes vers Supabase. L'admin invalide le cache à la création et à la
 * suppression d'un catalogue (revalidatePath).
 */
export const revalidate = 300;

/** Liste vide : rien n'est pré-rendu au build, chaque catalogue est rendu puis mis en cache à sa première visite. */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

function describe(title: string, description: string | null): string {
  const text = description?.trim();
  if (text) return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
  return `Feuilletez « ${title} » en ligne.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getViewerCatalog(slug);
  if (!catalog) return { title: "Catalogue introuvable" };

  const description = describe(catalog.title, catalog.description);
  const url = `/c/${catalog.slug}`;
  const image = {
    url: catalog.ogImage,
    width: 1200,
    height: 630,
    alt: catalog.title,
    type: "image/jpeg",
  };

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
      images: [image],
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
  const catalog = await getViewerCatalog(slug);
  if (!catalog) notFound();

  return <FlipbookViewer catalog={catalog} />;
}
