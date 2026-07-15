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

/** Short tier names for narrow screens/badges. */
export const TIER_SHORT_LABELS: Record<string, string> = {
  simple: 'Simple',
  intermediate: 'Inter',
  hard: 'Hard',
  expert: 'Expert',
};

/** Plain-text language labels (no emoji) for metadata, hints, headings. */
export const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
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

/** Languages the nav knows about — `live: false` renders a disabled "· soon" pill. */
export const LANGUAGES = [
  { slug: 'python', label: '🐍 Python', live: true },
  { slug: 'javascript', label: 'JavaScript', live: true },
  { slug: 'sql', label: 'SQL', live: true },
  { slug: 'c', label: 'C', live: false },
  { slug: 'pytorch', label: 'PyTorch', live: false },
  { slug: 'numpy', label: 'NumPy', live: false },
] as const;

/** Any slug in this set is a real, known language — planned or live. Anything else is a 404. */
export const KNOWN_LANGS = new Set<string>(LANGUAGES.map((l) => l.slug));

/** Slugs with actual question content to fetch. */
export const SUPPORTED_LANGS = new Set<string>(LANGUAGES.filter((l) => l.live).map((l) => l.slug));
