# The Python Practice

An interactive coding practice platform built with Next.js, supporting Python, JavaScript, and SQL exercises with in-browser execution. Questions are stored in PostgreSQL (read via Supabase, written via Prisma); all guest progress is persisted locally in `localStorage` — no account required.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8) ![Supabase](https://img.shields.io/badge/Supabase-green)

---

## Features

- **Multi-language support** — Python (via Pyodide WASM), JavaScript (via sandboxed `eval`), and SQL (via PGlite WASM)
- **Five question types** — write the code, fill in the blank, output prediction, spot the bug, what is the result
- **Four difficulty tiers** — Simple, Intermediate, Hard, Expert
- **AI hints** — optional OpenRouter integration for contextual hints
- **Progress tracking** — attempt counts, statuses, and code drafts saved in `localStorage`
- **Direct question URLs** — share or bookmark `/compiler/[question-id]`
- **Rate-limited answer checking** — server-side validation via Prisma + TypeScript comparison (30 req/min)
- **Keyboard shortcuts** — power-user navigation throughout the app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Lucide React |
| Editor | CodeMirror 6 |
| Python runtime | Pyodide (WASM in a Web Worker) |
| JavaScript runtime | Sandboxed `new Function` in a Web Worker |
| SQL runtime | PGlite (WASM Postgres in the browser) |
| Database | PostgreSQL (Supabase hosting; Prisma for writes/progress, Supabase anon client for question reads) |
| AI hints | OpenRouter (open-source LLMs, e.g. Llama 3.3) |

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Environment Variables](#environment-variables)
3. [Project Structure](#project-structure)
4. [Routes](#routes)
5. [Question Classification](#question-classification)
6. [How the Compiler Works](#how-the-compiler-works)
7. [Answer Checking Logic](#answer-checking-logic)
8. [Data Flow](#data-flow)
9. [Adding Questions](#adding-questions)
10. [Available Scripts](#available-scripts)
11. [Deployment](#deployment)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with `questions`, `javascript_questions`, and `sql_questions` tables
- A PostgreSQL connection string (Supabase pooler URL) for Prisma
- (Optional) An [OpenRouter](https://openrouter.ai) API key for hints

### 1. Clone and install

```bash
git clone <repo-url>
cd the-python-practice
npm install
```

### 2. Configure environment variables

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
| `DB_URL` | Yes | PostgreSQL connection string (Supabase pooler URL) — used by Prisma for writes, progress, and answer checking |
| `SUPABASE_URL` | Yes | Your Supabase project URL (used for question reads via the anon client) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key (used for question reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev only | Service role key — used by the admin bulk-insert endpoint only; never exposed to the browser |
| `ADMIN_SECRET` | Dev only | Arbitrary secret to authenticate `POST /api/admin/add-questions` |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API key; powers the hint button. Omit to disable hints |
| `OPENROUTER_MODEL` | Optional | Override the hint model (default `meta-llama/llama-3.3-70b-instruct`) |
| `OPENROUTER_SITE_URL` | Optional | Site URL sent as `HTTP-Referer` to OpenRouter (attribution only) |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SECRET` are only read server-side and are never sent to the client. The admin endpoint is disabled entirely in production (`NODE_ENV === 'production'`).

---

## Project Structure

```
src/
├── app/
│   ├── [lang]/page.tsx          # Main practice page (Python/JS/SQL), server component
│   ├── compiler/[id]/page.tsx   # Direct question URL
│   ├── leaderboard/page.tsx     # Weekly leaderboard
│   ├── login/page.tsx           # Auth (login + signup)
│   ├── profile/page.tsx         # User profile + heatmap
│   ├── zxcvbn/admin/            # Admin dashboard + question manager
│   ├── api/
│   │   ├── check-answer/route.ts  # Answer validation + attempt recording (rate-limited)
│   │   ├── hint/route.ts          # AI hint generation
│   │   └── admin/                 # Admin API routes (dev only)
│   ├── layout.tsx
│   └── page.tsx                 # Landing page
├── components/
│   ├── Compiler.tsx             # Core editor + output split-pane (Python/JS)
│   ├── sql/SqlCompiler.tsx      # SQL-specific compiler (PGlite)
│   ├── CompilerToolbar.tsx      # Run / Submit / Hint toolbar (desktop)
│   ├── AppHeader.tsx            # Mobile header with run/submit/hint
│   ├── RunSubmitButtons.tsx     # Shared run/submit buttons
│   ├── ResizableSplit.tsx       # Shared split-pane with drag handle
│   ├── DashboardClient.tsx      # Sidebar + question browser
│   ├── HomeClient.tsx           # Top-level client state holder
│   ├── EditorPanel.tsx          # CodeMirror wrapper
│   ├── OutputPanel.tsx          # stdout / stderr display
│   ├── ErrorOverlay.tsx         # Error animation overlay
│   ├── SuccessOverlay.tsx       # Success animation overlay
│   ├── execution/
│   │   └── worker-bridge.ts     # Web Worker manager (Pyodide / JS)
│   ├── sidebar/                 # Question list, search, filters
│   ├── solution/                # Hint button, solution reveal, attempt counter
│   └── ui/                      # shadcn/ui primitives (button, dialog, sheet, etc.)
├── lib/
│   ├── config.ts                # Constants (TIER_ORDER, MAX_ATTEMPTS, labels, etc.)
│   ├── types.ts                 # TypeScript types (Question, Tier, QuestionType, …)
│   ├── storage.ts               # localStorage helpers (progress, code drafts)
│   ├── questions.ts             # Question navigation (getNextQuestion, getPrevQuestion)
│   ├── utils.ts                 # cn(), formatTopic(), debounce(), normalizeOutput()
│   ├── progress.ts              # Server-side progress fetch (prismaStatusToClient, getServerProgress)
│   ├── answer-check.ts          # Server-side answer comparison (checkAnswerServer, findQuestionLanguage)
│   ├── tracking.ts              # Attempt recording + leaderboard stats
│   ├── report-attempt.ts        # Client→server attempt reporting (POSTs to /api/check-answer)
│   ├── api/
│   │   └── rate-limit.ts        # Shared rate limiter + getClientIp
│   ├── prisma.ts                # Prisma client singleton
│   ├── supabase/
│   │   ├── client.ts            # Anon Supabase client (singleton, for question reads)
│   │   ├── admin-client.ts      # Service-role client (server-side only)
│   │   └── queries.ts           # getQuestions() and related DB calls
│   └── sql/parse.ts             # SQL setup-block parsing helpers
public/
├── pyodide-worker.js            # Pyodide Web Worker entry point
├── js-worker.js                 # JavaScript Web Worker entry point
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
| `/leaderboard` | Server → Client | Weekly leaderboard |
| `/login` | Client | Login + signup |
| `/profile` | Server → Client | User profile + progress heatmap |
| `/zxcvbn/admin` | Server → Client | Admin dashboard (admin role only) |
| `/zxcvbn/admin/questions` | Server → Client | Question manager (admin role only) |
| `POST /api/check-answer` | API | Answer validation + attempt recording (30 req/min rate limit) |
| `POST /api/hint` | API | AI hint via OpenRouter (10 req/min rate limit) |
| `POST /api/admin/add-questions` | API | Bulk question upsert (dev only) |
| `POST /api/admin/questions` | API | Single-question CRUD (admin session auth) |

---

## Question Classification

Every question in the platform is classified along **two orthogonal axes**: a difficulty `tier` and a `type` (the interaction pattern the learner uses to solve it). Both are defined as TypeScript types and driven by constants in `src/lib/config.ts`.

### The `Question` shape

From `src/lib/types.ts`:

```ts
export type Tier = 'simple' | 'intermediate' | 'hard' | 'expert';
export type QuestionType =
  | 'write_the_code'
  | 'fill_in_the_blank'
  | 'output_prediction'
  | 'spot_the_bug'
  | 'what_is_the_result';
export type QuestionStatus = 'not_started' | 'attempted' | 'solved' | 'skipped';
export type Language = 'python' | 'javascript' | 'sql';

export interface Question {
  id: string;
  tier: Tier;
  topic: string;
  type: QuestionType;
  question: string;
  answer: string;
  alternative_answer: string | null;
  explanation: string;
  language: Language;
}
```

### Difficulty tiers

The four tiers form a fixed ladder used for ordering, filtering, and color coding. From `src/lib/config.ts`:

```ts
export const TIER_ORDER = ['simple', 'intermediate', 'hard', 'expert'] as const;

export const TIER_LABELS: Record<string, string> = {
  simple: 'Simple',
  intermediate: 'Intermediate',
  hard: 'Hard',
  expert: 'Expert',
};

export const TIER_COLOR_VAR: Record<string, string> = {
  simple: 'var(--green)',
  intermediate: 'var(--blue)',
  hard: 'var(--copper)',
  expert: 'var(--red)',
};

export const TIER_SHORT_LABELS: Record<string, string> = {
  simple: 'Simple',
  intermediate: 'Inter',
  hard: 'Hard',
  expert: 'Expert',
};

export const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
};
```

`TIER_ORDER` is used throughout the sidebar/leaderboard (e.g. `src/lib/leaderboard.ts` iterates it to compute per-tier `solved`/`total` rollups) and question sorting. Tiers map to accent colors via CSS variables — green → blue → copper → red, signalling progression.

### Question types

There are five interaction patterns. Each has both a long identifier (stored in the database) and a short badge label. From `src/lib/config.ts`:

```ts
export const TYPE_SHORT_LABELS: Record<string, string> = {
  write_the_code: 'write the code',
  fill_in_the_blank: 'fill the blank',
  output_prediction: 'predict output',
  what_is_the_result: 'predict output',
  spot_the_bug: 'spot the bug',
};
```

| Type | Short label | What the learner does |
|---|---|---|
| `write_the_code` | write the code | Writes code from scratch; their stdout is compared to the stored answer. |
| `fill_in_the_blank` | fill the blank | Starter code contains `___` markers; the token filled in is extracted and checked. |
| `output_prediction` | predict output | Given a snippet, the learner types the expected output — no code execution. |
| `what_is_the_result` | predict output | Same mechanical flow as `output_prediction`, with different prompt phrasing. |
| `spot_the_bug` | spot the bug | Learner identifies the bug manually; **no auto-checking**. |

### Auto-checkable types vs. manual types

A central design decision is *which types can be machine-graded*. From `src/lib/config.ts`:

```ts
export const AUTO_CHECK_TYPES = new Set([
  'write_the_code',
  'fill_in_the_blank',
  'output_prediction',
  'what_is_the_result',
]);
```

`spot_the_bug` is intentionally excluded — there is no single canonical token to compare, so the platform never auto-marks it correct. The `Compiler` consults this set at submit time (see [Answer Checking Logic](#answer-checking-logic)).

### Languages

Questions are also tagged per language. The nav declares known/live languages; anything else is a 404. From `src/lib/config.ts`:

```ts
export const LANGUAGES = [
  { slug: 'python', label: '🐍 Python', live: true },
  { slug: 'javascript', label: 'JavaScript', live: true },
  { slug: 'sql', label: 'SQL', live: true },
  { slug: 'c', label: 'C', live: false },
  { slug: 'pytorch', label: 'PyTorch', live: false },
  { slug: 'numpy', label: 'NumPy', live: false },
] as const;

export const KNOWN_LANGS = new Set<string>(LANGUAGES.map((l) => l.slug));
export const SUPPORTED_LANGS = new Set<string>(LANGUAGES.filter((l) => l.live).map((l) => l.slug));
```

### Ordering rule

Within any tier/topic group, `write_the_code` questions **must** be listed before `fill_in_the_blank` and `output_prediction` questions — applied by the question sorting in the sidebar/browser components. This keeps "write from scratch" exercises ahead of guided ones inside each group.

### Attempts and reveal

From `src/lib/config.ts`:

```ts
export const MAX_ATTEMPTS = 5;
export const STARTER_CODE = '# Write your Python code here\n';
export const JS_STARTER_CODE = '// Write your JavaScript code here\n';
export const SQL_STARTER_CODE = '-- Write your SQL here\n';
```

After `MAX_ATTEMPTS` (5) wrong attempts, the UI offers to reveal the stored solution/explanation.

---

## How the Compiler Works

The "compiler" is the editor + execution + output surface the learner interacts with. There is a single `Compiler` component (`src/components/Compiler.tsx`) for Python and JavaScript, and a SQL-specific `SqlCompiler` (`src/components/sql/SqlCompiler.tsx`) for SQL because PGlite runs on the main thread.

### 1. Language dispatch and worker selection

For direct question URLs (`/compiler/[id]`), the server determines the language by querying all three Prisma tables in parallel via `findQuestionLanguage()` in `src/lib/answer-check.ts` — no ID-prefix guessing. Unknown IDs return a 404.

`Compiler.tsx` then derives the worker from the question's language (Pyodide for Python, a JS sandbox for JavaScript). SQL questions fall through to `SqlCompiler` early and never spawn a worker.

```ts
const language = question?.language ?? 'python';
const workerConfig: WorkerConfig =
  language === 'sql'
    ? { url: '/sql-worker.js', type: 'module' }
    : language === 'javascript'
      ? '/js-worker.js'
      : '/pyodide-worker.js';
```

The worker is keyed by URL so that switching language (or question, for SQL) tears down and recreates the execution environment:

```ts
const workerKey =
  typeof workerConfig === 'string' ? workerConfig : workerConfig.url;
```

### 2. `WorkerBridge` — the worker manager

`src/components/execution/worker-bridge.ts` is a small class that owns the worker lifecycle, enforces a hard timeout, and (for Python) maintains a `SharedArrayBuffer`-based synchronous input channel.

**Construction & SAB setup.** On construction it allocates two shared buffers if `SharedArrayBuffer` is available, then spawns the worker:

```ts
constructor(callbacks: BridgeCallbacks, workerConfig: WorkerConfig = '/pyodide-worker.js') {
  this.callbacks = callbacks;
  this.workerConfig = workerConfig;
  this.hasSAB = typeof SharedArrayBuffer !== "undefined";

  if (this.hasSAB) {
    this.inputBuffer = new Int32Array(new SharedArrayBuffer(4096 * 4));
    this.inputMetaBuffer = new Int32Array(new SharedArrayBuffer(4));
  }

  this.spawnWorker();
}
```

**Spawning & crash recovery.** If the worker errors, `WorkerBridge` notifies the host, terminates, and respawns so the next run still works:

```ts
private spawnWorker() {
  if (typeof this.workerConfig === 'string') {
    this.worker = new Worker(this.workerConfig);
  } else {
    this.worker = new Worker(this.workerConfig.url, { type: this.workerConfig.type });
  }
  this.worker.onmessage = (e) => this.handleMessage(e.data);
  this.worker.onerror = (e) => {
    this.clearTimeout();
    this.running = false;
    this.callbacks.onError(
      "Execution environment crashed. Please try again.",
      "crash"
    );
    this.spawnWorker(); // Respawn so next run works
  };
}
```

**Running code.** `run()` enforces a 1 MB size cap, terminates and respawns any in-progress run, resets the input channel, posts the code (plus optional `setupCode` and the shared buffers), and arms a 60-second hard timeout:

```ts
run(code: string, setupCode?: string) {
  if (!this.worker) return;

  const MAX_CODE_SIZE = 1024 * 1024;
  if (code.length > MAX_CODE_SIZE) {
    this.callbacks.onError(
      `Code too large (${Math.round(code.length / 1024)}KB). Maximum allowed is 1MB.`,
      "error"
    );
    return;
  }

  if (this.running) {
    this.terminateWorker();
    this.spawnWorker();
  }

  this.running = true;

  if (this.inputMetaBuffer) {
    Atomics.store(this.inputMetaBuffer, 0, 0);
  }

  const message: Record<string, unknown> = { type: "run", code };
  if (setupCode) message.setupCode = setupCode;
  if (this.hasSAB && this.inputBuffer && this.inputMetaBuffer) {
    message.inputBuffer = this.inputBuffer.buffer;
    message.inputMetaBuffer = this.inputMetaBuffer.buffer;
  }

  this.worker.postMessage(message);

  this.timeoutId = setTimeout(() => {
    this.terminateWorker();
    this.running = false;
    this.callbacks.onError("timeout", "timeout");
    this.spawnWorker();
    this.ready = false;
  }, TIMEOUT_MS);
}
```

**Synchronous `input()` over `Atomics`.** When the worker requests input, the bridge hands the prompt to the UI; the UI eventually calls `sendInput`, which UTF-8 encodes the value into the shared buffer, stores the length in the meta buffer, and wakes the parked worker with `Atomics.notify`:

```ts
sendInput(value: string) {
  if (!this.inputBuffer || !this.inputMetaBuffer) return;

  const encoder = new TextEncoder();
  const encoded = encoder.encode(value);
  const len = Math.min(encoded.length, this.inputBuffer.length - 1);
  for (let i = 0; i < len; i++) {
    Atomics.store(this.inputBuffer, i, encoded[i]);
  }
  Atomics.store(this.inputMetaBuffer, 0, len);
  Atomics.notify(this.inputMetaBuffer, 0, 1);
}
```

> **Browser note:** `SharedArrayBuffer` requires cross-origin isolation (`COOP: same-origin` + `COEP: require-corp`). The dev server sets these automatically. Chrome and Firefox work; Safari support may vary.

### 3. The Pyodide worker (`public/pyodide-worker.js`)

The worker loads Pyodide once, and on each `run` injects a Python **preamble** *before* the user code. The preamble captures the real import machinery, then installs a guard that blocks filesystem/network/process/serialization/JS-bridge modules while leaving pure-compute stdlib importable:

```python
_sys.setrecursionlimit(2000)

class _OutputLimitReached(Exception):
    pass

class _BoundedStringIO(_io.StringIO):
    def __init__(self):
        super().__init__()
        self._lines = 0
    def write(self, s):
        if self._lines >= 100:
            raise _OutputLimitReached()
        result = super().write(s)
        self._lines += s.count('\\n')
        if self._lines >= 100:
            raise _OutputLimitReached()
        return result

_blocked_modules = frozenset([
    'os', 'subprocess', 'socket', 'shutil', 'importlib',
    'ctypes', 'multiprocessing', '_io', 'pty', 'fcntl',
    'signal', 'resource', 'termios', 'grp', 'pwd',
    'pickle', 'marshal', 'urllib', 'http', 'requests',
    'asyncio', 'concurrent', 'threading',
    'types', 'inspect', 'gc',
    'pkgutil', 'zipimport', 'imp', 'linecache',
    'code', 'codeop', 'pydoc', 'runpy',
    'js',  # Pyodide JS bridge — keeps Python from reaching JavaScript globals
])
_real_import = _builtins.__import__
def _safe_import(name, *args, **kwargs):
    top = name.split('.')[0]
    if top in _blocked_modules:
        raise ImportError(f"Module '{name}' is not available in this environment")
    for _blocked in _blocked_modules:
        if name.startswith(_blocked + '.'):
            raise ImportError(f"Module '{name}' is not available in this environment")
    return _real_import(name, *args, **kwargs)
_builtins.__import__ = _safe_import

def _safe_input(prompt=''):
    raise RuntimeError("input() is not supported in this environment")
_builtins.input = _safe_input

_sys.modules.pop('js', None)
```

The user code is then wrapped in a `try`/`except _OutputLimitReached`/`finally` that restores stdout/stderr and the real importer — so a runaway program can't pollute the worker's state for the next run:

```js
const fullCode = preamble + "\ntry:\n" +
  code.split("\n").map(l => "    " + l).join("\n") +
  "\nexcept _OutputLimitReached:\n" +
  "    _output_truncated = True\n" +
  "finally:\n" +
  "    _sys.stdout = _sys.__stdout__\n" +
  "    _sys.stderr = _sys.__stderr__\n" +
  "    _builtins.__import__ = _real_import\n";
```

Output is truncated at 1000 lines (`MAX_LINES`), errors are cleaned by stripping the `PythonError:` wrapper, and results are posted as `{ type: "result", stdout, stderr }` or `{ type: "error", message }`.

### 4. The JavaScript worker (`public/js-worker.js`)

JS runs in a classic Web Worker whose global network APIs are deleted and which shadows `console`, `fetch`, `XMLHttpRequest`, `WebSocket`, and `importScripts` to `undefined`. A regex guard rejects dynamic imports before the code is ever evaluated, and the code is wrapped via `new Function` (so static `import` is a parse-time `SyntaxError`):

```js
const _networksToDelete = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts'];
for (const name of _networksToDelete) {
  try { delete self[name]; } catch { /* read-only in some envs — best effort */ }
}

const IMPORT_PATTERN = /\bimport\s*\(|(?:^|[^.\w$])require\s*\(/;
function assertNoImports(code) {
  if (IMPORT_PATTERN.test(code)) {
    throw new Error("imports are disabled in this environment");
  }
}

const fn = new Function('console', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', code);
fn(mockConsole, undefined, undefined, undefined, undefined);
```

A captured `mockConsole` collects stdout (`log`/`info`/`dir`/`table`) and stderr (`warn`/`error`). The same worker also handles a `check` message type, used for client-side `write_the_code` answer-checking — see below.

### 5. SQL via PGlite (`SqlCompiler` + `usePglite`)

SQL does not use a Web Worker; PGlite (WASM Postgres) runs on the main thread. `src/components/sql/usePglite.ts` initialises a single in-memory database seeded with `SEED_SQL`, runs queries, and offers a `checkAnswer` that wraps the user query and the reference query in `BEGIN`/`ROLLBACK` so checking never mutates state:

```ts
const runInTransaction = useCallback(
  async (sql: string, setupSql?: string): Promise<Record<string, unknown>[]> => {
    const db = dbRef.current!;
    try {
      await db.exec('BEGIN');
      if (setupSql?.trim()) await db.exec(setupSql);
      const results = await db.exec(sql);
      const last = results[results.length - 1];
      const rows = (last?.rows ?? []) as Record<string, unknown>[];
      await db.exec('ROLLBACK');
      return rows;
    } catch (err) {
      try { await db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  },
  []
);
```

SQL questions may embed a setup block delimited by `-- SETUP --` / `-- END SETUP --`, parsed by `src/lib/sql/parse.ts`:

```ts
const SETUP_BEGIN = '-- SETUP --';
const SETUP_END = '-- END SETUP --';

export function parseSqlQuestion(text: string): ParsedSqlQuestion {
  const beginIdx = text.indexOf(SETUP_BEGIN);
  const endIdx = text.indexOf(SETUP_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return { setupSql: '', promptBefore: text, templateAfter: '' };
  }
  return {
    setupSql: text.slice(beginIdx + SETUP_BEGIN.length, endIdx).trim(),
    promptBefore: text.slice(0, beginIdx).trim(),
    templateAfter: text.slice(endIdx + SETUP_END.length).trim(),
  };
}
```

### 6. Output display and input prompts

`Compiler.tsx`'s `WorkerBridge` callbacks render results into an `OutputPanel`:

- `onReady` → marks the bridge idle,
- `onResult` → appends stdout/stderr lines,
- `onInputRequest` → shows the input prompt UI; the user's reply goes back through `bridge.sendInput(...)`,
- `onError` → distinguishes `"error" | "timeout" | "crash"`, clearing stale output on timeout and tearing down the bridge on crash/timeout.

A run that errors still counts as a completed run (`hasRun = true`) so the learner can submit and record an attempt — otherwise Submit stays disabled and the hint/solution reveal never unlocks.

---

## Answer Checking Logic

Answer checking is the most intricate part of the platform because it depends on **both** the question `type` and the `language`. There are three distinct check paths:

1. **Server-side check** via `POST /api/check-answer` + `checkAnswerServer()` in `src/lib/answer-check.ts` (used for all auto-checkable Python questions and for non-`write_the_code` SQL/JS questions). Reads the question row via Prisma and compares in TypeScript — no database RPC needed.
2. **Client-side execution-comparison check** for SQL and JS `write_the_code` questions, run entirely in-browser. The result is sent to `/api/check-answer` with `correct` supplied directly, skipping the server-side comparison.
3. **No check** for `spot_the_bug` (and any type outside `AUTO_CHECK_TYPES`).

### The submit dispatcher (`Compiler.tsx`)

`handleSubmit` is the single entry point. It branches by language + type:

```ts
const handleSubmit = useCallback(() => {
  const q = currentQuestionRef.current;
  if (!onAttemptRef.current) return;

  // (A) Client-side check for SQL and JS write_the_code — no pre-computed expected_output
  if (q && q.type === 'write_the_code' && (q.language === 'sql' || q.language === 'javascript')) {
    const setupCode = q.language === 'sql' ? parseSqlQuestion(q.question).setupSql : undefined;
    bridgeRef.current?.checkAnswer(codeRef.current, q.answer, setupCode || undefined).then(async (correct) => {
      const reward = await reportAttempt(q.id, q.language, correct);
      onAttemptRef.current?.(correct, correct ? undefined : {
        userCode: codeRef.current,
        userAnswer: lastStdoutRef.current,
      }, reward);
    });
    return;
  }

  // (B) Server-side check for auto-checkable Python question types
  if (q && AUTO_CHECK_TYPES.has(q.type)) {
    const userAnswer =
      q.type === 'fill_in_the_blank'
        ? extractFilledToken(q.question, codeRef.current)
        : q.type === 'output_prediction' || q.type === 'what_is_the_result'
        ? userPredictionRef.current.trim()
        : normalizeOutput(lastStdoutRef.current);

    fetch('/api/check-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id, userAnswer, language: q.language }),
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { correct?: boolean; reward?: SolveReward | null }) => {
        const passed = data.correct === true;
        onAttemptRef.current?.(passed, passed ? undefined : {
          userCode: q.type === 'write_the_code' ? codeRef.current : '',
          userAnswer,
        }, data.reward ?? null);
      })
      .catch((err: unknown) => {
        // (C) Network/timeout errors must not count as a wrong attempt
        const isTimeout = err instanceof Error && err.name === 'TimeoutError';
        setOutput((prev) => [
          ...prev,
          mkLine(
            isTimeout
              ? '⚠ Submit timed out. Check your connection and try again.'
              : '⚠ Could not verify answer. Check your connection and try again.',
            'error'
          ),
        ]);
      });
  } else {
    // spot_the_bug and anything else not in AUTO_CHECK_TYPES
    onAttemptRef.current(false, { userCode: codeRef.current, userAnswer: '' });
  }
}, []);
```

### Computing `userAnswer` per question type

The branch above uses helpers to turn the learner's work into a single comparable string. `normalizeOutput` lives in `src/lib/utils.ts` (shared by both the client and the server-side checker):

**`write_the_code`** — normalise the program's stdout (collapse CRLF, trim trailing whitespace per line, trim leading/trailing blank lines):

```ts
export function normalizeOutput(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}
```

**`fill_in_the_blank`** — find each `___` (3+ underscores) marker in the question template, locate the corresponding line in the user's code by matching the surrounding text, and extract the token typed between the `before` and `after` fragments. Multiple fills are joined with `", "`:

```ts
function extractFilledToken(questionText: string, userCode: string): string {
  const userLines = userCode.split('\n');
  const tokens: string[] = [];

  for (const qLine of questionText.split('\n')) {
    const match = qLine.match(/_{3,}/);
    if (!match) continue;

    const blank = match[0];
    const blankIdx = qLine.indexOf(blank);
    const before = qLine.slice(0, blankIdx);
    const after = qLine.slice(blankIdx + blank.length);

    for (const uLine of userLines) {
      if (before && !uLine.includes(before)) continue;

      const startIdx = before ? uLine.indexOf(before) + before.length : 0;
      const remaining = uLine.slice(startIdx);

      let token: string;
      if (after) {
        const afterIdx = remaining.indexOf(after);
        if (afterIdx === -1) continue;
        token = remaining.slice(0, afterIdx).trim();
      } else {
        token = remaining.trimEnd();
      }

      if (token) {
        tokens.push(token);
        break;
      }
    }
  }

  return tokens.join(', ');
}
```

**`output_prediction` / `what_is_the_result`** — there is no code execution at all; the learner's typed prediction is submitted verbatim:

```ts
const userAnswer =
  q.type === 'fill_in_the_blank'
    ? extractFilledToken(q.question, codeRef.current)
    : q.type === 'output_prediction' || q.type === 'what_is_the_result'
    ? userPredictionRef.current.trim()
    : normalizeOutput(lastStdoutRef.current);
```

For these prediction types the toolbar hides the Run button and shows an `OutputPredictionPanel` text input instead of an editor:

```ts
const isPredictionType =
  question?.type === 'output_prediction' || question?.type === 'what_is_the_result';
```

### The server-side check (`POST /api/check-answer`)

`src/app/api/check-answer/route.ts` is the canonical grading path for Python (and non-`write_the_code` SQL/JS). It also serves as the attempt-recording endpoint for client-checked types. It:

1. **Rate-limits** by client IP (30 requests/minute) using a shared rate limiter from `src/lib/api/rate-limit.ts`:
   ```ts
   import { getClientIp, makeRateLimiter } from '@/lib/api/rate-limit'
   const checkRateLimit = makeRateLimiter(30)
   ```
   `getClientIp` prefers trusted-proxy headers (`cf-connecting-ip`, `x-real-ip`) over the spoofable `x-forwarded-for` chain.
2. **Validates** that `questionId` is a non-empty string within size limits, and that `language` is one of `python`/`javascript`/`sql` (returns 400 on invalid).
3. **Branches on `correct`**:
   - If the client supplies a boolean `correct` (client-checked types like SQL/JS `write_the_code`), the server uses it directly and skips the comparison.
   - Otherwise, the server calls `checkAnswerServer()` from `src/lib/answer-check.ts`, which reads the question row via Prisma (right table per language) and compares in TypeScript:
   ```ts
   import { checkAnswerServer } from '@/lib/answer-check'

   correct = await checkAnswerServer(questionId, userAnswer, language as Language)
   ```
   The comparison logic mirrors the former Supabase RPC:
   - `fill_in_the_blank`: case-insensitive trimmed token match against `answer` / `alternative_answer`.
   - Everything else: `normalizeOutput(userAnswer)` vs `normalizeOutput(expected_output ?? answer)`, also checking `alternative_answer`.
4. **Records the attempt** (community stats + per-user progress) via `recordAttempt`:
   ```ts
   const user = await getCurrentUser()
   const reward = await recordAttempt({
     userId: user?.id ?? null,
     questionId,
     language,
     correct,
   })

   return NextResponse.json({ correct, reward })
   ```

The client treats only `data.correct === true` as a pass. Network/timeout failures are explicitly **not** counted as wrong attempts so a flaky connection can't burn a learner's attempts.

`reportAttempt` (`src/lib/report-attempt.ts`) is the client-side helper for client-checked types — it POSTs `{ questionId, language, correct }` to `/api/check-answer` and returns the `reward`:

```ts
export async function reportAttempt(
  questionId: string,
  language: string,
  correct: boolean
): Promise<SolveReward | null> {
  const res = await fetch('/api/check-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, language, correct }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { reward?: SolveReward | null }
  return data.reward ?? null
}
```

### Client-side check for SQL `write_the_code`

SQL `write_the_code` answers are stored as a reference query (not a precomputed expected output), so grading must actually run SQL. `SqlCompiler.handleSubmit` calls `checkAnswer` from the `usePglite` hook:

```ts
const handleSubmit = useCallback(async () => {
  const q = questionRef.current;
  if (!onAttemptRef.current || !q) return;

  if (q.type === 'write_the_code') {
    const { setupSql } = parseSqlQuestion(q.question);
    try {
      const correct = await checkAnswer(codeRef.current, q.answer, setupSql || undefined);
      const reward = await reportAttempt(q.id, 'sql', correct);
      onAttemptRef.current(correct, correct ? undefined : {
        userCode: codeRef.current,
        userAnswer: '',
      }, reward);
    } catch (err) {
      console.error('[SqlCompiler] checkAnswer failed:', err);
      onAttemptRef.current(false, { userCode: codeRef.current, userAnswer: '' });
    }
    return;
  }
  // … non-write_the_code SQL falls through to /api/check-answer
}, [checkAnswer]);
```

`checkAnswer` runs *both* the user query and the reference query inside `BEGIN`/`ROLLBACK` transactions with identical setup, then compares row sets **order-insensitively** with a float epsilon for numeric columns:

```ts
function rowsDeepEqual(
  userRows: Record<string, unknown>[],
  refRows: Record<string, unknown>[]
): boolean {
  if (userRows.length !== refRows.length) return false;

  const rowToKey = (row: Record<string, unknown>) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(row)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, v ?? null])
      )
    );

  const sorted = (rows: Record<string, unknown>[]) =>
    [...rows].sort((a, b) => rowToKey(a).localeCompare(rowToKey(b)));

  const sUser = sorted(userRows);
  const sRef = sorted(refRows);

  return sUser.every((rowA, i) => {
    const rowB = sRef[i];
    const keysA = Object.keys(rowA).sort();
    const keysB = Object.keys(rowB).sort();
    if (JSON.stringify(keysA) !== JSON.stringify(keysB)) return false;
    return keysA.every((k) => {
      const vA = rowA[k] ?? null;
      const vB = rowB[k] ?? null;
      if (typeof vA === 'number' && typeof vB === 'number') {
        return Math.abs(vA - vB) < 1e-9;
      }
      return String(vA) === String(vB);
    });
  });
}
```

### Client-side check for JS `write_the_code`

JavaScript `write_the_code` grading reuses the JS worker. `WorkerBridge.checkAnswer` posts a `check` message containing the user code and the reference code:

```ts
checkAnswer(code: string, referenceCode: string, setupCode?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!this.worker) { resolve(false); return; }
    const handler = (e: MessageEvent) => {
      const data = e.data as Record<string, unknown>;
      if (data.type === 'check_result') {
        this.worker!.removeEventListener('message', handler);
        clearTimeout(tid);
        resolve(Boolean(data.correct));
      }
    };
    this.worker.addEventListener('message', handler);
    const tid = setTimeout(() => {
      this.worker?.removeEventListener('message', handler);
      resolve(false);
    }, TIMEOUT_MS);
    this.worker.postMessage({ type: 'check', code, referenceCode, setupCode });
  });
}
```

In `public/js-worker.js` the `check` handler runs *both* snippets through the same sandboxed runner and compares their normalised stdout:

```js
self.onmessage = function (e) {
  const { type, code, referenceCode } = e.data;

  if (type === 'check') {
    const { stdoutLines: userLines } = runCode(code);
    const { stdoutLines: refLines } = runCode(referenceCode);
    const correct = normalizeLines(userLines) === normalizeLines(refLines);
    self.postMessage({ type: 'check_result', correct });
    return;
  }
  // … "run" handling
};
```

### Summary matrix

| Type | Language | Where it's graded | What is compared |
|---|---|---|---|
| `write_the_code` | Python | Server (`checkAnswerServer` via Prisma) | Normalised stdout vs `expected_output`/`answer` + `alternative_answer` |
| `write_the_code` | JavaScript | Client (`js-worker.js` `check`) → server records | Normalised stdout of user code vs reference code |
| `write_the_code` | SQL | Client (`usePglite.checkAnswer`) → server records | Row-set deep equality (order-insensitive) vs reference query |
| `fill_in_the_blank` | Python | Server (`checkAnswerServer` via Prisma) | Extracted fill token vs stored answer (case-insensitive) |
| `output_prediction` / `what_is_the_result` | any | Server (`checkAnswerServer` via Prisma) | User's typed prediction vs stored answer (no execution) |
| `spot_the_bug` | any | **Not auto-checked** | Learner self-reports; UI never marks correct |

### After the check — attempts, statuses, and progress

The host passes the result to `onAttempt(passed, wrongContext?, reward?)`, which the parent components use to:

- update `localStorage` progress keys (`qstatus:<id>` and `qattempts:<id>`),
- reveal the solution/explanation panel after `MAX_ATTEMPTS` (5) wrong attempts,
- show a success overlay,
- report the attempt for community/per-user stats via `recordAttempt`.

`localStorage` keys (managed in `src/lib/storage.ts`):

- `qstatus:<id>` — `not_started` | `attempted` | `solved` | `skipped`
- `qattempts:<id>` — integer attempt count
- `qcode:<id>` — saved code draft (debounced autosave in `Compiler.tsx`)
- `session:last` — `{ questionId, tier }` for restoring the last session

```ts
export function setSavedCode(id: string, code: string): void {
  try {
    safeLocalStorage()?.setItem(`qcode:${id}`, code)
  } catch { /* quota exceeded or unavailable */ }
}

export function setLastSession(questionId: string, tier: string): void {
  try {
    safeLocalStorage()?.setItem(
      'session:last',
      JSON.stringify({ questionId, tier })
    )
  } catch { /* quota exceeded or unavailable */ }
}
```

---

## Data Flow

```
[lang]/page.tsx (server)
  ├─ getQuestions() → Supabase anon client → questions table
  ├─ getServerProgress() → Prisma → question_progress table
  └─ passes Question[] + statuses to DashboardClient

DashboardClient (client)
  └─ holds selectedQuestion, statuses, attempt counts
       └─ renders HomeClient → Compiler → EditorPanel / OutputPanel

On run:
  Compiler → WorkerBridge → /pyodide-worker.js | /js-worker.js   (Python / JS)
  SqlCompiler → usePglite (PGlite on main thread)                (SQL)

On submit:
  Python auto-check → POST /api/check-answer → checkAnswerServer() via Prisma → { correct, reward }
  JS write_the_code → WorkerBridge.checkAnswer (js-worker 'check') → reportAttempt → POST /api/check-answer (with correct)
  SQL write_the_code → usePglite.checkAnswer (BEGIN/ROLLBACK + rowsDeepEqual) → reportAttempt → POST /api/check-answer (with correct)
  spot_the_bug → no auto-check

Compiler/[id] route:
  findQuestionLanguage(id) → Prisma (queries all 3 tables in parallel) → language or 404

Progress:
  localStorage keys: qstatus:<id>, qattempts:<id>, qcode:<id>, session:last
  Server-side (signed-in): Prisma question_progress table
```

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
| `type` | `QuestionType` | See [Question Classification](#question-classification) |
| `question` | `string` | Prompt shown to the user |
| `answer` | `string` | Expected output / token / reference query |
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
npm run db:migrate   # Apply Prisma migrations (dev)
npm run db:deploy    # Deploy Prisma migrations
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Open Prisma Studio
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