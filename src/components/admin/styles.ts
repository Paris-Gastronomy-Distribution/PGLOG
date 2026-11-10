/** Classes partagées entre composants serveur et client (pas de "use client" ici). */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-[0_1px_2px_rgba(0,107,255,0.25)] hover:bg-brand-hover",
  secondary: "border border-line bg-white text-navy hover:border-brand hover:text-brand",
  ghost: "text-slate hover:bg-brand-soft hover:text-brand",
  danger: "bg-danger text-white hover:bg-[#c02a30]",
};

const SIZES = { sm: "h-9 px-4 text-[13px]", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-[15px]" } as const;

export function buttonClass(variant: ButtonVariant = "secondary", size: keyof typeof SIZES = "md") {
  return `inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${SIZES[size]} ${VARIANTS[variant]}`;
}

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-4 py-3 text-[15px] text-navy placeholder:text-mist outline-none transition hover:border-mist focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-50";

/** Carte blanche à bord fin, ombre très légère. */
export const cardClass = "rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(11,53,88,0.06)]";
