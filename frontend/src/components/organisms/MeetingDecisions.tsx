"use client";

import { useState } from "react";
import {
  RiCompass3Line,
  RiUserLine as UserIcon,
  RiFileCopyLine as Copy,
  RiCheckLine as Check,
} from "@remixicon/react";
import type { Meeting } from "@/types";
import { copyToClipboard } from "@/lib/clipboard";

interface MeetingDecisionsProps {
  decisions: Meeting["decisions"];
}

export default function MeetingDecisions({ decisions }: MeetingDecisionsProps) {
  const [copied, setCopied] = useState(false);

  const hasDecisions = Boolean(decisions && decisions.length > 0);

  const handleCopy = async () => {
    if (!decisions || decisions.length === 0) return;
    const text = decisions
      .map((dec, idx) => {
        const d = typeof dec === "string" ? { text: dec, decided_by: "", confidence: "" } : (dec || { text: "", decided_by: "", confidence: "" });
        const decText = typeof d.text === "string" ? d.text : JSON.stringify(d.text ?? "");
        const decidedBy = d.decided_by ? ` (Decided by: ${d.decided_by})` : "";
        return `${idx + 1}. ${decText}${decidedBy}`;
      })
      .join("\n");

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      aria-label="Key Decisions"
      className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none flex flex-col gap-5 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0 shadow-xs">
            <RiCompass3Line className="w-5 h-5 text-tertiary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text">
                Key Decisions
              </h2>
              <span className="text-[11px] font-semibold text-text-muted bg-surface-container-high rounded-full px-2.5 py-0.5">
                {decisions?.length ?? 0}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Agreed resolutions and architectural choices
            </p>
          </div>
        </div>

        {/* Right action */}
        {hasDecisions && (
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-semibold text-text active:scale-95 transition-all"
            title="Copy decisions to clipboard"
            aria-label="Copy decisions to clipboard"
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
        )}
      </div>

      {/* Decision items or empty state */}
      {!hasDecisions ? (
        <div className="rounded-[22px] border border-dashed border-outline-variant/25 bg-surface-container/20 py-8 px-6 text-center flex flex-col items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-surface-container-high/60 flex items-center justify-center text-text-muted">
            <RiCompass3Line className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-[13.5px] text-text-muted font-medium">
            No explicit decisions recorded in this call.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {decisions!.map((dec, idx) => {
            const d =
              typeof dec === "string"
                ? { text: dec, decided_by: "", confidence: "" }
                : (dec || { text: "", decided_by: "", confidence: "" });
            const text = typeof d.text === "string" ? d.text : JSON.stringify(d.text ?? "");
            const decidedBy = d.decided_by || "Team";
            const confidence = d.confidence || "";

            return (
              <div
                key={idx}
                className="group bg-surface-container/50 hover:bg-surface-container border border-outline-variant/15 hover:border-outline-variant/30 rounded-[22px] p-4.5 sm:p-5 transition-all flex items-start gap-3.5"
              >
                {/* Numbered Milestone Indicator */}
                <div className="w-8 h-8 rounded-xl bg-tertiary-container/80 text-on-tertiary-container font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs group-hover:scale-105 transition-transform">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
                  <p className="text-[14px] sm:text-[14.5px] text-text leading-relaxed font-normal">
                    {text}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-2.5 border-t border-outline-variant/10">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shrink-0">
                        <UserIcon className="w-2.5 h-2.5 text-text-muted" />
                      </span>
                      <span className="text-text font-medium truncate">{decidedBy}</span>
                    </span>
                    {confidence && (
                      <span className="px-2.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-[10px] font-bold tracking-wide uppercase">
                        {confidence}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
