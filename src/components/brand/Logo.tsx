import { cn } from '@/lib/utils'

/** `>_` glyph in a blue rounded square + "PyPractice" wordmark. */
export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-[26px] place-items-center rounded-[7px] bg-blue font-mono text-[13px] font-bold text-on-blue">
        &gt;_
      </span>
      {!compact && (
        <span
          className={cn(
            'font-heading text-[17px] font-bold tracking-tight',
            dark ? 'text-[#F1ECDF]' : 'text-ink'
          )}
        >
          PyPractice
        </span>
      )}
    </span>
  )
}
