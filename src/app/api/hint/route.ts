import { NextRequest, NextResponse } from 'next/server';
import { LANG_LABEL } from '@/lib/config';
import { getClientIp, makeRateLimiter } from '@/lib/api/rate-limit';

const checkRateLimit = makeRateLimiter(10);
const MAX_FIELD_LENGTH = 5_000;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Cheap but capable default — strong enough for short beginner hints, and far
// more reliable than the previous Gemini free tier. Override via env to swap
// models without code changes (e.g. deepseek/deepseek-chat, qwen/qwen-2.5-coder-32b-instruct).
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct';

function buildPrompt(
  language: string,
  questionType: string,
  questionText: string,
  correctAnswer: string,
  userCode: string,
  userAnswer: string,
): string {
  const langLabel = LANG_LABEL[language] ?? 'Python';
  const codeBlock = userCode.trim() ? `Student's code:\n${userCode}\n` : '';
  return `You are a friendly ${langLabel} tutor helping a beginner student.
The student got a question wrong and needs a small hint to guide them.

Question type: ${questionType}
Question: ${questionText}
Correct answer: ${correctAnswer}
${codeBlock}Student's submitted answer: ${userAnswer}

Give a hint in 1-2 short sentences. Be direct and simple.
Point out specifically what they got wrong and what they should try instead — but do NOT give away the full answer or write the code for them.
No preamble, no "Great try!", no encouragement fluff. Just the useful hint.`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Hints not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { questionId, questionText, questionType, questionLanguage, correctAnswer, userCode, userAnswer } =
    (body as Record<string, unknown>) ?? {};

  if (
    typeof questionId !== 'string' ||
    typeof questionText !== 'string' ||
    typeof questionType !== 'string' ||
    typeof correctAnswer !== 'string' ||
    typeof userCode !== 'string' ||
    typeof userAnswer !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const safe = (s: string) => s.slice(0, MAX_FIELD_LENGTH);
  const language = typeof questionLanguage === 'string' ? questionLanguage : 'python';

  try {
    const prompt = buildPrompt(
      language,
      safe(questionType),
      safe(questionText),
      safe(correctAnswer),
      safe(userCode),
      safe(userAnswer),
    );

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Optional attribution headers shown on OpenRouter's dashboard.
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'http://localhost:3000',
        'X-Title': 'Python Practice',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      console.error('[hint] openrouter', res.status, await res.text());
      return NextResponse.json({ error: 'Could not generate hint' }, { status: 500 });
    }

    const data = await res.json();
    const hint = (data?.choices?.[0]?.message?.content ?? '').trim();
    if (!hint) {
      console.error('[hint] empty completion', JSON.stringify(data));
      return NextResponse.json({ error: 'Could not generate hint' }, { status: 500 });
    }
    return NextResponse.json({ hint });
  } catch (err) {
    console.error('[hint]', err);
    return NextResponse.json({ error: 'Could not generate hint' }, { status: 500 });
  }
}
