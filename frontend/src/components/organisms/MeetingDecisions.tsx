"use client";

import {
  RiCheckLine as CheckCircle2,
  RiUserLine as UserIcon,
} from "@remixicon/react";
import type { Meeting } from "@/types";

interface MeetingDecisionsProps {
  decisions: Meeting["decisions"];
}

export default function MeetingDecisions({ decisions }: MeetingDecisionsProps) {
  if (!decisions || decisions.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none flex flex-col gap-4">
      <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <span>Key Decisions ({decisions.length})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {decisions.map((dec, idx) => {
          // Null-safe: backend may return plain strings or objects with missing
          // optional fields (decided_by/confidence).
          const d = typeof dec === "string" ? { text: dec, decided_by: "", confidence: "" } : (dec || { text: "", decided_by: "", confidence: "" });
          const text = typeof d.text === "string" ? d.text : JSON.stringify(d.text ?? "");
          const decidedBy = d.decided_by || "Team";
          const confidence = d.confidence || "";
          return (
            <div
              key={idx}
              className="bg-surface-container/70 rounded-[20px] p-4 sm:p-5 border border-outline-variant/15 flex items-start gap-3.5 hover:bg-surface-container transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                <p className="text-[13.5px] text-text leading-relaxed font-medium">{text}</p>
                <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-outline-variant/15">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
                      <UserIcon className="w-2.5 h-2.5" />
                    </span>
                    <span className="text-text font-semibold">{decidedBy}</span>
                  </span>
                  {confidence && (
                    <span className="px-2.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-[10px] font-bold capitalize">
                      {confidence}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
