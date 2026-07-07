# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are a senior software developer with 10+ years of programming experience teaching new learners how to tackle problems.

## Commands

```bash
npm run dev         # Start dev server on localhost:3000
npm run build       # Production build
npm run lint        # ESLint check
npm run db:migrate  # Prisma: create + apply a migration (dev)
npm run db:deploy   # Prisma: apply pending migrations (prod)
npm run db:generate # Prisma: regenerate client into src/generated/prisma (gitignored)
```

Required `.env.local` variables:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
# Prisma — use the Supavisor SESSION pooler URL (port 5432); the direct
# db.<ref>.supabase.co host is IPv6-only and unreachable from most networks:
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres
# Comma-separated emails granted the ADMIN role on first sign-in:
ADMIN_EMAILS=
# Dev-only (admin bulk insert endpoint):
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SECRET=
# Hint button — OpenRouter; leave empty to disable hints:
OPENROUTER_API_KEY=
# Optional: override the hint model (default meta-llama/llama-3.3-70b-instruct):
OPENROUTER_MODEL=
```

Python execution requires `SharedArrayBuffer` (cross-origin isolation). Chrome and Firefox work; Safari may not.

## Architecture

**Stack**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, CodeMirror 6, Supabase (questions + auth), Prisma 7 (profiles/attempts/progress tables), Pyodide (WASM Python in a Web Worker).

**Design system**: cream/blue/copper tokens defined in `globals.css` (`--bg/--surface/--ink/--blue/--copper/...`), exposed as Tailwind utilities (`bg-surface`, `text-ink-2`, `bg-copper-050`, ...). Fonts: Figtree (body), Space Grotesk (`font-heading`), JetBrains Mono (`font-mono`). Light theme is default; `.dark` uses a navy palette. Code surfaces are always dark navy (`--code-bg`). NOTE: `/src/app/admin` is gitignored, and Tailwind skips gitignored files — `globals.css` has an explicit `@source "./admin"` to compensate.

### Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Client | Landing page; redirects to `/python` if user has interacted before (`localStorage.has_interacted`) |
| `/python` | Server → Client | Main practice app; fetches all questions from Supabase, renders `DashboardClient` |
| `/compiler/[id]` | Server → Client | Direct question URL; renders `HomeClient` with `initialQuestionId` |
| `/compiler` | Client | Standalone editor (no question) |
| `POST /api/check-answer` | API | Rate-limited (30 req/min); calls Supabase RPC `check_answer(question_id, user_answer)` |
| `POST /api/admin/add-questions` | API | Dev-only bulk upsert; disabled in production by `NODE_ENV` check |
| `POST /api/attempts` | API | Records client-checked attempts (SQL/JS `write_the_code`); rate-limited |
| `/login` | Server → Client | Learner login/signup (Supabase Auth, email+password) + "continue as guest" |
| `/leaderboard` | Server | Rankings from Prisma aggregates; `?lang=` and `?time=` filters |
| `/profile` | Server | Signed-in user stats: cards, solved-by-tier, activity heatmap |
| `/admin`, `/admin/questions` | Server → Client | Admin analytics + question CRUD (role-gated; dir is gitignored/local-only) |
| `/admin/login` | Server → Client | Admin sign-in (rejects non-ADMIN accounts) |
| `POST/PUT/DELETE /api/admin/questions` | API | Question CRUD via Prisma; requires session with ADMIN role |

### Data flow

1. `[lang]/page.tsx` (server) calls `getQuestions()` → Supabase `questions` table → passes array to `DashboardClient`
2. `DashboardClient` / `HomeClient` hold all UI state (selected question, statuses, attempt counts)
3. Guest progress lives in `localStorage` via `src/lib/storage.ts` — keys: `qstatus:<id>`, `qattempts:<id>`, `qcode:<id>`, `session:last`. Signed-in users additionally get server-side tracking: every submit records an `attempts` row and upserts `question_progress` (Prisma, `src/lib/tracking.ts`); first solves award +10 points and advance the daily streak on `profiles`.
4. `Compiler` renders a split editor + output panel and communicates with Pyodide via `WorkerBridge`
5. On submit, the client POSTs to `/api/check-answer`; the server calls Supabase RPC and returns `{ correct: boolean }`

### Python execution (Pyodide)

`WorkerBridge` (`src/components/execution/worker-bridge.ts`) manages the Web Worker at `/pyodide-worker.js`. Key behaviours:
- Uses `SharedArrayBuffer` + `Atomics` for synchronous `input()` support
- Hard 60-second timeout; worker is terminated and respawned on timeout or crash
- Code size capped at 1 MB

### Question types

Defined in `src/lib/types.ts`. Answer checking differs per type (see `Compiler.tsx`):

| Type | Checking method |
|------|----------------|
| `write_the_code` | Normalised stdout vs stored answer |
| `fill_in_the_blank` | Extracts token filled in place of `___` markers |
| `output_prediction` / `what_is_the_result` | User types expected output; no code execution |
| `spot_the_bug` | No auto-check (`AUTO_CHECK_TYPES` excludes it) |

Question ordering rule: `write_the_code` questions must be listed before `fill_in_the_blank` and `output_prediction` within any tier/topic group.

### Auth & Prisma

- Supabase Auth (email+password) via `@supabase/ssr`; session cookies refreshed in `src/proxy.ts`. Server actions in `src/lib/auth/actions.ts`; `getCurrentUser()` (`src/lib/auth/user.ts`) lazily creates a `profiles` row and grants ADMIN when the email is in `ADMIN_EMAILS`.
- Prisma 7 (`prisma/schema.prisma`, config in `prisma.config.ts` which loads `.env.local`): models `Profile`, `Attempt`, `Progress` plus introspected `questions`/`javascript_questions`/`sql_questions`. The pre-existing tables were baselined in `prisma/migrations/0_baseline` — never let `migrate dev` reset the schema. New tracking tables have RLS enabled with no policies (Prisma connects as owner; PostgREST cannot touch them).
- Client singleton: `src/lib/prisma.ts` (pg driver adapter → Supavisor session pooler).

### Supabase clients

- `src/lib/supabase/client.ts` — singleton using `SUPABASE_ANON_KEY`; used for reads and `check_answer` RPC
- `src/lib/supabase/admin-client.ts` — singleton using `SUPABASE_SERVICE_ROLE_KEY`; server-side only, `persistSession: false`

### Key constants (`src/lib/config.ts`)

- `TIER_ORDER` — `['simple', 'intermediate', 'hard', 'expert']`
- `AUTO_CHECK_TYPES` — set of question types with automatic answer checking
- `MAX_ATTEMPTS = 5` — attempts before solution reveal is offered

### Adding questions

Use the dev-only admin endpoint (disabled in production):

```
POST http://localhost:3000/api/admin/add-questions
{ "secret": "<ADMIN_SECRET>", "table": "python", "questions": [...] }
```

Each question requires: `id`, `tier`, `topic`, `type`, `question`, `answer`, `alternative_answer` (string or null), `explanation`.
