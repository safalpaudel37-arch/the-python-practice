import { cn } from '@/lib/utils';
import type { QuestionStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  QuestionStatus,
  { icon: string; label: string; className: string }
> = {
  not_started: { icon: '○', label: 'Not started', className: 'text-ink-3' },
  attempted: { icon: '◐', label: 'Attempted', className: 'text-copper' },
  solved: { icon: '✓', label: 'Solved', className: 'text-green' },
  skipped: { icon: '→', label: 'Skipped', className: 'text-blue' },
};

interface Props {
  status: QuestionStatus;
  iconOnly?: boolean;
  className?: string;
}

export default function StatusBadge({ status, iconOnly = false, className }: Props) {
  const { icon, label, className: colorClass } = STATUS_CONFIG[status];
  return (
    <span className={cn('flex items-center gap-1 text-xs', colorClass, className)}>
      <span aria-hidden="true">{icon}</span>
      {!iconOnly && <span>{label}</span>}
      {iconOnly && <span className="sr-only">{label}</span>}
    </span>
  );
}
