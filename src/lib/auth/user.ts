import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export type CurrentUser = {
  id: string
  email: string
  handle: string
  name: string | null
  role: 'LEARNER' | 'ADMIN'
  points: number
  currentStreak: number
  bestStreak: number
}

function baseHandle(user: User): string {
  const fromName = (user.user_metadata?.name as string | undefined)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  const fromEmail = user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '')
  return (fromName || fromEmail || 'learner').slice(0, 20) || 'learner'
}

function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase())
}

async function ensureProfile(user: User) {
  const existing = await prisma.profile.findUnique({ where: { id: user.id } })
  if (existing) return existing

  const email = user.email!
  const base = baseHandle(user)
  // Retry with a numeric suffix if the handle is taken.
  for (let i = 0; i < 5; i++) {
    const handle = i === 0 ? base : `${base}${Math.floor(Math.random() * 10000)}`
    try {
      return await prisma.profile.create({
        data: {
          id: user.id,
          email,
          handle,
          name: (user.user_metadata?.name as string | undefined) ?? null,
          role: isAdminEmail(email) ? 'ADMIN' : 'LEARNER',
        },
      })
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      if (code !== 'P2002') throw e
      // Unique clash: if it was the id (concurrent create), fetch it.
      const raced = await prisma.profile.findUnique({ where: { id: user.id } })
      if (raced) return raced
    }
  }
  throw new Error('Could not allocate a unique handle')
}

/**
 * The signed-in user with their profile, or null for guests.
 * Cached per request; creates the Profile row on first sight of a user.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return null

    const profile = await ensureProfile(user)
    return {
      id: profile.id,
      email: profile.email,
      handle: profile.handle,
      name: profile.name,
      role: profile.role,
      points: profile.points,
      currentStreak: profile.currentStreak,
      bestStreak: profile.bestStreak,
    }
  } catch (e) {
    console.error('[auth] getCurrentUser failed', e)
    return null
  }
})
