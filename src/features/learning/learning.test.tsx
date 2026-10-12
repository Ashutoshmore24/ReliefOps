import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { lessons, learningTargets } from './lessons';
import { workedExample } from './workedExample';
import { LearningPanel } from './LearningPanel';
import { solve } from '../../algorithm/solver';
import { presets } from '../../domain/mission';
describe('beginner learning content', () => {
  it('covers all nine concepts with accurate simple and advanced explanations', () => {
    expect(lessons.map(l => l.id)).toEqual(['problem', 'decision', 'branching', 'bounding', 'pruning', 'incumbent', 'proof', 'greedy', 'complexity']);
    expect(lessons.find(l => l.id === 'bounding')!.simple).toContain('cannot do worse');
    expect(lessons.find(l => l.id === 'pruning')!.technical).toContain('exact bound');
    expect(lessons.find(l => l.id === 'incumbent')!.simple).toContain('does not yet prove');
    expect(lessons.find(l => l.id === 'proof')!.simple).toContain('stops this process early');
    expect(lessons.find(l => l.id === 'complexity')!.simple).toContain('exponential');
  });
  it('connects lessons only to actual recorded events', () => {
    const execution = solve(presets['Flood relief']), targets = learningTargets(execution);
    expect(execution.trace[targets.branching!].node.decision).toBe('include');
    expect(execution.trace[targets.bounding!].node.boundCalculation).not.toBeNull();
    expect(execution.trace[targets.pruning!].kind).toBe('pruned'); expect(execution.trace[targets.incumbent!].kind).toBe('incumbent'); expect(execution.trace[targets.proof!].kind).toBe('finished');
    const partial = learningTargets(solve(presets['Flood relief'], { nodeLimit: 1 })); expect(partial.proof).toBeNull(); expect(partial.incumbent).toBeNull();
    expect(Object.values(learningTargets(null)).every(value => value === null)).toBe(true);
  });
  it('derives the worked example from the same bounded solver instead of canned answers', () => {
    expect(workedExample.execution).toEqual(solve(workedExample.mission, { nodeLimit: 100, traceLimit: 500 }));
    expect(workedExample.execution.optimal).toBe(true); expect(workedExample.execution.result.priority).toBeGreaterThan(workedExample.execution.greedy.priority);
    expect(workedExample.metrics.selected.map(item => item.id)).toEqual(['medical', 'food']);
  });
  it('renders accessible lessons, contextual links and a clearly separate prepared example', () => {
    const html = renderToStaticMarkup(<LearningPanel execution={workedExample.execution} explore={() => {}} loadExample={() => {}}/>);
    expect(html).toContain('Technical details'); expect(html).toContain('Show in my search'); expect(html).toContain('SEPARATE FROM YOUR MISSION'); expect(html).toContain('Feasible ≠ proven optimal'); expect(html).toContain('Undo last edit');
    expect(html).toContain('aria-labelledby="learning-heading"'); expect(html).toContain('<summary>'); expect(html).toContain('scope="col"');
  });
  it('explains unavailable proof links for incomplete and cancelled runs', () => {
    const execution = solve(presets['Flood relief'], { shouldCancel: () => true });
    const html = renderToStaticMarkup(<LearningPanel execution={execution} explore={() => {}} loadExample={() => {}}/>);
    expect(html).toContain('This execution has no optimality-proof event');
    const initial = renderToStaticMarkup(<LearningPanel execution={null} explore={() => {}} loadExample={() => {}}/>);
    expect(initial).toContain('Run an optimization'); expect(initial).toContain('href="#feedback-heading"');
  });
});

describe('interactive snake-path learning journey', () => {
  const execution = solve(presets['Flood relief']);

  it('renders all nine numbered milestones and the winding snake canvas', () => {
    const html = renderToStaticMarkup(<LearningPanel execution={execution} explore={() => {}} loadExample={() => {}}/>);
    for (let i = 1; i <= 9; i++) {
      const num = String(i).padStart(2, '0');
      expect(html).toContain(`>${num}<`);
    }
    expect(html).toContain('SEARCH PROGRESSION ROADMAP');
    expect(html).toContain('Algorithm Learning Progress');
    expect(html).toContain('snake-svg-track');
    expect(html).toContain('role="tablist"');
  });

  it('exposes accessible tab and tabpanel attributes for keyboard navigation', () => {
    const html = renderToStaticMarkup(<LearningPanel execution={execution} explore={() => {}} loadExample={() => {}}/>);
    expect(html).toContain('aria-controls="lesson-panel-0"');
    expect(html).toContain('id="lesson-panel-0"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-selected="true"');
  });

  it('provides step navigation and explicit completion actions', () => {
    const html = renderToStaticMarkup(<LearningPanel execution={execution} explore={() => {}} loadExample={() => {}}/>);
    expect(html).toContain('Mark as completed');
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
    expect(html).toContain('Milestone 1 of 9');
  });
});
