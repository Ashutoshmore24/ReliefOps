import type { Execution, Kit, SearchNode, TraceEvent } from '../../algorithm/solver';
import type { Mission } from '../../domain/mission';
import { explain } from '../explorer/explanations';
import { incumbentAt, indexTrace, nodeAt, type TraceIndex } from '../explorer/traceModel';

export interface SceneState {
  index: number;
  event: TraceEvent | null;
  node: SearchNode | null;
  trial: Kit;
  best: Kit;
  title: string;
  explanation: string;
  bound: string;
  overloaded: boolean;
  rejected: boolean;
  improved: boolean;
  complete: boolean;
  provenOptimal: boolean;
  transition: 'initial' | 'branch' | 'reconcile' | 'steady';
  added: string[];
  removed: string[];
}
const emptyKit = (): Kit => ({ selectedIds: [], weight: 0, priority: 0 });
const kitOf = (node: SearchNode | null): Kit => node ? { selectedIds: [...node.selectedIds], weight: node.weight, priority: node.priority } : emptyKit();

// Absolute historical derivation: no accumulated playback state or final-kit lookup.
// A created node is a hypothetical preview, not a claim that it was inspected.
export function deriveSceneState(execution: Execution, mission: Mission, selectedIndex: number, inspectedId?: number | null, indexed?: TraceIndex): SceneState {
  const model = indexed ?? indexTrace(execution);
  const index = Math.max(0, Math.min(execution.trace.length - 1, Number.isFinite(selectedIndex) ? Math.trunc(selectedIndex) : 0));
  const event = execution.trace[index] ?? null;
  const inspected = inspectedId == null ? event : nodeAt(model, inspectedId, index) ?? event;
  const node = inspected?.node ?? null;
  const best = kitOf(incumbentAt(model, index));
  const trial = kitOf(node);
  const previous = execution.trace[index - 1]?.node;
  const added = trial.selectedIds.filter(id => !previous?.selectedIds.includes(id));
  const removed = (previous?.selectedIds ?? []).filter(id => !trial.selectedIds.includes(id));
  const transition = !previous ? 'initial' : previous.id === node?.id ? 'steady' : previous.id === node?.parentId ? 'branch' : 'reconcile';
  const complete = !!event && index === execution.trace.length - 1;
  const provenOptimal = complete && execution.optimal && event?.kind === 'finished';
  const details = inspected ? explain(inspected, node?.parentId == null ? null : nodeAt(model, node.parentId, index), mission.capacity, mission.supplies) : { title: 'No recorded events', text: 'Run a mission to inspect real decisions.', bound: 'No bound available.' };
  let explanation = details.text;
  if (inspected?.kind === 'created') explanation += ` Hypothetical ${node?.decision === 'root' ? 'root' : `${node?.decision} alternative from parent #${node?.parentId}`}; created does not mean inspected.`;
  if (transition === 'reconcile') explanation += ' Reconcile the selected sets: best-first search can jump between unrelated branches.';
  if (inspected?.kind === 'active' && node?.decision !== 'root') explanation += ` This trial ${node?.decision === 'include' ? 'includes' : 'leaves outside'} ${mission.supplies.find(item => item.id === node?.itemId)?.name ?? 'the decided supply'}.`;
  if (complete && !provenOptimal) explanation += ` Search stopped: ${execution.status}. Optimality is not proven; remaining upper bound ${execution.remainingUpperBound.toFixed(2)}.`;
  if (event?.kind === 'finished' && !execution.optimal) explanation = 'Search ended without an optimality proof.';
  return { index, event, node, trial, best, title: inspected?.kind === 'finished' && !execution.optimal ? 'Search ended' : details.title, explanation, bound: details.bound, overloaded: trial.weight > mission.capacity, rejected: inspected?.kind === 'pruned', improved: event?.kind === 'incumbent', complete, provenOptimal, transition, added, removed };
}
