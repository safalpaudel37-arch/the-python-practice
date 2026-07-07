import { redirect } from 'next/navigation'

// Auth lives at /login (login + signup tabs + guest mode).
export default function SignInPage() {
  redirect('/login')
}
