import { describe, expect, it } from 'vitest';
import { acceptPlayback, emptyPlayback, loadExecution, navigate, pause, play, playbackDelay, restart, seek, tick } from './state';
import { solve } from '../algorithm/solver';
import { presets } from '../domain/mission';
const execution = solve(presets['Flood relief']);
describe('real trace playback', () => {
  it('supports next, previous and progress seeking with bounds', () => {
    const loaded = loadExecution(execution);
    expect(navigate(loaded, 1).index).toBe(1); expect(navigate(loaded, -1).index).toBe(0);
    expect(seek(loaded, 10000).index).toBe(execution.trace.length - 1);
    expect(seek(loaded, 5).execution?.trace[5]).toBe(execution.trace[5]);
  });
  it('plays, pauses, ends and replays without adding events', () => {
    let state = play(loadExecution(execution)); expect(state.playing).toBe(true);
    const paused = pause(state); expect(tick(paused)).toEqual(paused);
    for (let i = 0; i < execution.trace.length; i++) state = tick(state);
    expect(state.index).toBe(execution.trace.length - 1); expect(state.playing).toBe(false);
    expect(play(state).index).toBe(0); expect(play(state).playing).toBe(true);
    expect(restart(play(state))).toEqual(loadExecution(execution));
  });
  it('stops on selection/navigation and rejects late updates from changed executions', () => {
    const running = play(loadExecution(execution)); expect(navigate(running, 1).playing).toBe(false);
    expect(acceptPlayback(emptyPlayback, tick(running))).toBe(emptyPlayback);
    const replacement = loadExecution(solve(presets['Earthquake response']));
    expect(replacement.playing).toBe(false); expect(acceptPlayback(replacement, tick(running))).toBe(replacement);
  });
  it('handles empty, single-event and incomplete traces safely', () => {
    expect(play(emptyPlayback).playing).toBe(false); expect(tick(emptyPlayback)).toEqual(emptyPlayback);
    expect(navigate(loadExecution({ ...execution, trace: [] }), 1).index).toBe(0);
    const incomplete = solve(presets['Flood relief'], { nodeLimit: 1 });
    let state = play(loadExecution(incomplete)); while (state.playing) state = tick(state);
    expect(state.execution?.optimal).toBe(false); expect(state.index).toBe(incomplete.trace.length - 1);
    expect(play(loadExecution({ ...execution, trace: execution.trace.slice(0, 1) })).playing).toBe(false);
  });
  it('respects speed and caps advancement for reduced-motion preferences', () => {
    expect(playbackDelay(2, false)).toBe(600); expect(playbackDelay(.5, false)).toBe(2400);
    expect(playbackDelay(4, true)).toBe(1000); expect(playbackDelay(.5, true)).toBe(2400);
  });
});
