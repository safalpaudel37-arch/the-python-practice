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
 * Compares the user's normalised stdout against `expected_output` (falling back to
 * `answer`), also checking `alternative_answer`. This is the Python path for
 * `write_the_code`, `fill_in_the_blank`, and `spot_the_bug` (all run the user's code
 * and are graded by output). JS/SQL grade client-side and send `correct` directly,
 * so they never reach here. Prediction types (`output_prediction`,
 * `what_is_the_result`) compare the typed answer against `expected_output`/`answer`.
 */
export async function checkAnswerServer(
  questionId: string,
  userAnswer: string,
  language: Language,
): Promise<boolean> {
  const q = await findQuestion(questionId, language);
  if (!q) return false;

  const expected = q.expected_output ?? q.answer;
  if (!expected) return false;

  const normUser = normalizeOutput(userAnswer);
  if (normUser === normalizeOutput(expected)) return true;
  if (q.alternative_answer && normUser === normalizeOutput(q.alternative_answer)) return true;
  return false;
}
