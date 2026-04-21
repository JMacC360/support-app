"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Paperclip, Pencil, SendHorizontal, Trash2, X } from "lucide-react";
import { SidebarSelect } from "@/components/sidebar-select";
import { TicketPriorityDropdown } from "@/components/ticket-priority-dropdown";
import { TicketStatusDropdown } from "@/components/ticket-status-dropdown";
import { Button } from "@/components/ui/button";
import {
  createTicketReply,
  deleteTicketReply,
  fetchProtectedAttachmentBlob,
  fetchTicketDependencies,
  fetchTicketDetail,
  type TicketAssigneeOption,
  type TicketCategoryOption,
  updateTicketReply,
  updateTicketFields,
} from "@/lib/tickets-api";
import {
  canAssignTickets,
  canEscalateTicketToAdmin,
  canManageTicketLifecycle,
  canViewInternalNotes,
  canViewTicket,
  categories,
  getTicketLastActivity,
  loadCurrentUser,
  type Reply,
  type Ticket,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/tickets";
import { loadAuthSession } from "@/lib/auth";

function formatRequesterName(createdBy: string) {
  const base = createdBy.includes("@") ? createdBy.split("@")[0] : createdBy;
  return base
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAttachmentLabel(source: string): string {
  if (!source) return "attachment";
  try {
    const normalized = source.startsWith("http") ? source : `https://example.com/${source}`;
    const parsed = new URL(normalized);
    const pathPart = parsed.pathname.split("/").filter(Boolean).pop();
    return pathPart ? decodeURIComponent(pathPart) : source;
  } catch {
    const candidate = source.split("/").pop();
    return candidate ? decodeURIComponent(candidate) : source;
  }
}

const IMAGE_ATTACHMENT_EXTENSIONS = new Set(["jpeg", "jpg", "png", "gif", "bmp", "svg", "webp"]);

function isImageAttachment(source: string): boolean {
  const label = getAttachmentLabel(source).toLowerCase();
  const ext = label.split(".").pop()?.split("?")[0] ?? "";
  return IMAGE_ATTACHMENT_EXTENSIONS.has(ext);
}

const ALLOWED_REPLY_ATTACHMENT_EXTENSIONS = new Set([
  "jpeg",
  "jpg",
  "png",
  "gif",
  "bmp",
  "svg",
  "webp",
  "pdf",
]);
const REPLY_ATTACHMENT_ACCEPT = ".jpeg,.jpg,.png,.gif,.bmp,.svg,.webp,.pdf";
const MAX_REPLY_ATTACHMENT_BYTES = 50 * 1024 * 1024;

function validateReplyAttachments(files: File[]): string | null {
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_REPLY_ATTACHMENT_EXTENSIONS.has(extension)) {
      return `Unsupported file type for "${file.name}". Allowed: JPG, PNG, GIF, BMP, SVG, WEBP, PDF.`;
    }
    if (file.size > MAX_REPLY_ATTACHMENT_BYTES) {
      return `"${file.name}" is larger than 50MB.`;
    }
  }
  return null;
}

function renderReplyAttachments(
  attachments: string[],
  keyPrefix: string,
  onImageClick: (attachment: string, label: string) => void
): React.ReactNode {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => {
        const label = getAttachmentLabel(attachment);
        const isImage = isImageAttachment(attachment);

        if (!isImage) {
          return (
            <button
              key={`${keyPrefix}-${attachment}`}
              type="button"
              className="rounded-none border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-400 hover:text-slate-900"
              onClick={() => {
                void openProtectedAttachmentFile(attachment);
              }}
            >
              {label}
            </button>
          );
        }

        return (
          <button
            key={`${keyPrefix}-${attachment}`}
            type="button"
            className="block overflow-hidden rounded-none border border-slate-300 bg-white hover:border-slate-400"
            onClick={() => {
              onImageClick(attachment, label);
            }}
          >
            <ProtectedAttachmentImage attachment={attachment} label={label} />
            <p className="truncate border-t border-slate-200 px-2 py-1 text-xs text-slate-700">{label}</p>
          </button>
        );
      })}
    </div>
  );
}

async function openProtectedAttachmentFile(attachment: string) {
  const blob = await fetchProtectedAttachmentBlob(attachment);
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function ProtectedAttachmentImage({ attachment, label }: { attachment: string; label: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        const blob = await fetchProtectedAttachmentBlob(attachment);
        if (!isActive) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch {
        if (!isActive) return;
        setPreviewUrl(null);
      }
    };

    void loadImage();
    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment]);

  if (!previewUrl) {
    return (
      <div className="flex h-28 w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
        Loading preview...
      </div>
    );
  }

  return <img src={previewUrl} alt={label} className="h-28 w-full object-cover" />;
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
  action?: string;
  actor?: string;
  details?: Array<{
    field: string;
    label: string;
    from: string;
    to: string;
  }>;
};

function getActivityActionLabel(action?: string): string | null {
  if (!action) return null;

  switch (action) {
    case "ticket.created":
      return "Ticket created";
    case "ticket.updated":
      return "Ticket updated";
    case "ticket.status_updated":
      return "Status changed";
    case "ticket.deleted":
      return "Ticket deleted";
    case "ticket.thread_created":
      return "Reply added";
    case "ticket.thread_updated":
      return "Reply updated";
    case "ticket.thread_deleted":
      return "Reply deleted";
    default:
      return "Update logged";
  }
}

function getActivityDotClass(action: string | undefined, showActiveChrome: boolean): string {
  if (showActiveChrome) return "bg-red-500";
  if (!action) return "bg-slate-400";

  switch (action) {
    case "ticket.created":
      return "bg-blue-500";
    case "ticket.status_updated":
      return "bg-amber-500";
    case "ticket.thread_created":
      return "bg-emerald-500";
    case "ticket.thread_updated":
      return "bg-indigo-500";
    case "ticket.thread_deleted":
    case "ticket.deleted":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

/** Newest-first timeline for the activity strip (root replies + ticket opened). */
function buildInteractionTimeline(ticket: Ticket): InteractionEntry[] {
  const apiActivityTimeline = (ticket.activityLog ?? [])
    .slice()
    .sort((a, b) => parseTicketTime(b.at) - parseTicketTime(a.at))
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      at: entry.at,
      statusLabel: entry.statusLabel,
      action: entry.action,
      actor: entry.actor,
      details: entry.details ?? [],
    }));
  if (apiActivityTimeline.length > 0) {
    return apiActivityTimeline;
  }

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
  const [categoryOptions, setCategoryOptions] = useState<TicketCategoryOption[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<TicketAssigneeOption[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyVisibility, setReplyVisibility] = useState<"Public" | "Internal">(
    "Public"
  );
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyMessage, setEditingReplyMessage] = useState("");
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [isReplyDeletingId, setIsReplyDeletingId] = useState<string | null>(null);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const replyAttachmentsInputRef = useRef<HTMLInputElement | null>(null);
  const [editingReplyAttachments, setEditingReplyAttachments] = useState<File[]>([]);
  const editingReplyAttachmentsInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingTicketContent, setIsEditingTicketContent] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [retainedTicketAttachments, setRetainedTicketAttachments] = useState<string[]>([]);
  const [ticketAttachmentFiles, setTicketAttachmentFiles] = useState<File[]>([]);
  const ticketAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [isTicketContentSaving, setIsTicketContentSaving] = useState(false);
  const [fullscreenImageAttachment, setFullscreenImageAttachment] = useState<{
    attachment: string;
    label: string;
  } | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [isFullscreenImageLoading, setIsFullscreenImageLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const user = loadCurrentUser();
      setCurrentUser(user);
      setErrorMessage(null);

      try {
        const [ticket, dependencies] = await Promise.all([
          fetchTicketDetail(params.ticketId),
          fetchTicketDependencies(),
        ]);

        if (!active) return;
        setTickets([ticket]);
        setCategoryOptions(dependencies.categories);
        setAssigneeOptions(dependencies.assignees);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load ticket.");
      } finally {
        if (!active) return;
        setIsHydrated(true);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [params.ticketId]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!fullscreenImageAttachment) {
      setFullscreenImageUrl(null);
      setIsFullscreenImageLoading(false);
      return;
    }

    let isActive = true;
    let objectUrl: string | null = null;
    setIsFullscreenImageLoading(true);

    const loadFullscreenImage = async () => {
      try {
        const blob = await fetchProtectedAttachmentBlob(fullscreenImageAttachment.attachment);
        if (!isActive) return;
        objectUrl = URL.createObjectURL(blob);
        setFullscreenImageUrl(objectUrl);
      } catch {
        if (!isActive) return;
        setFullscreenImageUrl(null);
        setErrorMessage("Unable to load attachment preview.");
      } finally {
        if (isActive) {
          setIsFullscreenImageLoading(false);
        }
      }
    };

    void loadFullscreenImage();
    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fullscreenImageAttachment]);

  useEffect(() => {
    if (!fullscreenImageAttachment) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenImageAttachment(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreenImageAttachment]);

  const ticketId = params.ticketId;
  const matchedTicket = useMemo(
    () => tickets.find((item) => item.id === ticketId) ?? null,
    [ticketId, tickets]
  );
  const ticket = useMemo(() => {
    if (!matchedTicket || !currentUser) return null;
    return canViewTicket(currentUser, matchedTicket) ? matchedTicket : null;
  }, [currentUser, matchedTicket]);
  const isUnauthorizedForTicket = Boolean(matchedTicket && !ticket);
  const canManageLifecycle = canManageTicketLifecycle(currentUser);
  const canAssignTicketsForCurrentUser = canAssignTickets(currentUser);
  const canUseInternalNotes = canViewInternalNotes(currentUser);
  const canEscalateToAdmin = ticket
    ? canEscalateTicketToAdmin(currentUser, ticket)
    : false;

  const visibleReplies = useMemo(() => {
    if (!ticket) return [];
    return ticket.replies.filter((reply) => {
      if (reply.visibility === "Public") return true;
      return canUseInternalNotes;
    });
  }, [canUseInternalNotes, ticket]);

  const interactionTimeline = useMemo(
    () => (ticket ? buildInteractionTimeline(ticket) : []),
    [ticket]
  );

  const canManageReplies = canManageLifecycle || canUseInternalNotes;
  const canEditTicketContent = Boolean(loadAuthSession()?.accessToken);
  const displayedTicketAttachments =
    ticket && canEditTicketContent && isEditingTicketContent
      ? retainedTicketAttachments
      : (ticket?.attachments ?? []);

  useEffect(() => {
    if (!ticket) return;
    setEditedSubject(ticket.subject);
    setEditedDescription(ticket.description);
    setRetainedTicketAttachments(ticket.attachments);
  }, [ticket]);

  const openFullscreenImage = (attachment: string, label: string) => {
    setFullscreenImageAttachment({ attachment, label });
  };

  const closeFullscreenImage = () => {
    setFullscreenImageAttachment(null);
  };

  const reloadCurrentTicket = async (id: string) => {
    const refreshedTicket = await fetchTicketDetail(id);
    setTickets([refreshedTicket]);
  };

  const updateTicket = async (updates: Partial<Ticket>) => {
    if (!ticket) return;

    const payload: {
      status?: TicketStatus;
      priority?: string;
      categoryId?: number;
      assignedTo?: number | null;
    } = {};
    let successNotice = "Ticket updated.";
    let errorNotice = "Unable to update ticket.";

    if (updates.status) {
      payload.status = updates.status;
      successNotice = "Status updated successfully.";
      errorNotice = "Unable to update status.";
    }
    if (updates.priority) {
      payload.priority = updates.priority;
      successNotice = "Priority updated successfully.";
      errorNotice = "Unable to update priority.";
    }
    if (updates.category) {
      const category = categoryOptions.find((entry) => entry.name === updates.category);
      if (category) {
        payload.categoryId = category.id;
        successNotice = "Issue type updated successfully.";
        errorNotice = "Unable to update issue type.";
      }
    }
    if (updates.assignedTo !== undefined) {
      const assignee = assigneeOptions.find((entry) => entry.name === updates.assignedTo);
      payload.assignedTo = assignee?.id ?? null;
      successNotice = "Assignee updated successfully.";
      errorNotice = "Unable to update assignee.";
    }

    try {
      await updateTicketFields(ticket.id, payload);
      await reloadCurrentTicket(ticket.id);
      setErrorMessage(null);
      setSuccessMessage(successNotice);
    } catch (error) {
      setSuccessMessage(null);
      setErrorMessage(error instanceof Error ? error.message : errorNotice);
    }
  };

  const openTicketAttachmentPicker = () => {
    ticketAttachmentInputRef.current?.click();
  };

  const onTicketAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const validationError = validateReplyAttachments(files);
    if (validationError) {
      setErrorMessage(validationError);
      setTicketAttachmentFiles([]);
      if (ticketAttachmentInputRef.current) {
        ticketAttachmentInputRef.current.value = "";
      }
      return;
    }
    setErrorMessage(null);
    setTicketAttachmentFiles(files);
  };

  const removeTicketAttachment = (index: number) => {
    setTicketAttachmentFiles((current) => {
      const next = current.filter((_, i) => i !== index);
      if (next.length === 0 && ticketAttachmentInputRef.current) {
        ticketAttachmentInputRef.current.value = "";
      }
      return next;
    });
  };

  const clearTicketAttachments = () => {
    setTicketAttachmentFiles([]);
    if (ticketAttachmentInputRef.current) {
      ticketAttachmentInputRef.current.value = "";
    }
  };

  const removeRetainedTicketAttachment = (attachmentToRemove: string) => {
    setRetainedTicketAttachments((current) =>
      current.filter((attachment) => attachment !== attachmentToRemove)
    );
  };

  const startTicketContentEdit = () => {
    if (!ticket) return;
    setIsEditingTicketContent(true);
    setEditedSubject(ticket.subject);
    setEditedDescription(ticket.description);
    setRetainedTicketAttachments(ticket.attachments);
    clearTicketAttachments();
  };

  const resetTicketContentDraft = () => {
    if (!ticket) return;
    setIsEditingTicketContent(false);
    setEditedSubject(ticket.subject);
    setEditedDescription(ticket.description);
    setRetainedTicketAttachments(ticket.attachments);
    clearTicketAttachments();
  };

  const saveTicketContent = async () => {
    if (!ticket) return;
    if (!editedSubject.trim() || !editedDescription.trim()) {
      setErrorMessage("Title and description are required.");
      return;
    }

    setIsTicketContentSaving(true);
    setErrorMessage(null);
    try {
      await updateTicketFields(ticket.id, {
        subject: editedSubject.trim(),
        description: editedDescription.trim(),
        existingAttachments: retainedTicketAttachments,
        attachments: ticketAttachmentFiles,
      });
      await reloadCurrentTicket(ticket.id);
      setIsEditingTicketContent(false);
      clearTicketAttachments();
      setSuccessMessage("Ticket details updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update ticket details.");
    } finally {
      setIsTicketContentSaving(false);
    }
  };

  const addReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket || !replyMessage.trim()) return;
    if (replyVisibility === "Internal" && !canUseInternalNotes) return;
    setIsReplySubmitting(true);
    try {
      await createTicketReply({
        ticketId: ticket.id,
        message: replyMessage.trim(),
        visibility: replyVisibility,
        attachments: replyAttachments,
      });
      await reloadCurrentTicket(ticket.id);
      setReplyMessage("");
      setReplyVisibility("Public");
      setReplyAttachments([]);
      if (replyAttachmentsInputRef.current) {
        replyAttachmentsInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add reply.");
    } finally {
      setIsReplySubmitting(false);
    }
  };

  const openReplyAttachmentPicker = () => {
    replyAttachmentsInputRef.current?.click();
  };

  const handleReplyAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const validationError = validateReplyAttachments(files);
    if (validationError) {
      setErrorMessage(validationError);
      setReplyAttachments([]);
      if (replyAttachmentsInputRef.current) {
        replyAttachmentsInputRef.current.value = "";
      }
      return;
    }
    setErrorMessage(null);
    setReplyAttachments(files);
  };

  const removeSelectedReplyAttachment = (index: number) => {
    setReplyAttachments((current) => {
      const next = current.filter((_, i) => i !== index);
      if (next.length === 0 && replyAttachmentsInputRef.current) {
        replyAttachmentsInputRef.current.value = "";
      }
      return next;
    });
  };

  const clearSelectedReplyAttachments = () => {
    setReplyAttachments([]);
    if (replyAttachmentsInputRef.current) {
      replyAttachmentsInputRef.current.value = "";
    }
  };

  const startEditingReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditingReplyMessage(reply.message);
    setEditingReplyAttachments([]);
    if (editingReplyAttachmentsInputRef.current) {
      editingReplyAttachmentsInputRef.current.value = "";
    }
  };

  const cancelEditingReply = () => {
    setEditingReplyId(null);
    setEditingReplyMessage("");
    setEditingReplyAttachments([]);
    if (editingReplyAttachmentsInputRef.current) {
      editingReplyAttachmentsInputRef.current.value = "";
    }
  };

  const saveEditingReply = async (reply: Reply) => {
    if (!ticket || !editingReplyMessage.trim()) return;
    setIsReplySubmitting(true);
    try {
      await updateTicketReply({
        ticketId: ticket.id,
        threadId: reply.id,
        message: editingReplyMessage.trim(),
        visibility: reply.visibility,
        attachments: editingReplyAttachments,
      });
      await reloadCurrentTicket(ticket.id);
      cancelEditingReply();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update reply.");
    } finally {
      setIsReplySubmitting(false);
    }
  };

  const removeReply = async (replyId: string) => {
    if (!ticket) return;
    setIsReplyDeletingId(replyId);
    try {
      await deleteTicketReply({
        ticketId: ticket.id,
        threadId: replyId,
      });
      await reloadCurrentTicket(ticket.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete reply.");
    } finally {
      setIsReplyDeletingId(null);
    }
  };

  const openEditingReplyAttachmentPicker = () => {
    editingReplyAttachmentsInputRef.current?.click();
  };

  const handleEditingReplyAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const validationError = validateReplyAttachments(files);
    if (validationError) {
      setErrorMessage(validationError);
      setEditingReplyAttachments([]);
      if (editingReplyAttachmentsInputRef.current) {
        editingReplyAttachmentsInputRef.current.value = "";
      }
      return;
    }
    setErrorMessage(null);
    setEditingReplyAttachments(files);
  };

  const removeSelectedEditingReplyAttachment = (index: number) => {
    setEditingReplyAttachments((current) => {
      const next = current.filter((_, i) => i !== index);
      if (next.length === 0 && editingReplyAttachmentsInputRef.current) {
        editingReplyAttachmentsInputRef.current.value = "";
      }
      return next;
    });
  };

  const clearSelectedEditingReplyAttachments = () => {
    setEditingReplyAttachments([]);
    if (editingReplyAttachmentsInputRef.current) {
      editingReplyAttachmentsInputRef.current.value = "";
    }
  };

  const escalateToAdmin = () => {
    if (!ticket || !canEscalateToAdmin) return;
    const escalatedAt = new Date().toLocaleString();
    const escalationReason =
      "Escalated by Sub-Franchisor for admin-level support and oversight.";
    const escalationReply: Reply = {
      id: `r-${Date.now()}-escalation`,
      visibility: "Internal",
      author: currentUser ?? "Sub-Franchisor",
      message: `Escalated to Admin at ${escalatedAt}. ${escalationReason}`,
      createdAt: escalatedAt,
    };
    const nextStatus: TicketStatus =
      ticket.status === "Resolved" || ticket.status === "Closed"
        ? ticket.status
        : "Pending";
    const nextTickets = tickets.map((item) =>
      item.id === ticket.id
        ? {
            ...item,
            escalated: true,
            escalatedToAdminAt: escalatedAt,
            escalationReason,
            status: nextStatus,
            replies: [...item.replies, escalationReply],
          }
        : item
    );
    setTickets(nextTickets);
  };

  const renderReplies = (): React.ReactNode =>
    visibleReplies.map((reply) => {
      const isEditing = editingReplyId === reply.id;
      return (
        <div key={reply.id} className="rounded-none bg-slate-50 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {reply.author} - {reply.createdAt}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${
                  reply.visibility === "Internal"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-50 text-blue-800"
                }`}
              >
                {reply.visibility}
              </span>
              {canManageReplies ? (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-primary"
                    onClick={() => startEditingReply(reply)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-800"
                    onClick={() => void removeReply(reply.id)}
                    disabled={isReplyDeletingId === reply.id}
                  >
                    <Trash2 className="size-3.5" />
                    {isReplyDeletingId === reply.id ? "Deleting..." : "Delete"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <input
                ref={editingReplyAttachmentsInputRef}
                type="file"
                name="editing_reply_attachments"
                className="hidden"
                multiple
                accept={REPLY_ATTACHMENT_ACCEPT}
                onChange={handleEditingReplyAttachmentChange}
              />
              <textarea
                className="min-h-20 w-full resize-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                value={editingReplyMessage}
                onChange={(event) => setEditingReplyMessage(event.target.value)}
              />
              {renderReplyAttachments(
                reply.attachments ?? [],
                `${reply.id}-current`,
                openFullscreenImage
              )}
              {editingReplyAttachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {editingReplyAttachments.map((file, index) => (
                    <span
                      key={`${reply.id}-new-${file.name}-${index}`}
                      className="inline-flex items-center gap-1 rounded-none border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    >
                      <span className="max-w-52 truncate">{file.name}</span>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => removeSelectedEditingReplyAttachment(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={openEditingReplyAttachmentPicker}
                  className="inline-flex size-8 items-center justify-center text-slate-400 transition-colors hover:text-primary"
                  aria-label="Attach file while editing"
                  disabled={isReplySubmitting}
                >
                  <Paperclip className="size-4" />
                </button>
                {editingReplyAttachments.length > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    onClick={clearSelectedEditingReplyAttachments}
                    disabled={isReplySubmitting}
                  >
                    Clear all
                  </button>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={cancelEditingReply}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveEditingReply(reply)}
                  disabled={isReplySubmitting}
                >
                  {isReplySubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-700">{reply.message}</p>
              {renderReplyAttachments(reply.attachments ?? [], reply.id, openFullscreenImage)}
            </>
          )}
        </div>
      );
    });

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
          {errorMessage ? (
            <div className="border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-700">{errorMessage}</p>
            </div>
          ) : null}
          {successMessage ? (
            <div className="border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm text-emerald-700">{successMessage}</p>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/tickets"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to tickets
            </Link>
            <div className="flex items-center gap-2">
              {ticket && canEditTicketContent ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={isEditingTicketContent ? resetTicketContentDraft : startTicketContentEdit}
                >
                  {isEditingTicketContent ? "Cancel Edit" : "Edit"}
                </Button>
              ) : null}
              {canEscalateToAdmin ? (
                <Button type="button" variant="outline" onClick={escalateToAdmin}>
                  Escalate to Admin
                </Button>
              ) : null}
              {ticket && canManageLifecycle ? (
                <TicketStatusDropdown
                  value={ticket.status}
                  onChange={(status) => updateTicket({ status })}
                />
              ) : null}
            </div>
          </div>

          {!matchedTicket ? (
            <div className="border-b border-slate-200 pb-6">
              <p className="text-sm text-slate-600">Ticket not found.</p>
            </div>
          ) : isUnauthorizedForTicket ? (
            <div className="border-b border-slate-200 pb-6">
              <p className="text-sm text-slate-600">
                You do not have permission to view this ticket.
              </p>
            </div>
          ) : ticket ? (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
              <section className="border-b border-slate-200 pb-5">
                <p className="text-xs font-medium tabular-nums text-slate-500">{ticket.id}</p>
                {canEditTicketContent && isEditingTicketContent ? (
                  <div className="mt-2 space-y-2">
                    <input
                      className="w-full border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
                      value={editedSubject}
                      onChange={(event) => setEditedSubject(event.target.value)}
                      placeholder="Ticket title"
                    />
                    <textarea
                      className="min-h-28 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      value={editedDescription}
                      onChange={(event) => setEditedDescription(event.target.value)}
                      placeholder="Ticket description"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetTicketContentDraft}
                        disabled={isTicketContentSaving}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void saveTicketContent()}
                        disabled={isTicketContentSaving}
                      >
                        {isTicketContentSaving ? "Saving..." : "Save details"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">{ticket.subject}</h2>
                    <p className="mt-2 text-sm text-slate-600">{ticket.description}</p>
                  </>
                )}
                <p className="mt-2 text-xs text-slate-500">Created by {ticket.createdBy}</p>
                {ticket.escalated ? (
                  <p className="mt-2 inline-flex border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                    Escalated to Admin{ticket.escalatedToAdminAt ? ` on ${ticket.escalatedToAdminAt}` : ""}
                  </p>
                ) : null}
              </section>

              <section className="pb-5">
                <p className="text-sm font-medium text-slate-900">Attachments</p>
                <p className="mt-1 text-xs text-slate-500">
                  Files shared with this ticket.
                </p>
                {canEditTicketContent && isEditingTicketContent ? (
                  <div className="mt-3 border border-dashed border-slate-300 bg-slate-50 p-3">
                    {retainedTicketAttachments.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {retainedTicketAttachments.map((attachment) => {
                          const label = getAttachmentLabel(attachment);
                          return (
                            <span
                              key={`retained-${attachment}`}
                              className="inline-flex items-center gap-1 rounded-none border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                            >
                              <span className="max-w-52 truncate">{label}</span>
                              <button
                                type="button"
                                className="text-slate-500 hover:text-slate-900"
                                onClick={() => removeRetainedTicketAttachment(attachment)}
                                aria-label={`Remove ${label}`}
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                    <input
                      ref={ticketAttachmentInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept={REPLY_ATTACHMENT_ACCEPT}
                      onChange={onTicketAttachmentChange}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                        onClick={openTicketAttachmentPicker}
                        disabled={isTicketContentSaving}
                      >
                        <Paperclip className="size-3.5" />
                        Add attachments
                      </button>
                      {ticketAttachmentFiles.length > 0 ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-slate-600 hover:text-slate-900"
                          onClick={clearTicketAttachments}
                          disabled={isTicketContentSaving}
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>
                    {ticketAttachmentFiles.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ticketAttachmentFiles.map((file, index) => (
                          <span
                            key={`${file.name}-${index}`}
                            className="inline-flex items-center gap-1 rounded-none border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                          >
                            <span className="max-w-52 truncate">{file.name}</span>
                            <button
                              type="button"
                              className="text-slate-500 hover:text-slate-900"
                              onClick={() => removeTicketAttachment(index)}
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3">
                  {displayedTicketAttachments.length === 0 ? (
                    <p className="text-sm text-slate-500">No attachments.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {displayedTicketAttachments.map((attachment) => {
                        const label = getAttachmentLabel(attachment);
                        const isImage = isImageAttachment(attachment);
                        return (
                          <div key={attachment} className="rounded-none border border-slate-200 bg-slate-50 p-2">
                            {isImage ? (
                              <button
                                type="button"
                                className="block w-full overflow-hidden border border-slate-200 bg-white hover:border-slate-300"
                                onClick={() => openFullscreenImage(attachment, label)}
                              >
                                <ProtectedAttachmentImage attachment={attachment} label={label} />
                              </button>
                            ) : (
                              <div className="flex h-28 w-full items-center justify-center border border-slate-200 bg-white text-xs text-slate-500">
                                File attachment
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-slate-700">{label}</p>
                              <button
                                type="button"
                                className="rounded-none border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                onClick={() => {
                                  void openProtectedAttachmentFile(attachment);
                                }}
                              >
                                Open
                              </button>
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
                    renderReplies()
                  )}
                </div>
                <form className="mt-4 border border-slate-200 bg-white" onSubmit={addReply}>
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
                      {canUseInternalNotes ? (
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
                      ) : null}
                    </div>
                    <div className="mt-4 border border-slate-200 bg-slate-100 p-4">
                      <input
                        ref={replyAttachmentsInputRef}
                        type="file"
                        name="reply_attachments"
                        className="hidden"
                        multiple
                        accept={REPLY_ATTACHMENT_ACCEPT}
                        onChange={handleReplyAttachmentChange}
                      />
                      <textarea
                        className="min-h-28 w-full resize-none border-0 bg-transparent px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none"
                        placeholder="Type your response here..."
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                      />
                      {replyAttachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {replyAttachments.map((file, index) => (
                            <span
                              key={`new-reply-${file.name}-${index}`}
                              className="inline-flex items-center gap-1 rounded-none border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                            >
                              <span className="max-w-52 truncate">{file.name}</span>
                              <button
                                type="button"
                                className="text-slate-500 hover:text-slate-900"
                                onClick={() => removeSelectedReplyAttachment(index)}
                                aria-label={`Remove ${file.name}`}
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={openReplyAttachmentPicker}
                          className="inline-flex size-10 items-center justify-center text-slate-400 transition-colors hover:text-primary"
                          aria-label="Attach file"
                          disabled={isReplySubmitting}
                        >
                          <Paperclip className="size-4" />
                        </button>
                        {replyAttachments.length > 0 ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-slate-600 hover:text-slate-900"
                            onClick={clearSelectedReplyAttachments}
                            disabled={isReplySubmitting}
                          >
                            Clear all
                          </button>
                        ) : null}
                        <Button
                          type="submit"
                          className="min-w-44 gap-2 px-5 text-sm font-semibold"
                          disabled={isReplySubmitting}
                        >
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
                        { label: "Owner User ID", value: ticket.ownerUserId },
                        { label: "Owner Org ID", value: ticket.ownerOrgId },
                        { label: "Org ID", value: ticket.organizationId },
                        { label: "Parent Org ID", value: ticket.parentOrganizationId ?? "—" },
                        { label: "Priority", value: ticket.priority },
                        { label: "Company Name", value: ticket.companyName ?? "—" },
                        { label: "Issue Type", value: ticket.category },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="grid grid-cols-[100px_1fr] gap-2 text-sm sm:grid-cols-[110px_1fr] sm:gap-3"
                        >
                          <p className="font-semibold text-slate-600">{row.label}</p>
                          {row.label === "Assigned to" ? (
                            canAssignTicketsForCurrentUser ? (
                              <SidebarSelect
                                ariaLabel="Assigned to"
                                value={ticket.assignedTo}
                                onChange={(v) =>
                                  updateTicket({
                                    assignedTo: v,
                                  })
                                }
                                options={assigneeOptions.map((assignee) => ({
                                  value: assignee.name,
                                  label: assignee.name,
                                }))}
                              />
                            ) : (
                              <p className="break-words text-slate-600">{row.value}</p>
                            )
                          ) : row.label === "Priority" ? (
                            canManageLifecycle ? (
                              <TicketPriorityDropdown
                                fullWidth
                                compact
                                value={ticket.priority}
                                onChange={(priority) => updateTicket({ priority })}
                              />
                            ) : (
                              <p className="break-words text-slate-600">{row.value}</p>
                            )
                          ) : row.label === "Issue Type" ? (
                            canManageLifecycle ? (
                              <SidebarSelect
                                ariaLabel="Issue type"
                                value={ticket.category}
                                onChange={(v) =>
                                  updateTicket({
                                    category: v as TicketCategory,
                                  })
                                }
                                options={(categoryOptions.length
                                  ? categoryOptions.map((entry) => entry.name)
                                  : categories
                                ).map((c) => ({
                                  value: c,
                                  label: c,
                                }))}
                              />
                            ) : (
                              <p className="break-words text-slate-600">{row.value}</p>
                            )
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
                        const actionLabel = getActivityActionLabel(entry.action);
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
                                  getActivityDotClass(entry.action, showActiveChrome)
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
                              {actionLabel || entry.actor ? (
                                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                  {actionLabel}
                                  {entry.actor ? ` by ${entry.actor}` : ""}
                                </p>
                              ) : null}
                              {entry.details && entry.details.length > 0 ? (
                                <div className="mt-1 space-y-0.5">
                                  {entry.details.map((detail, detailIndex) => (
                                    <p
                                      key={`${entry.id}-detail-${detail.field}-${detailIndex}`}
                                      className="text-xs text-slate-600 sm:text-sm"
                                    >
                                      <span className="font-semibold text-slate-700">
                                        {detail.label}
                                      </span>{" "}
                                      {detail.from} {"->"} {detail.to}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
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
          ) : null}
        </div>
      </section>
      {fullscreenImageAttachment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={closeFullscreenImage}
        >
          <div
            className="relative max-h-[95vh] max-w-[95vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-none bg-black/60 px-2 py-1 text-xs font-medium text-white hover:bg-black/80"
              onClick={closeFullscreenImage}
            >
              Close
            </button>
            {isFullscreenImageLoading ? (
              <div className="flex h-[60vh] w-[80vw] max-w-5xl items-center justify-center bg-slate-900 text-sm text-slate-100">
                Loading image...
              </div>
            ) : fullscreenImageUrl ? (
              <img
                src={fullscreenImageUrl}
                alt={fullscreenImageAttachment.label}
                className="max-h-[95vh] max-w-[95vw] object-contain"
              />
            ) : (
              <div className="flex h-[60vh] w-[80vw] max-w-5xl items-center justify-center bg-slate-900 text-sm text-slate-100">
                Unable to preview image.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
