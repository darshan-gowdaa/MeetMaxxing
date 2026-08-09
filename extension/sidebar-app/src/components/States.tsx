import { useState, useEffect } from "react";
import { getWebUrl } from "../config";

export function IdleState() {
  return (
    <div id="idle-state" className="flex flex-col items-center justify-center flex-1 h-full w-full gap-5 text-center p-6 bg-zinc-900/60 rounded-[32px] border border-zinc-800/80 backdrop-blur-2xl shadow-xl box-border">
      <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-2 shadow-2xl transition-transform hover:scale-105">
        <i className="ri-vidicon-line text-4xl text-zinc-400"></i>
      </div>
      <div className="space-y-1">
        <p className="text-[22px] font-black tracking-tight text-white leading-tight">Not in a Meeting</p>
        <p className="text-[13px] text-zinc-400 max-w-[200px] leading-relaxed">Join a Google Meet call to activate MeetMaxxing AI Copilot</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[240px] mt-1">
        <a href="https://meet.google.com" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors rounded-xl p-2 text-xs font-semibold text-blue-400 no-underline cursor-pointer group">
          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">1</span>
          Open Google Meet <i className="ri-external-link-line ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </a>
        <div className="flex items-center gap-2.5 bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-2 text-xs font-semibold text-zinc-300">
          <span className="w-5 h-5 rounded-full bg-zinc-700/50 text-zinc-400 flex items-center justify-center shrink-0">2</span>
          Give Consent
        </div>
        <div className="flex items-center gap-2.5 bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-2 text-xs font-semibold text-zinc-300">
          <span className="w-5 h-5 rounded-full bg-zinc-700/50 text-zinc-400 flex items-center justify-center shrink-0">3</span>
          Copilot auto activates
        </div>
      </div>
      <div className="w-full mt-3">
        <a href={getWebUrl()} target="_blank" rel="noreferrer" className="md3-btn md3-btn-secondary w-full no-underline !py-3 !px-4 !text-[13px] active:scale-[0.97]">
          <i className="ri-layout-masonry-line"></i> Open Dashboard
        </a>
      </div>
    </div>
  );
}

export function EndedState({ meetingId, meetingTitle }: { meetingId: string, meetingTitle: string }) {
  const [opened, setOpened] = useState(false);

  const openDashboard = () => {
    if (!meetingId || opened) return;
    setOpened(true);
    window.open(`${getWebUrl()}/meetings/${meetingId}`, "_blank");
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openDashboard();
  };

  return (
    <div id="ended-state" className="flex flex-col items-center justify-center flex-1 h-full w-full gap-6 p-8 text-center bg-zinc-900/60 rounded-[40px] border border-zinc-800/80 backdrop-blur-2xl shadow-2xl box-border">
      <style>
        {`
          @keyframes m3-pop-in {
            0% { transform: scale(0.4); opacity: 0; }
            50% { transform: scale(1.15); opacity: 1; }
            75% { transform: scale(0.95); }
            100% { transform: scale(1); }
          }
        `}
      </style>
      
      {/* Huge Google Pay style success tick */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-4 transition-transform hover:scale-[1.03]" style={{ animation: 'm3-pop-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
        <div className="absolute inset-0 rounded-full border-[6px] border-emerald-500/10"></div>
        <div className="relative z-10 w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_16px_48px_-12px_rgba(16,185,129,0.8)]">
          <i className="ri-check-line text-[76px] text-white font-black leading-none mt-2"></i>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-[32px] font-black tracking-tighter text-white leading-none">Complete</h2>
        <p className="text-[14px] font-medium text-zinc-400 max-w-[260px] leading-relaxed mx-auto">AI has processed your transcript into a full intelligence report.</p>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-[260px] mt-4">
        <a
          href={`${getWebUrl()}/meetings/${meetingId}`}
          target="_blank"
          rel="noreferrer"
          onClick={handleOpenClick}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-full transition-all active:scale-[0.96] shadow-xl shadow-blue-900/30 text-[14.5px] no-underline"
        >
          <i className="ri-layout-masonry-fill"></i> Open Dashboard <i className="ri-arrow-right-line ml-auto opacity-70"></i>
        </a>
        <div className="w-full h-[1px] bg-zinc-800/50 my-1"></div>
        <p id="meeting-title-hint" className="text-[12.5px] text-zinc-500 font-bold tracking-wide w-full truncate">
          {opened ? `Opened: ${meetingTitle}` : `Ended: ${meetingTitle}`}
        </p>
      </div>
    </div>
  );
}
