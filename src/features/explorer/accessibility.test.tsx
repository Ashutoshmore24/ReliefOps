import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { solve } from '../../algorithm/solver';
import { presets } from '../../domain/mission';
import { SearchTree } from './SearchTree';
import { indexTrace, visibleTree } from './traceModel';
import { AlgorithmExplorer } from './AlgorithmExplorer';
import { loadExecution, seek } from '../../playback/state';
describe('accessible explorer presentation', () => {
  afterEach(() => vi.unstubAllGlobals());
  const execution = solve(presets['Flood relief']), model = indexTrace(execution);
  it('exposes keyboard tree semantics, explicit edge labels and node selection', () => {
    const step = execution.trace.length - 1, view = visibleTree(model, step, new Set(), 0);
    const html = renderToStaticMarkup(<SearchTree model={model} view={view} step={step} selected={0} capacity={15} supplies={presets['Flood relief'].supplies} collapsed={new Set()} select={() => {}} toggle={() => {}}/>);
    expect(html).toContain('role="tree"'); expect(html).toContain('role="treeitem"'); expect(html).toContain('aria-selected="true"'); expect(html).toContain('aria-level="1"');
    expect(html).toContain('Include</text>'); expect(html).toContain('Exclude</text>'); expect(html).toContain('Collapse node 0'); expect(html).toContain('Zoom out');
  });
  it('renders an empty-trace state and reduced-motion explanation without autoplay', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const empty = renderToStaticMarkup(<AlgorithmExplorer playback={loadExecution({ ...execution, trace: [] })} change={() => {}} capacity={15} supplies={presets['Flood relief'].supplies}/>);
    expect(empty).toContain('No recorded events');
    const html = renderToStaticMarkup(<AlgorithmExplorer playback={loadExecution(execution)} change={() => {}} capacity={15} supplies={presets['Flood relief'].supplies}/>);
    expect(html).toContain('Reduced motion enabled'); expect(html).toContain('Playback speed'); expect(html).toContain('Trace position'); expect(html).toContain('Text trace'); expect(html).toContain('What'.toUpperCase() + ' IS HAPPENING?');
    expect(html).not.toContain('>Pause</');
  });
  it('keeps the incomplete-search warning visible at the final recorded step', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const partial = solve(presets['Flood relief'], { nodeLimit: 2 });
    const html = renderToStaticMarkup(<AlgorithmExplorer playback={seek(loadExecution(partial), partial.trace.length - 1)} change={() => {}} capacity={15} supplies={presets['Flood relief'].supplies}/>);
    expect(html).toContain('Incomplete execution'); expect(html).toContain('Search stopped: node-limit'); expect(html).toContain('proof incomplete'); expect(html).not.toContain('Optimality is proven');
  });
});
