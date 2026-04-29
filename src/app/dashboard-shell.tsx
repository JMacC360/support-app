"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AUTH_SESSION_UPDATED_EVENT,
  fetchAuthenticatedUser,
  getAccessToken,
  loadAuthSession,
  logoutFromBackend,
} from "@/lib/auth";
import {
  canAccessWorkspacePath,
  loadCurrentUser,
} from "@/lib/tickets";

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
  const [authSessionRevision, setAuthSessionRevision] = useState(0);

  useEffect(() => {
    const onAuthSessionUpdated = () => {
      setAuthSessionRevision((prev) => prev + 1);
    };

    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, onAuthSessionUpdated);
    return () => {
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, onAuthSessionUpdated);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrapAuth = async () => {
      const session = loadAuthSession();
      if (!session || !getAccessToken()) {
        if (!active) return;
        setCurrentUser(null);
        setReady(true);
        return;
      }

      const hydratedUser = await fetchAuthenticatedUser();
      if (!active) return;

      setCurrentUser(hydratedUser?.email ?? loadCurrentUser());
      setReady(true);
    };

    void bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || currentUser) return;
    router.replace("/login");
  }, [ready, currentUser, router]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    let active = true;
    const stableUserEmail = currentUser;

    const refreshAndValidateAccess = async () => {
      try {
        const hydratedUser = await fetchAuthenticatedUser();
        if (!active) return;
        if (hydratedUser?.email) {
          setCurrentUser(hydratedUser.email);
        }
      } catch {
        // Ignore transient failures; access checks will use the last known session.
      }

      if (!active) return;
      if (!canAccessWorkspacePath(stableUserEmail, pathname)) {
        router.replace("/tickets");
      }
    };

    void refreshAndValidateAccess();

    const onFocus = () => {
      void refreshAndValidateAccess();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, currentUser, pathname, router]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    if (!canAccessWorkspacePath(currentUser, pathname)) {
      router.replace("/tickets");
    }
  }, [ready, currentUser, pathname, router, authSessionRevision]);

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

  const ticketsActive = pathname === "/tickets" || pathname.startsWith("/tickets/");
  const usersActive = pathname.startsWith("/users");
  const rolesActive = pathname.startsWith("/roles");
  const showUsersLink = canAccessWorkspacePath(currentUser, "/users");
  const showRolesLink = canAccessWorkspacePath(currentUser, "/roles");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/tickets"
              className="flex min-w-0 shrink-0 items-center leading-none"
              aria-label="eSariSari Support Desk"
            >
              <Image
                src="/esarisari-support-desk-logo-standard.png"
                alt="eSariSari"
                width={600}
                height={207}
                className="block h-9 w-auto max-w-[min(52vw,200px)] align-middle"
                priority
              />
            </Link>
            <nav className="flex flex-wrap items-center gap-5" aria-label="Workspace">
              <Link
                href="/tickets"
                className={`rounded-none border-b-4 px-1 py-1.5 text-base transition-colors ${navClass(ticketsActive)}`}
              >
                Tickets
              </Link>
              {showUsersLink ? (
                <Link
                  href="/users"
                  className={`rounded-none border-b-4 px-1 py-1.5 text-base transition-colors ${navClass(usersActive)}`}
                >
                  Users
                </Link>
              ) : null}
              {showRolesLink ? (
                <Link
                  href="/roles"
                  className={`rounded-none border-b-4 px-1 py-1.5 text-base transition-colors ${navClass(rolesActive)}`}
                >
                  Roles
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <p className="rounded-none border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              {currentUser}
            </p>
            <Button
              variant="outline"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              onClick={async () => {
                await logoutFromBackend();
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
