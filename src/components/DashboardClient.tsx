'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Moon, Sun, Search, Trophy } from 'lucide-react';
import type { Question, Tier, QuestionStatus } from '@/lib/types';
import type { CurrentUser } from '@/lib/auth/user';
import type { QuestionStats } from '@/lib/tracking';
import { getAllStatuses, getLastSession, clearGuestData } from '@/lib/storage';
import {
  TIER_LABELS,
  TIER_ORDER,
  TIER_COLOR_VAR,
  TIER_SHORT_LABELS,
  TYPE_SHORT_LABELS,
  LANGUAGES,
  SUPPORTED_LANGS,
} from '@/lib/config';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Logo } from '@/components/brand/Logo';
import { UserMenu } from '@/components/auth/UserMenu';
import { GuestBanner } from '@/components/auth/GuestBanner';

const STATUS_FILTERS: { value: QuestionStatus | null; label: string }[] = [
  { value: null, label: 'All status' },
  { value: 'not_started', label: 'Not started' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'solved', label: 'Solved' },
];

const STATUS_META: Record<QuestionStatus, { icon: string; cls: string }> = {
  solved: { icon: '✓', cls: 'text-green bg-green-100' },
  attempted: { icon: '◐', cls: 'text-copper bg-copper-100' },
  skipped: { icon: '○', cls: 'text-ink-3 bg-surface-2' },
  not_started: { icon: '○', cls: 'text-ink-3 bg-surface-2' },
};

const STATUS_LABEL: Record<QuestionStatus, string> = {
  solved: 'Solved',
  attempted: 'Attempted',
  skipped: 'Skipped',
  not_started: 'Not started',
};

interface Props {
  questions: Question[];
  lang?: string;
  dbError?: string;
  user?: CurrentUser | null;
  stats?: Record<string, QuestionStats>;
  serverStatuses?: Record<string, QuestionStatus>;
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function DashboardClient({
  questions,
  lang = 'python',
  dbError,
  user = null,
  stats = {},
  serverStatuses = {},
}: Props) {
  const router = useRouter();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [activeTier, setActiveTier] = useState<Tier>('simple');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | null>(null);
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>(serverStatuses);
  const [resume, setResume] = useState<{ questionId: string } | null>(null);

  useEffect(() => {
    // Logged in: guest data (progress, attempts, saved code) is wiped — the
    // account's progress lives server-side. Guests keep using localStorage.
    if (user) {
      clearGuestData();
    } else {
      const local = getAllStatuses();
      setStatuses((prev) => ({ ...local, ...prev }));
    }
    const last = getLastSession();
    if (last?.questionId) {
      setResume({ questionId: last.questionId });
    }
    localStorage.setItem('has_interacted', 'true');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const langLabel = LANGUAGES.find((l) => l.slug === lang)?.label.replace('🐍 ', '') ?? lang;

  const tierData = useMemo(
    () =>
      TIER_ORDER.map((tier) => {
        const tierQs = questions.filter((q) => q.tier === tier);
        const solved = tierQs.filter((q) => statuses[q.id] === 'solved').length;
        return {
          tier,
          total: tierQs.length,
          solved,
          pct: tierQs.length ? Math.round((solved / tierQs.length) * 100) : 0,
        };
      }),
    [questions, statuses]
  );

  const topics = useMemo(() => {
    const set = new Set<string>();
    questions.filter((q) => q.tier === activeTier).forEach((q) => set.add(q.topic));
    return [...set];
  }, [questions, activeTier]);

  const filtered = useMemo(
    () =>
      questions.filter((q) => {
        if (q.tier !== activeTier) return false;
        if (activeTopic && q.topic !== activeTopic) return false;
        if (statusFilter && (statuses[q.id] ?? 'not_started') !== statusFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          if (!q.question.toLowerCase().includes(s) && !q.id.toLowerCase().includes(s))
            return false;
        }
        return true;
      }),
    [questions, activeTier, activeTopic, statusFilter, search, statuses]
  );

  const totalSolved = questions.filter((q) => statuses[q.id] === 'solved').length;
  const overallPct = questions.length ? Math.round((totalSolved / questions.length) * 100) : 0;
  const hasFilters = activeTopic !== null || statusFilter !== null || search !== '';
  const resumeQuestion = resume ? questions.find((q) => q.id === resume.questionId) : null;

  return (
    <div className="pp-screen min-h-[100dvh] bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-2.5 md:px-7">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LANGUAGES.map(({ slug, label, live }) =>
              live ? (
                <Link
                  key={slug}
                  href={`/${slug}`}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${
                    lang === slug
                      ? 'bg-blue-050 font-semibold text-blue'
                      : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={slug}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[13px] text-ink-3"
                >
                  {label} · soon
                </span>
              )
            )}
          </nav>

          <Link
            href="/leaderboard"
            className="hidden shrink-0 items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-blue sm:flex"
          >
            <Trophy className="size-4" />
            Leaderboard
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 hover:text-ink"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <UserMenu user={user} />
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pb-24 md:px-7">
        {!SUPPORTED_LANGS.has(lang) || dbError ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            {dbError ? (
              <div className="space-y-2 text-center">
                <p className="font-heading text-lg font-semibold">Database not ready</p>
                <p className="text-sm text-ink-2">{dbError}</p>
              </div>
            ) : (
              <div className="space-y-2 text-center">
                <p className="font-heading text-2xl font-bold">
                  {LANGUAGES.find((l) => l.slug === lang)?.label ?? lang} — Coming soon
                </p>
                <p className="text-sm text-ink-2">We&apos;re working on it.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {!user && (
              <div className="mt-4">
                <GuestBanner />
              </div>
            )}

            {/* ── Heading ── */}
            <div className="mt-7 mb-5">
              <h1 className="font-heading text-[26px] font-bold tracking-[-0.01em]">
                Your {langLabel} journey
              </h1>
              <p className="mt-1 text-[14px] text-ink-2">
                {totalSolved} of {questions.length} solved · pick a tier and keep climbing.
              </p>
            </div>

            {/* ── Tier cards ── */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {tierData.map(({ tier, total, solved, pct }) => {
                const selected = activeTier === tier;
                const color = TIER_COLOR_VAR[tier];
                return (
                  <button
                    key={tier}
                    onClick={() => {
                      setActiveTier(tier);
                      setActiveTopic(null);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border bg-surface p-3 text-center hover:-translate-y-0.5 md:flex-row md:gap-3 md:p-3.5 md:text-left"
                    style={{
                      borderColor: selected ? color : 'var(--line)',
                      borderWidth: 1.5,
                      boxShadow: selected ? 'var(--shadow)' : 'var(--shadow-sm)',
                    }}
                  >
                    <ProgressRing size={44} stroke={5} pct={pct} color={color} />
                    <span className="min-w-0 max-w-full">
                      <span
                        className="block truncate font-heading text-[13.5px] font-bold md:text-[15px]"
                        style={{ color: selected ? color : 'var(--ink)' }}
                      >
                        <span className="md:hidden">{TIER_SHORT_LABELS[tier]}</span>
                        <span className="hidden md:inline">{TIER_LABELS[tier]}</span>
                      </span>
                      <span className="block whitespace-nowrap font-mono text-[10.5px] text-ink-3 md:text-[11px]">
                        {solved}/{total} solved
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Mobile progress summary (right rail is desktop-only) ── */}
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-sm)] lg:hidden">
              <ProgressRing size={56} stroke={6} pct={overallPct} color="var(--blue)">
                <span className="font-mono text-[12px] font-bold">{overallPct}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">
                  {totalSolved} / {questions.length} solved
                </p>
                {user ? (
                  <p className="text-[12px] text-ink-3">
                    🔥 {user.currentStreak}-day streak · best {user.bestStreak}
                  </p>
                ) : (
                  <p className="text-[12px] text-ink-3">progress saved on this device</p>
                )}
              </div>
              {resumeQuestion && (
                <Link
                  href={`/compiler/${resumeQuestion.id}`}
                  className="shrink-0 rounded-[9px] bg-copper px-3 py-1.5 text-[12.5px] font-semibold text-white hover:-translate-y-px"
                >
                  Continue →
                </Link>
              )}
            </div>

            {/* ── Main grid ── */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              {/* Left: filters + question list */}
              <div className="min-w-0">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-w-44 flex-1 items-center gap-2 rounded-[10px] border-[1.5px] border-line-2 bg-surface px-3 py-2 text-[13px] focus-within:border-copper focus-within:shadow-[0_0_0_3px_var(--copper-050)]">
                    <Search className="size-4 shrink-0 text-ink-3" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search questions…"
                      className="w-full bg-transparent outline-none placeholder:text-ink-3"
                    />
                  </label>
                  {STATUS_FILTERS.map(({ value, label }) => (
                    <button
                      key={label}
                      onClick={() => setStatusFilter(value)}
                      className={`shrink-0 rounded-full border-[1.5px] px-3 py-1.5 text-[12.5px] font-medium ${
                        statusFilter === value
                          ? 'border-blue bg-blue-050 text-blue'
                          : 'border-line-2 text-ink-2 hover:border-blue/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Topic chips */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTopic(null)}
                    className={`rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-medium ${
                      activeTopic === null
                        ? 'border-blue bg-blue-050 text-blue'
                        : 'border-line-2 text-ink-2 hover:border-blue/50'
                    }`}
                  >
                    All
                  </button>
                  {topics.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTopic(t === activeTopic ? null : t)}
                      className={`rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-medium ${
                        activeTopic === t
                          ? 'border-blue bg-blue-050 text-blue'
                          : 'border-line-2 text-ink-2 hover:border-blue/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {hasFilters && (
                    <button
                      onClick={() => {
                        setActiveTopic(null);
                        setStatusFilter(null);
                        setSearch('');
                      }}
                      className="text-[12.5px] font-semibold text-copper hover:text-copper-600"
                    >
                      Clear all ✕
                    </button>
                  )}
                </div>

                {/* Question cards */}
                <div className="mt-4 flex flex-col gap-[11px]">
                  {filtered.map((q) => {
                    const status = statuses[q.id] ?? 'not_started';
                    const meta = STATUS_META[status];
                    const st = stats[q.id];
                    return (
                      <button
                        key={q.id}
                        onClick={() => router.push(`/compiler/${q.id}`)}
                        className="group rounded-[14px] border border-line bg-surface p-4 text-left shadow-[var(--shadow-sm)] hover:-translate-y-[3px] hover:border-blue hover:shadow-[var(--shadow)]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[12px] font-semibold text-blue">
                            {q.id}
                          </span>
                          <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
                            {TYPE_SHORT_LABELS[q.type] ?? q.type}
                          </span>
                          <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
                            {q.topic}
                          </span>
                          <span
                            className={`ml-auto flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${meta.cls}`}
                          >
                            {meta.icon} {STATUS_LABEL[status]}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[14.5px] font-medium leading-snug">
                          {q.question}
                        </p>
                        {st && st.attempts > 0 && (
                          <p className="mt-2 font-mono text-[11px] text-ink-3">
                            {st.solveRate}% solve rate · {formatCount(st.attempts)} attempts
                          </p>
                        )}
                      </button>
                    );
                  })}

                  {filtered.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-line-2 py-12 text-center">
                      <p className="text-[32px]">🔍</p>
                      <p className="mt-2 font-heading text-[17px] font-bold">No questions match</p>
                      <p className="mt-1 text-[13px] text-ink-2">
                        Try clearing your filters to see everything.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTopic(null);
                          setStatusFilter(null);
                          setSearch('');
                        }}
                        className="mt-4 rounded-[9px] bg-blue px-4 py-2 text-[13px] font-semibold text-on-blue hover:bg-blue-600"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right rail */}
              <aside className="hidden lg:block">
                <div className="sticky top-20 flex flex-col gap-3.5">
                  {/* Overall progress */}
                  <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
                    <p className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-3">
                      Overall progress
                    </p>
                    <div className="mt-4 grid place-items-center">
                      <ProgressRing size={128} stroke={12} pct={overallPct} color="var(--blue)">
                        <span className="text-center">
                          <span className="block font-mono text-[26px] font-bold leading-none">
                            {totalSolved}
                          </span>
                          <span className="font-mono text-[12px] text-ink-3">
                            / {questions.length}
                          </span>
                        </span>
                      </ProgressRing>
                    </div>
                    <p className="mt-3 text-center text-[12.5px] text-ink-3">
                      {overallPct}% complete
                    </p>
                  </div>

                  {/* Streak */}
                  {user && (
                    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
                      <span className="font-heading text-[30px] font-bold text-copper">
                        🔥{user.currentStreak}
                      </span>
                      <span>
                        <span className="block text-[14px] font-semibold">day streak</span>
                        <span className="text-[12px] text-ink-3">
                          Best: {user.bestStreak} days
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Solved by tier */}
                  <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
                    <p className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-3">
                      Solved by tier
                    </p>
                    <div className="mt-4 flex flex-col gap-3.5">
                      {tierData.map(({ tier, total, solved, pct }) => (
                        <div key={tier}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span
                              className="text-[12.5px] font-semibold"
                              style={{ color: TIER_COLOR_VAR[tier] }}
                            >
                              {TIER_LABELS[tier]}
                            </span>
                            <span className="font-mono text-[11px] text-ink-3">
                              {solved}/{total}
                            </span>
                          </div>
                          <div className="h-[7px] overflow-hidden rounded bg-surface-2">
                            <div
                              className="h-full origin-left rounded animate-[pp-bar_1s_ease_both]"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: TIER_COLOR_VAR[tier],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resume last */}
                  {resumeQuestion && (
                    <Link
                      href={`/compiler/${resumeQuestion.id}`}
                      className="block rounded-2xl border border-copper/35 bg-copper-050 p-5 hover:-translate-y-0.5 hover:shadow-[var(--shadow)]"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[.12em] text-copper">
                        Resume last
                      </p>
                      <p className="mt-2 truncate text-[14px] font-semibold">
                        {resumeQuestion.id} · {resumeQuestion.topic}
                      </p>
                      <span className="mt-3 block rounded-[9px] bg-copper py-2 text-center text-[13px] font-semibold text-white">
                        Continue →
                      </span>
                    </Link>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
