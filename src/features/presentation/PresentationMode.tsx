import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mission } from '../../domain/mission';
import { pause, seek, type Playback } from '../../playback/state';
import { AlgorithmExplorer } from '../explorer/AlgorithmExplorer';
import { ResultsSummary } from '../results/ResultsSummary';
import { presentationStops } from './presentationModel';
import { ThemeToggle } from '../../theme/ThemeToggle';

export function PresentationMode({ title, mission, playback, change, exit }: { title: string; mission: Mission; playback: Playback; change: (next: Playback) => void; exit: () => void }) {
  const execution = playback.execution!;
  const stops = useMemo(() => presentationStops(execution), [execution]);
  const [stage, setStage] = useState(0), [visit, setVisit] = useState(0), [expanded, setExpanded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); exit(); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [exit]);
  const select = (index: number) => {
    setStage(index); setVisit(value => value + 1);
    change(stops[index].index === null ? pause(playback) : seek(playback, stops[index].index!));
  };
  return <main className="presentation-mode" id="main">
    <header className="presentation-header"><div><p className="eyebrow">RELIEFOPS / PRESENTATION</p><h1 ref={heading} tabIndex={-1}>{title || 'Relief mission'}</h1><p>{mission.capacity} kg carrying capacity · {mission.supplies.length} available supplies</p></div><div className="presentation-header-actions"><ThemeToggle /><button onClick={exit}>Exit presentation <span aria-hidden="true">· Esc</span></button></div></header>
    <nav className="presentation-stops" aria-label="Guided presentation topics">{stops.map((stop, index) => <button key={stop.title} aria-current={stage === index ? 'step' : undefined} onClick={() => select(index)}>{index + 1}. {stop.title}</button>)}</nav>
    <section className="presentation-guide" aria-labelledby="guide-heading"><div aria-live="polite"><h2 id="guide-heading">{stops[stage].title}</h2><p>{stops[stage].text}</p>{stops[stage].index === null && <p className="orange">This execution has no recorded event for this topic. The trace position is unchanged.</p>}</div><div className="presentation-actions"><button disabled={stage === 0} onClick={() => select(stage - 1)}>Previous topic</button><button disabled={stage === stops.length - 1} onClick={() => select(stage + 1)}>Next topic</button></div></section>
    <ResultsSummary execution={execution} mission={mission} compact={!expanded}/>
    <button className="presentation-detail-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide result details' : 'Show result breakdown and greedy comparison'}</button>
    <AlgorithmExplorer playback={playback} change={change} supplies={mission.supplies} capacity={mission.capacity} visit={visit}/>
  </main>;
}
