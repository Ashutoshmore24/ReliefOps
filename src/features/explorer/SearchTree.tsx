import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Focus, Minus, Plus } from 'lucide-react';
import type { Supply } from '../../domain/mission';
import { layoutTree, nodeAt, statusAt, treeKeyTarget, type TraceIndex, type TreeView } from './traceModel';
export const statusLabels = { pending: 'Pending', active: 'Active', feasible: 'Feasible candidate', pruned: 'Pruned', best: 'Best known kit', infeasible: 'Infeasible' };
export function SearchTree({ model, view, step, selected, capacity, supplies, collapsed, select, toggle }: { model: TraceIndex; view: TreeView; step: number; selected: number | null; capacity: number; supplies: Supply[]; collapsed: ReadonlySet<number>; select: (id: number) => void; toggle: (id: number) => void }) {
  const layout = layoutTree(model, view.ids);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => {
    if (!dragging) return;
    const stop = () => { drag.current = null; setDragging(false); };
    window.addEventListener('pointerup', stop); return () => window.removeEventListener('pointerup', stop);
  }, [dragging]);
  const fit = () => { if (viewport.current) { setZoom(Math.max(.01, Math.min(1, viewport.current.clientWidth / layout.width, viewport.current.clientHeight / layout.height))); viewport.current.scrollTo({ left: 0, top: 0 }); } };
  const positionMap = new Map(layout.positions.map(position => [position.id, position]));
  return <><div className="tree-toolbar"><span>Include or exclude each supply</span><div><button title="Zoom out" aria-label="Zoom out" disabled={zoom <= .01} onClick={() => setZoom(z => Math.max(.01, z - .15))}><Minus size={16}/></button><span>{Math.round(zoom * 100)}%</span><button title="Zoom in" aria-label="Zoom in" disabled={zoom >= 1.75} onClick={() => setZoom(z => Math.min(1.75, z + .15))}><Plus size={16}/></button><button onClick={fit}><Focus size={16}/> Fit</button></div></div>
    <div className={`tree-viewport ${dragging ? 'dragging' : ''}`} ref={viewport} tabIndex={0} aria-label="Search tree canvas. Scroll to pan or drag the background." onPointerDown={event => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
      drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => { if (drag.current) { event.currentTarget.scrollLeft = drag.current.left - (event.clientX - drag.current.x); event.currentTarget.scrollTop = drag.current.top - (event.clientY - drag.current.y); } }} onPointerUp={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }}>
      <div style={{ width: layout.width * zoom, height: layout.height * zoom }}><div className="tree-stage" role="tree" aria-label="Revealed search nodes" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}>
        <svg className="tree-edges" width={layout.width} height={layout.height} aria-hidden="true">{layout.positions.map(position => {
          const n = nodeAt(model, position.id, step)!.node, parent = n.parentId === null ? null : positionMap.get(n.parentId);
          if (!parent) return null;
          const y1 = parent.y + 90, y2 = position.y;
          return <g key={n.id}><path d={`M ${parent.x} ${y1} V ${y1 + 18} H ${position.x} V ${y2}`} className={`edge-${n.decision}`}/><rect x={position.x - 30} y={y2 - 23} width="60" height="18" rx="4"/><text x={position.x} y={y2 - 10} textAnchor="middle">{n.decision === 'include' ? 'Include' : 'Exclude'}</text></g>;
        })}</svg>
        {layout.positions.map(position => {
          const event = nodeAt(model, position.id, step)!, n = event.node, status = statusAt(model, event, step, capacity);
          const item = supplies.find(item => item.id === n.itemId), history = model.nodes.get(n.id)!;
          const hasChildren = history.children.some(child => model.nodes.get(child)!.createdAt <= step);
          const selectedNode = selected === n.id;
          return <div key={n.id} className="tree-node-wrap" style={{ left: position.x - 96, top: position.y }}>
            <button role="treeitem" aria-level={n.depth + 1} aria-selected={selectedNode} aria-expanded={hasChildren ? !collapsed.has(n.id) : undefined} tabIndex={selectedNode || (selected === null && n.id === view.ids[0]) ? 0 : -1} data-node-id={n.id} className={`tree-node status-${status} ${selectedNode ? 'selected' : ''}`} onClick={() => select(n.id)} onKeyDown={event => {
              if (event.key === ' ' || event.key === 'Enter') return;
              if (event.key === 'c' && hasChildren) { event.preventDefault(); toggle(n.id); return; }
              const target = treeKeyTarget(view.ids, n.id, event.key);
              if (target !== null) { event.preventDefault(); select(target); viewport.current?.querySelector<HTMLButtonElement>(`[data-node-id="${target}"]`)?.focus(); }
            }}><span className="node-top"><b>#{n.id} · L{n.depth}</b><span>{status === 'best' ? '★' : status === 'pruned' || status === 'infeasible' ? '×' : status === 'active' ? '→' : '○'} {statusLabels[status]}</span></span><strong>{n.decision === 'root' ? 'Empty kit' : `${n.decision === 'include' ? 'Take' : 'Leave'} ${item?.name ?? 'supply'}`}</strong><span className="node-values">{n.weight} kg <span>{n.priority} priority</span></span><span className="node-bound">Bound {n.upperBound.toFixed(2)}</span></button>
            {hasChildren && <button className="branch-toggle" aria-label={`${collapsed.has(n.id) ? 'Expand' : 'Collapse'} node ${n.id}`} onClick={() => toggle(n.id)}>{collapsed.has(n.id) ? <ChevronRight size={12}/> : <ChevronDown size={12}/>}</button>}
          </div>;
        })}
      </div></div>
    </div><p className="tree-hint">Scroll or drag the background to pan. Arrow keys move between nodes; C collapses a branch. {view.ids.length} nodes shown{view.omitted ? ` · ${view.omitted} revealed nodes hidden by collapsed branches or the display cap. Select an event in the text trace to bring its path into view.` : '.'}</p></>;
}
