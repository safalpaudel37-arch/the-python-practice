'use client';

import { useState, useEffect } from 'react';
import { MAX_ATTEMPTS } from '@/lib/config';
import type { Question, QuestionStatus } from '@/lib/types';
import AttemptsCounter from './AttemptsCounter';
import RevealPrompt from './RevealPrompt';
import SolutionCard from './SolutionCard';

interface Props {
  question: Question | null;
  attemptCount: number;
  questionStatus: QuestionStatus;
  onTryAgain: () => void;
  onNextQuestion: () => void;
  onMarkSolved: () => void;
}

export default function SolutionRevealPanel({
  question,
  attemptCount,
  questionStatus,
  onTryAgain,
  onNextQuestion,
  onMarkSolved,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  // Reset revealed state when question changes
  useEffect(() => {
    setRevealed(false);
  }, [question?.id]);

  if (!question || questionStatus === 'solved') return null;

  const unlocked = !revealed && attemptCount >= MAX_ATTEMPTS;

  // Hidden until the user has at least one attempt, or unlocked after max attempts
  if (!revealed && !unlocked && attemptCount === 0) return null;

  return (
    <div className="overflow-hidden border-t border-copper/25 bg-copper-050 transition-all duration-300">
      {!revealed && !unlocked && attemptCount > 0 && (
        <AttemptsCounter attemptCount={attemptCount} />
      )}
      {unlocked && <RevealPrompt onReveal={() => setRevealed(true)} />}
      {revealed && (
        <SolutionCard
          question={question}
          onTryAgain={() => { setRevealed(false); onTryAgain(); }}
          onNextQuestion={onNextQuestion}
          onMarkSolved={onMarkSolved}
        />
      )}
    </div>
  );
}
