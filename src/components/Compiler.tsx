"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import OutputPanel from "@/components/OutputPanel";
import OutputPredictionPanel from "@/components/OutputPredictionPanel";
import CompilerToolbar from "@/components/CompilerToolbar";
import { WorkerBridge, OutputLine } from "@/components/execution/worker-bridge";
import { AUTO_CHECK_TYPES, STARTER_CODE } from "@/lib/config";
import { setSavedCode } from "@/lib/storage";
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

interface CompilerProps {
  question?: Question | null;
  initialCode?: string;
  onAttempt?: (passed: boolean, wrongContext?: WrongAttemptContext) => void;
  onStatusChange?: (status: Status, bridgeReady: boolean, hasRun: boolean) => void;
}

/** Trim trailing whitespace per line then trim leading/trailing blank lines. */
function normalizeOutput(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
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

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const Compiler = forwardRef<CompilerHandle, CompilerProps>(function Compiler(
  { question, initialCode, onAttempt, onStatusChange },
  ref
) {
  const [code, setCode] = useState(initialCode ?? STARTER_CODE);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [inputPrompt, setInputPrompt] = useState<string | null>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [userPrediction, setUserPrediction] = useState('');

  // Panel split — percentage for editor width
  const [split, setSplit] = useState(60);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
    setCode(initialCode ?? STARTER_CODE);
    setOutput([]);
    setInputPrompt(null);
    setHasRun(false);
    setUserPrediction('');
    pendingOutputRef.current = '';
    lastStdoutRef.current = '';
  // initialCode intentionally excluded — only reset on question change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  useEffect(() => {
    if (typeof SharedArrayBuffer === "undefined") {
      setOutput([{
        text: "⚠️ SharedArrayBuffer not available. The input() function will not work. Please use Chrome or Firefox with cross-origin isolation enabled.",
        type: "error",
      }]);
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
                .map((l): OutputLine => ({ text: l, type: "stdout" }))
            );
          }
          if (stderr) {
            next.push({ text: stderr, type: "stderr" });
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
        if (kind === "timeout") {
          setOutput((prev) => [
            ...prev,
            { text: "⏱ Execution timed out (1 minute limit exceeded).", type: "timeout" },
            { text: "Tip: check for infinite loops or very large data operations.", type: "timeout" },
          ]);
        } else {
          setOutput((prev) => [
            ...prev,
            { text: message, type: "error" },
          ]);
        }
        if (kind === "crash" || kind === "timeout") {
          setBridgeReady(false);
        }
      },
    });

    bridgeRef.current = bridge;
    return () => bridge.terminate();
  }, []);

  const handleRun = useCallback(() => {
    if (!bridgeRef.current) return;
    localStorage.setItem("has_interacted", "true");
    runningQuestionRef.current = currentQuestionRef.current;
    setOutput([]);
    setInputPrompt(null);
    setHasRun(false);
    lastStdoutRef.current = '';
    setStatus("running");
    bridgeRef.current.run(code);
  }, [code]);

  const handleSubmit = useCallback(() => {
    const q = currentQuestionRef.current;
    if (!onAttemptRef.current) return;
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
        body: JSON.stringify({ questionId: q.id, userAnswer }),
        signal: AbortSignal.timeout(5000),
      })
        .then((r) => r.ok ? r.json() : { correct: false })
        .then((data: { correct?: boolean }) => {
          const passed = data.correct ?? false;
          onAttemptRef.current?.(passed, passed ? undefined : {
            userCode: q.type === 'write_the_code' ? codeRef.current : '',
            userAnswer,
          });
        })
        .catch(() => onAttemptRef.current?.(false, {
          userCode: codeRef.current,
          userAnswer,
        }));
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
      setOutput((prev) => [...prev, { text: value, type: "stdout" }]);
    }
    bridgeRef.current?.sendInput(value);
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    if (question?.id) {
      debouncedSave.current(question.id, value);
    }
  }, [question?.id]);

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
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const isPredictionType =
    question?.type === 'output_prediction' || question?.type === 'what_is_the_result';

  const canSubmitPrediction = userPrediction.trim().length > 0;

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
        <div ref={containerRef} className="flex flex-1 overflow-hidden md:flex-row flex-col">
          {/* Editor panel */}
          <div style={{ flexBasis: `${split}%` }} className="min-w-0 overflow-hidden min-h-[240px] md:min-h-0">
            <EditorPanel
              key={question?.id ?? 'default'}
              ref={editorRef}
              initialCode={initialCode ?? STARTER_CODE}
              onChange={handleCodeChange}
              onRun={handleRun}
            />
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={onMouseDown}
            className="w-1 bg-border hover:bg-primary cursor-col-resize hidden md:block shrink-0 transition-colors"
          />

          {/* Output panel */}
          <div style={{ flexBasis: `${100 - split}%` }} className="min-w-0 overflow-hidden min-h-[180px] md:min-h-0">
            <OutputPanel
              lines={output}
              inputPrompt={inputPrompt}
              onInputSubmit={handleInputSubmit}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default Compiler;
