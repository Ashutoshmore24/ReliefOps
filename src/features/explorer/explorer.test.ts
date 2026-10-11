import { describe, expect, it } from 'vitest';
import { solve, type Execution, type TraceEvent } from '../../algorithm/solver';
import { presets } from '../../domain/mission';
import { explain } from './explanations';
import { incumbentAt, indexTrace, layoutTree, nodeAt, statusAt, toggleBranch, treeKeyTarget, visibleTree } from './traceModel';
const mission = presets['Flood relief'];
const execution = solve(mission), model = indexTrace(execution);
describe('trace to tree mapping', () => {
  it('maps exactly the created IDs, links parents, and exposes only recorded snapshots', () => {
    expect(model.order).toEqual(execution.trace.filter(e => e.kind === 'created').map(e => e.node.id));
    execution.trace.forEach((event, step) => {
      expect(nodeAt(model, event.node.id, step)).toBe(event);
      if (event.node.parentId !== null) expect(model.nodes.get(event.node.parentId)?.children).toContain(event.node.id);
      expect(visibleTree(model, step, new Set(), event.node.id).ids.every(id => model.nodes.get(id)!.createdAt <= step)).toBe(true);
    });
    expect(nodeAt(model, 100000, 0)).toBeNull();
    expect(visibleTree(model, 0, new Set(), 0).ids).toEqual([0]);
  });
  it('does not leak later incumbents or prune reasons into previous steps', () => {
    const updates = execution.trace.map((e, i) => ({ e, i })).filter(({ e }) => e.kind === 'incumbent');
    for (const { e, i } of updates) { expect(incumbentAt(model, i)?.id).toBe(e.node.id); expect(incumbentAt(model, i - 1)?.priority ?? 0).toBeLessThan(e.node.priority); }
    const prune = execution.trace.findIndex(e => e.kind === 'pruned');
    expect(nodeAt(model, execution.trace[prune].node.id, prune - 1)?.node.pruneReason).toBeNull();
  });
  it('distinguishes pending, active, feasible, best, pruned and infeasible states', () => {
    const observed = new Set<string>();
    execution.trace.forEach((_, step) => { for (const id of visibleTree(model, step, new Set(), null).ids) observed.add(statusAt(model, nodeAt(model, id, step)!, step, mission.capacity)); });
    expect([...observed].sort()).toEqual(['active', 'best', 'feasible', 'infeasible', 'pending', 'pruned']);
    const last = execution.trace.length - 1, incumbent = incumbentAt(model, last)!;
    expect(incumbent.priority).toBe(execution.result.priority);
    expect(statusAt(model, nodeAt(model, incumbent.id, last)!, last, mission.capacity)).toBe('best');
  });
  it('collapses branches while preserving the selected path and expands deterministically', () => {
    const step = execution.trace.length - 1;
    const collapsed = toggleBranch(new Set(), 0);
    expect(visibleTree(model, step, collapsed, 0).ids).toEqual([0]);
    expect(visibleTree(model, step, toggleBranch(collapsed, 0), null).ids).toEqual(visibleTree(model, step, new Set(), null).ids);
    const best = incumbentAt(model, step)!;
    const path = visibleTree(model, step, collapsed, best.id).ids;
    expect(path).toContain(best.id); expect(path).toContain(0);
    const layout = layoutTree(model, path);
    expect(layout.positions.map(p => p.id).sort()).toEqual([...path].sort());
  });
  it('handles empty and large traces with bounded rendering and connected paths', () => {
    const empty = indexTrace({ ...execution, trace: [] }); expect(visibleTree(empty, 0, new Set(), null).ids).toEqual([]); expect(layoutTree(empty, []).positions).toEqual([]);
    const root = execution.trace[0];
    const trace: TraceEvent[] = [root, ...Array.from({ length: 20000 }, (_, i) => ({ ...root, node: { ...root.node, id: i + 1, parentId: 0, depth: 1 } }))];
    const large = indexTrace({ ...execution, trace });
    const view = visibleTree(large, trace.length - 1, new Set(), 20000);
    expect(view.ids.length).toBeLessThanOrEqual(60); expect(view.ids).toContain(20000); expect(view.omitted).toBe(20001 - view.ids.length);
    expect(layoutTree(large, view.ids).positions).toHaveLength(view.ids.length);
  });
  it('provides keyboard targets without creating unseen node identities', () => {
    expect(treeKeyTarget([0, 2, 5], 2, 'ArrowDown')).toBe(5);
    expect(treeKeyTarget([0, 2, 5], 5, 'ArrowRight')).toBe(5);
    expect(treeKeyTarget([0, 2, 5], 2, 'Home')).toBe(0);
    expect(treeKeyTarget([0, 2, 5], 2, 'End')).toBe(5);
    expect(treeKeyTarget([], 0, 'Home')).toBeNull();
  });
  it.each(['cancelled', 'node-limit', 'trace-limit'] as const)('maps %s execution without fabricating completion', status => {
    const partial: Execution = solve(mission, status === 'cancelled' ? { shouldCancel: () => true } : status === 'node-limit' ? { nodeLimit: 2 } : { traceLimit: 8 });
    expect(partial.status).toBe(status); expect(partial.optimal).toBe(false);
    const partialIndex = indexTrace(partial);
    expect(partial.trace.some(e => e.kind === 'finished')).toBe(false);
    expect(visibleTree(partialIndex, partial.trace.length - 1, new Set(), null).ids.length).toBeGreaterThan(0);
  });
});
describe('contextual explanations and bound calculation snapshots', () => {
  it('explains every event using its recorded values and only proves optimality on finished', () => {
    execution.trace.forEach((event, step) => {
      const parent = event.node.parentId === null ? null : nodeAt(model, event.node.parentId, step);
      const explanation = explain(event, parent, mission.capacity, mission.supplies);
      expect(explanation.title.length).toBeGreaterThan(0); expect(explanation.text.length).toBeGreaterThan(0);
      expect(explanation.title === 'Optimality is proven').toBe(event.kind === 'finished');
      if (event.kind === 'incumbent') expect(explanation.text).toContain('optimality is not proven');
      if (event.kind === 'pruned' && event.node.pruneReason === 'Over capacity') expect(explanation.text).toContain('infeasible');
      if (event.kind === 'pruned' && event.node.pruneReason === 'Upper bound cannot improve the best known kit') expect(explanation.text).toContain(String(event.node.incumbent));
    });
  });
  it('records the real fractional arithmetic independently of rendering', () => {
    const b = execution.trace[0].node.boundCalculation!;
    expect(b.basePriority).toBe(0); expect(b.wholePriority).toBe(30); expect(b.fractionWeight).toBe(9); expect(b.fractionItemWeight).toBe(10); expect(b.fractionItemPriority).toBe(40);
    expect(Number(b.exactNumerator) / Number(b.exactDenominator)).toBe(66);
    for (const event of execution.trace) {
      const bound = event.node.boundCalculation;
      if (event.node.weight > mission.capacity) expect(bound).toBeNull();
      else { expect(bound).not.toBeNull(); expect(Number(bound!.exactNumerator) / Number(bound!.exactDenominator)).toBe(event.node.upperBound); }
    }
  });
});
