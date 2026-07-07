"use client";

import { useEffect, useRef, useState } from "react";
import { OutputLine } from "@/components/execution/worker-bridge";

type Props = {
  lines: OutputLine[];
  inputPrompt: string | null;
  onInputSubmit: (value: string) => void;
};

export default function OutputPanel({ lines, inputPrompt, onInputSubmit }: Props) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-focus the input when a prompt appears
  useEffect(() => {
    if (inputPrompt !== null) {
      inputRef.current?.focus();
    }
  }, [inputPrompt]);

  // Scroll to bottom on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, inputPrompt]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = inputValue;
    setInputValue("");
    onInputSubmit(val);
  }

  function lineClass(type: OutputLine["type"]) {
    switch (type) {
      case "stderr":
      case "error":
        return "text-red";
      case "timeout":
        return "text-copper";
      case "truncated":
        return "text-ink-3";
      default:
        return "text-green";
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted font-mono text-sm text-foreground">
      <div className="shrink-0 border-b border-line px-4 py-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[.12em] text-ink-3">
          Output · stdout
        </span>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-4">
        {lines.length === 0 && inputPrompt === null && (
          <p className="select-none text-[13px] text-ink-3">
            Press <span className="font-semibold text-ink-2">Run</span> to see output, or{" "}
            <span className="font-semibold text-ink-2">Submit</span> to check your answer.
          </p>
        )}

        {lines.map((line) => (
          <pre
            key={line.id}
            className={`whitespace-pre-wrap break-all leading-5 animate-[pp-fadein_.25s_ease_both] ${lineClass(line.type)}`}
          >
            {line.text}
          </pre>
        ))}

        {inputPrompt !== null && (
          <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-1">
            <span className="whitespace-pre text-foreground">{inputPrompt}</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="min-w-0 flex-1 border-b border-line-2 bg-transparent text-base text-foreground caret-copper outline-none md:text-sm"
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
