import { notFound } from 'next/navigation';
import { getQuestions } from '@/lib/supabase/queries';
import { getCurrentUser } from '@/lib/auth/user';
import { blockAdmins } from '@/lib/auth/admin';
import { getQuestionStatsByLanguage, type QuestionStats } from '@/lib/tracking';
import { getServerProgress } from '@/lib/progress';
import { KNOWN_LANGS, SUPPORTED_LANGS } from '@/lib/config';
import DashboardClient from '@/components/DashboardClient';
import type { Language, Question, QuestionStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ lang: string }>;
}

export default async function LangPage({ params }: Props) {
  await blockAdmins();
  const { lang } = await params;

  if (!KNOWN_LANGS.has(lang)) notFound();

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
        serverStatuses = (await getServerProgress(user.id, lang as Language)).statuses;
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
