import { getQuestions } from '@/lib/supabase/queries';
import HomeClient from '@/components/HomeClient';
import type { Language } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

function detectLanguage(id: string): Language {
  const upper = id.toUpperCase();
  if (upper.startsWith('SQL')) return 'sql';
  if (upper.startsWith('JS')) return 'javascript';
  return 'python';
}

export default async function CompilerPage({ params }: Props) {
  const { id } = await params;
  const language = detectLanguage(id);

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

  return <HomeClient questions={questions} initialQuestionId={id} />;
}
