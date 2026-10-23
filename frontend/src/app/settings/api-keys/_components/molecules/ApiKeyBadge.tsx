"use client";

import { useState, useRef, useEffect } from "react";
import {
  RiRefreshLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiTimeLine,
} from "@remixicon/react";
import { ApiKey } from "../../types";

export function ApiKeyBadge({
  apiKey: key,
  onCheck,
  onDelete,
}: {
  apiKey: ApiKey;
  onCheck: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPopover(false);
    };

    if (showPopover) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPopover]);

  const getStatusColor = () => {
    switch (key.status) {
      case "valid":
        return "bg-success/15 text-success border-success/30";
      case "invalid":
        return "bg-risk/15 text-risk border-risk/30";
      case "rate_limited":
        return "bg-warning/20 text-warning border-warning/40";
      default:
        return "bg-surface2 text-text-muted border-border";
    }
  };

  const getDotColor = () => {
    switch (key.status) {
      case "valid":
        return "bg-success";
      case "invalid":
        return "bg-risk";
      case "rate_limited":
        return "bg-warning";
      default:
        return "bg-text-muted";
    }
  };

  const formatCheckedDate = (dateStr?: string) => {
    if (!dateStr) return "Never checked";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <div
        className={`flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5 border shadow-sm ${getStatusColor()} transition-colors`}
      >
        <button
          type="button"
          onClick={() => setShowPopover((prev) => !prev)}
          className="flex items-center gap-1.5 focus:outline-none"
          aria-label={`View status details for key ending ${key.last4}`}
          aria-expanded={showPopover}
        >
          <div className="relative flex h-2 w-2 shrink-0">
            {key.status === "unchecked" && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${getDotColor()}`} />
          </div>

          {key.label && (
            <span className="text-[13px] font-bold truncate max-w-[100px]">{key.label}</span>
          )}

          <span className="text-[13px] font-mono tracking-widest opacity-80 shrink-0">
            ••••{key.last4}
          </span>
        </button>

        {/* Latency badge when available */}
        {key.latency_ms !== undefined && key.latency_ms !== null && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-surface-container-high/70 border border-border/50 text-text shrink-0">
            {key.latency_ms}ms
          </span>
        )}

        <div className="flex items-center gap-0.5 border-l border-current/20 pl-1.5 ml-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onCheck(key.id)}
            aria-label={`Check status of ${key.label || "API key"} ending ${key.last4}`}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors focus:outline-none"
            title="Check status"
          >
            <RiRefreshLine
              className={`w-4 h-4 ${key.status === "unchecked" ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => onDelete(key.id)}
            aria-label={`Delete ${key.label || "API key"} ending ${key.last4}`}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-risk/20 text-risk transition-colors focus:outline-none"
            title="Delete"
          >
            <RiDeleteBinLine className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Interactive Tooltip / Popover with status details, last_error_message_safe, last_checked_at */}
      {showPopover && (
        <div
          role="tooltip"
          className="absolute top-full left-0 mt-2 z-50 w-72 p-3.5 rounded-2xl bg-surface-container-highest/95 backdrop-blur-md shadow-xl border border-border text-xs text-text space-y-2 pointer-events-auto"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
              {key.status === "valid" ? (
                <RiCheckLine className="w-3.5 h-3.5 text-success" />
              ) : key.status === "invalid" ? (
                <RiCloseCircleLine className="w-3.5 h-3.5 text-risk" />
              ) : (
                <RiErrorWarningLine className="w-3.5 h-3.5 text-warning" />
              )}
              <span className={key.status === "valid" ? "text-success" : key.status === "invalid" ? "text-risk" : "text-warning"}>
                Status: {key.status}
              </span>
            </div>
            {key.latency_ms !== undefined && key.latency_ms !== null && (
              <span className="font-mono text-[11px] font-bold bg-surface2 px-1.5 py-0.5 rounded text-text-muted">
                {key.latency_ms} ms
              </span>
            )}
          </div>

          {key.last_error_message_safe && key.status !== "valid" && (
            <div className="p-2 rounded-xl bg-risk/10 border border-risk/30 text-risk text-[11px] leading-tight">
              <span className="font-semibold block mb-0.5">Last error:</span>
              <span>{key.last_error_message_safe}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-text-muted text-[11px] pt-0.5">
            <RiTimeLine className="w-3.5 h-3.5 shrink-0 opacity-70" />
            <span>Checked: {formatCheckedDate(key.last_checked_at)}</span>
          </div>

          {key.label && (
            <div className="text-[11px] text-text-muted">
              Label: <span className="font-medium text-text">{key.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
