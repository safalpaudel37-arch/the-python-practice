import { prisma } from '@/lib/prisma';
import { normalizeOutput } from '@/lib/utils';
import type { Language } from '@/lib/types';

type QuestionRow = {
  type: string;
  answer: string;
  alternative_answer: string | null;
  expected_output: string | null;
};

async function findQuestion(id: string, language: Language): Promise<QuestionRow | null> {
  const select = { type: true, answer: true, alternative_answer: true, expected_output: true } as const;
  if (language === 'javascript') {
    return prisma.javascript_questions.findUnique({ where: { id }, select });
  }
  if (language === 'sql') {
    return prisma.sql_questions.findUnique({ where: { id }, select });
  }
  return prisma.questions.findUnique({ where: { id }, select });
}

/**
 * Find which language table a question id belongs to.
 * Queries all three tables in parallel — no ID-prefix guessing.
 * Returns `null` if the id doesn't exist in any table.
 */
export async function findQuestionLanguage(id: string): Promise<Language | null> {
  const [py, js, sq] = await Promise.all([
    prisma.questions.findUnique({ where: { id }, select: { id: true } }),
    prisma.javascript_questions.findUnique({ where: { id }, select: { id: true } }),
    prisma.sql_questions.findUnique({ where: { id }, select: { id: true } }),
  ]);
  if (py) return 'python';
  if (js) return 'javascript';
  if (sq) return 'sql';
  return null;
}

/**
 * Server-side answer check (replaces the Supabase `check_answer` RPC).
 *
 * - `fill_in_the_blank`: case-insensitive trimmed token match against answer / alternative_answer.
 * - Everything else: normalised stdout match against expected_output (falling back to answer),
 *   also checking alternative_answer.
 */
export async function checkAnswerServer(
  questionId: string,
  userAnswer: string,
  language: Language,
): Promise<boolean> {
  const q = await findQuestion(questionId, language);
  if (!q) return false;

  if (q.type === 'fill_in_the_blank') {
    const norm = userAnswer.trim().toLowerCase();
    if (norm === q.answer.trim().toLowerCase()) return true;
    if (q.alternative_answer && norm === q.alternative_answer.trim().toLowerCase()) return true;
    return false;
  }

  const expected = q.expected_output ?? q.answer;
  if (!expected) return false;

  const normUser = normalizeOutput(userAnswer);
  if (normUser === normalizeOutput(expected)) return true;
  if (q.alternative_answer && normUser === normalizeOutput(q.alternative_answer)) return true;
  return false;
}
