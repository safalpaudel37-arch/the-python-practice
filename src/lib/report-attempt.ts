import type { SolveReward } from '@/lib/tracking'

/**
 * Fire-and-forget attempt recording for client-checked question types
 * (SQL / JavaScript write_the_code run entirely in the browser).
 * Sends `correct` directly to /api/check-answer, which skips the Supabase
 * RPC when `correct` is present. Returns the solve reward when granted.
 */
export async function reportAttempt(
  questionId: string,
  language: string,
  correct: boolean
): Promise<SolveReward | null> {
  try {
    const res = await fetch('/api/check-answer', {
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
