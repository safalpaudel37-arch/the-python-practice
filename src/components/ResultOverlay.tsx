'use client';

import { useEffect, useRef } from 'react';

interface Props {
  show: boolean;
  onDone: () => void;
  variant: 'success' | 'error';
}

const ANIMATION_MS = 1500;
const COLOR = { success: '#22c55e', error: '#ef4444' } as const;

/**
 * Success / failure overlay. Pure inline SVG + CSS — no video assets, so it
 * renders identically on desktop and mobile. Visibility never depends on the
 * global stylesheet: `fill="none"` and the stroke color are SVG attributes
 * (which always beat the UA default black fill), and the draw animation is
 * inline. A fixed 1.5s timer drives `onDone` (the success auto-redirect to the
 * next question); depend only on `show` so re-renders don't reset it.
 */
export default function ResultOverlay({ show, onDone, variant }: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => onDoneRef.current(), ANIMATION_MS);
    return () => clearTimeout(id);
  }, [show]);

  if (!show) return null;

  const color = COLOR[variant];

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
        aria-label={variant === 'success' ? 'Correct' : 'Incorrect'}
        style={{
          animation: 'result-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
          filter: `drop-shadow(0 6px 20px ${color}73)`,
        }}
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          data-draw
          style={{ strokeDasharray: 295, strokeDashoffset: 295, animation: 'result-draw 0.45s ease-out forwards' }}
        />
        {variant === 'success' ? (
          <path
            d="M30 52 L44 66 L72 34"
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            data-draw
            style={{ strokeDasharray: 120, strokeDashoffset: 120, animation: 'result-draw 0.4s 0.32s ease-out forwards' }}
          />
        ) : (
          <>
            <path
              d="M35 35 L65 65"
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
              data-draw
              style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'result-draw 0.3s 0.32s ease-out forwards' }}
            />
            <path
              d="M65 35 L35 65"
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
              data-draw
              style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'result-draw 0.3s 0.45s ease-out forwards' }}
            />
          </>
        )}
      </svg>
    </div>
  );
}
