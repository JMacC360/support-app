"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import {
  statuses,
  statusPillClass,
  statusTintedBorderClass,
  type TicketStatus,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";

type TicketStatusDropdownProps = {
  value: TicketStatus;
  onChange: (status: TicketStatus) => void;
  /** Full width (e.g. in a form grid cell). */
  fullWidth?: boolean;
  className?: string;
};

export function TicketStatusDropdown({
  value,
  onChange,
  fullWidth,
  className,
}: TicketStatusDropdownProps) {
  const selectId = useId();
  return (
    <div
      className={cn(
        "relative inline-flex min-w-0 rounded-none border",
        statusTintedBorderClass[value],
        statusPillClass[value],
        fullWidth && "w-full",
        className
      )}
    >
      <label htmlFor={selectId} className="sr-only">
        Ticket status
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as TicketStatus)}
        className={cn(
          "min-h-9 cursor-pointer appearance-none rounded-none border-0 bg-transparent py-2 pl-3 pr-9 text-sm leading-normal text-inherit",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          fullWidth && "w-full min-w-0"
        )}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
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
