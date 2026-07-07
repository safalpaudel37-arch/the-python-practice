import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/user'
import { LoginClient } from './LoginClient'

export const metadata = {
  title: 'Log in — PyPractice',
}

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/python')
  return <LoginClient />
}
