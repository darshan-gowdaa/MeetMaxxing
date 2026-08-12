import { RiSparkling2Fill, RiArrowRightSLine, RiGoogleFill, RiMailLine } from "@remixicon/react";
import { getWebUrl } from "../../config";

export function LoginPrompt() {
  const webUrl = getWebUrl();
  const openAuth = (path = "/extension-auth") => window.open(`${webUrl}${path}`, "_blank");

  return (
    <div className="flex flex-col justify-center items-center h-full w-full px-5 text-center bg-surface text-text rounded-[32px] border border-border">
      <div className="relative z-10 w-full max-w-[260px] mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <RiSparkling2Fill className="w-6 h-6 text-primary" />
          <span className="font-bold text-xl text-primary">MeetMaxxing</span>
        </div>
        <h2 className="text-lg font-bold mb-1 text-text">Welcome</h2>
        <p className="text-xs text-text-muted mb-6 leading-relaxed">
          Sign in to activate your AI meeting copilot.
          The extension connects automatically — no copy-paste needed.
        </p>
        <div className="w-full space-y-2.5">
          <button
            onClick={() => openAuth("/extension-auth")}
            className="w-full py-2.5 px-4 bg-primary text-on-primary font-semibold rounded-full flex items-center justify-between transition-opacity hover:brightness-110 active:opacity-80"
          >
            <div className="flex items-center gap-2">
              <RiGoogleFill className="w-4 h-4 text-on-primary" />
              <span className="text-sm">Continue with Google</span>
            </div>
            <RiArrowRightSLine className="w-4 h-4 opacity-70" />
          </button>
          <button
            onClick={() => openAuth("/login?next=/extension-auth")}
            className="w-full py-2.5 px-4 bg-surface-container text-text font-semibold rounded-full flex items-center justify-between border border-border transition-colors hover:bg-surface-container-high active:opacity-80"
          >
            <div className="flex items-center gap-2">
              <RiMailLine className="w-4 h-4 text-text-muted" />
              <span className="text-sm">Sign in with Email</span>
            </div>
            <RiArrowRightSLine className="w-4 h-4 text-text-muted opacity-70" />
          </button>
        </div>
        <p className="text-[10px] text-text-variant mt-5">New? Sign up is on the login page.</p>
      </div>
    </div>
  );
}
