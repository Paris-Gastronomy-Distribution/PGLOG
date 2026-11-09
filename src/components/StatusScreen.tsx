import type { ReactNode } from "react";

/**
 * Écran plein cadre sobre (404, erreur) : même fond que le viewer,
 * aucune mention de la plateforme.
 */
export function StatusScreen({
  icon,
  eyebrow,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(120%_85%_at_50%_40%,#27272b_0%,#19191c_46%,#0e0e10_100%)] px-6 py-16 text-center">
      <div className="flex max-w-md flex-col items-center">
        {icon && (
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
            {icon}
          </div>
        )}
        {eyebrow && <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {children && <div className="mt-4 text-[15px] leading-relaxed text-white/60">{children}</div>}
        {action && <div className="mt-8">{action}</div>}
      </div>
    </main>
  );
}

export function BookGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2Z" />
      <path d="M12 6.5v14" />
    </svg>
  );
}

export function NotFoundScreen() {
  return (
    <StatusScreen icon={<BookGlyph />} eyebrow="Erreur 404" title="Ce catalogue est introuvable">
      <p>Le lien est peut-être incomplet, ou ce catalogue n&apos;est plus disponible.</p>
      <p className="mt-2">Vérifiez l&apos;adresse ou demandez un nouveau lien à votre interlocuteur.</p>
    </StatusScreen>
  );
}
