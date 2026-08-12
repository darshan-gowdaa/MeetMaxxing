import { copyToClipboard } from "../../lib/utils";
import { useState } from "react";

interface QuestionCardProps {
  question: string;
  onSendToChat?: (q: string) => void;
}

/** Single suggested-question card with copy + optional send-to-chat */
export function QuestionCard({ question, onSendToChat }: QuestionCardProps) {
  const [copied, setCopied] = useState(false);
  const copy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    copyToClipboard(question, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div
      onClick={copy}
      className="p-4 rounded-[24px] bg-surface-container border border-border hover:brightness-110 text-[13px] text-text transition-all duration-300 group cursor-pointer"
    >
      <div className="flex justify-between items-start gap-3">
        <span className="leading-relaxed font-medium active:opacity-70">{question}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={copy}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-secondary-container text-text-muted hover:text-on-secondary-container active:opacity-80 transition-all"
            title="Copy"
          >
            <i className={copied ? "ri-check-line text-success" : "ri-clipboard-line"} />
          </button>
          {onSendToChat && (
            <button
              onClick={(e) => { e.stopPropagation(); onSendToChat(question); }}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-primary hover:brightness-110 text-on-primary active:opacity-80 transition-all shadow-sm"
              title="Send to AI Chat"
            >
              <i className="ri-arrow-right-up-line" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
