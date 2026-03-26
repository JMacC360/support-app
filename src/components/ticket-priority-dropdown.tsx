"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import {
  priorities,
  priorityPillClass,
  priorityTintedBorderClass,
  type TicketPriority,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";

type TicketPriorityDropdownProps = {
  value: TicketPriority;
  onChange: (priority: TicketPriority) => void;
  fullWidth?: boolean;
  /** Tighter padding for narrow sidebar cells. */
  compact?: boolean;
  className?: string;
};

export function TicketPriorityDropdown({
  value,
  onChange,
  fullWidth,
  compact,
  className,
}: TicketPriorityDropdownProps) {
  const selectId = useId();
  return (
    <div
      className={cn(
        "relative inline-flex min-w-0 rounded-none border",
        priorityTintedBorderClass[value],
        priorityPillClass[value],
        fullWidth && "w-full",
        className
      )}
    >
      <label htmlFor={selectId} className="sr-only">
        Priority
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as TicketPriority)}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-none border-0 bg-transparent text-sm leading-normal text-inherit",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          compact ? "min-h-9 py-1.5 pl-2 pr-9" : "min-h-9 py-2 pl-3 pr-9",
          fullWidth && "min-w-0"
        )}
      >
        {priorities.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-current"
        aria-hidden
      >
        <ChevronDown className="size-4 shrink-0 opacity-70" />
      </span>
    </div>
  );
}
