"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-red-400/20 bg-red-500/[0.07] p-6 text-center">
      <h1 className="text-lg font-semibold">Impossible de charger cette page</h1>
      <p className="mt-2 text-[14px] text-white/60">Le stockage ne répond pas pour le moment (connexion, ou projet Supabase en pause).</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-medium text-[#111113] hover:bg-white/90"
      >
        Réessayer
      </button>
    </div>
  );
}
