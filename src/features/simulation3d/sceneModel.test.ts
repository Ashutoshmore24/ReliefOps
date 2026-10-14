import { describe, expect, it } from 'vitest';
import { solve } from '../../algorithm/solver';
import { presets, type Mission } from '../../domain/mission';
import { deriveSceneState } from './sceneModel';
import { indexTrace } from '../explorer/traceModel';
import { SceneFallback } from './DecisionLab3D';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('historical decision scene', () => {
  const mission = presets['Flood relief'], execution = solve(mission);
  it('matches every selected trace node and reveals only historical incumbents', () => {
    let best = { selectedIds: [] as string[], weight: 0, priority: 0 };
    execution.trace.forEach((event, index) => {
      if (event.kind === 'incumbent') best = { selectedIds: event.node.selectedIds, weight: event.node.weight, priority: event.node.priority };
      const scene = deriveSceneState(execution, mission, index);
      expect(scene.trial.selectedIds).toEqual(event.node.selectedIds);
      expect(scene.best).toEqual(best);
      expect(scene.provenOptimal).toBe(index === execution.trace.length - 1);
    });
    expect(deriveSceneState(execution, mission, 0).best.priority).toBe(0);
  });
  it('gives identical states when seeking backward, forward or sequentially', () => {
    const sequential = execution.trace.map((_, index) => deriveSceneState(execution, mission, index));
    const indexed = indexTrace(execution);
    [...sequential.keys()].reverse().forEach(index => expect(deriveSceneState(execution, mission, index, null, indexed)).toEqual(sequential[index]));
    [0, 5, 2, execution.trace.length - 1, 0, 8].forEach(index => expect(deriveSceneState(execution, mission, index)).toEqual(sequential[index]));
  });
  it('explains overweight and bound prunes, created previews and unrelated jumps', () => {
    const scenes = execution.trace.map((_, index) => deriveSceneState(execution, mission, index));
    const heavy = scenes.find(s => s.rejected && s.overloaded)!;
    expect(heavy.explanation).toContain('exceeding');
    const bounded = scenes.find(s => s.node?.pruneReason?.startsWith('Upper bound'))!;
    expect(bounded.explanation).toContain('cannot exceed');
    expect(scenes.find(s => s.event?.kind === 'created')?.explanation).toContain('created does not mean inspected');
    expect(scenes.find(s => s.transition === 'reconcile')?.explanation).toContain('unrelated branches');
  });
  it('supports inspecting already revealed nodes without changing incumbent history', () => {
    const last = execution.trace.length - 1;
    expect(deriveSceneState(execution, mission, last, 0).trial.selectedIds).toEqual([]);
    expect(deriveSceneState(execution, mission, last, 0).best).toEqual(execution.result);
    expect(deriveSceneState(execution, mission, 0, 999).node?.id).toBe(0);
  });
  it('never proves optimality on partial executions', () => {
    for (const options of [{ nodeLimit: 2 }, { traceLimit: 2 }, { shouldCancel: () => true }]) {
      const partial = solve(mission, options);
      partial.trace.forEach((_, i) => expect(deriveSceneState(partial, mission, i).provenOptimal).toBe(false));
      const last = deriveSceneState(partial, mission, partial.trace.length - 1);
      expect(last.explanation).toContain('Optimality is not proven');
      expect(last.explanation).toContain(partial.status);
    }
  });
  it('handles empty missions, no trace, arbitrary IDs and duplicate names', () => {
    const empty: Mission = { capacity: 0, supplies: [] };
    const solved = solve(empty);
    expect(deriveSceneState(solved, empty, Infinity).trial.selectedIds).toEqual([]);
    expect(deriveSceneState({ ...solved, trace: [] }, empty, 0).provenOptimal).toBe(false);
    const custom: Mission = { capacity: 2, supplies: [{ id: '__proto__', name: 'Supply', category: 'Custom', weight: 1, priority: 2 }, { id: 'a/b 🍊', name: 'Supply', category: 'Other', weight: 1, priority: 3 }] };
    const result = solve(custom), scene = deriveSceneState(result, custom, result.trace.length - 1);
    expect(new Set(scene.best.selectedIds)).toEqual(new Set(custom.supplies.map(s => s.id)));
    const html = renderToStaticMarkup(createElement(SceneFallback, { state: scene, mission: custom }));
    expect(html).toContain('Current trial'); expect(html).toContain('Best so far'); expect(html).toContain('Priority 5');
  });
  it('derives Flood comparison from solver output without leaking it into the beginning', () => {
    expect(execution.greedy).toEqual({ selectedIds: ['water', 'food'], weight: 11, priority: 50 });
    expect(execution.result).toEqual({ selectedIds: ['medical', 'food'], weight: 15, priority: 60 });
    const final = deriveSceneState(execution, mission, execution.trace.length - 1);
    expect(final.best).toEqual(execution.result);
    expect(deriveSceneState(execution, mission, -20).best.selectedIds).toEqual([]);
    expect(deriveSceneState(execution, mission, 1e6)).toEqual(final);
  });
});
