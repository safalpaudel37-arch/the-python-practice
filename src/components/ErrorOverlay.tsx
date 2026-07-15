'use client';

import { useEffect, useRef } from 'react';

interface Props {
  show: boolean;
  onDone: () => void;
}

const ANIMATION_MS = 1500;
const COLOR = '#C0453B';

/**
 * Error overlay. Pure inline SVG + CSS — no video assets, so it renders
 * identically on desktop and mobile. Visibility never depends on the global
 * stylesheet: `fill="none"` and the stroke color are SVG attributes (which
 * always beat the UA default black fill), and the draw animation is inline.
 * A fixed 1.5s timer drives `onDone`; depend only on `show` so re-renders
 * don't reset it.
 */
export default function ErrorOverlay({ show, onDone }: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => onDoneRef.current(), ANIMATION_MS);
    return () => clearTimeout(id);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <style>{`
        @keyframes result-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes result-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .result-icon, .result-icon * { animation: none !important; }
          .result-icon [data-draw] { stroke-dashoffset: 0 !important; }
        }
      `}</style>
      <svg
        className="result-icon"
        width="144"
        height="144"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Incorrect"
        style={{
          animation: 'result-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
          filter: `drop-shadow(0 6px 20px ${COLOR}73)`,
        }}
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={COLOR}
          strokeWidth={6}
          strokeLinecap="round"
          data-draw
          style={{ strokeDasharray: 295, strokeDashoffset: 295, animation: 'result-draw 0.45s ease-out forwards' }}
        />
        <path
          d="M35 35 L65 65"
          fill="none"
          stroke={COLOR}
          strokeWidth={7}
          strokeLinecap="round"
          data-draw
          style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'result-draw 0.3s 0.32s ease-out forwards' }}
        />
        <path
          d="M65 35 L35 65"
          fill="none"
          stroke={COLOR}
          strokeWidth={7}
          strokeLinecap="round"
          data-draw
          style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'result-draw 0.3s 0.45s ease-out forwards' }}
        />
      </svg>
    </div>
  );
}
