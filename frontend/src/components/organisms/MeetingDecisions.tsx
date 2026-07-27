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
    <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[12px] bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-success" />
        </div>
        <h2 className="text-[14px] font-bold text-text tracking-tight">
          Key Decisions ({decisions.length})
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {decisions.map((dec, idx) => (
          <div
            key={idx}
            className="bg-surface2 rounded-[16px] border border-border p-4 flex flex-col gap-3 spring hover:-translate-y-0.5 hover:border-border-strong"
          >
            <p className="text-[13px] text-text leading-relaxed font-medium">{dec.text}</p>
            <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-surface3 border border-border flex items-center justify-center">
                  <UserIcon className="w-2.5 h-2.5" />
                </span>
                <span className="text-text font-semibold">{dec.decided_by || "Team"}</span>
              </span>
              {dec.confidence && (
                <span className="px-2 py-0.5 rounded-full bg-primary-dim text-primary text-[10px] font-bold capitalize border border-primary/20">
                  {dec.confidence}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
