"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { clearCurrentUser, loadCurrentUser } from "@/lib/tickets";

function navClass(active: boolean) {
  return active
    ? "border-primary font-semibold text-slate-900"
    : "border-transparent text-slate-400 hover:text-slate-700";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCurrentUser(loadCurrentUser());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready || currentUser) return;
    router.replace("/login");
  }, [ready, currentUser, router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">Loading support workspace...</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">Redirecting to sign in…</p>
      </main>
    );
  }

  const ticketsActive =
    pathname === "/dashboard/tickets" || pathname.startsWith("/dashboard/tickets/");
  const usersActive = pathname.startsWith("/dashboard/users");
  const rolesActive = pathname.startsWith("/dashboard/roles");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-6">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              eSariSari Support Desk
            </h1>
            <nav className="flex flex-wrap items-center gap-5" aria-label="Workspace">
              <Link
                href="/dashboard/tickets"
                className={`rounded-none border-b-4 px-1 py-1.5 text-base transition-colors ${navClass(ticketsActive)}`}
              >
                Tickets
              </Link>
              <Link
                href="/dashboard/users"
                className={`rounded-none border-b-4 px-1 py-1.5 text-base transition-colors ${navClass(usersActive)}`}
              >
                Users
              </Link>
              <Link
                href="/dashboard/roles"
                className={`rounded-none border-b-4 px-1 py-1.5 text-base transition-colors ${navClass(rolesActive)}`}
              >
                Roles
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <p className="rounded-none border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              {currentUser}
            </p>
            <Button
              variant="outline"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              onClick={() => {
                clearCurrentUser();
                setCurrentUser(null);
                router.push("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
