"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { buttonClass, cardClass, inputClass, type ButtonVariant } from "./styles";

export { copyToClipboard } from "@/lib/clipboard";
export { buttonClass, cardClass, inputClass };

/* ---------- Boutons ---------- */

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  return <button type="button" className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export function IconButton({
  label,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate transition hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Champs ---------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-navy">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <div className="text-[13px] text-slate">{hint}</div>
      ) : null}
    </div>
  );
}

export function Toggle({
  id,
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: ReactNode;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${disabled ? "opacity-50" : ""}`}>
      <div>
        <label htmlFor={id} className="block text-[14px] font-semibold text-navy">
          {label}
        </label>
        {description && <div className="mt-1 text-[13px] leading-relaxed text-slate">{description}</div>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${checked ? "bg-brand" : "bg-line"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

/** Bleu et vert de la charte en premier, puis des teintes neutres et chaudes. */
export const ACCENT_PRESETS = ["#2B3D86", "#194641", "#111111", "#C38E2F", "#B4532A", "#6B2737", "#7D8C55", "#C2706A"];
export const DEFAULT_ACCENT = ACCENT_PRESETS[0];

export function AccentPicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const normalized = value.toLowerCase();
  return (
    <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label="Couleur d'accent">
      {ACCENT_PRESETS.map((c) => {
        const active = c.toLowerCase() === normalized;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c}
            onClick={() => onChange(c)}
            className={`h-8 w-8 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? "ring-2 ring-brand ring-offset-2" : "hover:scale-110"}`}
            style={{ background: c }}
          />
        );
      })}
      <label
        htmlFor={id}
        className="relative inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-line bg-white pr-3 pl-1 text-[13px] font-medium text-slate hover:border-brand"
      >
        <span className="h-6 w-6 rounded-full border border-line" style={{ background: value }} />
        {value.toUpperCase()}
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Couleur personnalisée"
        />
      </label>
    </div>
  );
}

/* ---------- Boîte de dialogue ---------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-32px)] ${wide ? "max-w-xl" : "max-w-md"} rounded-2xl border border-line bg-white p-0 text-navy shadow-[0_24px_60px_rgba(27,36,83,0.18)] backdrop:bg-navy/40 backdrop:backdrop-blur-[2px]`}
      aria-label={title}
    >
      {open && (
        <div className="p-6 sm:p-7">
          <h2 className="mb-5 text-lg font-bold tracking-tight">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

/* ---------- Notifications ---------- */

interface ToastItem {
  id: number;
  text: string;
  tone: "ok" | "error";
}

const ToastContext = createContext<(text: string, tone?: "ok" | "error") => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 2800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-[0_10px_30px_rgba(27,36,83,0.25)] ${t.tone === "ok" ? "bg-navy text-white" : "bg-danger text-white"}`}
          >
            {t.tone === "ok" && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#7ee2a8]" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
