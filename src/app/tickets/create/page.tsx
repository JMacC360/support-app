"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  categories,
  loadCurrentUser,
  loadTickets,
  newTicketId,
  priorities,
  roles,
  saveTickets,
  type Role,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/tickets";

export default function CreateTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("Technical");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [attachmentInput] = useState("");
  const [manualAssignee, setManualAssignee] = useState<Role>("L1 Support");

  const resolvedAssignee = useMemo(() => manualAssignee, [manualAssignee]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentUser = loadCurrentUser();
    if (!currentUser) return;
    if (!subject.trim() || !description.trim()) return;

    const existingTickets = loadTickets();
    const nextNumber = existingTickets.length + 1;
    const attachments = attachmentInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

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
      assignedTo: resolvedAssignee,
      escalated: false,
      replies: [],
    };

    const nextTickets = [createdTicket, ...existingTickets];
    saveTickets(nextTickets);
    router.push(`/tickets/${createdTicket.id}`);
  };

  return (
    <section className="p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1400px] space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Create Ticket</h2>
          <p className="max-w-2xl text-sm text-slate-600">
            Submit a detailed request to our support authority.
          </p>
        </header>

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
                    className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none"
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

            <div className="border border-dashed border-slate-300 bg-slate-50 bg-white p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex size-16 items-center justify-center bg-white text-primary shadow-sm">
                  <FileUp className="size-8" aria-hidden />
                </div>
                <p className="text-1xl font-semibold text-primary">Upload Attachments</p>
                <p className="mt-1 text-base text-slate-700">
                  Drag and drop files or <span className="font-semibold text-primary">browse</span>
                </p>
                <p className="mt-4 text-xs uppercase text-slate-600">
                  Max file size: 25MB (PNG, JPG)
                </p>
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
                <label
                  htmlFor="category"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  Category
                </label>
                <select
                  id="category"
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as TicketCategory)}
                >
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
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
                  {roles.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-primary p-4 text-primary-foreground">
                <p className="font-semibold">Guidelines</p>
                <p className="mt-1 text-sm text-primary-foreground/90">
                  Ensure screenshots are clear and include timestamps for faster resolution.
                </p>
              </div>

              <div className="grid gap-2 pt-2">
                <Button type="submit" className="w-full">
                  Submit Ticket
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
