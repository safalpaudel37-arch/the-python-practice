import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const MAX_FIELD_LENGTH = 5_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function buildPrompt(
  questionType: string,
  questionText: string,
  correctAnswer: string,
  userCode: string,
  userAnswer: string,
): string {
  const codeBlock = userCode.trim() ? `Student's code:\n${userCode}\n` : '';
  return `You are a friendly Python tutor helping a beginner student.
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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Hints not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { questionId, questionText, questionType, correctAnswer, userCode, userAnswer } =
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = buildPrompt(
      safe(questionType),
      safe(questionText),
      safe(correctAnswer),
      safe(userCode),
      safe(userAnswer),
    );
    const result = await model.generateContent(prompt);
    const hint = result.response.text().trim();
    return NextResponse.json({ hint });
  } catch (err) {
    console.error('[hint]', err);
    return NextResponse.json({ error: 'Could not generate hint' }, { status: 500 });
  }
}
