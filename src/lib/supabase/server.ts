import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cookie-backed Supabase client for Server Components, Server Actions and
 * Route Handlers. Auth session lives in cookies (set by the auth actions and
 * refreshed by proxy.ts).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env.local')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — safe to ignore, proxy.ts
          // handles session refresh.
        }
      },
    },
  })
}
