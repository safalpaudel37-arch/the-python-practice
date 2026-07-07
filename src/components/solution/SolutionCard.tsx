import { CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import type { Question } from '@/lib/types';
import { AUTO_CHECK_TYPES } from '@/lib/config';

interface Props {
  question: Question;
  onTryAgain: () => void;
  onNextQuestion: () => void;
  onMarkSolved: () => void;
}

export default function SolutionCard({
  question,
  onTryAgain,
  onNextQuestion,
  onMarkSolved,
}: Props) {
  const isCodeAnswer = !AUTO_CHECK_TYPES.has(question.type);

  return (
    <div className="px-4 py-3.5 animate-[pp-slideup_.3s_ease_both]">
      <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-copper">
        Solution
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Answer code card */}
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-code-bg p-4 font-mono text-xs leading-relaxed text-[#c3e88d]">
          {question.answer}
          {question.alternative_answer && (
            <>
              {'\n\n'}
              <span className="text-white/40"># Alternative solution:</span>
              {'\n'}
              {question.alternative_answer}
            </>
          )}
        </pre>

        {/* Explanation + actions */}
        <div className="flex flex-col">
          {question.explanation && (
            <p className="flex-1 text-[13.5px] leading-relaxed text-ink-2">
              {question.explanation}
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={onTryAgain}
              className="flex items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-line-2 px-2 py-2 text-[13px] font-semibold text-ink-2 hover:border-blue hover:text-blue"
            >
              <RotateCcw className="size-3.5" />
              Try again
            </button>
            {isCodeAnswer ? (
              <button
                onClick={onMarkSolved}
                className="flex items-center justify-center gap-1.5 rounded-[9px] bg-green px-2 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                <CheckCircle2 className="size-3.5" />
                Mark solved
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={onNextQuestion}
              className="flex items-center justify-center gap-1.5 rounded-[9px] bg-blue px-2 py-2 text-[13px] font-semibold text-on-blue hover:bg-blue-600"
            >
              Next
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
