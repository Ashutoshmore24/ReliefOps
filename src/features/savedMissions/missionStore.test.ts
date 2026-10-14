import { describe, expect, it } from 'vitest';
import { presetDraft } from '../../domain/editor';
import { missionPayload, readSavedMission, savedMissionDraft } from './missionStore';
describe('saved mission data', () => {
  it('saves validated inputs only and round-trips an editable mission', () => {
    const draft = presetDraft('Flood relief'), payload = missionPayload(draft);
    expect(payload.capacity).toBe(15);
    expect(Object.keys(payload)).toEqual(['name', 'capacity', 'supplies']);
    const saved = readSavedMission('mission-1', payload)!;
    expect(savedMissionDraft(saved)).toEqual(draft);
    expect(saved.pending).toBe(false);
  });
  it('rejects invalid editor fields before writing to Firestore', () => {
    expect(() => missionPayload({ ...presetDraft('Flood relief'), capacity: '-1' })).toThrow('Fix');
    expect(() => missionPayload({ ...presetDraft('Flood relief'), name: 'a'.repeat(121) })).toThrow('120');
  });
  it('refuses malformed stored supplies, duplicate identities, and invalid weights', () => {
    const valid = missionPayload(presetDraft('Flood relief'));
    for (const supplies of [[null], [{ id: 'x', name: 'a', category: 'b', weight: '1', priority: 2 }], [valid.supplies[0], valid.supplies[0]], [{ ...valid.supplies[0], weight: -1 }]]) {
      expect(readSavedMission('bad', { ...valid, supplies })).toBeNull();
    }
    expect(readSavedMission('bad', { ...valid, capacity: NaN })).toBeNull();
  });
  it('supports empty missions and arbitrary supply IDs without treating them as paths', () => {
    expect(readSavedMission('empty', { name: 'Empty', capacity: 0, supplies: [] })?.mission.supplies).toEqual([]);
    const valid = missionPayload(presetDraft('Flood relief'));
    valid.supplies[0].id = 'a/b 🍊';
    expect(readSavedMission('ok', valid, true)?.mission.supplies[0].id).toBe('a/b 🍊');
    expect(readSavedMission('ok', valid, true)?.pending).toBe(true);
  });
});
