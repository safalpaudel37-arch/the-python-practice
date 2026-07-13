// Dev-only bulk question insert. Disabled in production (NODE_ENV=production).
// Requires SUPABASE_SERVICE_ROLE_KEY and ADMIN_SECRET in .env.local. See AGENTS.md.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin-client'

const TABLE_MAP: Record<string, string> = {
  javascript: 'javascript_questions',
  python:     'questions',
  sql:        'sql_questions',
}

const VALID_TIERS = ['simple', 'intermediate', 'hard', 'expert'] as const
const VALID_TYPES = [
  'write_the_code',
  'fill_in_the_blank',
  'output_prediction',
  'spot_the_bug',
  'what_is_the_result',
] as const

const MAX_BATCH = 100

interface QuestionInput {
  id: string
  tier: string
  topic: string
  type: string
  question: string
  answer: string
  alternative_answer: string | null
  explanation: string
  expected_output?: string | null
}

interface ValidationError {
  index: number
  field: string
  message: string
}

function validateQuestions(questions: unknown[]): ValidationError[] {
  const errors: ValidationError[] = []

  questions.forEach((q, i) => {
    if (typeof q !== 'object' || q === null) {
      errors.push({ index: i, field: 'root', message: 'must be an object' })
      return
    }
    const item = q as Record<string, unknown>

    if (typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push({ index: i, field: 'id', message: 'must be a non-empty string' })
    }
    if (!VALID_TIERS.includes(item.tier as never)) {
      errors.push({ index: i, field: 'tier', message: `must be one of: ${VALID_TIERS.join(', ')}` })
    }
    if (typeof item.topic !== 'string' || item.topic.trim() === '') {
      errors.push({ index: i, field: 'topic', message: 'must be a non-empty string' })
    }
    if (!VALID_TYPES.includes(item.type as never)) {
      errors.push({ index: i, field: 'type', message: `must be one of: ${VALID_TYPES.join(', ')}` })
    }
    if (typeof item.question !== 'string' || item.question.trim() === '') {
      errors.push({ index: i, field: 'question', message: 'must be a non-empty string' })
    }
    if (typeof item.answer !== 'string' || item.answer.trim() === '') {
      errors.push({ index: i, field: 'answer', message: 'must be a non-empty string' })
    }
    if (item.alternative_answer !== null && typeof item.alternative_answer !== 'string') {
      errors.push({ index: i, field: 'alternative_answer', message: 'must be a string or null' })
    }
    if (typeof item.explanation !== 'string' || item.explanation.trim() === '') {
      errors.push({ index: i, field: 'explanation', message: 'must be a non-empty string' })
    }
    if ('expected_output' in item && item.expected_output !== null && typeof item.expected_output !== 'string') {
      errors.push({ index: i, field: 'expected_output', message: 'must be a string or null' })
    }
  })

  return errors
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { secret, table, questions } = body as Record<string, unknown>

  // Auth check — generic message to avoid leaking which part failed
  if (typeof secret !== 'string' || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (typeof table !== 'string' || !(table in TABLE_MAP)) {
    return NextResponse.json(
      { error: `Invalid table. Must be one of: ${Object.keys(TABLE_MAP).join(', ')}` },
      { status: 400 }
    )
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'questions must be a non-empty array' }, { status: 400 })
  }

  if (questions.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BATCH} questions per request` },
      { status: 400 }
    )
  }

  const validationErrors = validateQuestions(questions)
  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 400 })
  }

  const rows = (questions as QuestionInput[]).map((q) => ({
    id:                 q.id.trim(),
    tier:               q.tier,
    topic:              q.topic.trim(),
    type:               q.type,
    question:           q.question,
    answer:             q.answer,
    alternative_answer: q.alternative_answer ?? null,
    explanation:        q.explanation,
    expected_output:    q.expected_output ?? null,
  }))

  const tableName = TABLE_MAP[table]
  const { error, count } = await getAdminClient()
    .from(tableName)
    .upsert(rows, { onConflict: 'id', count: 'exact' })

  if (error) {
    console.error('[admin/add-questions]', error.message, error.details)
    return NextResponse.json({ error: 'Failed to insert questions' }, { status: 500 })
  }

  return NextResponse.json({ inserted: count ?? rows.length, errors: [] })
}
