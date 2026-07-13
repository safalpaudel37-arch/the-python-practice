import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/user'
import { blockAdmins } from '@/lib/auth/admin'
import { LANG_LABEL } from '@/lib/config'
import {
  getLeaderboard,
  type LeaderboardLanguage,
  type LeaderboardRow,
  type Timeframe,
} from '@/lib/leaderboard'
import { Logo } from '@/components/brand/Logo'
import { UserMenu } from '@/components/auth/UserMenu'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ searchParams }: Props) {
  const params = await searchParams
  const label = params.lang ? LANG_LABEL[params.lang] : null
  return {
    title: label
      ? `${label} Leaderboard — PyPractice`
      : 'Leaderboard — PyPractice',
  }
}

const LANG_TABS: { value: LeaderboardLanguage | undefined; label: string; param: string }[] = [
  { value: undefined, label: 'All langs', param: '' },
  { value: 'python', label: 'Python', param: 'python' },
  { value: 'javascript', label: 'JS', param: 'javascript' },
  { value: 'sql', label: 'SQL', param: 'sql' },
]

const TIME_TABS: { value: Timeframe; label: string }[] = [
  { value: 'all', label: 'All-time' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'Month' },
]

const PODIUM_AVATAR = ['bg-copper', 'bg-blue', 'bg-[#5C564A]']
const PODIUM_NAME = ['text-copper', 'text-blue', 'text-ink-2']
const PODIUM_HEIGHT = [108, 78, 56]

const GRID = 'grid grid-cols-[36px_1fr_58px_54px_50px_52px] items-center gap-2 sm:grid-cols-[44px_1fr_84px_68px_62px_60px]'

interface Props {
  searchParams: Promise<{ lang?: string; time?: string }>
}

export default async function LeaderboardPage({ searchParams }: Props) {
  await blockAdmins()
  const params = await searchParams
  const lang = LANG_TABS.find((t) => t.param === (params.lang ?? ''))?.value
  const time: Timeframe = TIME_TABS.some((t) => t.value === params.time)
    ? (params.time as Timeframe)
    : 'week'

  const [rows, user] = await Promise.all([
    getLeaderboard({ language: lang, timeframe: time }),
    getCurrentUser(),
  ])

  const you = user ? rows.find((r) => r.userId === user.id) : undefined
  const showPodium = rows.length >= 3
  const podium = showPodium ? rows.slice(0, 3) : []
  const rest = showPodium ? rows.slice(3) : rows
  const timeWord = time === 'week' ? 'this week' : time === 'month' ? 'this month' : 'all-time'

  const href = (l: string, t: Timeframe) =>
    `/leaderboard?${new URLSearchParams({ ...(l ? { lang: l } : {}), time: t }).toString()}`
  const dashboardHref = `/${lang ?? 'python'}`
  const practiceHref = `/${lang ?? 'python'}`

  return (
    <div className="pp-screen min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[820px] items-center justify-between px-7 py-3">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Logo />
            </Link>
            <Link href={dashboardHref} className="text-[14px] text-ink-2 hover:text-ink">
              ← Dashboard
            </Link>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-4 pb-20 sm:px-7">
        <div className="mt-9 text-center">
          <h1 className="font-heading text-[26px] font-bold tracking-[-0.01em]">
            {lang ? `${LANG_LABEL[lang]} leaderboard` : 'The climb, ranked.'}
          </h1>
          <p className="mt-1 text-[14px] text-ink-2">
            {rows.length} learner{rows.length === 1 ? '' : 's'} competing {timeWord}
          </p>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex rounded-[11px] border border-line bg-surface p-1">
            {LANG_TABS.map((t) => (
              <Link
                key={t.label}
                href={href(t.param, time)}
                className={`rounded-lg px-3 py-1 text-[13px] font-semibold ${
                  (lang ?? '') === (t.value ?? '')
                    ? 'bg-blue text-on-blue'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="inline-flex rounded-[11px] border border-line bg-surface p-1">
            {TIME_TABS.map((t) => (
              <Link
                key={t.value}
                href={href(lang ? LANG_TABS.find((l) => l.value === lang)!.param : '', t.value)}
                className={`rounded-lg px-3 py-1 text-[13px] font-semibold ${
                  time === t.value ? 'bg-blue text-on-blue' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-line-2 py-14 text-center">
            <p className="text-[32px]">🏁</p>
            <p className="mt-2 font-heading text-[17px] font-bold">No entries yet</p>
            <p className="mt-1 text-[13px] text-ink-2">
              Be the first on the board — solve a problem!
            </p>
            <Link
              href={practiceHref}
              className="mt-5 inline-block rounded-[9px] bg-blue px-4 py-2 text-[13px] font-semibold text-on-blue hover:bg-blue-600"
            >
              Start practicing
            </Link>
          </div>
        ) : (
          <>
            {/* Podium */}
            {podium.length > 0 && (
              <div className="mt-10 flex items-end justify-center gap-4">
                {[1, 0, 2].map((idx) => {
                  const r = podium[idx]
                  return (
                    <div key={r.userId} className="flex w-[110px] flex-col items-center sm:w-[150px]">
                      {idx === 0 && (
                        <span className="text-[22px] animate-[pp-float_3s_ease-in-out_infinite]">👑</span>
                      )}
                      <span
                        className={`grid size-12 place-items-center rounded-full text-[18px] font-semibold text-white ${PODIUM_AVATAR[idx]}`}
                      >
                        {r.handle.charAt(0).toUpperCase()}
                      </span>
                      <span
                        className={`mt-2 max-w-full truncate font-heading text-[14.5px] font-semibold ${PODIUM_NAME[idx]}`}
                      >
                        @{r.handle}
                      </span>
                      <span className="font-mono text-[12px] text-ink-3">{r.points} pts</span>
                      <div
                        className={`mt-2 w-full origin-bottom rounded-t-xl border-[1.5px] animate-[pp-bar_.9s_ease_both] ${
                          idx === 0 ? 'border-copper bg-copper-100' : 'bg-surface-2'
                        } ${idx === 1 ? 'border-blue' : ''} ${idx === 2 ? 'border-line-2' : ''}`}
                        style={{ height: PODIUM_HEIGHT[idx] }}
                      >
                        <span className="block pt-2 text-center font-mono text-[15px] font-bold text-ink-2">
                          {idx + 1}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Table */}
            {rest.length > 0 && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)]">
                <div
                  className={`${GRID} border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-3`}
                >
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-right">Solved</span>
                  <span className="text-right">Pts</span>
                  <span className="text-right">Acc</span>
                  <span className="text-right">Streak</span>
                </div>
                {rest.map((r: LeaderboardRow) => {
                  const isYou = user && r.userId === user.id
                  return (
                    <div
                      key={r.userId}
                      className={`${GRID} border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-blue-050 ${
                        isYou ? 'border-l-2 border-l-copper bg-copper-050 text-copper' : ''
                      }`}
                    >
                      <span className="font-mono text-[13px] text-ink-3">{r.rank}</span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue">
                          {r.handle.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-[13.5px] font-medium">
                          @{r.handle}
                          {isYou && <span className="ml-1.5 font-semibold text-copper">· you</span>}
                        </span>
                      </span>
                      <span className="text-right font-mono text-[13px]">{r.solved}</span>
                      <span className="text-right font-mono text-[13px] font-semibold">
                        {r.points}
                      </span>
                      <span className="text-right font-mono text-[13px]">{r.accuracy}%</span>
                      <span className="text-right font-mono text-[13px] text-copper">
                        🔥{r.streak}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pinned "you" row */}
            {user && !you && (
              <div className="mt-4 rounded-2xl border-[1.5px] border-copper bg-copper-050 px-4 py-3 text-center text-[13.5px] font-medium text-copper">
                @{user.handle} — no attempts {timeWord} yet. Solve something to enter the board!
              </div>
            )}
            {you && you.rank > 3 && (
              <div
                className={`${GRID} mt-4 rounded-2xl border-[1.5px] border-copper bg-copper-050 px-4 py-3 text-copper`}
              >
                <span className="font-mono text-[13px] font-bold">{you.rank}</span>
                <span className="text-[13.5px] font-semibold">You · @{you.handle}</span>
                <span className="text-right font-mono text-[13px]">{you.solved}</span>
                <span className="text-right font-mono text-[13px] font-bold">{you.points}</span>
                <span className="text-right font-mono text-[13px]">{you.accuracy}%</span>
                <span className="text-right font-mono text-[13px]">🔥{you.streak}</span>
              </div>
            )}
          </>
        )}

        {!user && (
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-block rounded-[10px] bg-copper px-5 py-2.5 text-[14px] font-semibold text-white hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(174,110,21,.32)]"
            >
              Sign in to compete →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
