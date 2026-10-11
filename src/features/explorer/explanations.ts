import type { TraceEvent } from '../../algorithm/solver';
import type { Supply } from '../../domain/mission';
export function explain(event: TraceEvent, parent: TraceEvent | null, capacity: number, supplies: Supply[]): { title: string; text: string; bound: string } {
  const n = event.node, item = supplies.find(item => item.id === n.itemId);
  const label = item?.name ?? 'this supply';
  let title = 'Start with an empty kit', text = event.explanation;
  if (event.kind === 'created' && n.decision !== 'root') {
    title = `${n.decision === 'include' ? 'Take' : 'Leave'} ${label}`;
    text = n.decision === 'include' ? `Taking this whole supply changes weight from ${parent?.node.weight ?? 0} to ${n.weight} kg, and priority from ${parent?.node.priority ?? 0} to ${n.priority}. ${n.weight <= capacity ? 'It fits the carrying limit, so it is a feasible candidate.' : `It exceeds the ${capacity} kg limit. The solver will reject this branch when it is inspected.`}` : `Leaving this supply keeps weight at ${n.weight} kg and priority at ${n.priority}. The remaining supplies may still improve this branch.`;
  }
  if (event.kind === 'active') { title = 'Inspect the most promising branch'; text = `This branch has weight ${n.weight} kg and priority ${n.priority}. The solver chose it by its upper bound of ${n.upperBound.toFixed(2)}, with creation order breaking ties. The best known feasible priority is ${n.incumbent}.`; }
  if (event.kind === 'incumbent') { title = 'A better feasible kit'; text = `This ${n.weight} kg kit fits the ${capacity} kg limit. Its priority is ${n.priority}, so the best known feasible priority (the incumbent) improves to ${n.incumbent}. This is a feasible solution; optimality is not proven at this step.`; }
  if (event.kind === 'pruned') {
    title = 'Stop exploring this branch';
    text = n.pruneReason === 'Over capacity' ? `This branch weighs ${n.weight} kg, exceeding the ${capacity} kg limit. Including more supplies cannot reduce weight, so this branch is infeasible and can be stopped.` : n.pruneReason === 'Upper bound cannot improve the best known kit' ? `Even the optimistic upper bound of ${n.upperBound.toFixed(2)} cannot exceed the best known feasible priority of ${n.incumbent}. This branch cannot improve that kit, so we can safely stop exploring it. Equal-value alternatives are not needed to find one optimum.` : event.explanation;
  }
  if (event.kind === 'finished') { title = 'Optimality is proven'; text = `The search has resolved every branch. The best feasible priority is ${n.incumbent}; no unexplored branch can improve it. The final kit is shown in the results summary.`; }
  const b = n.boundCalculation;
  const bound = b ? `${b.basePriority} current priority + ${b.wholePriority} from whole remaining supplies${b.fractionItemWeight ? ` + (${b.fractionWeight} / ${b.fractionItemWeight}) × ${b.fractionItemPriority} from a fraction of the next supply` : ''} = ${n.upperBound.toFixed(2)}. Exact rational: ${b.exactNumerator}/${b.exactDenominator}.` : 'This node is overweight. Its displayed bound is its current priority, not a fractional relaxation; it is rejected by the weight constraint.';
  return { title, text, bound };
}
