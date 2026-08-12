import { useState, useEffect } from "react";
import { getWebUrl } from "../config";

export function IdleState() {
  return (
    <div id="idle-state" className="flex flex-col items-center justify-center flex-1 h-full w-full gap-5 text-center p-6 bg-surface rounded-[32px] border border-border box-border">
      <div className="w-20 h-20 rounded-[24px] bg-surface-container border border-border flex items-center justify-center mb-2 transition-colors hover:bg-surface-container-high">
        <i className="ri-vidicon-line text-4xl text-text-muted"></i>
      </div>
      <div className="space-y-1">
        <p className="text-[22px] font-bold tracking-tight text-text leading-tight">Not in a Meeting</p>
        <p className="text-[13px] text-text-muted max-w-[200px] leading-relaxed">Join a Google Meet call to activate MeetMaxxing AI Copilot</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[240px] mt-1">
        <a href="https://meet.google.com" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 bg-primary-container border border-border hover:brightness-110 active:opacity-80 transition-all rounded-xl p-2 text-xs font-semibold text-on-primary-container no-underline cursor-pointer group">
          <span className="w-5 h-5 rounded-full bg-surface text-primary flex items-center justify-center shrink-0">1</span>
          Open Google Meet <i className="ri-external-link-line ml-auto opacity-70 group-hover:opacity-100 transition-opacity"></i>
        </a>
        <div className="flex items-center gap-2.5 bg-surface-container border border-border rounded-xl p-2 text-xs font-semibold text-text">
          <span className="w-5 h-5 rounded-full bg-surface-container-high text-text-muted flex items-center justify-center shrink-0">2</span>
          Give Consent
        </div>
        <div className="flex items-center gap-2.5 bg-surface-container border border-border rounded-xl p-2 text-xs font-semibold text-text">
          <span className="w-5 h-5 rounded-full bg-surface-container-high text-text-muted flex items-center justify-center shrink-0">3</span>
          Copilot auto activates
        </div>
      </div>
      <div className="w-full mt-3">
        <a href={getWebUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high text-text border border-border w-full no-underline py-3 px-4 rounded-full text-[13px] font-bold active:opacity-80 transition-colors">
          <i className="ri-layout-masonry-line"></i> Open Dashboard
        </a>
      </div>
    </div>
  );
}

export function EndedState({ meetingId, meetingTitle }: { meetingId: string, meetingTitle: string }) {
  const [opened, setOpened] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const openDashboard = () => {
    if (!meetingId || opened) return;
    setOpened(true);
    window.open(`${getWebUrl()}/meetings/${meetingId}`, "_blank");
  };

  useEffect(() => {
    if (opened) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      openDashboard();
    }
  }, [countdown, opened, meetingId]);

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openDashboard();
  };

  return (
    <div id="ended-state" className="flex flex-col items-center justify-center flex-1 h-full w-full gap-6 p-8 text-center bg-surface rounded-[32px] border border-border box-border">
      {/* Huge Google Pay style success tick */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-4 transition-colors hover:brightness-110">
        <div className="absolute inset-0 rounded-full border-[6px] border-success-container"></div>
        <div className="relative z-10 w-32 h-32 rounded-full bg-success flex items-center justify-center">
          <i className="ri-check-line text-[76px] text-on-success font-bold leading-none mt-2"></i>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-[32px] font-bold tracking-tighter text-text leading-none">Complete</h2>
        <p className="text-[14px] font-medium text-text-muted max-w-[260px] leading-relaxed mx-auto">
          AI has processed your transcript into a full intelligence report.
          <br/>
          {!opened && countdown > 0 && <span className="text-primary font-bold mt-2 inline-block">Opening dashboard in {countdown}s...</span>}
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-[260px] mt-4">
        <a
          href={`${getWebUrl()}/meetings/${meetingId}`}
          target="_blank"
          rel="noreferrer"
          onClick={handleOpenClick}
          className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary hover:brightness-110 font-bold py-4 px-6 rounded-full transition-all active:opacity-80 text-[14.5px] no-underline"
        >
          <i className="ri-layout-masonry-fill"></i> Open Dashboard <i className="ri-arrow-right-line ml-auto opacity-70"></i>
        </a>
        <div className="w-full h-[1px] bg-border my-1"></div>
        <p id="meeting-title-hint" className="text-[12.5px] text-text-muted font-bold tracking-wide w-full truncate">
          {opened ? `Opened: ${meetingTitle}` : `Ended: ${meetingTitle}`}
        </p>
      </div>
    </div>
  );
}
