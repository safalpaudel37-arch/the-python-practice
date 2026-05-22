'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Question } from '@/lib/types';
import type { WrongAttemptContext } from '@/components/Compiler';

interface Props {
  question: Question;
  wrongContext: WrongAttemptContext;
}

type HintState = 'idle' | 'loading' | 'shown' | 'error';

export default function HintButton({ question, wrongContext }: Props) {
  const [open, setOpen] = useState(false);
  const [hintState, setHintState] = useState<HintState>('idle');
  const [hintText, setHintText] = useState('');

  useEffect(() => {
    setHintState('idle');
    setHintText('');
  }, [wrongContext]);

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
          questionLanguage: question.language,
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

  const handleOpen = () => {
    setOpen(true);
    if (hintState === 'idle' || hintState === 'error') {
      fetchHint();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Sparkles className="size-3.5" />
        Hint
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-500" />
              Hint
            </DialogTitle>
          </DialogHeader>

          {hintState === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Spinner className="size-4" />
              Generating hint…
            </div>
          )}

          {hintState === 'shown' && (
            <p className="text-sm leading-relaxed">{hintText}</p>
          )}

          {hintState === 'error' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-destructive">Could not generate a hint. Try again?</p>
              <Button variant="outline" size="sm" onClick={fetchHint} className="self-start">
                Try again
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
