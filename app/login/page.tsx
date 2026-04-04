"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const err = params.get("error");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setMessage(j.error ?? "Login failed");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          <span className="text-gradient">Sign in</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Dashboard password (set in environment).</p>
        {err === "config" ? (
          <p className="mt-4 text-sm text-amber-300" role="alert">
            Set <code className="text-xs">JWT_SECRET</code> when{" "}
            <code className="text-xs">DASHBOARD_PASSWORD</code> is enabled.
          </p>
        ) : null}
        <form onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-4">
          <label className="text-sm text-zinc-400">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-100 outline-none ring-cyan-500/40 focus:ring-2"
            />
          </label>
          {message ? (
            <p className="text-sm text-red-300" role="alert">
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-cyan-500/80 to-violet-500/80 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-95 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
