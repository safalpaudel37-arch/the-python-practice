import { prisma } from '@/lib/prisma'

const POINTS_PER_SOLVE = 10

export type SolveReward = {
  points: number
  streak: number
  firstSolve: boolean
}

/** UTC calendar date (00:00) — streaks are day-based. */
function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * Records one submission. For signed-in users also updates their per-question
 * progress and, on a first correct solve, awards points and advances the streak.
 * Never throws — tracking must not break answer checking.
 */
export async function recordAttempt(opts: {
  userId: string | null
  questionId: string
  language: string
  correct: boolean
}): Promise<SolveReward | null> {
  const { userId, questionId, language, correct } = opts
  try {
    await prisma.attempt.create({ data: { userId, questionId, language, correct } })
    if (!userId) return null

    const existing = await prisma.progress.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })
    const alreadySolved = existing?.status === 'SOLVED'
    const firstSolve = correct && !alreadySolved

    await prisma.progress.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: {
        userId,
        questionId,
        language,
        status: correct ? 'SOLVED' : 'ATTEMPTED',
        attempts: 1,
        solvedAt: correct ? new Date() : null,
      },
      update: {
        attempts: { increment: 1 },
        ...(firstSolve ? { status: 'SOLVED' as const, solvedAt: new Date() } : {}),
      },
    })

    const profile = await prisma.profile.findUnique({ where: { id: userId } })
    if (!profile) return null

    if (!firstSolve) {
      return correct
        ? { points: profile.points, streak: profile.currentStreak, firstSolve: false }
        : null
    }

    // First solve of this question: points + streak.
    const today = utcToday()
    let streak = 1
    if (profile.lastSolvedOn) {
      const gap = daysBetween(profile.lastSolvedOn, today)
      if (gap === 0) streak = profile.currentStreak
      else if (gap === 1) streak = profile.currentStreak + 1
    }

    const updated = await prisma.profile.update({
      where: { id: userId },
      data: {
        points: { increment: POINTS_PER_SOLVE },
        currentStreak: streak,
        bestStreak: Math.max(profile.bestStreak, streak),
        lastSolvedOn: today,
      },
    })

    return { points: updated.points, streak: updated.currentStreak, firstSolve: true }
  } catch (e) {
    console.error('[tracking] recordAttempt failed', e)
    return null
  }
}

export type QuestionStats = {
  attempts: number
  users: number
  solves: number
  solveRate: number // 0–100, share of attempting users who solved it
}

/** Community stats per question for one language, in a single query. */
export async function getQuestionStatsByLanguage(
  language: string
): Promise<Record<string, QuestionStats>> {
  try {
    const rows = await prisma.$queryRaw<
      { question_id: string; attempts: bigint; users: bigint; solvers: bigint }[]
    >`
      SELECT
        question_id,
        count(*)                                                              AS attempts,
        count(DISTINCT coalesce(user_id::text, 'anon'))                       AS users,
        count(DISTINCT coalesce(user_id::text, 'anon')) FILTER (WHERE correct) AS solvers
      FROM attempts
      WHERE language = ${language}
      GROUP BY question_id
    `
    const out: Record<string, QuestionStats> = {}
    for (const r of rows) {
      const attempts = Number(r.attempts)
      const users = Number(r.users)
      const solvers = Number(r.solvers)
      out[r.question_id] = {
        attempts,
        users,
        solves: solvers,
        solveRate: users > 0 ? Math.round((solvers / users) * 100) : 0,
      }
    }
    return out
  } catch (e) {
    console.error('[tracking] getQuestionStatsByLanguage failed', e)
    return {}
  }
}
