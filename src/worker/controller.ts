import type { Mission } from '../domain/mission';
import { isResponse, type Limits, type Request, type Response } from './protocol';
export interface WorkerPort {
  postMessage(request: Request): void; terminate(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
}
// One worker per run: replacement and editing terminate obsolete computation.
export class RunController {
  private worker: WorkerPort | null = null;
  private runId = 0;
  constructor(private factory: () => WorkerPort, private receive: (response: Response) => void) {}
  invalidate() { this.runId++; this.worker?.terminate(); this.worker = null; }
  start(mission: Mission, limits: Limits) {
    this.invalidate();
    const id = this.runId;
    try {
      const worker = this.factory(); this.worker = worker;
      const fail = (message: string) => {
        if (id !== this.runId || this.worker !== worker) return;
        worker.terminate(); this.worker = null;
        this.receive({ type: 'error', runId: id, message });
      };
      worker.onmessage = event => {
        if (id !== this.runId || this.worker !== worker) return;
        if (!isResponse(event.data)) { fail('Invalid response from optimization worker.'); return; }
        if (event.data.runId !== id) return;
        if (event.data.type !== 'progress') { worker.terminate(); this.worker = null; }
        this.receive(event.data);
      };
      worker.onerror = () => fail('Optimization worker failed. Please try again.');
      worker.onmessageerror = () => fail('Could not read the optimization worker response.');
      worker.postMessage({ type: 'start', runId: id, mission: structuredClone(mission), limits });
    } catch (error) { this.worker?.terminate(); this.worker = null; this.receive({ type: 'error', runId: id, message: error instanceof Error ? error.message : 'Could not start worker.' }); }
    return id;
  }
  cancel() { this.worker?.postMessage({ type: 'cancel', runId: this.runId }); }
  dispose() { this.invalidate(); }
}
