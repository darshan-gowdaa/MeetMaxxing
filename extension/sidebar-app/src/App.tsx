import { useState } from "react";
import { useCopilot } from "./hooks/useCopilot";
import { Header, Footer, ErrorBanner } from "./components/Layout";
import { IdleState, EndedState } from "./components/States";
import { LiveTranscript, SuggestionAgent, NextQuestionAgent, RecapAgent } from "./components/Agents";
import { ContextAgent } from "./components/ContextAgent";
import "./sidepanel.css";

export default function App() {
  const {
    meetingId, meetingTitle, isEnded, transcriptLines, suggestions,
    nextQuestion, recap, errorMessage, isProcessing, poweredBy,
    elapsedTime, triggerAction
  } = useCopilot();

  const [activeTab, setActiveTab] = useState<"live" | "transcript" | "rag">("live");

  const handleGenerateInsights = () => {
    triggerAction("GENERATE_INSIGHTS");
  };

  return (
    <>
      <Header meetingId={meetingId} isEnded={isEnded} elapsedTime={elapsedTime} triggerAction={triggerAction} />
      
      {!meetingId ? (
        <main>
          <IdleState />
        </main>
      ) : isEnded ? (
        <main>
          <EndedState meetingId={meetingId} meetingTitle={meetingTitle} />
        </main>
      ) : (
        <main>
          <div id="active-state" className="state-container">
            
            <div className="flex bg-zinc-900/80 p-1 rounded-[14px] border border-zinc-800/60 shrink-0 sticky top-0 z-10 backdrop-blur-md mb-2">
              <button onClick={() => setActiveTab("live")} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[10px] transition-colors ${activeTab === "live" ? "bg-blue-600/80 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
                <i className="ri-sparkling-fill mr-1"></i>Copilot
              </button>
              <button onClick={() => setActiveTab("transcript")} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[10px] transition-colors ${activeTab === "transcript" ? "bg-indigo-600/80 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
                <i className="ri-chat-voice-fill mr-1"></i>Transcript
              </button>
              <button onClick={() => setActiveTab("rag")} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[10px] transition-colors ${activeTab === "rag" ? "bg-cyan-600/80 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
                <i className="ri-folder-open-fill mr-1"></i>Docs QA
              </button>
            </div>

            <ErrorBanner errorMessage={errorMessage} poweredBy={poweredBy} isProcessing={isProcessing} triggerAction={triggerAction} />

            {activeTab === "live" && (
              <>
                <button 
                  onClick={handleGenerateInsights} 
                  disabled={isProcessing} 
                  className="md3-btn md3-btn-primary w-full !bg-blue-600/90 !text-white !py-2.5 hover:!bg-blue-500 !mt-1 !mb-1 !rounded-[16px]"
                >
                  {isProcessing ? <div className="md3-loader !bg-white"></div> : <><i className="ri-sparkling-fill text-[15px]"></i> Generate AI Insights</>}
                </button>
                
                <SuggestionAgent suggestions={suggestions} isProcessing={isProcessing} />
                <NextQuestionAgent nextQuestion={nextQuestion} isProcessing={isProcessing} />
                <RecapAgent recap={recap} isProcessing={isProcessing} />
              </>
            )}

            {activeTab === "transcript" && (
              <LiveTranscript transcriptLines={transcriptLines} />
            )}

            {activeTab === "rag" && (
              <ContextAgent meetingId={meetingId} suggestedQuestion={nextQuestion} />
            )}

          </div>
        </main>
      )}

      <Footer meetingId={meetingId} isEnded={isEnded} />
    </>
  );
}