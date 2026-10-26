import { RiAddLine } from "@remixicon/react";

export function ApiKeysHero({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
          API Keys
        </h1>
        <p className="text-sm text-text-muted">
          Connect AI model providers and manage encrypted credentials. Your keys are never logged.
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="rounded-full px-4 py-2.5 bg-primary text-on-primary hover:bg-primary/90 font-semibold text-xs sm:text-[13px] inline-flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.97] shrink-0 cursor-pointer"
      >
        <RiAddLine className="w-4 h-4 text-on-primary" />
        <span>Add Key</span>
      </button>
    </div>
  );
}
