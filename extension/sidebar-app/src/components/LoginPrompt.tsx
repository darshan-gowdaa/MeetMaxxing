import { RiChromeFill, RiArrowRightSLine } from "@remixicon/react";


export function LoginPrompt() {
  const handleOpenAuth = () => {
    const webUrl = (window as any).MEETMAXXING_CONFIG?.BASE_URL_WEB || "https://meetmaxxing.vercel.app";
    window.open(`${webUrl}/extension-auth`, "_blank");
  };

  return (
    <div className="mm-state-container bg-[#1a1c20] text-white h-full flex flex-col justify-center items-center px-6 text-center">
      <div className="w-16 h-16 bg-[#4a9eff]/10 rounded-full flex items-center justify-center mb-6">
        <RiChromeFill className="w-8 h-8 text-[#4a9eff]" />
      </div>
      
      <h2 className="text-xl font-bold mb-2">Welcome to MeetMaxxing</h2>
      <p className="text-sm text-white/60 mb-8">
        Please connect your account to start using the AI meeting copilot.
      </p>

      <div className="w-full space-y-4">
        <button
          onClick={handleOpenAuth}
          className="w-full py-3 px-4 bg-[#4a9eff] hover:bg-[#3a7bd5] text-white font-semibold rounded-xl flex items-center justify-between transition-colors shadow-lg shadow-[#4a9eff]/20"
        >
          <span>Connect Account</span>
          <RiArrowRightSLine className="w-5 h-5" />
        </button>
        <p className="text-xs text-white/40 mt-4 text-center">
          A new tab will open. Close it after connecting.
        </p>
      </div>
    </div>
  );
}
