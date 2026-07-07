'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TIER_LABELS, TIER_ORDER } from '@/lib/config';
import type { Tier, Question } from '@/lib/types';

/** Short labels that fit four segments in a 288px rail. */
const SHORT_LABELS: Record<string, string> = {
  simple: 'Simple',
  intermediate: 'Inter',
  hard: 'Hard',
  expert: 'Expert',
};

interface Props {
  activeTier: Tier;
  onTierChange: (tier: Tier) => void;
  questions: Question[];
}

export default function TierTabs({ activeTier, onTierChange, questions }: Props) {
  const counts = useMemo(
    () =>
      Object.fromEntries(
        TIER_ORDER.map((tier) => [tier, questions.filter((q) => q.tier === tier).length])
      ),
    [questions]
  );

  return (
    <div className="px-3 pt-3">
      <div className="grid grid-cols-4 rounded-[10px] border border-line bg-surface-2 p-[3px]">
        {TIER_ORDER.map((tier) => (
          <button
            key={tier}
            onClick={() => onTierChange(tier)}
            title={`${TIER_LABELS[tier]} — ${counts[tier]} questions`}
            className={cn(
              'rounded-lg py-1.5 text-[11.5px] font-semibold transition-colors',
              activeTier === tier
                ? 'bg-blue text-on-blue shadow-[var(--shadow-sm)]'
                : 'text-ink-2 hover:text-ink'
            )}
          >
            {SHORT_LABELS[tier]}
          </button>
        ))}
      </div>
    </div>
  );
}
