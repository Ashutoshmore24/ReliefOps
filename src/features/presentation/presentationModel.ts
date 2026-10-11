import type { Execution } from '../../algorithm/solver';
import { learningTargets } from '../learning/lessons';

export function presentationStops(execution: Execution) {
  const targets = learningTargets(execution);
  // Prefer a bound recorded after branching so the guided sequence moves forward.
  const bound = execution.trace.findIndex((event, index) => index >= (targets.branching ?? 0) && event.kind === 'created' && event.node.boundCalculation !== null);
  return [
    { title: 'The problem', index: targets.problem, text: 'Choose whole supplies to maximize priority without exceeding carrying capacity.' },
    { title: 'Branching', index: targets.branching, text: 'Follow a real include decision. Its sibling explores leaving this supply behind.' },
    { title: 'Bounding', index: bound < 0 ? targets.bounding : bound, text: 'Inspect the recorded upper bound. Fractions estimate potential; the kit still takes whole supplies.' },
    { title: 'Pruning', index: targets.pruning, text: 'Inspect this recorded prune reason and the incumbent. The explanation shows why this branch stops.' },
    { title: 'Final result', index: execution.trace.length ? execution.trace.length - 1 : null, text: execution.optimal
      ? `The search proved priority ${execution.result.priority} optimal. Ratio-greedy returned ${execution.greedy.priority}; the priority difference is ${execution.result.priority - execution.greedy.priority}.`
      : `Search stopped: ${execution.status}. Priority ${execution.result.priority} is feasible, but optimality is not proven. Unexplored branches may still improve it.` },
  ];
}
