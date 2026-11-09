import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { BookIcon } from "@/components/admin/icons";
import { isAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { next } = await searchParams;
  const configured = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/80">
            <BookIcon width={26} height={26} />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Catalogues</h1>
          <p className="mt-2 text-[15px] text-white/50">Espace d&apos;administration</p>
        </div>

        {configured ? (
          <LoginForm next={next ?? ""} />
        ) : (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5 text-[14px] leading-relaxed text-amber-100">
            <p className="font-medium">Mot de passe non configuré</p>
            <p className="mt-2 text-amber-100/75">
              Définissez la variable <code className="rounded bg-black/30 px-1.5 py-0.5">ADMIN_PASSWORD</code> dans <code className="rounded bg-black/30 px-1.5 py-0.5">.env.local</code> (en
              local) ou dans Vercel → Settings → Environment Variables, puis redémarrez / redéployez.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
