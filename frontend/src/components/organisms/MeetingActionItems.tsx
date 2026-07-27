"use client";

import {
  RiCheckLine as CheckCircle2,
  RiCheckLine as Check,
  RiTimeLine as Clock,
  RiUserLine as UserIcon,
} from "@remixicon/react";
import type { Meeting } from "@/types";

interface MeetingActionItemsProps {
  actionItems: Meeting["action_items"];
  toggleItemStatus: (itemId: string) => Promise<void>;
}

const PRIORITY: Record<string, { chip: string; dot: string }> = {
  high:   { chip: "bg-risk-container text-risk border-risk/30",      dot: "bg-risk" },
  medium: { chip: "bg-warning-container text-warning border-warning/30", dot: "bg-warning" },
  low:    { chip: "bg-success-container text-success border-success/30", dot: "bg-success" },
};

export default function MeetingActionItems({ actionItems, toggleItemStatus }: MeetingActionItemsProps) {
  if (!actionItems) return null;

  return (
    <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[12px] bg-primary-container flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-[14px] font-bold text-text tracking-tight">
            Action Items ({actionItems.length})
          </h2>
        </div>
        <span className="text-[11px] text-text-muted bg-surface2 border border-border rounded-full px-3 py-1 font-medium">
          Click to toggle status
        </span>
      </div>

      {actionItems.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-surface-dim p-6 text-center">
          <p className="text-[13px] text-text-muted font-medium">No action items in this meeting.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {[...actionItems].sort((a, b) => {
            const statusOrder: Record<string, number> = { open: 0, in_progress: 1, done: 2 };
            const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
            const aStatus = statusOrder[a.status] ?? 3;
            const bStatus = statusOrder[b.status] ?? 3;
            if (aStatus !== bStatus) return aStatus - bStatus;
            const aPri = priorityOrder[a.priority] ?? 3;
            const bPri = priorityOrder[b.priority] ?? 3;
            return aPri - bPri;
          }).map((item) => {
            const isDone = item.status === "done";
            const isInProgress = item.status === "in_progress";
            const pStyle = PRIORITY[item.priority] ?? PRIORITY.medium;

            return (
              <button
                key={item.id}
                onClick={() => toggleItemStatus(item.id)}
                className={`group w-full text-left rounded-[16px] border p-4 spring flex items-start gap-3 hover:-translate-y-0.5 active:scale-[0.99] ${
                  isDone
                    ? "bg-success/5 border-success/20"
                    : "bg-surface2 border-border hover:border-border-strong"
                }`}
              >
                {/* custom checkbox i made */}
                <div className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center shrink-0 mt-0.5 spring ${
                  isDone
                    ? "bg-success border-success text-bg"
                    : isInProgress
                    ? "border-warning bg-warning/10"
                    : "border-border-strong group-hover:border-primary"
                }`}>
                  {isDone && <Check className="w-3.5 h-3.5" />}
                  {isInProgress && <div className="w-2 h-2 rounded-full bg-warning" />}
                </div>

                {/* text content of the action item */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold leading-snug spring-colors ${
                    isDone ? "line-through text-text-muted" : "text-text group-hover:text-primary"
                  }`}>
                    {item.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted mt-1.5">
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      <span className="text-text font-medium">{item.owner_name || "Unassigned"}</span>
                    </span>
                    {item.due_date && (
                      <span className="flex items-center gap-1 text-warning">
                        <Clock className="w-3 h-3" />
                        {item.due_date}
                      </span>
                    )}
                    <span className="text-text-variant capitalize">{item.status.replace("_", " ")}</span>
                  </div>
                </div>

                {/* priority badge */}
                <span className={`flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2.5 py-1 uppercase tracking-wide shrink-0 ${pStyle.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                  {item.priority || "medium"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
