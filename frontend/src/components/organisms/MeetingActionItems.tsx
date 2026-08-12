"use client";

import { useState } from"react";
import {
 RiCheckLine as Check,
 RiTimeLine as Clock,
 RiUserLine as UserIcon,
 RiListCheck3,
 RiArrowUpLine,
 RiArrowRightLine,
 RiArrowDownLine,
 RiFileCopyLine as Copy,
} from"@remixicon/react";
import type { Meeting } from"@/types";

interface MeetingActionItemsProps {
 actionItems: Meeting["action_items"];
 toggleItemStatus: (itemId: string) => Promise<void>;
 onPriorityChange?: (itemId: string, priority: string) => Promise<void>;
}

type Priority ="high"|"medium"|"low";

const PRIORITY_STYLES: Record<Priority, { chip: string; dot: string; icon: React.ReactNode; label: string }> = {
 high: {
 chip:"bg-risk-container text-risk border-risk/30",
 dot:"bg-risk",
 icon: <RiArrowUpLine className="w-3 h-3"/>,
 label:"High",
 },
 medium: {
 chip:"bg-warning-container text-warning border-warning/30",
 dot:"bg-warning",
 icon: <RiArrowRightLine className="w-3 h-3"/>,
 label:"Medium",
 },
 low: {
 chip:"bg-success-container text-success border-success/30",
 dot:"bg-success",
 icon: <RiArrowDownLine className="w-3 h-3"/>,
 label:"Low",
 },
};

const PRIORITY_CYCLE: Priority[] = ["high","medium","low"];

const STATUS_LABELS: Record<string, string> = {
 open:"Open",
 in_progress:"In Progress",
 done:"Done",
};

/** Normalize priority string from LLM (may be capitalized) to lowercase key */
function normalizePriority(p: string | undefined | null): Priority {
 const lower = (p ||"medium").toLowerCase().trim() as Priority;
 return PRIORITY_STYLES[lower] ? lower :"medium";
}

export default function MeetingActionItems({ actionItems, toggleItemStatus, onPriorityChange }: MeetingActionItemsProps) {
 const [cyclingId, setCyclingId] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);

 const handleCopy = async () => {
 if (!actionItems) return;
 const text = actionItems.map(item => `- [${item.status === 'done' ? 'x' : ' '}] ${item.description} (Owner: ${item.owner_name || 'Unassigned'}, Due: ${item.due_date || 'None'}, Priority: ${item.priority || 'Medium'})`).join('\n');
 await navigator.clipboard.writeText(text);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 if (!actionItems) return null;

 const openCount = actionItems.filter(a => a.status ==="open").length;
 const inProgressCount = actionItems.filter(a => a.status ==="in_progress").length;
 const doneCount = actionItems.filter(a => a.status ==="done").length;

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
 <div className="bg-surface-container rounded-[24px] border border-border p-5 md:p-6 flex flex-col gap-4">
 <div className="flex items-center justify-between gap-3 flex-wrap">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-[12px] bg-primary-container flex items-center justify-center">
 <RiListCheck3 className="w-4 h-4 text-primary"/>
 </div>
 <h2 className="text-[14px] font-bold text-text tracking-tight">
 Action Items
 </h2>
 <span className="text-[11px] font-semibold text-text-muted bg-surface2 border border-border rounded-full px-2.5 py-0.5">
 {actionItems.length}
 </span>
 </div>

 {actionItems.length > 0 && (
 <div className="flex items-center gap-2 flex-wrap">
 {openCount > 0 && (
 <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface2 border border-border text-text-muted">
 {openCount} open
 </span>
 )}
 {inProgressCount > 0 && (
 <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-warning-container/40 border border-warning/20 text-warning">
 {inProgressCount} in progress
 </span>
 )}
 {doneCount > 0 && (
 <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-success-container/40 border border-success/20 text-success">
 {doneCount} done
 </span>
 )}
 <button
 onClick={handleCopy}
 className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface2 active:opacity-80 transition-colors text-text-muted hover:text-primary ml-1"
 title="Copy Action Items"
 >
 {copied ? <Check className="w-3.5 h-3.5 text-success"/> : <Copy className="w-3.5 h-3.5"/>}
 </button>
 </div>
 )}
 </div>

 {actionItems.length === 0 ? (
 <div className="rounded-[16px] border border-dashed border-border bg-surface-dim p-5 md:p-6 text-center">
 <p className="text-[13px] text-text-muted font-medium">No action items in this meeting.</p>
 </div>
 ) : (
 <div className="flex flex-col gap-2.5">
 {[...actionItems].sort((a, b) => {
 const statusOrder: Record<string, number> = { open: 0, in_progress: 1, done: 2 };
 const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
 const aStatus = statusOrder[a.status] ?? 3;
 const bStatus = statusOrder[b.status] ?? 3;
 if (aStatus !== bStatus) return aStatus - bStatus;
 return (priorityOrder[normalizePriority(a.priority)] ?? 3) - (priorityOrder[normalizePriority(b.priority)] ?? 3);
 }).map((item) => {
 const isDone = item.status ==="done";
 const isInProgress = item.status ==="in_progress";
 const priority = normalizePriority(item.priority);
 const pStyle = PRIORITY_STYLES[priority];
 const isCycling = cyclingId === item.id;

 return (
 <div
 key={item.id}
 role="button"
 onClick={() => toggleItemStatus(item.id)}
 className={`group w-full text-left rounded-[16px] border p-4 spring flex items-start gap-3 hover:shadow-sm border border-border active:opacity-80 ${
 isDone
 ?"bg-success/5 border-success/20 opacity-75"
 : isInProgress
 ?"bg-warning/5 border-warning/20"
 :"bg-surface2 border-border hover:border-border-strong"
 }`}
 >
 {/* Status checkbox */}
 <div className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center shrink-0 mt-0.5 spring ${
 isDone
 ?"bg-success border-success text-bg"
 : isInProgress
 ?"border-warning bg-warning/10"
 :"border-border-strong group-hover:border-primary"
 }`}>
 {isDone && <Check className="w-3.5 h-3.5"/>}
 {isInProgress && <div className="w-2 h-2 rounded-full bg-warning animate-pulse"/>}
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <p className={`text-[13px] font-semibold leading-snug spring-colors ${
 isDone ?"line-through text-text-muted":"text-text group-hover:text-primary"
 }`}>
 {item.description}
 </p>
 <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted mt-1.5">
 <span className="flex items-center gap-1">
 <UserIcon className="w-3 h-3"/>
 <span className="text-text font-medium">{item.owner_name ||"Unassigned"}</span>
 </span>
 {item.due_date && (
 <span className="flex items-center gap-1 text-warning">
 <Clock className="w-3 h-3"/>
 {item.due_date}
 </span>
 )}
 <span className={`font-medium ${
 isDone ?"text-success": isInProgress ?"text-warning":"text-text-muted"
 }`}>
 {STATUS_LABELS[item.status] ?? item.status}
 </span>
 </div>
 </div>

 {/* Priority badge — click to cycle if onPriorityChange provided */}
 <span
 onClick={onPriorityChange ? (e) => handlePriorityClick(e, item) : undefined}
 title={onPriorityChange ?"Click to change priority": pStyle.label}
 className={`flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2.5 py-1 tracking-wide shrink-0 select-none ${pStyle.chip} ${
 onPriorityChange ?"cursor-pointer hover:brightness-110 active:opacity-80 spring":""
 } ${isCycling ?"opacity-60 pointer-events-none":""}`}
 >
 {pStyle.icon}
 {pStyle.label}
 </span>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
