export type OutputLine = {
  id: string;
  text: string;
  type: "stdout" | "stderr" | "error" | "timeout";
};

type BridgeCallbacks = {
  onReady: () => void;
  onResult: (stdout: string, stderr: string) => void;
  onInputRequest: (prompt: string) => void;
  onError: (message: string, kind: "error" | "timeout" | "crash") => void;
};

const TIMEOUT_MS = 60000;

export type WorkerConfig = string | { url: string; type: 'module' };

export class WorkerBridge {
  private worker: Worker | null = null;
  private callbacks: BridgeCallbacks;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private ready = false;

  // SharedArrayBuffer-based input channel
  private inputBuffer: Int32Array | null = null;
  private inputMetaBuffer: Int32Array | null = null;
  private hasSAB: boolean;

  private workerConfig: WorkerConfig;

  constructor(callbacks: BridgeCallbacks, workerConfig: WorkerConfig = '/pyodide-worker.js') {
    this.callbacks = callbacks;
    this.workerConfig = workerConfig;
    this.hasSAB = typeof SharedArrayBuffer !== "undefined";

    if (this.hasSAB) {
      this.inputBuffer = new Int32Array(new SharedArrayBuffer(4096 * 4));
      this.inputMetaBuffer = new Int32Array(new SharedArrayBuffer(4));
    }

    this.spawnWorker();
  }

  get isReady() {
    return this.ready;
  }

  get isRunning() {
    return this.running;
  }

  private spawnWorker() {
    if (typeof this.workerConfig === 'string') {
      this.worker = new Worker(this.workerConfig);
    } else {
      this.worker = new Worker(this.workerConfig.url, { type: this.workerConfig.type });
    }
    this.worker.onmessage = (e) => this.handleMessage(e.data);
    this.worker.onerror = (e) => {
      this.clearTimeout();
      this.running = false;
      this.callbacks.onError(
        "Execution environment crashed. Please try again.",
        "crash"
      );
      // Respawn so next run works
      this.spawnWorker();
    };
  }

  private handleMessage(data: Record<string, unknown>) {
    const { type } = data;

    if (type === "ready") {
      this.ready = true;
      this.callbacks.onReady();
      return;
    }

    if (type === "input_request") {
      this.clearTimeout();
      this.callbacks.onInputRequest(String(data.prompt ?? ""));
      return;
    }

    if (type === "result") {
      this.clearTimeout();
      this.running = false;
      this.callbacks.onResult(String(data.stdout ?? ""), String(data.stderr ?? ""));
      return;
    }

    if (type === "error") {
      this.clearTimeout();
      this.running = false;
      this.callbacks.onError(String(data.message ?? "Unknown error"), "error");
      return;
    }
  }

  checkAnswer(code: string, referenceCode: string, setupCode?: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.worker) { resolve(false); return; }
      const handler = (e: MessageEvent) => {
        const data = e.data as Record<string, unknown>;
        if (data.type === 'check_result') {
          this.worker!.removeEventListener('message', handler);
          clearTimeout(tid);
          resolve(Boolean(data.correct));
        }
      };
      this.worker.addEventListener('message', handler);
      const tid = setTimeout(() => {
        this.worker?.removeEventListener('message', handler);
        resolve(false);
      }, TIMEOUT_MS);
      this.worker.postMessage({ type: 'check', code, referenceCode, setupCode });
    });
  }

  run(code: string, setupCode?: string) {
    if (!this.worker) return;

    const MAX_CODE_SIZE = 1024 * 1024;
    if (code.length > MAX_CODE_SIZE) {
      this.callbacks.onError(
        `Code too large (${Math.round(code.length / 1024)}KB). Maximum allowed is 1MB.`,
        "error"
      );
      return;
    }

    // Terminate any in-progress run and get a fresh worker
    if (this.running) {
      this.terminateWorker();
      this.spawnWorker();
    }

    this.running = true;

    // Reset input channel
    if (this.inputMetaBuffer) {
      Atomics.store(this.inputMetaBuffer, 0, 0);
    }

    const message: Record<string, unknown> = { type: "run", code };
    if (setupCode) {
      message.setupCode = setupCode;
    }
    if (this.hasSAB && this.inputBuffer && this.inputMetaBuffer) {
      message.inputBuffer = this.inputBuffer.buffer;
      message.inputMetaBuffer = this.inputMetaBuffer.buffer;
    }

    this.worker.postMessage(message);

    // Hard timeout — terminate and respawn worker if it doesn't respond
    this.timeoutId = setTimeout(() => {
      this.terminateWorker();
      this.running = false;
      this.callbacks.onError("timeout", "timeout");
      this.spawnWorker();
      // Mark ready again since we have a new worker loading
      this.ready = false;
    }, TIMEOUT_MS);
  }

  sendInput(value: string) {
    if (!this.inputBuffer || !this.inputMetaBuffer) return;

    // Note: Don't set a new timeout here. The run() method already set a timeout
    // for the entire execution. Setting another timeout here creates memory leaks
    // and can kill the worker if user takes >60s between inputs.

    const encoder = new TextEncoder();
    const encoded = encoder.encode(value);
    const len = Math.min(encoded.length, this.inputBuffer.length - 1);
    for (let i = 0; i < len; i++) {
      Atomics.store(this.inputBuffer, i, encoded[i]);
    }
    Atomics.store(this.inputMetaBuffer, 0, len);
    Atomics.notify(this.inputMetaBuffer, 0, 1);
  }

  private clearTimeout() {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private terminateWorker() {
    this.clearTimeout();
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }

  terminate() {
    this.terminateWorker();
    this.running = false;
  }
}
