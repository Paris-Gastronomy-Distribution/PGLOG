import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

/**
 * Écran plein cadre sobre (404, lien désactivé, erreur) : même fond que le
 * lecteur, logo de l'entreprise, aucune mention de la plateforme technique.
 */
export function StatusScreen({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(120%_85%_at_50%_40%,#27272b_0%,#19191c_46%,#0e0e10_100%)] px-6 py-16 text-center">
      <div className="flex max-w-md flex-col items-center">
        <BrandLogo height={64} priority className="mb-10" />
        {eyebrow && <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {children && <div className="mt-4 text-[15px] leading-relaxed text-white/60">{children}</div>}
        {action && <div className="mt-8">{action}</div>}
      </div>
    </main>
  );
}

export function NotFoundScreen() {
  return (
    <StatusScreen eyebrow="Erreur 404" title="Ce catalogue est introuvable">
      <p>Le lien est peut-être incomplet, ou ce catalogue n&apos;est plus disponible.</p>
      <p className="mt-2">Vérifiez l&apos;adresse ou demandez un nouveau lien à votre interlocuteur.</p>
    </StatusScreen>
  );
}

/** Lien désactivé depuis l'administration. */
export function DisabledScreen() {
  return (
    <StatusScreen title="Ce catalogue n'est plus en ligne">
      <p>Il a été retiré par son éditeur.</p>
      <p className="mt-2">Pour recevoir la version à jour, contactez votre interlocuteur habituel.</p>
    </StatusScreen>
  );
}

/** 404 des adresses qui ne sont pas des catalogues. */
export function PageNotFoundScreen() {
  return (
    <StatusScreen eyebrow="Erreur 404" title="Page introuvable">
      <p>Le lien est peut-être incomplet, ou ce catalogue n&apos;est plus disponible.</p>
      <p className="mt-2">Vérifiez l&apos;adresse ou demandez un nouveau lien à votre interlocuteur.</p>
    </StatusScreen>
  );
}
