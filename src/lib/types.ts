export type Tier = 'simple' | 'intermediate' | 'hard' | 'expert';
export type QuestionType =
  | 'write_the_code'
  | 'fill_in_the_blank'
  | 'output_prediction'
  | 'spot_the_bug'
  | 'what_is_the_result';
export type QuestionStatus = 'not_started' | 'attempted' | 'solved' | 'skipped';
export type Language = 'python' | 'javascript';

export interface Question {
  id: string;
  tier: Tier;
  topic: string;
  type: QuestionType;
  question: string;
  answer: string;
  alternative_answer: string | null;
  explanation: string;
  language: Language;
}
