/* SQL Web Worker — runs user SQL against PGlite (Postgres in WASM) */

import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js';

const MAX_LINES = 1000;
const MAX_CELL_LEN = 200;

let db = null;
let initPromise = null;

function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      db = new PGlite();
      await db.query('SELECT 1');
      return db;
    })();
  }
  return initPromise;
}

function formatCell(v) {
  if (v === null) return 'NULL';
  if (v === undefined) return '';
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v);
      return s.length > MAX_CELL_LEN ? s.slice(0, MAX_CELL_LEN) + '…' : s;
    } catch {
      return String(v);
    }
  }
  const s = String(v);
  return s.length > MAX_CELL_LEN ? s.slice(0, MAX_CELL_LEN) + '…' : s;
}

function formatResult(result) {
  if (!result || !result.fields || result.fields.length === 0) {
    if (typeof result?.affectedRows === 'number') {
      return `(${result.affectedRows} row${result.affectedRows === 1 ? '' : 's'} affected)`;
    }
    return '';
  }

  const cols = result.fields.map((f) => f.name);
  const rows = (result.rows || []).map((row) =>
    cols.map((c) => formatCell(row[c]))
  );

  // Compute column widths
  const widths = cols.map((c, i) => {
    let w = c.length;
    for (const row of rows) {
      if (row[i].length > w) w = row[i].length;
    }
    return w;
  });

  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
  const header = cols.map((c, i) => pad(c, widths[i])).join(' | ');
  const sep = widths.map((w) => '-'.repeat(w)).join('-+-');
  const body = rows.map((row) =>
    row.map((cell, i) => pad(cell, widths[i])).join(' | ')
  );

  const lines = [header, sep, ...body];
  if (lines.length > MAX_LINES) {
    return lines.slice(0, MAX_LINES).concat('[... output truncated at 1000 lines]').join('\n');
  }

  if (rows.length === 0) {
    return [header, sep, '(0 rows)'].join('\n');
  }

  return lines.concat(`(${rows.length} row${rows.length === 1 ? '' : 's'})`).join('\n');
}

function errorMessage(err) {
  if (err && typeof err === 'object') {
    const name = err.name || 'Error';
    const msg = err.message || String(err);
    return `${name}: ${msg}`;
  }
  return String(err);
}

// Boot — initialise PGlite then announce readiness
initDb()
  .then(() => self.postMessage({ type: 'ready' }))
  .catch((err) =>
    self.postMessage({ type: 'error', message: 'PGlite init failed: ' + errorMessage(err) })
  );

async function runQuery(code, setupCode) {
  let rows = null;
  let err = null;
  let inTx = false;
  try {
    await db.exec('BEGIN');
    inTx = true;
    if (setupCode && setupCode.trim()) {
      await db.exec(setupCode);
    }
    const results = await db.exec(code || '');
    const last = Array.isArray(results) ? results[results.length - 1] : results;
    rows = (last && last.rows) ? last.rows.map((row) => {
      const normalized = {};
      for (const k of Object.keys(row)) {
        normalized[k] = formatCell(row[k]);
      }
      return normalized;
    }) : [];
  } catch (e) {
    err = e;
  } finally {
    if (inTx) {
      try { await db.exec('ROLLBACK'); } catch { /* ignore */ }
    }
  }
  return { rows, err };
}

self.onmessage = async function (e) {
  const { type, code, setupCode, referenceCode } = e.data;

  if (type === 'check') {
    try {
      await initDb();
    } catch (err) {
      self.postMessage({ type: 'check_result', correct: false });
      return;
    }

    const { rows: userRows, err: userErr } = await runQuery(code, setupCode);
    if (userErr) {
      self.postMessage({ type: 'check_result', correct: false });
      return;
    }

    const { rows: refRows, err: refErr } = await runQuery(referenceCode, setupCode);
    if (refErr) {
      self.postMessage({ type: 'check_result', correct: false });
      return;
    }

    const correct = JSON.stringify(userRows) === JSON.stringify(refRows);
    self.postMessage({ type: 'check_result', correct });
    return;
  }

  if (type !== 'run') return;

  try {
    await initDb();
  } catch (err) {
    self.postMessage({ type: 'result', stdout: '', stderr: errorMessage(err) });
    return;
  }

  let stdout = '';
  let stderr = '';

  // Wrap everything in a transaction we always roll back, so state never persists
  let inTx = false;
  try {
    await db.exec('BEGIN');
    inTx = true;

    if (setupCode && setupCode.trim()) {
      try {
        await db.exec(setupCode);
      } catch (err) {
        stderr = 'Setup error: ' + errorMessage(err);
        await db.exec('ROLLBACK');
        inTx = false;
        self.postMessage({ type: 'result', stdout: '', stderr });
        return;
      }
    }

    try {
      const results = await db.exec(code || '');
      const last = Array.isArray(results) ? results[results.length - 1] : results;
      stdout = formatResult(last);
    } catch (err) {
      stderr = errorMessage(err);
    }
  } catch (err) {
    stderr = stderr || errorMessage(err);
  } finally {
    if (inTx) {
      try {
        await db.exec('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
    }
  }

  self.postMessage({ type: 'result', stdout, stderr });
};
