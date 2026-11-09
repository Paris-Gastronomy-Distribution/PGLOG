"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import { Button, inputClass, Spinner } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <label htmlFor="password" className="block text-[13px] font-medium text-white/75">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            className={`${inputClass} pr-24`}
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/55 hover:bg-white/10 hover:text-white"
          >
            {show ? "Masquer" : "Afficher"}
          </button>
        </div>
        {state.error && (
          <p id="login-error" className="text-[13px] text-red-300" role="alert">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        Se connecter
      </Button>
    </form>
  );
}
