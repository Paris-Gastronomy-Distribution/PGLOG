import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { LogoutIcon } from "@/components/admin/icons";
import { BrandLogo } from "@/components/BrandLogo";
import { cardClass } from "@/components/admin/styles";
import { isAdmin } from "@/lib/admin-session";
import { getBackendStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  // Le middleware protège déjà /admin : double vérification côté serveur.
  if (!(await isAdmin())) redirect("/admin/login");
  const backend = getBackendStatus();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
            <BrandLogo height={38} priority />
            <span className="h-6 w-px bg-line" aria-hidden="true" />
            <span className="text-[15px] font-semibold tracking-tight text-navy">Catalogues</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[14px] font-semibold text-slate transition hover:bg-brand-soft hover:text-brand"
            >
              <LogoutIcon width={16} height={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </form>
        </div>
      </header>

      {backend.kind === "local" && (
        <div className="border-b border-brand/15 bg-brand-soft px-4 py-2.5 text-center text-[13px] text-navy">
          <strong className="font-semibold">Mode local</strong> · Supabase n&apos;est pas encore configuré : les catalogues sont enregistrés sur cet ordinateur (dossier{" "}
          <code className="rounded bg-white px-1">.local-data</code>) et ne seront pas en ligne.
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {backend.kind === "missing" ? (
          <div className={`${cardClass} mx-auto max-w-lg p-6`}>
            <h1 className="text-lg font-bold text-navy">Configuration Supabase requise</h1>
            <p className="mt-2 text-[14px] text-slate">Ajoutez ces variables dans Netlify → Project configuration → Environment variables, puis redéployez :</p>
            <ul className="mt-3 space-y-1 font-mono text-[13px] text-navy">
              {backend.missing.map((name) => (
                <li key={name}>· {name}</li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-slate">Le README (étapes 2 à 6) détaille où trouver chaque valeur.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
