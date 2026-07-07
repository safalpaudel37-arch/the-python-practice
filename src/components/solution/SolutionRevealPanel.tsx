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

  if (stage === 'hidden' && attemptCount === 0) return null;

  return (
    <div className="overflow-hidden border-t border-copper/25 bg-copper-050 transition-all duration-300">
      {stage === 'hidden' && attemptCount > 0 && <AttemptsCounter attemptCount={attemptCount} />}
      {stage === 'unlocked' && <RevealPrompt onReveal={() => setRevealed(true)} />}
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
