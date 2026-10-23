/* eslint-disable @next/next/no-img-element */
import { RiCheckLine as Check, RiAlertLine as AlertTriangle } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";

export type BtnState = "idle" | "loading" | "success" | "error";

export const GmailIcon = ({ className }: { className?: string }) => (
  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" className={className} alt="Gmail" />
);

export const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className={className} alt="Google Calendar" />
);

export function ActionButton({
  label,
  icon: Icon,
  state,
  successLabel,
  errorLabel = "Failed — retry",
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: BtnState;
  successLabel: string;
  errorLabel?: string;
  onClick: () => void;
}) {
  if (state === "loading")
    return (
      <button
        disabled
        className="flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm bg-secondary-container/70 text-on-secondary-container cursor-wait"
      >
        <Md3LoadingIndicator size="sm" />
        <span>{label}…</span>
      </button>
    );
  if (state === "success")
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 bg-success-container text-on-success-container cursor-pointer"
      >
        <Check className="w-3.5 h-3.5" />
        <span>{successLabel}</span>
      </button>
    );
  if (state === "error")
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 bg-risk-container text-on-risk-container"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>{errorLabel}</span>
      </button>
    );
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 bg-secondary-container text-on-secondary-container hover:brightness-105"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
