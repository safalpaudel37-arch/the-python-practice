'use client';

import Link from 'next/link';
import { ArrowLeft, Keyboard, Menu, Moon, Play, SendHorizonal, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import HintButton from '@/components/solution/HintButton';
import type { Question, QuestionStatus } from '@/lib/types';
import type { WrongAttemptContext } from '@/components/Compiler';

interface HintProps {
  question: Question;
  wrongContext: WrongAttemptContext;
}

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  onMobileMenuOpen: () => void;
  onRun: () => void;
  onSubmit: () => void;
  onShowShortcuts: () => void;
  isRunning: boolean;
  isLoading: boolean;
  canSubmit: boolean;
  statuses: Record<string, QuestionStatus>;
  showBackButton?: boolean;
  hideRun?: boolean;
  hintProps?: HintProps;
}

export default function AppHeader({
  isDark,
  onToggleTheme,
  onMobileMenuOpen,
  onRun,
  onSubmit,
  onShowShortcuts,
  isRunning,
  isLoading,
  canSubmit,
  statuses,
  showBackButton = false,
  hideRun = false,
  hintProps,
}: Props) {
  const totalSolved = Object.values(statuses).filter((s) => s === 'solved').length;

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-background shrink-0">
      {/* Left: back button (compiler view) or mobile menu + logo */}
      <div className="flex items-center gap-2">
        {showBackButton ? (
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMobileMenuOpen}
            className="lg:hidden h-9 w-9"
            aria-label="Open question browser"
          >
            <Menu className="size-4" />
          </Button>
        )}
        <span className="font-mono font-bold text-sm tracking-widest" style={{ color: '#ae6e15' }}>
          PYPRACTICE
        </span>
        {totalSolved > 0 && (
          <span className="hidden sm:inline text-xs text-muted-foreground">
            {totalSolved} solved
          </span>
        )}
      </div>

      {/* Right: shortcuts help + theme toggle + mobile run button */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onShowShortcuts}
          className="hidden sm:flex h-9 w-9"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="size-4" />
        </Button>

        <Toggle
          pressed={isDark}
          onPressedChange={onToggleTheme}
          aria-label="Toggle theme"
          size="sm"
        >
          {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Toggle>

        {/* Run + Submit buttons — only on mobile/tablet (desktop has CompilerToolbar) */}
        {!hideRun && (
          <Button
            onClick={onRun}
            disabled={isLoading || isRunning}
            size="sm"
            className={cn(
              'lg:hidden h-9',
              isRunning || isLoading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
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
          className={cn(
            'lg:hidden h-9',
            canSubmit
              ? 'border-border text-foreground hover:bg-accent'
              : 'opacity-30 cursor-not-allowed'
          )}
        >
          <SendHorizonal className="size-3.5 mr-1" />
          Submit
        </Button>

        {hintProps && (
          <div className="lg:hidden">
            <HintButton question={hintProps.question} wrongContext={hintProps.wrongContext} />
          </div>
        )}
      </div>
    </header>
  );
}

