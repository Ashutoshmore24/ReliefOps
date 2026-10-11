import { execute } from '../algorithm/solver';
import { isRequest, type Response } from './protocol';
let active = false;
let cancelled = false;
let runId = -1;
const send = (response: Response) => globalThis.postMessage(response);
globalThis.onmessage = async (event: MessageEvent<unknown>) => {
  if (!isRequest(event.data)) { send({ type: 'error', runId: Math.max(runId, 0), message: 'Invalid worker request.' }); return; }
  const request = event.data;
  if (request.type === 'cancel') { if (request.runId === runId) cancelled = true; return; }
  if (active) { send({ type: 'error', runId: request.runId, message: 'Worker already has an active execution.' }); return; }
  active = true; cancelled = false; runId = request.runId;
  try {
    const iterator = execute(request.mission, { ...request.limits, batchSize: 32, shouldCancel: () => cancelled });
    let step = iterator.next();
    while (!step.done) {
      send({ type: 'progress', runId, progress: step.value });
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      step = iterator.next();
    }
    send({ type: 'result', runId, execution: step.value });
  } catch (error) { send({ type: 'error', runId, message: error instanceof Error ? error.message : 'Optimization failed.' }); }
  finally { active = false; }
};
