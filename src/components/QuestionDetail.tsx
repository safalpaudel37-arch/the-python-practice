'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn, formatTopic } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { TYPE_SHORT_LABELS } from '@/lib/config';
import { parseSqlQuestion } from '@/lib/sql/parse';
import type { Question } from '@/lib/types';

interface Props {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * For fill_in_the_blank the code template is pre-loaded into the editor
 * (see HomeClient's savedCode), so the prompt shows only the prose part.
 */
function promptText(question: Question): { text: string; blanksInEditor: boolean } {
  if (question.type !== 'fill_in_the_blank') {
    return { text: question.question, blanksInEditor: false };
  }
  if (question.language === 'sql') {
    const { promptBefore, templateAfter } = parseSqlQuestion(question.question);
    if (templateAfter) return { text: promptBefore, blanksInEditor: true };
    return { text: question.question, blanksInEditor: false };
  }
  const sepIdx = question.question.indexOf('\n\n');
  if (sepIdx !== -1) {
    return { text: question.question.slice(0, sepIdx).trim(), blanksInEditor: true };
  }
  return { text: question.question, blanksInEditor: false };
}

export default function QuestionDetail({ question, open, onOpenChange }: Props) {
  if (!question) {
    return (
      <div className="border-b border-line bg-surface px-4 py-3 text-sm text-ink-2">
        Select a question to begin.
      </div>
    );
  }

  const prompt = promptText(question);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="border-b border-line bg-surface">
        <CollapsibleTrigger className="flex w-full items-start justify-between gap-2 px-4 py-3 text-left hover:bg-surface-2/60">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
                {TYPE_SHORT_LABELS[question.type] ?? question.type}
              </span>
              <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
                {formatTopic(question.topic)}
              </span>
            </div>
            {/* One-line preview only while collapsed — the expanded body below shows the full question */}
            {!open && (
              <p className="line-clamp-1 text-sm font-medium leading-snug text-ink-2">
                {question.question.split('\n')[0]}
              </p>
            )}
          </div>
          <span className="mt-0.5 shrink-0 text-ink-3">
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3.5">
            <pre className="whitespace-pre-wrap rounded-xl bg-code-bg p-3.5 font-mono text-xs leading-relaxed text-code-ink">
              {prompt.text}
            </pre>
            {prompt.blanksInEditor && (
              <p className="mt-2 text-[12px] text-ink-3">
                Fill in the <span className="font-mono text-copper">___</span> blanks directly in
                the code editor below.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
