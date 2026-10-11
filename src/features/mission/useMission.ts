import { useCallback, useEffect, useRef, useState } from 'react';
import { editDraft, presetDraft, type Draft, type Edit } from '../../domain/editor';
import { acceptPlayback, emptyPlayback, loadExecution, type Playback } from '../../playback/state';
import { RunController } from '../../worker/controller';
import type { Limits } from '../../worker/protocol';
import type { Mission } from '../../domain/mission';
import type { Progress } from '../../algorithm/solver';
export function useMission() {
  const [draft, setDraft] = useState(() => presetDraft('Flood relief'));
  const [undo, setUndo] = useState<Draft | null>(null);
  const [playback, setPlayback] = useState<Playback>(emptyPlayback);
  const [status, setStatus] = useState<'idle' | 'running' | 'cancelling' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<Progress | null>(null);
  const controller = useRef<RunController | null>(null);
  const updatePlayback = useCallback((next: Playback) => setPlayback(current => acceptPlayback(current, next)), []);
  useEffect(() => {
    controller.current = new RunController(() => new Worker(new URL('../../worker/optimizer.worker.ts', import.meta.url), { type: 'module' }), response => {
      if (response.type === 'progress') setProgress(response.progress);
      else if (response.type === 'error') { setError(response.message); setStatus('error'); }
      else { setPlayback(loadExecution(response.execution)); setStatus('done'); }
    });
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);
  const invalidate = () => { controller.current?.invalidate(); setPlayback(emptyPlayback); setProgress(null); setStatus('idle'); setError(''); };
  const replace = (next: Draft) => { invalidate(); setUndo(draft); setDraft(next); };
  return { draft, playback, setPlayback: updatePlayback, status, error, progress, undo,
    edit: (action: Edit) => replace(editDraft(draft, action)),
    preset: (name: string) => replace(presetDraft(name)),
    restore: () => { if (undo) { invalidate(); setDraft(undo); setUndo(null); } },
    start: (mission: Mission, limits: Limits) => { setPlayback(emptyPlayback); setProgress(null); setError(''); setStatus('running'); controller.current?.start(mission, limits); },
    cancel: () => { setStatus('cancelling'); controller.current?.cancel(); },
    invalidate,
  };
}
