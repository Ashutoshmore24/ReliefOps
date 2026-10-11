import { describe, expect, it } from 'vitest';
import { editDraft, presetDraft, validateDraft } from './editor';
import { emptyPlayback, loadExecution, navigate } from '../playback/state';
import { solve } from '../algorithm/solver';
import { presets } from './mission';
describe('mission editing', () => {
  it('creates an empty custom mission and validates presets', () => {
    expect(presetDraft('Custom mission').supplies).toEqual([]);
    Object.keys(presets).forEach(name => expect(validateDraft(presetDraft(name)).errors).toEqual({}));
  });
  it('adds, edits, duplicates, reorders and removes supplies without mutating inputs', () => {
    const original = presetDraft('Custom mission');
    let draft = editDraft(original, { type: 'add', id: 'a' });
    expect(original.supplies).toHaveLength(0);
    draft = editDraft(draft, { type: 'item', id: 'a', field: 'name', value: 'Water' });
    draft = editDraft(draft, { type: 'duplicate', id: 'a', newId: 'b' });
    expect(draft.supplies.map(i => i.name)).toEqual(['Water', 'Water']);
    expect(draft.supplies.map(i => i.id)).toEqual(['a', 'b']);
    draft = editDraft(draft, { type: 'move', id: 'b', direction: -1 });
    expect(draft.supplies.map(i => i.id)).toEqual(['b', 'a']);
    draft = editDraft(draft, { type: 'delete', id: 'a' }); expect(draft.supplies[0].id).toBe('b');
    draft = editDraft(draft, { type: 'mission', field: 'name', value: 'Rescue' }); expect(draft.name).toBe('Rescue');
  });
  it.each(['', '-1', 'NaN', 'Infinity', '.001', '10001'])('validates invalid capacity %s', value => {
    expect(validateDraft(editDraft(presetDraft('Flood relief'), { type: 'mission', field: 'capacity', value })).errors.capacity).toBeTruthy();
  });
  it.each(['', '0', '-1', '.001', 'Infinity'])('validates invalid weight %s inline', value => {
    expect(validateDraft(editDraft(presetDraft('Flood relief'), { type: 'item', id: 'water', field: 'weight', value })).errors['water.weight']).toBeTruthy();
  });
  it.each(['', '-1', '1.5', 'Infinity', '1000001'])('validates invalid priority %s inline', value => {
    expect(validateDraft(editDraft(presetDraft('Flood relief'), { type: 'item', id: 'water', field: 'priority', value })).errors['water.priority']).toBeTruthy();
  });
  it('supports duplicate display names with independent IDs', () => {
    const draft = editDraft(presetDraft('Flood relief'), { type: 'duplicate', id: 'water', newId: 'water-copy' });
    expect(validateDraft(draft).errors).toEqual({});
    expect(validateDraft(draft).mission.supplies.filter(i => i.name === 'Drinking water')).toHaveLength(2);
  });
  it('resets playback and results together and clamps navigation', () => {
    const playback = loadExecution(solve(presets['Flood relief']));
    expect(navigate(playback, -10).index).toBe(0);
    expect(navigate(playback, 100000).index).toBe(playback.execution!.trace.length - 1);
    expect(emptyPlayback).toEqual({ execution: null, index: 0, playing: false });
  });
});
