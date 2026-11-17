import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { BrandLogo } from "@/components/BrandLogo";
import { cardClass } from "@/components/admin/styles";
import { isAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

// Déconnecté : uniquement la demande de mot de passe. La salutation
// s'affiche une fois connecté (page d'accueil de l'administration).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { next } = await searchParams;
  const configured = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-100">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo height={72} priority />
          <h1 className="mt-8 text-[24px] font-bold tracking-tight text-navy">Espace catalogues</h1>
          <p className="mt-1.5 text-[15px] text-slate">Saisissez le mot de passe pour continuer.</p>
        </div>

        {configured ? (
          <LoginForm next={next ?? ""} />
        ) : (
          <div className={`${cardClass} border-amber-300 bg-amber-50 p-5 text-[14px] leading-relaxed text-amber-900`}>
            <p className="font-semibold">Mot de passe non configuré</p>
            <p className="mt-2">
              Définissez la variable <code className="rounded bg-white px-1.5 py-0.5">ADMIN_PASSWORD</code> dans <code className="rounded bg-white px-1.5 py-0.5">.env.local</code> (en local)
              ou dans Netlify → Project configuration → Environment variables, puis redémarrez / redéployez.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
