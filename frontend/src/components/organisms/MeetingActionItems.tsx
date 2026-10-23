"use client";

import { useState, useMemo } from "react";
import {
  RiCheckLine as Check,
  RiTimeLine as Clock,
  RiListCheck3,
  RiArrowUpLine,
  RiArrowRightLine,
  RiArrowDownLine,
  RiFileCopyLine as Copy,
} from "@remixicon/react";
import type { Meeting } from "@/types";
import { copyToClipboard } from "@/lib/clipboard";

interface MeetingActionItemsProps {
  actionItems: Meeting["action_items"];
  toggleItemStatus: (itemId: string) => Promise<void>;
  onPriorityChange?: (itemId: string, priority: string) => Promise<void>;
}

type Priority = "high" | "medium" | "low";

const PRIORITY_STYLES: Record<
  Priority,
  { chip: string; dot: string; icon: React.ReactNode; label: string }
> = {
  high: {
    chip: "bg-risk-container text-on-risk-container border border-risk/20",
    dot: "bg-risk",
    icon: <RiArrowUpLine className="w-3 h-3" />,
    label: "High",
  },
  medium: {
    chip: "bg-warning-container text-on-warning-container border border-warning/20",
    dot: "bg-warning",
    icon: <RiArrowRightLine className="w-3 h-3" />,
    label: "Medium",
  },
  low: {
    chip: "bg-success-container text-on-success-container border border-success/20",
    dot: "bg-success",
    icon: <RiArrowDownLine className="w-3 h-3" />,
    label: "Low",
  },
};

const PRIORITY_CYCLE: Priority[] = ["high", "medium", "low"];

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
};

/** Normalize priority string from LLM (may be capitalized) to lowercase key */
function normalizePriority(p: string | undefined | null): Priority {
  const lower = (p || "medium").toLowerCase().trim() as Priority;
  return PRIORITY_STYLES[lower] ? lower : "medium";
}

export default function MeetingActionItems({
  actionItems,
  toggleItemStatus,
  onPriorityChange,
}: MeetingActionItemsProps) {
  const [cyclingId, setCyclingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  const items = useMemo(() => actionItems || [], [actionItems]);
  const hasItems = items.length > 0;

  const openCount = items.filter((a) => a.status === "open").length;
  const inProgressCount = items.filter((a) => a.status === "in_progress").length;
  const doneCount = items.filter((a) => a.status === "done").length;

  // Stable sort order: compute order on initial load / when set of item IDs changes
  // This prevents items from jumping positions when toggled in-place!
  const itemIdsKey = items.map((i) => i.id).join(",");
  const orderedIds = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const statusOrder: Record<string, number> = {
          open: 0,
          in_progress: 1,
          done: 2,
        };
        const priorityOrder: Record<Priority, number> = {
          high: 0,
          medium: 1,
          low: 2,
        };
        const aStatus = statusOrder[a.status] ?? 3;
        const bStatus = statusOrder[b.status] ?? 3;
        if (aStatus !== bStatus) return aStatus - bStatus;
        return (
          (priorityOrder[normalizePriority(a.priority)] ?? 3) -
          (priorityOrder[normalizePriority(b.priority)] ?? 3)
        );
      })
      .map((i) => i.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey]);

  // Retrieve current item states using stable positions
  const stableItems = useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i]));
    return orderedIds
      .map((id) => map.get(id))
      .filter((item): item is Meeting["action_items"][0] => Boolean(item));
  }, [items, orderedIds]);

  const displayedItems = stableItems.filter((item) => {
    if (filter === "open") return item.status === "open" || item.status === "in_progress";
    if (filter === "done") return item.status === "done";
    return true;
  });

  const handleCopy = async () => {
    if (!hasItems) return;
    const text = items
      .map(
        (item) =>
          `- [${item.status === "done" ? "x" : " "}] ${item.description} (Owner: ${
            item.owner_name || "Unassigned"
          }, Due: ${item.due_date || "None"}, Priority: ${item.priority || "Medium"})`
      )
      .join("\n");
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePriorityClick = async (
    e: React.MouseEvent,
    item: Meeting["action_items"][0]
  ) => {
    if (!onPriorityChange) return;
    e.stopPropagation();
    const current = normalizePriority(item.priority);
    const idx = PRIORITY_CYCLE.indexOf(current);
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    setCyclingId(item.id);
    try {
      await onPriorityChange(item.id, next);
    } finally {
      setCyclingId(null);
    }
  };

  return (
    <section
      aria-label="Action Items"
      className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none flex flex-col gap-5 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-xs">
            <RiListCheck3 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text">
                Action Items
              </h2>
              <span className="text-[11px] font-semibold text-text-muted bg-surface-container-high rounded-full px-2.5 py-0.5">
                {items.length}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Tasks, deliverables, and assigned follow-ups
            </p>
          </div>
        </div>

        {/* Status badges & copy action */}
        {hasItems && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* QoL Filter Pills */}
            <div className="inline-flex p-1 rounded-full bg-surface-container-high/60 border border-outline-variant/15 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-primary-container text-on-primary-container"
                    : "text-text-muted hover:text-text"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("open")}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                  filter === "open"
                    ? "bg-warning-container text-on-warning-container"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Open ({openCount + inProgressCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("done")}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                  filter === "done"
                    ? "bg-success-container text-on-success-container"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Done ({doneCount})
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-semibold text-text active:scale-95 transition-all ml-1"
              title="Copy action items"
              aria-label="Copy action items"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span className="text-success font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Action items list or empty state */}
      {!hasItems ? (
        <div className="rounded-[22px] border border-dashed border-outline-variant/25 bg-surface-container/20 py-8 px-6 text-center flex flex-col items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-surface-container-high/60 flex items-center justify-center text-text-muted">
            <RiListCheck3 className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-[13.5px] text-text-muted font-medium">
            No action items extracted from this call.
          </p>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-outline-variant/25 bg-surface-container/20 py-8 px-6 text-center flex flex-col items-center justify-center gap-2.5">
          <p className="text-[13.5px] text-text-muted font-medium">
            {filter === "done" ? "No completed action items yet." : "No open action items. All done!"}
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Show all items
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayedItems.map((item) => {
              const isDone = item.status === "done";
              const isInProgress = item.status === "in_progress";
              const priority = normalizePriority(item.priority);
              const pStyle = PRIORITY_STYLES[priority];
              const isCycling = cyclingId === item.id;
              const statusChipClass = isDone
                ? "bg-success-container text-on-success-container"
                : isInProgress
                ? "bg-warning-container text-on-warning-container"
                : "bg-surface-container-high text-text-muted";

              const ownerName = item.owner_name?.trim() || "Unassigned";
              const ownerInitial = ownerName !== "Unassigned" ? ownerName.charAt(0).toUpperCase() : "?";

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleItemStatus(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleItemStatus(item.id);
                    }
                  }}
                  className="group w-full text-left bg-surface-container/50 hover:bg-surface-container border border-outline-variant/15 hover:border-outline-variant/30 rounded-[22px] p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Status checkbox */}
                    <div
                      className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all shadow-xs ${
                        isDone
                          ? "bg-success border-success text-on-success"
                          : isInProgress
                          ? "border-warning bg-warning/15 text-warning"
                          : "border-outline-variant group-hover:border-primary bg-surface-container/30"
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      {isInProgress && (
                        <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[14px] sm:text-[14.5px] font-medium leading-snug transition-colors ${
                          isDone
                            ? "line-through text-text-muted/70"
                            : "text-text group-hover:text-primary"
                        }`}
                      >
                        {item.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted mt-2">
                        {/* Owner Chip */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high/80 border border-outline-variant/10 text-text">
                          <span className="w-4 h-4 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-[9px] font-bold">
                            {ownerInitial}
                          </span>
                          <span className="font-medium text-[11.5px]">{ownerName}</span>
                        </span>

                        {/* Due Date */}
                        {item.due_date && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-warning-container/30 border border-warning/20 text-warning text-[11px] font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{item.due_date}</span>
                          </span>
                        )}

                        {/* Status Chip */}
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusChipClass}`}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Priority Cycling Pill */}
                  <button
                    type="button"
                    onClick={
                      !isCycling && onPriorityChange
                        ? (e) => handlePriorityClick(e, item)
                        : undefined
                    }
                    title={
                      onPriorityChange
                        ? `Priority: ${pStyle.label} (click to cycle)`
                        : pStyle.label
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shrink-0 select-none transition-transform active:scale-90 hover:brightness-105 shadow-xs ${
                      pStyle.chip
                    } ${onPriorityChange ? "cursor-pointer" : ""} ${
                      isCycling ? "opacity-60 cursor-wait" : ""
                    }`}
                  >
                    {pStyle.icon}
                    <span>{pStyle.label}</span>
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
