export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export function SqlResultTable({ results }: { results: QueryResult[] }) {
  return (
    <div className="flex flex-col gap-4">
      {results.map((result, i) => (
        <div key={i}>
          {results.length > 1 && (
            <p className="text-xs mb-1 font-mono" style={{ color: 'var(--sky-aqua)' }}>
              Result set {i + 1}
            </p>
          )}
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm font-mono text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 font-semibold whitespace-nowrap"
                      style={{ color: 'var(--sky-aqua)' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={result.columns.length}
                      className="px-3 py-4 text-center text-muted-foreground italic"
                    >
                      No rows returned
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border/50 hover:bg-muted/20">
                      {result.columns.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap text-foreground/80">
                          {row[col] === null || row[col] === undefined ? (
                            <span className="text-muted-foreground italic">NULL</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
          </p>
        </div>
      ))}
    </div>
  );
}
