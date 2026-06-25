# The Python Practice

An interactive coding practice platform built with Next.js, supporting Python, JavaScript, and SQL exercises with in-browser execution. Questions are stored in Supabase; all user progress is persisted locally in `localStorage` — no account required.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8) ![Supabase](https://img.shields.io/badge/Supabase-green)

---

## Features

- **Multi-language support** — Python (via Pyodide WASM), JavaScript (via `eval`), and SQL (via PGlite WASM)
- **Five question types** — write the code, fill in the blank, output prediction, spot the bug, what is the result
- **Four difficulty tiers** — Simple, Intermediate, Hard, Expert
- **AI hints** — optional Google Gemini Flash integration for contextual hints
- **Progress tracking** — attempt counts, statuses, and code drafts saved in `localStorage`
- **Direct question URLs** — share or bookmark `/compiler/[question-id]`
- **Rate-limited answer checking** — server-side validation via Supabase RPC (30 req/min)
- **Keyboard shortcuts** — power-user navigation throughout the app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Lucide React |
| Editor | CodeMirror 6 |
| Python runtime | Pyodide (WASM in a Web Worker) |
| SQL runtime | PGlite (WASM) |
| Database | Supabase (PostgreSQL) |
| AI hints | OpenRouter (open-source LLMs, e.g. Llama 3.3) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with a `questions` table and a `check_answer` RPC function
- (Optional) A [Google AI Studio](https://aistudio.google.com) API key for hints

### 1. Clone and install

```bash
git clone <repo-url>
cd the-python-practice
npm install
```

### 2. Configure environment variables

Copy the sample file and fill in your values:

```bash
cp .env.sample .env.local
```

See [Environment Variables](#environment-variables) below for details.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Chrome or Firefox recommended — Safari may not support `SharedArrayBuffer` (required for Python `input()` support).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key (used for reads and RPC) |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev only | Service role key — used by the admin bulk-insert endpoint only; never exposed to the browser |
| `ADMIN_SECRET` | Dev only | Arbitrary secret to authenticate `POST /api/admin/add-questions` |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API key; powers the hint button. Omit to disable hints |
| `OPENROUTER_MODEL` | Optional | Override the hint model (default `meta-llama/llama-3.3-70b-instruct`) |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SECRET` are only read server-side and are never sent to the client. The admin endpoint is disabled entirely in production (`NODE_ENV === 'production'`).

---

## Project Structure

```
src/
├── app/
│   ├── [lang]/page.tsx          # Main practice page (Python/JS/SQL), server component
│   ├── compiler/
│   │   ├── page.tsx             # Standalone editor (no question)
│   │   └── [id]/page.tsx        # Direct question URL
│   ├── admin/add-questions/     # Dev-only admin UI
│   ├── api/
│   │   ├── check-answer/route.ts  # Answer validation (rate-limited, calls Supabase RPC)
│   │   ├── hint/route.ts          # AI hint generation via Gemini
│   │   └── admin/add-questions/route.ts  # Bulk question upsert (dev only)
│   ├── layout.tsx
│   └── page.tsx                 # Root redirect
├── components/
│   ├── Compiler.tsx             # Core editor + output split-pane
│   ├── CompilerToolbar.tsx      # Run / Submit / Hint toolbar
│   ├── DashboardClient.tsx      # Sidebar + question browser
│   ├── HomeClient.tsx           # Top-level client state holder
│   ├── EditorPanel.tsx          # CodeMirror wrapper
│   ├── OutputPanel.tsx          # stdout / stderr display
│   ├── OutputPredictionPanel.tsx # Text input for prediction questions
│   ├── SuccessOverlay.tsx       # Correct answer celebration
│   ├── ErrorOverlay.tsx         # Error display
│   ├── execution/
│   │   └── worker-bridge.ts     # Pyodide Web Worker manager
│   ├── sidebar/                 # Question list, search, filters
│   ├── solution/                # Hint button, solution reveal, attempt counter
│   └── ui/                      # shadcn/ui primitives
├── lib/
│   ├── config.ts                # Constants (TIER_ORDER, MAX_ATTEMPTS, etc.)
│   ├── types.ts                 # TypeScript types (Question, Tier, QuestionType, …)
│   ├── storage.ts               # localStorage helpers (progress, code drafts)
│   ├── questions.ts             # Question filtering/sorting utilities
│   ├── supabase/
│   │   ├── client.ts            # Anon Supabase client (singleton)
│   │   ├── admin-client.ts      # Service-role client (server-side only)
│   │   └── queries.ts           # getQuestions() and related DB calls
│   └── sql/parse.ts             # SQL result parsing helpers
public/
├── pyodide-worker.js            # Pyodide Web Worker entry point
└── sql-worker.js                # PGlite Web Worker entry point
```

---

## Routes

| Route | Type | Description |
|---|---|---|
| `/` | Client | Landing page; redirects to `/python` for returning users |
| `/python` | Server → Client | Python practice with full question browser |
| `/javascript` | Server → Client | JavaScript practice |
| `/sql` | Server → Client | SQL practice |
| `/compiler/[id]` | Server → Client | Direct link to a specific question |
| `/compiler` | Client | Standalone editor with no question |
| `POST /api/check-answer` | API | Answer validation (30 req/min rate limit) |
| `POST /api/hint` | API | AI hint via Gemini Flash |
| `POST /api/admin/add-questions` | API | Bulk question upsert (dev only) |

---

## Question Types

| Type | How it works |
|---|---|
| `write_the_code` | User writes code; stdout is compared against the stored answer |
| `fill_in_the_blank` | Starter code with `___` markers; the filled token is extracted and checked |
| `output_prediction` | User types the expected output — no code execution |
| `what_is_the_result` | Same as output prediction, different prompt phrasing |
| `spot_the_bug` | No auto-check; user identifies the bug manually |

---

## Data Flow

```
[lang]/page.tsx (server)
  └─ getQuestions() → Supabase `questions` table
       └─ passes Question[] to DashboardClient

DashboardClient (client)
  └─ holds selectedQuestion, statuses, attempt counts
       └─ renders HomeClient → Compiler → EditorPanel / OutputPanel

On submit:
  Client → POST /api/check-answer → Supabase RPC check_answer() → { correct: boolean }

Progress:
  localStorage keys: qstatus:<id>, qattempts:<id>, qcode:<id>, session:last
```

---

## Python Execution (Pyodide)

The `WorkerBridge` (`src/components/execution/worker-bridge.ts`) manages a Web Worker running Pyodide:

- `SharedArrayBuffer` + `Atomics` enable synchronous `input()` support (requires cross-origin isolation headers)
- Hard 60-second execution timeout; the worker is terminated and respawned on timeout or crash
- Code size capped at 1 MB

> **Browser note:** Cross-origin isolation (`COOP`/`COEP` headers) is required for `SharedArrayBuffer`. The dev server sets these automatically. Chrome and Firefox work; Safari support may vary.

---

## Adding Questions

Use the dev-only admin endpoint (automatically disabled in production):

```bash
curl -X POST http://localhost:3000/api/admin/add-questions \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "<your ADMIN_SECRET>",
    "table": "python",
    "questions": [
      {
        "id": "unique-question-id",
        "tier": "simple",
        "topic": "Variables",
        "type": "write_the_code",
        "question": "Print the number 42.",
        "answer": "42",
        "alternative_answer": null,
        "explanation": "Use the print() function.",
        "language": "python"
      }
    ]
  }'
```

**Required fields per question:**

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique identifier (used in URLs) |
| `tier` | `simple` \| `intermediate` \| `hard` \| `expert` | Difficulty |
| `topic` | `string` | Grouping label (e.g. "Loops", "Variables") |
| `type` | `QuestionType` | See question types table above |
| `question` | `string` | Prompt shown to the user |
| `answer` | `string` | Expected output or token |
| `alternative_answer` | `string \| null` | Accepted alternative (or `null`) |
| `explanation` | `string` | Shown after solving or revealing the solution |
| `language` | `python` \| `javascript` \| `sql` | Target language |

**Ordering rule:** Within any tier/topic group, `write_the_code` questions must appear before `fill_in_the_blank` and `output_prediction` questions.

---

## Available Scripts

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

---

## Deployment

The app deploys to any platform that supports Next.js (Vercel, Railway, etc.). Before deploying:

1. Set all required environment variables in your hosting platform (do **not** include `SUPABASE_SERVICE_ROLE_KEY` or `ADMIN_SECRET` — the admin endpoint is disabled in production anyway, but there is no reason to expose the keys).
2. Ensure your hosting platform sets the required cross-origin isolation headers for Pyodide:
   ```
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
   ```
3. The `OPENROUTER_API_KEY` is optional — omit it to disable the hint button.

---

## License

MIT
