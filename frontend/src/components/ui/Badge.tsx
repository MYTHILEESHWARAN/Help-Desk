import { cn } from "../../lib/utils";
import type { Priority, Status, Category } from "../../types";

// ── Priority badge ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  high:   "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  low:    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
};

const PRIORITY_ICONS: Record<Priority, string> = {
  urgent: "🔴",
  high:   "🟠",
  medium: "🟡",
  low:    "🟢",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        PRIORITY_STYLES[priority]
      )}
      aria-label={`Priority: ${priority}`}
    >
      <span aria-hidden="true">{PRIORITY_ICONS[priority]}</span>
      {priority}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Status, string> = {
  "open":        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  "in-progress": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  "resolved":    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  "closed":      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_ICONS: Record<Status, string> = {
  "open":        "◯",
  "in-progress": "◑",
  "resolved":    "✓",
  "closed":      "✕",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        STATUS_STYLES[status]
      )}
      aria-label={`Status: ${status}`}
    >
      <span aria-hidden="true">{STATUS_ICONS[status]}</span>
      {status}
    </span>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<Category, string> = {
  hardware:         "🖥️",
  network:          "🌐",
  software:         "💿",
  "account-access": "🔑",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border"
      aria-label={`Category: ${category}`}
    >
      <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
      {category}
    </span>
  );
}

// ── SLA badge ─────────────────────────────────────────────────────────────────

export function SlaBadge({
  label,
  percent,
}: {
  label: "ok" | "at-risk" | "breached";
  percent: number;
}) {
  if (label === "ok") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        label === "breached"
          ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 animate-pulse"
          : "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
      )}
      title={`${Math.round(percent)}% of SLA elapsed`}
    >
      {label === "breached" ? "⚠️ SLA Breached" : "⏱ At Risk"}
    </span>
  );
}
