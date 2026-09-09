import { RiAlertLine as ShieldAlert } from "@remixicon/react";
import { getWebUrl } from "../../config";

export function Header({ meetingId, isEnded, elapsedTime, triggerAction, isEnding, poweredBy }: any) {
  const isByok = (poweredBy || "").toLowerCase().startsWith("byok");
  const displayEngine = isByok
    ? poweredBy.replace(/^byok:\s*/i, "")
    : (poweredBy || "MeetMaxxing AI").replace(/^meetmaxxing ai\s*\(?/i, "").replace(/\)$/, "") || "Default";

  return (
    <header className="flex items-center justify-between px-3.5 py-2.5 mx-3 mt-3 mb-1 bg-surface-container border border-border shrink-0 shadow-lg z-10 rounded-[24px] box-border transition-all">
      <div className="flex items-center gap-2 shrink min-w-0">
        <div className="flex items-center gap-1.5 font-bold text-[16px] tracking-tight text-primary shrink-0">
          <span className="text-primary flex items-center justify-center text-lg shrink-0"><i className="ri-sparkling-2-fill" /></span>
          <span>MeetMaxxing</span>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-[130px] transition-all cursor-default ${
            isByok
              ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
          title={isByok ? `Using Your API Key (BYOK): ${poweredBy}` : `Using MeetMaxxing AI: ${poweredBy || "Default pool"}`}
        >
          <i className={isByok ? "ri-key-2-fill text-[11px] shrink-0" : "ri-sparkling-fill text-[10px] shrink-0"} />
          <span className="truncate">{isByok ? `BYOK: ${displayEngine}` : displayEngine}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div id="status-badge" className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-extrabold tracking-[0.1em] uppercase transition-colors shrink-0 ${meetingId && !isEnded ? "bg-success-container text-on-success-container border border-border shadow-sm" : "bg-surface-container-high text-text-muted border border-border"}`}>
          <span className={`w-2 h-2 rounded-full ${meetingId && !isEnded ? "bg-success animate-pulse" : "bg-text-muted"}`} />
          <span>{meetingId && !isEnded ? "Live" : "Idle"}</span>
        </div>
        <div id="timer" className="text-xs font-mono font-bold tracking-wide text-text bg-surface-container-high px-2 py-1 rounded-full border border-border shadow-inner shrink-0">{elapsedTime}</div>
        {meetingId && !isEnded && (
          <button
            className="inline-flex items-center justify-center gap-2 px-2.5 py-1 text-[11px] font-bold rounded-full cursor-pointer transition-colors whitespace-nowrap bg-risk-container text-on-risk-container border border-border hover:brightness-110 shrink-0 disabled:opacity-75 disabled:cursor-not-allowed"
            title="End Meeting & Process Summary"
            disabled={isEnding}
            onClick={() => triggerAction("REQUEST_END_MEETING")}
          >
            {isEnding ? (
              <span className="inline-flex items-center gap-1.5">
                <div className="md3-loading-indicator md3-loading-indicator-sm text-on-risk-container" />
                <span>Stopping...</span>
              </span>
            ) : (
              <>
                <i className="ri-stop-mini-fill text-xs" /> Stop
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}

export function Footer({ meetingId, isEnded, poweredBy }: any) {
  if (!meetingId || isEnded) return null;
  const isByok = (poweredBy || "").toLowerCase().startsWith("byok");

  return (
    <footer className="p-3 mx-3 mb-3 mt-1 border border-border bg-surface-container flex flex-col justify-center shrink-0 shadow-xl rounded-[28px] transition-all gap-2">
      <a
        href={getWebUrl()}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full bg-surface-container-high border border-border text-text text-[13px] font-bold tracking-wide transition-all hover:brightness-110 hover:text-primary no-underline group active:opacity-80"
      >
        <i className="ri-layout-masonry-fill text-lg" />
        <span>Open Intelligence Dashboard</span>
        <i className="ri-arrow-right-up-line ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
      </a>
      {poweredBy && (
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-surface-container-high/60 border border-border/50 text-[10px] font-medium tracking-wide">
          {isByok ? (
            <>
              <i className="ri-key-2-fill text-amber-500 text-xs" />
              <span className="font-bold text-amber-500">Active Engine:</span>
              <span className="text-text truncate max-w-[200px]">{poweredBy}</span>
            </>
          ) : (
            <>
              <i className="ri-sparkling-fill text-primary text-xs" />
              <span className="font-bold text-primary">Active Engine:</span>
              <span className="text-text truncate max-w-[200px]">{poweredBy}</span>
            </>
          )}
        </div>
      )}
    </footer>
  );
}

export function ErrorBanner({ errorMessage, clearError }: any) {
  if (!errorMessage) return null;
  const isApiError = errorMessage.includes("Limit Exceeded") || errorMessage.includes("API key") || errorMessage.includes("API keys");
  
  return (
    <div className="p-4 rounded-[24px] bg-risk-container border border-border flex flex-col gap-3 text-[13px] text-on-risk-container shadow-lg animate-fade-in mb-3 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-risk opacity-80" />
      <div className="flex items-start gap-3 w-full">
        <ShieldAlert className="w-[18px] h-[18px] text-risk shrink-0 mt-[1px]" />
        <div className="flex flex-col gap-1 pr-6 flex-1 min-w-0">
          <span className="font-bold text-on-risk-container tracking-tight text-[14px]">Something went wrong</span>
          <span className="leading-relaxed opacity-90 break-words">{errorMessage}</span>
        </div>
        {clearError && (
          <button onClick={clearError} className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-on-risk-container opacity-50 hover:opacity-100 hover:bg-on-risk hover:text-risk-container transition-all active:scale-95" title="Dismiss">
            <i className="ri-close-line text-lg" />
          </button>
        )}
      </div>
      
      {isApiError && (
        <div className="pl-[30px] w-full">
          <a 
            href="https://meetmaxxing.vercel.app/settings/api-keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-risk text-risk-container rounded-full text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all no-underline"
          >
            <i className="ri-key-2-fill" />
            Manage API Keys
          </a>
        </div>
      )}
    </div>
  );
}
