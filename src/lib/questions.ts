import type { Question } from './types';

export function getNextQuestion(currentId: string, filtered: Question[]): Question | null {
  const idx = filtered.findIndex((q) => q.id === currentId);
  if (idx === -1 || idx === filtered.length - 1) return null;
  return filtered[idx + 1];
}

export function getPrevQuestion(currentId: string, filtered: Question[]): Question | null {
  const idx = filtered.findIndex((q) => q.id === currentId);
  if (idx <= 0) return null;
  return filtered[idx - 1];
}