import { useCopilot } from "./hooks/useCopilot";
import { Header, Footer, ErrorBanner } from "./components/Layout";
import { IdleState, EndedState } from "./components/States";
import { LiveTranscript, SuggestionAgent, NextQuestionAgent, RecapAgent } from "./components/Agents";
import "./sidepanel.css";

export default function App() {
  const {
    meetingId, meetingTitle, isEnded, transcriptLines, suggestions,
    nextQuestion, recap, errorMessage, isProcessing, poweredBy,
    elapsedTime, triggerAction
  } = useCopilot();

  const handleGenerateInsights = () => {
    triggerAction("ASK_SUGGESTIONS");
    triggerAction("ASK_NEXT_QUESTION");
    triggerAction("REQUEST_RECAP");
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
            <LiveTranscript transcriptLines={transcriptLines} />
            
            <button 
              onClick={handleGenerateInsights} 
              disabled={isProcessing} 
              className="md3-btn md3-btn-primary w-full !bg-blue-600/90 !text-white !py-3 hover:!bg-blue-500 !mt-2 !mb-2"
            >
              {isProcessing ? <div className="md3-loader !bg-white"></div> : <><i className="ri-sparkling-fill text-lg"></i> Generate AI Insights</>}
            </button>
            
            <ErrorBanner errorMessage={errorMessage} poweredBy={poweredBy} isProcessing={isProcessing} triggerAction={triggerAction} />
            
            <SuggestionAgent suggestions={suggestions} isProcessing={isProcessing} />
            <NextQuestionAgent nextQuestion={nextQuestion} isProcessing={isProcessing} />
            <RecapAgent recap={recap} isProcessing={isProcessing} />
          </div>
        </main>
      )}

      <Footer meetingId={meetingId} isEnded={isEnded} />
    </>
  );
}