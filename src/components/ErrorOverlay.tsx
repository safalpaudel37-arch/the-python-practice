'use client';

import ResultOverlay from '@/components/ResultOverlay';

interface Props {
  show: boolean;
  onDone: () => void;
}

export default function ErrorOverlay({ show, onDone }: Props) {
  return <ResultOverlay show={show} onDone={onDone} variant="error" />;
}
