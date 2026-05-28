import { useEffect, useRef, useState, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { SEED_SQL } from './seedData';
import { parseSqlError } from './sqlErrorParser';
import type { QueryResult } from './SqlResultTable';

export type SqlExecutionResult =
  | { status: 'success'; results: QueryResult[] }
  | { status: 'error'; title: string; message: string; hint?: string }
  | { status: 'empty'; message: string };

export function usePglite() {
  const dbRef = useRef<PGlite | null>(null);
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const db = new PGlite();
        await db.exec(SEED_SQL);
        if (!cancelled) {
          dbRef.current = db;
          setReady(true);
        }
      } catch (err) {
        console.error('PGlite init failed:', err);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const runQuery = useCallback(async (sql: string): Promise<SqlExecutionResult> => {
    if (!dbRef.current) {
      return { status: 'error', title: 'Not Ready', message: 'The database is still loading.' };
    }

    const trimmed = sql.trim();
    if (!trimmed) {
      return { status: 'empty', message: 'Write a SQL query and hit Run.' };
    }

    try {
      const raw = await dbRef.current.exec(trimmed);
      const results: QueryResult[] = raw
        .filter((r) => r.fields && r.fields.length > 0)
        .map((r) => ({
          columns: r.fields.map((f: { name: string }) => f.name),
          rows: r.rows as Record<string, unknown>[],
        }));

      if (results.length === 0) {
        const affected = raw[raw.length - 1]?.affectedRows;
        const msg =
          typeof affected === 'number'
            ? `Query ran successfully. ${affected} row${affected === 1 ? '' : 's'} affected.`
            : 'Query ran successfully. No rows returned.';
        return { status: 'empty', message: msg };
      }

      return { status: 'success', results };
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      return { status: 'error', ...parseSqlError(raw) };
    }
  }, []);

  const checkAnswer = useCallback(
    async (userSql: string, referenceSql: string, setupSql?: string): Promise<boolean> => {
      try {
        const runIsolated = async (sql: string) => {
          const db = new PGlite();
          await db.exec(SEED_SQL);
          if (setupSql?.trim()) await db.exec(setupSql);
          const results = await db.exec(sql);
          const last = results[results.length - 1];
          return last?.rows ?? [];
        };

        const [userRows, refRows] = await Promise.all([
          runIsolated(userSql),
          runIsolated(referenceSql),
        ]);

        const normalize = (rows: Record<string, unknown>[]) =>
          [...rows].sort((a, b) => {
            const sa = JSON.stringify(a);
            const sb = JSON.stringify(b);
            return sa < sb ? -1 : sa > sb ? 1 : 0;
          });
        return JSON.stringify(normalize(userRows)) === JSON.stringify(normalize(refRows));
      } catch {
        return false;
      }
    },
    []
  );

  const resetDb = useCallback(async () => {
    if (dbRef.current) {
      await dbRef.current.exec(SEED_SQL);
    }
  }, []);

  return { ready, initializing, runQuery, checkAnswer, resetDb };
}
