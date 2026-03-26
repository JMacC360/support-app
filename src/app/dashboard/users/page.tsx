"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SidebarSelect } from "@/components/sidebar-select";
import { Button } from "@/components/ui/button";
import {
  loadUsers,
  saveUsers,
  userRoles,
  userStatusPillClass,
  type UserRecord,
  type UserRole,
  type UserStatus,
} from "@/lib/users";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

type UserSortKey = "name" | "email";

function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 0) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  const add = (p: number) => {
    if (p >= 1 && p <= totalPages) set.add(p);
  };
  add(1);
  add(totalPages);
  add(currentPage);
  add(currentPage - 1);
  add(currentPage + 1);
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) {
      out.push("ellipsis");
    }
    out.push(n);
  }
  return out;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | UserRole>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | UserStatus>("All");
  const [sortKey, setSortKey] = useState<UserSortKey>("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setUsers(loadUsers());
      setIsHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = users.filter((user) => {
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      const matchesSearch =
        q.length === 0 ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q);
      return matchesRole && matchesStatus && matchesSearch;
    });
    list.sort((a, b) => {
      if (sortKey === "email") {
        return a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    return list;
  }, [users, searchTerm, roleFilter, statusFilter, sortKey]);

  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
  const effectivePage = Math.min(page, totalPages);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPage(1);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchTerm, roleFilter, statusFilter, sortKey]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPage((p) => Math.min(p, totalPages));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [totalPages]);

  const { paginatedUsers, rangeStart, rangeEnd } = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    const end = Math.min(start + pageSize, totalFiltered);
    return {
      paginatedUsers: filteredUsers.slice(start, start + pageSize),
      rangeStart: totalFiltered === 0 ? 0 : start + 1,
      rangeEnd: end,
    };
  }, [filteredUsers, effectivePage, pageSize, totalFiltered]);

  const visiblePages = useMemo(
    () => getVisiblePageNumbers(effectivePage, totalPages),
    [effectivePage, totalPages]
  );

  const leftRoleViews = useMemo(
    () => [
      {
        key: "All" as "All" | UserRole,
        label: "All",
        count: users.length,
      },
      ...userRoles.map((role) => ({
        key: role as "All" | UserRole,
        label: role,
        count: users.filter((u) => u.role === role).length,
      })),
    ],
    [users]
  );

  const toggleStatus = (id: string) => {
    const next = users.map((u) => {
      if (u.id !== id) return u;
      const status: UserStatus = u.status === "Active" ? "Inactive" : "Active";
      return { ...u, status };
    });
    setUsers(next);
    saveUsers(next);
  };

  if (!isHydrated) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-sm text-slate-500">Loading users…</p>
      </main>
    );
  }

  return (
    <>
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1400px] space-y-4">
          <header className="border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Users
                </h2>
                <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Manage team access and activation in one place.
                </p>
              </div>
              <div>
                <Button type="button" className="text-sm font-semibold" onClick={() => router.push("/dashboard/users/new")}>
                  Add New User
                </Button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <aside className="border border-slate-200 bg-white p-3 lg:sticky lg:top-6 lg:h-fit">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </p>
              <div className="space-y-1">
                {leftRoleViews.map((view) => (
                  <button
                    key={view.key === "All" ? "all" : view.key}
                    type="button"
                    onClick={() => setRoleFilter(view.key)}
                    className={`flex w-full items-center justify-between rounded-none px-2.5 py-2 text-sm transition-colors ${
                      roleFilter === view.key
                        ? "border-r-4 border-primary bg-slate-50 font-medium text-primary"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-left">{view.label}</span>
                    <span className="min-w-5 text-right tabular-nums">{view.count}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0 border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex w-full min-w-[220px] flex-col gap-1 sm:w-72">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                        aria-hidden
                      />
                      <input
                        id="users-table-search"
                        type="search"
                        autoComplete="off"
                        className="w-full rounded-none border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
                        placeholder="Name, email, ID, role…"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-[11rem] sm:w-auto sm:min-w-[12rem]">
                    <SidebarSelect
                      ariaLabel="Filter by account status"
                      value={statusFilter}
                      onChange={(value) => setStatusFilter(value as "All" | UserStatus)}
                      wrapperClassName="border-slate-300 w-auto min-w-0"
                      options={[
                        { value: "All", label: "All statuses" },
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                      ]}
                    />
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 text-xs sm:ml-auto sm:w-auto">
                    <span className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                      Role: {roleFilter}
                    </span>
                    {totalFiltered > 0 ? (
                      <span className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                        {totalFiltered} result{totalFiltered === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {filteredUsers.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">
                  No users match current filters.
                </p>
              ) : (
                <>
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-[1] bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="border-t border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-medium tabular-nums text-primary">
                              {user.id}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                            <td className="px-4 py-3 text-slate-600">{user.email}</td>
                            <td className="px-4 py-3 text-slate-700">{user.role}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-none px-2 py-1 text-xs font-medium ${userStatusPillClass[user.status]}`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-slate-300"
                                onClick={() => toggleStatus(user.id)}
                              >
                                {user.status === "Active" ? "Deactivate" : "Activate"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <nav
                    className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                    aria-label="Users table pagination"
                  >
                    <p className="text-sm text-slate-600">
                      Showing{" "}
                      <span className="font-medium text-slate-900">{rangeStart}</span>
                      {"–"}
                      <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
                      <span className="font-medium text-slate-900">{totalFiltered}</span>
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="whitespace-nowrap">Rows per page</span>
                        <select
                          className="rounded-none border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
                          value={pageSize}
                          onChange={(event) => {
                            const next = Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number];
                            setPageSize(next);
                            setPage(1);
                          }}
                        >
                          {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={effectivePage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="size-4" />
                          Previous
                        </Button>
                        {visiblePages.map((item, idx) =>
                          item === "ellipsis" ? (
                            <span
                              key={`ellipsis-${idx}`}
                              className="px-1.5 text-sm text-slate-400"
                              aria-hidden
                            >
                              …
                            </span>
                          ) : (
                            <Button
                              key={item}
                              type="button"
                              variant={item === effectivePage ? "default" : "outline"}
                              size="sm"
                              className="min-w-9 px-2"
                              onClick={() => setPage(item)}
                              aria-label={`Page ${item}`}
                              aria-current={item === effectivePage ? "page" : undefined}
                            >
                              {item}
                            </Button>
                          )
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={effectivePage >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          aria-label="Next page"
                        >
                          Next
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </nav>
                </>
              )}
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
