import { getQuestions } from '@/lib/supabase/queries';
import DashboardClient from '@/components/DashboardClient';
import type { Language, Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SUPPORTED_LANGS = new Set<string>(['python', 'javascript']);

interface Props {
  params: Promise<{ lang: string }>;
}

export default async function LangPage({ params }: Props) {
  const { lang } = await params;

  let questions: Question[] = [];

  if (SUPPORTED_LANGS.has(lang)) {
    try {
      questions = await getQuestions(lang as Language);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return (
        <DashboardClient questions={[]} lang={lang} dbError={msg} />
      );
    }
  }

  return <DashboardClient questions={questions} lang={lang} />;
}
