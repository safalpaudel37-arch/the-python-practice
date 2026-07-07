import { prisma } from '@/lib/prisma'
import { TIER_ORDER } from '@/lib/config'

export type Timeframe = 'week' | 'month' | 'all'
export type LeaderboardLanguage = 'python' | 'javascript' | 'sql'

export type LeaderboardRow = {
  userId: string
  handle: string
  name: string | null
  solved: number
  points: number
  accuracy: number // 0–100
  streak: number
  rank: number
}

const POINTS_PER_SOLVE = 10

function windowStart(timeframe: Timeframe): Date | null {
  if (timeframe === 'all') return null
  const days = timeframe === 'week' ? 7 : 30
  return new Date(Date.now() - days * 86_400_000)
}

export async function getLeaderboard(opts: {
  language?: LeaderboardLanguage
  timeframe: Timeframe
}): Promise<LeaderboardRow[]> {
  const { language, timeframe } = opts
  const start = windowStart(timeframe)

  try {
    const [solvedGroups, attemptGroups, correctGroups] = await Promise.all([
      prisma.progress.groupBy({
        by: ['userId'],
        where: {
          status: 'SOLVED',
          ...(language ? { language } : {}),
          ...(start ? { solvedAt: { gte: start } } : {}),
        },
        _count: { _all: true },
      }),
      prisma.attempt.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          ...(language ? { language } : {}),
          ...(start ? { createdAt: { gte: start } } : {}),
        },
        _count: { _all: true },
      }),
      prisma.attempt.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          correct: true,
          ...(language ? { language } : {}),
          ...(start ? { createdAt: { gte: start } } : {}),
        },
        _count: { _all: true },
      }),
    ])

    const solvedMap = new Map(solvedGroups.map((g) => [g.userId, g._count._all]))
    const attemptsMap = new Map(attemptGroups.map((g) => [g.userId!, g._count._all]))
    const correctMap = new Map(correctGroups.map((g) => [g.userId!, g._count._all]))

    const userIds = [...attemptsMap.keys()]
    if (userIds.length === 0) return []

    const profiles = await prisma.profile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, handle: true, name: true, points: true, currentStreak: true },
    })

    const rows = profiles
      .map((p) => {
        const attempts = attemptsMap.get(p.id) ?? 0
        const correct = correctMap.get(p.id) ?? 0
        const solved = solvedMap.get(p.id) ?? 0
        return {
          userId: p.id,
          handle: p.handle,
          name: p.name,
          solved,
          points: start ? solved * POINTS_PER_SOLVE : p.points,
          accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
          streak: p.currentStreak,
          rank: 0,
        }
      })
      .filter((r) => (attemptsMap.get(r.userId) ?? 0) > 0)
      .sort((a, b) => b.points - a.points || b.solved - a.solved)
      .slice(0, 50)

    rows.forEach((r, i) => (r.rank = i + 1))
    return rows
  } catch (e) {
    console.error('[leaderboard] getLeaderboard failed', e)
    return []
  }
}

export type UserStats = {
  totalSolved: number
  totalAttempts: number
  accuracy: number
  rank: number | null
  joined: Date | null
  solvedByTier: Record<string, { solved: number; total: number }>
  /** Daily attempt counts, oldest → newest, exactly `days` entries. */
  heatmap: { date: string; count: number }[]
}

export async function getUserStats(userId: string, days = 70): Promise<UserStats> {
  const empty: UserStats = {
    totalSolved: 0,
    totalAttempts: 0,
    accuracy: 0,
    rank: null,
    joined: null,
    solvedByTier: Object.fromEntries(TIER_ORDER.map((t) => [t, { solved: 0, total: 0 }])),
    heatmap: [],
  }

  try {
    const since = new Date(Date.now() - days * 86_400_000)
    const [profile, totalAttempts, correctAttempts, solvedRows, tierTotals, recent] =
      await Promise.all([
        prisma.profile.findUnique({ where: { id: userId } }),
        prisma.attempt.count({ where: { userId } }),
        prisma.attempt.count({ where: { userId, correct: true } }),
        prisma.progress.findMany({
          where: { userId, status: 'SOLVED' },
          select: { questionId: true, language: true },
        }),
        prisma.questions.groupBy({ by: ['tier'], _count: { _all: true } }),
        prisma.attempt.findMany({
          where: { userId, createdAt: { gte: since } },
          select: { createdAt: true },
        }),
      ])

    // Solved-by-tier (python questions only — tiers live in the questions table).
    const pySolvedIds = solvedRows.filter((r) => r.language === 'python').map((r) => r.questionId)
    const solvedTiers =
      pySolvedIds.length > 0
        ? await prisma.questions.findMany({
            where: { id: { in: pySolvedIds } },
            select: { tier: true },
          })
        : []
    const solvedByTier = Object.fromEntries(
      TIER_ORDER.map((t) => [
        t,
        {
          solved: solvedTiers.filter((q) => q.tier === t).length,
          total: tierTotals.find((g) => g.tier === t)?._count._all ?? 0,
        },
      ])
    )

    // Activity heatmap: bucket attempts per UTC day.
    const buckets = new Map<string, number>()
    for (const a of recent) {
      const key = a.createdAt.toISOString().slice(0, 10)
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    const heatmap: { date: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
      heatmap.push({ date: d, count: buckets.get(d) ?? 0 })
    }

    const rank =
      profile && totalAttempts > 0
        ? (await prisma.profile.count({ where: { points: { gt: profile.points } } })) + 1
        : null

    return {
      totalSolved: solvedRows.length,
      totalAttempts,
      accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
      rank,
      joined: profile?.createdAt ?? null,
      solvedByTier,
      heatmap,
    }
  } catch (e) {
    console.error('[leaderboard] getUserStats failed', e)
    return empty
  }
}
