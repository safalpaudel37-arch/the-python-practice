import { Lightbulb } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MAX_ATTEMPTS } from '@/lib/config';
import type { Question } from '@/lib/types';
import type { WrongAttemptContext } from '@/components/Compiler';
import HintButton from './HintButton';

interface Props {
  attemptCount: number;
  question?: Question | null;
  wrongContext?: WrongAttemptContext;
}

export default function AttemptsCounter({ attemptCount, question, wrongContext }: Props) {
  if (attemptCount === 0) return null;
  const remaining = MAX_ATTEMPTS - attemptCount;
  return (
    <div className="px-4 py-2 flex flex-col gap-1.5">
      <Alert className="py-2">
        <Lightbulb className="size-3.5" />
        <AlertDescription className="text-xs">
          {remaining > 0
            ? `Stuck? ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before the solution unlocks.`
            : 'Solution is now available below.'}
        </AlertDescription>
      </Alert>
      {question && wrongContext && (
        <HintButton question={question} wrongContext={wrongContext} />
      )}
    </div>
  );
}
