import type { Mission } from '../domain/mission';
import type { Execution, Progress } from '../algorithm/solver';
export interface Limits { nodeLimit: number; traceLimit: number }
export type Request = { type: 'start'; runId: number; mission: Mission; limits: Limits } | { type: 'cancel'; runId: number };
export type Response = { type: 'progress'; runId: number; progress: Progress } | { type: 'result'; runId: number; execution: Execution } | { type: 'error'; runId: number; message: string };
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const integer = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v);
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.every(id => typeof id === 'string');
const kit = (v: unknown): boolean => object(v) && ids(v.selectedIds) && finite(v.weight) && integer(v.priority);
export function isRequest(v: unknown): v is Request {
  if (!object(v) || !integer(v.runId)) return false;
  if (v.type === 'cancel') return true;
  if (v.type !== 'start' || !object(v.mission) || !object(v.limits)) return false;
  const m = v.mission;
  return typeof m.capacity === 'number' && Array.isArray(m.supplies) && m.supplies.length <= 100 && m.supplies.every(item => object(item) && ['id', 'name', 'category'].every(key => typeof item[key] === 'string') && typeof item.weight === 'number' && typeof item.priority === 'number') && integer(v.limits.nodeLimit) && v.limits.nodeLimit > 0 && integer(v.limits.traceLimit) && v.limits.traceLimit > 0;
}
export function isResponse(v: unknown): v is Response {
  if (!object(v) || !integer(v.runId)) return false;
  if (v.type === 'error') return typeof v.message === 'string';
  if (v.type === 'progress') return object(v.progress) && kit(v.progress.result) && integer(v.progress.exploredNodes) && integer(v.progress.createdNodes);
  if (v.type !== 'result' || !object(v.execution)) return false;
  const e = v.execution;
  if (!['optimal', 'cancelled', 'node-limit', 'trace-limit'].includes(String(e.status)) || e.optimal !== (e.status === 'optimal') || typeof e.greedyOptimal !== 'boolean' || (e.status !== 'optimal' && e.greedyOptimal)) return false;
  if (!Array.isArray(e.trace) || !e.trace.length || e.trace.some(event => object(event) && event.kind === 'finished') !== e.optimal || (e.optimal && (!object(e.trace.at(-1)) || e.trace.at(-1).kind !== 'finished'))) return false;
  return kit(e.result) && kit(e.greedy) && finite(e.remainingUpperBound) && integer(e.exploredNodes) && integer(e.prunedNodes) && integer(e.createdNodes) && Array.isArray(e.trace) && e.trace.every(event => {
    if (!object(event) || !object(event.node)) return false;
    const n = event.node;
    const b = n.boundCalculation;
    if (b !== null && (!object(b) || !finite(b.basePriority) || !finite(b.wholePriority) || !finite(b.fractionWeight) || !finite(b.fractionItemWeight) || !finite(b.fractionItemPriority) || typeof b.exactNumerator !== 'string' || !/^\d+$/.test(b.exactNumerator) || typeof b.exactDenominator !== 'string' || !/^[1-9]\d*$/.test(b.exactDenominator))) return false;
    return ['created', 'active', 'incumbent', 'pruned', 'finished'].includes(String(event.kind)) && typeof event.explanation === 'string' && integer(n.id) && (n.parentId === null || integer(n.parentId)) && integer(n.depth) && ['root', 'include', 'exclude'].includes(String(n.decision)) && (n.itemId === null || typeof n.itemId === 'string') && finite(n.weight) && integer(n.priority) && finite(n.upperBound) && integer(n.incumbent) && ids(n.selectedIds) && (n.pruneReason === null || typeof n.pruneReason === 'string');
  });
}
