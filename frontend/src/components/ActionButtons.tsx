import { RiCheckLine as Check, RiAlertLine as AlertTriangle } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/Md3Loading";

export type BtnState = "idle" | "loading" | "success" | "error";

export const GmailIcon = ({ className }: { className?: string }) => (
  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" className={className} alt="Gmail" />
);

export const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className={className} alt="Google Calendar" />
);

export function ActionButton({
  label, icon: Icon, state, successLabel,
  errorLabel = "Failed — retry", onClick,
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
      <button disabled className="flex items-center gap-2 px-4 h-9 rounded-full bg-surface2 border border-border text-[12px] text-text-muted cursor-wait">
        <Md3LoadingIndicator size="sm" />
        {label}…
      </button>
    );
  if (state === "success")
    return (
      <button disabled className="flex items-center gap-2 px-4 h-9 rounded-full bg-success/10 border border-success/30 text-[12px] text-success cursor-default">
        <Check className="w-3.5 h-3.5" />
        {successLabel}
      </button>
    );
  if (state === "error")
    return (
      <button onClick={onClick} className="flex items-center gap-2 px-4 h-9 rounded-full bg-risk-container/40 border border-risk/30 text-[12px] text-risk spring hover:-translate-y-0.5 active:translate-y-0">
        <AlertTriangle className="w-3.5 h-3.5" />
        {errorLabel}
      </button>
    );
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 h-9 rounded-full bg-surface2 hover:bg-primary-container border border-border hover:border-primary/30 text-[12px] font-medium text-text hover:text-on-primary-container spring"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
