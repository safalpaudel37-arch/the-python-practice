import { parseSqlQuestion } from './sql/parse';
import type { Question } from './types';

/**
 * Split a question prompt into its prose instruction and the code that belongs
 * in the editor (the `___` blank template for `fill_in_the_blank`, or the buggy
 * code for `spot_the_bug`).
 *
 * - SQL with `-- SETUP --` markers uses `parseSqlQuestion` (setup block excluded).
 * - Everything else (including SQL without setup markers) uses the convention
 *   `prose\n\ncode` (split on the first blank line). If there is no blank line,
 *   `code` is empty.
 *
 * Used by both the editor pre-population (HomeClient) and the prompt display
 * (QuestionDetail) so the two always agree on the boundary.
 */
export function splitPrompt(question: Question): { prose: string; code: string } {
  if (question.language === 'sql') {
    const { promptBefore, templateAfter } = parseSqlQuestion(question.question);
    if (templateAfter) return { prose: promptBefore, code: templateAfter };
    // No -- SETUP -- markers: fall through to the prose\n\ncode convention.
  }

  const sepIdx = question.question.indexOf('\n\n');
  if (sepIdx !== -1) {
    return {
      prose: question.question.slice(0, sepIdx).trim(),
      code: question.question.slice(sepIdx + 2),
    };
  }
  return { prose: question.question, code: '' };
}

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