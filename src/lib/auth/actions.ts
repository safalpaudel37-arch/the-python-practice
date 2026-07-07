'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type AuthFormState = {
  error?: string
  message?: string
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!validEmail(email)) return { error: 'Enter a valid email address.' }
  if (!password) return { error: 'Enter your password.' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message === 'Invalid login credentials'
      ? 'Wrong email or password.'
      : error.message }
  }

  redirect('/python')
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!name) return { error: 'Tell us your name.' }
  if (!validEmail(email)) return { error: 'Enter a valid email address.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) return { error: error.message }

  // If email confirmation is enabled there is no session yet.
  if (!data.session) {
    return { message: 'Check your inbox to confirm your email, then log in.' }
  }

  redirect('/python')
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
