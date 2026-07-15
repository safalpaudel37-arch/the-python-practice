'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signInAction, signUpAction, type AuthFormState } from '@/lib/auth/actions'
import { Logo } from '@/components/brand/Logo'

const INITIAL: AuthFormState = {}

export function LoginClient() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [showPw, setShowPw] = useState(false)
  const [loginState, loginAction, loginPending] = useActionState(signInAction, INITIAL)
  const [signupState, signupAction, signupPending] = useActionState(signUpAction, INITIAL)

  const state = tab === 'login' ? loginState : signupState
  const pending = tab === 'login' ? loginPending : signupPending

  return (
    <div className="pp-screen min-h-[100dvh] grid lg:grid-cols-[1fr_1.05fr]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-code-bg p-10">
        <Link href="/"><Logo dark /></Link>
        <div>
          <h1 className="font-heading text-[40px] leading-[1.1] font-bold text-[#F1ECDF]">
            Write code.
            <br />
            Learn like a <span className="text-copper">senior.</span>
          </h1>
          <p className="mt-4 text-[#AEB6C9] max-w-sm">
            Pick up right where you left off — your streak is waiting.
          </p>
          <div className="mt-8 max-w-xs rounded-xl border border-code-line bg-black/20 p-4 font-mono text-[13px] text-code-ink">
            <div className="flex gap-1.5 mb-3">
              <span className="size-[9px] rounded-full bg-[#ff5f57]" />
              <span className="size-[9px] rounded-full bg-[#febc2e]" />
              <span className="size-[9px] rounded-full bg-[#28c840]" />
            </div>
            <span className="text-[#e2c08d]">print</span>
            <span>(</span>
            <span className="text-[#c3e88d]">&quot;welcome back&quot;</span>
            <span>)</span>
            <span className="ml-0.5 inline-block w-[2px] h-[14px] align-middle bg-copper animate-[pp-blink_.9s_step-end_infinite]" />
          </div>
        </div>
        <p className="font-mono text-xs text-[#79839B]">
          3 languages · in-browser execution · no setup
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8">
            <Link href="/"><Logo /></Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-line mb-7">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 font-heading text-[15px] font-semibold -mb-px border-b-2 ${
                  tab === t
                    ? 'text-blue border-blue'
                    : 'text-ink-3 border-transparent hover:text-ink-2'
                }`}
              >
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form action={tab === 'login' ? loginAction : signupAction} className="space-y-4">
            {tab === 'signup' && (
              <Field label="Name">
                <input
                  name="name"
                  placeholder="Maya Chen"
                  autoComplete="name"
                  className="w-full bg-transparent outline-none placeholder:text-ink-3"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                name="email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                required
                className="w-full bg-transparent outline-none placeholder:text-ink-3"
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={tab === 'signup' ? 8 : undefined}
                className="w-full bg-transparent outline-none placeholder:text-ink-3"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="text-ink-3 hover:text-ink-2"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            {state.error && (
              <p className="pp-shake text-sm text-red font-medium">{state.error}</p>
            )}
            {state.message && <p className="text-sm text-green font-medium">{state.message}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-[10px] bg-blue text-on-blue font-semibold py-2.5 hover:bg-blue-600 hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending
                ? 'One sec…'
                : tab === 'login'
                  ? 'Log in →'
                  : 'Create account →'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5 text-ink-3 text-xs">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <Link
            href="/python"
            className="block text-center w-full rounded-[10px] border-[1.5px] border-line-2 py-2.5 font-semibold text-blue hover:border-blue"
          >
            Continue as guest →
          </Link>
          <p className="mt-3 text-center text-xs text-ink-3">
            Guest progress is saved on this device only.
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-ink-2 mb-1.5">{label}</span>
      <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-line-2 bg-surface px-3.5 py-[11px] text-[14px] text-ink focus-within:border-copper focus-within:shadow-[0_0_0_3px_var(--copper-050)]">
        {children}
      </div>
    </label>
  )
}
