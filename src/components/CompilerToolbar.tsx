'use client';

import { Play, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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
}

export default function CompilerToolbar({ status, bridgeReady, onRun, onSubmit, canSubmit, hideRun = false, hintProps, language = 'python' }: Props) {
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
    <div className="hidden lg:flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {filename}
        </Badge>
        {isLoading && !isRunning && (
          <span className="text-xs text-muted-foreground animate-pulse">{loadingLabel}</span>
        )}
        {bridgeReady && !isRunning && (
          <span className="text-xs text-green-500">● Ready</span>
        )}
        {isRunning && (
          <span className="text-xs text-yellow-500 animate-pulse">● Running…</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!hideRun && (
          <Button
            onClick={onRun}
            disabled={isLoading || isRunning}
            size="sm"
            className={
              isRunning || isLoading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }
          >
            {isRunning ? (
              <>
                <Spinner className="size-3.5 mr-1" />
                Running
              </>
            ) : (
              <>
                <Play className="size-3.5 mr-1" />
                Run
              </>
            )}
          </Button>
        )}

        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          size="sm"
          variant="outline"
          className={
            canSubmit
              ? 'border-border text-foreground hover:bg-accent'
              : 'opacity-30 cursor-not-allowed'
          }
        >
          <SendHorizonal className="size-3.5 mr-1" />
          Submit
        </Button>

        {hintProps && (
          <HintButton question={hintProps.question} wrongContext={hintProps.wrongContext} />
        )}
      </div>
    </div>
  );
}
