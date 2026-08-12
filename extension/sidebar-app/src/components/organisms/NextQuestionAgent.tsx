import { QuestionCard } from "../molecules/QuestionCard";
import { Skeleton } from "../atoms/Skeleton";

interface NextQuestionAgentProps {
  nextQuestions: string[];
  isProcessing?: boolean;
  onSendToIntelliAgent?: (q: string) => void;
}

export function NextQuestionAgent({ nextQuestions, isProcessing, onSendToIntelliAgent }: NextQuestionAgentProps) {
  return (
    <div className="bg-secondary-container border-border rounded-[24px] border p-3 min-h-[100px] flex flex-col">
      <div className="flex items-center gap-2 mb-1 shrink-0 h-[24px]">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-on-secondary-container flex items-center gap-2">
          <i className="ri-question-answer-fill text-sm" /> What to Ask
        </h3>
      </div>
      <div className="mt-1 flex-1 flex flex-col gap-2 justify-center">
        {isProcessing ? (
          <div className="relative cursor-not-allowed">
            <div className="absolute inset-0 z-10"></div>
            <Skeleton lines={2} />
          </div>
        ) : nextQuestions?.length > 0 ? (
          nextQuestions.map((q, idx) => (
            <QuestionCard key={idx} question={q} onSendToChat={onSendToIntelliAgent} />
          ))
        ) : (
          <div className="text-xs text-text-variant italic text-center py-3 px-4 bg-surface-container rounded-[20px] border border-border w-full">
            Click &ldquo;Generate AI Insights&rdquo; to formulate questions.
          </div>
        )}
      </div>
    </div>
  );
}
