'use client';

import ResultOverlay from '@/components/ResultOverlay';

interface Props {
  show: boolean;
  onDone: () => void;
}

export default function SuccessOverlay({ show, onDone }: Props) {
  return <ResultOverlay show={show} onDone={onDone} variant="success" />;
}
