import { useState } from "react";
import { copyToClipboard } from "../../lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  title?: string;
}

/** Clipboard copy button with 2s success feedback */
export function CopyButton({ text, className = "", title = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () =>
    copyToClipboard(text, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  return (
    <button
      onClick={handleCopy}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-primary-container text-text-muted hover:text-on-primary-container active:opacity-80 transition-all shrink-0 ${className}`}
    >
      <i className={copied ? "ri-check-line text-success" : "ri-clipboard-line"} />
    </button>
  );
}
