import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { Group, MathUtils } from 'three';
import type { Mission, Supply } from '../../domain/mission';
import type { SceneState } from './sceneModel';
import { getCategoryVisual } from '../simulation/simulationModel';
import { useTheme } from '../../theme/ThemeContext';
import { advanceCargo, cargoPosition, retargetCargo, type CargoMotion, type Point3 } from './motion';
import { CargoBody, ReliefTruck, ResponsiveCamera, WarehouseEnvironment } from './WarehouseModels';

const TRIAL: Point3 = [-.35, 0, 2.3];
const BEST: Point3 = [-.35, 0, -2.3];
function cargoSlot(index: number, truck: Point3): Point3 {
  return [truck[0] - 1.63 + (index % 3) * .78, 1.21 + Math.floor(index / 6) * .69, truck[2] - .38 + (Math.floor(index / 3) % 2) * .76];
}
function stageSlot(index: number): Point3 {
  return [-4.3 + (index % 2) * .82, .62 + Math.floor(index / 6) * .69, -2.7 + (Math.floor(index / 2) % 3) * 2.55];
}
function AnimatedCargo({ item, target, initial, index, playing, reduced, speed, spotlight, rejected, number, select, spawn = false, label = true }: {
  item: Supply; target: Point3; initial: Point3; index: number; playing: boolean; reduced: boolean; speed: number;
  spotlight: boolean; rejected: boolean; number: number; select: (id: string) => void; spawn?: boolean; label?: boolean;
}) {
  const ref = useRef<Group>(null), origin = useRef(initial);
  const motion = useRef<CargoMotion | null>(null), frozen = useRef(false);
  const previous = useRef({ index, playing, target: '' });
  const invalidate = useThree(s => s.invalidate);
  const visual = getCategoryVisual(item.category, item.name), Icon = visual.icon;
  const [x, y, z] = target;
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const signature = `${x}:${y}:${z}`, old = previous.current;
    const seeking = Math.abs(index - old.index) > 1 || (index === 0 && old.index !== 0);
    if (old.target !== signature || seeking) {
      if (reduced || seeking || (!old.target && !spawn)) {
        group.position.set(x, y, z); group.rotation.z = 0; motion.current = null;
      } else motion.current = retargetCargo([group.position.x, group.position.y, group.position.z], [x, y, z], .95 / (playing ? speed : 1));
      frozen.current = false;
    } else if (reduced) {
      group.position.set(x, y, z); group.rotation.z = 0; motion.current = null;
    } else if (old.playing && !playing && old.index === index) frozen.current = true;
    else if (playing || old.index !== index) frozen.current = false;
    previous.current = { index, playing, target: signature }; invalidate();
  }, [x, y, z, index, playing, reduced, speed, spawn, invalidate]);
  useFrame((_, delta) => {
    if (!ref.current || !motion.current || frozen.current) return;
    motion.current = advanceCargo(motion.current, delta, false);
    ref.current.position.set(...cargoPosition(motion.current));
    ref.current.rotation.z = Math.sin(Math.PI * motion.current.elapsed / motion.current.duration) * .055;
    if (motion.current.elapsed < motion.current.duration) invalidate();
    else { ref.current.rotation.z = 0; motion.current = null; }
  });
  return <group ref={ref} position={origin.current} onClick={e => { e.stopPropagation(); select(item.id); }}>
    <CargoBody item={item} ghost={rejected} highlighted={spotlight}/>
    {label && <Html position={[0, .55, 0]} center zIndexRange={[5, 0]}><button className={`lab-cargo-chip ${spotlight ? 'lab-selected' : ''}`} aria-label={`Supply ${number}: ${item.name}, ${item.weight} kg, priority ${item.priority}`} title={item.name} onClick={() => select(item.id)}><Icon size={13}/><span>{number}</span></button></Html>}
  </group>;
}
function DispatchTruck({ children, dispatch, reduced, distance }: { children: ReactNode; dispatch: boolean; reduced: boolean; distance: React.RefObject<number> }) {
  const ref = useRef<Group>(null), invalidate = useThree(s => s.invalidate);
  useEffect(() => { invalidate(); }, [dispatch, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = dispatch ? 4.5 : 0;
    ref.current.position.x = reduced ? target : MathUtils.damp(ref.current.position.x, target, 2, Math.min(delta, .05));
    distance.current = ref.current.position.x;
    if (Math.abs(distance.current - target) > .004) invalidate();
  });
  return <group ref={ref}>{children}</group>;
}
function ContextMonitor({ fail }: { fail: () => void }) {
  const gl = useThree(s => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, fail]);
  return null;
}
export default function ReliefScene({ state, mission, reduced, playing, speed, orbit, spotlight, cameraKey, select, selectedId, fallback }: {
  state: SceneState; mission: Mission; reduced: boolean; playing: boolean; speed: number; orbit: boolean; spotlight: boolean;
  cameraKey: number; select: (id: string) => void; selectedId: string | null; fallback: ReactNode;
}) {
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false), [dispatchIndex, setDispatchIndex] = useState<number | null>(null);
  const trialDistance = useRef(0), bestDistance = useRef(0);
  const previousIndex = useRef(state.index);
  const animateIncumbent = state.improved && Math.abs(previousIndex.current - state.index) === 1;
  useLayoutEffect(() => { previousIndex.current = state.index; }, [state.index]);
  useEffect(() => { setDispatchIndex(null); }, [state.index, playing]);
  const light = theme === 'light';
  const visible = useMemo(() => {
    if (mission.supplies.length <= 12) return mission.supplies;
    const ids = new Set([state.node?.itemId, selectedId, ...state.trial.selectedIds]);
    return [...mission.supplies].sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id))).slice(0, 12);
  }, [mission.supplies, state.node?.itemId, state.trial.selectedIds, selectedId]);
  const trialItems = visible.filter(s => state.trial.selectedIds.includes(s.id));
  const bestItems = mission.supplies.filter(s => state.best.selectedIds.includes(s.id)).slice(0, 8);
  const picked = mission.supplies.find(s => s.id === (selectedId ?? state.node?.itemId));
  if (failed) throw new Error('WebGL context lost');
  const dispatched = dispatchIndex === state.index && state.provenOptimal && !playing;
  return <div className="lab-canvas-wrap lab-canvas-advanced">
    <div className="lab-scene-hud"><span><i/> RELIEFOPS / DECISION WAREHOUSE</span><span className={state.overloaded ? 'lab-hud-danger' : ''}>{state.overloaded ? 'CAPACITY EXCEEDED' : state.improved ? 'INCUMBENT IMPROVED' : state.provenOptimal ? 'OPTIMALITY PROVEN' : `NODE ${state.node?.id ?? '—'} · ${state.node?.decision.toUpperCase() ?? 'ROOT'}`}</span></div>
    <Canvas key={cameraKey} shadows dpr={[1, 1.5]} frameloop="demand" camera={{ position: [11.6, 9.2, 13.5], fov: 43, near: .1, far: 100 }} gl={{ antialias: true }} fallback={fallback}>
      <color attach="background" args={[light ? '#e5edf1' : '#101e2c']}/><fog attach="fog" args={[light ? '#e5edf1' : '#101e2c', 30, 65]}/>
      <hemisphereLight args={['#e6f3ff', '#6c7f85', 1.5]}/><ambientLight intensity={.45}/>
      <directionalLight position={[-3, 12, 8]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-.0004} shadow-normalBias={.04} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={9} shadow-camera-bottom={-9}/>
      <directionalLight position={[7, 5, -7]} intensity={1.1} color="#a2c9e6"/>
      <ContextMonitor fail={() => setFailed(true)}/><ResponsiveCamera/>
      <OrbitControls enabled={orbit} enablePan={false} enableDamping={!reduced} target={[0, .7, 0]} minDistance={14} maxDistance={29} minPolarAngle={.38} maxPolarAngle={1.15}/>
      <WarehouseEnvironment light={light}/>
      <Html position={[-5.2, 3.75, -.8]} center zIndexRange={[3, 0]}><span className="lab-zone-label"><small>01 / INVENTORY</small>Supply staging</span></Html>
      <Html position={[-.5, .08, 4.4]} center zIndexRange={[3, 0]}><span className={`lab-zone-label ${state.overloaded ? 'lab-zone-danger' : ''}`}><small>02 / HYPOTHETICAL</small>Current trial</span></Html>
      <Html position={[-.3, 2.2, -3.5]} center zIndexRange={[3, 0]}><span className="lab-zone-label lab-zone-best"><small>03 / INCUMBENT</small>Best so far</span></Html>
      <Html position={[5.8, 2.2, 1.6]} center zIndexRange={[3, 0]}><span className="lab-zone-label"><small>DESTINATION</small>Relief camp</span></Html>
      <group position={TRIAL}><ReliefTruck trial overload={state.overloaded} distance={trialDistance}/></group>
      <group position={BEST}><DispatchTruck dispatch={dispatched} reduced={reduced} distance={bestDistance}><ReliefTruck improved={state.improved} distance={bestDistance}/>{bestItems.map((item, i) => {
        const target = cargoSlot(i, [0, 0, 0]), trialIndex = trialItems.findIndex(s => s.id === item.id);
        const initial = cargoSlot(Math.max(0, trialIndex), [TRIAL[0] - BEST[0], 0, TRIAL[2] - BEST[2]]);
        return <AnimatedCargo key={item.id} item={item} target={target} initial={initial} index={state.index} playing={playing} reduced={reduced} speed={speed} spotlight={false} rejected={false} number={mission.supplies.indexOf(item) + 1} select={select} spawn={animateIncumbent} label={false}/>;
      })}</DispatchTruck></group>
      {visible.map((item, i) => {
        const slot = trialItems.indexOf(item), initial = stageSlot(i);
        return <AnimatedCargo key={item.id} item={item} initial={initial} target={slot < 0 ? initial : cargoSlot(slot, TRIAL)} index={state.index} playing={playing} reduced={reduced} speed={speed} spotlight={selectedId === item.id || (spotlight && item.id === state.node?.itemId)} rejected={state.rejected && slot >= 0} number={mission.supplies.indexOf(item) + 1} select={select} label={visible.length <= 6 || item.id === state.node?.itemId || item.id === selectedId}/>;
      })}
    </Canvas>
    <div className="lab-scene-caption"><strong>{picked ? picked.name : 'Explore the warehouse'}</strong><span>{picked ? `${picked.weight} kg · Priority ${picked.priority} · ${state.trial.selectedIds.includes(picked.id) ? 'In current trial' : 'Outside current trial'}` : 'Numbered containers match the supply inventory. Select a crate for details.'}</span></div>
    <div className="lab-scene-footer"><span>{playing ? '● Playing' : 'Ⅱ Paused'} · {visible.length} / {mission.supplies.length} supplies visible · {Math.max(0, state.trial.selectedIds.length - trialItems.length)} trial / {Math.max(0, state.best.selectedIds.length - bestItems.length)} best grouped</span>{state.provenOptimal && <button disabled={playing} onClick={() => setDispatchIndex(dispatched ? null : state.index)}>{dispatched ? 'Return truck' : 'Illustrate final dispatch'}</button>}</div>
  </div>;
}
