import { cache } from 'react'
import { getClient } from './client'
import type { Language, Question } from '../types'

const TABLE_MAP: Record<string, string> = {
  python: 'questions',
  javascript: 'javascript_questions',
  sql: 'sql_questions',
}

export const getQuestions = cache(async function getQuestions(language?: Language): Promise<Question[]> {
  const table = language ? (TABLE_MAP[language] ?? 'questions') : 'questions'

  const { data, error } = await getClient()
    .from(table)
    .select('id, tier, topic, type, question, answer, alternative_answer, explanation')
    .order('tier', { ascending: false })
    .order('id', { ascending: true })

  if (error) throw error

  return (data as Question[]).map((row) => ({
    ...row,
    language: language ?? 'python',
  }))
})
