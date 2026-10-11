import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { solve } from '../../algorithm/solver';
import { presets } from '../../domain/mission';
import { loadExecution } from '../../playback/state';
import { presentationStops } from './presentationModel';
import { PresentationMode } from './PresentationMode';

describe('presentation mode', () => {
  afterEach(() => vi.unstubAllGlobals());
  const mission = presets['Flood relief'], execution = solve(mission);
  const render = (result = execution, reduced = false) => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }) });
    return renderToStaticMarkup(<PresentationMode title="Flood relief" mission={mission} playback={loadExecution(result)} change={() => {}} exit={() => {}}/>);
  };
  it('anchors the five topics to real solver events in forward order', () => {
    const stops = presentationStops(execution);
    expect(stops.map(stop => stop.title)).toEqual(['The problem', 'Branching', 'Bounding', 'Pruning', 'Final result']);
    expect(stops.every(stop => stop.index !== null)).toBe(true);
    const indices = stops.map(stop => stop.index!);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(execution.trace[indices[1]].node.decision).toBe('include');
    expect(execution.trace[indices[2]].node.boundCalculation).not.toBeNull();
    expect(execution.trace[indices[3]].kind).toBe('pruned');
    expect(execution.trace[indices[4]].kind).toBe('finished');
  });
  it('derives the greedy counterexample from the existing preset execution', () => {
    const final = presentationStops(execution)[4];
    expect(execution.result.priority).toBeGreaterThan(execution.greedy.priority);
    expect(final.text).toContain(`priority ${execution.result.priority}`);
    expect(final.text).toContain(`returned ${execution.greedy.priority}`);
  });
  it.each(['cancelled', 'node-limit', 'trace-limit'] as const)('never presents %s as a proven optimum', status => {
    const result = solve(mission, status === 'cancelled' ? { shouldCancel: () => true } : status === 'node-limit' ? { nodeLimit: 1 } : { traceLimit: 1 });
    expect(result.status).toBe(status);
    expect(presentationStops(result)[4].text).toContain('optimality is not proven');
    const html = render(result);
    expect(html).not.toContain('Your optimal relief kit');
    expect(html).not.toContain('Proven optimal');
    expect(html).toContain('Best kit found so far');
  });
  it('marks absent trace targets unavailable instead of fabricating nodes', () => {
    expect(presentationStops({ ...execution, trace: [] }).every(stop => stop.index === null)).toBe(true);
    expect(render({ ...execution, trace: [] })).toContain('no recorded event for this topic');
  });
  it('reuses accessible results and explorer controls with reduced motion', () => {
    const html = render(execution, true);
    expect(html).toContain('Guided presentation topics'); expect(html).toContain('aria-current="step"');
    expect(html).toContain('Exit presentation'); expect(html).toContain('Previous topic'); expect(html).toContain('Next topic');
    expect(html).toContain('Previous step'); expect(html).toContain('Next step'); expect(html).toContain('Restart trace');
    expect(html).toContain('Reduced motion enabled'); expect(html).toContain('15 kg carrying capacity');
    expect(html).toContain('Medical kit, Food packs'); expect(html).toContain('Current step');
    expect(html.match(/id="result-heading"/g)).toHaveLength(1);
  });
});
