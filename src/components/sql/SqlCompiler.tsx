'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import CompilerToolbar from '@/components/CompilerToolbar';
import { SqlResultTable } from './SqlResultTable';
import { SqlErrorDisplay } from './SqlErrorDisplay';
import { SqlSchemaPanel } from './SqlSchemaPanel';
import { usePglite } from './usePglite';
import { parseSqlQuestion } from '@/lib/sql/parse';
import { SQL_STARTER_CODE } from '@/lib/config';
import { setSavedCode } from '@/lib/storage';
import { reportAttempt } from '@/lib/report-attempt';
import type { SolveReward } from '@/lib/tracking';
import type { Question } from '@/lib/types';
import type { EditorPanelHandle } from '@/components/EditorPanel';
import type { CompilerHandle, WrongAttemptContext } from '@/components/Compiler';

type Status = 'idle' | 'loading' | 'running' | 'error';

interface HintProps {
  question: Question;
  wrongContext: WrongAttemptContext;
}

interface Props {
  question?: Question | null;
  initialCode?: string;
  onAttempt?: (passed: boolean, wrongContext?: WrongAttemptContext, reward?: SolveReward | null) => void;
  onStatusChange?: (status: Status, bridgeReady: boolean, hasRun: boolean) => void;
  hintProps?: HintProps;
}

const EditorPanel = dynamic(() => import('@/components/EditorPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading editor…</span>
    </div>
  ),
});

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const SqlCompiler = forwardRef<CompilerHandle, Props>(function SqlCompiler(
  { question, initialCode, onAttempt, onStatusChange, hintProps },
  ref
) {
  const { ready, initializing, initError, runQuery, checkAnswer, resetDb } = usePglite();

  const defaultCode = initialCode ?? SQL_STARTER_CODE;
  const [code, setCode] = useState(defaultCode);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runQuery>> | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [hasRun, setHasRun] = useState(false);

  const [split, setSplit] = useState(60);
  const [schemaRefreshKey, setSchemaRefreshKey] = useState(0);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorPanelHandle>(null);

  const codeRef = useRef(code);
  const questionRef = useRef(question);
  const onAttemptRef = useRef(onAttempt);
  const debouncedSave = useRef(
    debounce((id: string, value: string) => setSavedCode(id, value), 1000)
  );

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { onAttemptRef.current = onAttempt; }, [onAttempt]);

  // Sync status with PGlite readiness
  useEffect(() => {
    if (initializing) {
      setStatus('loading');
    } else if (ready) {
      setStatus('idle');
    } else if (initError) {
      setStatus('error');
    }
  }, [initializing, ready, initError]);

  // Reset when question changes
  useEffect(() => {
    setCode(initialCode ?? SQL_STARTER_CODE);
    setResult(null);
    setHasRun(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  // Report status changes to parent
  useEffect(() => {
    onStatusChange?.(status, ready, hasRun);
  }, [status, ready, hasRun, onStatusChange]);

  const handleRun = useCallback(async () => {
    if (!ready || status === 'running') return;
    localStorage.setItem('has_interacted', 'true');
    setStatus('running');
    setResult(null);

    const res = await runQuery(codeRef.current);
    setResult(res);
    setHasRun(true);
    setStatus('idle');
    setSchemaRefreshKey((k) => k + 1);
  }, [ready, status, runQuery]);

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

    // For other question types that have a stored expected output
    fetch('/api/check-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id, userAnswer: '', language: 'sql' }),
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => r.ok ? r.json() : { correct: false })
      .then((data: { correct?: boolean }) => {
        const passed = data.correct ?? false;
        onAttemptRef.current?.(passed, passed ? undefined : { userCode: codeRef.current, userAnswer: '' });
      })
      .catch(() => onAttemptRef.current?.(false, { userCode: codeRef.current, userAnswer: '' }));
  }, [checkAnswer]);

  const handleReset = useCallback(async () => {
    try {
      await resetDb();
    } catch (err) {
      console.error('[SqlCompiler] resetDb failed:', err);
      return;
    }
    const fresh = initialCode ?? SQL_STARTER_CODE;
    setCode(fresh);
    setResult(null);
    setHasRun(false);
    setSchemaRefreshKey((k) => k + 1);
    editorRef.current?.reset();
  }, [resetDb, initialCode]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    if (question?.id) {
      debouncedSave.current(question.id, value);
    }
  }, [question?.id]);

  useImperativeHandle(ref, () => ({
    run: handleRun,
    submit: handleSubmit,
    reset: handleReset,
    focusEditor: () => editorRef.current?.focus(),
    getStatus: () => status,
    isReady: () => ready,
  }));

  // Resizable drag handle
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const canSubmit = hasRun && ready && status === 'idle';

  return (
    <div className="flex flex-col h-full">
      <CompilerToolbar
        status={status}
        bridgeReady={ready}
        onRun={handleRun}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        hintProps={hintProps}
        language="sql"
      />

      <div ref={containerRef} className="flex flex-1 overflow-hidden md:flex-row flex-col">
        {/* Editor panel */}
        <div style={{ flexBasis: `${split}%` }} className="min-w-0 overflow-hidden min-h-[240px] md:min-h-0">
          <EditorPanel
            key={question?.id ?? 'sql-default'}
            ref={editorRef}
            initialCode={defaultCode}
            onChange={handleCodeChange}
            onRun={handleRun}
            language="sql"
          />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="w-1 bg-border hover:bg-primary cursor-col-resize hidden md:block shrink-0 transition-colors"
        />

        {/* Output + schema */}
        <div
          style={{ flexBasis: `${100 - split}%` }}
          className="min-w-0 overflow-hidden min-h-[180px] md:min-h-0 flex flex-col"
        >
          {/* Query output */}
          <div className="flex-1 overflow-auto p-4 bg-background font-mono text-sm">
            {initError && (
              <p className="text-destructive text-sm">
                Failed to initialize SQL engine: {initError}
              </p>
            )}
            {!initError && result === null && (
              <p className="text-muted-foreground select-none">
                Results will appear here after you run a query.
              </p>
            )}
            {result?.status === 'success' && <SqlResultTable results={result.results} />}
            {result?.status === 'error' && (
              <SqlErrorDisplay title={result.title} message={result.message} hint={result.hint} />
            )}
            {result?.status === 'empty' && (
              <p className="text-muted-foreground italic">{result.message}</p>
            )}
          </div>

          {/* Schema browser + reset */}
          <div className="border-t border-border p-3 bg-background flex flex-col gap-2 overflow-auto shrink-0" style={{ maxHeight: '55%' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider" />
              <button
                onClick={handleReset}
                disabled={!ready}
                className="text-xs font-mono text-muted-foreground hover:text-foreground border border-border hover:border-foreground/40 rounded px-2 py-1 transition-colors disabled:opacity-40 shrink-0"
              >
                Reset Data
              </button>
            </div>
            <SqlSchemaPanel
              runQuery={runQuery}
              ready={ready}
              refreshKey={schemaRefreshKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default SqlCompiler;
