import { prisma } from '@/lib/prisma'
import { blockAdmins } from '@/lib/auth/admin'
import LandingClient, { type TopLearner } from './LandingClient'

export const dynamic = 'force-dynamic'

export default async function Home() {
  await blockAdmins()
  let problemCount = 0
  let top: TopLearner[] = []

  try {
    const [py, js, sq] = await Promise.all([
      prisma.questions.count(),
      prisma.javascript_questions.count(),
      prisma.sql_questions.count(),
    ])
    problemCount = py + js + sq

    const profiles = await prisma.profile.findMany({
      where: { points: { gt: 0 } },
      orderBy: { points: 'desc' },
      take: 3,
      select: { id: true, handle: true, points: true },
    })
    if (profiles.length > 0) {
      const solvedCounts = await prisma.progress.groupBy({
        by: ['userId'],
        where: { userId: { in: profiles.map((p) => p.id) }, status: 'SOLVED' },
        _count: { _all: true },
      })
      const solvedMap = new Map(solvedCounts.map((s) => [s.userId, s._count._all]))
      top = profiles.map((p) => ({
        handle: p.handle,
        points: p.points,
        solved: solvedMap.get(p.id) ?? 0,
      }))
    }
  } catch (e) {
    console.error('[landing] stats fetch failed', e)
  }

  return <LandingClient problemCount={problemCount} topLearners={top} />
}
