'use client';

import Link from 'next/link';
import { ArrowLeft, Keyboard, Menu, Moon, Sun } from 'lucide-react';
import { RunSubmitButtons } from '@/components/RunSubmitButtons';
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
        <div className="flex items-center gap-1.5 lg:hidden">
          <RunSubmitButtons
            onRun={onRun}
            onSubmit={onSubmit}
            isRunning={isRunning}
            isLoading={isLoading}
            canSubmit={canSubmit}
            hideRun={hideRun}
          />
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
