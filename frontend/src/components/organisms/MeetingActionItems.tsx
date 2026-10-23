"use client";

import { useState } from "react";
import {
  RiCheckLine as Check,
  RiTimeLine as Clock,
  RiUserLine as UserIcon,
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

const PRIORITY_STYLES: Record<Priority, { chip: string; dot: string; icon: React.ReactNode; label: string }> = {
  high: {
    chip: "bg-risk-container text-on-risk-container",
    dot: "bg-risk",
    icon: <RiArrowUpLine className="w-3 h-3" />,
    label: "High",
  },
  medium: {
    chip: "bg-warning-container text-on-warning-container",
    dot: "bg-warning",
    icon: <RiArrowRightLine className="w-3 h-3" />,
    label: "Medium",
  },
  low: {
    chip: "bg-success-container text-on-success-container",
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

export default function MeetingActionItems({ actionItems, toggleItemStatus, onPriorityChange }: MeetingActionItemsProps) {
  const [cyclingId, setCyclingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!actionItems) return;
    const text = actionItems.map(item => `- [${item.status === 'done' ? 'x' : ' '}] ${item.description} (Owner: ${item.owner_name || 'Unassigned'}, Due: ${item.due_date || 'None'}, Priority: ${item.priority || 'Medium'})`).join('\n');
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!actionItems) return null;

  const openCount = actionItems.filter(a => a.status === "open").length;
  const inProgressCount = actionItems.filter(a => a.status === "in_progress").length;
  const doneCount = actionItems.filter(a => a.status === "done").length;

  const handlePriorityClick = async (e: React.MouseEvent, item: Meeting["action_items"][0]) => {
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
    <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <RiListCheck3 className="w-4 h-4" />
          </div>
          <span>Action Items</span>
          <span className="text-[11px] font-semibold text-text-muted bg-surface-container-high rounded-full px-2.5 py-0.5 normal-case tracking-normal">
            {actionItems.length}
          </span>
        </div>

        {actionItems.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {openCount > 0 && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-surface-container-high text-text-muted">
                {openCount} open
              </span>
            )}
            {inProgressCount > 0 && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-warning-container text-on-warning-container">
                {inProgressCount} in progress
              </span>
            )}
            {doneCount > 0 && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-success-container text-on-success-container">
                {doneCount} done
              </span>
            )}
            <button
              onClick={handleCopy}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container active:scale-[0.98] transition-all text-text-muted hover:text-primary ml-1"
              title="Copy Action Items"
              aria-label="Copy Action Items"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {actionItems.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-outline-variant/30 bg-surface-container/30 p-6 text-center">
          <p className="text-[13px] text-text-muted font-medium">No action items in this meeting.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...actionItems].sort((a, b) => {
            const statusOrder: Record<string, number> = { open: 0, in_progress: 1, done: 2 };
            const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
            const aStatus = statusOrder[a.status] ?? 3;
            const bStatus = statusOrder[b.status] ?? 3;
            if (aStatus !== bStatus) return aStatus - bStatus;
            return (priorityOrder[normalizePriority(a.priority)] ?? 3) - (priorityOrder[normalizePriority(b.priority)] ?? 3);
          }).map((item) => {
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
                className="group w-full text-left bg-surface-container/70 rounded-[20px] p-4 sm:p-5 border border-outline-variant/15 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors cursor-pointer active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Status checkbox */}
                  <div className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isDone
                      ? "bg-success border-success text-on-success"
                      : isInProgress
                      ? "border-warning bg-warning/10"
                      : "border-outline-variant group-hover:border-primary"
                  }`}>
                    {isDone && <Check className="w-3.5 h-3.5" />}
                    {isInProgress && <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13.5px] font-semibold leading-snug transition-colors ${
                      isDone ? "line-through text-text-muted" : "text-text group-hover:text-primary"
                    }`}>
                      {item.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted mt-2">
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
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusChipClass}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Priority chip */}
                <span
                  onClick={!isCycling && onPriorityChange ? (e) => handlePriorityClick(e, item) : undefined}
                  title={onPriorityChange ? "Click to change priority" : pStyle.label}
                  className={`rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shrink-0 select-none active:scale-95 transition-all ${pStyle.chip} ${
                    onPriorityChange ? "cursor-pointer hover:brightness-105" : ""
                  } ${isCycling ? "opacity-60 cursor-wait" : ""}`}
                >
                  {pStyle.icon}
                  <span>{pStyle.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
