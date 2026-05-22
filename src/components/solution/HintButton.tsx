'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import type { Question } from '@/lib/types';
import type { WrongAttemptContext } from '@/components/Compiler';

interface Props {
  question: Question;
  wrongContext: WrongAttemptContext;
}

type HintState = 'idle' | 'loading' | 'shown' | 'error';

export default function HintButton({ question, wrongContext }: Props) {
  const [hintState, setHintState] = useState<HintState>('idle');
  const [hintText, setHintText] = useState('');

  const fetchHint = async () => {
    setHintState('loading');
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          questionText: question.question,
          questionType: question.type,
          correctAnswer: question.answer,
          userCode: wrongContext.userCode,
          userAnswer: wrongContext.userAnswer,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (!res.ok || !data.hint) throw new Error(data.error ?? 'No hint');
      setHintText(data.hint);
      setHintState('shown');
    } catch {
      setHintState('error');
    }
  };

  if (hintState === 'loading') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        <Spinner className="size-3" />
        Generating hint…
      </div>
    );
  }

  if (hintState === 'shown') {
    return (
      <Alert className="py-2 border-blue-500/30 bg-blue-500/8 relative pr-8">
        <Sparkles className="size-3.5 text-blue-500" />
        <AlertDescription className="text-xs text-foreground/80 leading-relaxed">
          {hintText}
        </AlertDescription>
        <button
          onClick={() => setHintState('idle')}
          aria-label="Dismiss hint"
          className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3" />
        </button>
      </Alert>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="xs"
        onClick={fetchHint}
        className="text-muted-foreground hover:text-foreground gap-1"
      >
        <Sparkles className="size-3" />
        Get a hint
      </Button>
      {hintState === 'error' && (
        <span className="text-xs text-destructive">Could not load hint. Try again.</span>
      )}
    </div>
  );
}
