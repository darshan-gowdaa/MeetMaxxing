import { RiAlertLine as ShieldAlert } from "@remixicon/react";
import { getWebUrl } from "../config";

export function Header({ meetingId, isEnded, elapsedTime, triggerAction }: any) {
  return (
    <header className="flex items-center justify-between px-4 py-3 mx-3 mt-3 mb-1 bg-surface-container border border-border shrink-0 shadow-lg z-10 rounded-[24px] box-border transition-all">
      <div className="flex items-center gap-2 shrink truncate">
        <div className="flex items-center gap-1.5 font-bold text-[17px] tracking-tight text-primary truncate">
          <span className="text-primary flex items-center justify-center text-lg shrink-0"><i className="ri-sparkling-2-fill"></i></span>
          <span>MeetMaxxing</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div id="status-badge" className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-extrabold tracking-[0.1em] uppercase transition-colors shrink-0 ${meetingId && !isEnded ? 'bg-success-container text-on-success-container border border-border shadow-sm' : 'bg-surface-container-high text-text-muted border border-border'}`}>
          <span className={`w-2 h-2 rounded-full ${meetingId && !isEnded ? 'bg-success animate-pulse' : 'bg-text-muted'}`}></span>
          <span>{meetingId && !isEnded ? 'Live' : 'Idle'}</span>
        </div>
        <div id="timer" className="text-xs font-mono font-bold tracking-wide text-text bg-surface-container-high px-2 py-1 rounded-full border border-border shadow-inner shrink-0">{elapsedTime}</div>
        {meetingId && !isEnded && (
          <button
            className="inline-flex items-center justify-center gap-2 px-2.5 py-1 text-[11px] font-bold rounded-full cursor-pointer transition-colors whitespace-nowrap bg-risk-container text-on-risk-container border border-border hover:brightness-110 shrink-0"
            title="End Meeting & Process Summary"
            onClick={() => triggerAction("REQUEST_END_MEETING")}
          >
            <i className="ri-stop-mini-fill text-xs"></i> Stop
          </button>
        )}
      </div>
    </header>
  );
}

export function Footer({ meetingId, isEnded }: any) {
  if (!meetingId || isEnded) return null;
  return (
    <footer className="p-3 mx-3 mb-3 mt-1 border border-border bg-surface-container flex justify-center shrink-0 shadow-xl rounded-[28px] transition-all">
      <a 
        href={getWebUrl()} 
        target="_blank" 
        rel="noreferrer" 
        className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full bg-surface-container-high border border-border text-text text-[13px] font-bold tracking-wide transition-all hover:brightness-110 hover:text-primary no-underline group active:opacity-80"
      >
        <i className="ri-layout-masonry-fill text-lg transition-transform"></i> 
        <span>Open Intelligence Dashboard</span>
        <i className="ri-arrow-right-up-line ml-auto opacity-50 group-hover:opacity-100 transition-opacity"></i>
      </a>
    </footer>
  );
}

export function ErrorBanner({ errorMessage, clearError }: any) {
  if (!errorMessage) return null;
  return (
    <div className="p-4 rounded-[24px] bg-risk-container border border-border flex items-start gap-3 text-[13px] text-on-risk-container shadow-lg animate-fade-in mb-3 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-risk opacity-80"></div>
      <ShieldAlert className="w-[18px] h-[18px] text-risk shrink-0 mt-[1px]" />
      <div className="flex flex-col gap-1 pr-6 flex-1 min-w-0">
        <span className="font-bold text-on-risk-container tracking-tight text-[14px]">Something went wrong</span>
        <span className="leading-relaxed opacity-90 break-words">{errorMessage}</span>
      </div>
      {clearError && (
        <button 
          onClick={clearError}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-on-risk-container opacity-50 hover:opacity-100 hover:bg-on-risk hover:text-risk-container transition-all active:scale-95"
          title="Dismiss"
        >
          <i className="ri-close-line text-lg"></i>
        </button>
      )}
    </div>
  );
}
