import { cn } from '@/lib/utils';
import type { Question, QuestionStatus } from '@/lib/types';
import StatusBadge from './StatusBadge';

interface Props {
  question: Question;
  status: QuestionStatus;
  isSelected: boolean;
  onClick: () => void;
}

/** Compact single-row entry: status glyph · mono id · one-line question text. */
export default function QuestionListItem({ question, status, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      title={question.question}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-2 py-[7px] text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected
          ? 'border-blue/60 bg-blue-050'
          : 'border-transparent hover:bg-surface-2/70'
      )}
    >
      <StatusBadge status={status} iconOnly className="w-4 shrink-0 justify-center text-[13px]" />
      <span
        className={cn(
          'w-11 shrink-0 font-mono text-[11px] font-semibold',
          isSelected ? 'text-blue' : 'text-ink-3'
        )}
      >
        {question.id}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[13px] leading-snug',
          isSelected ? 'font-medium text-ink' : 'text-ink-2'
        )}
      >
        {question.question.split('\n')[0]}
      </span>
    </button>
  );
}
