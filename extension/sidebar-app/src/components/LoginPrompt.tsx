import { RiSparkling2Fill, RiArrowRightSLine, RiGoogleFill, RiMailLine } from "@remixicon/react";
import { getWebUrl } from "../config";

export function LoginPrompt() {
  const webUrl = getWebUrl();
  
  // open extension-auth so user can sign in and connect in one step
  const openAuth = (path = "/extension-auth") =>
    window.open(`${webUrl}${path}`, "_blank");

  return (
    <div className="mm-state-container bg-[#1a1c20] text-white h-full flex flex-col justify-center items-center px-5 text-center">
      {/* glow orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#4a9eff]/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#8eaaff]/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full">
        {/* logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <RiSparkling2Fill className="w-6 h-6 text-[#4a9eff]" />
          <span className="font-black text-xl bg-gradient-to-r from-white to-[#4a9eff] bg-clip-text text-transparent">
            MeetMaxxing
          </span>
        </div>

        <h2 className="text-lg font-bold mb-1">Welcome</h2>
        <p className="text-xs text-white/50 mb-6 leading-relaxed">
          Sign in to activate your AI meeting copilot.
          A new tab will open — close it once connected.
        </p>

        <div className="w-full space-y-2.5">
          {/* Google sign-in */}
          <button
            onClick={() => openAuth("/extension-auth")}
            className="w-full py-2.5 px-4 bg-white text-black font-semibold rounded-xl flex items-center justify-between transition-colors hover:bg-white/90 active:scale-95 shadow-lg shadow-black/20"
          >
            <div className="flex items-center gap-2">
              <RiGoogleFill className="w-4 h-4 text-[#ea4335]" />
              <span className="text-sm">Continue with Google</span>
            </div>
            <RiArrowRightSLine className="w-4 h-4 opacity-40" />
          </button>

          {/* Email sign-in */}
          <button
            onClick={() => openAuth("/login?next=/extension-auth")}
            className="w-full py-2.5 px-4 bg-white/[0.06] border border-white/[0.1] text-white font-semibold rounded-xl flex items-center justify-between transition-colors hover:bg-white/[0.1] active:scale-95"
          >
            <div className="flex items-center gap-2">
              <RiMailLine className="w-4 h-4 text-white/60" />
              <span className="text-sm">Sign in with Email</span>
            </div>
            <RiArrowRightSLine className="w-4 h-4 opacity-40" />
          </button>
        </div>

        <p className="text-[10px] text-white/30 mt-5">
          New? Sign up is on the login page.
        </p>
      </div>
    </div>
  );
}
