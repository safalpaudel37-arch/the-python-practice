import { getQuestions } from '@/lib/supabase/queries';
import { getCurrentUser } from '@/lib/auth/user';
import { getQuestionStatsByLanguage, type QuestionStats } from '@/lib/tracking';
import { prisma } from '@/lib/prisma';
import DashboardClient from '@/components/DashboardClient';
import type { Language, Question, QuestionStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SUPPORTED_LANGS = new Set<string>(['python', 'javascript', 'sql']);

interface Props {
  params: Promise<{ lang: string }>;
}

const STATUS_MAP: Record<string, QuestionStatus> = {
  NOT_STARTED: 'not_started',
  ATTEMPTED: 'attempted',
  SOLVED: 'solved',
  SKIPPED: 'skipped',
};

export default async function LangPage({ params }: Props) {
  const { lang } = await params;

  const user = await getCurrentUser();

  let questions: Question[] = [];
  let stats: Record<string, QuestionStats> = {};
  let serverStatuses: Record<string, QuestionStatus> = {};

  if (SUPPORTED_LANGS.has(lang)) {
    try {
      questions = await getQuestions(lang as Language);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return <DashboardClient questions={[]} lang={lang} dbError={msg} user={user} />;
    }

    stats = await getQuestionStatsByLanguage(lang);

    if (user) {
      try {
        const progress = await prisma.progress.findMany({
          where: { userId: user.id, language: lang },
          select: { questionId: true, status: true },
        });
        serverStatuses = Object.fromEntries(
          progress.map((p) => [p.questionId, STATUS_MAP[p.status] ?? 'not_started'])
        );
      } catch (e) {
        console.error('[dashboard] progress fetch failed', e);
      }
    }
  }

  return (
    <DashboardClient
      questions={questions}
      lang={lang}
      user={user}
      stats={stats}
      serverStatuses={serverStatuses}
    />
  );
}
