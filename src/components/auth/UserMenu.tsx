'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOutAction } from '@/lib/auth/actions'
import type { CurrentUser } from '@/lib/auth/user'

export function UserMenu({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-[9px] border-[1.5px] border-line-2 px-3 py-1.5 text-[13px] font-semibold text-ink-2 hover:border-blue hover:text-blue"
      >
        Log in
      </Link>
    )
  }

  const initial = (user.name ?? user.handle).charAt(0).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="grid size-8 place-items-center rounded-full bg-copper text-sm font-semibold text-white hover:-translate-y-px"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lg)] animate-[pp-pop_.2s_ease_both]">
          <div className="px-3 py-2 border-b border-line mb-1">
            <p className="text-sm font-semibold text-ink truncate">@{user.handle}</p>
            <p className="font-mono text-[11px] text-ink-3">
              {user.points} pts · 🔥 {user.currentStreak}
            </p>
          </div>
          <MenuLink href="/profile" onClick={() => setOpen(false)}>Profile</MenuLink>
          <MenuLink href="/leaderboard" onClick={() => setOpen(false)}>Leaderboard</MenuLink>
          {user.role === 'ADMIN' && (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>Admin</MenuLink>
          )}
          <form action={signOutAction}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red hover:bg-red-100">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-blue-050 hover:text-blue"
    >
      {children}
    </Link>
  )
}
