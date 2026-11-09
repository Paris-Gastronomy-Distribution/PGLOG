import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { BookIcon, LogoutIcon } from "@/components/admin/icons";
import { isAdmin } from "@/lib/admin-session";
import { getBackendStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  // Le middleware protège déjà /admin : double vérification côté serveur.
  if (!(await isAdmin())) redirect("/admin/login");
  const backend = getBackendStatus();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#141416]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#111113]">
              <BookIcon width={17} height={17} />
            </span>
            Catalogues
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.08] hover:text-white"
            >
              <LogoutIcon width={16} height={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </form>
        </div>
      </header>

      {backend.kind === "local" && (
        <div className="border-b border-sky-400/15 bg-sky-500/[0.07] px-4 py-2.5 text-center text-[13px] text-sky-100/80">
          <strong className="font-semibold text-sky-100">Mode local</strong> · Supabase n&apos;est pas encore configuré : les catalogues sont enregistrés sur cet ordinateur (dossier{" "}
          <code className="rounded bg-black/30 px-1">.local-data</code>) et ne seront pas en ligne.
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {backend.kind === "missing" ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-amber-400/25 bg-amber-500/10 p-6 text-amber-50">
            <h1 className="text-lg font-semibold">Configuration Supabase requise</h1>
            <p className="mt-2 text-[14px] text-amber-50/75">Ajoutez ces variables dans Vercel → Settings → Environment Variables, puis redéployez :</p>
            <ul className="mt-3 space-y-1 font-mono text-[13px]">
              {backend.missing.map((name) => (
                <li key={name}>· {name}</li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-amber-50/60">Le README (étapes 2 à 6) détaille où trouver chaque valeur.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
