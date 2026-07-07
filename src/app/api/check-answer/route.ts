import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/user'
import { recordAttempt } from '@/lib/tracking'

const LANGUAGES = new Set(['python', 'javascript', 'sql'])

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const WINDOW_MS = 60_000
const MAX_ANSWER_LENGTH = 10_000
const MAX_QUESTION_ID_LENGTH = 100

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

function getClientIp(req: NextRequest): string {
  // Prefer headers set by trusted reverse proxies/CDNs over the spoofable x-forwarded-for chain
  return (
    req.headers.get('cf-connecting-ip') ??          // Cloudflare
    req.headers.get('x-real-ip') ??                  // nginx / load balancers
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? // last entry = outermost proxy
    'unknown'
  )
}

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

  const { questionId, userAnswer, language } =
    (body as { questionId?: unknown; userAnswer?: unknown; language?: unknown }) ?? {}

  if (typeof questionId !== 'string' || typeof userAnswer !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const lang = typeof language === 'string' && LANGUAGES.has(language) ? language : 'python'

  if (questionId.length === 0 || questionId.length > MAX_QUESTION_ID_LENGTH) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (userAnswer.length > MAX_ANSWER_LENGTH) {
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

  const correct = typeof data === 'boolean' ? data : false

  // Record the attempt (community stats + per-user progress). Never blocks the answer.
  const user = await getCurrentUser()
  const reward = await recordAttempt({
    userId: user?.id ?? null,
    questionId,
    language: lang,
    correct,
  })

  return NextResponse.json({ correct, reward })
}
