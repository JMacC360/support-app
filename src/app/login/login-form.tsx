"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { loadCurrentUser, saveCurrentUser } from "@/lib/tickets";

/** Only allow in-app paths under known app routes (open redirect safe). */
function safeRedirectPath(raw: string | null): string {
  if (!raw) return "/tickets";
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/tickets";
    if (!decoded.startsWith("/tickets") && !decoded.startsWith("/users") && !decoded.startsWith("/roles")) return "/tickets";
    return decoded;
  } catch {
    return "/tickets";
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIsHydrated(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (loadCurrentUser()) {
      router.replace(safeRedirectPath(searchParams.get("redirect")));
    }
  }, [isHydrated, router, searchParams]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;
    saveCurrentUser(email.trim().toLowerCase());
    router.replace(safeRedirectPath(searchParams.get("redirect")));
  };

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-none border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          eSariSari Support Desk
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to continue.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className="w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="agent@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Enter any value for now"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full px-4 py-3 text-base">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
