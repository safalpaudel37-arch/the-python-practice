/**
 * Single source of truth for validating question rows, shared by every insert
 * path: the admin panel form (client), `/api/admin/questions` (CRUD), and
 * `/api/admin/add-questions` (dev bulk upsert). A machine-readable copy for
 * direct DB inserts (e.g. via an MCP server) lives in
 * `docs/python-question.schema.json` — keep the two in sync.
 *
 * Why the per-type rules exist (Python):
 * - `write_the_code` / `fill_in_the_blank` / `spot_the_bug` are graded by
 *   running the learner's code and comparing its stdout to `expected_output`
 *   (`src/lib/answer-check.ts`). Without `expected_output` the checker falls
 *   back to `answer` — the solution *source code* — which stdout can never
 *   equal, so every submission is marked incorrect. Hence it is required.
 * - `fill_in_the_blank` questions must contain `___` blank markers, and (like
 *   `spot_the_bug`) a blank line separating prose from the code that
 *   pre-populates the editor (`splitPrompt` in `src/lib/questions.ts`).
 * - `output_prediction` / `what_is_the_result` compare the learner's typed
 *   answer to `expected_output ?? answer`, so `answer` must be the exact
 *   output string and `expected_output` may be omitted.
 */

export const QUESTION_LANGUAGES = ['python', 'javascript', 'sql'] as const
export type QuestionLanguage = (typeof QUESTION_LANGUAGES)[number]

export const QUESTION_TIERS = ['simple', 'intermediate', 'hard', 'expert'] as const

export const QUESTION_TYPES = [
  'write_the_code',
  'fill_in_the_blank',
  'output_prediction',
  'what_is_the_result',
  'spot_the_bug',
] as const

/** Python types graded by running code and comparing stdout to `expected_output`. */
export const RUN_GRADED_TYPES = new Set(['write_the_code', 'fill_in_the_blank', 'spot_the_bug'])

/** Types graded by comparing the learner's typed answer to `expected_output ?? answer`. */
export const PREDICTION_TYPES = new Set(['output_prediction', 'what_is_the_result'])

export const FIELD_LIMITS = {
  id: 30,
  topic: 60,
  question: 10_000,
  answer: 10_000,
  alternative_answer: 10_000,
  explanation: 10_000,
  expected_output: 10_000,
} as const

export const ID_PATTERN = /^[A-Za-z0-9_-]+$/

export type QuestionRecord = {
  id: string
  language: QuestionLanguage
  tier: string
  topic: string
  type: string
  question: string
  answer: string
  alternative_answer: string | null
  explanation: string
  expected_output: string | null
}

export type FieldError = { field: string; message: string }

const LANGUAGE_SET = new Set<string>(QUESTION_LANGUAGES)
const TIER_SET = new Set<string>(QUESTION_TIERS)
const TYPE_SET = new Set<string>(QUESTION_TYPES)

/**
 * Validate a candidate question row. `language` may come from the row itself
 * or be forced by the caller (e.g. the bulk endpoint's `table` param).
 * Returns the normalised record plus any errors; `question` is null when
 * the input is unusable.
 */
export function validateQuestion(
  input: unknown,
  forcedLanguage?: QuestionLanguage
): { question: QuestionRecord | null; errors: FieldError[] } {
  const errors: FieldError[] = []

  if (typeof input !== 'object' || input === null) {
    return { question: null, errors: [{ field: 'root', message: 'must be an object' }] }
  }
  const b = input as Record<string, unknown>

  const requiredStr = (field: keyof typeof FIELD_LIMITS): string => {
    const v = b[field]
    if (typeof v !== 'string' || v.trim() === '') {
      errors.push({ field, message: 'must be a non-empty string' })
      return ''
    }
    if (v.length > FIELD_LIMITS[field]) {
      errors.push({ field, message: `must be at most ${FIELD_LIMITS[field]} characters` })
      return ''
    }
    return v
  }

  const optionalStr = (field: 'alternative_answer' | 'expected_output'): string | null => {
    const v = b[field]
    if (v === null || v === undefined || v === '') return null
    if (typeof v !== 'string') {
      errors.push({ field, message: 'must be a string or null' })
      return null
    }
    if (v.trim() === '') return null
    if (v.length > FIELD_LIMITS[field]) {
      errors.push({ field, message: `must be at most ${FIELD_LIMITS[field]} characters` })
      return null
    }
    return v
  }

  const id = requiredStr('id').trim()
  if (id && !ID_PATTERN.test(id)) {
    errors.push({ field: 'id', message: 'may only contain letters, digits, "_" and "-"' })
  }

  const language = forcedLanguage ?? (typeof b.language === 'string' ? b.language : '')
  if (!LANGUAGE_SET.has(language)) {
    errors.push({ field: 'language', message: `must be one of: ${QUESTION_LANGUAGES.join(', ')}` })
  }

  const tier = typeof b.tier === 'string' ? b.tier : ''
  if (!TIER_SET.has(tier)) {
    errors.push({ field: 'tier', message: `must be one of: ${QUESTION_TIERS.join(', ')}` })
  }

  const type = typeof b.type === 'string' ? b.type : ''
  if (!TYPE_SET.has(type)) {
    errors.push({ field: 'type', message: `must be one of: ${QUESTION_TYPES.join(', ')}` })
  }

  const topic = requiredStr('topic').trim()
  const question = requiredStr('question')
  const answer = requiredStr('answer')
  const explanation = requiredStr('explanation')
  const alternative_answer = optionalStr('alternative_answer')
  const expected_output = optionalStr('expected_output')

  // Python-specific per-type rules — these are what keep the answer checker working.
  if (language === 'python' && question && answer) {
    if (RUN_GRADED_TYPES.has(type) && !expected_output) {
      errors.push({
        field: 'expected_output',
        message:
          'is required for run-graded types — the checker compares the learner’s stdout against it (run the solution to capture its output)',
      })
    }
    if (type === 'fill_in_the_blank' && !question.includes('___')) {
      errors.push({ field: 'question', message: 'must contain ___ blank markers for fill_in_the_blank' })
    }
    if ((type === 'fill_in_the_blank' || type === 'spot_the_bug') && !question.includes('\n\n')) {
      errors.push({
        field: 'question',
        message: 'must contain a blank line separating the prose from the code block that pre-fills the editor',
      })
    }
  }

  if (errors.length > 0) return { question: null, errors }

  return {
    question: {
      id,
      language: language as QuestionLanguage,
      tier,
      topic,
      type,
      question,
      answer,
      alternative_answer,
      explanation,
      expected_output,
    },
    errors,
  }
}
