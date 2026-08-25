"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="email">
          E-Mail
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="name@verein.local" />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          Passwort
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </div>

      {state?.error && (
        <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Anmelden…" : "Anmelden"}
      </button>
    </form>
  );
}
