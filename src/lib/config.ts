export const MAX_ATTEMPTS = 5;
export const STARTER_CODE = '# Write your Python code here\n';
export const JS_STARTER_CODE = '// Write your JavaScript code here\n';

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
