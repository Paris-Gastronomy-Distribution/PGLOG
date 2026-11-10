import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { BookIcon } from "@/components/admin/icons";
import { cardClass } from "@/components/admin/styles";
import { isAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

// Déconnecté : uniquement la demande de mot de passe. « Bonjour Mamie »
// s'affiche une fois connectée (page d'accueil de l'administration).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { next } = await searchParams;
  const configured = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shadow-[0_6px_16px_rgba(0,107,255,0.3)]">
            <BookIcon width={24} height={24} />
          </span>
          <h1 className="mt-6 text-[26px] font-bold tracking-tight text-navy">Entrez le mot de passe</h1>
        </div>

        {configured ? (
          <LoginForm next={next ?? ""} />
        ) : (
          <div className={`${cardClass} border-amber-300 bg-amber-50 p-5 text-[14px] leading-relaxed text-amber-900`}>
            <p className="font-semibold">Mot de passe non configuré</p>
            <p className="mt-2">
              Définissez la variable <code className="rounded bg-white px-1.5 py-0.5">ADMIN_PASSWORD</code> dans <code className="rounded bg-white px-1.5 py-0.5">.env.local</code> (en local)
              ou dans Vercel → Environment Variables, puis redémarrez / redéployez.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
