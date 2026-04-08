"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken, loginWithPassword } from "@/lib/auth";
import {
  canAccessWorkspacePath,
  loadCurrentUser,
} from "@/lib/tickets";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIsHydrated(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const existingUser = loadCurrentUser();
    if (existingUser && getAccessToken()) {
      const requestedPath = safeRedirectPath(searchParams.get("redirect"));
      const destination = canAccessWorkspacePath(existingUser, requestedPath)
        ? requestedPath
        : "/tickets";
      router.replace(destination);
    }
  }, [isHydrated, router, searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const enteredEmail = email.trim();
    const enteredPassword = password.trim();
    if (!enteredEmail || !enteredPassword) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await loginWithPassword(enteredEmail, enteredPassword);
      const signedInEmail = session.user.email;

      const requestedPath = safeRedirectPath(searchParams.get("redirect"));
      const destination = canAccessWorkspacePath(signedInEmail, requestedPath)
        ? requestedPath
        : "/tickets";
      router.replace(destination);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="w-full max-w-md rounded-none border border-slate-200 bg-white px-8 pb-8 pt-6 shadow-sm">
        <Image
          src="/esarisari-support-desk-logo-standard.png"
          alt="eSariSari"
          width={180}
          height={150}
          className="mx-auto block w-full max-w-[280px] leading-none"
          priority
        />
        <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Sign in
        </h1>
        <div className="mt-2 rounded-none border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Connected to support API</p>
          <p className="mt-1">
            Sign in with a backend user account from your Laravel auth database.
          </p>
        </div>
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
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {errorMessage ? (
            <p className="text-sm text-rose-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full px-4 py-3 text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
