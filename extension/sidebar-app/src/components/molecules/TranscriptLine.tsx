import type { TranscriptChunk } from "../../types";

/** Single transcript line with speaker avatar and timestamp */
export function TranscriptLine({ line }: { line: TranscriptChunk }) {
  const isYou = line.speaker === "You";
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-[20px] bg-surface-container-high border border-border hover:brightness-110 transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase ${isYou ? "text-success" : "text-primary"}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9.5px] shrink-0 border ${isYou ? "bg-success-container border-success-container text-on-success-container" : "bg-primary-container border-primary-container text-on-primary-container"}`}>
            {line.speaker.charAt(0)}
          </div>
          {line.speaker}
        </span>
        {line.timestamp && line.timestamp > 0 && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-surface-container-highest text-text-muted font-mono border border-border">
            {new Date(line.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>
      <span className="text-[13px] text-text leading-relaxed break-words pl-6">{line.text}</span>
    </div>
  );
}
