'use client';

import { useState, useEffect } from 'react';
import { Lock, Sparkles, X } from 'lucide-react';
import type { Question } from '@/lib/types';
import type { WrongAttemptContext } from '@/components/Compiler';

interface Props {
  question?: Question;
  /** Undefined until the user has a wrong attempt — the hint stays locked. */
  wrongContext?: WrongAttemptContext;
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

  const locked = !question || !wrongContext;

  const fetchHint = async () => {
    if (!question || !wrongContext) return;
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
    if (locked) return;
    setOpen(true);
    if (hintState === 'idle' || hintState === 'error') {
      fetchHint();
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={locked}
        title={locked ? 'Submit an attempt first to unlock a hint' : 'Get an AI hint'}
        className={
          locked
            ? 'flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[9px] border border-line bg-surface-2 px-3 text-[13px] font-semibold text-ink-3'
            : 'flex h-8 items-center gap-1.5 rounded-[9px] border border-copper/35 bg-copper-050 px-3 text-[13px] font-semibold text-copper hover:bg-copper-100'
        }
      >
        <Sparkles className="size-3.5" />
        Hint
        {locked && <Lock className="size-3" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(20,16,10,.4)] backdrop-blur-[3px] animate-[pp-fadein_.2s_ease_both]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Hint"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] overflow-hidden rounded-[18px] border border-copper/35 bg-surface shadow-[var(--shadow-lg)] animate-[pp-pop_.3s_ease_both]"
          >
            <div className="flex items-center justify-between bg-copper-050 px-5 py-3.5">
              <span className="flex items-center gap-2 font-heading text-[15px] font-bold text-copper">
                <Sparkles className="size-4" />
                Hint
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close hint"
                className="grid size-7 place-items-center rounded-lg text-ink-2 hover:bg-copper-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5">
              {hintState === 'loading' && (
                <div className="space-y-2.5">
                  <div className="pp-skeleton h-[11px] w-full rounded" />
                  <div className="pp-skeleton h-[11px] w-[85%] rounded" />
                  <div className="pp-skeleton h-[11px] w-[60%] rounded" />
                  <p className="pt-1 font-mono text-[11px] text-copper">generating hint…</p>
                </div>
              )}

              {hintState === 'shown' && (
                <p className="text-sm leading-relaxed animate-[pp-fadein_.3s_ease_both]">
                  {hintText}
                </p>
              )}

              {hintState === 'error' && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-red">Could not generate a hint. Try again?</p>
                  <button
                    onClick={fetchHint}
                    className="self-start rounded-[9px] border-[1.5px] border-line-2 px-3 py-1.5 text-[13px] font-semibold text-ink-2 hover:border-copper hover:text-copper"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
