import Link from 'next/link'

/** Copper upsell strip shown to guests on the dashboard. */
export function GuestBanner() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-copper/35 bg-copper-050 px-4 py-3">
      <span aria-hidden>🎒</span>
      <p className="flex-1 min-w-48 text-[13.5px] text-ink-2">
        You&apos;re practicing as a guest. Create an account to save progress &amp; join the
        leaderboard.
      </p>
      <Link
        href="/login"
        className="rounded-[9px] bg-copper px-3.5 py-1.5 text-[13px] font-semibold text-white hover:-translate-y-px hover:shadow-[0_8px_18px_rgba(174,110,21,.32)]"
      >
        Create account →
      </Link>
    </div>
  )
}
