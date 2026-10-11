import type { Execution } from '../../algorithm/solver';
import { units, type Mission } from '../../domain/mission';
export function resultStatus(execution: Execution) {
  if (execution.optimal) return { label: 'Proven optimal', explanation: 'Every branch was resolved or safely ruled out. No feasible kit has a higher priority.' };
  if (execution.status === 'cancelled') return { label: 'Cancelled · feasible kit retained', explanation: 'The search was cancelled. This kit fits, but unexplored branches may contain a better kit. Optimality is not proven.' };
  return { label: 'Feasible · search incomplete', explanation: `The ${execution.status === 'node-limit' ? 'node' : 'trace'} limit stopped the search. This kit fits, but a better kit may remain unexplored. Optimality is not proven.` };
}
export function compareStrategies(execution: Execution) {
  const difference = execution.result.priority - execution.greedy.priority;
  const percentage = execution.greedy.priority > 0 ? difference / execution.greedy.priority * 100 : null;
  return { difference, percentage, maxPriority: Math.max(1, execution.result.priority, execution.greedy.priority), equal: difference === 0 };
}
export function deriveResults(execution: Execution, mission: Mission) {
  const selectedIds = new Set(execution.result.selectedIds);
  const indexed = mission.supplies.map((item, index) => ({ ...item, inventoryNumber: index + 1 }));
  const selected = indexed.filter(item => selectedIds.has(item.id)), excluded = indexed.filter(item => !selectedIds.has(item.id));
  const capacityUnits = units(mission.capacity), weightUnits = units(execution.result.weight);
  let frontier = 0, peakFrontier = 0;
  let lastIncumbent: number | null = null, firstPrune: number | null = null, proof: number | null = null;
  let overweightPrunes = 0, boundPrunes = 0;
  execution.trace.forEach((event, index) => {
    if (event.kind === 'created') { frontier++; peakFrontier = Math.max(peakFrontier, frontier); }
    if (event.kind === 'active') frontier--;
    if (event.kind === 'incumbent') lastIncumbent = index;
    if (event.kind === 'finished') proof = index;
    if (event.kind === 'pruned') {
      firstPrune ??= index;
      if (event.node.pruneReason === 'Over capacity') overweightPrunes++;
      if (event.node.pruneReason === 'Upper bound cannot improve the best known kit') boundPrunes++;
    }
  });
  return {
    status: resultStatus(execution), selected, excluded, capacity: mission.capacity, remaining: (capacityUnits - weightUnits) / 100,
    utilization: capacityUnits ? weightUnits / capacityUnits * 100 : 0, selectedCount: selected.length,
    comparison: compareStrategies(execution), peakFrontier, remainingFrontier: frontier, overweightPrunes, boundPrunes,
    links: { bestKit: lastIncumbent ?? (execution.trace.length ? 0 : null), firstPrune, proof },
  };
}
