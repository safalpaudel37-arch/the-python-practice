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

// Post ready immediately — no WASM loading required
self.postMessage({ type: 'ready' });

function normalizeLines(lines) {
  return truncate(lines).join('\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
}

function runCode(code) {
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
    const fn = new Function('console', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', code);
    fn(mockConsole, undefined, undefined, undefined, undefined);
  } catch (err) {
    stderrLines.push(err instanceof Error ? err.name + ': ' + err.message : String(err));
  }
  return { stdoutLines, stderrLines };
}

self.onmessage = function (e) {
  const { type, code, referenceCode } = e.data;

  if (type === 'check') {
    const { stdoutLines: userLines } = runCode(code);
    const { stdoutLines: refLines } = runCode(referenceCode);
    const correct = normalizeLines(userLines) === normalizeLines(refLines);
    self.postMessage({ type: 'check_result', correct });
    return;
  }

  if (type !== 'run') return;

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
    // Shadow network globals so user code can't make requests
    const fn = new Function('console', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', code);
    fn(mockConsole, undefined, undefined, undefined, undefined);

    self.postMessage({
      type: 'result',
      stdout: truncate(stdoutLines).join('\n'),
      stderr: stderrLines.join('\n'),
    });
  } catch (err) {
    self.postMessage({
      type: 'result',
      stdout: truncate(stdoutLines).join('\n'),
      stderr: err instanceof Error ? err.name + ': ' + err.message : String(err),
    });
  }
};
