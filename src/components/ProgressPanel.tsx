'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Question, QuestionStatus } from '@/lib/types';
import { TIER_ORDER, TIER_LABELS } from '@/lib/config';

const TYPE_CONFIG = [
  { value: 'write_the_code',    label: 'Write the Code',    color: 'bg-blue-500'   },
  { value: 'spot_the_bug',      label: 'Spot the Bug',      color: 'bg-red-500'    },
  { value: 'output_prediction', label: 'Output Prediction', color: 'bg-purple-500' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank', color: 'bg-amber-500'  },
] as const;

const TIER_COLOR: Record<string, string> = {
  simple:       'bg-emerald-500',
  intermediate: 'bg-blue-500',
  hard:         'bg-orange-500',
  expert:       'bg-red-500',
};

const TIER_TEXT: Record<string, string> = {
  simple:       'text-emerald-600 dark:text-emerald-400',
  intermediate: 'text-blue-600 dark:text-blue-400',
  hard:         'text-orange-600 dark:text-orange-400',
  expert:       'text-red-600 dark:text-red-400',
};

interface Props {
  questions: Question[];
  statuses: Record<string, QuestionStatus>;
}

function ProgressBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ProgressPanel({ questions, statuses }: Props) {
  const [openTiers, setOpenTiers] = useState<Set<string>>(new Set(['simple']));

  const tierData = useMemo(() => {
    return TIER_ORDER.map((tier) => {
      const tierQs = questions.filter((q) => q.tier === tier);
      const tierSolved = tierQs.filter((q) => statuses[q.id] === 'solved').length;

      const typeRows = TYPE_CONFIG.map((t) => {
        const qs = tierQs.filter((q) => q.type === t.value);
        const solved = qs.filter((q) => statuses[q.id] === 'solved').length;
        return { ...t, total: qs.length, solved };
      }).filter((t) => t.total > 0);

      return {
        tier,
        label: TIER_LABELS[tier],
        total: tierQs.length,
        solved: tierSolved,
        pct: tierQs.length > 0 ? Math.round((tierSolved / tierQs.length) * 100) : 0,
        typeRows,
      };
    });
  }, [questions, statuses]);

  const toggle = (tier: string) =>
    setOpenTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });

  const totalSolved = questions.filter((q) => statuses[q.id] === 'solved').length;
  const totalAll = questions.length;
  const overallPct = totalAll > 0 ? Math.round((totalSolved / totalAll) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Overall summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Overall Progress</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{totalSolved} / {totalAll}</span>
        </div>
        <ProgressBar pct={overallPct} colorClass="bg-blue-500" />
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{overallPct}% complete</p>
      </div>

      {/* Per-tier accordions */}
      <div className="flex flex-col gap-2">
        {tierData.map(({ tier, label, total, solved, pct, typeRows }) => {
          const isOpen = openTiers.has(tier);
          return (
            <div
              key={tier}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Tier header */}
              <button
                onClick={() => toggle(tier)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${TIER_TEXT[tier]}`}>
                      {label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {solved}/{total}
                    </span>
                  </div>
                  <ProgressBar pct={pct} colorClass={TIER_COLOR[tier]} />
                </div>
                <ChevronDown
                  className={`size-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Type breakdown */}
              {isOpen && typeRows.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                  {typeRows.map(({ value, label: typeLabel, color, total: typeTotal, solved: typeSolved }) => {
                    const typePct = typeTotal > 0 ? Math.round((typeSolved / typeTotal) * 100) : 0;
                    return (
                      <div key={value}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{typeLabel}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {typeSolved}/{typeTotal}
                          </span>
                        </div>
                        <ProgressBar pct={typePct} colorClass={color} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
