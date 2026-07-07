import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserStats } from '@/lib/leaderboard'
import { TIER_LABELS, TIER_ORDER, TIER_COLOR_VAR } from '@/lib/config'
import { Logo } from '@/components/brand/Logo'
import { UserMenu } from '@/components/auth/UserMenu'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile — PyPractice' }

function heatColor(count: number): string {
  if (count === 0) return 'var(--surface-2)'
  if (count === 1) return 'color-mix(in srgb, var(--blue) 35%, transparent)'
  if (count === 2) return 'color-mix(in srgb, var(--blue) 65%, transparent)'
  if (count <= 4) return 'var(--blue)'
  return 'var(--copper)'
}

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const stats = await getUserStats(user.id)
  const joined = stats.joined
    ? stats.joined.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—'
  const initial = (user.name ?? user.handle).charAt(0).toUpperCase()

  return (
    <div className="pp-screen min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[960px] items-center justify-between px-7 py-3">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Logo />
            </Link>
            <Link href="/python" className="text-[14px] text-ink-2 hover:text-ink">
              ← Dashboard
            </Link>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-4 pb-20 sm:px-7">
        {/* Header */}
        <div className="mt-9 flex flex-wrap items-center gap-5">
          <span className="grid size-[76px] place-items-center rounded-full bg-copper text-[28px] font-semibold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-[26px] font-bold tracking-[-0.01em]">
              @{user.handle}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-ink-2">
              Rank #{stats.rank ?? '—'} · joined {joined} · 🔥 {user.currentStreak}-day streak
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="rounded-[9px] border-[1.5px] border-line-2 px-3.5 py-2 text-[13px] font-semibold text-ink-2 hover:border-blue hover:text-blue"
          >
            View leaderboard
          </Link>
        </div>

        {/* Stat cards */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Solved" value={String(stats.totalSolved)} />
          <StatCard label="Accuracy" value={`${stats.accuracy}%`} />
          <StatCard label="Points" value={String(user.points)} accent />
          <StatCard label="Streak" value={`🔥${user.currentStreak}`} />
        </div>

        {/* Two-column grid */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* Solved by tier */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
            <p className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-3">
              Solved by tier · Python
            </p>
            <div className="mt-4 flex flex-col gap-3.5">
              {TIER_ORDER.map((tier) => {
                const t = stats.solvedByTier[tier] ?? { solved: 0, total: 0 }
                const pct = t.total > 0 ? Math.round((t.solved / t.total) * 100) : 0
                return (
                  <div key={tier}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className="text-[12.5px] font-semibold"
                        style={{ color: TIER_COLOR_VAR[tier] }}
                      >
                        {TIER_LABELS[tier]}
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {t.solved}/{t.total}
                      </span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded bg-surface-2">
                      <div
                        className="h-full origin-left rounded animate-[pp-bar_1s_ease_both]"
                        style={{ width: `${pct}%`, backgroundColor: TIER_COLOR_VAR[tier] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity heatmap */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
            <p className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-3">
              Activity · last 10 weeks
            </p>
            <div className="mt-4 flex max-w-[280px] flex-wrap gap-1">
              {stats.heatmap.map((d) => (
                <span
                  key={d.date}
                  title={`${d.date}: ${d.count} attempt${d.count === 1 ? '' : 's'}`}
                  className="size-[15px] rounded-[4px]"
                  style={{ backgroundColor: heatColor(d.count) }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-ink-3">
              less
              {[0, 1, 2, 3, 5].map((c) => (
                <span
                  key={c}
                  className="size-[11px] rounded-[3px]"
                  style={{ backgroundColor: heatColor(c) }}
                />
              ))}
              more
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-[var(--shadow-sm)] ${
        accent ? 'border-copper bg-copper-050 text-copper' : 'border-line bg-surface'
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-3">{label}</p>
      <p className="mt-1.5 font-mono text-[26px] font-bold tracking-[-0.02em]">{value}</p>
    </div>
  )
}
