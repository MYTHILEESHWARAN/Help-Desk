import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ticketsApi } from "../lib/api";
import { ApiError } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { generateUUID } from "../lib/utils";
import type { Category, Priority } from "../types";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "hardware",       label: "🖥️ Hardware" },
  { value: "network",        label: "🌐 Network" },
  { value: "software",       label: "💿 Software" },
  { value: "account-access", label: "🔑 Account / Access" },
];

const PRIORITIES: { value: Priority; label: string; description: string }[] = [
  { value: "low",    label: "🟢 Low",    description: "Minor inconvenience, workaround available" },
  { value: "medium", label: "🟡 Medium", description: "Impacting work, no workaround" },
  { value: "high",   label: "🟠 High",   description: "Multiple users affected" },
  { value: "urgent", label: "🔴 Urgent", description: "Critical — business stopped" },
];

export function NewTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Stable idempotency key for this form instance
  const idempotencyKeyRef = useRef(generateUUID());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      ticketsApi.create({
        title,
        description,
        category: category as Category,
        priority: priority as Priority,
        idempotencyKey: idempotencyKeyRef.current,
      }),
    onSuccess: (ticket: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all() });
      toast.success(`Ticket #${ticket.id.slice(0, 8)} created`);
      navigate(`/tickets/${ticket.id}`, { state: { justCreated: true } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create ticket. Please try again.");
      }
    },
  });

  // Client-side validation (mirrors server rules)
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required";
    else if (title.length > 120) e.title = "Title must be 120 characters or fewer";
    if (!description.trim()) e.description = "Description is required";
    else if (description.length > 5000) e.description = "Description must be 5000 characters or fewer";
    if (!category) e.category = "Category is required";
    if (!priority) e.priority = "Priority is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Support Ticket</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your issue and we'll get it to the right team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-lg border p-6 shadow-sm">
        {/* Title */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <label htmlFor="title" className="block text-sm font-medium">
              Title <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <span className={`text-xs ${title.length > 110 ? "text-destructive" : "text-muted-foreground"}`}>
              {title.length}/120
            </span>
          </div>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Brief summary of the issue"
            aria-describedby={errors.title ? "title-error" : undefined}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p id="title-error" className="text-xs text-destructive" role="alert">{errors.title}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label htmlFor="category" className="block text-sm font-medium">
            Category <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={!!errors.category}
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-destructive" role="alert">{errors.category}</p>
          )}
        </div>

        {/* Priority */}
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">
            Priority <span className="text-destructive" aria-hidden="true">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRIORITIES.map((p) => (
              <label
                key={p.value}
                title={p.description}
                className={`flex items-center gap-2 rounded-md border p-3 text-sm cursor-pointer transition-colors hover:bg-accent ${
                  priority === p.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p.value}
                  checked={priority === p.value}
                  onChange={() => setPriority(p.value as Priority)}
                  className="sr-only"
                />
                {p.label}
              </label>
            ))}
          </div>
          {errors.priority && (
            <p className="text-xs text-destructive" role="alert">{errors.priority}</p>
          )}
        </fieldset>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <label htmlFor="description" className="block text-sm font-medium">
              Description <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <span className={`text-xs ${description.length > 4800 ? "text-destructive" : "text-muted-foreground"}`}>
              {description.length}/5000
            </span>
          </div>
          <textarea
            id="description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            placeholder="Steps to reproduce, error messages, affected systems…"
            aria-describedby={errors.description ? "desc-error" : undefined}
            aria-invalid={!!errors.description}
          />
          {errors.description && (
            <p id="desc-error" className="text-xs text-destructive" role="alert">{errors.description}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm rounded-md border hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? "Submitting…" : "Submit ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
