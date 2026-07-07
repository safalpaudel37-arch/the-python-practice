'use client';

import { useState, useMemo } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tier, Question, QuestionStatus } from '@/lib/types';
import { TIER_LABELS } from '@/lib/config';
import TierTabs from './TierTabs';
import QuestionSearch from './QuestionSearch';
import QuestionList from './QuestionList';
import StatusBadge from './StatusBadge';

interface Props {
  questions: Question[];
  selectedId: string;
  statuses: Record<string, QuestionStatus>;
  onSelect: (id: string) => void;
  /** When true, renders full-width (no fixed w-72) — used inside the mobile Sheet */
  fullWidth?: boolean;
  /** Controlled collapse state (desktop only) */
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function QuestionBrowser({ questions, selectedId, statuses, onSelect, fullWidth = false, isCollapsed = false, onToggleCollapsed }: Props) {
  const [activeTier, setActiveTier] = useState<Tier>('simple');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return questions.filter((item) => {
      if (item.tier !== activeTier) return false;
      if (
        q &&
        !item.question.toLowerCase().includes(q) &&
        !item.topic.toLowerCase().includes(q) &&
        !item.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [activeTier, searchQuery, questions]);

  const handleTierChange = (tier: Tier) => {
    setActiveTier(tier);
    setSearchQuery('');
  };

  const tierQuestions = useMemo(
    () => questions.filter((q) => q.tier === activeTier),
    [questions, activeTier]
  );
  const tierSolved = tierQuestions.filter((q) => statuses[q.id] === 'solved').length;
  const tierPct = tierQuestions.length
    ? Math.round((tierSolved / tierQuestions.length) * 100)
    : 0;

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden bg-surface',
        !fullWidth && 'border-r border-line transition-[width] duration-200',
        !fullWidth && (isCollapsed ? 'w-12' : 'w-72'),
        fullWidth && 'w-full'
      )}
    >
      {/* Header */}
      {!fullWidth && (
        <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
          {!isCollapsed && (
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[.14em] text-ink-3">
              Questions
            </span>
          )}
          <button
            onClick={onToggleCollapsed}
            className={cn(
              'flex size-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink',
              isCollapsed && 'mx-auto'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
      )}

      {isCollapsed && !fullWidth ? (
        /* Collapsed: icon strip */
        <div className="flex flex-col items-center gap-0.5 overflow-y-auto px-1 pt-2">
          {tierQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              title={`${q.id} — ${q.topic}`}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                q.id === selectedId ? 'bg-blue-050' : 'hover:bg-surface-2'
              )}
            >
              <StatusBadge status={statuses[q.id] ?? 'not_started'} iconOnly />
            </button>
          ))}
        </div>
      ) : (
        /* Expanded: full browser */
        <>
          <TierTabs activeTier={activeTier} onTierChange={handleTierChange} questions={questions} />

          {/* Tier progress */}
          <div className="px-3 pt-2.5">
            <div className="flex items-baseline justify-between pb-1.5">
              <span className="text-[11.5px] text-ink-3">
                {tierSolved} of {tierQuestions.length} solved · {TIER_LABELS[activeTier]}
              </span>
              <span className="font-mono text-[10.5px] text-ink-3">{tierPct}%</span>
            </div>
            <div className="h-[4px] overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-green transition-[width] duration-500"
                style={{ width: `${tierPct}%` }}
              />
            </div>
          </div>

          <QuestionSearch value={searchQuery} onChange={setSearchQuery} />
          <QuestionList
            questions={filtered}
            selectedId={selectedId}
            statuses={statuses}
            onSelect={onSelect}
          />
        </>
      )}
    </div>
  );
}
