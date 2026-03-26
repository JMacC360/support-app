"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SidebarSelect } from "@/components/sidebar-select";
import { TicketTableStatus } from "@/components/ticket-table-status";
import { Button } from "@/components/ui/button";
import {
  categories,
  getAutoAssignee,
  loadCurrentUser,
  loadTickets,
  newTicketId,
  priorities,
  priorityPillClass,
  roles,
  saveTickets,
  statuses,
  type Role,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

/** Page buttons with ellipses for large page counts (1-based current page). */
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

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("Technical");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [attachmentInput, setAttachmentInput] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"Auto" | "Manual">("Auto");
  const [manualAssignee, setManualAssignee] = useState<Role>("L1 Support");

  const [statusFilter, setStatusFilter] = useState<"All" | TicketStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | TicketCategory>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | TicketPriority>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTickets(loadTickets());
      setIsHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const filteredTickets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "All" || ticket.status === statusFilter;
      const matchesCategory =
        categoryFilter === "All" || ticket.category === categoryFilter;
      const matchesPriority =
        priorityFilter === "All" || ticket.priority === priorityFilter;
      const matchesSearch =
        q.length === 0 ||
        ticket.id.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        ticket.createdBy.toLowerCase().includes(q) ||
        ticket.assignedTo.toLowerCase().includes(q) ||
        ticket.status.toLowerCase().includes(q) ||
        ticket.category.toLowerCase().includes(q);

      return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
    });
  }, [tickets, statusFilter, categoryFilter, priorityFilter, searchTerm]);

  const totalFiltered = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
  const effectivePage = Math.min(page, totalPages);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPage(1);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchTerm, statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPage((p) => Math.min(p, totalPages));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [totalPages]);

  const { paginatedTickets, rangeStart, rangeEnd } = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    const end = Math.min(start + pageSize, totalFiltered);
    return {
      paginatedTickets: filteredTickets.slice(start, start + pageSize),
      rangeStart: totalFiltered === 0 ? 0 : start + 1,
      rangeEnd: end,
    };
  }, [filteredTickets, effectivePage, pageSize, totalFiltered]);

  const visiblePages = useMemo(
    () => getVisiblePageNumbers(effectivePage, totalPages),
    [effectivePage, totalPages]
  );

  const leftStatusViews = useMemo(
    () => [
      {
        key: "All" as "All" | TicketStatus,
        label: "All",
        count: tickets.length,
      },
      ...statuses.map((status) => ({
        key: status as "All" | TicketStatus,
        label: status,
        count: tickets.filter((ticket) => ticket.status === status).length,
      })),
    ],
    [tickets]
  );

  const handleCreateTicket = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentUser = loadCurrentUser();
    if (!currentUser) return;
    if (!subject.trim() || !description.trim()) return;

    const attachments = attachmentInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const assignedTo =
      assignmentMode === "Auto" ? getAutoAssignee(category, priority) : manualAssignee;
    const nextNumber = tickets.length + 1;
    const createdTicket: Ticket = {
      id: newTicketId(nextNumber),
      subject: subject.trim(),
      description: description.trim(),
      createdAt: new Date().toLocaleString(),
      category,
      priority,
      status: "Open",
      attachments,
      createdBy: currentUser,
      assignedTo,
      escalated: false,
      replies: [],
    };

    const nextTickets = [createdTicket, ...tickets];
    setTickets(nextTickets);
    saveTickets(nextTickets);
    setSubject("");
    setDescription("");
    setCategory("Technical");
    setPriority("Medium");
    setAttachmentInput("");
    setAssignmentMode("Auto");
    setManualAssignee("L1 Support");
    setIsCreatePanelOpen(false);
  };

  if (!isHydrated) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-sm text-slate-500">Loading tickets…</p>
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
                  Tickets
                </h2>
                <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Manage and prioritize incoming support requests across all departments.
                </p>
              </div>
              {/* <div>
                <Button onClick={() => setIsCreatePanelOpen(true)}>Create Ticket</Button>
              </div> */}
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <aside className="border border-slate-200 bg-white p-3 lg:sticky lg:top-6 lg:h-fit">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ticket Status
              </p>
              <div className="space-y-1">
                {leftStatusViews.map((view) => (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => setStatusFilter(view.key)}
                    className={`flex w-full items-center justify-between rounded-none px-2.5 py-2 text-sm transition-colors ${
                      statusFilter === view.key
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
                        id="ticket-table-search"
                        type="search"
                        autoComplete="off"
                        className="w-full rounded-none border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
                        placeholder="ID, subject, requester, assignee, status…"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-[11rem] sm:w-auto sm:min-w-[12rem]">
                    <SidebarSelect
                      ariaLabel="Filter by category"
                      value={categoryFilter}
                      onChange={(value) =>
                        setCategoryFilter(value as "All" | TicketCategory)
                      }
                      wrapperClassName="border-slate-300 w-auto min-w-0"
                      options={[
                        { value: "All", label: "All Categories" },
                        ...categories.map((value) => ({
                          value,
                          label: value,
                        })),
                      ]}
                    />
                  </div>
                  <div className="w-full min-w-[11rem] sm:w-auto sm:min-w-[12rem]">
                    <SidebarSelect
                      ariaLabel="Filter by priority"
                      value={priorityFilter}
                      onChange={(value) =>
                        setPriorityFilter(value as "All" | TicketPriority)
                      }
                      wrapperClassName="border-slate-300 w-auto min-w-0"
                      options={[
                        { value: "All", label: "All Priorities" },
                        ...priorities.map((value) => ({
                          value,
                          label: value,
                        })),
                      ]}
                    />
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 text-xs sm:ml-auto sm:w-auto">
                    <span className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                      Status: {statusFilter}
                    </span>
                    {totalFiltered > 0 ? (
                      <span className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                        {totalFiltered} result{totalFiltered === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {filteredTickets.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">
                  No tickets match current filters.
                </p>
              ) : (
                <>
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-[1] bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3">Requester</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3">Assignee</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTickets.map((ticket) => (
                          <tr
                            key={ticket.id}
                            role="link"
                            tabIndex={0}
                            onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push(`/dashboard/tickets/${ticket.id}`);
                              }
                            }}
                            className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none"
                          >
                            <td className="px-4 py-3 font-medium tabular-nums text-slate-800">
                              {ticket.id}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{ticket.subject}</td>
                            <td className="px-4 py-3 text-slate-600">{ticket.createdBy}</td>
                            <td className="px-4 py-3 text-slate-600">{ticket.createdAt}</td>
                            <td className="px-4 py-3 text-slate-600">{ticket.assignedTo}</td>
                            <td className="px-4 py-3">
                              <TicketTableStatus status={ticket.status} />
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-none px-2 py-1 text-xs font-medium ${priorityPillClass[ticket.priority]}`}
                              >
                                {ticket.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <nav
                    className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                    aria-label="Tickets table pagination"
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

      {isCreatePanelOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close create ticket panel"
            className="h-full flex-1 bg-slate-900/40"
            onClick={() => setIsCreatePanelOpen(false)}
          />
          <aside className="h-full w-full max-w-xl overflow-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Ticket</h3>
              <Button variant="outline" onClick={() => setIsCreatePanelOpen(false)}>
                Close
              </Button>
            </div>
            <form className="grid gap-3" onSubmit={handleCreateTicket}>
              <input
                id="subject"
                className="w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Subject / Title"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
              <textarea
                id="description"
                className="min-h-24 w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  id="category"
                  className="rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as TicketCategory)
                  }
                >
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  id="priority"
                  className="rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TicketPriority)
                  }
                >
                  {priorities.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <input
                id="attachments"
                className="w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Attachments (comma-separated)"
                value={attachmentInput}
                onChange={(event) => setAttachmentInput(event.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  id="assignment-mode"
                  className="rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={assignmentMode}
                  onChange={(event) =>
                    setAssignmentMode(event.target.value as "Auto" | "Manual")
                  }
                >
                  <option value="Auto">Auto Assignment</option>
                  <option value="Manual">Manual Assignment</option>
                </select>
                <select
                  id="assigned-to"
                  className="rounded-none border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  value={
                    assignmentMode === "Auto"
                      ? getAutoAssignee(category, priority)
                      : manualAssignee
                  }
                  disabled={assignmentMode === "Auto"}
                  onChange={(event) => setManualAssignee(event.target.value as Role)}
                >
                  {roles.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreatePanelOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Ticket</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
