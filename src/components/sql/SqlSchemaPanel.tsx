import { useEffect, useState } from 'react';
import { AVAILABLE_TABLES } from './seedData';
import { SqlResultTable } from './SqlResultTable';
import type { SqlExecutionResult } from './usePglite';

interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
}

interface Props {
  runQuery: (sql: string) => Promise<SqlExecutionResult>;
  ready: boolean;
  refreshKey?: number;
}

export function SqlSchemaPanel({ runQuery, ready, refreshKey = 0 }: Props) {
  const [tableData, setTableData] = useState<Record<string, TableData | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    Promise.all(
      AVAILABLE_TABLES.map(async (table) => {
        const result = await runQuery(`SELECT * FROM ${table.name} LIMIT 100;`);
        if (result.status === 'success' && result.results.length > 0) {
          return [table.name, result.results[0]] as const;
        }
        return [table.name, null] as const;
      })
    ).then((entries) => {
      setTableData(Object.fromEntries(entries));
      setLoading(false);
    });
  // runQuery is stable (useCallback with no deps), so it's safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, refreshKey]);

  return (
    <div className="text-xs font-mono">
      <p className="text-muted-foreground uppercase tracking-wider mb-2 text-[10px]">
        Available Tables {loading && <span className="normal-case italic">— refreshing…</span>}
      </p>
      <div className="flex flex-col gap-2">
        {AVAILABLE_TABLES.map((table) => {
          const data = tableData[table.name];
          return (
            <details key={table.name} className="group">
              <summary
                className="cursor-pointer hover:text-foreground transition-colors py-0.5 list-none flex items-center gap-1 select-none"
                style={{ color: 'var(--sky-aqua)' }}
              >
                <span className="text-muted-foreground group-open:rotate-90 transition-transform inline-block">
                  ▶
                </span>
                {table.name}
                {data != null && (
                  <span className="text-muted-foreground ml-1">({data.rows.length} rows)</span>
                )}
              </summary>

              <div className="mt-1 ml-1">
                {data == null ? (
                  <p className="text-muted-foreground italic px-1">
                    {loading ? 'Loading…' : 'No data'}
                  </p>
                ) : (
                  <SqlResultTable results={[data]} />
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
