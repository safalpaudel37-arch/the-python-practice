import { Lightbulb } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MAX_ATTEMPTS } from '@/lib/config';

interface Props {
  attemptCount: number;
}

export default function AttemptsCounter({ attemptCount }: Props) {
  if (attemptCount === 0) return null;
  const remaining = MAX_ATTEMPTS - attemptCount;
  return (
    <div className="px-4 py-2">
      <Alert className="py-2">
        <Lightbulb className="size-3.5" />
        <AlertDescription className="text-xs">
          {remaining > 0
            ? `Stuck? ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before the solution unlocks.`
            : 'Solution is now available below.'}
        </AlertDescription>
      </Alert>
    </div>
  );
}
