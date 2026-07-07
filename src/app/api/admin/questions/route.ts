import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/app/admin/require-admin'

const LANGUAGES = ['python', 'javascript', 'sql'] as const
const TIERS = new Set(['simple', 'intermediate', 'hard', 'expert'])
const TYPES = new Set([
  'write_the_code',
  'fill_in_the_blank',
  'output_prediction',
  'what_is_the_result',
  'spot_the_bug',
])

type Lang = (typeof LANGUAGES)[number]

type QuestionInput = {
  id: string
  language: Lang
  tier: string
  topic: string
  type: string
  question: string
  answer: string
  alternative_answer: string | null
  explanation: string
  expected_output: string | null
}

function parseBody(body: unknown): QuestionInput | string {
  const b = body as Record<string, unknown>
  const str = (k: string, max: number, required = true): string | null => {
    const v = b[k]
    if (typeof v !== 'string' || v.trim() === '') return required ? null : ''
    if (v.length > max) return null
    return v
  }

  const id = str('id', 30)
  const language = typeof b.language === 'string' ? b.language : ''
  const tier = str('tier', 20)
  const topic = str('topic', 60)
  const type = str('type', 30)
  const question = str('question', 10_000)
  const answer = str('answer', 10_000)
  const explanation = str('explanation', 10_000)
  const alt = typeof b.alternative_answer === 'string' ? b.alternative_answer.slice(0, 10_000) : ''
  const expected = typeof b.expected_output === 'string' ? b.expected_output.slice(0, 10_000) : ''

  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return 'Invalid id'
  if (!LANGUAGES.includes(language as Lang)) return 'Invalid language'
  if (!tier || !TIERS.has(tier)) return 'Invalid tier'
  if (!topic) return 'Topic is required'
  if (!type || !TYPES.has(type)) return 'Invalid type'
  if (!question) return 'Question is required'
  if (!answer) return 'Answer is required'
  if (!explanation) return 'Explanation is required'

  return {
    id,
    language: language as Lang,
    tier,
    topic,
    type,
    question,
    answer,
    alternative_answer: alt || null,
    explanation,
    expected_output: expected || null,
  }
}

function rowData(q: QuestionInput) {
  return {
    tier: q.tier,
    topic: q.topic,
    type: q.type,
    question: q.question,
    answer: q.answer,
    alternative_answer: q.alternative_answer,
    explanation: q.explanation,
    expected_output: q.expected_output,
  }
}

async function guard() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

async function readJson(req: NextRequest): Promise<unknown | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  const body = await readJson(req)
  const parsed = parseBody(body)
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 })
  }

  try {
    const data = { id: parsed.id, ...rowData(parsed) }
    const row =
      parsed.language === 'python'
        ? await prisma.questions.create({ data: { ...data, language: 'python' } })
        : parsed.language === 'javascript'
          ? await prisma.javascript_questions.create({ data })
          : await prisma.sql_questions.create({ data })
    return NextResponse.json({ ok: true, question: row })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: `Question ${parsed.id} already exists` }, { status: 409 })
    }
    console.error('[admin/questions] create failed', e)
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  const body = await readJson(req)
  const parsed = parseBody(body)
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 })
  }

  try {
    const data = rowData(parsed)
    const row =
      parsed.language === 'python'
        ? await prisma.questions.update({ where: { id: parsed.id }, data })
        : parsed.language === 'javascript'
          ? await prisma.javascript_questions.update({ where: { id: parsed.id }, data })
          : await prisma.sql_questions.update({ where: { id: parsed.id }, data })
    return NextResponse.json({ ok: true, question: row })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    console.error('[admin/questions] update failed', e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  const body = (await readJson(req)) as { id?: unknown; language?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  const language = typeof body?.language === 'string' ? body.language : ''
  if (!id || !LANGUAGES.includes(language as Lang)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    if (language === 'python') await prisma.questions.delete({ where: { id } })
    else if (language === 'javascript') await prisma.javascript_questions.delete({ where: { id } })
    else await prisma.sql_questions.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    console.error('[admin/questions] delete failed', e)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
