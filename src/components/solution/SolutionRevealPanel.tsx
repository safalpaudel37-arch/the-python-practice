'use client';

import { useState, useEffect } from 'react';
import { MAX_ATTEMPTS } from '@/lib/config';
import type { Question, QuestionStatus } from '@/lib/types';
import AttemptsCounter from './AttemptsCounter';
import RevealPrompt from './RevealPrompt';
import SolutionCard from './SolutionCard';

type Stage = 'hidden' | 'unlocked' | 'revealed';

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

  const stage: Stage =
    revealed
      ? 'revealed'
      : attemptCount >= MAX_ATTEMPTS
        ? 'unlocked'
        : 'hidden';

  return (
    <div
      className="border-t border-border bg-background transition-all duration-300 overflow-hidden"
      style={{ maxHeight: stage === 'hidden' && attemptCount === 0 ? '0' : undefined }}
    >
      {stage === 'hidden' && attemptCount > 0 && (
        <AttemptsCounter attemptCount={attemptCount} />
      )}
      {stage === 'unlocked' && (
        <RevealPrompt onReveal={() => setRevealed(true)} />
      )}
      {stage === 'revealed' && (
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
