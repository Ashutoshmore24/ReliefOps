import type { Execution, SearchNode, TraceEvent } from '../../algorithm/solver';
export type NodeStatus = 'pending' | 'active' | 'feasible' | 'pruned' | 'best' | 'infeasible';
export interface NodeHistory { id: number; parentId: number | null; createdAt: number; events: number[]; children: number[] }
export interface TraceIndex { execution: Execution; nodes: Map<number, NodeHistory>; order: number[]; incumbentEvents: number[] }
export function indexTrace(execution: Execution): TraceIndex {
  const nodes = new Map<number, NodeHistory>(), order: number[] = [], incumbentEvents: number[] = [];
  execution.trace.forEach((event, index) => {
    if (event.kind === 'created') {
      nodes.set(event.node.id, { id: event.node.id, parentId: event.node.parentId, createdAt: index, events: [], children: [] }); order.push(event.node.id);
      if (event.node.parentId !== null) nodes.get(event.node.parentId)?.children.push(event.node.id);
    }
    nodes.get(event.node.id)?.events.push(index);
    if (event.kind === 'incumbent') incumbentEvents.push(index);
  });
  return { execution, nodes, order, incumbentEvents };
}
function atOrBefore(indices: number[], step: number): number | null {
  let low = 0, high = indices.length - 1, answer: number | null = null;
  while (low <= high) { const mid = (low + high) >>> 1; if (indices[mid] <= step) { answer = indices[mid]; low = mid + 1; } else high = mid - 1; }
  return answer;
}
export function nodeAt(model: TraceIndex, id: number, step: number): TraceEvent | null {
  const history = model.nodes.get(id); if (!history) return null;
  const index = atOrBefore(history.events, step); return index === null ? null : model.execution.trace[index];
}
export function incumbentAt(model: TraceIndex, step: number): SearchNode | null {
  const index = atOrBefore(model.incumbentEvents, step); return index === null ? null : model.execution.trace[index].node;
}
export function statusAt(model: TraceIndex, event: TraceEvent, step: number, capacity: number): NodeStatus {
  if (event.node.weight > capacity) return 'infeasible';
  if (incumbentAt(model, step)?.id === event.node.id) return 'best';
  if (event.node.pruneReason) return 'pruned';
  if (event.kind === 'active') return model.execution.trace[step]?.node.id === event.node.id && model.execution.trace[step]?.kind === 'active' ? 'active' : 'feasible';
  if (event.kind === 'incumbent') return 'feasible';
  return 'pending';
}
export interface TreeView { ids: number[]; omitted: number; collapsedBranches: number }
// Breadth-first progressive reveal; only nodes created by this step can appear.
// The selected/current path is retained even when a large tree reaches its cap.
export function visibleTree(model: TraceIndex, step: number, collapsed: ReadonlySet<number>, focus: number | null, limit = 60): TreeView {
  const mandatory = new Set<number>();
  let cursor = focus === null ? undefined : model.nodes.get(focus);
  while (cursor && cursor.createdAt <= step) { mandatory.add(cursor.id); cursor = cursor.parentId === null ? undefined : model.nodes.get(cursor.parentId); }
  const root = model.order[0];
  const queue = root === undefined ? [] : [root], ids: number[] = [];
  let offset = 0, collapsedBranches = 0;
  const cap = Math.max(limit, mandatory.size);
  while (offset < queue.length && ids.length < cap) {
    const id = queue[offset++], node = model.nodes.get(id)!;
    if (node.createdAt > step) continue;
    if (!(ids.length < cap - mandatory.size || mandatory.has(id))) continue;
    ids.push(id);
    if (mandatory.has(id)) mandatory.delete(id);
    if (collapsed.has(id)) {
      const childrenOnPath = node.children.filter(child => mandatory.has(child));
      if (!childrenOnPath.length) { collapsedBranches++; continue; }
      queue.push(...childrenOnPath);
    } else queue.push(...node.children);
  }
  let low = 0, high = model.order.length;
  while (low < high) { const mid = (low + high) >>> 1; if (model.nodes.get(model.order[mid])!.createdAt <= step) low = mid + 1; else high = mid; }
  const revealed = low;
  return { ids, omitted: Math.max(0, revealed - ids.length), collapsedBranches };
}
export interface Position { id: number; x: number; y: number }
export function layoutTree(model: TraceIndex, ids: number[]): { positions: Position[]; width: number; height: number } {
  const shown = new Set(ids), positions: Position[] = []; let leaf = 0, maxDepth = 0;
  const walk = (id: number): number => {
    const history = model.nodes.get(id)!, children = history.children.filter(child => shown.has(child));
    const xs = children.map(walk); const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : 108 + leaf++ * 220;
    const depth = model.execution.trace[history.createdAt].node.depth; maxDepth = Math.max(maxDepth, depth);
    positions.push({ id, x, y: 45 + depth * 135 }); return x;
  };
  if (ids.length) walk(ids[0]);
  return { positions, width: Math.max(300, leaf * 220), height: Math.max(180, maxDepth * 135 + 155) };
}
export function toggleBranch(collapsed: ReadonlySet<number>, id: number): Set<number> { const next = new Set(collapsed); if (next.has(id)) next.delete(id); else next.add(id); return next; }
export function treeKeyTarget(ids: number[], current: number, key: string): number | null {
  const index = ids.indexOf(current);
  if (key === 'Home') return ids[0] ?? null;
  if (key === 'End') return ids.at(-1) ?? null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return ids[Math.min(ids.length - 1, index + 1)] ?? null;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return ids[Math.max(0, index - 1)] ?? null;
  return null;
}
