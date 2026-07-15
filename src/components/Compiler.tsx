"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import OutputPanel from "@/components/OutputPanel";
import OutputPredictionPanel from "@/components/OutputPredictionPanel";
import CompilerToolbar from "@/components/CompilerToolbar";
import { ResizableSplit } from "@/components/ResizableSplit";
import { WorkerBridge, OutputLine, WorkerConfig } from "@/components/execution/worker-bridge";
import { AUTO_CHECK_TYPES, JS_STARTER_CODE, SQL_STARTER_CODE, STARTER_CODE } from "@/lib/config";
import { setSavedCode } from "@/lib/storage";
import { debounce, normalizeOutput } from "@/lib/utils";
import { reportAttempt } from "@/lib/report-attempt";
import type { SolveReward } from "@/lib/tracking";
import { parseSqlQuestion } from "@/lib/sql/parse";
import type { Question } from "@/lib/types";
import type { EditorPanelHandle } from "@/components/EditorPanel";

const EditorPanel = dynamic(() => import("@/components/EditorPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading editor…</span>
    </div>
  ),
});

const SqlCompiler = dynamic(() => import("@/components/sql/SqlCompiler"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading SQL engine…</span>
    </div>
  ),
});

type Status = "idle" | "loading" | "running" | "error";

export interface CompilerHandle {
  run(): void;
  submit(): void;
  reset(): void;
  focusEditor(): void;
  getStatus(): Status;
  isReady(): boolean;
}

export interface WrongAttemptContext {
  userCode: string;
  userAnswer: string;
}

interface HintProps {
  question: Question;
  wrongContext: WrongAttemptContext;
}

interface CompilerProps {
  question?: Question | null;
  initialCode?: string;
  onAttempt?: (passed: boolean, wrongContext?: WrongAttemptContext, reward?: SolveReward | null) => void;
  onStatusChange?: (status: Status, bridgeReady: boolean, hasRun: boolean) => void;
  hintProps?: HintProps;
}

let _lineId = 0;
function mkLine(text: string, type: OutputLine["type"]): OutputLine {
  return { id: String(_lineId++), text, type };
}

/**
 * Extract what the user typed in place of each blank marker (3+ underscores)
 * in the question template, then join multiple fills with ", ".
 */
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

const Compiler = forwardRef<CompilerHandle, CompilerProps>(function Compiler(
  { question, initialCode, onAttempt, onStatusChange, hintProps },
  ref
) {
  const language = question?.language ?? 'python';
  const workerConfig: WorkerConfig =
    language === 'sql'
      ? { url: '/sql-worker.js', type: 'module' }
      : language === 'javascript'
        ? '/js-worker.js'
        : '/pyodide-worker.js';
  const defaultCode =
    language === 'sql'
      ? SQL_STARTER_CODE
      : language === 'javascript'
        ? JS_STARTER_CODE
        : STARTER_CODE;
  const workerKey =
    typeof workerConfig === 'string' ? workerConfig : workerConfig.url;

  const [code, setCode] = useState(initialCode ?? defaultCode);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [inputPrompt, setInputPrompt] = useState<string | null>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [userPrediction, setUserPrediction] = useState('');

  const editorRef = useRef<EditorPanelHandle>(null);
  const bridgeRef = useRef<WorkerBridge | null>(null);
  const pendingOutputRef = useRef<string>('');
  const lastStdoutRef = useRef<string>('');
  const currentQuestionRef = useRef<Question | null | undefined>(question);
  const runningQuestionRef = useRef<Question | null | undefined>(null);
  const onAttemptRef = useRef(onAttempt);

  const codeRef = useRef(code);
  const userPredictionRef = useRef(userPrediction);
  const debouncedSave = useRef(
    debounce((id: string, value: string) => setSavedCode(id, value), 1000)
  );

  useEffect(() => {
    currentQuestionRef.current = question;
  }, [question]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    userPredictionRef.current = userPrediction;
  }, [userPrediction]);

  useEffect(() => {
    onAttemptRef.current = onAttempt;
  }, [onAttempt]);

  // Reset editor and output when question changes
  useEffect(() => {
    setCode(initialCode ?? defaultCode);
    setOutput([]);
    setInputPrompt(null);
    setHasRun(false);
    setUserPrediction('');
    // Clear stale refs so previous run's output can't bleed into the new question
    pendingOutputRef.current = '';
    lastStdoutRef.current = '';
    runningQuestionRef.current = null;
  // initialCode and defaultCode intentionally excluded — only reset on question change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  useEffect(() => {
    setBridgeReady(false);
    setStatus("loading");

    // SQL questions are handled by SqlCompiler (main-thread PGlite) — no worker needed
    if (language === 'sql') return;

    if (language === 'python' && typeof SharedArrayBuffer === "undefined") {
      setOutput([mkLine(
        "⚠️ SharedArrayBuffer not available. The input() function will not work. Please use Chrome or Firefox with cross-origin isolation enabled.",
        "error"
      )]);
      setStatus("idle");
      setBridgeReady(true);
    }

    const bridge = new WorkerBridge({
      onReady: () => {
        setBridgeReady(true);
        setStatus("idle");
      },
      onResult: (stdout, stderr) => {
        setStatus("idle");
        setInputPrompt(null);
        setHasRun(true);
        lastStdoutRef.current = stdout;

        setOutput((prev) => {
          const next = [...prev];
          if (stdout) {
            next.push(
              ...stdout
                .split("\n")
                .filter((l, i, a) => i < a.length - 1 || l)
                .map((l): OutputLine => mkLine(l, "stdout"))
            );
          }
          if (stderr) {
            next.push(mkLine(stderr, "stderr"));
          }
          return next;
        });
      },
      onInputRequest: (prompt) => {
        setInputPrompt(prompt);
      },
      onError: (message, kind) => {
        setStatus("idle");
        setInputPrompt(null);
        // A run that errors (syntax error, runtime exception, timeout, crash) is
        // still a completed run — mark hasRun so Submit stays enabled. Otherwise the
        // user is stuck: with Submit disabled they can never record an attempt, so
        // the Hint button and reveal-answer panel (both gated behind an attempt)
        // never unlock. The error is already shown in the output panel above.
        setHasRun(true);
        if (kind === "timeout") {
          // Clear stale output before showing timeout — avoids confusing mix of old and new
          setOutput([
            mkLine("⏱ Execution timed out (1 minute limit exceeded).", "timeout"),
            mkLine("Tip: check for infinite loops or very large data operations.", "timeout"),
          ]);
        } else {
          setOutput((prev) => [...prev, mkLine(message, "error")]);
        }
        if (kind === "crash" || kind === "timeout") {
          setBridgeReady(false);
        }
      },
    }, workerConfig);

    bridgeRef.current = bridge;
    return () => bridge.terminate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerKey]);

  const handleRun = useCallback(() => {
    if (!bridgeRef.current) return;
    localStorage.setItem("has_interacted", "true");
    runningQuestionRef.current = currentQuestionRef.current;
    setOutput([]);
    setInputPrompt(null);
    setHasRun(false);
    lastStdoutRef.current = '';
    setStatus("running");

    const q = currentQuestionRef.current;
    const setupCode =
      q?.language === 'sql' ? parseSqlQuestion(q.question).setupSql : undefined;
    bridgeRef.current.run(code, setupCode || undefined);
  }, [code]);

  const handleSubmit = useCallback(() => {
    const q = currentQuestionRef.current;
    if (!onAttemptRef.current) return;

    // Client-side check for SQL and JS write_the_code — no pre-computed expected_output
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
          // Network/timeout errors must not count as a wrong attempt
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
      onAttemptRef.current(false, { userCode: codeRef.current, userAnswer: '' });
    }
  }, []);

  useImperativeHandle(ref, () => ({
    run: handleRun,
    submit: handleSubmit,
    reset: () => editorRef.current?.reset(),
    focusEditor: () => editorRef.current?.focus(),
    getStatus: () => status,
    isReady: () => bridgeReady,
  }));

  // Report status changes to parent (for mobile buttons state)
  useEffect(() => {
    onStatusChange?.(status, bridgeReady, hasRun);
  }, [status, bridgeReady, hasRun, onStatusChange]);

  const handleInputSubmit = useCallback((value: string) => {
    setInputPrompt(null);
    if (value) {
      setOutput((prev) => [...prev, mkLine(value, "stdout")]);
    }
    bridgeRef.current?.sendInput(value);
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    if (question?.id) {
      debouncedSave.current(question.id, value);
    }
  }, [question?.id]);

  const isPredictionType =
    question?.type === 'output_prediction' || question?.type === 'what_is_the_result';

  const canSubmitPrediction = userPrediction.trim().length > 0;

  // SQL questions are fully handled by SqlCompiler (hooks above still run harmlessly)
  if (language === 'sql') {
    return (
      <SqlCompiler
        ref={ref}
        question={question}
        initialCode={initialCode}
        onAttempt={onAttempt}
        onStatusChange={onStatusChange}
        hintProps={hintProps}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <CompilerToolbar
        status={status}
        bridgeReady={bridgeReady}
        onRun={handleRun}
        onSubmit={handleSubmit}
        hideRun={isPredictionType}
        canSubmit={
          isPredictionType
            ? canSubmitPrediction
            : question?.type === 'fill_in_the_blank'
            ? bridgeReady && status === 'idle'
            : hasRun && bridgeReady && status === 'idle'
        }
        hintProps={hintProps}
        language={language}
        question={question}
      />

      {isPredictionType ? (
        <OutputPredictionPanel
          value={userPrediction}
          onChange={setUserPrediction}
          onSubmit={handleSubmit}
          canSubmit={canSubmitPrediction}
        />
      ) : (
        /* Editor + Output split */
        <ResizableSplit
          left={
            <EditorPanel
              key={question?.id ?? 'default'}
              ref={editorRef}
              initialCode={initialCode ?? defaultCode}
              onChange={handleCodeChange}
              onRun={handleRun}
              language={language}
            />
          }
          right={
            <OutputPanel
              lines={output}
              inputPrompt={inputPrompt}
              onInputSubmit={handleInputSubmit}
            />
          }
        />
      )}
    </div>
  );
});

export default Compiler;
