# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

You are a senior software developer with 10+ years of programming experience teaching new learners how to tackle problems.

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
```

Required `.env.local` variables:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
# Dev-only (admin bulk insert endpoint):
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SECRET=
# Hint button — Google Gemini Flash (free tier); leave empty to disable hints:
GEMINI_API_KEY=
```

Python execution requires `SharedArrayBuffer` (cross-origin isolation). Chrome and Firefox work; Safari may not.

## Architecture

**Stack**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, CodeMirror 6, Supabase, Pyodide (WASM Python in a Web Worker).

### Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Client | Landing page; redirects to `/python` if user has interacted before (`localStorage.has_interacted`) |
| `/python` | Server → Client | Main practice app; fetches all questions from Supabase, renders `DashboardClient` |
| `/compiler/[id]` | Server → Client | Direct question URL; renders `HomeClient` with `initialQuestionId` |
| `/compiler` | Client | Standalone editor (no question) |
| `POST /api/check-answer` | API | Rate-limited (30 req/min); calls Supabase RPC `check_answer(question_id, user_answer)` |
| `POST /api/admin/add-questions` | API | Dev-only bulk upsert; disabled in production by `NODE_ENV` check |

### Data flow

1. `[lang]/page.tsx` (server) calls `getQuestions()` → Supabase `questions` table → passes array to `DashboardClient`
2. `DashboardClient` / `HomeClient` hold all UI state (selected question, statuses, attempt counts)
3. User progress lives entirely in `localStorage` via `src/lib/storage.ts` — keys: `qstatus:<id>`, `qattempts:<id>`, `qcode:<id>`, `session:last`
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
