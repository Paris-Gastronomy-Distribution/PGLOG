import type { Metadata } from "next";
import { StatusScreen } from "@/components/StatusScreen";

export const metadata: Metadata = { title: "Catalogues" };

/**
 * Racine du site : page neutre, sans formulaire ni redirection. Les filtres de
 * messagerie (Outlook / Microsoft Defender, Gmail…) analysent aussi la racine
 * du domaine d'un lien ; une page de mot de passe à cet endroit ressemble à de
 * l'hameçonnage. L'administration reste accessible sur /admin.
 */
export default function Home() {
  return (
    <StatusScreen title="Catalogues">
      <p>Pour consulter un catalogue, ouvrez le lien qui vous a été envoyé.</p>
    </StatusScreen>
  );
}
