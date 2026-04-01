"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquareReply, Paperclip, SendHorizontal } from "lucide-react";
import { SidebarSelect } from "@/components/sidebar-select";
import { TicketPriorityDropdown } from "@/components/ticket-priority-dropdown";
import { TicketStatusDropdown } from "@/components/ticket-status-dropdown";
import { Button } from "@/components/ui/button";
import {
  categories,
  getTicketLastActivity,
  loadCurrentUser,
  loadTickets,
  roles,
  saveTickets,
  type Reply,
  type Role,
  type Ticket,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/tickets";

function buildDummyAttachmentPreview(name: string) {
  const safeName = name.trim() || "attachment";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#dbeafe" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)" />
    <rect x="40" y="40" width="560" height="280" rx="16" fill="#ffffff" opacity="0.82" />
    <text x="320" y="168" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" fill="#334155">Attachment Preview</text>
    <text x="320" y="204" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#1e3a8a">${safeName}</text>
  </svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const downloadName = safeName.includes(".") ? safeName : `${safeName}.svg`;
  return { url, downloadName };
}

function formatRequesterName(createdBy: string) {
  const base = createdBy.includes("@") ? createdBy.split("@")[0] : createdBy;
  return base
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Parse stored ticket/reply timestamps (e.g. "2026-01-07 17:22" or ISO). */
function parseTicketTime(value: string): number {
  if (!value) return 0;
  const normalized = value.includes("T")
    ? value
    : value.replace(
        /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?.*)$/,
        "$1T$2"
      );
  const t = Date.parse(normalized);
  if (!Number.isNaN(t)) return t;
  const raw = Date.parse(value);
  return Number.isNaN(raw) ? 0 : raw;
}

function formatInteractionTime(value: string): string {
  const ts = parseTicketTime(value);
  if (!ts) return value;
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleString(undefined, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

type InteractionEntry = {
  id: string;
  title: string;
  at: string;
  statusLabel: string;
};

/** Newest-first timeline for the activity strip (root replies + ticket opened). */
function buildInteractionTimeline(ticket: Ticket): InteractionEntry[] {
  const roots = ticket.replies
    .filter((r) => !r.parentId)
    .slice()
    .sort((a, b) => parseTicketTime(a.createdAt) - parseTicketTime(b.createdAt));

  const chronological: InteractionEntry[] = [
    {
      id: "opened",
      title: ticket.subject,
      at: ticket.createdAt,
      statusLabel: "Open",
    },
  ];

  roots.forEach((r, i) => {
    const isLast = i === roots.length - 1;
    const line = r.message.trim().split(/\n/)[0] ?? r.message;
    const title =
      line.length > 80 ? `${line.slice(0, 80).trim()}…` : line || "Reply";
    chronological.push({
      id: r.id,
      title,
      at: r.createdAt,
      statusLabel: isLast
        ? ticket.status
        : r.visibility === "Internal"
          ? "Internal note"
          : "Update logged",
    });
  });

  if (roots.length > 0) {
    const last = chronological[chronological.length - 1];
    if (last && last.id !== "opened") {
      last.statusLabel = ticket.status;
    }
  }

  return chronological.reverse();
}

function isActiveTicketStatus(status: TicketStatus): boolean {
  return status === "Open" || status === "In Progress" || status === "Pending";
}

export default function TicketDetailsPage() {
  const params = useParams<{ ticketId: string }>();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyVisibility, setReplyVisibility] = useState<"Public" | "Internal">(
    "Public"
  );
  const [replyParentId, setReplyParentId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCurrentUser(loadCurrentUser());
      setTickets(loadTickets());
      setIsHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const ticketId = params.ticketId;
  const ticket = useMemo(
    () => tickets.find((item) => item.id === ticketId) ?? null,
    [ticketId, tickets]
  );

  const visibleReplies = useMemo(() => {
    if (!ticket) return [];
    return ticket.replies;
  }, [ticket]);

  const interactionTimeline = useMemo(
    () => (ticket ? buildInteractionTimeline(ticket) : []),
    [ticket]
  );

  const updateTicket = (updates: Partial<Ticket>) => {
    if (!ticket) return;
    const nextTickets = tickets.map((item) =>
      item.id === ticket.id ? { ...item, ...updates } : item
    );
    setTickets(nextTickets);
    saveTickets(nextTickets);
  };

  const addReply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket || !replyMessage.trim()) return;
    const nextReply: Reply = {
      id: `r-${Date.now()}`,
      parentId: replyParentId ?? undefined,
      visibility: replyVisibility,
      author: currentUser ?? "Support Agent",
      message: replyMessage.trim(),
      createdAt: new Date().toLocaleString(),
    };

    const nextTickets = tickets.map((item) =>
      item.id === ticket.id ? { ...item, replies: [...item.replies, nextReply] } : item
    );
    setTickets(nextTickets);
    saveTickets(nextTickets);
    setReplyMessage("");
    setReplyVisibility("Public");
    setReplyParentId(null);
  };

  const renderReplies = (parentId: string | null, depth = 0): React.ReactNode => {
    const children = visibleReplies.filter((reply) =>
      parentId === null ? !reply.parentId : reply.parentId === parentId
    );
    if (children.length === 0) return null;

    return children.map((reply) => (
      <div key={reply.id} className={depth > 0 ? "ml-4 border-l border-slate-200 pl-3" : ""}>
        <div className="rounded-none bg-slate-50 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {reply.author} - {reply.createdAt}
            </p>
            <span
              className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${
                reply.visibility === "Internal"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-50 text-blue-800"
              }`}
            >
              {reply.visibility}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{reply.message}</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary hover:underline"
            onClick={() => setReplyParentId(reply.id)}
          >
            <MessageSquareReply className="size-3.5 shrink-0 opacity-80" aria-hidden />
            Reply in thread
          </button>
        </div>
        <div className="mt-2">{renderReplies(reply.id, depth + 1)}</div>
      </div>
    ));
  };

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">Loading ticket details...</p>
      </main>
    );
  }

  return (
    <>
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1400px] space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/tickets"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to tickets
            </Link>
            {ticket ? (
              <TicketStatusDropdown
                value={ticket.status}
                onChange={(status) => updateTicket({ status })}
              />
            ) : null}
          </div>

          {!ticket ? (
            <div className="border-b border-slate-200 pb-6">
              <p className="text-sm text-slate-600">Ticket not found.</p>
            </div>
          ) : (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
              <section className="border-b border-slate-200 pb-5">
                <p className="text-xs font-medium tabular-nums text-slate-500">{ticket.id}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{ticket.subject}</h2>
                <p className="mt-2 text-sm text-slate-600">{ticket.description}</p>
                <p className="mt-2 text-xs text-slate-500">Created by {ticket.createdBy}</p>
              </section>

              <section className="pb-5">
                <p className="text-sm font-medium text-slate-900">Attachments</p>
                <p className="mt-1 text-xs text-slate-500">
                  Files shared with this ticket.
                </p>
                <div className="mt-3">
                  {ticket.attachments.length === 0 ? (
                    <p className="text-sm text-slate-500">No attachments.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ticket.attachments.map((attachment) => {
                        const preview = buildDummyAttachmentPreview(attachment);
                        return (
                          <div key={attachment} className="rounded-none border border-slate-200 bg-slate-50 p-2">
                            <img
                              src={preview.url}
                              alt={`Attachment ${attachment}`}
                              className="h-28 w-full rounded object-cover"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-slate-700">{attachment}</p>
                              <a
                                href={preview.url}
                                download={preview.downloadName}
                                className="rounded-none border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Download
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="pb-2">
                <div className="flex items-center gap-4">
                  <span className="h-px flex-1 bg-slate-200" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Conversation Thread
                  </p>
                  <span className="h-px flex-1 bg-slate-200" aria-hidden />
                </div>
                <div className="mt-3 space-y-2">
                  {visibleReplies.length === 0 ? (
                    <p className="text-sm text-slate-500">No replies yet.</p>
                  ) : (
                    renderReplies(null)
                  )}
                </div>
                <form className="mt-4 border border-slate-200 bg-white" onSubmit={addReply}>
                  {replyParentId ? (
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span>Replying in thread</span>
                      <button
                        type="button"
                        className="font-medium text-slate-700 hover:text-primary hover:underline"
                        onClick={() => setReplyParentId(null)}
                      >
                        Cancel thread reply
                      </button>
                    </div>
                  ) : null}
                  <div className="border-t-4 border-t-primary px-4 py-4">
                    <div className="flex items-end gap-6 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => setReplyVisibility("Public")}
                        className={`pb-2 text-sm font-semibold leading-none transition-colors ${
                          replyVisibility === "Public"
                            ? "border-b-4 border-b-primary text-primary"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Public Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyVisibility("Internal")}
                        className={`pb-2 text-sm font-semibold leading-none transition-colors ${
                          replyVisibility === "Internal"
                            ? "border-b-4 border-b-primary text-primary"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Internal Note
                      </button>
                    </div>
                    <div className="mt-4 border border-slate-200 bg-slate-100 p-4">
                      <textarea
                        className="min-h-28 w-full resize-none border-0 bg-transparent px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none"
                        placeholder="Type your response here..."
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                      />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex size-10 items-center justify-center text-slate-400 transition-colors hover:text-primary"
                          aria-label="Attach file"
                        >
                          <Paperclip className="size-4" />
                        </button>
                        <Button type="submit" className="min-w-44 gap-2 px-5 text-sm font-semibold">
                          Send Update
                          <SendHorizontal className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </section>
              </div>

              <aside className="flex h-fit min-w-0 flex-col gap-4 xl:sticky xl:top-6">
                <section>
                  <div className="overflow-hidden rounded-none bg-white">
                    <div className="flex flex-col gap-3 px-3 py-2 sm:px-4">
                      {[
                        { label: "Id", value: `#${ticket.id.replace("TCK-", "")}` },
                        {
                          label: "Requester",
                          value: formatRequesterName(ticket.createdBy) || ticket.createdBy,
                        },
                        {
                          label: "Created",
                          value: ticket.createdAt,
                        },
                        {
                          label: "Last activity",
                          value: getTicketLastActivity(ticket),
                        },
                        { label: "Assigned to", value: ticket.assignedTo },
                        { label: "Priority", value: ticket.priority },
                        { label: "Company Name", value: "Oz Designs" },
                        { label: "Issue Type", value: ticket.category },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="grid grid-cols-[100px_1fr] gap-2 text-sm sm:grid-cols-[110px_1fr] sm:gap-3"
                        >
                          <p className="font-semibold text-slate-600">{row.label}</p>
                          {row.label === "Assigned to" ? (
                            <SidebarSelect
                              ariaLabel="Assigned to"
                              value={ticket.assignedTo}
                              onChange={(v) =>
                                updateTicket({
                                  assignedTo: v as Role,
                                })
                              }
                              options={roles.map((role) => ({
                                value: role,
                                label: role,
                              }))}
                            />
                          ) : row.label === "Priority" ? (
                            <TicketPriorityDropdown
                              fullWidth
                              compact
                              value={ticket.priority}
                              onChange={(priority) =>
                                updateTicket({ priority })
                              }
                            />
                          ) : row.label === "Issue Type" ? (
                            <SidebarSelect
                              ariaLabel="Issue type"
                              value={ticket.category}
                              onChange={(v) =>
                                updateTicket({
                                  category: v as TicketCategory,
                                })
                              }
                              options={categories.map((c) => ({
                                value: c,
                                label: c,
                              }))}
                            />
                          ) : (
                            <p className="break-words text-slate-600">{row.value}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section
                  className="border border-slate-200 bg-white"
                  aria-labelledby="activity-log-heading"
                >
                  <div className="border-b border-slate-200 px-3 py-3 sm:px-4 sm:py-4">
                    <h3
                      id="activity-log-heading"
                      className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base"
                    >
                      Activity log
                    </h3>
                  </div>

                  <div className="relative px-3 pb-2 pt-1 sm:px-4">
                    <div
                      className="absolute bottom-6 left-[27px] top-6 w-px bg-slate-200 sm:left-[31px]"
                      aria-hidden
                    />
                    <ul className="relative divide-y divide-slate-100">
                      {interactionTimeline.map((entry, index) => {
                        const isNewest = index === 0;
                        const showActiveChrome =
                          isNewest && isActiveTicketStatus(ticket.status);
                        return (
                          <li
                            key={entry.id}
                            className={`flex gap-2 py-3 sm:gap-3 sm:py-4 ${
                              showActiveChrome ? "bg-sky-50/80 -mx-3 px-3 sm:-mx-4 sm:px-4" : ""
                            }`}
                          >
                            <div className="relative z-10 flex w-7 shrink-0 justify-center pt-1 sm:w-8">
                              <span
                                className={`size-2.5 shrink-0 rounded-none border-2 border-white ${
                                  showActiveChrome ? "bg-red-500" : "bg-slate-400"
                                }`}
                                aria-hidden
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-snug text-slate-800">
                                {entry.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                {formatInteractionTime(entry.at)}
                              </p>
                              <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                                <span className="font-semibold text-slate-700">Status</span>{" "}
                                {entry.statusLabel}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
