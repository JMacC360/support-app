"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Plus, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createCategory,
  createTicket,
  fetchTicketDependencies,
  type TicketAssigneeOption,
  type TicketCategoryOption,
} from "@/lib/tickets-api";
import {
  canCreateTickets,
  categories,
  loadCurrentUser,
  priorities,
  type Role,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/tickets";
import { getAuthenticatedPermissionNames, hasAuthenticatedPermission } from "@/lib/auth";

export default function CreateTicketPage() {
  const router = useRouter();
  const currentUser = loadCurrentUser();
  const permissionNames = getAuthenticatedPermissionNames();
  const canSubmitTicket = canCreateTickets(currentUser);
  const canCreateCategory =
    permissionNames.length > 0 ? hasAuthenticatedPermission("category.create") : true;
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("Technical");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [manualAssignee, setManualAssignee] = useState<Role>("");
  const [categoryOptions, setCategoryOptions] = useState<TicketCategoryOption[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<TicketAssigneeOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryPanelError, setCategoryPanelError] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const hasCategoryOptions = categoryOptions.length > 0;

  const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
    "jpeg",
    "jpg",
    "png",
    "gif",
    "bmp",
    "svg",
    "webp",
    "avif",
    "heic",
    "heif",
    "jfif",
    "pdf",
  ]);
  const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "image/webp",
    "image/avif",
    "image/heic",
    "image/heif",
    "application/pdf",
  ]);
  const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

  useEffect(() => {
    let active = true;

    const loadDependencies = async () => {
      try {
        const { categories: loadedCategories, assignees } = await fetchTicketDependencies();
        if (!active) return;

        setCategoryOptions(loadedCategories);
        setAssigneeOptions(assignees);

        if (loadedCategories[0]?.name) {
          setCategory(loadedCategories[0].name);
        }

        if (assignees[0]?.id) {
          setManualAssignee(String(assignees[0].id));
        }
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load dependencies.");
      }
    };

    void loadDependencies();

    return () => {
      active = false;
    };
  }, []);

  const resolvedAssignee = useMemo(() => manualAssignee, [manualAssignee]);

  const validateAttachments = (files: File[]): string | null => {
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const mimeType = (file.type ?? "").toLowerCase();
      const allowedByExtension =
        Boolean(extension) && ALLOWED_ATTACHMENT_EXTENSIONS.has(extension);
      const allowedByMimeType =
        Boolean(mimeType) && ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType);
      if (!allowedByExtension && !allowedByMimeType) {
        return `Unsupported file type for "${file.name}". Allowed: JPG, PNG, GIF, BMP, SVG, WEBP, AVIF, HEIC, HEIF, PDF.`;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return `"${file.name}" is larger than 50MB.`;
      }
    }
    return null;
  };

  const openAttachmentPicker = () => {
    attachmentInputRef.current?.click();
  };

  const applySelectedAttachments = (selected: File[]) => {
    const error = validateAttachments(selected);
    if (error) {
      setErrorMessage(error);
      setAttachmentFiles([]);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      return;
    }

    setErrorMessage(null);
    setAttachmentFiles(selected);
  };

  const onAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    applySelectedAttachments(selected);
  };

  const onAttachmentDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const onAttachmentDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const onAttachmentDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length === 0) return;
    applySelectedAttachments(droppedFiles);
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((current) => {
      const next = current.filter((_, i) => i !== index);
      if (next.length === 0 && attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      return next;
    });
  };

  const clearAttachments = () => {
    setAttachmentFiles([]);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setCategoryPanelError("Category name is required.");
      return;
    }

    setIsCreatingCategory(true);
    setCategoryPanelError(null);

    try {
      const createdCategory = await createCategory({
        name: trimmedName,
        description: newCategoryDescription.trim(),
      });
      setCategoryOptions((prev) => [...prev, createdCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setCategory(createdCategory.name);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setIsCategoryPanelOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setCategoryPanelError(
        error instanceof Error ? error.message : "Unable to create category."
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;
    if (!canCreateTickets(currentUser)) return;
    if (!subject.trim() || !description.trim()) return;
    if (!categoryOptions.length) {
      setErrorMessage("No ticket categories available yet. Please create categories first.");
      return;
    }

    const selectedCategory = categoryOptions.find((entry) => entry.name === category);
    if (!selectedCategory) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdTicket = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        categoryId: selectedCategory.id,
        priority,
        assignedTo: resolvedAssignee ? Number(resolvedAssignee) : null,
        attachments: attachmentFiles,
      });

      router.push(`/tickets/${createdTicket.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="p-4 lg:p-6">
      {isCategoryPanelOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/35"
            onClick={() => setIsCategoryPanelOpen(false)}
            aria-hidden
          />
          <aside className="relative z-10 ml-auto h-full w-full max-w-md border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Create Category
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Add a new ticket category and use it immediately.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center border border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setIsCategoryPanelOpen(false)}
                aria-label="Close category panel"
              >
                <X className="size-4" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCreateCategory}>
              <div className="space-y-1.5">
                <label
                  htmlFor="new-category-name"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Category Name
                </label>
                <input
                  id="new-category-name"
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="e.g. Deployment"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="new-category-description"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Description
                </label>
                <textarea
                  id="new-category-description"
                  className="min-h-24 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Optional description..."
                  value={newCategoryDescription}
                  onChange={(event) => setNewCategoryDescription(event.target.value)}
                />
              </div>

              {categoryPanelError ? (
                <div className="border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-sm text-rose-700">{categoryPanelError}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryPanelOpen(false)}
                  disabled={isCreatingCategory}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingCategory}>
                  {isCreatingCategory ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-[1400px] space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Create Ticket</h2>
          <p className="max-w-2xl text-sm text-slate-600">
            Submit a detailed request to our support authority.
          </p>
        </header>
        {errorMessage ? (
          <div className="border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm text-rose-700">{errorMessage}</p>
          </div>
        ) : null}

        <form className="grid gap-4 lg:grid-cols-[1fr_320px]" onSubmit={handleSubmit}>
          <section className="space-y-4">
            <div className="border border-slate-200 bg-white p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                <label
                      htmlFor="subject"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                    Subject / Title
                  </label>
                  <input
                    id="subject"
                    className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Brief summary of your request"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Please be as descriptive as possible (e.g., &quot;API Error on Checkout for
                    B2B portal&quot;)
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Detailed Description
                  </label>
                  <textarea
                    id="description"
                    className="min-h-[320px] w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Provide full context, including steps to reproduce if applicable..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div
              className={`border border-dashed bg-white p-6 transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-slate-300"
              }`}
              onDragOver={onAttachmentDragOver}
              onDragEnter={onAttachmentDragOver}
              onDragLeave={onAttachmentDragLeave}
              onDrop={onAttachmentDrop}
            >
              <input
                ref={attachmentInputRef}
                type="file"
                name="ticket_attachments"
                className="hidden"
                multiple
                accept=".jpeg,.jpg,.png,.gif,.bmp,.svg,.webp,.avif,.heic,.heif,.jfif,.pdf"
                onChange={onAttachmentChange}
              />
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex size-16 items-center justify-center bg-white text-primary shadow-sm">
                  <FileUp className="size-8" aria-hidden />
                </div>
                <p className="text-1xl font-semibold text-primary">Upload Attachments</p>
                <p className="mt-1 text-base text-slate-700">
                  Drag and drop files or{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={openAttachmentPicker}
                  >
                    browse
                  </button>
                </p>
                <p className="mt-4 text-xs uppercase text-slate-600">
                  Max file size: 50MB (JPG, PNG, GIF, BMP, SVG, WEBP, PDF)
                </p>
                {attachmentFiles.length > 0 ? (
                  <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                    {attachmentFiles.map((file, index) => (
                      <span
                        key={`${file.name}-${index}`}
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        <span className="max-w-64 truncate">{file.name}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-900"
                          onClick={() => removeAttachment(index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      onClick={clearAttachments}
                    >
                      Clear all
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="h-fit border border-slate-200 bg-slate-100 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Tag className="size-5 text-primary" aria-hidden />
              Metadata
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="category"
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                  >
                    Category
                  </label>
                  {canCreateCategory ? (
                    <button
                      type="button"
                      className="inline-flex size-6 items-center justify-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        setCategoryPanelError(null);
                        setIsCategoryPanelOpen(true);
                      }}
                      aria-label="Create new category"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <select
                  id="category"
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as TicketCategory)}
                  disabled={!hasCategoryOptions}
                >
                  {(categoryOptions.length ? categoryOptions.map((item) => item.name) : categories).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {!hasCategoryOptions ? (
                  <p className="mt-1 text-xs text-rose-700">
                    No categories found. Add categories in backend first.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="priority"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  Priority Level
                </label>
                <select
                  id="priority"
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TicketPriority)}
                >
                  {priorities.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="assigned-to"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  Assignee
                </label>
                <select
                  id="assigned-to"
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
                  value={resolvedAssignee}
                  onChange={(event) => setManualAssignee(event.target.value as Role)}
                >
                  {assigneeOptions.map((assignee) => (
                    <option key={assignee.id} value={String(assignee.id)}>
                      {assignee.name}
                    </option>
                  ))}
                  {assigneeOptions.length === 0 ? (
                    <option key="unassigned" value="">
                      Unassigned
                    </option>
                  ) : null}
                </select>
              </div>

              <div className="bg-primary p-4 text-primary-foreground">
                <p className="font-semibold">Guidelines</p>
                <p className="mt-1 text-sm text-primary-foreground/90">
                  Ensure screenshots are clear and include timestamps for faster resolution.
                </p>
              </div>

              <div className="grid gap-2 pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !hasCategoryOptions || !canSubmitTicket}
                >
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/tickets")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
}
