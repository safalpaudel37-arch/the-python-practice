import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth/admin'
import {
  QUESTION_LANGUAGES,
  validateQuestion,
  type QuestionLanguage,
  type QuestionRecord,
} from '@/lib/question-schema'

type Lang = QuestionLanguage
const LANGUAGES = QUESTION_LANGUAGES

function parseBody(body: unknown): QuestionRecord | string {
  const { question, errors } = validateQuestion(body)
  if (!question) {
    const first = errors[0]
    return first ? `${first.field} ${first.message}` : 'Invalid request'
  }
  return question
}

function rowData(q: QuestionRecord) {
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
