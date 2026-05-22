'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronDown, CheckCircle2, Moon, Sun, XCircle, Circle } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import type { Question, QuestionType, Tier, QuestionStatus } from '@/lib/types';
import { getAllStatuses } from '@/lib/storage';
import { TIER_LABELS, TIER_ORDER } from '@/lib/config';
import ProgressPanel from '@/components/ProgressPanel';

const TYPE_FILTERS: { value: QuestionType; label: string }[] = [
  { value: 'write_the_code',    label: 'Write the Code' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank' },
  { value: 'output_prediction', label: 'Output Prediction' },
  { value: 'spot_the_bug',      label: 'Spot the Bug' },
];

const LANGUAGES = [
  { slug: 'python',     label: 'Python'     },
  { slug: 'javascript', label: 'JavaScript' },
  { slug: 'c',          label: 'C'          },
  { slug: 'pytorch',    label: 'PyTorch'    },
  { slug: 'numpy',      label: 'NumPy'      },
];

const SUPPORTED_LANGS = new Set(['python', 'javascript']);

interface Props {
  questions: Question[];
  lang?: string;
  dbError?: string;
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  if (status === 'solved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-500">
        <CheckCircle2 className="size-[18px] fill-green-500 stroke-[#050925]" strokeWidth={2.5} />
        Solved
      </span>
    );
  }
  if (status === 'attempted') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <XCircle className="size-[18px] fill-red-400 stroke-[#050925]" strokeWidth={2.5} />
        Attempted
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Circle className="size-[18px] stroke-muted-foreground" strokeWidth={2} />
      Not started
    </span>
  );
}

export default function DashboardClient({ questions, lang = 'python', dbError }: Props) {
  const router = useRouter();
  const [activeTier, setActiveTier] = useState<Tier>('simple');
  const [activeType, setActiveType] = useState<QuestionType | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatuses(getAllStatuses());
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const filteredQuestions = useMemo(
    () => questions.filter((q) => {
      if (q.tier !== activeTier) return false;
      if (activeType && q.type !== activeType) return false;
      return true;
    }),
    [questions, activeTier, activeType]
  );

  const activeTypeLabel = TYPE_FILTERS.find((f) => f.value === activeType)?.label ?? null;

  const handleQuestionClick = (id: string) => {
    router.push(`/compiler/${id}`);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-background shrink-0">
          <span className="font-mono font-bold text-sm tracking-widest" style={{ color: '#ae6e15' }}>
            PYPRACTICE
          </span>
          <Toggle
            pressed={isDark}
            onPressedChange={toggleTheme}
            aria-label="Toggle theme"
            size="sm"
          >
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Toggle>
        </header>

        {/* ── Language nav ───────────────────────────────────────── */}
        <nav className="shrink-0 flex overflow-x-auto scrollbar-none border-b border-border bg-background">
          {LANGUAGES.map(({ slug, label }) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className={`shrink-0 px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                lang === slug
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Main content ───────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden p-6 md:p-8 flex flex-col min-h-0">
          {!SUPPORTED_LANGS.has(lang) || dbError ? (
            /* ── Unsupported language / DB error ── */
            <div className="flex-1 flex items-center justify-center">
              {dbError ? (
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">Database not ready</p>
                  <p className="text-sm text-muted-foreground">{dbError}</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-foreground">
                    {LANGUAGES.find((l) => l.slug === lang)?.label ?? lang} — Coming Soon
                  </p>
                  <p className="text-sm text-muted-foreground">We&apos;re working on it.</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Python dashboard ── */
            <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-border overflow-hidden bg-background">

              {/* Tier filter row */}
              <div className="shrink-0 flex items-center justify-between gap-4 px-5 py-3.5 bg-card border-b border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  {TIER_ORDER.map((tier) => (
                    <button
                      key={tier}
                      onClick={() => { setActiveTier(tier); setActiveType(null); }}
                      className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                        activeTier === tier
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground border border-border hover:text-foreground hover:border-foreground/20'
                      }`}
                    >
                      {TIER_LABELS[tier]}
                    </button>
                  ))}
                </div>

                {/* Filter dropdown */}
                <div ref={filterRef} className="relative shrink-0">
                  <button
                    onClick={() => setFilterOpen((o) => !o)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm border rounded transition-colors ${
                      activeType
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground bg-background border-border hover:text-foreground hover:border-foreground/20'
                    }`}
                  >
                    {activeTypeLabel ?? 'Filter'}
                    <ChevronDown className={`size-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {filterOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded shadow-lg overflow-hidden z-20">
                      <button
                        onClick={() => { setActiveType(null); setFilterOpen(false); }}
                        className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left transition-colors ${
                          activeType === null
                            ? 'bg-accent text-primary'
                            : 'text-foreground hover:bg-accent/50'
                        }`}
                      >
                        All types
                        {activeType === null && <Check className="size-3.5" />}
                      </button>
                      <div className="h-px bg-border" />
                      {TYPE_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => { setActiveType(f.value); setFilterOpen(false); }}
                          className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left transition-colors ${
                            activeType === f.value
                              ? 'bg-accent text-primary'
                              : 'text-foreground hover:bg-accent/50'
                          }`}
                        >
                          {f.label}
                          {activeType === f.value && <Check className="size-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Two-column area: question list + side panel */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Question list */}
                <div className="flex-[3] overflow-y-auto px-5 pt-5 pb-8 space-y-2 min-w-0">
                  {filteredQuestions.map((q) => {
                    const status = statuses[q.id] ?? 'not_started';
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleQuestionClick(q.id)}
                        className="w-full text-left bg-card border border-border rounded-lg px-4 py-3.5 hover:border-primary/40 hover:bg-accent/30 transition-colors cursor-pointer"
                      >
                        <p className="text-sm text-foreground leading-snug line-clamp-2 mb-2">
                          {q.question}
                        </p>
                        <StatusBadge status={status} />
                      </button>
                    );
                  })}

                  {filteredQuestions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No {activeTypeLabel ? `"${activeTypeLabel}"` : ''} questions found for this tier.
                    </div>
                  )}
                </div>

                {/* Progress panel */}
                <div className="flex-[2] m-4 ml-0 rounded-lg bg-card hidden md:flex flex-col border border-border overflow-hidden">
                  <ProgressPanel questions={questions} statuses={statuses} />
                </div>
              </div>
            </div>
          )}
        </main>
    </div>
  );
}
