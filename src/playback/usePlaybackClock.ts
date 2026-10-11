import { useEffect, useState } from 'react';
import { playbackDelay, tick, type Playback } from './state';
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}
export function usePlaybackClock(state: Playback, change: (state: Playback) => void, speed: number, reduced: boolean) {
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setTimeout(() => change(tick(state)), playbackDelay(speed, reduced));
    return () => window.clearTimeout(timer);
  }, [state, change, speed, reduced]);
}
