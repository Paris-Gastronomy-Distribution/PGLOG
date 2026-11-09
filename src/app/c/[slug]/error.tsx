"use client";

import { useEffect } from "react";
import { BookGlyph, StatusScreen } from "@/components/StatusScreen";

export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={<BookGlyph />}
      title="Impossible d'afficher ce catalogue"
      action={
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-medium text-white/90 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          Réessayer
        </button>
      }
    >
      <p>Un problème temporaire empêche le chargement. Réessayez dans quelques instants.</p>
    </StatusScreen>
  );
}
