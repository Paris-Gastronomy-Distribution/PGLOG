"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import { Button, cardClass, inputClass, Spinner } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className={`${cardClass} space-y-5 p-6 sm:p-7`}>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <label htmlFor="password" className="sr-only">
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
            placeholder="Mot de passe"
            className={`${inputClass} pr-24`}
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-3 py-1.5 text-[13px] font-semibold text-brand hover:bg-brand-soft"
          >
            {show ? "Masquer" : "Afficher"}
          </button>
        </div>
        {state.error && (
          <p id="login-error" className="text-[13px] text-danger" role="alert">
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
