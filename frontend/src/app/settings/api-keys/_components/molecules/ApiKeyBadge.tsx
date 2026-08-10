import { RiRefreshLine, RiDeleteBinLine } from "@remixicon/react";
import { ApiKey } from "../../types";

export function ApiKeyBadge({ apiKey: key, onCheck, onDelete }: { apiKey: ApiKey, onCheck: (id: string) => void, onDelete: (id: string) => void }) {
  const getStatusColor = () => {
    switch (key.status) {
      case 'valid': return 'bg-success/15 text-success-text border-success/20';
      case 'invalid': return 'bg-risk/15 text-risk border-risk/20';
      default: return 'bg-warning/15 text-warning-text border-warning/20';
    }
  };

  const getDotColor = () => {
    switch (key.status) {
      case 'valid': return 'bg-success';
      case 'invalid': return 'bg-risk';
      default: return 'bg-warning';
    }
  };

  return (
    <div className={`flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5 border shadow-sm ${getStatusColor()} transition-colors`}>
      <div className="relative flex h-2 w-2 shrink-0">
        {key.status === "unchecked" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${getDotColor()}`}></span>
      </div>
      
      {key.label && (
         <span className="text-[13px] font-bold ml-1 truncate max-w-[100px]">{key.label}</span>
      )}
      
      <span className="text-[13px] font-mono tracking-widest opacity-80 shrink-0 ml-1">••••{key.last4}</span>
      
      <div className="flex items-center gap-0.5 border-l border-current/20 pl-1.5 ml-1 shrink-0">
        <button onClick={() => onCheck(key.id)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none" title="Check status">
          <RiRefreshLine className={`w-4 h-4 ${key.status === "unchecked" ? "animate-spin" : ""}`} />
        </button>
        <button onClick={() => onDelete(key.id)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-risk/20 text-risk transition-colors focus:outline-none" title="Delete">
          <RiDeleteBinLine className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
