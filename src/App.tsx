import { Activity, ArrowRight, ShieldCheck, Square, Truck } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Field } from './components/Field';
import { validateDraft } from './domain/editor';
import { MissionEditor } from './features/mission/MissionEditor';
import { useMission } from './features/mission/useMission';
import { ResultsSummary } from './features/results/ResultsSummary';
import { AlgorithmExplorer } from './features/explorer/AlgorithmExplorer';
import { LearningPanel } from './features/learning/LearningPanel';
import { ResultFeedback } from './features/results/ResultFeedback';
import { pause, seek } from './playback/state';
import { PresentationMode } from './features/presentation/PresentationMode';
export default function App() {
  const model = useMission();
  const [nodeLimit, setNodeLimit] = useState('10000'), [traceLimit, setTraceLimit] = useState('40000');
  const { mission, errors } = useMemo(() => validateDraft(model.draft), [model.draft]);
  const [explorerVisit, setExplorerVisit] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const exitPresentation = useCallback(() => {
    setPresenting(false);
    model.setPlayback(pause(model.playback));
    requestAnimationFrame(() => document.getElementById('presentation-start')?.focus());
  }, [model.playback, model.setPlayback]);
  const validLimit = (text: string) => /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) >= 1 && Number(text) <= 1000000;
  const valid = !Object.keys(errors).length && validLimit(nodeLimit) && validLimit(traceLimit);
  const running = model.status === 'running' || model.status === 'cancelling', execution = model.playback.execution;
  const changeLimit = (field: 'node' | 'trace', value: string) => { model.invalidate(); (field === 'node' ? setNodeLimit : setTraceLimit)(value); };
  const focusSection = (id: string) => requestAnimationFrame(() => { const heading = document.getElementById(id); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  const explore = (index: number) => { if (!execution) return; model.setPlayback(seek(model.playback, index)); setExplorerVisit(value => value + 1); focusSection('explorer-heading'); };
  if (presenting && execution) return <PresentationMode title={model.draft.name} mission={mission} playback={model.playback} change={model.setPlayback} exit={exitPresentation}/>;
  return <><header className="app-header"><a className="brand" href="#main"><ShieldCheck size={26}/><span>Relief<span className="orange">Ops</span><small>SMART KIT OPTIMIZER</small></span></a><span className="header-label"><Activity size={15}/> OPERATIONS LAB</span></header>
    <main id="main"><div className="hero"><div><p className="eyebrow">LIMITED CAPACITY. MAXIMUM IMPACT.</p><h1>Build a kit.<br/><span>Make every kilogram count.</span></h1><p>Explore how Branch and Bound turns limited carrying capacity into the strongest possible relief response.</p></div><div className="mission-marker"><Truck size={26}/><span>MISSION PLANNING</span><strong>Ready for deployment</strong><small>Educational simulation · 0/1 Knapsack</small></div></div>
    <section className="presentation-entry panel" aria-label="Presentation setup"><div><h2>Present the search</h2><p>Load the Flood relief demonstration, optimize it, then present its real trace. Loading the demo replaces mission inputs; Undo last edit restores them.</p></div><div className="presentation-actions"><button disabled={running} onClick={() => model.preset('Flood relief')}>Load Flood relief demo</button><button id="presentation-start" disabled={!execution} onClick={() => { model.setPlayback(seek(model.playback, 0)); setPresenting(true); window.scrollTo(0, 0); }}>Enter presentation</button></div></section>
    <div className="workspace"><MissionEditor draft={model.draft} errors={errors} edit={model.edit} preset={model.preset} undo={Boolean(model.undo)} restore={model.restore}/><aside className="right-column">
      <section className="panel run-panel" aria-labelledby="run-heading"><p className="eyebrow">OPTIMIZATION CONTROL</p><h2 id="run-heading">Find your best kit</h2><p className="muted">Each supply is taken whole or left behind. The goal is the highest total priority within your limit.</p><div className="run-summary"><span>Carrying capacity</span><strong>{Number.isFinite(mission.capacity) ? mission.capacity : '—'} kg</strong><span>Available supplies</span><strong>{mission.supplies.length}</strong></div>
      <details className="limit-settings"><summary>Search resource limits</summary><p>Limits protect your browser. Reaching a limit returns an incomplete result, never a claimed optimum. Maximum configurable budget: 1,000,000 each.</p><Field id="node-limit" label="Maximum inspected nodes" type="number" min="1" max="1000000" step="1" value={nodeLimit} error={validLimit(nodeLimit) ? undefined : 'Enter an integer from 1 to 1,000,000.'} onChange={e => changeLimit('node', e.target.value)}/><Field id="trace-limit" label="Maximum trace events" type="number" min="1" max="1000000" step="1" value={traceLimit} error={validLimit(traceLimit) ? undefined : 'Enter an integer from 1 to 1,000,000.'} onChange={e => changeLimit('trace', e.target.value)}/></details>
      <button className="primary optimize" disabled={!valid || running} onClick={() => model.start(mission, { nodeLimit: Number(nodeLimit), traceLimit: Number(traceLimit) })}>{running ? <><Activity size={18}/> {model.status === 'cancelling' ? 'Stopping search…' : 'Optimizing kit…'}</> : <>Optimize kit <ArrowRight size={18}/></>}</button>{running && <button className="cancel" disabled={model.status === 'cancelling'} onClick={model.cancel}><Square size={14}/> Cancel search</button>}
      <div className="run-feedback" role="status">{!valid ? 'Resolve the marked fields before optimizing.' : running ? `${model.progress?.exploredNodes ?? 0} nodes inspected. You can keep editing; an edit stops this run.` : execution ? execution.optimal ? 'Search complete. Optimality proven.' : `Search stopped: ${execution.status}. Optimality not proven.` : 'Mission ready. Run the optimizer when your inventory is set.'}</div>{model.error && <p className="error-banner" role="alert">{model.error}</p>}</section>
      <section className="panel learning-card"><span className="tag">HOW IT WORKS</span><h2>A decision for every supply</h2><ol><li><strong>Branch</strong><p>Try including a supply, then excluding it.</p></li><li><strong>Bound</strong><p>Estimate how much priority a branch could reach.</p></li><li><strong>Prune</strong><p>Stop branches that are too heavy or cannot improve the best kit.</p></li></ol><a className="section-link" href="#learning">Open beginner learning mode <ArrowRight size={14}/></a></section>
    </aside></div>{execution ? <ResultsSummary execution={execution} mission={mission} explore={explore}/> : <ResultFeedback state={model.status === 'done' ? 'idle' : model.status} error={model.error}/>}{execution && <AlgorithmExplorer playback={model.playback} change={model.setPlayback} supplies={mission.supplies} capacity={mission.capacity} visit={explorerVisit} returnToResults={() => focusSection('result-heading')}/>}<LearningPanel execution={execution} explore={explore} loadExample={() => { model.preset('Flood relief'); focusSection('setup-heading'); }}/><footer>ReliefOps · An algorithm learning lab <span>Deterministic search. Real decisions.</span></footer></main></>;
}

