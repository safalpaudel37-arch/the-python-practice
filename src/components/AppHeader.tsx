'use client';

import Link from 'next/link';
import { ArrowLeft, Keyboard, Menu, Moon, Play, SendHorizonal, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import HintButton from '@/components/solution/HintButton';
import { Logo } from '@/components/brand/Logo';
import { UserMenu } from '@/components/auth/UserMenu';
import { TIER_LABELS } from '@/lib/config';
import type { Question, QuestionStatus } from '@/lib/types';
import type { CurrentUser } from '@/lib/auth/user';
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
  question?: Question | null;
  user?: CurrentUser | null;
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
  question,
  user = null,
}: Props) {
  const totalSolved = Object.values(statuses).filter((s) => s === 'solved').length;
  const backHref = `/${question?.language ?? 'python'}`;

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-2">
      {/* Left: back / mobile menu + brand + context badge */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showBackButton ? (
          <Link
            href={backHref}
            aria-label="Back to dashboard"
            className="grid size-[30px] shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-2 hover:border-blue hover:text-blue"
          >
            <ArrowLeft className="size-4" />
          </Link>
        ) : (
          <button
            onClick={onMobileMenuOpen}
            className="grid size-[30px] shrink-0 place-items-center rounded-lg border border-line text-ink-2 lg:hidden"
            aria-label="Open question browser"
          >
            <Menu className="size-4" />
          </button>
        )}
        <Link href="/" className="hidden shrink-0 sm:block">
          <Logo />
        </Link>
        {question && (
          <span className="truncate rounded-lg bg-blue-050 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-blue">
            {question.id} · {TIER_LABELS[question.tier]}
          </span>
        )}
        {totalSolved > 0 && (
          <span className="hidden font-mono text-[11px] text-ink-3 md:inline">
            {totalSolved} solved
          </span>
        )}
      </div>

      {/* Right: run/submit (mobile), hint, shortcuts, theme, avatar */}
      <div className="flex shrink-0 items-center gap-1.5">
        {!hideRun && (
          <button
            onClick={onRun}
            disabled={isLoading || isRunning}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-[9px] border-[1.5px] px-3 text-[13px] font-semibold lg:hidden',
              isRunning || isLoading
                ? 'cursor-not-allowed border-line text-ink-3'
                : 'border-line-2 text-ink hover:border-blue hover:text-blue'
            )}
          >
            {isRunning ? (
              <>
                <Spinner className="size-3.5 text-copper" />
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
            'flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-semibold lg:hidden',
            canSubmit
              ? 'bg-blue text-on-blue hover:bg-blue-600'
              : 'cursor-not-allowed bg-surface-2 text-ink-3'
          )}
        >
          <SendHorizonal className="size-3.5" />
          Submit
        </button>

        <div className="lg:hidden">
          <HintButton question={question ?? undefined} wrongContext={hintProps?.wrongContext} />
        </div>

        <button
          onClick={onShowShortcuts}
          className="hidden size-8 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 hover:text-ink sm:grid"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="size-4" />
        </button>

        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="grid size-8 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 hover:text-ink"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <UserMenu user={user} />
      </div>
    </header>
  );
}
