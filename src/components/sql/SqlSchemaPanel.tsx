import { useEffect, useState } from 'react';
import { AVAILABLE_TABLES } from './seedData';
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
        const result = await runQuery(`SELECT * FROM ${table.name};`);
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
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-xs font-mono text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {data.columns.map((col) => (
                            <th
                              key={col}
                              className="px-2 py-1 font-semibold whitespace-nowrap"
                              style={{ color: 'var(--sky-aqua)' }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={data.columns.length}
                              className="px-2 py-2 text-center text-muted-foreground italic"
                            >
                              (empty)
                            </td>
                          </tr>
                        ) : (
                          data.rows.map((row, ri) => (
                            <tr key={ri} className="border-b border-border/40 hover:bg-muted/20">
                              {data.columns.map((col) => (
                                <td key={col} className="px-2 py-1 whitespace-nowrap text-foreground/80">
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
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
