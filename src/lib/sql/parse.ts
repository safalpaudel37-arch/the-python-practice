const SETUP_BEGIN = '-- SETUP --';
const SETUP_END = '-- END SETUP --';

export interface ParsedSqlQuestion {
  setupSql: string;
  promptBefore: string;
  templateAfter: string;
}

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
