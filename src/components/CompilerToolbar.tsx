'use client';

import HintButton from '@/components/solution/HintButton';
import { RunSubmitButtons } from '@/components/RunSubmitButtons';
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
        <RunSubmitButtons
          onRun={onRun}
          onSubmit={onSubmit}
          isRunning={isRunning}
          isLoading={isLoading}
          canSubmit={canSubmit}
          hideRun={hideRun}
        />

        <span className="mx-1 h-5 w-px bg-line" />

        <HintButton
          question={hintProps?.question ?? question ?? undefined}
          wrongContext={hintProps?.wrongContext}
        />
      </div>
    </div>
  );
}
