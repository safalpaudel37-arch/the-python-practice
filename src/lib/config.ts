export const MAX_ATTEMPTS = 5;
export const STARTER_CODE = '# Write your Python code here\n';
export const JS_STARTER_CODE = '// Write your JavaScript code here\n';
export const SQL_STARTER_CODE = '-- Write your SQL here\n';

export const AUTO_CHECK_TYPES = new Set([
  'write_the_code',
  'fill_in_the_blank',
  'output_prediction',
  'what_is_the_result',
]);

export const TIER_LABELS: Record<string, string> = {
  simple: 'Simple',
  intermediate: 'Intermediate',
  hard: 'Hard',
  expert: 'Expert',
};

export const TIER_ORDER = ['simple', 'intermediate', 'hard', 'expert'] as const;

/** Short question-type labels used on badges (design spec). */
export const TYPE_SHORT_LABELS: Record<string, string> = {
  write_the_code: 'write the code',
  fill_in_the_blank: 'fill the blank',
  output_prediction: 'predict output',
  what_is_the_result: 'predict output',
  spot_the_bug: 'spot the bug',
};

/** Tier accent color CSS variables (design: green/blue/copper/red ladder). */
export const TIER_COLOR_VAR: Record<string, string> = {
  simple: 'var(--green)',
  intermediate: 'var(--blue)',
  hard: 'var(--copper)',
  expert: 'var(--red)',
};
