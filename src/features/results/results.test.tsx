import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { solve } from '../../algorithm/solver';
import { presets } from '../../domain/mission';
import { deriveResults, compareStrategies, resultStatus } from './resultModel';
import { ResultsSummary } from './ResultsSummary';
import { ResultFeedback } from './ResultFeedback';
import { StrategyComparison } from './StrategyComparison';
import { acceptPlayback, emptyPlayback, loadExecution, seek } from '../../playback/state';
const mission = presets['Flood relief'];
describe('real results metrics', () => {
  it('derives kit metrics, frontier statistics and explorer links from the actual execution', () => {
    const execution = solve(mission), result = deriveResults(execution, mission);
    expect(result.capacity).toBe(15); expect(result.remaining).toBe(0); expect(result.utilization).toBe(100); expect(result.selectedCount).toBe(2);
    expect(result.selected.map(item => item.id)).toEqual(['medical', 'food']); expect(result.excluded.map(item => item.id)).toEqual(['water']);
    expect(result.peakFrontier).toBe(4); expect(result.remainingFrontier).toBe(0);
    expect(result.overweightPrunes + result.boundPrunes).toBe(execution.prunedNodes);
    expect(execution.trace[result.links.bestKit!].node.selectedIds).toEqual(execution.result.selectedIds);
    expect(execution.trace[result.links.firstPrune!].kind).toBe('pruned'); expect(execution.trace[result.links.proof!].kind).toBe('finished');
    expect(seek(loadExecution(execution), result.links.firstPrune!).playing).toBe(false);
  });
  it('handles decimal remaining capacity without floating-point noise', () => {
    const decimal = { capacity: .3, supplies: [{ id: 'a', name: 'A', category: 'Relief', weight: .1, priority: 1 }] };
    const result = deriveResults(solve(decimal), decimal); expect(result.remaining).toBe(.2); expect(result.utilization).toBeCloseTo(100 / 3);
  });
  it('handles zero capacity, empty missions and all supplies overweight', () => {
    const zero = { capacity: 0, supplies: mission.supplies }, empty = { capacity: 10, supplies: [] }, overweight = { capacity: 1, supplies: mission.supplies };
    for (const input of [zero, empty, overweight]) {
      const execution = solve(input), result = deriveResults(execution, input);
      expect(execution.optimal).toBe(true); expect(result.selectedCount).toBe(0); expect(result.utilization).toBe(0); expect(result.remaining).toBe(input.capacity);
      expect(resultStatus(execution).label).toBe('Proven optimal');
    }
  });
  it('distinguishes duplicate display names through item IDs and inventory numbers', () => {
    const input = { capacity: 1, supplies: ['a', 'b'].map(id => ({ id, name: 'Water', category: 'Hydration', weight: 1, priority: 5 })) };
    const execution = solve(input), result = deriveResults(execution, input);
    expect(result.selected.map(i => i.id)).toEqual(['a']); expect(result.excluded.map(i => i.id)).toEqual(['b']);
    expect(result.selected[0].inventoryNumber).toBe(1); expect(result.excluded[0].inventoryNumber).toBe(2);
    const html = renderToStaticMarkup(<ResultsSummary execution={execution} mission={input}/>);
    expect(html).toContain('Supply 1'); expect(html).toContain('Supply 2'); expect(html).toContain('Excluded supplies · 1');
  });
  it('does not reintroduce stale metrics after mission invalidation', () => {
    const previous = seek(loadExecution(solve(mission)), 10);
    const cleared = acceptPlayback(emptyPlayback, previous);
    expect(cleared.execution).toBeNull();
    const html = renderToStaticMarkup(<ResultFeedback state="idle" error=""/>);
    expect(html).toContain('No metrics are shown'); expect(html).not.toContain('Capacity utilization');
  });
});
describe('strategy comparison and solution status', () => {
  it('shows actual priority improvement and weights for a greedy counterexample', () => {
    const execution = solve(mission), comparison = compareStrategies(execution);
    expect(comparison.difference).toBe(10); expect(comparison.percentage).toBe(20);
    const html = renderToStaticMarkup(<StrategyComparison execution={execution}/>);
    expect(html).toContain('Proven improvement: +10 priority points (20.0% above greedy)');
    expect(html).toContain('15 kg'); expect(html).toContain('11 kg'); expect(html).toContain('role="img"'); expect(html).toContain('<caption>');
  });
  it('labels equal completed results accurately', () => {
    const execution = solve(presets['Medical emergency']); expect(compareStrategies(execution).equal).toBe(true);
    expect(renderToStaticMarkup(<StrategyComparison execution={execution}/>)).toContain('matches the proven optimum');
    expect(renderToStaticMarkup(<StrategyComparison execution={execution}/>)).toContain('No priority difference: 0 points (0.0%)');
  });
  it('does not claim improvement or optimality when an incomplete kit trails greedy', () => {
    const execution = solve(mission, { nodeLimit: 2 }), comparison = compareStrategies(execution);
    expect(comparison.difference).toBe(-20); expect(comparison.percentage).toBe(-40);
    const html = renderToStaticMarkup(<ResultsSummary execution={execution} mission={mission}/>);
    expect(html).toContain('Feasible · search incomplete'); expect(html).toContain('20 priority points below greedy'); expect(html).not.toContain('Proven improvement');
    expect(deriveResults(execution, mission).links.proof).toBeNull();
  });
  it('reports zero greedy baseline without division by zero or false percentages', () => {
    const input = { capacity: 0, supplies: [] }, execution = solve(input);
    expect(compareStrategies(execution).percentage).toBeNull();
    const html = renderToStaticMarkup(<StrategyComparison execution={execution}/>);
    expect(html).toContain('Percentage change is undefined'); expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
  });
  it('labels equal incomplete zero kits without a proof', () => {
    const input = { capacity: 0, supplies: [] }, execution = solve(input, { traceLimit: 1 });
    expect(renderToStaticMarkup(<StrategyComparison execution={execution}/>)).toContain('does not prove either is optimal');
  });
  it('labels cancellation separately and preserves a feasible kit', () => {
    const execution = solve(mission, { shouldCancel: () => true });
    expect(resultStatus(execution).label).toContain('Cancelled');
    expect(renderToStaticMarkup(<ResultsSummary execution={execution} mission={mission}/>)).toContain('Optimality is not proven');
  });
  it('renders failed, loading and cancelling states without result metrics', () => {
    const failed = renderToStaticMarkup(<ResultFeedback state="error" error="Worker unavailable"/>);
    expect(failed).toContain('Optimization failed'); expect(failed).toContain('Worker unavailable'); expect(failed).not.toContain('Proven optimal');
    expect(renderToStaticMarkup(<ResultFeedback state="running" error=""/>)).toContain('Searching for your relief kit');
    expect(renderToStaticMarkup(<ResultFeedback state="cancelling" error=""/>)).toContain('batch boundary');
  });
  it('offers accessible paths into recorded proof and pruning events', () => {
    const execution = solve(mission), html = renderToStaticMarkup(<ResultsSummary execution={execution} mission={mission} explore={() => {}}/>);
    expect(html).toContain('See the optimality proof'); expect(html).toContain('Explain a real pruning decision'); expect(html).toContain('aria-label="Capacity utilization"'); expect(html).toContain('tabindex="-1"'); expect(html).toContain('scope="row"');
  });
});
