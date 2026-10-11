import { afterEach, describe, expect, it, vi } from 'vitest';
import { execute, solve } from '../algorithm/solver';
import { presets } from '../domain/mission';
import { RunController, type WorkerPort } from './controller';
import { isRequest, isResponse, type Request, type Response } from './protocol';
const limits = { nodeLimit: 10000, traceLimit: 40000 };
class FakeWorker implements WorkerPort {
  onmessage: WorkerPort['onmessage'] = null;
  onerror: WorkerPort['onerror'] = null;
  onmessageerror: WorkerPort['onmessageerror'] = null;
  postMessage = vi.fn<(request: Request) => void>();
  terminate = vi.fn();
  send(data: unknown) { this.onmessage?.({ data } as MessageEvent); }
}
describe('worker controller lifecycle', () => {
  it('sends immutable requests and accepts real results', () => {
    const worker = new FakeWorker(), receive = vi.fn();
    const controller = new RunController(() => worker, receive);
    const id = controller.start(presets['Flood relief'], limits);
    const request = worker.postMessage.mock.calls[0][0];
    expect(request).toEqual({ type: 'start', runId: id, mission: presets['Flood relief'], limits });
    if (request.type === 'start') expect(request.mission).not.toBe(presets['Flood relief']);
    worker.send({ type: 'result', runId: id, execution: solve(presets['Flood relief']) });
    expect(receive).toHaveBeenCalledOnce(); expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('cancels cooperatively and preserves the returned partial solution', () => {
    const worker = new FakeWorker(), receive = vi.fn(), controller = new RunController(() => worker, receive);
    const id = controller.start(presets['Flood relief'], limits); controller.cancel();
    expect(worker.postMessage).toHaveBeenLastCalledWith({ type: 'cancel', runId: id });
    const execution = solve(presets['Flood relief'], { shouldCancel: () => true });
    worker.send({ type: 'result', runId: id, execution });
    expect(receive.mock.calls[0][0].execution.status).toBe('cancelled');
  });
  it('replaces runs, ignores stale responses, and invalidates on mission changes', () => {
    const first = new FakeWorker(), second = new FakeWorker(), receive = vi.fn();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const controller = new RunController(factory, receive);
    const old = controller.start(presets['Flood relief'], limits);
    const id = controller.start(presets['Earthquake response'], limits);
    expect(first.terminate).toHaveBeenCalledOnce();
    first.send({ type: 'result', runId: old, execution: solve(presets['Flood relief']) });
    second.send({ type: 'result', runId: old, execution: solve(presets['Flood relief']) });
    expect(receive).not.toHaveBeenCalled();
    controller.invalidate();
    second.send({ type: 'result', runId: id, execution: solve(presets['Earthquake response']) });
    expect(receive).not.toHaveBeenCalled(); expect(second.terminate).toHaveBeenCalledOnce();
  });
  it.each(['malformed', 'error', 'messageerror'] as const)('handles %s and cleans up', kind => {
    const worker = new FakeWorker(), receive = vi.fn(), controller = new RunController(() => worker, receive);
    controller.start(presets['Flood relief'], limits);
    if (kind === 'malformed') worker.send({ type: 'result', runId: 1, execution: { optimal: true } });
    if (kind === 'error') worker.onerror?.({} as ErrorEvent);
    if (kind === 'messageerror') worker.onmessageerror?.({} as MessageEvent);
    expect(receive.mock.calls[0][0].type).toBe('error'); expect(worker.terminate).toHaveBeenCalledOnce();
    controller.dispose();
  });
  it('handles worker construction failure', () => {
    const receive = vi.fn(); const controller = new RunController(() => { throw new Error('Unavailable'); }, receive);
    controller.start(presets['Flood relief'], limits);
    expect(receive.mock.calls[0][0].message).toBe('Unavailable');
  });
});
describe('limits and resumable execution', () => {
  it('preserves the unbounded deterministic execution across batch sizes', () => {
    expect(solve(presets['Flood relief'], { batchSize: 1 })).toEqual(solve(presets['Flood relief']));
  });
  it('retains an improved feasible solution at the node limit', () => {
    const result = solve(presets['Flood relief'], { nodeLimit: 2 });
    expect(result.status).toBe('node-limit'); expect(result.optimal).toBe(false);
    expect(result.result.priority).toBeGreaterThan(0); expect(result.result.weight).toBeLessThanOrEqual(15);
    expect(result.exploredNodes).toBe(2); expect(result.remainingUpperBound).toBeGreaterThanOrEqual(60);
    expect(result.trace.some(e => e.kind === 'finished')).toBe(false); expect(result.greedyOptimal).toBe(false);
  });
  it('never exceeds a trace limit or claims proof for a truncated search', () => {
    for (let traceLimit = 1; traceLimit < 60; traceLimit++) {
      const result = solve(presets['Flood relief'], { traceLimit });
      expect(result.trace.length).toBeLessThanOrEqual(traceLimit);
      expect(result.optimal).toBe(result.status === 'optimal');
      if (!result.optimal) { expect(result.status).toBe('trace-limit'); expect(result.remainingUpperBound).toBeGreaterThanOrEqual(60); }
    }
  });
  it('cancels between batches and keeps actual trace data', () => {
    let cancel = false;
    const iterator = execute(presets['Flood relief'], { batchSize: 2, shouldCancel: () => cancel });
    const progress = iterator.next(); expect(progress.done).toBe(false); cancel = true;
    const end = iterator.next(); expect(end.done).toBe(true);
    if (end.done) { expect(end.value.status).toBe('cancelled'); expect(end.value.result.priority).toBeGreaterThan(0); expect(end.value.optimal).toBe(false); }
  });
  it('can prove optimality at the exact node budget and handles empty/overweight input', () => {
    const unlimited = solve(presets['Flood relief']);
    expect(solve(presets['Flood relief'], { nodeLimit: unlimited.exploredNodes }).optimal).toBe(true);
    expect(solve({ capacity: 0, supplies: [] }, limits).optimal).toBe(true);
    expect(solve({ ...presets['Flood relief'], capacity: 1 }, limits).result.priority).toBe(0);
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid budget %s', nodeLimit => expect(() => solve(presets['Flood relief'], { nodeLimit })).toThrow());
});
describe('message validation', () => {
  it('rejects malformed requests and falsely optimal incomplete responses', () => {
    expect(isRequest({ type: 'start', runId: 1, mission: null, limits })).toBe(false);
    expect(isRequest({ type: 'start', runId: 1, mission: presets['Flood relief'], limits })).toBe(true);
    expect(isRequest({ type: 'cancel', runId: '1' })).toBe(false);
    const execution = solve(presets['Flood relief'], { nodeLimit: 1 });
    expect(isResponse({ type: 'result', runId: 1, execution })).toBe(true);
    expect(isResponse({ type: 'result', runId: 1, execution: { ...execution, optimal: true } })).toBe(false);
    expect(isResponse({ type: 'progress', runId: 1, progress: { result: null } })).toBe(false);
  });
});
describe('actual worker entry point', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('runs the real solver and handles a malformed message', async () => {
    const responses: Response[] = [];
    vi.stubGlobal('postMessage', (response: Response) => responses.push(response));
    await import('./optimizer.worker');
    const handler = globalThis.onmessage as unknown as (event: { data: unknown }) => Promise<void>;
    await handler({ data: { type: 'start', runId: 42, mission: presets['Flood relief'], limits } });
    expect(responses.at(-1)).toEqual({ type: 'result', runId: 42, execution: solve(presets['Flood relief']) });
    await handler({ data: { broken: true } }); expect(responses.at(-1)?.type).toBe('error');
  });
  it('processes cancellation messages between actual worker batches', async () => {
    const mission = { capacity: 20, supplies: Array.from({ length: 40 }, (_, i) => ({ id: String(i), name: `Supply ${i}`, category: 'General', weight: 1, priority: 1 })) };
    const responses: Response[] = [];
    const handler = globalThis.onmessage as unknown as (event: { data: unknown }) => Promise<void>;
    vi.stubGlobal('postMessage', (response: Response) => {
      responses.push(response);
      if (response.type === 'progress') void handler({ data: { type: 'cancel', runId: 43 } });
    });
    await handler({ data: { type: 'start', runId: 43, mission, limits } });
    const result = responses.at(-1);
    expect(result?.type).toBe('result');
    if (result?.type === 'result') { expect(result.execution.status).toBe('cancelled'); expect(result.execution.optimal).toBe(false); expect(result.execution.result.weight).toBeLessThanOrEqual(mission.capacity); }
  });
});
