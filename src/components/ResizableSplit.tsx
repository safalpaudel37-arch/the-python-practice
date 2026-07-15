'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  left: ReactNode;
  right: ReactNode;
  /** Initial left-pane width as a percentage (default 60). */
  initialSplit?: number;
  /** Min/max left-pane width as a percentage (default 20 / 80). */
  minSplit?: number;
  maxSplit?: number;
  /** Extra classes merged onto the left pane wrapper. */
  leftClassName?: string;
  /** Extra classes merged onto the right pane wrapper. */
  rightClassName?: string;
}

const LEFT_BASE = 'min-w-0 overflow-hidden min-h-[240px] md:min-h-0';
const RIGHT_BASE = 'min-w-0 overflow-hidden min-h-[180px] md:min-h-0';

export function ResizableSplit({
  left,
  right,
  initialSplit = 60,
  minSplit = 20,
  maxSplit = 80,
  leftClassName = '',
  rightClassName = '',
}: Props) {
  const [split, setSplit] = useState(initialSplit);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(maxSplit, Math.max(minSplit, pct)));
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minSplit, maxSplit]);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden md:flex-row flex-col">
      <div style={{ flexBasis: `${split}%` }} className={`${LEFT_BASE} ${leftClassName}`}>
        {left}
      </div>

      <div
        onMouseDown={onMouseDown}
        className="w-1 bg-border hover:bg-primary cursor-col-resize hidden md:block shrink-0 transition-colors"
      />

      <div style={{ flexBasis: `${100 - split}%` }} className={`${RIGHT_BASE} ${rightClassName}`}>
        {right}
      </div>
    </div>
  );
}
