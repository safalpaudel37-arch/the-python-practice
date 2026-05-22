import { getClient } from './client'
import type { Language, Question } from '../types'

export async function getQuestions(language?: Language): Promise<Question[]> {
  let query = getClient()
    .from('questions')
    .select('id, tier, topic, type, question, answer, alternative_answer, explanation, language, created_at')
    .order('tier', { ascending: false })
    .order('id', { ascending: true })

  if (language) {
    query = query.eq('language', language)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Question[]
}
