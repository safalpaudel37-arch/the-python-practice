'use client';

import { useEffect, useRef, useState } from 'react';
import type { SolveReward } from '@/lib/tracking';

interface Props {
  show: boolean;
  reward?: SolveReward | null;
  onNext: () => void;
  onReview: () => void;
}

const AUTO_ADVANCE_S = 3;

/** Full-screen "Solved!" celebration: copper check, points/streak, 3s auto-advance. */
export default function SuccessOverlay({ show, reward, onNext, onReview }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_ADVANCE_S);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    if (!show) return;
    setSecondsLeft(AUTO_ADVANCE_S);
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const done = setTimeout(() => onNextRef.current(), AUTO_ADVANCE_S * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(13,19,34,.72)] backdrop-blur-[6px] animate-[pp-fadein_.2s_ease_both]">
      <div className="flex flex-col items-center gap-4 px-6 text-center animate-[pp-pop_.45s_cubic-bezier(.2,.9,.3,1.2)_both]">
        <div className="grid size-[88px] place-items-center rounded-full bg-copper text-[42px] text-white animate-[pp-pulse_1.8s_ease_infinite]">
          ✓
        </div>
        <p className="font-heading text-[34px] font-bold text-[#F1ECDF]">Solved!</p>
        {reward?.firstSolve && (
          <p className="font-mono text-[14px] font-semibold text-[#F1ECDF]">
            +10 pts · streak 🔥{reward.streak}
          </p>
        )}
        <div className="mt-2 flex gap-2.5">
          <button
            onClick={onReview}
            className="rounded-[10px] border border-white/30 bg-white/10 px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-white/20"
          >
            Review
          </button>
          <button
            onClick={onNext}
            className="rounded-[10px] bg-copper px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-copper-600 hover:shadow-[0_8px_18px_rgba(174,110,21,.4)]"
          >
            Next question →
          </button>
        </div>
        <p className="font-mono text-[11.5px] text-white/50">auto-advancing in {secondsLeft}…</p>
      </div>
    </div>
  );
}
