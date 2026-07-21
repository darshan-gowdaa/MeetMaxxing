import { RiAlertLine as ShieldAlert } from "@remixicon/react";

export function Header({ meetingId, isEnded, elapsedTime, triggerAction }: any) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon"><i className="ri-sparkling-2-fill"></i></span>
          <span>MeetMaxxing</span>
        </div>
      </div>
      <div className="header-right">
        <div id="status-badge" className={`badge ${meetingId && !isEnded ? 'badge-live' : 'badge-idle'}`}>
          <span className="badge-dot"></span>
          <span className="badge-label">{meetingId && !isEnded ? 'Live' : 'Idle'}</span>
        </div>
        <div id="timer" className="timer">{elapsedTime}</div>
        {meetingId && !isEnded && (
          <button
            className="md3-btn md3-btn-danger !px-2.5 !py-1 !text-[11px] !rounded-full !font-bold shrink-0"
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
    <footer className="p-4 border-t border-zinc-800/50 bg-zinc-900/60 backdrop-blur-2xl flex justify-center shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
      <a 
        href="http://localhost:3000" 
        target="_blank" 
        rel="noreferrer" 
        className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 text-[13px] font-bold tracking-wide transition-all hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 no-underline group"
      >
        <i className="ri-layout-masonry-fill text-lg group-hover:scale-110 transition-transform"></i> 
        <span>Open Intelligence Dashboard</span>
        <i className="ri-arrow-right-up-line ml-auto opacity-50 group-hover:opacity-100 transition-opacity"></i>
      </a>
    </footer>
  );
}

export function ErrorBanner({ errorMessage, poweredBy }: any) {
  if (!errorMessage) return null;
  return (
    <div className="p-4 rounded-3xl bg-red-950/40 border border-red-500/20 flex items-start gap-3 text-xs text-red-200 shadow-lg animate-fade-in mb-3">
      <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        <span className="font-bold text-red-300 tracking-wide">AI Service Error ({poweredBy})</span>
        <span className="leading-relaxed opacity-90 break-words">{errorMessage}</span>
      </div>
    </div>
  );
}
