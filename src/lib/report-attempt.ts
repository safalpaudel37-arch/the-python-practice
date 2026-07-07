import type { SolveReward } from '@/lib/tracking'

/**
 * Fire-and-forget attempt recording for client-checked question types.
 * Returns the solve reward (points/streak) when the server grants one.
 */
export async function reportAttempt(
  questionId: string,
  language: string,
  correct: boolean
): Promise<SolveReward | null> {
  try {
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, language, correct }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { reward?: SolveReward | null }
    return data.reward ?? null
  } catch {
    return null
  }
}
