import { RiAlertLine as ShieldAlert } from "@remixicon/react";

export function Header({ meetingId, isEnded, elapsedTime, triggerAction }: any) {
  return (
    <header className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/80 backdrop-blur-3xl border-b border-zinc-800/80 shrink-0 shadow-sm z-10 w-full box-border">
      <div className="flex items-center gap-2 shrink truncate">
        <div className="flex items-center gap-1.5 font-black text-[15px] tracking-tight bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent truncate">
          <span className="text-blue-500 flex items-center justify-center text-lg shrink-0"><i className="ri-sparkling-2-fill"></i></span>
          <span>MeetMaxxing</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div id="status-badge" className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-extrabold tracking-[0.1em] uppercase transition-colors shrink-0 ${meetingId && !isEnded ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/60'}`}>
          <span className={`w-2 h-2 rounded-full ${meetingId && !isEnded ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`}></span>
          <span>{meetingId && !isEnded ? 'Live' : 'Idle'}</span>
        </div>
        <div id="timer" className="text-xs font-mono font-bold tracking-wide text-zinc-200 bg-zinc-800/60 px-2 py-1 rounded-full border border-zinc-700/50 shadow-inner shrink-0">{elapsedTime}</div>
        {meetingId && !isEnded && (
          <button
            className="inline-flex items-center justify-center gap-2 px-2.5 py-1 text-[11px] font-bold rounded-full cursor-pointer transition-colors whitespace-nowrap bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 shrink-0"
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
