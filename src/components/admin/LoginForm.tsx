"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined as { error?: string } | undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" className="field" defaultValue={defaultEmail} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="field" required />
      </div>
      {state?.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <button className="btn btn-dark w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
