import { useState, useEffect } from "react";

const openedMeetingIds = new Set<string>();

export function IdleState() {
  return (
    <div id="idle-state" className="state-container items-center justify-center h-full w-full p-2">
      <div className="flex flex-col items-center justify-center w-full max-w-sm gap-4 text-center p-5 bg-zinc-900/40 rounded-[24px] border border-zinc-800/50 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-1 shadow-2xl">
          <i className="ri-vidicon-line text-3xl text-zinc-400"></i>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-extrabold tracking-tight text-white">Not in a Meeting</p>
          <p className="text-[12px] text-zinc-400 max-w-[200px] leading-relaxed">Join a Google Meet call to activate MeetMaxxing AI Copilot</p>
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
        <div className="w-full mt-2">
          <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="md3-btn md3-btn-secondary w-full no-underline !py-2 !px-4 !text-xs">
            <i className="ri-layout-masonry-line"></i> Open Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export function EndedState({ meetingId, meetingTitle }: { meetingId: string, meetingTitle: string }) {
  const [countdown, setCountdown] = useState(5);

  const openDashboard = () => {
    if (!meetingId || openedMeetingIds.has(meetingId)) return;
    openedMeetingIds.add(meetingId);
    window.open(`http://localhost:3000/meetings/${meetingId}`, "_blank");
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openDashboard();
  };

  useEffect(() => {
    if (openedMeetingIds.has(meetingId)) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      openDashboard();
    }
  }, [countdown, meetingId]);

  return (
    <div id="ended-state" className="state-container items-center justify-center h-full w-full p-2">
      <div className="flex flex-col items-center justify-center w-full max-w-sm gap-4 p-5 text-center bg-zinc-900/40 rounded-[24px] border border-zinc-800/50 backdrop-blur-xl">
        <div className="relative w-16 h-16 flex items-center justify-center mb-1">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-2 rounded-full border border-emerald-500/20"></div>
          <div className="relative z-10 w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <i className="ri-checkbox-circle-fill text-2xl text-emerald-400"></i>
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight text-white">Meeting Complete</h2>
          <p className="text-[12px] text-zinc-400 max-w-[240px] leading-relaxed">AI has processed your transcript and generated a full intelligence report.</p>
        </div>
        <div className="flex flex-col items-center gap-2.5 w-full mt-2">
          <a
            href={`http://localhost:3000/meetings/${meetingId}`}
            target="_blank"
            rel="noreferrer"
            onClick={handleOpenClick}
            className="md3-btn md3-btn-primary w-full no-underline !bg-blue-600 !text-white !border-blue-500 hover:!bg-blue-500 !py-2 !px-4 !text-xs"
          >
            <i className="ri-layout-masonry-fill"></i> Open Dashboard <i className="ri-arrow-right-line ml-auto opacity-70"></i>
          </a>
          <p id="meeting-title-hint" className="text-[11px] text-zinc-500 italic max-w-[200px] leading-tight">
            {countdown > 0 && !openedMeetingIds.has(meetingId) ? `Auto-opening report in ${countdown}s...` : `Report opened for: ${meetingTitle}`}
          </p>
        </div>
      </div>
    </div>
  );
}
