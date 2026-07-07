import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase auth session on every request so server components
 * always see a valid token (they can read cookies but never write them).
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Triggers a token refresh when the access token is expired.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Skip static assets; run on pages and API routes.
    '/((?!_next/static|_next/image|favicon.ico|pyodide-worker.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|woff2?)$).*)',
  ],
}
