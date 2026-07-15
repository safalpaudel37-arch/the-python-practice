import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTopic(topic: string): string {
  return topic.replace(/_/g, ' ')
}

/** Normalize output for comparison: CRLF→LF, right-trim each line, strip leading/trailing blank lines. */
export function normalizeOutput(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}

export function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
