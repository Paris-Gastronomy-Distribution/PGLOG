/** Classes partagées entre composants serveur et client (pas de "use client" ici). */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-white text-[#111113] hover:bg-white/90 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]",
  secondary: "border border-white/12 bg-white/[0.06] text-white/90 hover:bg-white/[0.1] hover:text-white",
  ghost: "text-white/70 hover:bg-white/[0.08] hover:text-white",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
};

const SIZES = { sm: "h-9 px-3.5 text-[13px]", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-[15px]" } as const;

export function buttonClass(variant: ButtonVariant = "secondary", size: keyof typeof SIZES = "md") {
  return `inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${SIZES[size]} ${VARIANTS[variant]}`;
}

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-white/[0.06] disabled:opacity-50";
