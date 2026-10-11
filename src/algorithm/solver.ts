import { units, validateMission, type Mission, type Supply } from '../domain/mission';
export interface BoundCalculation { basePriority: number; wholePriority: number; fractionWeight: number; fractionItemWeight: number; fractionItemPriority: number; exactNumerator: string; exactDenominator: string }
export interface Bound { numerator: bigint; denominator: bigint; calculation?: BoundCalculation }
interface Ranked extends Supply { mass: number; order: number }
export interface SearchNode {
  id: number; parentId: number | null; depth: number; decision: 'root' | 'include' | 'exclude';
  itemId: string | null; weight: number; priority: number; upperBound: number;
  selectedIds: string[]; incumbent: number; pruneReason: string | null;
  boundCalculation: BoundCalculation | null;
}
export interface TraceEvent { kind: 'created' | 'active' | 'incumbent' | 'pruned' | 'finished'; node: SearchNode; explanation: string }
export interface Kit { selectedIds: string[]; weight: number; priority: number }
export interface Execution {
  status: 'optimal' | 'cancelled' | 'node-limit' | 'trace-limit'; optimal: boolean; result: Kit; greedy: Kit; greedyOptimal: boolean;
  trace: TraceEvent[]; exploredNodes: number; prunedNodes: number; createdNodes: number;
  remainingUpperBound: number;
}
export interface SolverOptions { nodeLimit?: number; traceLimit?: number; batchSize?: number; shouldCancel?: () => boolean }
export interface Progress { result: Kit; exploredNodes: number; createdNodes: number }
export function compareBounds(a: Bound, b: Bound): number {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
export function rankSupplies(supplies: Supply[]): Ranked[] {
  return supplies.map((item, order) => ({ ...item, mass: units(item.weight), order })).sort((a, b) => {
    const difference = BigInt(b.priority) * BigInt(a.mass) - BigInt(a.priority) * BigInt(b.mass);
    return difference < 0n ? -1 : difference > 0n ? 1 : a.order - b.order;
  });
}
// Fractional relaxation over undecided supplies. All comparisons use exact rationals.
export function fractionalBound(items: readonly { mass: number; priority: number }[], depth: number, mass: number, priority: number, capacity: number): Bound {
  let remaining = capacity - mass;
  let value = BigInt(priority);
  const finish = (numerator: bigint, denominator: bigint, fractionWeight = 0, fractionItemWeight = 0, fractionItemPriority = 0): Bound => ({ numerator, denominator, calculation: { basePriority: priority, wholePriority: Number(value) - priority, fractionWeight: fractionWeight / 100, fractionItemWeight: fractionItemWeight / 100, fractionItemPriority, exactNumerator: String(numerator), exactDenominator: String(denominator) } });
  for (let i = depth; i < items.length; i++) {
    const item = items[i];
    if (item.mass <= remaining) { remaining -= item.mass; value += BigInt(item.priority); }
    else return finish(value * BigInt(item.mass) + BigInt(remaining) * BigInt(item.priority), BigInt(item.mass), remaining, item.mass, item.priority);
  }
  return finish(value, 1n);
}
export function* execute(mission: Mission, options: SolverOptions = {}): Generator<Progress, Execution> {
  const errors = validateMission(mission);
  if (errors.length) throw new Error(errors.join('\n'));
  for (const value of [options.nodeLimit, options.traceLimit, options.batchSize]) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) throw new Error('Resource limits and batch size must be positive safe integers.');
  }
  const items = rankSupplies(mission.supplies), capacity = units(mission.capacity);
  const greedy: Kit = { selectedIds: [], weight: 0, priority: 0 };
  let greedyMass = 0;
  for (const item of items) if (greedyMass + item.mass <= capacity) {
    greedyMass += item.mass; greedy.priority += item.priority; greedy.selectedIds.push(item.id);
  }
  greedy.weight = greedyMass / 100;
  let best: Kit = { selectedIds: [], weight: 0, priority: 0 };
  const trace: TraceEvent[] = [];
  let created = 0, explored = 0, pruned = 0;
  type Pending = { node: SearchNode; bound: Bound; mass: number };
  const frontier: Pending[] = [];
  const emit = (kind: TraceEvent['kind'], node: SearchNode, explanation: string) => {
    trace.push({ kind, node: { ...node, selectedIds: [...node.selectedIds], incumbent: best.priority }, explanation });
  };
  const create = (parent: Pending | null, include = false): Pending => {
    const item = parent ? items[parent.node.depth] : null;
    const mass = (parent?.mass ?? 0) + (include ? item!.mass : 0);
    const priority = (parent?.node.priority ?? 0) + (include ? item!.priority : 0);
    const depth = parent ? parent.node.depth + 1 : 0;
    const bound: Bound = mass > capacity ? { numerator: BigInt(priority), denominator: 1n } : fractionalBound(items, depth, mass, priority, capacity);
    const node: SearchNode = { id: created++, parentId: parent?.node.id ?? null, depth, decision: parent ? include ? 'include' : 'exclude' : 'root', itemId: item?.id ?? null, weight: mass / 100, priority, upperBound: Number(bound.numerator) / Number(bound.denominator), selectedIds: [...(parent?.node.selectedIds ?? []), ...(include ? [item!.id] : [])], incumbent: best.priority, pruneReason: null, boundCalculation: bound.calculation ?? null };
    emit('created', node, item ? `${include ? 'Include' : 'Exclude'} ${item.name}. This branch carries ${node.weight} kg and has priority ${priority}.` : 'Start with an empty kit. The bound estimates the greatest priority this branch could reach by allowing fractional supplies.');
    return { node, bound, mass };
  };
  frontier.push(create(null));
  let status: Execution['status'] = 'optimal';
  while (frontier.length) {
    if (options.shouldCancel?.()) { status = 'cancelled'; break; }
    if (explored >= (options.nodeLimit ?? Infinity)) { status = 'node-limit'; break; }
    frontier.sort((a, b) => -compareBounds(a.bound, b.bound) || a.node.id - b.node.id);
    // Reserve exactly the events this node needs, plus the completion event.
    // Do not remove a node until its entire transition fits in the trace budget.
    const candidate = frontier[0];
    const improves = candidate.mass <= capacity && candidate.node.priority > best.priority;
    const futureBest = improves ? candidate.node.priority : best.priority;
    const willPrune = candidate.mass > capacity || candidate.bound.numerator <= BigInt(futureBest) * candidate.bound.denominator || candidate.node.depth === items.length;
    const eventCost = 1 + Number(improves) + (willPrune ? 1 : 2);
    if (trace.length + eventCost + 1 > (options.traceLimit ?? Infinity)) { status = 'trace-limit'; break; }
    const current = frontier.shift()!;
    const { node, mass, bound } = current;
    explored++;
    emit('active', node, 'Inspect the branch with the highest upper bound; creation order breaks ties.');
    if (mass > capacity) node.pruneReason = 'Over capacity';
    else {
      if (node.priority > best.priority) {
        best = { selectedIds: [...node.selectedIds], weight: node.weight, priority: node.priority };
        emit('incumbent', node, `This feasible kit improves the best known priority to ${best.priority}.`);
      }
      if (bound.numerator <= BigInt(best.priority) * bound.denominator) node.pruneReason = 'Upper bound cannot improve the best known kit';
      else if (node.depth === items.length) node.pruneReason = 'All decisions made';
    }
    if (node.pruneReason) { pruned++; emit('pruned', node, `Stop this branch: ${node.pruneReason.toLowerCase()}.`); }
    else { frontier.push(create(current, true)); frontier.push(create(current, false)); }
    if (frontier.length && explored % (options.batchSize ?? 32) === 0) yield { result: { ...best, selectedIds: [...best.selectedIds] }, exploredNodes: explored, createdNodes: created };
  }
  const finalNode = trace[trace.length - 1].node;
  if (status === 'optimal') emit('finished', finalNode, `Search complete. Every branch was resolved or safely pruned. The optimal priority is ${best.priority}.`);
  const remainingUpperBound = frontier.reduce((upper, p) => p.mass <= capacity ? Math.max(upper, Number(p.bound.numerator) / Number(p.bound.denominator)) : upper, best.priority);
  return { status, optimal: status === 'optimal', result: best, greedy, greedyOptimal: status === 'optimal' && greedy.priority === best.priority, trace, exploredNodes: explored, prunedNodes: pruned, createdNodes: created, remainingUpperBound };
}
export function solve(mission: Mission, options: SolverOptions = {}): Execution {
  const execution = execute(mission, options);
  let step = execution.next();
  while (!step.done) step = execution.next();
  return step.value;
}
