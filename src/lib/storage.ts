import type { QuestionStatus } from './types'

type LastSession = {
  questionId: string
  tier: string
}

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    // Quick availability check — throws in some private-browsing modes or when quota is full
    const test = '__ls_test__'
    window.localStorage.setItem(test, test)
    window.localStorage.removeItem(test)
    return window.localStorage
  } catch {
    return null
  }
}

/** Wipes all guest data (progress, attempts, saved code, last session).
 *  Called when a signed-in user loads the app — their progress lives server-side. */
export function clearGuestData(): void {
  try {
    const ls = safeLocalStorage()
    if (!ls) return
    const doomed: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i)
      if (
        key &&
        (key.startsWith('qstatus:') ||
          key.startsWith('qattempts:') ||
          key.startsWith('qcode:') ||
          key === 'session:last')
      ) {
        doomed.push(key)
      }
    }
    doomed.forEach((k) => ls.removeItem(k))
  } catch { /* unavailable */ }
}

export function setQuestionStatus(id: string, status: QuestionStatus): void {
  try {
    const ls = safeLocalStorage()
    if (!ls) return
    if (ls.getItem(`qstatus:${id}`) === 'solved') return
    ls.setItem(`qstatus:${id}`, status)
  } catch { /* quota exceeded or unavailable */ }
}

export function getAllStatuses(): Record<string, QuestionStatus> {
  try {
    const ls = safeLocalStorage()
    if (!ls) return {}
    const result: Record<string, QuestionStatus> = {}
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i)
      if (key?.startsWith('qstatus:')) {
        const id = key.slice('qstatus:'.length)
        result[id] = (ls.getItem(key) as QuestionStatus) ?? 'not_started'
      }
    }
    return result
  } catch {
    return {}
  }
}

export function getAttemptCount(id: string): number {
  try {
    const ls = safeLocalStorage()
    return parseInt(ls?.getItem(`qattempts:${id}`) ?? '0', 10)
  } catch {
    return 0
  }
}

export function setAttemptCount(id: string, count: number): void {
  try {
    safeLocalStorage()?.setItem(`qattempts:${id}`, String(count))
  } catch { /* quota exceeded or unavailable */ }
}

export function getAllAttemptCounts(): Record<string, number> {
  try {
    const ls = safeLocalStorage()
    if (!ls) return {}
    const result: Record<string, number> = {}
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i)
      if (key?.startsWith('qattempts:')) {
        const id = key.slice('qattempts:'.length)
        result[id] = parseInt(ls.getItem(key) ?? '0', 10)
      }
    }
    return result
  } catch {
    return {}
  }
}

export function getSavedCode(id: string): string | null {
  try {
    return safeLocalStorage()?.getItem(`qcode:${id}`) ?? null
  } catch {
    return null
  }
}

export function setSavedCode(id: string, code: string): void {
  try {
    safeLocalStorage()?.setItem(`qcode:${id}`, code)
  } catch { /* quota exceeded or unavailable */ }
}

export function getLastSession(): LastSession | null {
  try {
    const raw = safeLocalStorage()?.getItem('session:last')
    if (!raw) return null
    return JSON.parse(raw) as LastSession
  } catch {
    return null
  }
}

export function setLastSession(questionId: string, tier: string): void {
  try {
    safeLocalStorage()?.setItem(
      'session:last',
      JSON.stringify({ questionId, tier })
    )
  } catch { /* quota exceeded or unavailable */ }
}
