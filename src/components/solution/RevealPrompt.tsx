import { MAX_ATTEMPTS } from '@/lib/config';
import { AttemptDots } from './AttemptsCounter';

interface Props {
  onReveal: () => void;
}

export default function RevealPrompt({ onReveal }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <AttemptDots attemptCount={MAX_ATTEMPTS} />
      <p className="text-[13.5px] font-semibold">
        {MAX_ATTEMPTS} attempts made — you can still submit, or take a look.
      </p>
      <button
        onClick={onReveal}
        className="ml-auto rounded-[9px] bg-copper px-3.5 py-1.5 text-[13px] font-semibold text-white hover:-translate-y-px hover:bg-copper-600 hover:shadow-[0_8px_18px_rgba(174,110,21,.32)]"
      >
        Stuck? Reveal the solution →
      </button>
    </div>
  );
}
