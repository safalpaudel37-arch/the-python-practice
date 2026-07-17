import { WorkerBridge } from './worker-bridge';

export type SolutionRunResult =
  | { ok: true; stdout: string }
  | { ok: false; message: string };

/**
 * Runs reference solution code in the Pyodide worker and captures its stdout.
 * Used by the admin question form to derive `expected_output` for run-graded
 * Python questions (the value the server-side checker grades against) instead
 * of relying on a hand-typed copy.
 *
 * One run at a time; the worker is spawned lazily on first use and kept warm
 * between runs. Call dispose() when the owning component unmounts.
 */
export class SolutionRunner {
  private bridge: WorkerBridge | null = null;
  private ready: Promise<void> | null = null;
  private pending: ((r: SolutionRunResult) => void) | null = null;

  private settle(result: SolutionRunResult) {
    const resolve = this.pending;
    this.pending = null;
    resolve?.(result);
  }

  private ensureReady(): Promise<void> {
    if (this.bridge && this.ready) return this.ready;

    let resolveReady!: () => void;
    let rejectReady!: (err: Error) => void;
    this.ready = new Promise<void>((res, rej) => {
      resolveReady = res;
      rejectReady = rej;
    });

    this.bridge = new WorkerBridge({
      onReady: () => resolveReady(),
      onResult: (stdout, stderr) => {
        if (stderr.trim()) this.settle({ ok: false, message: stderr.trim() });
        else this.settle({ ok: true, stdout });
      },
      // The Python worker has no input() bridge (input() raises), but guard anyway.
      onInputRequest: () => {
        this.dispose();
        this.settle({
          ok: false,
          message: 'The solution requests input() — fill the expected output manually.',
        });
      },
      onError: (message, kind) => {
        if (this.pending) {
          this.settle({
            ok: false,
            message: kind === 'timeout' ? 'The solution timed out (60 second limit).' : message,
          });
          // After a timeout/crash the bridge respawned mid-flight; start clean next run.
          if (kind === 'timeout' || kind === 'crash') this.dispose();
        } else {
          // Load failure before any run (e.g. Pyodide CDN unreachable).
          rejectReady(new Error(message));
          this.dispose();
        }
      },
    });

    return this.ready;
  }

  /** Run `code` and capture its stdout. Resolves — never rejects. */
  async run(code: string): Promise<SolutionRunResult> {
    if (this.pending) return { ok: false, message: 'A run is already in progress.' };
    try {
      await this.ensureReady();
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Python environment failed to load.',
      };
    }
    return new Promise<SolutionRunResult>((resolve) => {
      this.pending = resolve;
      this.bridge!.run(code);
    });
  }

  dispose() {
    this.bridge?.terminate();
    this.bridge = null;
    this.ready = null;
  }
}
