/* JavaScript Web Worker — runs user JS code in a sandboxed context */

const MAX_LINES = 1000;

function stringify(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function truncate(lines) {
  if (lines.length > MAX_LINES) {
    return lines.slice(0, MAX_LINES).concat('[... output truncated at 1000 lines]');
  }
  return lines;
}

// Delete network globals so user code cannot reach them via self.* or globalThis.*
// Parameter shadowing alone is bypassable; deletion is not.
const _networksToDelete = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts'];
for (const name of _networksToDelete) {
  try { delete self[name]; } catch { /* read-only in some envs — best effort */ }
}

// User JS gets zero imports. A static `import ...` is already a SyntaxError in a
// classic worker; this rejects the dynamic escape hatches — import() and
// require() — before the code is ever run.
const IMPORT_PATTERN = /\bimport\s*\(|(?:^|[^.\w$])require\s*\(/;
function assertNoImports(code) {
  if (IMPORT_PATTERN.test(code)) {
    throw new Error("imports are disabled in this environment");
  }
}

// Bounded window (ms) given to queued microtasks and timers after the synchronous
// portion finishes, so console output from promises / async-await / setTimeout is
// captured too. Bounded so an unresolved promise or long timer can't hang the worker
// (worker-bridge also enforces a hard 60s timeout). Covers the setTimeout delays used
// in questions (≤100ms) with margin.
const ASYNC_WAIT_MS = 150;

// Async errors (unhandled rejections, throws inside timer callbacks) are not part of
// stdout and must never propagate to the main-thread Worker.onerror — which would look
// like a crash and respawn the worker mid-check. Swallow them; sync errors are still
// caught inline below.
self.addEventListener('unhandledrejection', (e) => { e.preventDefault(); });
self.addEventListener('error', (e) => { e.preventDefault(); });

// Post ready immediately — no WASM loading required
self.postMessage({ type: 'ready' });

function normalizeLines(lines) {
  return truncate(lines).join('\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
}

async function runCode(code) {
  const stdoutLines = [];
  const stderrLines = [];
  const mockConsole = {
    log: (...args) => stdoutLines.push(args.map(stringify).join(' ')),
    info: (...args) => stdoutLines.push(args.map(stringify).join(' ')),
    warn: (...args) => stderrLines.push('[warn] ' + args.map(stringify).join(' ')),
    error: (...args) => stderrLines.push(args.map(stringify).join(' ')),
    dir: (v) => stdoutLines.push(stringify(v)),
    table: (v) => stdoutLines.push(stringify(v)),
  };
  try {
    assertNoImports(code);
    // Shadow network globals so user code can't make requests
    const fn = new Function('console', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', code);
    fn(mockConsole, undefined, undefined, undefined, undefined);
  } catch (err) {
    stderrLines.push(err instanceof Error ? err.name + ': ' + err.message : String(err));
  }
  // Let queued async work run so its console output is captured before we report.
  await new Promise((resolve) => setTimeout(resolve, ASYNC_WAIT_MS));
  return { stdoutLines, stderrLines };
}

self.onmessage = async function (e) {
  const { type, code, referenceCode } = e.data;

  if (type === 'check') {
    const { stdoutLines: userLines } = await runCode(code);
    const { stdoutLines: refLines } = await runCode(referenceCode);
    const correct = normalizeLines(userLines) === normalizeLines(refLines);
    self.postMessage({ type: 'check_result', correct });
    return;
  }

  if (type !== 'run') return;

  const { stdoutLines, stderrLines } = await runCode(code);
  self.postMessage({
    type: 'result',
    stdout: truncate(stdoutLines).join('\n'),
    stderr: stderrLines.join('\n'),
  });
};
