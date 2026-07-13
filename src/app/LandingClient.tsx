'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export type TopLearner = { handle: string; solved: number; points: number };

const FEATURES = [
  {
    icon: '⚡',
    chip: 'bg-blue-100',
    title: 'Instant run',
    desc: 'Python, JS & SQL execute right in your browser. Zero setup, results in milliseconds.',
  },
  {
    icon: '◆',
    chip: 'bg-blue-100',
    title: '4 question types',
    desc: 'Write code, fill the blanks, predict output, or spot the bug — each checked its own way.',
  },
  {
    icon: '✨',
    chip: 'bg-copper-100',
    title: 'AI hints',
    desc: "Stuck after a try? Get a nudge in one or two sentences — never the whole answer.",
  },
  {
    icon: '📈',
    chip: 'bg-blue-100',
    title: 'Progress & ranks',
    desc: 'Track solved-by-tier, keep your streak, and climb the weekly leaderboard.',
  },
];

const LANG_CARDS = [
  { glyph: '🐍', name: 'Python', href: '/python', live: true },
  { glyph: '𝗝𝗦', name: 'JavaScript', href: '/javascript', live: true },
  { glyph: '🗄', name: 'SQL', href: '/sql', live: true },
  { glyph: '🔧', name: 'C', live: false },
  { glyph: '🔥', name: 'PyTorch', live: false },
  { glyph: '🔢', name: 'NumPy', live: false },
];

const LADDER = [
  { n: 1, name: 'Simple', tint: 'bg-green-100', dot: 'bg-green', desc: 'Find your footing — variables, loops, strings.' },
  { n: 2, name: 'Intermediate', tint: 'bg-blue-100', dot: 'bg-blue', desc: 'Build fluency — dicts, comprehensions, functions.' },
  { n: 3, name: 'Hard', tint: 'bg-copper-100', dot: 'bg-copper', desc: 'Think in patterns — recursion, algorithms.' },
  { n: 4, name: 'Expert', tint: 'bg-red-100', dot: 'bg-red', desc: 'Own it — edge cases, performance, elegance.' },
];

const AVATAR_BG = ['bg-copper', 'bg-blue', 'bg-[#5C564A]'];

export default function LandingClient({
  problemCount,
  topLearners,
}: {
  problemCount: number;
  topLearners: TopLearner[];
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('has_interacted')) {
      router.replace('/python');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="pp-screen min-h-[100dvh] bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-7 py-3">
          <Logo />
          <nav className="flex items-center gap-5">
            <a href="#features" className="hidden text-[14px] font-medium text-ink-2 hover:text-ink sm:block">
              Features
            </a>
            <a href="#languages" className="hidden text-[14px] font-medium text-ink-2 hover:text-ink sm:block">
              Languages
            </a>
            <Link href="/leaderboard" className="hidden text-[14px] font-medium text-ink-2 hover:text-ink sm:block">
              Leaderboard
            </Link>
            <Link href="/login" className="text-[14px] font-semibold text-blue">
              Log in
            </Link>
            <Link
              href="/python"
              className="rounded-[9px] bg-copper px-3.5 py-2 text-[13px] font-semibold text-white hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(174,110,21,.32)]"
            >
              Try as guest →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-7">
        {/* ── Hero ── */}
        <section className="grid items-center gap-12 pb-10 pt-16 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-050 px-3 py-1.5 font-mono text-[11px] text-ink-2">
              <span className="size-1.5 rounded-full bg-green" />
              Python · JavaScript · SQL — in your browser
            </span>
            <h1 className="mt-5 font-heading text-[40px] font-bold leading-[1.03] tracking-[-0.02em] md:text-[56px]">
              Write code.
              <br />
              Learn like a <span className="text-copper">senior.</span>
            </h1>
            <p className="mt-5 max-w-[440px] text-[18px] leading-relaxed text-ink-2">
              Practice real problems with instant in-browser execution, auto-checked answers, and
              AI hints when you&apos;re stuck. No setup, ever.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/python"
                className="rounded-[10px] bg-copper px-5 py-2.5 text-[14.5px] font-semibold text-white hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(174,110,21,.32)]"
              >
                Start practicing →
              </Link>
              <Link
                href="/python"
                className="rounded-[10px] border-[1.5px] border-line-2 px-5 py-2.5 text-[14.5px] font-semibold text-ink-2 hover:border-blue hover:text-blue"
              >
                Browse problems
              </Link>
            </div>

            {/* Stat strip */}
            <div className="mt-9 flex flex-wrap gap-8 border-t border-line pt-6">
              <Stat value={problemCount > 0 ? String(problemCount) : '—'} label="problems" />
              <Stat
                value={
                  <>
                    3<span className="text-ink-3">+3</span>
                  </>
                }
                label="languages"
              />
              <Stat value="4" label="question types" />
            </div>
          </div>

          {/* Animated code window */}
          <div className="animate-[pp-float_5s_ease-in-out_infinite]">
            <div className="rounded-2xl bg-code-bg p-4 shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-1.5 pb-3">
                <span className="size-[11px] rounded-full bg-[#ff5f57]" />
                <span className="size-[11px] rounded-full bg-[#febc2e]" />
                <span className="size-[11px] rounded-full bg-[#28c840]" />
                <span className="ml-2 font-mono text-[11.5px] text-white/40">challenge_01.py</span>
                <span className="ml-auto font-mono text-[11px] text-green">● ready</span>
              </div>
              <div className="font-mono text-[13.5px] leading-[1.9] text-code-ink">
                <CodeLine n={1}>
                  <span className="text-[#6ea8ff]">def</span>{' '}
                  <span className="text-[#e2c08d]">greet</span>(name):
                </CodeLine>
                <CodeLine n={2}>
                  <span
                    className="inline-block overflow-hidden whitespace-nowrap align-bottom"
                    style={{
                      animation: 'pp-type 2.6s steps(26) 1s infinite alternate',
                      ['--tw' as string]: '26ch',
                    }}
                  >
                    {'    '}
                    <span className="text-[#6ea8ff]">return</span>{' '}
                    <span className="text-[#c3e88d]">f&quot;Hello, {'{name}'}! 👋&quot;</span>
                  </span>
                  <span className="ml-0.5 inline-block h-[15px] w-[2px] bg-copper align-middle animate-[pp-blink_.9s_step-end_infinite]" />
                </CodeLine>
                <CodeLine n={3}>
                  <span className="text-[#e2c08d]">greet</span>(
                  <span className="text-[#c3e88d]">&quot;World&quot;</span>)
                </CodeLine>
              </div>
              <div className="mt-3 border-t border-code-line pt-3 font-mono text-[13px] text-green">
                → Hello, World! 👋
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Trust strip ── */}
      <div className="border-y border-line bg-blue-050">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-7 py-3.5 font-mono text-[12.5px] text-ink-2">
          <span>✓ No installs</span>
          <span>✓ Runs in your browser (Pyodide · PGlite)</span>
          <span>✓ Auto-checked answers</span>
          <span>✓ AI hints when stuck</span>
        </div>
      </div>

      <main className="mx-auto max-w-[1120px] px-7">
        {/* ── Features ── */}
        <section id="features" className="pt-16">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[.14em] text-copper">
            What you get
          </p>
          <h2 className="mt-2 font-heading text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
            Everything to learn by doing
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="pp-int rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-sm)] hover:-translate-y-1 hover:border-blue hover:shadow-[var(--shadow)]"
              >
                <span className={`grid size-10 place-items-center rounded-xl text-lg ${f.chip}`}>
                  {f.icon}
                </span>
                <h3 className="mt-4 font-heading text-[16px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Languages ── */}
        <section id="languages" className="pt-16">
          <div className="flex items-end justify-between">
            <h2 className="font-heading text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
              Pick your language
            </h2>
            <span className="text-[13px] text-ink-3">More on the way</span>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">
            {LANG_CARDS.map((l) =>
              l.live ? (
                <Link
                  key={l.name}
                  href={l.href!}
                  className="pp-int flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] hover:-translate-y-1 hover:border-blue hover:shadow-[var(--shadow)]"
                >
                  <span className="text-[26px]">{l.glyph}</span>
                  <span className="flex-1 font-heading text-[16px] font-semibold">{l.name}</span>
                  <span className="rounded-[10px] bg-green-100 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-green">
                    Live
                  </span>
                </Link>
              ) : (
                <div
                  key={l.name}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 opacity-60"
                >
                  <span className="text-[26px]">{l.glyph}</span>
                  <span className="flex-1 font-heading text-[16px] font-semibold">{l.name}</span>
                  <span className="rounded-[10px] bg-surface-2 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-ink-3">
                    Soon
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        {/* ── Difficulty ladder ── */}
        <section className="pt-16">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[.14em] text-copper">
            The path
          </p>
          <h2 className="mt-2 font-heading text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
            From <span className="font-mono">print()</span> to expert
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {LADDER.map((t) => (
              <div key={t.name} className={`rounded-2xl border border-line p-5 ${t.tint}`}>
                <span
                  className={`grid size-[30px] place-items-center rounded-full text-[14px] font-bold text-white ${t.dot}`}
                >
                  {t.n}
                </span>
                <h3 className="mt-3 font-heading text-[16px] font-bold">{t.name}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Leaderboard teaser ── */}
        <section className="pt-16">
          <div className="flex items-end justify-between">
            <h2 className="font-heading text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
              🏆 Top learners this week
            </h2>
            <Link href="/login" className="text-[13.5px] font-semibold text-blue hover:text-blue-600">
              Sign in to compete →
            </Link>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)]">
            {topLearners.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[14px] font-medium text-ink-2">Leaderboard is warming up.</p>
                <p className="mt-1 text-[13px] text-ink-3">
                  Solve a problem to be the first on the board.
                </p>
              </div>
            ) : (
              topLearners.map((l, i) => (
                <div
                  key={l.handle}
                  className={`flex items-center gap-4 px-5 py-3.5 ${
                    i === 0 ? 'bg-copper-050' : ''
                  } ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <span className={`w-4 font-mono text-[14px] font-bold ${i === 0 ? 'text-copper' : 'text-ink-3'}`}>
                    {i + 1}
                  </span>
                  <span
                    className={`grid size-[34px] place-items-center rounded-full text-[14px] font-semibold text-white ${AVATAR_BG[i % AVATAR_BG.length]}`}
                  >
                    {l.handle.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-[14.5px] font-semibold">@{l.handle}</span>
                  <span className="text-[13px] text-ink-3">{l.solved} solved</span>
                  <span className="font-mono text-[14px] font-bold text-copper">{l.points} pts</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="my-16 rounded-[24px] bg-code-bg px-6 py-14 text-center">
          <h2 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-[#F1ECDF] md:text-[34px]">
            Ready to start climbing?
          </h2>
          <p className="mt-3 text-[15px] text-[#AEB6C9]">
            Your first solved problem is one click away — no account needed.
          </p>
          <Link
            href="/python"
            className="mt-7 inline-block rounded-[10px] bg-copper px-6 py-3 text-[15px] font-semibold text-white hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(174,110,21,.4)]"
          >
            Start practicing →
          </Link>
        </section>

        <footer className="pb-10 text-center text-[13px] text-ink-3">
          Built for learners · by a developer who cares · © 2026 PyPractice
        </footer>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="font-mono text-[26px] font-bold tracking-[-0.02em]">{value}</p>
      <p className="text-xs text-ink-3">{label}</p>
    </div>
  );
}

function CodeLine({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex">
      <span className="w-6 shrink-0 select-none text-right text-white/25">{n}</span>
      <span className="pl-3">{children}</span>
    </div>
  );
}
