"use client";

import { Check } from "lucide-react";
import { statusTableIndicator, type TicketStatus } from "@/lib/tickets";
import { cn } from "@/lib/utils";

export function TicketTableStatus({ status }: { status: TicketStatus }) {
  const cfg = statusTableIndicator[status];
  const inProgress = status === "In Progress";

  return (
    <div className={cn("flex gap-2", inProgress ? "items-start" : "items-center")}>
      {cfg.variant === "dotWithCheck" ? (
        <span
          className={cn(
            "flex size-2.5 shrink-0 items-center justify-center rounded-full",
            inProgress && "mt-0.5",
            cfg.dotClass
          )}
          aria-hidden
        >
          <Check className="size-1.5 text-primary-foreground" strokeWidth={3} />
        </span>
      ) : (
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            inProgress && "mt-0.5",
            cfg.dotClass
          )}
          aria-hidden
        />
      )}
      <span className={cn("text-xs font-medium leading-tight", cfg.labelClass)}>
        {status}
      </span>
    </div>
  );
}
