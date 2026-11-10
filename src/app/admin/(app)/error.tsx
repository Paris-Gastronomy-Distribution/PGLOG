"use client";

import { useEffect } from "react";
import { buttonClass, cardClass } from "@/components/admin/styles";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={`${cardClass} mx-auto max-w-md p-6 text-center`}>
      <h1 className="text-lg font-bold text-navy">Impossible de charger cette page</h1>
      <p className="mt-2 text-[14px] text-slate">Le stockage ne répond pas pour le moment (connexion, ou projet Supabase en pause).</p>
      <button type="button" onClick={reset} className={`${buttonClass("primary")} mt-5`}>
        Réessayer
      </button>
    </div>
  );
}
