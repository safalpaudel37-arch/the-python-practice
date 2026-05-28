export function SqlErrorDisplay({
  title,
  message,
  hint,
}: {
  title: string;
  message: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-destructive/30 bg-destructive/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-destructive">⚠</span>
        <strong className="text-destructive font-mono text-sm">{title}</strong>
      </div>
      <p className="text-destructive/80 text-sm font-mono">{message}</p>
      {hint && (
        <p className="mt-2 text-xs font-mono" style={{ color: 'var(--sky-aqua)', opacity: 0.8 }}>
          💡 {hint}
        </p>
      )}
    </div>
  );
}
