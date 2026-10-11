import type { Execution } from '../algorithm/solver';
export interface Playback { execution: Execution | null; index: number; playing: boolean }
export const emptyPlayback: Playback = { execution: null, index: 0, playing: false };
export function loadExecution(execution: Execution): Playback { return { execution, index: 0, playing: false }; }
export function navigate(state: Playback, offset: number): Playback {
  return seek(state, state.index + offset);
}
export function seek(state: Playback, index: number): Playback { return { ...state, index: Math.max(0, Math.min(Math.max(0, (state.execution?.trace.length ?? 0) - 1), Math.trunc(index))), playing: false }; }
export function play(state: Playback): Playback {
  const length = state.execution?.trace.length ?? 0;
  return { ...state, index: state.index >= length - 1 ? 0 : state.index, playing: length > 1 };
}
export function pause(state: Playback): Playback { return { ...state, playing: false }; }
export function restart(state: Playback): Playback { return { ...state, index: 0, playing: false }; }
export function tick(state: Playback): Playback {
  if (!state.playing || !state.execution?.trace.length) return pause(state);
  const last = state.execution.trace.length - 1, index = Math.min(last, state.index + 1);
  return { ...state, index, playing: index < last };
}
export function playbackDelay(speed: number, reducedMotion: boolean): number { return Math.max(reducedMotion ? 1000 : 150, 1200 / speed); }
// A late timer from an obsolete execution must never resurrect cleared results.
export function acceptPlayback(current: Playback, next: Playback): Playback { return current.execution === next.execution ? next : current; }
