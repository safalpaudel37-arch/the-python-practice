import { getQuestions } from '@/lib/supabase/queries';
import { getCurrentUser } from '@/lib/auth/user';
import { blockAdmins } from '@/lib/auth/admin';
import { getServerProgress } from '@/lib/progress';
import { findQuestionLanguage } from '@/lib/answer-check';
import { notFound } from 'next/navigation';
import HomeClient from '@/components/HomeClient';
import type { QuestionStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompilerPage({ params }: Props) {
  await blockAdmins();
  const { id } = await params;

  const language = await findQuestionLanguage(id);
  if (!language) notFound();

  let questions;
  try {
    questions = await getQuestions(language);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-md text-center space-y-3 p-8">
          <p className="text-lg font-semibold">Database not ready</p>
          <p className="text-sm text-muted-foreground">{msg}</p>
        </div>
      </div>
    );
  }

  const user = await getCurrentUser();

  // Signed-in users see only their server-side progress (guest localStorage
  // progress stays in guest mode).
  let serverStatuses: Record<string, QuestionStatus> = {};
  let serverAttemptCounts: Record<string, number> = {};
  if (user) {
    try {
      const progress = await getServerProgress(user.id, language);
      serverStatuses = progress.statuses;
      serverAttemptCounts = progress.attemptCounts;
    } catch (e) {
      console.error('[compiler] progress fetch failed', e);
    }
  }

  return (
    <HomeClient
      questions={questions}
      initialQuestionId={id}
      user={user}
      serverStatuses={serverStatuses}
      serverAttemptCounts={serverAttemptCounts}
    />
  );
}
