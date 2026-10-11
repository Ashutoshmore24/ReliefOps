import { describe, expect, it } from 'vitest';
import { fractionalBound, rankSupplies, solve } from './solver';
import { presets, units, validateMission, type Mission, type Supply } from '../domain/mission';
const supply = (id: string, weight: number, priority: number): Supply => ({ id, name: 'Supply', category: 'Relief', weight, priority });
function oracle(mission: Mission): number {
  let best = 0;
  for (let mask = 0; mask < 2 ** mission.supplies.length; mask++) {
    let mass = 0, value = 0;
    mission.supplies.forEach((item, i) => { if (mask & (1 << i)) { mass += units(item.weight); value += item.priority; } });
    if (mass <= units(mission.capacity)) best = Math.max(best, value);
  }
  return best;
}
function verify(mission: Mission) {
  const execution = solve(mission);
  expect(execution.result.priority).toBe(oracle(mission));
  const selected = mission.supplies.filter(item => execution.result.selectedIds.includes(item.id));
  expect(selected.reduce((sum, item) => sum + units(item.weight), 0)).toBe(units(execution.result.weight));
  expect(selected.reduce((sum, item) => sum + item.priority, 0)).toBe(execution.result.priority);
  expect(units(execution.result.weight)).toBeLessThanOrEqual(units(mission.capacity));
  expect(new Set(execution.result.selectedIds).size).toBe(execution.result.selectedIds.length);
  expect(execution.greedy.priority).toBeLessThanOrEqual(execution.result.priority);
  expect(execution.greedyOptimal).toBe(execution.greedy.priority === execution.result.priority);
  expect(execution.trace.filter(event => event.kind === 'active')).toHaveLength(execution.exploredNodes);
  expect(execution.trace.filter(event => event.kind === 'pruned')).toHaveLength(execution.prunedNodes);
  expect(execution.trace.filter(event => event.kind === 'created')).toHaveLength(execution.createdNodes);
  expect(execution.trace.at(-1)?.kind).toBe('finished');
  expect(solve(mission)).toEqual(execution);
  return execution;
}
describe('deterministic exact Branch and Bound', () => {
  it('handles all deterministic presets and shows a greedy counterexample', () => {
    Object.values(presets).forEach(verify);
    const result = solve(presets['Flood relief']);
    expect(result.result.priority).toBe(60);
    expect(result.greedy.priority).toBe(50);
    expect(result.greedyOptimal).toBe(false);
  });
  it.each([
    { capacity: 0, supplies: [] },
    { capacity: 0, supplies: [supply('a', 1, 8)] },
    { capacity: 1, supplies: [supply('a', 2, 8)] },
    { capacity: 3, supplies: [supply('a', 1, 8), supply('b', 2, 9)] },
    { capacity: .3, supplies: [supply('a', .1, 8), supply('b', .2, 9)] },
    { capacity: 1, supplies: [supply('a', 1, 0)] },
    { capacity: 1, supplies: [supply('a', 1, 5), supply('b', 1, 5)] },
    { capacity: 10000, supplies: [supply('a', 10000, 1000000)] },
  ])('solves edge instance %#', mission => { verify(mission); });
  it('retains the first encountered equal-value optimum and allows duplicate names', () => {
    expect(solve({ capacity: 1, supplies: [supply('a', 1, 5), supply('b', 1, 5)] }).result.selectedIds).toEqual(['a']);
  });
  it('preserves optimal value after reordering and skips oversized greedy items', () => {
    const mission = presets['Earthquake response'];
    expect(verify({ ...mission, supplies: [...mission.supplies].reverse() }).result.priority).toBe(solve(mission).result.priority);
    const execution = verify({ capacity: 2, supplies: [supply('heavy', 3, 90), supply('small', 2, 5)] });
    expect(execution.greedy.selectedIds).toEqual(['small']);
  });
  it('matches exhaustive enumeration on 500 reproducible random instances', () => {
    let seed = 173;
    const random = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
    for (let run = 0; run < 500; run++) verify({ capacity: random(150) / 100, supplies: Array.from({ length: random(10) }, (_, i) => supply(String(i), (random(70) + 1) / 100, random(30))) });
  });
  it('checks every partial-state bound against all feasible remaining completions', () => {
    const items = rankSupplies([supply('a', .3, 7), supply('b', .4, 8), supply('c', .2, 3), supply('d', .5, 4)]);
    const capacity = 80;
    for (let depth = 0; depth <= items.length; depth++) {
      for (let prefix = 0; prefix < 2 ** depth; prefix++) {
        let mass = 0, value = 0;
        for (let i = 0; i < depth; i++) if (prefix & (1 << i)) { mass += items[i].mass; value += items[i].priority; }
        if (mass > capacity) continue;
        const bound = fractionalBound(items, depth, mass, value, capacity);
        for (let suffix = 0; suffix < 2 ** (items.length - depth); suffix++) {
          let totalMass = mass, totalValue = value;
          for (let i = depth; i < items.length; i++) if (suffix & (1 << (i - depth))) { totalMass += items[i].mass; totalValue += items[i].priority; }
          if (totalMass <= capacity) expect(bound.numerator >= BigInt(totalValue) * bound.denominator).toBe(true);
        }
      }
    }
  });
  it('records real transitions and incumbent snapshots without mutating inputs', () => {
    const mission = structuredClone(presets['Earthquake response']);
    const before = structuredClone(mission), execution = verify(mission);
    expect(mission).toEqual(before);
    const nodes = new Map(execution.trace.filter(e => e.kind === 'created').map(e => [e.node.id, e.node]));
    let incumbent = 0;
    for (const event of execution.trace) {
      if (event.kind === 'incumbent') incumbent = event.node.priority;
      expect(event.node.incumbent).toBe(incumbent);
      if (event.kind === 'pruned') expect(event.node.pruneReason).toBeTruthy();
      if (event.kind === 'created' && event.node.parentId !== null) {
        const parent = nodes.get(event.node.parentId)!;
        const item = mission.supplies.find(item => item.id === event.node.itemId)!;
        expect(event.node.depth).toBe(parent.depth + 1);
        expect(units(event.node.weight)).toBe(units(parent.weight) + (event.node.decision === 'include' ? units(item.weight) : 0));
        expect(event.node.priority).toBe(parent.priority + (event.node.decision === 'include' ? item.priority : 0));
      }
    }
  });
});
describe('mission validation', () => {
  it.each([0, -1, NaN, Infinity, .001, 1e-10, 10001])('rejects invalid weight %s', weight => {
    const mission = { capacity: 10, supplies: [supply('a', weight, 1)] };
    expect(validateMission(mission).length).toBeGreaterThan(0);
    expect(() => solve(mission)).toThrow();
  });
  it.each([-1, NaN, Infinity, .001, 10001])('rejects invalid capacity %s', capacity => expect(() => solve({ capacity, supplies: [] })).toThrow());
  it.each([-1, 1.5, NaN, Infinity, 1000001])('rejects invalid priority %s', priority => expect(() => solve({ capacity: 10, supplies: [supply('a', 1, priority)] })).toThrow());
  it('rejects duplicate IDs, blank names/categories and excessive item counts', () => {
    expect(() => solve({ capacity: 10, supplies: [supply('a', 1, 1), supply('a', 1, 1)] })).toThrow();
    expect(() => solve({ capacity: 10, supplies: [{ ...supply('a', 1, 1), name: ' ' }] })).toThrow();
    expect(() => solve({ capacity: 10, supplies: [{ ...supply('a', 1, 1), category: '' }] })).toThrow();
    expect(() => solve({ capacity: 10, supplies: Array.from({ length: 101 }, (_, i) => supply(String(i), 1, 1)) })).toThrow();
  });
});
