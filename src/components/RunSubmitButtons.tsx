'use client';

import { Play, SendHorizonal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isLoading: boolean;
  canSubmit: boolean;
  hideRun?: boolean;
}

export function RunSubmitButtons({
  onRun,
  onSubmit,
  isRunning,
  isLoading,
  canSubmit,
  hideRun = false,
}: Props) {
  return (
    <>
      {!hideRun && (
        <button
          onClick={onRun}
          disabled={isLoading || isRunning}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-[9px] border-[1.5px] px-3.5 text-[13px] font-semibold',
            isRunning || isLoading
              ? 'cursor-not-allowed border-line text-ink-3'
              : 'border-line-2 text-ink hover:border-blue hover:text-blue'
          )}
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
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-semibold',
          canSubmit
            ? 'bg-blue text-on-blue shadow-[var(--shadow-sm)] hover:bg-blue-600'
            : 'cursor-not-allowed bg-surface-2 text-ink-3'
        )}
      >
        <SendHorizonal className="size-3.5" />
        Submit
      </button>
    </>
  );
}
