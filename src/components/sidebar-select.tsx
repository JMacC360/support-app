"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export type SidebarSelectOption = { value: string; label: string };

type SidebarSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SidebarSelectOption[];
  ariaLabel: string;
  /** Extra classes on the outer bordered wrapper (e.g. tinted backgrounds). */
  wrapperClassName?: string;
};

/**
 * Native select with hidden system arrow + vertically centered Lucide chevron.
 * Matches layout of TicketStatusDropdown / TicketPriorityDropdown.
 */
export function SidebarSelect({
  value,
  onChange,
  options,
  ariaLabel,
  wrapperClassName,
}: SidebarSelectProps) {
  const selectId = useId();
  return (
    <div
      className={cn(
        "relative w-full min-w-0 rounded-none border border-slate-300 bg-white",
        wrapperClassName
      )}
    >
      <label htmlFor={selectId} className="sr-only">
        {ariaLabel}
      </label>
      <select
        id={selectId}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-h-9 w-full cursor-pointer appearance-none rounded-none border-0 bg-transparent py-1.5 pl-2 pr-9 text-sm leading-normal",
          "text-slate-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-500"
        aria-hidden
      >
        <ChevronDown className="size-4 shrink-0 opacity-75" />
      </span>
    </div>
  );
}
