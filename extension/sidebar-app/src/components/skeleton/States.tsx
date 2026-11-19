import { useState, useEffect } from "react";
import { getWebUrl } from "../../config";

export function IdleState({
  poweredBy,
  consentGiven,
  meetingDetected,
  onGrantConsent,
}: {
  poweredBy?: string;
  consentGiven?: boolean;
  meetingDetected?: boolean;
  onGrantConsent?: () => void;
}) {
  const isByok = (poweredBy || "").toLowerCase().startsWith("byok");

  if (meetingDetected && !consentGiven) {
    return (
      <div id="idle-state" className="flex flex-col items-center justify-center flex-1 h-full w-full gap-4 text-center p-6 bg-surface rounded-[32px] border border-border box-border">
        <div className="w-16 h-16 rounded-[22px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-1 transition-colors">
          <i className="ri-shield-check-line text-3xl text-primary animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-[20px] font-bold tracking-tight text-text leading-tight">Meeting Active</p>
          <p className="text-[13px] text-text-muted max-w-[220px] leading-relaxed">
            Allow MeetMaxxing to transcribe live captions and deliver real-time AI suggestions for this call.
          </p>
        </div>

        {poweredBy && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
            isByok ? "bg-amber-500/10 text-amber-500 border-amber-500/25" : "bg-primary/10 text-primary border-primary/20"
          }`}>
            <i className={isByok ? "ri-key-2-fill text-xs" : "ri-sparkling-fill text-xs"} />
            <span className="truncate max-w-[220px]">Active: {poweredBy}</span>
          </div>
        )}

        <button
          onClick={onGrantConsent}
          className="flex items-center justify-center gap-2 w-full max-w-[240px] bg-primary text-on-primary hover:brightness-110 font-bold py-3.5 px-4 rounded-full transition-all active:opacity-80 text-[13.5px] cursor-pointer shadow-md mt-2"
        >
          <i className="ri-check-line text-lg font-bold" /> Allow & Start Copilot
        </button>
      </div>
    );
  }

  return (
    <div id="idle-state" className="flex flex-col items-center justify-center flex-1 h-full w-full gap-4 text-center p-6 bg-surface rounded-[32px] border border-border box-border">
      <div className="w-16 h-16 rounded-[22px] bg-surface-container border border-border flex items-center justify-center mb-1 transition-colors hover:bg-surface-container-high">
        <i className="ri-vidicon-line text-3xl text-text-muted" />
      </div>
      <div className="space-y-1">
        <p className="text-[20px] font-bold tracking-tight text-text leading-tight">Not in a Meeting</p>
        <p className="text-[13px] text-text-muted max-w-[200px] leading-relaxed">Join a Google Meet call to activate MeetMaxxing AI Copilot</p>
      </div>

      {poweredBy && (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
          isByok ? "bg-amber-500/10 text-amber-500 border-amber-500/25" : "bg-primary/10 text-primary border-primary/20"
        }`}>
          <i className={isByok ? "ri-key-2-fill text-xs" : "ri-sparkling-fill text-xs"} />
          <span className="truncate max-w-[220px]">Active: {poweredBy}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full max-w-[240px] mt-1">
        <a href="https://meet.google.com" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 bg-primary-container border border-border hover:brightness-110 active:opacity-80 transition-all rounded-xl p-2 text-xs font-semibold text-on-primary-container no-underline cursor-pointer group">
          <span className="w-5 h-5 rounded-full bg-surface text-primary flex items-center justify-center shrink-0">1</span>
          Open Google Meet <i className="ri-external-link-line ml-auto opacity-70 group-hover:opacity-100 transition-opacity" />
        </a>
        {consentGiven ? (
          <div className="flex items-center gap-2.5 bg-success/10 border border-success/30 rounded-xl p-2 text-xs font-semibold text-success">
            <span className="w-5 h-5 rounded-full bg-success text-on-success flex items-center justify-center shrink-0 text-[10px]"><i className="ri-check-line font-bold" /></span>
            <span>Consent Granted</span>
            <i className="ri-shield-check-fill ml-auto text-success text-sm opacity-80" />
          </div>
        ) : (
          <button
            onClick={onGrantConsent}
            className="flex items-center gap-2.5 bg-surface-container border border-border hover:bg-surface-container-high rounded-xl p-2 text-xs font-semibold text-text cursor-pointer transition-all w-full text-left group"
          >
            <span className="w-5 h-5 rounded-full bg-surface-container-high text-text-muted group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center shrink-0 transition-colors">2</span>
            <span>Give Consent</span>
            <span className="ml-auto text-[10px] bg-primary text-on-primary px-2 py-0.5 rounded-full font-bold">Allow</span>
          </button>
        )}
        <div className="flex items-center gap-2.5 bg-surface-container border border-border rounded-xl p-2 text-xs font-semibold text-text">
          <span className="w-5 h-5 rounded-full bg-surface-container-high text-text-muted flex items-center justify-center shrink-0">3</span>
          Copilot auto activates
        </div>
      </div>
      <div className="w-full mt-2">
        <a href={getWebUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high text-text border border-border w-full no-underline py-2.5 px-4 rounded-full text-[13px] font-bold active:opacity-80 transition-colors">
          <i className="ri-layout-masonry-line" /> Open Dashboard
        </a>
      </div>
    </div>
  );
}

export function ExpiredState() {
  const openAuth = () => window.open(`${getWebUrl()}/extension-auth`, "_blank");

  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full w-full gap-5 text-center p-6 bg-surface rounded-[32px] border border-border box-border">
      <div className="w-20 h-20 rounded-[24px] bg-risk-container border border-border flex items-center justify-center mb-2">
        <i className="ri-error-warning-line text-4xl text-risk" />
      </div>
      <div className="space-y-1">
        <p className="text-[20px] font-bold tracking-tight text-text leading-tight">Session expired</p>
        <p className="text-[13px] text-text-muted max-w-[220px] leading-relaxed">
          Please log in again to reactivate your AI meeting copilot.
        </p>
      </div>
      <button
        onClick={openAuth}
        className="flex items-center justify-center gap-2 w-full max-w-[240px] bg-primary text-on-primary hover:brightness-110 font-bold py-3 rounded-full transition-all active:opacity-80 text-[13px]"
      >
        <i className="ri-login-box-line text-[15px]" /> Log in again
      </button>
    </div>
  );
}

export function EndedState({
  meetingId,
  meetingTitle,
  onReset,
}: {
  meetingId: string;
  meetingTitle: string;
  onReset?: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const openDashboard = () => {
    if (!meetingId || opened) return;
    setOpened(true);
    const targetUrl = `${getWebUrl()}/meetings/${meetingId}`;
    try {
      const win = typeof window !== "undefined" ? (window as any) : {};
      const extApi =
        win.chrome?.runtime?.sendMessage
          ? win.chrome
          : win.browser?.runtime?.sendMessage
            ? win.browser
            : null;
      if (extApi?.runtime?.sendMessage) {
        extApi.runtime.sendMessage({ type: "OPEN_TAB", url: targetUrl });
        return;
      }
    } catch {
      // Fallback to window.open if extension runtime messaging is unavailable
    }
    window.open(targetUrl, "_blank");
  };

  useEffect(() => {
    if (opened) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    openDashboard();
  }, [countdown, opened, meetingId]);

  return (
    <div id="ended-state" className="flex flex-col items-center justify-center flex-1 h-full w-full gap-6 p-8 text-center bg-surface rounded-[32px] border border-border box-border">
      <div className="relative w-40 h-40 flex items-center justify-center mb-4 hover:brightness-110 transition-colors">
        <div className="absolute inset-0 rounded-full border-[6px] border-success-container" />
        <div className="relative z-10 w-32 h-32 rounded-full bg-success flex items-center justify-center">
          <i className="ri-check-line text-[76px] text-on-success font-bold leading-none mt-2" />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-[32px] font-bold tracking-tighter text-text leading-none">Complete</h2>
        <p className="text-[14px] font-medium text-text-muted max-w-[260px] leading-relaxed mx-auto">
          AI has processed your transcript into a full intelligence report.<br />
          {!opened && countdown > 0 && <span className="text-primary font-bold mt-2 inline-block">Opening dashboard in {countdown}s...</span>}
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 w-full max-w-[260px] mt-4">
        <a
          href={`${getWebUrl()}/meetings/${meetingId}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpened(true)}
          className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary hover:brightness-110 font-bold py-4 px-6 rounded-full transition-all active:opacity-80 text-[14.5px] no-underline"
        >
          <i className="ri-layout-masonry-fill" /> Open Dashboard <i className="ri-arrow-right-line ml-auto opacity-70" />
        </a>
        <div className="w-full h-[1px] bg-border my-1" />
        <p id="meeting-title-hint" className="text-[12.5px] text-text-muted font-bold tracking-wide w-full truncate">
          {opened ? `Opened: ${meetingTitle}` : `Ended: ${meetingTitle}`}
        </p>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-text-muted hover:text-text font-semibold py-1.5 px-4 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Return to Idle
          </button>
        )}
      </div>
    </div>
  );
}
