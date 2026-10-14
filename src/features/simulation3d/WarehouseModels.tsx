import { useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Shape } from 'three';
import type { Supply } from '../../domain/mission';
import { getCategoryVisual } from '../simulation/simulationModel';
import type { Point3 } from './motion';

export function Block({ at = [0, 0, 0], size, color, glass = false, rotation = [0, 0, 0] }: { at?: Point3; size: Point3; color: string; glass?: boolean; rotation?: Point3 }) {
  return <mesh position={at} rotation={rotation} castShadow={!glass} receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={glass ? .15 : .72} metalness={glass ? .3 : .08} transparent={glass} opacity={glass ? .28 : 1} depthWrite={!glass}/></mesh>;
}
function Cross({ at, color, size = .25 }: { at: Point3; color: string; size?: number }) {
  return <group position={at}><Block size={[size, size * .3, .02]} color={color}/><Block size={[size * .3, size, .022]} color={color}/></group>;
}
export function CargoBody({ item, ghost = false, highlighted = false }: { item: Supply; ghost?: boolean; highlighted?: boolean }) {
  const visual = getCategoryVisual(item.category, item.name);
  const medical = visual.label === 'Medical', water = visual.label === 'Hydration';
  return <group>
    <RoundedBox args={[.67, .59, .65]} radius={.045} smoothness={2} castShadow><meshStandardMaterial color={medical ? '#e9e7dc' : water ? '#409fc1' : '#c89c62'} transparent={ghost} opacity={ghost ? .4 : 1} roughness={.7}/></RoundedBox>
    <Block at={[0, .305, 0]} size={[.7, .055, .68]} color={medical ? '#ced7dc' : '#e3c18c'}/>
    {medical ? <><Cross at={[0, 0, .33]} color={visual.accent}/><Block at={[0, .38, 0]} size={[.3, .045, .06]} color="#263c4d"/><Block at={[-.13, .35, 0]} size={[.04, .07, .06]} color="#263c4d"/><Block at={[.13, .35, 0]} size={[.04, .07, .06]} color="#263c4d"/></> : water ? <><mesh position={[.18, .35, 0]}><cylinderGeometry args={[.07, .07, .055, 12]}/><meshStandardMaterial color="#193a52"/></mesh><Block at={[-.15, .36, 0]} size={[.2, .06, .06]} color="#c5e2eb"/><Block at={[0, -.1, .33]} size={[.44, .08, .015]} color="#c5e2eb"/></> : <><Block at={[0, 0, .33]} size={[.12, .58, .015]} color={visual.accent}/><Block at={[0, .34, 0]} size={[.12, .012, .6]} color={visual.accent}/><Block at={[-.2, .06, .335]} size={[.13, .18, .016]} color="#f0e6cf"/></>}
    <Block at={[-.29, -.18, .34]} size={[.06, .1, .025]} color="#3a4653"/><Block at={[.29, -.18, .34]} size={[.06, .1, .025]} color="#3a4653"/>
    {highlighted && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.3, 0]}><ringGeometry args={[.48, .53, 32]}/><meshBasicMaterial color="#ffac57" transparent opacity={.9}/></mesh>}
  </group>;
}

function Wheel({ at, distance }: { at: Point3; distance: React.RefObject<number> }) {
  const tire = useRef<Group>(null);
  useFrame(() => { if (tire.current) tire.current.rotation.z = -distance.current / .38; });
  return <group position={at}><group ref={tire}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[.38, .38, .25, 24]}/><meshStandardMaterial color="#18202a" roughness={.95}/></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, at[2] > 0 ? .135 : -.135]}><cylinderGeometry args={[.22, .22, .025, 16]}/><meshStandardMaterial color="#a8b6c2" metalness={.7} roughness={.3}/></mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * Math.PI * .4) * .13, Math.sin(i * Math.PI * .4) * .13, at[2] > 0 ? .152 : -.152]}><sphereGeometry args={[.025, 6, 6]}/><meshStandardMaterial color="#344455"/></mesh>)}
  </group></group>;
}
export function ReliefTruck({ trial = false, overload = false, improved = false, distance }: { trial?: boolean; overload?: boolean; improved?: boolean; distance: React.RefObject<number> }) {
  const body = overload ? '#c75047' : trial ? '#2d7d9e' : '#377e68';
  return <group>
    <Block at={[0, .55, 0]} size={[4.3, .22, 1.6]} color="#233344"/>
    <Block at={[-.66, .81, 0]} size={[2.85, .18, 1.72]} color="#7d8a91"/>
    <RoundedBox position={[1.47, 1.12, 0]} args={[1.25, 1.1, 1.65]} radius={.13} smoothness={3} castShadow><meshStandardMaterial color={body} roughness={.48} metalness={.16}/></RoundedBox>
    <RoundedBox position={[1.74, 1.61, 0]} args={[.88, .28, 1.62]} radius={.075} smoothness={2} castShadow><meshStandardMaterial color={body}/></RoundedBox>
    <Block at={[2.108, 1.44, 0]} size={[.025, .37, 1.32]} color="#132d40"/>
    {[-1, 1].map(side => <group key={side}><Block at={[1.36, 1.45, side * .827]} size={[.61, .37, .02]} color="#15354a"/><Block at={[1.36, 1.42, side * .842]} size={[.025, .4, .025]} color={body}/><Block at={[1.08, 1.07, side * .845]} size={[.16, .035, .03]} color="#dbe3e6"/><Block at={[1.87, 1.31, side * .95]} size={[.12, .17, .12]} color="#20384a"/><Cross at={[1.48, .95, side * .84]} color="#eaece6" size={.3}/></group>)}
    <Block at={[2.12, .79, 0]} size={[.1, .18, 1.67]} color="#c9d2d5"/>
    <Block at={[2.13, 1.02, 0]} size={[.03, .23, .65]} color="#1a2b39"/>
    {[-.27, -.09, .09, .27].map(z => <Block key={z} at={[2.15, 1.02, z]} size={[.025, .18, .025]} color="#879ca7"/>)}
    {[-.63, .63].map(z => <mesh key={z} position={[2.15, 1.06, z]}><boxGeometry args={[.03, .18, .27]}/><meshStandardMaterial color="#fff1c5" emissive="#ffd88c" emissiveIntensity={.55}/></mesh>)}
    <Block at={[1.45, 1.79, 0]} size={[.45, .07, .24]} color="#e49a48"/>
    {[-.81, .81].map(z => <group key={z}><Block at={[-.68, 1.04, z]} size={[2.84, .42, .045]} color={trial ? '#7dbac7' : '#587b68'} glass={trial}/><Block at={[-.68, 1.27, z]} size={[2.9, .07, .075]} color={overload ? '#dc6661' : '#b5c7cb'}/>{[-1.95, -.65, .7].map(x => <Block key={x} at={[x, 1.03, z]} size={[.05, .45, .07]} color="#a4b5bd"/>)}</group>)}
    <Block at={[-2.12, 1.04, 0]} size={[.06, .43, 1.67]} color={body}/>
    <Block at={[-2.16, .72, 0]} size={[.13, .12, 1.74]} color="#b5c7cb"/>
    {[-.67, .67].map(z => <Block key={z} at={[-2.2, .94, z]} size={[.025, .14, .16]} color="#dd6658"/>)}
    {[-1.5, -.65, 1.5].flatMap(x => [-.9, .9].map(z => <Wheel key={`${x}:${z}`} at={[x, .41, z]} distance={distance}/>))}
    {improved && <mesh position={[-.6, .08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.45, 1.51, 48]}/><meshBasicMaterial color="#f6ae60"/></mesh>}
  </group>;
}

function Pallet({ at }: { at: Point3 }) {
  return <group position={at}>{[-.32, 0, .32].map(z => <Block key={z} at={[0, .13, z]} size={[.95, .06, .21]} color="#977d58"/>)}{[-.3, .3].map(x => <Block key={x} at={[x, .065, 0]} size={[.16, .09, .9]} color="#715d42"/>)}</group>;
}
function Tent({ at, color }: { at: Point3; color: string }) {
  const shape = useMemo(() => new Shape().moveTo(-.95, 0).lineTo(0, 1.5).lineTo(.95, 0).closePath(), []);
  return <group position={at}><mesh position={[0, .08, -.75]} castShadow><extrudeGeometry args={[shape, { depth: 1.5, bevelEnabled: false }]}/><meshStandardMaterial color={color} roughness={.9}/></mesh><mesh position={[0, .09, .765]} scale={[.55, .78, 1]}><shapeGeometry args={[shape]}/><meshStandardMaterial color="#273a41"/></mesh><Block at={[0, .11, 0]} size={[2.05, .09, 1.65]} color="#6b7d6d"/><Block at={[-.47, .8, .79]} size={[.035, 1.75, .04]} color="#e0d6bd" rotation={[0, 0, -.57]}/><Block at={[.47, .8, .79]} size={[.035, 1.75, .04]} color="#e0d6bd" rotation={[0, 0, .57]}/></group>;
}
export function WarehouseEnvironment({ light }: { light: boolean }) {
  const slate = light ? '#728696' : '#3d576c';
  return <group>
    <RoundedBox args={[16, .35, 11.8]} position={[0, -.2, 0]} radius={.16} smoothness={2} receiveShadow><meshStandardMaterial color={light ? '#c1ced5' : '#263c51'} roughness={.95}/></RoundedBox>
    <Block at={[1.6, -.01, -2.65]} size={[12.4, .025, 2.6]} color={light ? '#8c9ca8' : '#344c60'}/>
    {[-3, -1, 1, 3, 5].map(x => <Block key={x} at={[x, .015, -2.65]} size={[.85, .02, .045]} color="#b7c3c6"/>)}
    {[2.3, -2.3].map(z => <group key={z}><Block at={[-.35, .01, z]} size={[5.4, .03, 2.25]} color={z > 0 ? '#3a596a' : '#3e615a'}/>{[-1.2, 1.2].map(edge => <Block key={edge} at={[-.35, .04, z + edge]} size={[5.4, .02, .055]} color={z > 0 ? '#72b2c8' : '#83b69d'}/>)}</group>)}
    <Block at={[-5.25, .05, -.2]} size={[3.35, .1, 7.8]} color={light ? '#a9b9be' : '#324d5f'}/>
    <Block at={[-6.6, 1.6, -.2]} size={[.12, 3.2, 7.7]} color={slate}/>
    {[-3.7, .2, 3.6].map(z => <Block key={z} at={[-6.48, 1.75, z]} size={[.15, 3.5, .15]} color="#91a5af"/>)}
    {[.35, 1.8, 3.15].map(y => <Block key={y} at={[-5.78, y, -.2]} size={[1.45, .08, 7.5]} color={slate}/>)}
    {[-3.1, -1.7, -.3, 1.1, 2.5].map(z => <group key={z}><Block at={[-5.75, 2.12, z]} size={[.7, .55, .7]} color="#7d8e88"/><Block at={[-5.75, .68, z]} size={[.8, .55, .8]} color="#ab9374"/></group>)}
    {[-2.6, 0, 2.6].map(z => <Pallet key={z} at={[-4.25, .1, z]}/>)}
    <group position={[5.8, 0, 1.1]}><Block at={[0, .03, 0]} size={[3.3, .06, 4.7]} color={light ? '#a7b7a0' : '#405d51'}/><Tent at={[0, 0, -1.2]} color="#d5c29a"/><Tent at={[.1, 0, 1]} color="#bca77e"/><Block at={[-1.4, .45, .3]} size={[.12, .85, .12]} color="#b4bec0"/><Block at={[-1.4, 1, .3]} size={[.75, .48, .07]} color="#eee9d9"/><Cross at={[-1.4, 1, .345]} color="#ce6556" size={.28}/></group>
    {[-2.7, 2.4].map(x => <group key={x} position={[x, 0, 3.95]}><Block at={[0, .055, 0]} size={[.4, .08, .4]} color="#263440"/><mesh position={[0, .29, 0]}><coneGeometry args={[.16, .43, 12]}/><meshStandardMaterial color="#e6974b"/></mesh></group>)}
  </group>;
}

export function ResponsiveCamera() {
  const { camera, size, invalidate } = useThree();
  const previous = useRef('');
  useFrame(() => {
    const key = `${size.width}:${size.height}`;
    if (previous.current === key) return;
    previous.current = key;
    const narrow = size.width / size.height < 1.1;
    camera.position.set(narrow ? 16 : 11.6, narrow ? 15 : 9.2, narrow ? 19 : 13.5);
    camera.lookAt(0, .7, 0);
    camera.updateProjectionMatrix(); invalidate();
  });
  return null;
}
