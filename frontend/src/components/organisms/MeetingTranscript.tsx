"use client";

import { useState } from "react";
import {
  RiChat1Line as MessageSquare,
  RiArrowDownSLine as ChevronDown,
  RiArrowUpSLine as ChevronUp,
} from "@remixicon/react";
import type { Meeting } from "@/types";

interface MeetingTranscriptProps {
  transcriptData: Meeting["transcript_data"];
}

export default function MeetingTranscript({ transcriptData }: MeetingTranscriptProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "dom" | "audio">("all");

  if (!transcriptData || transcriptData.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-[24px] border border-border overflow-hidden">
      <div className="w-full flex items-center justify-between px-6 py-5 hover:bg-surface2 spring-colors group cursor-pointer" onClick={() => setTranscriptOpen((o) => !o)}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[12px] bg-surface3 border border-border flex items-center justify-center group-hover:bg-primary-container spring-colors">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[14px] font-bold text-text group-hover:text-primary spring-colors">
            Full Transcript ({transcriptData.length} total)
          </span>
        </div>
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <select 
            value={sourceFilter} 
            onChange={(e) => setSourceFilter(e.target.value as "all" | "dom" | "audio")}
            className="bg-surface3 border border-border rounded text-[12px] font-medium text-text py-1 px-2 outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All sources</option>
            <option value="dom">DOM (CC)</option>
            <option value="audio">Agent (AI)</option>
          </select>
          <div className="w-7 h-7 rounded-full bg-surface3 border border-border flex items-center justify-center group-hover:bg-primary-container spring-colors cursor-pointer" onClick={() => setTranscriptOpen((o) => !o)}>
            {transcriptOpen
              ? <ChevronUp className="w-4 h-4 text-text group-hover:text-primary spring-colors" />
              : <ChevronDown className="w-4 h-4 text-text group-hover:text-primary spring-colors" />}
          </div>
        </div>
      </div>

      {transcriptOpen && (
        <div className="border-t border-border px-6 pb-6 pt-4 flex flex-col gap-1.5 max-h-[520px] overflow-y-auto custom-scrollbar">
          {transcriptData
            .filter(chunk => sourceFilter === "all" ? true : (((chunk as Record<string, unknown>).source as string) || "dom") === sourceFilter)
            .map((chunk, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1.5 py-3 px-3 rounded-[14px] hover:bg-surface2 spring-colors border border-transparent hover:border-border last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] font-bold text-primary">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold flex items-center justify-center">
                    {(chunk.speaker || "?").charAt(0).toUpperCase()}
                  </span>
                  {chunk.speaker || "Unknown"}
                </span>
                <div className="flex items-center gap-2">
                  {!!(chunk as Record<string, unknown>).source && (
                    <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold bg-surface3 px-2 py-0.5 rounded-full border border-border">
                      {(chunk as Record<string, unknown>).source as string}
                    </span>
                  )}
                  {chunk.timestamp_ms > 0 && (
                    <span className="text-[10px] font-mono text-text-muted bg-surface3 px-2 py-0.5 rounded-md">
                      {`${String(Math.floor(chunk.timestamp_ms / 60000)).padStart(2, "0")}:${String(Math.floor((chunk.timestamp_ms % 60000) / 1000)).padStart(2, "0")}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[12.5px] text-text-muted leading-relaxed pl-8">
                {(() => {
                  let content = chunk.text;
                  if (typeof content === "string" && (content.trim().startsWith("{") || content.trim().startsWith("["))) {
                    try { content = JSON.parse(content); } catch { }
                  }
                  
                  if (Array.isArray(content)) {
                    return content.map((item: unknown, i: number) => {
                      const obj = item as Record<string, unknown>;
                      const text = typeof item === "string" ? item : (obj.text || obj.utterance || obj.raw_text || obj.refined_text || JSON.stringify(item));
                      return <span key={i} className="block mb-1">{text as string}</span>;
                    });
                  }
                  
                  if (content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).dialog_turn)) {
                    return ((content as Record<string, unknown>).dialog_turn as unknown[]).map((t: unknown, i: number) => {
                      const obj = t as Record<string, unknown>;
                      return (
                      <span key={i} className="block mb-1">
                        {obj.speaker && obj.speaker !== chunk.speaker && obj.speaker !== "Unknown" && obj.speaker !== "You" ? <strong className="mr-1 text-primary">{obj.speaker as string}:</strong> : null}
                        {(obj.refined_text || obj.raw_text) as string}
                      </span>
                      );
                    });
                  }
                  return typeof chunk.text === "string" ? chunk.text : JSON.stringify(chunk.text);
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
