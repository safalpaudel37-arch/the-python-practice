'use client';

import { Play, SendHorizonal } from 'lucide-react';
import HintButton from '@/components/solution/HintButton';
import type { Question } from '@/lib/types';
import type { WrongAttemptContext } from '@/components/Compiler';

type Status = 'idle' | 'loading' | 'running' | 'error';

interface HintProps {
  question: Question;
  wrongContext: WrongAttemptContext;
}

interface Props {
  status: Status;
  bridgeReady: boolean;
  onRun: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  hideRun?: boolean;
  hintProps?: HintProps;
  language?: 'python' | 'javascript' | 'sql';
  question?: Question | null;
}

export default function CompilerToolbar({
  status,
  bridgeReady,
  onRun,
  onSubmit,
  canSubmit,
  hideRun = false,
  hintProps,
  language = 'python',
  question,
}: Props) {
  const isRunning = status === 'running';
  const isLoading = status === 'loading' || !bridgeReady;
  const filename =
    language === 'sql' ? 'query.sql' : language === 'javascript' ? 'main.js' : 'main.py';
  const loadingLabel =
    language === 'sql'
      ? 'Loading SQL…'
      : language === 'javascript'
        ? 'Loading JavaScript…'
        : 'Loading Python…';

  return (
    <div className="hidden shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2 lg:flex">
      <div className="flex items-center gap-2.5">
        <span className="flex gap-1.5">
          <span className="size-[9px] rounded-full bg-[#ff5f57]" />
          <span className="size-[9px] rounded-full bg-[#febc2e]" />
          <span className="size-[9px] rounded-full bg-[#28c840]" />
        </span>
        <span className="font-mono text-[12px] text-ink-3">{filename}</span>
        {isLoading && !isRunning && (
          <span className="animate-pulse font-mono text-[11px] text-ink-3">{loadingLabel}</span>
        )}
        {bridgeReady && !isRunning && (
          <span className="font-mono text-[11px] text-green">● ready</span>
        )}
        {isRunning && (
          <span className="animate-pulse font-mono text-[11px] text-copper">● running…</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!hideRun && (
          <button
            onClick={onRun}
            disabled={isLoading || isRunning}
            className={
              isRunning || isLoading
                ? 'flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[9px] border-[1.5px] border-line px-3.5 text-[13px] font-semibold text-ink-3'
                : 'flex h-8 items-center gap-1.5 rounded-[9px] border-[1.5px] border-line-2 px-3.5 text-[13px] font-semibold text-ink hover:border-blue hover:text-blue'
            }
          >
            {isRunning ? (
              <>
                <span className="size-3 animate-[pp-spin_.7s_linear_infinite] rounded-full border-2 border-copper border-t-transparent" />
                Running…
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                Run
              </>
            )}
          </button>
        )}

        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={
            canSubmit
              ? 'flex h-8 items-center gap-1.5 rounded-[9px] bg-blue px-3.5 text-[13px] font-semibold text-on-blue shadow-[var(--shadow-sm)] hover:bg-blue-600'
              : 'flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[9px] bg-surface-2 px-3.5 text-[13px] font-semibold text-ink-3'
          }
        >
          <SendHorizonal className="size-3.5" />
          Submit
        </button>

        <span className="mx-1 h-5 w-px bg-line" />

        <HintButton
          question={hintProps?.question ?? question ?? undefined}
          wrongContext={hintProps?.wrongContext}
        />
      </div>
    </div>
  );
}
