import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTopic } from '@/lib/utils';
import type { Question, QuestionStatus } from '@/lib/types';
import QuestionListItem from './QuestionListItem';

interface Props {
  questions: Question[];
  selectedId: string;
  statuses: Record<string, QuestionStatus>;
  onSelect: (id: string) => void;
}

/** Questions grouped under topic section headers (order of first appearance). */
export default function QuestionList({ questions, selectedId, statuses, onSelect }: Props) {
  if (questions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-xs text-ink-3">No questions match your filters.</p>
      </div>
    );
  }

  const groups: { topic: string; items: Question[] }[] = [];
  for (const q of questions) {
    const group = groups.find((g) => g.topic === q.topic);
    if (group) group.items.push(q);
    else groups.push({ topic: q.topic, items: [q] });
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col px-2 pb-4">
        {groups.map(({ topic, items }) => {
          const solved = items.filter((q) => statuses[q.id] === 'solved').length;
          return (
            <section key={topic}>
              <div className="flex items-baseline justify-between px-2 pb-1 pt-4">
                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-ink-3">
                  {formatTopic(topic)}
                </h3>
                <span className="font-mono text-[10px] text-ink-3">
                  {solved}/{items.length}
                </span>
              </div>
              <div className="flex flex-col gap-px">
                {items.map((q) => (
                  <QuestionListItem
                    key={q.id}
                    question={q}
                    status={statuses[q.id] ?? 'not_started'}
                    isSelected={q.id === selectedId}
                    onClick={() => onSelect(q.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </ScrollArea>
  );
}
