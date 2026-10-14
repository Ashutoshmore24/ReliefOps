import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import type { Mission } from '../../domain/mission';
import type { Execution } from '../../algorithm/solver';
import { indexTrace } from '../explorer/traceModel';
import { getCategoryVisual } from '../simulation/simulationModel';
import { useReducedMotion } from '../../playback/usePlaybackClock';
import { deriveSceneState, type SceneState } from './sceneModel';

const ReliefScene = lazy(() => import('./ReliefScene'));

export function SceneFallback({ state, mission }: { state: SceneState; mission: Mission }) {
  return <div className="lab-fallback"><p>2D warehouse · All trace controls and explanations remain available.</p>{(['trial', 'best'] as const).map(key => <div className="lab-kit" key={key}><h3>{key === 'trial' ? 'Current trial' : 'Best so far'}</h3><p>{state[key].weight} / {mission.capacity} kg · Priority {state[key].priority}</p><p>{mission.supplies.filter(s => state[key].selectedIds.includes(s.id)).map(s => s.name).join(', ') || 'Empty kit'}</p></div>)}</div>;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <><p role="status">3D rendering is unavailable. Showing the historical 2D warehouse.</p>{this.props.fallback}</> : this.props.children; }
}

export function DecisionLab3D({ execution, mission, index, inspectedId, playing, speed = 1, transport }: { execution: Execution; mission: Mission; index: number; inspectedId?: number | null; playing: boolean; speed?: number; transport?: ReactNode }) {
  const model = useMemo(() => indexTrace(execution), [execution]);
  const state = useMemo(() => deriveSceneState(execution, mission, index, inspectedId, model), [execution, mission, index, inspectedId, model]);
  const [view, setView] = useState<'2d' | '3d'>('3d');
  const [selected, setSelected] = useState<string | null>(null);
  const [orbit, setOrbit] = useState(false), [spotlight, setSpotlight] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);
  const reduced = useReducedMotion();
  const item = mission.supplies.find(s => s.id === selected);
  const fallback = <SceneFallback state={state} mission={mission}/>;
  return <div className="decision-lab">
    <div className="section-heading"><div><p className="eyebrow">HISTORICAL SEARCH · SHARED PLAYBACK</p><h3>3D Decision Lab</h3></div><div className="lab-actions"><button aria-pressed={view === '2d'} onClick={() => setView('2d')}>2D</button><button aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button><button aria-pressed={orbit} onClick={() => setOrbit(!orbit)}>Orbit camera</button><button onClick={() => setCameraKey(k => k + 1)}>Reset camera</button><button aria-pressed={spotlight} onClick={() => setSpotlight(!spotlight)}>Decision spotlight</button></div></div>
    <p className="muted">Hypothetical alternatives in a relief warehouse. Crate sizes are illustrative; the solver optimizes priority subject to weight capacity.</p>
    <div className="lab-layout"><div>{view === '2d' ? fallback : <SceneBoundary key={execution.trace.length} fallback={fallback}><Suspense fallback={<div className="lab-loading" role="status">Loading the 3D warehouse…</div>}><ReliefScene state={state} mission={mission} reduced={reduced} playing={playing} speed={speed} orbit={orbit} spotlight={spotlight} cameraKey={cameraKey} select={setSelected} selectedId={selected} fallback={fallback}/></Suspense></SceneBoundary>}
      {transport && <div className="lab-transport" role="group" aria-label="Warehouse playback">{transport}</div>}
      <div className="lab-supply-strip" aria-label="Visible supply identities">{mission.supplies.slice(0, 6).map((s, i) => { const visual = getCategoryVisual(s.category, s.name), Icon = visual.icon; return <button key={s.id} aria-pressed={selected === s.id} onClick={() => setSelected(s.id)}><span style={{ color: visual.accent }}><Icon size={15}/>{i + 1}</span><strong>{s.name}</strong><small>{state.trial.selectedIds.includes(s.id) ? 'In trial' : 'Staging'}</small></button>; })}</div>
      <div className="lab-telemetry"><div className={state.overloaded ? 'lab-overload' : ''}><strong>Current trial · Node #{state.node?.id ?? '—'}</strong><span>{state.trial.weight} / {mission.capacity} kg · Priority {state.trial.priority}</span>{state.overloaded && <b>Over capacity — {state.rejected ? 'rejected' : 'infeasible trial'}</b>}</div><div className={state.improved ? 'lab-improved' : ''}><strong>Best so far{state.improved ? ' · improved' : ''}</strong><span>{state.best.weight} / {mission.capacity} kg · Priority {state.best.priority}</span></div></div>
    </div><aside className="lab-explanation"><p className="eyebrow">EVENT {state.index + 1} · {state.event?.kind} · {state.transition === 'reconcile' ? 'SET RECONCILIATION' : 'DECISION PREVIEW'}</p><h3>{state.title}</h3><p>{state.explanation}</p><details><summary>Bound calculation for current trial</summary><p>{state.bound}</p><p>Fractions estimate the bound only. Every selected supply remains whole.</p></details><p>Trial: {mission.supplies.filter(s => state.trial.selectedIds.includes(s.id)).map(s => s.name).join(', ') || 'empty'}.</p><p>Best so far: {mission.supplies.filter(s => state.best.selectedIds.includes(s.id)).map(s => s.name).join(', ') || 'empty'}.</p>{item && <p role="status"><strong>{item.name}</strong> · {item.category} · {item.weight} kg · Priority {item.priority}</p>}</aside></div>
    <details className="lab-inventory"><summary>Supply staging · {mission.supplies.length} supplies · select for details</summary><div>{mission.supplies.map(s => { const visual = getCategoryVisual(s.category, s.name), Icon = visual.icon; return <button key={s.id} aria-pressed={selected === s.id} onClick={() => setSelected(s.id)}><Icon size={16} color={visual.accent}/>{s.name}<small>{s.weight} kg · {s.priority} priority · {state.trial.selectedIds.includes(s.id) ? 'In trial' : 'Outside trial'}</small></button>; })}</div></details>
    <p className="muted">Use the explorer controls above to play, pause, step, restart, or seek. Search tree selection also updates this trial. Final strategy comparison remains in the results dashboard.</p>
  </div>;
}
