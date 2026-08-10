import { RiRefreshLine, RiDeleteBinLine } from "@remixicon/react";
import { ApiKey } from "../../types";

export function ApiKeyBadge({ apiKey: key, onCheck, onDelete }: { apiKey: ApiKey, onCheck: (id: string) => void, onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 bg-surface2 rounded-full pl-2.5 pr-1 py-1 border border-border/50 shadow-sm max-w-full overflow-hidden">
      <div className="relative flex h-2 w-2 shrink-0">
        {key.status === "unchecked" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${key.status === "valid" ? "bg-success" : key.status === "invalid" ? "bg-risk" : "bg-warning"}`}></span>
      </div>
      
      {key.label && (
         <span className="text-[12px] font-bold text-text ml-0.5 truncate max-w-[80px]">{key.label}</span>
      )}
      
      <span className="text-[12px] font-mono text-text-muted tracking-widest bg-surface3 px-2 py-0.5 rounded-full shrink-0 mt-px">••••{key.last4}</span>
      
      <div className="flex items-center gap-1 border-l border-border/50 pl-1 ml-0.5 shrink-0">
        <button onClick={() => onCheck(key.id)} className="w-6 h-6 flex items-center justify-center rounded-full text-text-muted hover:bg-surface3 hover:text-text transition-colors" title="Check status">
          <RiRefreshLine className={`w-3.5 h-3.5 ${key.status === "unchecked" ? "animate-spin" : ""}`} />
        </button>
        <button onClick={() => onDelete(key.id)} className="w-6 h-6 flex items-center justify-center rounded-full text-risk/70 hover:bg-risk/10 hover:text-risk transition-colors" title="Delete">
          <RiDeleteBinLine className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
