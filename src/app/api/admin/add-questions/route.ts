// Dev-only bulk question insert. Disabled in production (NODE_ENV=production).
// Requires SUPABASE_SERVICE_ROLE_KEY and ADMIN_SECRET in .env.local. See AGENTS.md.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin-client'
import { validateQuestion, type QuestionLanguage, type QuestionRecord } from '@/lib/question-schema'

const TABLE_MAP: Record<string, string> = {
  javascript: 'javascript_questions',
  python:     'questions',
  sql:        'sql_questions',
}

const MAX_BATCH = 100

interface ValidationError {
  index: number
  field: string
  message: string
}

// Per-item validation via the shared schema (src/lib/question-schema.ts) —
// the table param decides the language, so python rows get the python
// per-type rules (expected_output required for run-graded types, etc.).
function validateQuestions(
  questions: unknown[],
  language: QuestionLanguage
): { rows: QuestionRecord[]; errors: ValidationError[] } {
  const rows: QuestionRecord[] = []
  const errors: ValidationError[] = []

  questions.forEach((q, i) => {
    const { question, errors: fieldErrors } = validateQuestion(q, language)
    if (question) rows.push(question)
    else fieldErrors.forEach((e) => errors.push({ index: i, ...e }))
  })

  return { rows, errors }
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

  const { rows: validated, errors: validationErrors } = validateQuestions(
    questions,
    table as QuestionLanguage
  )
  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 400 })
  }

  const rows = validated.map((q) => ({
    id:                 q.id,
    tier:               q.tier,
    topic:              q.topic,
    type:               q.type,
    question:           q.question,
    answer:             q.answer,
    alternative_answer: q.alternative_answer,
    explanation:        q.explanation,
    expected_output:    q.expected_output,
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
