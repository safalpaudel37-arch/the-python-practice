# SQL Compiler Feature — Claude Code Implementation Plan

## Context

This is an **additive feature** on an existing Next.js 16 / React 19 / Tailwind CSS 4 project that already has Python and JavaScript compilers. The existing architecture uses:
- A single `Compiler.tsx` that branches on `question?.language` to select a worker URL
- Web Workers (`public/pyodide-worker.js`, `public/js-worker.js`) for isolated execution
- CodeMirror 6 for editing (with `@codemirror/lang-python` and `@codemirror/lang-javascript`)
- `WorkerBridge` for main-thread ↔ worker communication
- Tailwind CSS 4 with a custom dark theme (prussian-blue background, sky-aqua / amber accents)

The SQL compiler should:
- Only mount/load when the user selects a SQL question (lazy-loaded via Next.js dynamic import)
- Use PGlite (PostgreSQL WASM) as the execution engine, running **on the main thread** via a React hook (PGlite WASM is not straightforwardly usable inside a Web Worker with the existing WorkerBridge protocol)
- Persist the database to localStorage between sessions
- Run queries as a single batch
- Show friendly, learner-readable error messages
- Come with pre-seeded sample tables
- Render query results as a table (not stdout text)
- Use CodeMirror 6 with SQL syntax highlighting (not a textarea)

**Do not** modify the existing Python or JavaScript compiler logic. All SQL changes are either new files or additive branches in existing files.

---

## 1. Dependencies to Install

```bash
npm install @electric-sql/pglite @codemirror/lang-sql
```

---

## 2. File Structure to Create

All new files go under the existing `src/` structure. Do not reorganize existing files.

```
src/
  components/
    sql/
      SqlCompiler.tsx         # Main SQL compiler component (lazy-loaded entry point)
      SqlResultTable.tsx      # Renders query output as a <table>
      SqlErrorDisplay.tsx     # Friendly error message card
      SqlSchemaPanel.tsx      # Collapsible Available Tables sidebar
      usePglite.ts            # Hook: DB init, query execution, localStorage sync
      seedData.ts             # Pre-seeded table definitions + INSERT data
      sqlErrorParser.ts       # Converts raw PGlite errors → friendly messages
```

Existing files to **modify** (additive only):

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `'sql'` to `Language` union |
| `src/components/Compiler.tsx` | Add SQL branch: lazy-load `SqlCompiler` when `language === 'sql'` |
| `src/components/CompilerToolbar.tsx` | Add SQL case for filename and loading label |
| `src/components/EditorPanel.tsx` | Add `@codemirror/lang-sql` syntax support |
| `src/app/[lang]/page.tsx` | Add `'sql'` to `SUPPORTED_LANGS` |
| `src/lib/supabase/queries.ts` | Ensure `Language` type import is updated (auto-follows types.ts) |
| `next.config.ts` | Add `asyncWebAssembly: true` webpack experiment |

---

## 3. Step-by-Step Implementation

### Step 1 — Extend the `Language` type

**File:** `src/lib/types.ts`

Change:
```ts
export type Language = 'python' | 'javascript';
```
To:
```ts
export type Language = 'python' | 'javascript' | 'sql';
```

That's the only change needed in types.ts. Every downstream consumer (`getQuestions`, `Compiler.tsx`, toolbar, etc.) already reads from this union.

---

### Step 2 — Add WASM support to Next.js config

**File:** `next.config.ts`

Add a `webpack` function to enable async WebAssembly (required by PGlite's `.wasm` binary). Also add `transpilePackages` since PGlite is ESM-only.

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@electric-sql/pglite'],
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

### Step 3 — Add SQL route

**File:** `src/app/[lang]/page.tsx`

Find the `SUPPORTED_LANGS` set and add `'sql'`:

```ts
const SUPPORTED_LANGS = new Set(['python', 'javascript', 'sql']);
```

No other changes needed — the page already reads `lang` from params and passes it to `getQuestions(lang)`, which filters by `language` column in Supabase.

---

### Step 4 — Add SQL syntax to CodeMirror editor

**File:** `src/components/EditorPanel.tsx`

The editor already lazy-loads language support. Add the SQL branch:

```ts
import { sql } from '@codemirror/lang-sql';

// In the language extension loading logic (wherever python() / javascript() is selected):
const langExtension =
  language === 'sql' ? sql() :
  language === 'javascript' ? javascript() :
  python();
```

---

### Step 5 — Update CompilerToolbar for SQL

**File:** `src/components/CompilerToolbar.tsx`

Find the filename / loading label lines and add SQL:

```ts
const filename =
  language === 'sql' ? 'query.sql' :
  language === 'javascript' ? 'main.js' :
  'main.py';

const loadingLabel =
  language === 'sql' ? 'Loading DB…' :
  language === 'javascript' ? 'Loading JavaScript…' :
  'Loading Python…';
```

---

### Step 6 — Create `src/components/sql/seedData.ts`

```ts
export const SEED_SQL = `
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS customers;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS employees;
  DROP TABLE IF EXISTS departments;

  CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    country VARCHAR(50),
    created_at DATE
  );

  CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(50),
    price NUMERIC(10, 2),
    stock INT
  );

  CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    product_id INT REFERENCES products(id),
    quantity INT,
    order_date DATE,
    status VARCHAR(20)
  );

  CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    budget NUMERIC(12, 2)
  );

  CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department_id INT REFERENCES departments(id),
    salary NUMERIC(10, 2),
    hire_date DATE
  );

  INSERT INTO customers (name, email, country, created_at) VALUES
    ('Alice Johnson', 'alice@example.com', 'USA', '2022-01-15'),
    ('Bob Smith', 'bob@example.com', 'UK', '2022-03-22'),
    ('Carol White', 'carol@example.com', 'Canada', '2023-06-10'),
    ('David Lee', 'david@example.com', 'USA', '2023-08-05'),
    ('Eva Martinez', 'eva@example.com', 'Spain', '2024-01-30');

  INSERT INTO products (name, category, price, stock) VALUES
    ('Laptop Pro', 'Electronics', 1299.99, 50),
    ('Wireless Mouse', 'Electronics', 29.99, 200),
    ('SQL Mastery Book', 'Books', 49.99, 150),
    ('Standing Desk', 'Furniture', 499.99, 30),
    ('Noise Cancelling Headphones', 'Electronics', 199.99, 75);

  INSERT INTO orders (customer_id, product_id, quantity, order_date, status) VALUES
    (1, 1, 1, '2024-02-01', 'delivered'),
    (1, 2, 2, '2024-02-15', 'delivered'),
    (2, 3, 1, '2024-03-01', 'shipped'),
    (3, 5, 1, '2024-03-10', 'processing'),
    (4, 4, 1, '2024-03-20', 'delivered'),
    (5, 2, 3, '2024-04-01', 'shipped'),
    (2, 1, 1, '2024-04-10', 'processing');

  INSERT INTO departments (name, budget) VALUES
    ('Engineering', 500000.00),
    ('Marketing', 200000.00),
    ('Sales', 300000.00),
    ('HR', 150000.00);

  INSERT INTO employees (name, department_id, salary, hire_date) VALUES
    ('Alice Johnson', 1, 95000.00, '2020-03-01'),
    ('Bob Smith', 2, 72000.00, '2021-06-15'),
    ('Carol White', 1, 105000.00, '2019-11-20'),
    ('David Lee', 3, 68000.00, '2022-01-10'),
    ('Eva Martinez', 4, 61000.00, '2023-05-05'),
    ('Frank Chen', 1, 88000.00, '2021-09-30');
`;

export const AVAILABLE_TABLES = [
  { name: 'customers', columns: ['id', 'name', 'email', 'country', 'created_at'] },
  { name: 'products', columns: ['id', 'name', 'category', 'price', 'stock'] },
  { name: 'orders', columns: ['id', 'customer_id', 'product_id', 'quantity', 'order_date', 'status'] },
  { name: 'departments', columns: ['id', 'name', 'budget'] },
  { name: 'employees', columns: ['id', 'name', 'department_id', 'salary', 'hire_date'] },
] as const;
```

---

### Step 7 — Create `src/components/sql/sqlErrorParser.ts`

```ts
interface FriendlyError {
  title: string;
  message: string;
  hint?: string;
}

export function parseSqlError(raw: string): FriendlyError {
  const msg = raw.toLowerCase();

  if (msg.includes('syntax error')) {
    const near = raw.match(/near "(.+?)"/i)?.[1];
    return {
      title: 'Syntax Error',
      message: near
        ? `There's a syntax problem near "${near}". Double-check your spelling and punctuation.`
        : "There's a syntax problem in your query. Check for missing commas, keywords, or parentheses.",
      hint: 'Tip: SQL keywords like SELECT, FROM, WHERE must be in the right order.',
    };
  }

  if (msg.includes('no such table') || msg.includes('does not exist')) {
    const table = raw.match(/table "?(\w+)"?/i)?.[1];
    return {
      title: 'Table Not Found',
      message: table
        ? `The table "${table}" doesn't exist. Check the Available Tables panel for the correct name.`
        : "You referenced a table that doesn't exist.",
      hint: 'Table names are case-sensitive in PostgreSQL.',
    };
  }

  if (msg.includes('column') && msg.includes('does not exist')) {
    const col = raw.match(/column "?(\w+)"?/i)?.[1];
    return {
      title: 'Column Not Found',
      message: col
        ? `The column "${col}" doesn't exist in this table.`
        : "You referenced a column that doesn't exist.",
      hint: 'Use SELECT * to see all available columns first.',
    };
  }

  if (msg.includes('division by zero')) {
    return {
      title: 'Division by Zero',
      message: 'Your query tried to divide by zero.',
      hint: 'Wrap the divisor in a NULLIF check: NULLIF(column, 0)',
    };
  }

  if (msg.includes('permission denied')) {
    return {
      title: 'Permission Denied',
      message: 'This operation is not allowed in the sandbox.',
    };
  }

  if (msg.includes('unique') || msg.includes('duplicate')) {
    return {
      title: 'Duplicate Value',
      message: "You're trying to insert a value that already exists in a column that requires unique values.",
    };
  }

  if (msg.includes('foreign key') || msg.includes('violates')) {
    return {
      title: 'Data Constraint Violation',
      message: 'Your query violates a table constraint (e.g. a foreign key or unique rule).',
    };
  }

  return {
    title: 'Query Error',
    message: raw.length > 200 ? raw.slice(0, 200) + '…' : raw,
  };
}
```

---

### Step 8 — Create `src/components/sql/usePglite.ts`

> **Before writing this file:** Check `node_modules/@electric-sql/pglite/README.md` to verify the `dumpDataDir` API exists for the installed version. Adjust the persistence strategy if needed (or skip persistence if `dumpDataDir` is unavailable — seed runs fast).

```ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { SEED_SQL } from './seedData';
import { parseSqlError } from './sqlErrorParser';

const DB_STORAGE_KEY = 'sql_compiler_db';

export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
};

export type SqlExecutionResult =
  | { status: 'success'; results: QueryResult[] }
  | { status: 'error'; title: string; message: string; hint?: string }
  | { status: 'empty'; message: string };

export function usePglite() {
  const dbRef = useRef<PGlite | null>(null);
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        db = new PGlite();
        await db.exec(SEED_SQL);
        dbRef.current = db;
        setReady(true);
      } catch (err) {
        console.error('PGlite init failed:', err);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, []);

  const runQuery = useCallback(async (sql: string): Promise<SqlExecutionResult> => {
    if (!dbRef.current) {
      return { status: 'error', title: 'Not Ready', message: 'The database is still loading.' };
    }

    const trimmed = sql.trim();
    if (!trimmed) {
      return { status: 'empty', message: 'Write a SQL query and hit Run.' };
    }

    try {
      const raw = await dbRef.current.exec(trimmed);

      const results: QueryResult[] = raw
        .filter(r => r.fields && r.fields.length > 0)
        .map(r => ({
          columns: r.fields.map((f: { name: string }) => f.name),
          rows: r.rows as Record<string, unknown>[],
        }));

      if (results.length === 0) {
        return { status: 'empty', message: 'Query ran successfully. No rows returned.' };
      }

      return { status: 'success', results };
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      return { status: 'error', ...parseSqlError(raw) };
    }
  }, []);

  const resetDb = useCallback(async () => {
    if (dbRef.current) {
      await dbRef.current.exec(SEED_SQL);
    }
  }, []);

  return { ready, initializing, runQuery, resetDb };
}
```

> **Note on persistence:** The simple approach above re-seeds on every mount. If you want persistence across page refreshes, check whether `PGlite` supports `dumpDataDir()` / `loadDataDir` in the installed version, then wrap the init in a try-restore-or-seed pattern (see original plan for the base64 localStorage pattern). Persistence is optional for v1.

---

### Step 9 — Create `src/components/sql/SqlResultTable.tsx`

Use Tailwind classes that match the existing dark theme (prussian-blue background, sky-aqua borders).

```tsx
import type { QueryResult } from './usePglite';

export function SqlResultTable({ results }: { results: QueryResult[] }) {
  return (
    <div className="flex flex-col gap-4">
      {results.map((result, i) => (
        <div key={i}>
          {results.length > 1 && (
            <p className="text-xs text-[var(--sky-aqua)] mb-1 font-mono">Result set {i + 1}</p>
          )}
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full text-sm font-mono text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {result.columns.map(col => (
                    <th key={col} className="px-3 py-2 text-[var(--sky-aqua)] font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 ? (
                  <tr>
                    <td colSpan={result.columns.length} className="px-3 py-4 text-center text-white/40 italic">
                      No rows returned
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-white/5 hover:bg-white/5">
                      {result.columns.map(col => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap text-white/80">
                          {row[col] === null ? (
                            <span className="text-white/30 italic">NULL</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-white/40 mt-1 font-mono">{result.rows.length} row(s)</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Step 10 — Create `src/components/sql/SqlErrorDisplay.tsx`

```tsx
export function SqlErrorDisplay({
  title,
  message,
  hint,
}: {
  title: string;
  message: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-400">⚠</span>
        <strong className="text-red-300 font-mono text-sm">{title}</strong>
      </div>
      <p className="text-red-200/80 text-sm font-mono">{message}</p>
      {hint && (
        <p className="mt-2 text-[var(--sky-aqua)]/80 text-xs font-mono">💡 {hint}</p>
      )}
    </div>
  );
}
```

---

### Step 11 — Create `src/components/sql/SqlSchemaPanel.tsx`

```tsx
import { AVAILABLE_TABLES } from './seedData';

export function SqlSchemaPanel() {
  return (
    <div className="text-xs font-mono">
      <p className="text-white/40 uppercase tracking-wider mb-2 text-[10px]">Available Tables</p>
      <div className="flex flex-col gap-1">
        {AVAILABLE_TABLES.map(table => (
          <details key={table.name} className="group">
            <summary className="cursor-pointer text-[var(--sky-aqua)] hover:text-white transition-colors py-0.5 list-none flex items-center gap-1">
              <span className="text-white/30 group-open:rotate-90 transition-transform inline-block">▶</span>
              {table.name}
            </summary>
            <ul className="ml-4 mt-0.5 flex flex-col gap-0.5">
              {table.columns.map(col => (
                <li key={col} className="text-white/50">{col}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
```

---

### Step 12 — Create `src/components/sql/SqlCompiler.tsx` (main entry point)

This is the lazily-loaded component. It receives `question` so it can wire up answer checking.

```tsx
'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { usePglite } from './usePglite';
import { SqlResultTable } from './SqlResultTable';
import { SqlErrorDisplay } from './SqlErrorDisplay';
import { SqlSchemaPanel } from './SqlSchemaPanel';
import type { Question } from '@/lib/types';

// Mirror the ref handle shape from Compiler.tsx so the parent can call run() / reset()
export type SqlCompilerHandle = {
  run: () => void;
  reset: () => void;
};

type Props = {
  question?: Question | null;
  initialCode?: string;
  onAttempt?: (passed: boolean) => void;
  onStatusChange?: (status: string, ready: boolean, hasRun: boolean) => void;
};

const SQL_STARTER = 'SELECT * FROM customers;';

const SqlCompiler = forwardRef<SqlCompilerHandle, Props>(function SqlCompiler(
  { question, initialCode, onAttempt, onStatusChange },
  ref
) {
  const { ready, initializing, runQuery, resetDb } = usePglite();
  const [sql, setSql] = useState(initialCode ?? SQL_STARTER);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runQuery>> | null>(null);
  const [running, setRunning] = useState(false);
  const hasRun = useRef(false);

  const status = initializing ? 'initializing' : !ready ? 'error' : running ? 'running' : 'idle';

  async function handleRun() {
    if (!ready || running) return;
    setRunning(true);
    hasRun.current = true;
    const res = await runQuery(sql);
    setResult(res);
    setRunning(false);
    onStatusChange?.(res.status === 'error' ? 'error' : 'idle', ready, true);

    // Answer checking: compare serialized result to stored answer
    
    if (res.status === 'success' && question && onAttempt) {
      const rows = res.results[0]?.rows ?? [];
      const userAnswer = JSON.stringify(rows);
      try {
        const r = await fetch('/api/check-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: question.id, userAnswer }),
        });
        const data = await r.json();
        onAttempt(data.correct);
      } catch {
        // Answer check is best-effort
      }
    }
  }

  async function handleReset() {
    await resetDb();
    setSql(SQL_STARTER);
    setResult(null);
    hasRun.current = false;
  }

  useImperativeHandle(ref, () => ({
    run: handleRun,
    reset: handleReset,
  }));

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar row */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-xs font-mono text-white/40">query.sql</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleRun}
            disabled={!ready || running}
            className="px-3 py-1 text-sm rounded bg-[var(--sky-aqua)] text-[var(--prussian-blue-2)] font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
          >
            {initializing ? 'Loading DB…' : running ? 'Running…' : 'Run SQL'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1 text-sm rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
          >
            Reset Data
          </button>
        </div>
      </div>

      {/* Main split: editor left, output right */}
      <div className="flex flex-1 gap-2 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <textarea
            value={sql}
            onChange={e => setSql(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRun();
              }
            }}
            spellCheck={false}
            placeholder="Write your SQL query here… (Ctrl+Enter to run)"
            className="flex-1 w-full resize-none rounded border border-white/10 bg-[var(--prussian-blue-2)] p-3 text-sm font-mono text-white/90 placeholder:text-white/30 focus:outline-none focus:border-[var(--sky-aqua)]/50"
          />
        </div>

        {/* Output + schema */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Query output */}
          <div className="flex-1 overflow-auto rounded border border-white/10 bg-[var(--prussian-blue-2)] p-3">
            {result === null && (
              <p className="text-white/30 text-sm font-mono italic">
                Results will appear here after you run a query. (Ctrl+Enter)
              </p>
            )}
            {result?.status === 'success' && <SqlResultTable results={result.results} />}
            {result?.status === 'error' && (
              <SqlErrorDisplay title={result.title} message={result.message} hint={result.hint} />
            )}
            {result?.status === 'empty' && (
              <p className="text-white/50 text-sm font-mono">{result.message}</p>
            )}
          </div>

          {/* Schema browser */}
          <div className="rounded border border-white/10 bg-[var(--prussian-blue-2)] p-3 max-h-48 overflow-auto">
            <SqlSchemaPanel />
          </div>
        </div>
      </div>
    </div>
  );
});

export default SqlCompiler;
```

> **Editor note:** The plan above uses a `<textarea>` as a fallback to avoid complexity. If you want CodeMirror 6 with SQL highlighting (which is the correct approach for this project), replace the textarea with a `CodeMirror` instance using `@codemirror/lang-sql` — look at how `EditorPanel.tsx` initializes CodeMirror and replicate the pattern.

---

### Step 13 — Hook `SqlCompiler` into `Compiler.tsx`

**File:** `src/components/Compiler.tsx`

Find where `language` is detected (around lines 117–119):

```ts
const language = question?.language ?? 'python';
const workerUrl = language === 'javascript' ? '/js-worker.js' : '/pyodide-worker.js';
```

After the import block at the top, add:

```ts
import dynamic from 'next/dynamic';

const SqlCompiler = dynamic(() => import('@/components/sql/SqlCompiler'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-white/40 text-sm font-mono">
      Loading SQL engine…
    </div>
  ),
});
```

Then in the component's return/render, before (or instead of) the existing editor+output layout, add an early-return branch for SQL:

```tsx
if (language === 'sql') {
  return (
    <SqlCompiler
      ref={ref}          // forward the CompilerHandle ref if applicable
      question={question}
      initialCode={initialCode}
      onAttempt={onAttempt}
      onStatusChange={onStatusChange}
    />
  );
}
// ... existing Python/JS render below
```

Place this branch after the `language` constant is declared but before the Worker is initialized. This ensures PGlite only loads on SQL questions and no Python/JS worker is spawned unnecessarily.

---

## 4. Answer Checking for SQL Questions

SQL questions stored in Supabase should have their `answer` field set to a JSON string of expected rows, e.g.:

```json
[{"name":"Alice Johnson","country":"USA"},{"name":"David Lee","country":"USA"}]
```

The `SqlCompiler` POSTs `JSON.stringify(rows)` to `/api/check-answer`. The Supabase RPC `check_answer` already does string matching. For SQL, this works as long as row ordering is consistent (add `ORDER BY` to both the expected answer and the question's expected output).

Alternatively, add a new SQL-specific comparison function to the `check_answer` Supabase RPC, or parse both sides as JSON and compare sets. For v1, string comparison with a canonical `ORDER BY` is sufficient.

---

## 5. Testing Checklist

After implementation, verify:

- [ ] SQL compiler does NOT load on Python/JS questions (Network tab — no PGlite WASM download)
- [ ] `/sql` route renders the question dashboard for SQL questions
- [ ] SQL compiler mounts and shows "Loading DB…" then "Run SQL"
- [ ] `SELECT * FROM customers` returns 5 rows in a table
- [ ] `SELECT * FROM nonexistent` shows a friendly "Table Not Found" error
- [ ] `SELECT * FROM customers WHERE` (incomplete) shows a friendly "Syntax Error"
- [ ] Ctrl+Enter triggers run
- [ ] "Reset Data" re-seeds the database and clears results
- [ ] NULL values display as styled NULL, not empty string
- [ ] Wide result tables scroll horizontally without breaking layout
- [ ] Schema panel shows all 5 table names and their columns
- [ ] Python and JavaScript questions are unaffected

---

## 6. Known Gotchas

1. **PGlite is ESM-only** — handled by `transpilePackages: ['@electric-sql/pglite']` in `next.config.ts`.

2. **WASM in Next.js** — handled by `asyncWebAssembly: true` in webpack config.

3. **`'use client'`** — `SqlCompiler.tsx` must have `'use client'` at the top; PGlite uses browser APIs.

4. **COOP/COEP headers** — already present in `next.config.ts`; PGlite doesn't require SharedArrayBuffer but the headers won't conflict.

5. **`dumpDataDir` API** — Check `node_modules/@electric-sql/pglite/README.md` before implementing persistence. If unavailable, simply re-run `SEED_SQL` on every mount (fast, ~100ms).

6. **`ref` forwarding** — `Compiler.tsx` exposes a `CompilerHandle` ref (`run`, `submit`, `reset`, `focusEditor`, etc.). `SqlCompiler` should implement at minimum `run` and `reset` via `useImperativeHandle` so the toolbar buttons (`CompilerToolbar`) still work if they call via ref.

7. **CompilerToolbar wiring** — Check whether `CompilerToolbar` calls `run`/`submit` via the ref or via direct props. If via ref, make sure `SqlCompiler` forwards the same `CompilerHandle` interface. If SQL questions don't have `submit` (no auto-check), return a no-op for `submit`.
