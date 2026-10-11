import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { Field } from '../../components/Field';
import { presets } from '../../domain/mission';
import type { Draft, Edit } from '../../domain/editor';
interface Props { draft: Draft; errors: Record<string, string>; edit: (action: Edit) => void; preset: (name: string) => void; undo: boolean; restore: () => void }
export function MissionEditor({ draft, errors, edit, preset, undo, restore }: Props) {
  return <section className="panel editor" aria-labelledby="setup-heading">
    <div className="section-heading"><div><p className="eyebrow">01 / MISSION SETUP</p><h2 id="setup-heading" tabIndex={-1}>Prepare your mission</h2></div><span className="tag">{draft.supplies.length} supplies</span></div>
    <p className="muted">Choose what’s available. We’ll find the most valuable kit within your carrying limit.</p>
    <div className="preset-grid">{Object.keys(presets).map(name => <button key={name} onClick={() => preset(name)}>{name}</button>)}</div>
    <div className="mission-fields"><Field id="mission-name" label="Mission name" value={draft.name} error={errors.name} onChange={e => edit({ type: 'mission', field: 'name', value: e.target.value })}/><Field id="capacity" label="Carrying limit · kg" type="number" min="0" max="10000" step="0.01" value={draft.capacity} error={errors.capacity} onChange={e => edit({ type: 'mission', field: 'capacity', value: e.target.value })}/></div>
    <div className="inventory-heading"><h3>Supply inventory</h3><button className="secondary" disabled={draft.supplies.length >= 100} onClick={() => edit({ type: 'add', id: crypto.randomUUID() })}><Plus size={16}/> Add supply</button></div>
    {errors.inventory && <p className="field-error" role="alert">{errors.inventory}</p>}
    {!draft.supplies.length && <div className="empty"><h3>Your inventory is clear</h3><p>Add supplies or choose a preset. An empty mission can also be optimized to demonstrate an empty kit.</p></div>}
    <div className="supply-list">{draft.supplies.map((item, index) => <article className="supply-card" key={item.id} aria-label={`Supply ${index + 1}: ${item.name || 'unnamed'}`}>
      <div className="supply-top"><span className="supply-number">{String(index + 1).padStart(2, '0')}</span><span className="muted">Supply {index + 1}</span><div className="item-actions">
        <button aria-label={`Move supply ${index + 1} up`} disabled={index === 0} onClick={() => edit({ type: 'move', id: item.id, direction: -1 })}><ArrowUp size={16}/></button>
        <button aria-label={`Move supply ${index + 1} down`} disabled={index === draft.supplies.length - 1} onClick={() => edit({ type: 'move', id: item.id, direction: 1 })}><ArrowDown size={16}/></button>
        <button aria-label={`Duplicate supply ${index + 1}`} disabled={draft.supplies.length >= 100} onClick={() => edit({ type: 'duplicate', id: item.id, newId: crypto.randomUUID() })}><Copy size={16}/></button>
        <button aria-label={`Delete supply ${index + 1}`} onClick={() => edit({ type: 'delete', id: item.id })}><Trash2 size={16}/></button>
      </div></div>
      <div className="supply-fields">{(['name', 'category', 'weight', 'priority'] as const).map(field => <Field key={field} id={`${item.id}-${field}`} label={{ name: 'Supply name', category: 'Category', weight: 'Weight · kg', priority: 'Priority points' }[field]} type={field === 'weight' || field === 'priority' ? 'number' : 'text'} min={field === 'weight' ? '.01' : field === 'priority' ? '0' : undefined} step={field === 'weight' ? '.01' : field === 'priority' ? '1' : undefined} value={item[field]} error={errors[`${item.id}.${field}`]} onChange={e => edit({ type: 'item', id: item.id, field, value: e.target.value })}/>)}</div>
    </article>)}</div>
    <div className="editor-footer"><span>Editing clears previous results and stops the active run.</span>{undo && <button onClick={restore}>Undo last edit</button>}</div>
  </section>;
}
