import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/user'
import { recordAttempt } from '@/lib/tracking'
import { getClientIp, makeRateLimiter } from '@/lib/api/rate-limit'

const LANGUAGES = new Set(['python', 'javascript', 'sql'])

const checkRateLimit = makeRateLimiter(30)
const MAX_ANSWER_LENGTH = 10_000
const MAX_QUESTION_ID_LENGTH = 100

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { questionId, userAnswer, language, correct: clientCorrect } =
    (body as { questionId?: unknown; userAnswer?: unknown; language?: unknown; correct?: unknown }) ?? {}

  if (typeof questionId !== 'string' || questionId.length === 0 || questionId.length > MAX_QUESTION_ID_LENGTH) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (typeof language !== 'string' || !LANGUAGES.has(language)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Client-checked types (SQL/JS write_the_code) supply `correct` directly and skip the RPC.
  // Server-checked types omit `correct` and must provide `userAnswer` for the Supabase RPC.
  let correct: boolean
  if (typeof clientCorrect === 'boolean') {
    correct = clientCorrect
  } else {
    if (typeof userAnswer !== 'string' || userAnswer.length > MAX_ANSWER_LENGTH) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { data, error } = await getClient().rpc('check_answer', {
      question_id: questionId,
      user_answer: userAnswer,
    })

    if (error) {
      console.error('[check-answer]', error.message)
      return NextResponse.json({ error: 'Could not verify answer' }, { status: 500 })
    }

    correct = typeof data === 'boolean' ? data : false
  }

  const user = await getCurrentUser()
  const reward = await recordAttempt({
    userId: user?.id ?? null,
    questionId,
    language,
    correct,
  })

  return NextResponse.json({ correct, reward })
}
