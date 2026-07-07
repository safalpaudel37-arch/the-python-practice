import { MAX_ATTEMPTS } from '@/lib/config';

/** Row of 5 attempt dots: consumed = red, remaining = line-2. */
export function AttemptDots({ attemptCount }: { attemptCount: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
        <span
          key={i}
          className="size-[11px] rounded-full"
          style={{ backgroundColor: i < attemptCount ? 'var(--red)' : 'var(--line-2)' }}
        />
      ))}
    </span>
  );
}

interface Props {
  attemptCount: number;
}

export default function AttemptsCounter({ attemptCount }: Props) {
  if (attemptCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <AttemptDots attemptCount={attemptCount} />
      <p className="text-[13.5px] font-semibold">
        Attempt {Math.min(attemptCount, MAX_ATTEMPTS)} of {MAX_ATTEMPTS} — solution unlocks at{' '}
        {MAX_ATTEMPTS}
      </p>
    </div>
  );
}
